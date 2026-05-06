'use client'

import Image from 'next/image'
import Link from 'next/link'
import { RecommendedProduct } from '@/types/wishlist'
import { formatPrice, getRecommendationReasonLabel, getDefaultImage } from '@/lib/wishlist/constants'

interface WishlistRecommendationsProps {
  recommendations: RecommendedProduct[]
}

export default function WishlistRecommendations({ recommendations }: WishlistRecommendationsProps) {
  if (!recommendations.length) return null

  return (
    <div className="border-t border-black">
      <div className="px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <h2 className="text-3xl font-black tracking-tight mb-8">YOU MAY ALSO LIKE</h2>

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendations.map((product) => {
            // Get primary image
            const images = Array.isArray(product.images)
              ? product.images
              : product.images
                ? JSON.parse(String(product.images))
                : []
            const primaryImage =
              images.length > 0
                ? typeof images[0] === 'string'
                  ? images[0]
                  : images[0].url
                : getDefaultImage()

            return (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group"
              >
                <div className="relative w-full aspect-square bg-black overflow-hidden mb-3">
                  <Image
                    src={primaryImage}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = getDefaultImage()
                    }}
                  />

                  {/* Reason Badge */}
                  {product.reason && (
                    <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 text-xs font-medium">
                      {getRecommendationReasonLabel(product.reason)}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <h3 className="text-xs font-black tracking-tight group-hover:underline line-clamp-2">
                  {product.name.toUpperCase()}
                </h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">{product.category}</p>
                <p className="text-sm font-bold mt-2">{formatPrice(product.base_price)}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
