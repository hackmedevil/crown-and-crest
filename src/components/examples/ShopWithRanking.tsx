/**
 * Example Shop Component Using Ranking System
 * 
 * Shows how to integrate the ranking engine into a shop/category page
 */

'use client'

import { useState } from 'react'
import {
  SORT_OPTIONS,
  getRankingBadge,
} from '@/lib/ranking'
import { useCategoryRanking, useSortingUI } from '@/hooks/useProductRanking'
import type { SortOption } from '@/lib/ranking'

interface ShopExampleProps {
  categoryId: string
  categoryName: string
}

export default function ShopExample({ categoryId, categoryName }: ShopExampleProps) {
  const [minPrice, setMinPrice] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)

  // Use the ranking hook
  const ranking = useCategoryRanking(categoryId, {
    sortBy: 'ranking',
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    pageSize: 24,
  })

  // Handle sorting
  const handleSortChange = (newSort: SortOption) => {
    ranking.changeSortBy(newSort)
  }

  // Apply filters
  const handlePriceFilter = (min?: number, max?: number) => {
    setMinPrice(min || null)
    setMaxPrice(max || null)
    ranking.refetch()
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{categoryName}</h1>
        <p className="text-gray-600 mt-2">
          Showing {ranking.products.length} of {ranking.total} products
        </p>
      </div>

      {/* Filters and Sorting */}
      <div className="flex gap-4 mb-6">
        {/* Sort Dropdown */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Sort By</label>
          <select
            value={ranking.sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {Object.values(SORT_OPTIONS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Price Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-2">Price Range</label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice || ''}
              onChange={(e) =>
                handlePriceFilter(
                  e.target.value ? parseInt(e.target.value) : undefined,
                  maxPrice || undefined
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice || ''}
              onChange={(e) =>
                handlePriceFilter(
                  minPrice || undefined,
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {ranking.loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      )}

      {/* Error State */}
      {ranking.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p>{ranking.error}</p>
          <button
            onClick={() => ranking.refetch()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!ranking.loading && ranking.products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {ranking.products.map((product) => (
            <div
              key={product.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* Product Image */}
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-48 object-cover bg-gray-100"
                />
              )}

              {/* Product Info */}
              <div className="p-4">
                {/* Ranking Badge */}
                {ranking.sortBy === 'ranking' && (
                  <div className="mb-2">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {getRankingBadge(Math.min(
                        Math.max(
                          (product.rankingScore / 2000) * 100,
                          0
                        ),
                        100
                      ))}
                    </span>
                  </div>
                )}

                {/* Name */}
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                  {product.name}
                </h3>

                {/* Rating */}
                {product.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-yellow-400">★</span>
                    <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                    {product.reviewCount && (
                      <span className="text-xs text-gray-500">
                        ({product.reviewCount})
                      </span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div className="text-lg font-bold text-green-600 mb-3">
                  ₹{(product.basePrice / 100).toLocaleString()}
                </div>

                {/* Ranking Score (if sorting by ranking) */}
                {ranking.sortBy === 'ranking' && (
                  <div className="text-xs text-gray-500 mb-3">
                    Ranking: {product.rankingScore.toFixed(0)} points
                  </div>
                )}

                {/* Add to Cart Button */}
                <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!ranking.loading && ranking.products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No products found</p>
          <button
            onClick={() => ranking.refetch()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Pagination */}
      {!ranking.loading && ranking.total > ranking.pageSize && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => ranking.goToPage(ranking.page - 1)}
            disabled={ranking.page === 1}
            className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, Math.ceil(ranking.total / ranking.pageSize)) }).map(
            (_, i) => {
              const pageNum = ranking.page - 2 + i
              if (pageNum < 1 || pageNum > Math.ceil(ranking.total / ranking.pageSize)) {
                return null
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => ranking.goToPage(pageNum)}
                  className={`px-4 py-2 border rounded ${
                    ranking.page === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              )
            }
          )}

          <button
            onClick={() =>
              ranking.goToPage(
                Math.min(ranking.page + 1, Math.ceil(ranking.total / ranking.pageSize))
              )
            }
            disabled={ranking.page === Math.ceil(ranking.total / ranking.pageSize)}
            className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Usage in a page:
 * 
 * import ShopExample from '@/components/examples/ShopExample'
 * 
 * export default function CategoryPage() {
 *   return (
 *     <ShopExample
 *       categoryId="category-uuid"
 *       categoryName="Electronics"
 *     />
 *   )
 * }
 */
