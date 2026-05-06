'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

interface FBTProduct {
  id: string
  name: string
  slug: string
  base_price: number
  image_url?: string | null
  recommended_variant_id?: string | null
}

interface FrequentlyBoughtTogetherProps {
  productId: string
}

export default function FrequentlyBoughtTogether({ productId }: FrequentlyBoughtTogetherProps) {
  const { addToCart } = useCart()
  const [products, setProducts] = useState<FBTProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadFBT() {
      try {
        setLoading(true)
        const response = await fetch(`/api/products/${productId}/frequently-bought?limit=3`, { cache: 'no-store' })
        const json = await response.json()
        if (mounted && json?.success) {
          setProducts(json.products || [])
        }
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadFBT()
    return () => {
      mounted = false
    }
  }, [productId])

  const total = useMemo(
    () => products.reduce((sum, product) => sum + (product.base_price || 0), 0),
    [products]
  )

  const hasProducts = products.length > 0

  return (
    <section className="mt-16 lg:mt-20">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 lg:p-8">
        <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-6">Frequently Bought Together</h2>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {hasProducts ? products.map(product => (
            <Link 
              key={product.id} 
              href={`/product/${product.slug}`} 
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <Image 
                  src={product.image_url || '/placeholder.png'} 
                  alt={product.name} 
                  fill 
                  className="object-cover" 
                  sizes="80px" 
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.name}</p>
                <p className="text-sm font-semibold text-gray-900">Rs.{(product.base_price || 0).toLocaleString('en-IN')}</p>
              </div>
            </Link>
          )) : (
            <div className="md:col-span-3 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
              {loading
                ? 'Loading frequently bought together products...'
                : 'Frequently bought together products will appear here once recommendation data is available.'}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">Bundle Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {hasProducts ? `Rs.${total.toLocaleString('en-IN')}` : '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              products.forEach(product => {
                addToCart({
                  product_id: product.id,
                  variant_id: product.recommended_variant_id || `default-${product.id}`,
                  name: product.name,
                  price: product.base_price,
                  quantity: 1,
                  image_url: product.image_url || undefined,
                })
              })
            }}
            disabled={!hasProducts}
            className="w-full sm:w-auto h-12 px-8 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add All to Cart
          </button>
        </div>
      </div>
    </section>
  )
}
