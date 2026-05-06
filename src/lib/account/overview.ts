'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type {
  AccountOverviewData,
  AccountOverviewProduct,
  AccountOverviewStats,
  AccountOverviewOrder,
} from '@/lib/account/types'

const ACTIVE_STATUSES = [
  'CREATED',
  'PAYMENT_PENDING',
  'PAID',
  'FULFILLMENT_PENDING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
]

export async function getAccountOverview(uid: string): Promise<AccountOverviewData> {
  const nowIso = new Date().toISOString()

  const [
    userResult,
    walletResult,
    savingsResult,
    offersResult,
    ordersCountResult,
    activeOrdersResult,
    wishlistResult,
    recommendationsResult,
    recentlyViewedResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('full_name, avatar_url, email')
      .eq('firebase_uid', uid)
      .maybeSingle(),
    supabaseAdmin
      .from('account_wallets')
      .select('balance')
      .eq('firebase_uid', uid)
      .maybeSingle(),
    supabaseAdmin
      .from('account_savings')
      .select('total_saved')
      .eq('firebase_uid', uid)
      .maybeSingle(),
    supabaseAdmin
      .from('account_offers')
      .select('id', { count: 'exact', head: true })
      .eq('firebase_uid', uid)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('firebase_uid', uid),
    supabaseAdmin
      .from('orders')
      .select('id, status, estimated_delivery_date, created_at')
      .eq('firebase_uid', uid)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('account_wishlist_items')
      .select('product_id, price_alert, stock_alert, created_at')
      .eq('firebase_uid', uid)
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('account_recommendations')
      .select('product_id, reason, created_at')
      .eq('firebase_uid', uid)
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('account_recently_viewed')
      .select('product_id, viewed_at')
      .eq('firebase_uid', uid)
      .order('viewed_at', { ascending: false })
      .limit(8),
  ])

  const wishlistIds = (wishlistResult.data ?? []).map((item) => item.product_id)
  const recommendationIds = (recommendationsResult.data ?? []).map((item) => item.product_id)
  const recentlyViewedIds = (recentlyViewedResult.data ?? []).map((item) => item.product_id)
  const productIds = Array.from(new Set([...wishlistIds, ...recommendationIds, ...recentlyViewedIds]))

  const productsResult = productIds.length > 0
    ? await supabaseAdmin
        .from('products')
        .select('id, name, slug, base_price, image_url')
        .in('id', productIds)
    : { data: [] as Array<{ id: string; name: string; slug: string; base_price: number; image_url: string | null }> }

  const productMap = new Map(
    (productsResult.data ?? []).map((product) => [product.id, product])
  )

  const activeOrderIds = (activeOrdersResult.data ?? []).map((order) => order.id)
  const activeOrderItemsResult = activeOrderIds.length > 0
    ? await supabaseAdmin
        .from('order_items')
        .select('order_id, product_id, product_name, created_at')
        .in('order_id', activeOrderIds)
        .order('created_at', { ascending: true })
    : { data: [] as Array<{ order_id: string; product_id: string; product_name: string; created_at: string }> }

  const activeOrderProductIds = Array.from(
    new Set((activeOrderItemsResult.data ?? []).map((item) => item.product_id))
  )

  const activeOrderProductsResult = activeOrderProductIds.length > 0
    ? await supabaseAdmin
        .from('products')
        .select('id, slug')
        .in('id', activeOrderProductIds)
    : { data: [] as Array<{ id: string; slug: string | null }> }

  const productSlugMap = new Map(
    (activeOrderProductsResult.data ?? []).map((product) => [product.id, product.slug])
  )

  const orderItemsByOrder = new Map<string, Array<{ product_name: string; product_id: string }>>()
  for (const item of activeOrderItemsResult.data ?? []) {
    const existing = orderItemsByOrder.get(item.order_id) ?? []
    existing.push({
      product_name: item.product_name,
      product_id: item.product_id,
    })
    orderItemsByOrder.set(item.order_id, existing)
  }

  const toProduct = (productId: string): AccountOverviewProduct | null => {
    const product = productMap.get(productId)
    if (!product) return null
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.base_price,
      imageUrl: product.image_url || null,
    }
  }

  const wishlist = (wishlistResult.data ?? [])
    .map((item) => {
      const product = toProduct(item.product_id)
      if (!product) return null
      return {
        ...product,
        stockLabel: item.stock_alert ? 'Low stock' : 'Available',
        priceLabel: item.price_alert ? 'Price drop' : 'On wishlist',
      }
    })
    .filter(Boolean) as AccountOverviewProduct[]

  const recommendations = (recommendationsResult.data ?? [])
    .map((item) => {
      const product = toProduct(item.product_id)
      if (!product) return null
      return {
        ...product,
        note: item.reason || 'Based on your style',
      }
    })
    .filter(Boolean) as AccountOverviewProduct[]

  const recentlyViewed = (recentlyViewedResult.data ?? [])
    .map((item) => {
      const product = toProduct(item.product_id)
      if (!product) return null
      return product
    })
    .filter(Boolean) as AccountOverviewProduct[]

  const activeOrders: AccountOverviewOrder[] = (activeOrdersResult.data ?? []).map((order) => {
    const orderItems = orderItemsByOrder.get(order.id) ?? []
    const primaryItem = orderItems[0]
    return {
      id: order.id,
      status: order.status,
      eta: order.estimated_delivery_date || null,
      productName: primaryItem?.product_name ?? 'Ordered Product',
      productSlug: primaryItem ? (productSlugMap.get(primaryItem.product_id) ?? null) : null,
      itemsCount: orderItems.length,
    }
  })

  const stats: AccountOverviewStats = {
    totalOrders: ordersCountResult.count ?? 0,
    totalSaved: savingsResult.data?.total_saved ?? 0,
    activeOffers: offersResult.count ?? 0,
    walletBalance: walletResult.data?.balance ?? 0,
  }

  const profileName = userResult.data?.full_name || userResult.data?.email || 'Member'

  return {
    profile: {
      name: profileName,
      avatarUrl: userResult.data?.avatar_url ?? null,
      referralCode: null,
    },
    stats,
    activeOrders,
    wishlist,
    recommendations,
    recentlyViewed,
  }
}
