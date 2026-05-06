import ProductCard from './ProductCard'
import type { GridProduct } from '@/types/grid'

interface Props {
  products: Array<
    GridProduct | {
      id: string
      name: string
      slug: string
      base_price: number
      image_url: string | null
      category: string | null
    }
  >
  title?: string
}

export default function RelatedProducts({ products, title = 'Complete The Look' }: Props) {
  const hasProducts = !!products && products.length > 0

  if (!hasProducts) {
    return (
      <section className="mt-20 lg:mt-24 border-t border-gray-200 pt-16 lg:pt-20">
        <h2 className="text-2xl lg:text-3xl font-display text-gray-900 mb-8 lg:mb-10 uppercase tracking-widest">
          {title}
        </h2>
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          Product recommendations will appear here once ranking and recommendation data is available.
        </div>
      </section>
    )
  }

  const normalizedProducts: GridProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    base_price: product.base_price,
    image_url: product.image_url ?? undefined,
    category: product.category ?? undefined,
    mrp: 'mrp' in product ? product.mrp : undefined,
    rating: 'rating' in product ? product.rating : undefined,
    review_count: 'review_count' in product ? product.review_count : undefined,
    discount_percentage: 'discount_percentage' in product ? product.discount_percentage : undefined,
    is_new: 'is_new' in product ? product.is_new : undefined,
    is_bestseller: 'is_bestseller' in product ? product.is_bestseller : undefined,
    brand: 'brand' in product ? product.brand : undefined,
    is_active: true,
  }))

  return (
    <section className="mt-20 lg:mt-24 border-t border-gray-200 pt-16 lg:pt-20">
      <h2 className="text-2xl lg:text-3xl font-display text-gray-900 mb-8 lg:mb-10 uppercase tracking-widest">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        {normalizedProducts.map((product, index) => (
          <ProductCard key={product.id} product={product} priority={index < 2} prefetchOnHover />
        ))}
      </div>
    </section>
  )
}
