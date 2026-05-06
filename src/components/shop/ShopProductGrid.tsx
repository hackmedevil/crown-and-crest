'use client'

import ProductCard from '@/components/ProductCard'
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton'
import { ShopProduct } from './types'

interface ShopProductGridProps {
  products: ShopProduct[]
  loading: boolean
}

export default function ShopProductGrid({ products, loading }: ShopProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <ProductCardSkeleton key={idx} />
        ))}
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 p-8 text-center text-gray-600">
        No products matched these filters.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          slug={product.slug}
          price={product.base_price}
          imageUrl={product.image_url}
          category={product.brand}
          rating={product.rating || 0}
          reviewCount={product.review_count || 0}
        />
      ))}
    </div>
  )
}
