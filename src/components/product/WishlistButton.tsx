'use client'

import { Heart } from 'lucide-react'
import { useCart } from '@/context/CartContext'

interface WishlistButtonProps {
  productId: string
  name: string
  slug: string
  price: number
  imageUrl?: string
}

export default function WishlistButton({ productId, name, slug, price, imageUrl }: WishlistButtonProps) {
  const { toggleWishlist, isInWishlist } = useCart()
  const active = isInWishlist(productId)

  return (
    <button
      type="button"
      onClick={() =>
        toggleWishlist({
          product_id: productId,
          name,
          slug,
          price,
          image_url: imageUrl,
        })
      }
      className="inline-flex items-center justify-center h-11 w-11 border border-gray-300 rounded-lg hover:border-gray-500 transition-colors"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart className={`w-5 h-5 ${active ? 'fill-red-500 text-red-500' : 'text-gray-800'}`} />
    </button>
  )
}
