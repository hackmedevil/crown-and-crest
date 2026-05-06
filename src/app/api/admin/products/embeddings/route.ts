import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { batchGenerateProductEmbeddings } from '@/lib/ai/embeddings'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for batch processing

/**
 * Admin API to batch generate embeddings for all products
 * POST /api/admin/products/embeddings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    await requireAdmin()

    // Fetch all products without embeddings (or all if specified)
    const { data: products, error } = await supabaseServer
      .from('products')
      .select('id, name, description, category, tags, ai_title, ai_description, ai_tags, season, fabric, usage, style, weather, style_keywords')
      .in('embedding_status', ['missing', 'pending', 'failed', 'outdated'])

    if (error) {
      throw error
    }

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All products already have embeddings',
        processed: 0,
      })
    }

    const productsForEmbedding = products.map((product) => ({
      id: product.id,
      title: product.ai_title || product.name,
      description: product.ai_description || product.description || undefined,
      category: product.category || undefined,
      tags: (product.ai_tags || product.tags || undefined) as string[] | undefined,
      season: product.season ?? undefined,
      fabric: product.fabric ?? undefined,
      usage: product.usage ?? undefined,
      style_keywords: product.style_keywords ?? undefined,
    }))

    // Generate embeddings in batch
    const embeddings = await batchGenerateProductEmbeddings(
      productsForEmbedding,
      (current, total) => {
        console.log(`Generating embeddings: ${current}/${total}`)
      }
    )

    // Update products with embeddings
    let successCount = 0
    let failCount = 0

    for (const [productId, embedding] of embeddings.entries()) {
      const { error: updateError } = await supabaseServer
        .from('products')
        .update({ 
          embedding: JSON.stringify(embedding),
          embedding_status: 'completed',
          embedding_generated_at: new Date().toISOString(),
          embedding_error: null
        })
        .eq('id', productId)

      if (updateError) {
        console.error(`Failed to update product ${productId}:`, updateError)
        failCount++
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: products.length,
      successful: successCount,
      failed: failCount,
      message: `Generated embeddings for ${successCount} products`,
    })
  } catch (error) {
    console.error('Batch embedding generation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate embeddings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
