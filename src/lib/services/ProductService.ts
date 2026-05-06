/**
 * Product Service
 * Handles all product CRUD operations with cache management
 * Separates business logic from API routes and database access
 */

import { supabaseServer } from '@/lib/supabase/server';
import { CacheService } from './CacheService';
import type { Database } from '@/types/supabase';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

interface CreateProductData {
  name: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  base_price: number;
  cost_price?: number | null;
  mrp?: number | null;
  discount_engine_enabled?: boolean;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number | null;
  selling_price?: number | null;
  fabric?: string | null;
  gsm?: number | null;
  fit_type?: string | null;
  print_type?: string | null;
  shipping_charge?: number;
  shipping_included_in_price?: boolean;
  category_id?: string | null;
  brand?: string | null;
  size_chart_id?: string | null;
  wash_instruction_id?: string | null;
  collection_ids?: string[];
  status?: 'draft' | 'active' | 'archived';
  is_searchable?: boolean;
  enable_variant_image_switching?: boolean;
  tags?: string[];
  seo_keywords?: string[];
  meta_title?: string | null;
  meta_description?: string | null;
  hs_code?: string | null;
  country_of_origin?: string | null;
  ai_metadata?: Record<string, unknown>;
}

interface UpdateProductData {
  name?: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  base_price?: number;
  cost_price?: number | null;
  mrp?: number | null;
  discount_engine_enabled?: boolean;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number | null;
  selling_price?: number | null;
  fabric?: string | null;
  gsm?: number | null;
  fit_type?: string | null;
  print_type?: string | null;
  shipping_charge?: number;
  shipping_included_in_price?: boolean;
  category_id?: string | null;
  brand?: string | null;
  size_chart_id?: string | null;
  wash_instruction_id?: string | null;
  collection_ids?: string[];
  status?: 'draft' | 'active' | 'archived';
  is_searchable?: boolean;
  enable_variant_image_switching?: boolean;
  tags?: string[];
  seo_keywords?: string[];
  meta_title?: string | null;
  meta_description?: string | null;
  hs_code?: string | null;
  country_of_origin?: string | null;
  ai_metadata?: Record<string, unknown>;
}

interface ListProductsOptions {
  status?: 'draft' | 'active' | 'archived';
  category_id?: string;
  brand?: string;
  is_searchable?: boolean;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'name' | 'base_price';
  order_direction?: 'asc' | 'desc';
}

export class ProductService {
  private static async resolveCategoryName(categoryId: string | null | undefined): Promise<string | null> {
    if (!categoryId) {
      return null;
    }

    const supabase = supabaseServer;
    const { data, error } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to resolve category: ${error.message}`);
    }

    if (!data?.name) {
      throw new Error('Selected category does not exist');
    }

    return data.name;
  }

  private static async syncSizeChartAssignment(
    productId: string,
    sizeChartId: string | null
  ): Promise<void> {
    const supabase = supabaseServer;

    if (sizeChartId) {
      const { error } = await supabase
        .from('product_size_charts')
        .upsert(
          {
            product_id: productId,
            size_chart_id: sizeChartId,
          },
          {
            onConflict: 'product_id',
          }
        );

      if (error) {
        console.error('Failed to link size chart:', error);
      }
      return;
    }

    const { error } = await supabase.from('product_size_charts').delete().eq('product_id', productId);
    if (error) {
      console.error('Failed to unlink size chart:', error);
    }
  }

  private static async syncCollectionAssignments(
    productId: string,
    collectionIds: string[]
  ): Promise<void> {
    const supabase = supabaseServer;

    const { error: deleteError } = await supabase.from('collection_items').delete().eq('product_id', productId);
    if (deleteError) {
      throw new Error(`Failed to clear collection assignments: ${deleteError.message}`);
    }

    if (collectionIds.length === 0) {
      return;
    }

    const rows = collectionIds.map((collectionId, index) => ({
      product_id: productId,
      collection_id: collectionId,
      position: index,
    }));

    const { error: insertError } = await supabase.from('collection_items').insert(rows as never);
    if (insertError) {
      throw new Error(`Failed to assign collections: ${insertError.message}`);
    }
  }

  /**
   * Create a new product
   * @throws Error if slug already exists or validation fails
   */
  static async create(data: CreateProductData): Promise<Product> {
    const supabase = supabaseServer;

    const { size_chart_id, wash_instruction_id, collection_ids = [], ...productData } = data;
    const categoryName = await this.resolveCategoryName(productData.category_id);

    // Check for duplicate slug
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('slug', data.slug)
      .single();

    if (existingProduct) {
      throw new Error(`Product with slug '${data.slug}' already exists`);
    }

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        short_description: productData.short_description ?? null,
        base_price: productData.base_price,
        cost_price: productData.cost_price ?? null,
        mrp: productData.mrp ?? null,
        discount_engine_enabled: productData.discount_engine_enabled ?? false,
        discount_type: productData.discount_type ?? 'percentage',
        discount_value: productData.discount_value ?? null,
        selling_price: productData.selling_price ?? null,
        fabric: productData.fabric ?? null,
        gsm: productData.gsm ?? null,
        fit_type: productData.fit_type ?? null,
        print_type: productData.print_type ?? null,
        shipping_charge: productData.shipping_charge ?? 0,
        shipping_included_in_price: productData.shipping_included_in_price ?? false,
        category: categoryName,
        category_id: productData.category_id,
        brand: productData.brand,
        wash_instruction_id: wash_instruction_id ?? null,
        status: productData.status || 'draft',
        is_searchable: productData.is_searchable !== false, // default true
        enable_variant_image_switching: productData.enable_variant_image_switching ?? true,
        tags: productData.tags || [],
        seo_keywords: productData.seo_keywords || [],
        meta_title: productData.meta_title ?? null,
        meta_description: productData.meta_description ?? null,
        hs_code: productData.hs_code,
        country_of_origin: productData.country_of_origin,
        ai_metadata: productData.ai_metadata || {},
      } as ProductInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    if (size_chart_id !== undefined) {
      await this.syncSizeChartAssignment(product.id, size_chart_id ?? null);
    }

    await this.syncCollectionAssignments(product.id, collection_ids);

    // Seed an initial ranking score so the product appears in shop/category
    // listings immediately.  Without this row, PostgREST sorts new products
    // to the very bottom because their ranking_score is NULL.
    // We use the same recency-decay formula as the ranking engine:
    //   recency_decay_boost = 30 / (days_old + 1)  →  30 for a brand-new product
    //   initial ranking_score = recency_boost + stock_score(1)  =  31
    try {
      const recencyBoost = 30; // day 0: 30 / (0 + 1)
      const initialScore = recencyBoost + 1; // + stock_score
      await supabase
        .from('product_ranking_scores')
        .upsert(
          {
            product_id: product.id,
            purchase_count: 0,
            view_count: 0,
            add_to_cart_count: 0,
            unique_user_views: 0,
            unique_session_views: 0,
            conversion_rate: 0,
            rating_score: 0,
            stock_score: 1,
            cart_score: 0,
            recency_decay_boost: recencyBoost,
            bestseller_boost: 0,
            ranking_score: initialScore,
            last_updated: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: 'product_id', ignoreDuplicates: true }
        );
    } catch (rankingErr) {
      // Non-fatal: the cron job will backfill scores; product creation succeeds either way
      console.error('Failed to seed initial ranking score:', rankingErr);
    }

    // Invalidate products list cache
    CacheService.invalidateProductsList();

    return product;
  }

  /**
   * Get product by ID
   * @returns Product or null if not found
   */
  static async getById(id: string): Promise<Product | null> {
    const supabase = supabaseServer;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    // Fetch size chart assignment if exists
    if (product) {
      const { data: sizeChartAssignment } = await supabase
        .from('product_size_charts')
        .select('size_chart_id')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Add size_chart_id to product object for admin form
      if (sizeChartAssignment) {
        (product as Record<string, unknown>).size_chart_id = sizeChartAssignment.size_chart_id;
      }

      const { data: collectionItems } = await supabase
        .from('collection_items')
        .select('collection_id, position')
        .eq('product_id', product.id)
        .order('position', { ascending: true });

      (product as Record<string, unknown>).collection_ids = (collectionItems || []).map((item: any) => item.collection_id);
    }

    return product;
  }

  /**
   * Get product by slug
   * @returns Product or null if not found
   */
  static async getBySlug(slug: string): Promise<Product | null> {
    const supabase = supabaseServer;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return product;
  }

  /**
   * List products with optional filters
   */
  static async list(options: ListProductsOptions = {}): Promise<{
    products: Product[];
    total: number;
  }> {
    const supabase = supabaseServer;

    let query = supabase.from('products').select('*', { count: 'exact' });

    // Apply filters
    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.category_id) {
      query = query.eq('category_id', options.category_id);
    }
    if (options.brand) {
      query = query.eq('brand', options.brand);
    }
    if (options.is_searchable !== undefined) {
      query = query.eq('is_searchable', options.is_searchable);
    }

    // Apply ordering
    const orderBy = options.order_by || 'created_at';
    const orderDirection = options.order_direction || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: products, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list products: ${error.message}`);
    }

    return {
      products: products || [],
      total: count || 0,
    };
  }

  /**
   * Update product by ID
   * @throws Error if product not found or validation fails
   */
  static async update(id: string, data: UpdateProductData): Promise<Product> {
    const supabase = supabaseServer;

    // Extract related-table fields separately (not columns on products table)
    const { size_chart_id, wash_instruction_id, collection_ids, ...productData } = data;

    if (wash_instruction_id !== undefined) {
      (productData as UpdateProductData & { wash_instruction_id?: string | null }).wash_instruction_id =
        wash_instruction_id;
    }

    if (Object.prototype.hasOwnProperty.call(productData, 'category_id')) {
      const categoryName = await this.resolveCategoryName(productData.category_id);
      (productData as UpdateProductData & { category?: string | null }).category = categoryName;
    }

    // Check if slug is being changed and if it conflicts
    if (productData.slug) {
      const { data: existingProduct, error } = await supabase
        .from('products')
        .select('id')
        .eq('slug', productData.slug)
        .neq('id', id)
        .maybeSingle();

      // Only throw error if we found a conflicting product (not if query returned no results)
      if (existingProduct && !error) {
        throw new Error(`Product with slug '${productData.slug}' already exists`);
      }
    }

    // Update product
    const { data: product, error } = await supabase
      .from('products')
      .update(productData as ProductUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Product not found');
      }
      throw new Error(`Failed to update product: ${error.message}`);
    }

    if (size_chart_id !== undefined) {
      await this.syncSizeChartAssignment(id, size_chart_id ?? null);
    }

    if (collection_ids !== undefined) {
      await this.syncCollectionAssignments(id, collection_ids);
    }

    // Invalidate caches
    CacheService.invalidateProduct(id);
    CacheService.invalidateProductsList();

    return product;
  }

  /**
   * Delete product by ID
   * Also deletes all related variants, images, embeddings (CASCADE)
   */
  static async delete(id: string): Promise<void> {
    const supabase = supabaseServer;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }

    // Invalidate all caches related to this product
    CacheService.invalidateAllProductCaches(id);
  }

  /**
   * Archive product (soft delete)
   * Sets status to 'archived' and is_searchable to false
   */
  static async archive(id: string): Promise<Product> {
    return this.update(id, {
      status: 'archived',
      is_searchable: false,
    });
  }

  /**
   * Restore archived product
   * Sets status to 'active' and is_searchable to true
   */
  static async restore(id: string): Promise<Product> {
    return this.update(id, {
      status: 'active',
      is_searchable: true,
    });
  }

  /**
   * Publish draft product
   * Sets status to 'active'
   */
  static async publish(id: string): Promise<Product> {
    return this.update(id, { status: 'active' });
  }

  /**
   * Unpublish active product
   * Sets status to 'draft'
   */
  static async unpublish(id: string): Promise<Product> {
    return this.update(id, { status: 'draft' });
  }
}
