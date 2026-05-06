import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    let refreshResult: any[] | null = null
    let refreshError: { message?: string } | null = null

    const v3 = await supabase.rpc('refresh_multilayer_ranking_v3')
    if (!v3.error) {
      refreshResult = v3.data as any[]
    } else {
      const legacy = await supabase.rpc('refresh_product_ranking_scores')
      refreshResult = legacy.data as any[]
      refreshError = legacy.error
    }

    if (refreshError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to refresh product ranking',
          details: refreshError.message || 'Unknown error',
        },
        { status: 500 }
      )
    }

    const durationMs = Date.now() - startedAt

    return NextResponse.json({
      success: true,
      refreshed_products:
        refreshResult?.[0]?.refreshed_products ||
        refreshResult?.[0]?.refreshed_count ||
        0,
      refreshed_user_vectors: refreshResult?.[0]?.refreshed_user_vectors || 0,
      refreshed_feature_vectors: refreshResult?.[0]?.refreshed_feature_vectors || 0,
      duration_ms: durationMs,
      refreshed_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
