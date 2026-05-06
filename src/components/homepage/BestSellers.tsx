import ProductCard from '@/components/product/ProductCard'
import type { GridProduct } from '@/types/grid'
import Link from 'next/link'
import { Award } from 'lucide-react'

interface BestSellersProps {
  products: GridProduct[]
  title?: string
}

export default function BestSellers({ 
  products, 
  title = "Best Sellers" 
}: BestSellersProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-600" />
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="text-gray-600 mt-1">
                Customer favorites you can't miss
              </p>
            </div>
          </div>
          <Link
            href="/shop?sort=bestseller"
            className="hidden md:inline-flex items-center gap-2 text-black font-semibold hover:gap-3 transition-all"
          >
            View All
            <span>→</span>
          </Link>
        </div>

        {/* Products - Mobile Carousel, Desktop Grid */}
        {products.length > 0 ? (
          <>
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 pb-4">
                {products.map((product, index) => (
                  <div key={product.id} className="flex-none w-[280px] snap-start">
                    <ProductCard
                      product={product}
                      priority={index < 4}
                      prefetchOnHover
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop: Grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 4}
                  prefetchOnHover
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No bestseller products available</p>
          </div>
        )}

        {/* Mobile View All Button */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/shop?sort=bestseller"
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-all"
          >
            View All Best Sellers
          </Link>
        </div>
      </div>
    </section>
  )
}
