'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import ProductCard from '@/components/ProductCard'
import { Button } from '@/components/ui/Button'

interface Product {
  id: string
  name: string
  slug: string
  basePrice: number
  imageUrl: string
  categoryId: string
  description: string
  viewsCount: number
  ordersCount: number
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ShopFilters {
  categories: Category[]
  sizes: string[]
  priceRange: { min: number; max: number }
  currentFilters: {
    categoryId: string | null
    minPrice: number | null
    maxPrice: number | null
    size: string | null
    sort: string
    search: string | null
  }
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function ShopClient() {
  const searchParams = useSearchParams()

  // State
  const [products, setProducts] = useState<Product[]>([])
  const [filters, setFilters] = useState<ShopFilters | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  )
  const [selectedSize, setSelectedSize] = useState<string | null>(searchParams.get('size'))
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000])
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  // Fetch products
  const fetchProducts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('limit', '20')
        params.set('sort', sortBy)

        if (selectedCategory) params.set('category', selectedCategory)
        if (selectedSize) params.set('size', selectedSize)
        if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString())
        if (priceRange[1] < 100000) params.set('maxPrice', priceRange[1].toString())
        if (searchQuery) params.set('search', searchQuery)

        const response = await fetch(`/api/shop?${params.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch products')

        const data = await response.json()
        setProducts(data.products)
        setFilters(data.filters)
        setPagination(data.pagination)
        setPriceRange([
          data.filters.priceRange.min,
          data.filters.priceRange.max,
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setLoading(false)
      }
    },
    [selectedCategory, selectedSize, priceRange, sortBy, searchQuery]
  )

  useEffect(() => {
    fetchProducts(1)
  }, [fetchProducts])

  const handleResetFilters = () => {
    setSelectedCategory(null)
    setSelectedSize(null)
    setSortBy('newest')
    setSearchQuery('')
    setPriceRange([0, 100000])
  }

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId)
  }

  const handleSizeChange = (size: string | null) => {
    setSelectedSize(size === selectedSize ? null : size)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif mb-2">Shop</h1>
          <p className="text-gray-600">
            {pagination.total} product{pagination.total !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Product name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Categories */}
              {filters?.categories && filters.categories.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Category</h3>
                  <div className="space-y-2">
                    {filters.categories.map(category => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategory === category.id}
                          onChange={() => handleCategoryChange(category.id)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              {filters?.priceRange && (
                <div>
                  <h3 className="font-semibold mb-3">Price</h3>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={filters.priceRange.min}
                      max={filters.priceRange.max}
                      step="100"
                      value={priceRange[1]}
                      onChange={e =>
                        setPriceRange([priceRange[0], parseInt(e.target.value)])
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm">
                      <span>₹{priceRange[0].toLocaleString()}</span>
                      <span>₹{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sizes */}
              {filters?.sizes && filters.sizes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Size</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {filters.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => handleSizeChange(size)}
                        className={`py-2 text-sm font-medium rounded border transition ${
                          selectedSize === size
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Button */}
              {(selectedCategory || selectedSize || searchQuery) && (
                <Button
                  variant="secondary"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Main Content - Products Grid */}
          <div className="lg:col-span-3">
            {/* Sort Bar */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {products.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}
                {' - '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} products
              </p>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-amber-600"
              >
                <option value="newest">Newest</option>
                <option value="bestseller">Best Sellers</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={() => fetchProducts(1)}>Try Again</Button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={product.basePrice}
                    imageUrl={product.imageUrl}
                    category={null}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-xl font-serif mb-2">No products found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your filters</p>
                <Button onClick={handleResetFilters}>Clear Filters</Button>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fetchProducts(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                {[...Array(pagination.totalPages)].map((_, i) => {
                  const pageNum = i + 1
                  const isNear = Math.abs(pageNum - pagination.page) <= 2
                  if (pageNum === 1 || pageNum === pagination.totalPages || isNear) {
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? 'primary' : 'secondary'}
                        onClick={() => fetchProducts(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  }
                  if (i === 1 || i === pagination.totalPages - 2) {
                    return <span key={`dots-${i}`}>...</span>
                  }
                  return null
                })}
                <Button
                  variant="secondary"
                  onClick={() => fetchProducts(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
