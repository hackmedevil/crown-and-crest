'use server'

import { createClient } from '@supabase/supabase-js'
import { WishlistItemWithProduct, WishlistStats, WishlistAlert, RecommendedProduct } from '@/types/wishlist'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: { persistSession: false },
  }
)

/**
 * Get user's complete wishlist with product & variant details
 */
export async function getUserWishlist(uid: string): Promise<WishlistItemWithProduct[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_wishlist_items')
      .select(`
        id,
        firebase_uid,
        product_id,
        price_alert,
        stock_alert,
        created_at,
        products:product_id (
          id,
          name,
          slug,
          description,
          images,
          base_price,
          category
        )
      `)
      .eq('firebase_uid', uid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getUserWishlist error:', JSON.stringify(error, null, 2))
      return []
    }

    if (!data) return []

    // Enrich with variant & alert info
    const enriched = await Promise.all(
      data.map(async (item: any) => {
        // Get primary variant for sizing info
        const { data: variants } = await supabaseAdmin
          .from('variants')
          .select('id, size, color, stock_quantity, low_stock_threshold')
          .eq('product_id', item.product_id)
          .limit(1)

        const variant = variants?.[0]
        const stockQuantity = variant?.stock_quantity || 0
        const lowStockThreshold = variant?.low_stock_threshold || 5

        return {
          ...item,
          product: item.products,
          variant: variant || undefined,
          isOutOfStock: stockQuantity === 0,
          isLowStock: stockQuantity > 0 && stockQuantity <= lowStockThreshold,
          stockAlertEligible: stockQuantity > 0, // Can alert if in stock
        }
      })
    )

    return enriched as WishlistItemWithProduct[]
  } catch (error) {
    console.error('getUserWishlist exception:', JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Check if product is in user's wishlist
 */
export async function isInWishlist(uid: string, productId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('account_wishlist_items')
      .select('id')
      .eq('firebase_uid', uid)
      .eq('product_id', productId)
      .single()

    if (error?.code === 'PGRST116') {
      // Not found
      return false
    }

    if (error) {
      console.error('isInWishlist error:', JSON.stringify(error, null, 2))
      return false
    }

    return !!data
  } catch (error) {
    console.error('isInWishlist exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Add product to wishlist
 */
export async function addToWishlist(uid: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('account_wishlist_items').insert({
      firebase_uid: uid,
      product_id: productId,
      price_alert: false,
      stock_alert: false,
    })

    if (error) {
      console.error('addToWishlist error:', JSON.stringify(error, null, 2))
      // Ignore duplicate key errors (already in wishlist)
      if (error.code === '23505') {
        return true
      }
      return false
    }

    return true
  } catch (error) {
    console.error('addToWishlist exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Remove product from wishlist
 */
export async function removeFromWishlist(uid: string, productId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('account_wishlist_items')
      .delete()
      .eq('firebase_uid', uid)
      .eq('product_id', productId)

    if (error) {
      console.error('removeFromWishlist error:', JSON.stringify(error, null, 2))
      return false
    }

    return true
  } catch (error) {
    console.error('removeFromWishlist exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Toggle price alert for wishlist item
 */
export async function togglePriceAlert(
  uid: string,
  productId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('account_wishlist_items')
      .update({ price_alert: enabled })
      .eq('firebase_uid', uid)
      .eq('product_id', productId)

    if (error) {
      console.error('togglePriceAlert error:', JSON.stringify(error, null, 2))
      return false
    }

    return true
  } catch (error) {
    console.error('togglePriceAlert exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Toggle stock alert for wishlist item
 */
export async function toggleStockAlert(
  uid: string,
  productId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('account_wishlist_items')
      .update({ stock_alert: enabled })
      .eq('firebase_uid', uid)
      .eq('product_id', productId)

    if (error) {
      console.error('toggleStockAlert error:', JSON.stringify(error, null, 2))
      return false
    }

    return true
  } catch (error) {
    console.error('toggleStockAlert exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Get wishlist statistics & alerts
 */
export async function getWishlistStats(uid: string): Promise<WishlistStats & { alerts: WishlistAlert[] }> {
  try {
    const wishlist = await getUserWishlist(uid)

    const stats: WishlistStats = {
      totalItems: wishlist.length,
      itemsOnAlert: wishlist.filter((w) => w.price_alert || w.stock_alert).length,
      itemsLowStock: wishlist.filter((w) => w.isLowStock).length,
      itemsPriceDropped: wishlist.filter((w) => w.priceDropped).length,
      estimatedSavings: 0, // TODO: Calculate based on price drops
    }

    // Build alerts
    const alerts: WishlistAlert[] = []

    wishlist.forEach((w) => {
      if (w.isLowStock && w.stock_alert) {
        const stockQty = w.variant?.stock_quantity || 0
        alerts.push({
          type: 'low_stock',
          productId: w.product_id,
          productName: w.product.name,
          message: `Only ${stockQty} left in stock!`,
          action: {
            label: 'View Item',
            href: `/product/${w.product.slug}`,
          },
        })
      }

      if (w.priceDropped && w.price_alert) {
        const savingsText = w.priceDropAmount
          ? `₹${(w.priceDropAmount / 100).toFixed(0)} off`
          : 'Price dropped'
        alerts.push({
          type: 'price_drop',
          productId: w.product_id,
          productName: w.product.name,
          message: `${savingsText}!`,
          action: {
            label: 'Add to Cart',
            href: `/product/${w.product.slug}?add=true`,
          },
        })
      }
    })

    return { ...stats, alerts }
  } catch (error) {
    console.error('getWishlistStats exception:', JSON.stringify(error, null, 2))
    return {
      totalItems: 0,
      itemsOnAlert: 0,
      itemsLowStock: 0,
      itemsPriceDropped: 0,
      estimatedSavings: 0,
      alerts: [],
    }
  }
}

/**
 * Clear entire wishlist
 */
export async function clearWishlist(uid: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('account_wishlist_items')
      .delete()
      .eq('firebase_uid', uid)

    if (error) {
      console.error('clearWishlist error:', JSON.stringify(error, null, 2))
      return false
    }

    return true
  } catch (error) {
    console.error('clearWishlist exception:', JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Get personalized recommendations based on wishlist
 */
export async function getWishlistRecommendations(
  uid: string,
  limit: number = 4
): Promise<RecommendedProduct[]> {
  try {
    const wishlist = await getUserWishlist(uid)
    if (wishlist.length === 0) return []

    // Get categories from wishlist
    const categories = [...new Set(wishlist.map((w) => w.product.category))]

    // Find similar products not in wishlist
    const wishlistProductIds = wishlist.map((w) => w.product_id)

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, images, base_price, category')
      .in('category', categories)
      .not('id', 'in', `(${wishlistProductIds.join(',')})`)
      .limit(limit)

    if (error) {
      console.error('getWishlistRecommendations error:', JSON.stringify(error, null, 2))
      return []
    }

    if (!data) return []

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      images: p.images,
      base_price: p.base_price,
      category: p.category,
      reason: 'similar_category' as const,
    }))
  } catch (error) {
    console.error('getWishlistRecommendations exception:', JSON.stringify(error, null, 2))
    return []
  }
}
