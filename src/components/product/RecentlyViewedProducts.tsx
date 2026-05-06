'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary/optimizeImageUrl'

const STORAGE_KEY = 'recently_viewed_products'
const MAX_RENDER_ITEMS = 6

interface RecentlyViewedProduct {
  id: string
  name: string
  slug: string
  image: string
  price: number
}

function readStoredRecentlyViewed(): RecentlyViewedProduct[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        slug: String(item.slug ?? ''),
        image: String(item.image ?? ''),
        price: Number(item.price ?? 0),
      }))
      .filter(item => item.id && item.name && item.slug)
  } catch {
    return []
  }
}

export default function RecentlyViewedProducts({ currentProductId }: { currentProductId: string }) {
  const [storedProducts] = useState<RecentlyViewedProduct[]>(() => readStoredRecentlyViewed())

  const visibleProducts = useMemo(() => {
    return storedProducts
      .filter(product => product.id !== currentProductId)
      .slice(0, MAX_RENDER_ITEMS)
  }, [storedProducts, currentProductId])

  // Hide section unless there are at least 2 recently viewed items (excluding current product).
  if (visibleProducts.length < 2) return null

  return (
    <section className="mt-16 md:mt-24 border-t border-gray-100 pt-16">
      <h2 className="text-xl font-display text-gray-900 mb-8 uppercase tracking-widest">
        Recently Viewed
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-8 md:overflow-visible">
        {visibleProducts.map(product => {
          const imageUrl = product.image
            ? optimizeCloudinaryUrl(product.image, {
                quality: 'auto:good',
                format: 'auto',
                dpr: true,
              })
            : '/placeholder.png'

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group block w-[44vw] min-w-[44vw] md:w-auto md:min-w-0"
              aria-label={`View ${product.name}`}
            >
              <div className="aspect-[3/4] relative bg-gray-100 rounded-lg overflow-hidden mb-3">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 44vw, 25vw"
                  loading="lazy"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h3 className="text-sm font-medium text-gray-900 group-hover:underline decoration-1 underline-offset-4 line-clamp-2">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Rs. {product.price.toLocaleString('en-IN')}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
