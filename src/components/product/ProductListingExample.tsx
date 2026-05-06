'use client'

import { useCallback } from 'react'
import ProductGrid from '@/components/product/ProductGrid'
import { useProducts } from '@/hooks/useProducts'
import { addToCart } from '@/lib/cart/actions'
import toast from 'react-hot-toast'

/**
 * Example Product Listing Page
 * 
 * Demonstrates usage of ProductGrid with infinite scroll
 * This can be used for:
 * - Home page
 * - Category pages
 * - Search results
 * - Collections
 */
export default function ProductListingExample() {
  // Fetch products with infinite scroll
  const {
    products,
    loading,
    error,
    hasMore,
    loadMore
  } = useProducts({
    initialCursor: new Date().toISOString(),
    pageSize: 12,
    endpoint: '/api/products',
    autoFetch: true
  })

  // Handle wishlist toggle
  const handleWishlistToggle = useCallback((productId: string, isWishlisted: boolean) => {
    // TODO: Implement wishlist API call
    console.log('Wishlist toggle:', productId, isWishlisted)
    
    if (isWishlisted) {
      toast.success('Added to wishlist')
    } else {
      toast.success('Removed from wishlist')
    }
  }, [])

  // Handle quick add to cart
  const handleQuickAdd = useCallback(async (productId: string, size?: string) => {
    if (!size) {
      toast.error('Please select a size')
      return
    }

    try {
      // Find the product and variant
      const product = products.find(p => p.id === productId)
      if (!product) return

      // TODO: Find variant based on size
      // For now, using a placeholder variant_id
      const formData = new FormData()
      formData.append('variant_id', 'placeholder-variant-id')
      formData.append('quantity', '1')

      const result = await addToCart(null, formData)

      if (result.success) {
        toast.success('Added to cart!')
      } else {
        toast.error(result.error || 'Failed to add to cart')
      }
    } catch (error) {
      console.error('Quick add error:', error)
      toast.error('Failed to add to cart')
    }
  }, [products])

  // Handle errors
  if (error) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <p className="text-red-600">Failed to load products</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          All Products
        </h1>
        <p className="text-gray-600">
          {products.length > 0 && `${products.length} products`}
        </p>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        onWishlistToggle={handleWishlistToggle}
        onQuickAdd={handleQuickAdd}
        prefetchOnHover={true}
        columns={{
          mobile: 2,
          tablet: 3,
          desktop: 4
        }}
      />
    </div>
  )
}
