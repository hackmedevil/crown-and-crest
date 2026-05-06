'use client'

/**
 * Complete Product Grid Examples
 * 
 * This file demonstrates various implementations of the product grid system:
 * 1. Basic grid with infinite scroll
 * 2. Grid with filters and sorting
 * 3. Search results grid
 * 4. Featured products on homepage
 * 5. Large catalog with virtualization
 */

import { useState, useCallback } from 'react'
import ProductGrid from '@/components/product/ProductGrid'
import VirtualizedProductGrid from '@/components/product/VirtualizedProductGrid'
import { useProducts } from '@/hooks/useProducts'
import { sortProducts, filterByPriceRange } from '@/lib/product-grid-utils'
import type { GridProduct } from '@/types/grid'
import toast from 'react-hot-toast'

// ============================================================================
// EXAMPLE 1: Basic Category Page with Infinite Scroll
// ============================================================================

export function BasicCategoryPage() {
  const { products, loading, hasMore, loadMore } = useProducts({
    endpoint: '/api/products',
    pageSize: 12
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>
      
      <ProductGrid
        products={products}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  )
}

// ============================================================================
// EXAMPLE 2: Category Page with Filters and Sorting
// ============================================================================

export function CategoryPageWithFilters() {
  const { products: rawProducts, loading, hasMore, loadMore } = useProducts()
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'rating'>('newest')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 })

  // Apply filters and sorting
  const filteredProducts = filterByPriceRange(
    sortProducts(rawProducts, sortBy),
    priceRange.min,
    priceRange.max
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Men&apos;s Clothing</h1>

      {/* Filters and Sort */}
      <div className="flex gap-4 mb-8 flex-wrap">
        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-4 py-2 border rounded"
        >
          <option value="newest">Newest First</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>

        {/* Price Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Price:</span>
          <input
            type="number"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
            className="w-24 px-2 py-2 border rounded"
            placeholder="Min"
          />
          <span>-</span>
          <input
            type="number"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
            className="w-24 px-2 py-2 border rounded"
            placeholder="Max"
          />
        </div>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={filteredProducts}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  )
}

// ============================================================================
// EXAMPLE 3: Search Results Page
// ============================================================================

export function SearchResultsPage({ query }: { query: string }) {
  const { products, loading, hasMore, loadMore } = useProducts({
    endpoint: `/api/products/search?q=${encodeURIComponent(query)}`,
    pageSize: 16
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          Search Results for &quot;{query}&quot;
        </h1>
        <p className="text-gray-600">
          {loading ? 'Searching...' : `${products.length} products found`}
        </p>
      </div>

      <ProductGrid
        products={products}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        columns={{ mobile: 2, tablet: 3, desktop: 4 }}
      />
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Featured Products Section (Homepage)
// ============================================================================

export function FeaturedProductsSection() {
  const [products, setProducts] = useState<GridProduct[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch featured products
  useState(() => {
    fetch('/api/products/featured')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  })

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Featured Collection</h2>
          <p className="text-gray-600">Handpicked favorites just for you</p>
        </div>

        <ProductGrid
          products={products.slice(0, 8)} // Show only 8 products
          loading={loading}
          columns={{ mobile: 2, tablet: 3, desktop: 4 }}
          prefetchOnHover={true}
          skeletonCount={8}
        />

        <div className="text-center mt-8">
          <a
            href="/shop"
            className="inline-block px-8 py-3 bg-black text-white rounded hover:bg-gray-800"
          >
            View All Products
          </a>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// EXAMPLE 5: Large Catalog with Virtualization (1000+ products)
// ============================================================================

export function LargeCatalogPage() {
  const [products, setProducts] = useState<GridProduct[]>([])
  const [loading, setLoading] = useState(true)

  // Load all products at once for virtualization
  useState(() => {
    fetch('/api/products/all')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  })

  const handleWishlistToggle = useCallback((productId: string, isWishlisted: boolean) => {
    toast.success(isWishlisted ? 'Added to wishlist' : 'Removed from wishlist')
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p>Loading catalog...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-2xl font-bold">Complete Catalog ({products.length} products)</h1>
      </div>
      
      <div className="flex-1">
        <VirtualizedProductGrid
          products={products}
          columnCount={4}
          rowHeight={500}
          gap={24}
          onWishlistToggle={handleWishlistToggle}
        />
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 6: Grid with Wishlist and Quick Add
// ============================================================================

export function InteractiveGrid() {
  const { products, loading, hasMore, loadMore } = useProducts()

  const handleWishlistToggle = useCallback(async (productId: string, isWishlisted: boolean) => {
    try {
      const endpoint = isWishlisted ? '/api/wishlist/add' : '/api/wishlist/remove'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (response.ok) {
        toast.success(isWishlisted ? 'Added to wishlist' : 'Removed from wishlist')
      }
    } catch (error) {
      console.error('Wishlist error:', error)
      toast.error('Failed to update wishlist')
    }
  }, [])

  const handleQuickAdd = useCallback(async (productId: string, size?: string) => {
    if (!size) {
      toast.error('Please select a size')
      return
    }

    try {
      const response = await fetch('/api/cart/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, size, quantity: 1 })
      })

      if (response.ok) {
        toast.success('Added to cart!')
      } else {
        toast.error('Failed to add to cart')
      }
    } catch (error) {
      console.error('Quick add error:', error)
      toast.error('Failed to add to cart')
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">New Arrivals</h1>

      <ProductGrid
        products={products}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        onWishlistToggle={handleWishlistToggle}
        onQuickAdd={handleQuickAdd}
        prefetchOnHover={true}
      />
    </div>
  )
}

// ============================================================================
// EXAMPLE 7: Custom Layout (5 columns on large screens)
// ============================================================================

export function CustomLayoutGrid() {
  const { products, loading, hasMore, loadMore } = useProducts()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Trending Now</h1>

      <ProductGrid
        products={products}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        columns={{
          mobile: 2,
          tablet: 3,
          desktop: 5  // 5 columns on large screens
        }}
      />
    </div>
  )
}
