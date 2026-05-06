import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { generateProductEmbedding } from '@/lib/ai/embeddings'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin API to generate embeddings for products
 * POST /api/admin/products/[id]/embedding - Generate for one product
 * POST /api/admin/products/embeddings - Batch generate for all products
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin auth
    await requireAdmin()

    const productId = (await params).id

    // Fetch product
    const { data: product, error } = await supabaseServer
      .from('products')
      .select('id, name, description, category, tags, ai_title, ai_description, ai_tags, season, fabric, usage, style, weather, style_keywords')
      .eq('id', productId)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Generate embedding
    const embedding = await generateProductEmbedding({
      name: product.name,
      description: product.description,
      category: product.category,
      tags: product.tags,
      ai_title: product.ai_title,
      ai_description: product.ai_description,
      ai_tags: product.ai_tags,
      season: product.season,
      fabric: product.fabric,
      usage: product.usage,
      style: product.style,
      weather: product.weather,
      style_keywords: product.style_keywords,
    })

    // Update product with embedding
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
      console.error('Failed to update embedding:', updateError)
      return NextResponse.json(
        { error: 'Failed to save embedding' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      productId,
      message: 'Embedding generated successfully',
    })
  } catch (error) {
    console.error('Error generating embedding:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate embedding',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
