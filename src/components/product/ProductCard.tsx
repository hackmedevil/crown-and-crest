'use client'

import { useState, memo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Star, TruckIcon } from 'lucide-react'
import type { GridProduct } from '@/types/grid'

interface ProductCardProps {
  product: GridProduct
  priority?: boolean
  onWishlistToggle?: (productId: string, isWishlisted: boolean) => void
  onQuickAdd?: (productId: string, size?: string) => void
  prefetchOnHover?: boolean
}

/**
 * ProductCard Component
 * 
 * High-performance product card for grid display
 * Features:
 * - Image hover switch
 * - Wishlist integration
 * - Badge system (NEW, SALE, BESTSELLER)
 * - Rating display
 * - Color variant swatches
 * - Quick add on hover
 * - Optimized images
 * - Prefetch on hover
 */
function ProductCard({
  product,
  priority = false,
  onWishlistToggle,
  onQuickAdd,
  prefetchOnHover = true
}: ProductCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [selectedSize, setSelectedSize] = useState<string>()

  // Get primary image
  const primaryImage = product.media?.[0]?.cloudinary_public_id 
    ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_400,h_500,q_auto,f_auto/${product.media[0].cloudinary_public_id}`
    : product.image_url || '/placeholder.png'

  // Get hover image (second image or hover_image_url)
  const hoverImage = product.media?.[1]?.cloudinary_public_id
    ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_400,h_500,q_auto,f_auto/${product.media[1].cloudinary_public_id}`
    : product.hover_image_url || primaryImage

  // Get current display image
  const currentImage = isHovered && hoverImage !== primaryImage ? hoverImage : primaryImage

  // Calculate discount percentage if not provided
  const discountPercentage = product.discount_percentage || 
    (product.mrp && product.base_price < product.mrp 
      ? Math.round(((product.mrp - product.base_price) / product.mrp) * 100)
      : 0)

  const handleWishlistClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const newState = !isWishlisted
    setIsWishlisted(newState)
    onWishlistToggle?.(product.id, newState)
  }, [isWishlisted, onWishlistToggle, product.id])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    setShowQuickAdd(true)
    
    // Prefetch product page
    if (prefetchOnHover) {
      router.prefetch(`/product/${product.slug}`)
    }
  }, [prefetchOnHover, router, product.slug])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setShowQuickAdd(false)
  }, [])

  const handleColorClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedColorIndex(index)
  }, [])

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickAdd?.(product.id, selectedSize)
  }, [onQuickAdd, product.id, selectedSize])

  // Available sizes (mock data - should come from variants)
  const sizes = ['S', 'M', 'L', 'XL']

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100 mb-3">
          {/* Product Image */}
          <Image
            src={currentImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
          />

          {/* Badges - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.is_new && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                NEW
              </span>
            )}
            {product.is_on_sale && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                SALE
              </span>
            )}
            {product.is_bestseller && (
              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                BESTSELLER
              </span>
            )}
          </div>

          {/* Wishlist Button - Top Right */}
          <button
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform z-10"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-700'
              }`}
            />
          </button>

          {/* Quick Add Section - Bottom (shown on hover) */}
          {showQuickAdd && onQuickAdd && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 transform transition-transform duration-300">
              {/* Size Selection */}
              <div className="flex gap-2 mb-2 justify-center">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelectedSize(size)
                    }}
                    className={`px-3 py-1 text-xs font-medium border rounded transition-colors ${
                      selectedSize === size
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-900 border-gray-300 hover:border-black'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleQuickAdd}
                disabled={!selectedSize}
                className="w-full bg-black text-white text-xs font-bold py-2 rounded uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          {/* Rating */}
          {product.rating && product.review_count && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.rating}</span>
              <span className="text-gray-500">({product.review_count})</span>
            </div>
          )}

          {/* Brand */}
          {product.brand && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {product.brand}
            </p>
          )}

          {/* Product Title */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </h3>

          {/* Price Section */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-gray-900">
              ₹{product.base_price.toLocaleString('en-IN')}
            </span>
            {product.mrp && product.mrp > product.base_price && (
              <>
                <span className="text-sm text-gray-500 line-through">
                  ₹{product.mrp.toLocaleString('en-IN')}
                </span>
                {discountPercentage > 0 && (
                  <span className="text-xs font-bold text-green-600">
                    {discountPercentage}% OFF
                  </span>
                )}
              </>
            )}
          </div>

          {/* Color Variants */}
          {product.color_variants && product.color_variants.length > 0 && (
            <div className="flex items-center gap-1.5">
              {product.color_variants.slice(0, 5).map((variant, index) => (
                <button
                  key={variant.id}
                  onClick={(e) => handleColorClick(e, index)}
                  aria-label={`Select ${variant.color} color`}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    selectedColorIndex === index ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: variant.color_code || variant.color }}
                />
              ))}
              {product.color_variants.length > 5 && (
                <span className="text-xs text-gray-500 ml-1">
                  +{product.color_variants.length - 5}
                </span>
              )}
            </div>
          )}

          {/* Delivery Message */}
          {product.delivery_message && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <TruckIcon className="w-4 h-4" />
              <span>{product.delivery_message}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(ProductCard)
