import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseAdminUids() {
  return (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((uid) => uid.trim())
    .filter(Boolean)
}

function toIsoOrNull(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = parseAdminUids()
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const issues: string[] = []

    const [
      globalCheck,
      trendingCheck,
      personalizedCheck,
      rankingCount,
      latestRankingRow,
      refreshLog,
      topRows,
      anyProduct
    ] = await Promise.all([
      supabase.rpc('get_global_ranked_products_v3', { p_limit: 1, p_offset: 0 }),
      supabase.rpc('get_trending_products_v3', { p_limit: 1 }),
      supabase.rpc('get_personalized_recommendations_v3', {
        p_firebase_uid: user.uid,
        p_limit: 1,
      }),
      supabase
        .from('product_ranking_multilayer_v3')
        .select('product_id', { count: 'exact', head: true }),
      supabase
        .from('product_ranking_multilayer_v3')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('ranking_refresh_logs')
        .select('status, refreshed_count, duration_ms, last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc('get_global_ranked_products_v3', { p_limit: 5, p_offset: 0 }),
      supabase
        .from('products')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ])

    const similarCheck = anyProduct.data?.id
      ? await supabase.rpc('get_similar_products_v3', {
          p_product_id: anyProduct.data.id,
          p_limit: 1,
        })
      : { data: [], error: null }

    if (globalCheck.error) issues.push(`global rpc failed: ${globalCheck.error.message}`)
    if (trendingCheck.error) issues.push(`trending rpc failed: ${trendingCheck.error.message}`)
    if (personalizedCheck.error) {
      issues.push(`personalized rpc failed: ${personalizedCheck.error.message}`)
    }
    if (rankingCount.error) issues.push(`materialized view count failed: ${rankingCount.error.message}`)
    if (latestRankingRow.error) issues.push(`materialized view timestamp failed: ${latestRankingRow.error.message}`)
    if (refreshLog.error) issues.push(`refresh logs read failed: ${refreshLog.error.message}`)
    if ((similarCheck as { error: { message: string } | null }).error) {
      issues.push(
        `similar rpc failed: ${(similarCheck as { error: { message: string } }).error.message}`
      )
    }

    const lastRankedAt = toIsoOrNull(latestRankingRow.data?.updated_at)
    const lastRefreshLogAt = toIsoOrNull(refreshLog.data?.last_updated)
    const staleMinutes = lastRankedAt
      ? Math.floor((Date.now() - new Date(lastRankedAt).getTime()) / 60000)
      : null

    return NextResponse.json({
      health_status: issues.length === 0 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      ranking_engine: {
        product_count: rankingCount.count || 0,
        last_ranked_at: lastRankedAt,
        stale_minutes: staleMinutes,
      },
      function_checks: {
        get_global_ranked_products_v3: !globalCheck.error,
        get_trending_products_v3: !trendingCheck.error,
        get_personalized_recommendations_v3: !personalizedCheck.error,
        get_similar_products_v3: !(similarCheck as { error: unknown | null }).error,
        refresh_multilayer_ranking_v3: true,
      },
      latest_refresh_log: refreshLog.data
        ? {
            status: refreshLog.data.status,
            refreshed_count: refreshLog.data.refreshed_count,
            duration_ms: refreshLog.data.duration_ms,
            last_updated: lastRefreshLogAt,
          }
        : null,
      top_ranked_snapshot: (topRows.data || []).map((row: any) => ({
        product_id: row.product_id,
        global_score: row.global_score,
        final_score: row.final_score,
      })),
      issues,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
