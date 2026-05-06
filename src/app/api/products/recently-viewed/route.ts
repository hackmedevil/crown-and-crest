import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/products/recently-viewed
 * 
 * Get recently viewed products for a user or session
 * Used to personalize product recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    const limit = Math.min(20, parseInt(request.nextUrl.searchParams.get('limit') || '8'))

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'userId or sessionId required' },
        { status: 400 }
      )
    }

    // Get recently viewed for specific user
    if (userId) {
      const { data, error } = await supabase.rpc('get_recently_viewed', {
        p_user_id: userId,
        p_limit: limit,
      })

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch recently viewed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        products: data || [],
      })
    }

    // For session-based tracking (client-side localStorage)
    // This is a placeholder - in production, you might store session data differently
    return NextResponse.json({
      success: true,
      products: [],
      message: 'Use client-side localStorage for anonymous sessions',
    })
  } catch (error) {
    console.error('Recently viewed API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/recently-viewed
 * 
 * Log a product view
 * Called when user views a product page
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, productId, sessionId } = await request.json()

    if (!userId || !productId) {
      return NextResponse.json(
        { error: 'userId and productId required' },
        { status: 400 }
      )
    }

    // Log the view
    const { data, error } = await supabase.rpc('log_product_view', {
      p_user_id: userId,
      p_product_id: productId,
      p_session_id: sessionId || null,
    })

    if (error) {
      console.error('Failed to log view:', error)
      // Don't fail the request - views are non-critical
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('View logging error:', error)
    // Return success anyway - don't break user experience for logging
    return NextResponse.json({
      success: true,
    })
  }
}
