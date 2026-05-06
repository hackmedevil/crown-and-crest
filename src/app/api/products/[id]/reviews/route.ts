import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/products/[id]/reviews
 * 
 * Fetch product reviews with rating distribution
 * Supports sorting, filtering, pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const limit = Math.min(20, parseInt(request.nextUrl.searchParams.get('limit') || '10'))
    const sortBy = request.nextUrl.searchParams.get('sort') || 'recent'
    const minRating = request.nextUrl.searchParams.get('minRating')

    const offset = (page - 1) * limit

    // Build review query
    let query = supabase
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', id)

    if (minRating) {
      query = query.gte('rating', parseInt(minRating))
    }

    // Apply sorting
    switch (sortBy) {
      case 'helpful':
        query = query.order('helpful_count', { ascending: false })
        break
      case 'rating_high':
        query = query.order('rating', { ascending: false })
        break
      case 'rating_low':
        query = query.order('rating', { ascending: true })
        break
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    const { data: reviews, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reviews' },
        { status: 500 }
      )
    }

    // Get rating distribution
    const { data: distribution } = await supabase.rpc('get_rating_distribution', {
      p_product_id: id,
    })

    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      ratingDistribution: distribution || [],
    })
  } catch (error) {
    console.error('Reviews API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/[id]/reviews
 * 
 * Submit a new review for the product
 * Requires authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { rating, title, review_text, images } = await request.json()

    // Validation
    if (!rating || !title || !review_text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from('product_reviews')
      .select('id')
      .eq('product_id', id)
      .eq('user_id', user.uid)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    // Check if this is a verified purchase
    const { data: purchaseData } = await supabase
      .from('order_items')
      .select('orders!inner(user_id)')
      .eq('product_id', id)
      .eq('orders.user_id', user.uid)
      .limit(1)

    const verifiedPurchase = !!purchaseData && purchaseData.length > 0

    // Insert review
    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: id,
        user_id: user.uid,
        user_name: 'Anonymous',
        user_email: '',
        rating,
        title,
        review_text,
        images: images || [],
        verified_purchase: verifiedPurchase,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to submit review' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        review,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
