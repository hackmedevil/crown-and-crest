import { supabaseServer } from '@/lib/supabase/server'
import type { GridProduct } from '@/types/grid'
import {
  ProductModules,
  CategoryGrid,
  FeaturedCollection,
  PromoSection,
  TrustSection,
  type Category
} from '@/components/homepage'

export const metadata = {
  title: 'Crown & Crest - Premium Fashion & Lifestyle',
  description: 'Discover the latest trends in fashion. Shop our curated collection of premium clothing, accessories, and lifestyle products. Free shipping above ₹999.',
}

export const revalidate = 300 // Cache for 5 minutes

function isMissingSchemaError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : ''

  return code === '42703' || code === 'PGRST202'
}

function logHomepageWarning(scope: string, error: unknown) {
  if (isMissingSchemaError(error)) {
    return
  }

  console.error(`${scope}:`, error)
}

/**
 * Fetch categories from database
 */
async function getCategories(): Promise<Category[]> {
  try {
    const primaryQuery = await supabaseServer
      .from('categories')
      .select('id, name, slug, description, image_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(6)

    if (!primaryQuery.error) {
      return (primaryQuery.data || []) as Category[]
    }

    if (!isMissingSchemaError(primaryQuery.error)) {
      logHomepageWarning('Categories fetch error', primaryQuery.error)
      return []
    }

    const fallbackQuery = await supabaseServer
      .from('categories')
      .select('id, name, slug, description, image_url')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)

    if (fallbackQuery.error) {
      logHomepageWarning('Categories fallback error', fallbackQuery.error)
      return []
    }

    return (fallbackQuery.data || []) as Category[]
  } catch (error) {
    logHomepageWarning('Categories error', error)
    return []
  }
}

/**
 * Fetch trending products from ranking API
 */
async function getTrendingProducts(): Promise<GridProduct[]> {
  try {
    const rpcQuery = await supabaseServer.rpc('get_trending_products_v3', {
      p_limit: 8,
    })

    if (!rpcQuery.error && (rpcQuery.data || []).length > 0) {
      const ids: string[] = (rpcQuery.data || []).map((row: { product_id: string }) => row.product_id)

      const { data: products, error: productsError } = await supabaseServer
        .from('products')
        .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at, average_rating, review_count, is_new, is_bestseller')
        .in('id', ids)
        .eq('is_active', true)
        .eq('published', true)

      if (!productsError) {
        const byId = new Map((products || []).map((product) => [product.id, product]))
        const orderedProducts = ids
          .map((id: string) => byId.get(id))
          .filter(Boolean) as Array<NonNullable<(typeof products)[number]>>

        return orderedProducts
          .map((product) => ({
            ...product,
            rating: product.average_rating || 0,
            discount_percentage:
              product.mrp && product.base_price < product.mrp
                ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
                : 0,
          })) as GridProduct[]
      }
    }

    if (!isMissingSchemaError(rpcQuery.error)) {
      logHomepageWarning('Trending products error', rpcQuery.error)
      return []
    }

    const fallbackQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at, rating, review_count, is_new, is_bestseller')
      .eq('is_active', true)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (fallbackQuery.error) {
      logHomepageWarning('Trending products fallback error', fallbackQuery.error)
      return []
    }

    return (fallbackQuery.data || []).map(product => ({
      ...product,
      is_new: product.is_new ?? true,
      discount_percentage: product.mrp && product.base_price < product.mrp
        ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
        : 0,
    })) as GridProduct[]
  } catch (error) {
    logHomepageWarning('Trending products error', error)
    return []
  }
}

/**
 * Fetch best sellers by purchase count
 */
async function getBestSellers(): Promise<GridProduct[]> {
  try {
    const primaryQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at, purchase_count')
      .eq('is_active', true)
      .eq('published', true)
      .order('purchase_count', { ascending: false })
      .limit(8)

    if (!primaryQuery.error) {
      return (primaryQuery.data || []).map(product => ({
        ...product,
        is_bestseller: true,
        discount_percentage: product.mrp && product.base_price < product.mrp
          ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
          : 0
      })) as GridProduct[]
    }

    if (!isMissingSchemaError(primaryQuery.error)) {
      logHomepageWarning('Best sellers error', primaryQuery.error)
      return []
    }

    const fallbackQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at')
      .eq('is_active', true)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (fallbackQuery.error) {
      logHomepageWarning('Best sellers fallback error', fallbackQuery.error)
      return []
    }

    return (fallbackQuery.data || []).map(product => ({
      ...product,
      is_bestseller: true,
      discount_percentage: product.mrp && product.base_price < product.mrp
        ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
        : 0
    })) as GridProduct[]
  } catch (error) {
    logHomepageWarning('Best sellers error', error)
    return []
  }
}

/**
 * Fetch new arrivals
 */
async function getNewArrivals(): Promise<GridProduct[]> {
  try {
    const { data, error } = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at')
      .eq('is_active', true)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) {
      console.error('New arrivals error:', error)
      return []
    }

    // Transform data to GridProduct format
    return (data || []).map(product => ({
      ...product,
      is_new: true,
      discount_percentage: product.mrp && product.base_price < product.mrp
        ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
        : 0
    })) as GridProduct[]
  } catch (error) {
    console.error('New arrivals error:', error)
    return []
  }
}

/**
 * Fallback feed when ranking-based queries return no products.
 */
async function getHomepageFallbackProducts(): Promise<GridProduct[]> {
  try {
    const primaryQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, published, created_at, is_new, is_bestseller')
      .eq('is_active', true)
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(16)

    if (!primaryQuery.error && (primaryQuery.data || []).length > 0) {
      return (primaryQuery.data || []).map(product => ({
        ...product,
        discount_percentage: product.mrp && product.base_price < product.mrp
          ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
          : 0,
      })) as GridProduct[]
    }

    const relaxedQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, description, base_price, mrp, image_url, category, brand, is_active, created_at, is_new, is_bestseller')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(16)

    if (!relaxedQuery.error && (relaxedQuery.data || []).length > 0) {
      return (relaxedQuery.data || []).map(product => ({
        ...product,
        discount_percentage: product.mrp && product.base_price < product.mrp
          ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
          : 0,
      })) as GridProduct[]
    }

    const schemaSafeQuery = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(16)

    if (schemaSafeQuery.error) {
      logHomepageWarning('Homepage fallback products error', schemaSafeQuery.error)
      return []
    }

    return (schemaSafeQuery.data || []).map(product => ({
      ...product,
      discount_percentage: product.mrp && product.base_price < product.mrp
        ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
        : 0,
    })) as GridProduct[]
  } catch (error) {
    logHomepageWarning('Homepage fallback products error', error)
    return []
  }
}

/**
 * Homepage - Server Component
 * 
 * Fetches all data server-side and renders homepage sections
 * Cached for 5 minutes for optimal performance
 */
export default async function HomePage() {
  // Fetch all data in parallel
  const [categories, trendingProducts, bestSellers, newArrivals, fallbackProducts] = await Promise.all([
    getCategories(),
    getTrendingProducts(),
    getBestSellers(),
    getNewArrivals(),
    getHomepageFallbackProducts(),
  ])

  return (
    <main className="min-h-screen bg-white">
      {/* 1. Modular Product Blocks */}
      <ProductModules
        trendingProducts={trendingProducts}
        bestSellers={bestSellers}
        newArrivals={newArrivals}
        fallbackProducts={fallbackProducts}
      />

      {/* 2. Category Discovery */}
      <CategoryGrid categories={categories} />

      {/* 6. Featured Collection Banner */}
      <FeaturedCollection />

      {/* 7. Promotion Section */}
      <PromoSection />

      {/* 8. Trust Section */}
      <TrustSection />


      {/* 10. Footer - Already in layout */}
    </main>
  )
}
