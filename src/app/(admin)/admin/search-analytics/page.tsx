import { supabaseServer } from '@/lib/supabase/server'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

async function getSummary() {
  const [{ count: totalSearches }, { count: zeroResults }] = await Promise.all([
    supabaseServer.from('search_analytics').select('*', { count: 'exact', head: true }),
    supabaseServer.from('search_analytics').select('*', { count: 'exact', head: true }).eq('results_count', 0),
  ])

  return {
    totalSearches: totalSearches || 0,
    zeroResults: zeroResults || 0,
  }
}

async function getTopQueries() {
  const { data } = await supabaseServer
    .from('search_top_queries')
    .select('search_query, search_count, total_results, zero_results')
    .limit(10)

  return data || []
}

async function getTopProducts() {
  const { data } = await supabaseServer
    .from('search_top_products')
    .select('id, name, slug, image_url, category, click_count, cart_add_count, purchase_count')
    .limit(10)

  return data || []
}

export default async function SearchAnalyticsPage() {
  const [summary, topQueries, topProducts] = await Promise.all([
    getSummary(),
    getTopQueries(),
    getTopProducts(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Search quality, zero results, and top products</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Searches (30d)</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{summary.totalSearches}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Zero-Result Searches</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{summary.zeroResults}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Top Queries</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topQueries.map((query) => (
              <div key={query.search_query} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{query.search_query}</p>
                  <p className="text-xs text-gray-500">Zero results: {query.zero_results}</p>
                </div>
                <span className="text-sm font-bold text-gray-700">{query.search_count}</span>
              </div>
            ))}
            {topQueries.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500">No query data yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Top Products from Search</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topProducts.map((product) => (
              <div key={product.id} className="px-6 py-4 flex items-center gap-4">
                <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                  {product.image_url ? (
                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">No img</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.category || 'Uncategorized'}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Clicks: {product.click_count}</p>
                  <p>Cart adds: {product.cart_add_count}</p>
                  <p>Purchases: {product.purchase_count}</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div className="px-6 py-6 text-sm text-gray-500">No product interactions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
