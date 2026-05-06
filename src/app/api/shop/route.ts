import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/shop
 * 
 * Fetch products with dynamic filters, sorting, and pagination.
 * Replaces hardcoded filters with database queries.
 * 
 * Query Parameters:
 * - category: UUID of category to filter by
 * - minPrice: minimum price in paise
 * - maxPrice: maximum price in paise
 * - size: product size (XS, S, M, L, XL, XXL)
 * - sort: 'newest' | 'price_asc' | 'price_desc' | 'bestseller'
 * - search: text search across product name/description
 * - page: page number (1-indexed)
 * - limit: items per page (default 20, max 100)
 * 
 * Response: { products, total, page, pageSize, categories, filters }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Extract query parameters
    const categoryId = searchParams.get('category')
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null
    const size = searchParams.get('size')
    const sort = searchParams.get('sort') || 'newest'
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
    const offset = (page - 1) * limit

    // Build the base query
    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        base_price,
        image_url,
        category_id,
        description,
        product_analytics(views_count, orders_count)
        `,
        { count: 'exact' }
      )
      .eq('is_active', true)

    // Apply filters
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (minPrice !== null) {
      query = query.gte('base_price', minPrice)
    }

    if (maxPrice !== null) {
      query = query.lte('base_price', maxPrice)
    }

    if (search) {
      // Use full-text search if available
      query = query.textSearch('search_vector', search, {
        type: 'websearch',
        config: 'english',
      })
    }

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('base_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('base_price', { ascending: false })
        break
      case 'bestseller':
        // Join with product_analytics and sort by orders
        query = query.order('orders_count', {
          ascending: false,
          foreignTable: 'product_analytics',
        })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply size filter if provided
    if (size) {
      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .select('product_id')
        .eq('size', size)

      if (!variantError && variantData?.length > 0) {
        const productIds = [...new Set(variantData.map(v => v.product_id))]
        query = query.in('id', productIds)
      }
    }

    // Execute the main query with pagination
    const { data: products, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    // Fetch all categories for filter options
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    // Get available sizes from product_variants
    const { data: availableSizes } = await supabase
      .from('product_variants')
      .select('size')
      .in(
        'product_id',
        products?.map(p => p.id) || []
      )

    // Calculate price range from filtered products
    const priceRange = products && products.length > 0
      ? {
          min: Math.min(...products.map(p => p.base_price)),
          max: Math.max(...products.map(p => p.base_price)),
        }
      : { min: 0, max: 0 }

    // Format response
    const formattedProducts = products?.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      basePrice: product.base_price,
      imageUrl: product.image_url,
      categoryId: product.category_id,
      description: product.description,
      viewsCount: product.product_analytics?.[0]?.views_count || 0,
      ordersCount: product.product_analytics?.[0]?.orders_count || 0,
    })) || []

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: {
        categories: categories?.map(c => ({ id: c.id, name: c.name, slug: c.slug })) || [],
        sizes: [...new Set(availableSizes?.map(v => v.size) || [])].sort(),
        priceRange,
        currentFilters: {
          categoryId: categoryId || null,
          minPrice,
          maxPrice,
          size: size || null,
          sort,
          search: search || null,
        },
      },
    })
  } catch (error) {
    console.error('Shop API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
