import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface CategoryHeaderProps {
  categoryName?: string
  categorySlug?: string
  productCount: number
  currentPage: number
  productsPerPage: number
}

export default function CategoryHeader({
  categoryName = 'All Products',
  categorySlug,
  productCount,
  currentPage,
  productsPerPage
}: CategoryHeaderProps) {
  const startIndex = (currentPage - 1) * productsPerPage + 1
  const endIndex = Math.min(currentPage * productsPerPage, productCount)

  return (
    <div className="bg-white border-b border-gray-200 py-6 px-4 md:px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/shop" className="hover:text-black transition-colors">
            Shop
          </Link>
          {categorySlug && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-black font-medium">{categoryName}</span>
            </>
          )}
        </nav>

        {/* Category Title & Count */}
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {categoryName}
          </h1>
          
          <p className="text-sm text-gray-600 whitespace-nowrap">
            {productCount > 0 ? (
              <>
                Showing <span className="font-semibold">{startIndex}–{endIndex}</span> of{' '}
                <span className="font-semibold">{productCount}</span> products
              </>
            ) : (
              'No products found'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
