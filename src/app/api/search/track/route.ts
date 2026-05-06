import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Track user interactions with search results
 * POST /api/search/track
 * 
 * Body: {
 *   query: string
 *   productId: string
 *   interactionType: 'view' | 'click' | 'cart_add' | 'purchase'
 *   position?: number
 *   similarityScore?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, productId, interactionType, position, similarityScore } = body

    if (!query || !productId || !interactionType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = supabaseServer
    
    // Get user ID if authenticated
    const { data: { user } } = await supabase.auth.getUser()
    
    // Get or create session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get('session_id')?.value
    
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      // Note: Setting cookie here won't work in API route
      // Should be set on client side or in middleware
    }

    // Track interaction
    const { error } = await supabase
      .from('search_interactions')
      .insert({
        search_query: query.toLowerCase().trim(),
        product_id: productId,
        user_id: user?.id || null,
        session_id: sessionId,
        interaction_type: interactionType,
        search_result_position: position || null,
        similarity_score: similarityScore || null,
      })

    if (error) {
      console.error('Failed to track interaction:', error)
      // Don't fail the request if tracking fails
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Track API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
