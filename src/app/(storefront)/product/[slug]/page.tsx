import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getProductForPDP } from '@/lib/products/getProductForPDP'
import type { GridProduct } from '@/types/grid'
import Breadcrumb from '@/components/product/Breadcrumb'
import ProductDetailClient from './ProductDetailClient'
import ProductDetailPageClient from '@/components/product/ProductDetailPageClient'
import ProductDetailStudioClient from '../../../../components/product/ProductDetailStudioClient'

export const revalidate = 1800

interface ProductPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ view?: string }>
}

const getCachedProduct = cache(getProductForPDP)

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const pdpData = await getCachedProduct(slug)

  if (!pdpData) {
    return {
      title: 'Product Not Found | Crown & Crest',
    }
  }

  return {
    title: `${pdpData.product.name} | Crown & Crest`,
    description: pdpData.product.description?.slice(0, 160) || 'Premium product from Crown & Crest',
    openGraph: {
      title: pdpData.product.name,
      description: pdpData.product.description?.slice(0, 160) || 'Premium product from Crown & Crest',
      images: [pdpData.images.hero],
    },
  }
}

async function getRelatedProducts(currentProductId: string, categoryId: string | null, tags: string[]): Promise<GridProduct[]> {
  try {
    const similarRpc = await supabaseServer.rpc('get_similar_products_v3', {
      p_product_id: currentProductId,
      p_limit: 8,
    })

    if (!similarRpc.error && (similarRpc.data || []).length > 0) {
      const ids: string[] = (similarRpc.data || []).map((row: { product_id: string }) => row.product_id)
      const { data: similarProducts, error: similarProductsError } = await supabaseServer
        .from('products')
        .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category_id')
        .in('id', ids)
        .eq('is_active', true)

      if (!similarProductsError && similarProducts) {
        const byId = new Map(similarProducts.map((product) => [product.id, product]))
        return ids
          .map((id: string) => byId.get(id))
          .filter(Boolean) as GridProduct[]
      }
    }

    let query = supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category_id')
      .eq('is_active', true)
      .neq('id', currentProductId)
      .limit(8)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data: categoryBased, error } = await query

    if (!error && categoryBased && categoryBased.length > 0) {
      return categoryBased as GridProduct[]
    }

    // Only query tags if no category-based results found and tags exist
    if (tags.length > 0) {
      const { data: tagBased } = await supabaseServer
        .from('products')
        .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category_id')
        .eq('is_active', true)
        .neq('id', currentProductId)
        .overlaps('tags', tags.slice(0, 3))
        .limit(8)

      if (tagBased && tagBased.length > 0) {
        return tagBased as GridProduct[]
      }
    }

    return []
  } catch {
    return []
  }
}

async function getReviewSummary(productId: string): Promise<{ average: number; total: number }> {
  try {
    const { data, error } = await supabaseServer
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)

    if (error || !data || data.length === 0) {
      return { average: 0, total: 0 }
    }

    const total = data.length
    const average = data.reduce((sum, row) => sum + (row.rating || 0), 0) / total

    return { average, total }
  } catch {
    return { average: 0, total: 0 }
  }
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const pdpData = await getCachedProduct(slug)

  if (!pdpData) {
    notFound()
  }

  const [relatedProducts, reviewSummary] = await Promise.all([
    getRelatedProducts(
      pdpData.product.id,
      pdpData.product.category?.id || null,
      pdpData.product.tags || []
    ),
    getReviewSummary(pdpData.product.id),
  ])

  // Breadcrumb logic (direct render)
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    ...(pdpData.product.category?.name
      ? [{ label: pdpData.product.category.name, href: `/shop?category=${pdpData.product.category.name.toLowerCase()}` }]
      : []),
    { label: pdpData.product.name },
  ]

  const useLegacyPdp = resolvedSearchParams?.view === 'legacy'
  const useCurrentPdp = resolvedSearchParams?.view === 'current'

  return (
    <main className="max-w-[1520px] mx-auto px-4 md:px-6 lg:px-10 py-8 md:py-10 lg:py-12">
      <Breadcrumb items={breadcrumbItems} />
      {useLegacyPdp ? (
        <ProductDetailPageClient
          pdpData={pdpData}
          relatedProducts={relatedProducts}
          initialRating={reviewSummary.average || 4.6}
          initialReviewCount={reviewSummary.total}
        />
      ) : useCurrentPdp ? (
        <ProductDetailClient
          pdpData={pdpData}
          relatedProducts={relatedProducts.map((product) => ({
            id: product.id,
            name: product.name,
            slug: product.slug,
            base_price: product.base_price,
            image_url: product.image_url || null,
            category: (product.category as string | null | undefined) || null,
          }))}
        />
      ) : (
        <ProductDetailStudioClient
          pdpData={pdpData}
          relatedProducts={relatedProducts}
          initialRating={reviewSummary.average || 4.6}
          initialReviewCount={reviewSummary.total}
        />
      )}
    </main>
  )
}
