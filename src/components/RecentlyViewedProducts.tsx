'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface RecentlyViewedProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  imageUrl: string
  viewedAt: string
}

export default function RecentlyViewedProducts() {
  const [products, setProducts] = useState<RecentlyViewedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch recently viewed products from localStorage or API
    const fetchRecentlyViewed = async () => {
      try {
        // Try to get from session storage first
        const sessionId = localStorage.getItem('session_id') || 'anonymous'

        const response = await fetch(
          `/api/products/recently-viewed?sessionId=${sessionId}&limit=8`
        )

        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch recently viewed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentlyViewed()
  }, [])

  if (loading || products.length === 0) return null

  return (
    <div className="py-12 border-t">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-serif">Your Recently Viewed</h2>
        <Link href="/shop" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {products.map(product => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="group flex-shrink-0 w-full"
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

            <h3 className="text-sm font-medium text-gray-900 group-hover:text-amber-600 transition line-clamp-2 mb-2">
              {product.name}
            </h3>

            <p className="text-sm font-bold text-gray-900">
              ₹{(product.basePrice / 100).toLocaleString()}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Viewed {formatTimeAgo(new Date(product.viewedAt))} ago
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return date.toLocaleDateString()
}
