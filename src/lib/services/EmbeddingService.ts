/**
 * Embedding Service
 * Handles AI embedding generation for semantic product search
 * Manages embedding queue and generation workflow
 */

import { supabaseServer } from '@/lib/supabase/server';
import { CacheService } from './CacheService';
import type { Database } from '@/types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type ProductEmbedding = Database['public']['Tables']['product_embeddings']['Row'];

interface EmbeddingMetadata {
  content_hash?: string;
  tokens?: number;
  processing_time_ms?: number;
  [key: string]: unknown;
}

export class EmbeddingService {
  /**
   * Enqueue product for embedding generation
   * Marks product for background processing by cron job
   * @returns True if successfully enqueued
   */
  static async enqueueProduct(productId: string): Promise<boolean> {
    const supabase = supabaseServer;

    // Check if product exists and is searchable
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('status, is_searchable')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return false;
    }

    // Only generate embeddings for active, searchable products
    if (product.status !== 'active' || !product.is_searchable) {
      // Delete existing embedding if product is no longer searchable
      await supabase.from('product_embeddings').delete().eq('product_id', productId);
      CacheService.invalidateProductEmbedding(productId);
      return false;
    }

    // Mark as pending by deleting existing embedding
    // Cron job will regenerate it
    await supabase.from('product_embeddings').delete().eq('product_id', productId);

    CacheService.invalidateProductEmbedding(productId);

    return true;
  }

  /**
   * Generate embedding for a product
   * Calls OpenAI API to generate text-embedding-3-small vector
   */
  static async generateEmbedding(productId: string): Promise<ProductEmbedding> {
    const supabase = supabaseServer;

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error('Product not found');
    }

    // Build searchable text from product
    const searchableText = this.buildSearchableText(product);

    // Generate embedding using OpenAI API
    const embedding = await this.callOpenAIEmbedding(searchableText);

    // Calculate content hash for caching
    const contentHash = this.hashContent(searchableText);

    // Store embedding
    const { data: embeddingRecord, error: embeddingError } = await supabase
      .from('product_embeddings')
      .upsert(
        {
          product_id: productId,
          embedding,
          model_version: 'text-embedding-3-small',
          metadata: {
            content_hash: contentHash,
            tokens: searchableText.split(' ').length,
          } as EmbeddingMetadata,
        },
        { onConflict: 'product_id,model_version' }
      )
      .select()
      .single();

    if (embeddingError) {
      throw new Error(`Failed to store embedding: ${embeddingError.message}`);
    }

    // Invalidate embedding cache
    CacheService.invalidateProductEmbedding(productId);

    return embeddingRecord;
  }

  /**
   * Get embedding for a product
   * @returns Embedding record or null if not found
   */
  static async getEmbedding(productId: string): Promise<ProductEmbedding | null> {
    const supabase = supabaseServer;

    const { data: embedding, error } = await supabase
      .from('product_embeddings')
      .select('*')
      .eq('product_id', productId)
      .eq('model_version', 'text-embedding-3-small')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch embedding: ${error.message}`);
    }

    return embedding;
  }

  /**
   * Check if product has current embedding
   * @returns True if embedding exists and is up-to-date
   */
  static async hasEmbedding(productId: string): Promise<boolean> {
    const embedding = await this.getEmbedding(productId);
    return embedding !== null;
  }

  /**
   * Delete embedding for a product
   * Used when product becomes unsearchable or is deleted
   */
  static async deleteEmbedding(productId: string): Promise<void> {
    const supabase = supabaseServer;

    await supabase.from('product_embeddings').delete().eq('product_id', productId);

    CacheService.invalidateProductEmbedding(productId);
  }

  /**
   * Search products by semantic similarity
   * @param query Search query text
   * @param limit Maximum results to return
   * @returns Array of product IDs sorted by relevance
   */
  static async searchSimilar(
    query: string,
    limit: number = 10
  ): Promise<Array<{ product_id: string; similarity: number }>> {
    const supabase = supabaseServer;

    // Generate embedding for query
    const queryEmbedding = await this.callOpenAIEmbedding(query);

    // Search for similar products using cosine similarity
    // Note: This requires pgvector extension and proper index
    const { data, error } = await supabase.rpc('search_products_by_embedding', {
      query_embedding: queryEmbedding,
      match_limit: limit,
    });

    if (error) {
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Build searchable text from product data
   * Combines name, description, tags, brand, and AI metadata
   */
  private static buildSearchableText(product: Product): string {
    const parts: string[] = [];

    // Add product name (weighted 3x)
    if (product.name) {
      parts.push(product.name, product.name, product.name);
    }

    // Add description
    if (product.description) {
      parts.push(product.description);
    }

    // Add brand
    if (product.brand) {
      parts.push(product.brand);
    }

    // Add tags
    if (product.tags && Array.isArray(product.tags)) {
      parts.push(...product.tags);
    }

    // Add SEO keywords
    if (product.seo_keywords && Array.isArray(product.seo_keywords)) {
      parts.push(...product.seo_keywords);
    }

    // Add AI metadata if available
    if (product.ai_metadata && typeof product.ai_metadata === 'object') {
      const metadata = product.ai_metadata as Record<string, unknown>;
      const values = Object.values(metadata).filter(
        (v) => typeof v === 'string' || typeof v === 'number'
      );
      parts.push(...values.map(String));
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Call OpenAI API to generate embedding
   * @param text Text to embed
   * @returns Embedding vector (1536 dimensions)
   */
  private static async callOpenAIEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Generate simple hash of text content
   * Used for cache invalidation check
   */
  private static hashContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
