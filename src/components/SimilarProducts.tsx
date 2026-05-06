'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface SimilarProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  imageUrl: string
  averageRating: number
  reviewCount: number
}

interface SimilarProductsProps {
  products: SimilarProduct[]
  title?: string
}

export default function SimilarProducts({
  products,
  title = 'Similar Products',
}: SimilarProductsProps) {
  if (!products || products.length === 0) return null

  return (
    <div className="py-12 border-t">
      <h2 className="text-2xl font-serif mb-6">{title}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(product => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="group"
          >
            <div className="bg-gray-100 rounded-lg overflow-hidden mb-3 aspect-square relative">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
            </div>

            <h3 className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition line-clamp-2">
              {product.name}
            </h3>

            <div className="flex items-center gap-2 mt-2 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round(product.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600">({product.reviewCount})</span>
            </div>

            <p className="text-sm font-bold text-gray-900">
              ₹{(product.basePrice / 100).toLocaleString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
