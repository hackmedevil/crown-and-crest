'use client'

import { useCart } from '@/context/CartContext'

interface AddToCartButtonProps {
  productId: string
  productName: string
  productSlug: string
  variantId: string
  price: number
  quantity: number
  disabled?: boolean
  size?: string | null
  color?: string | null
  imageUrl?: string
}

export default function AddToCartButton({
  productId,
  productName,
  productSlug,
  variantId,
  price,
  quantity,
  disabled = false,
  size,
  color,
  imageUrl,
}: AddToCartButtonProps) {
  const { addToCart, addToRecentlyViewed } = useCart()

  const cartPayload = {
    product_id: productId,
    variant_id: variantId,
    name: productName,
    price,
    quantity,
    size: size || undefined,
    color: color || undefined,
    image_url: imageUrl,
  }

  const touchRecentlyViewed = () => {
    addToRecentlyViewed({
      product_id: productId,
      name: productName,
      slug: productSlug,
      price,
      image_url: imageUrl,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          addToCart(cartPayload)
          touchRecentlyViewed()
        }}
        className="h-12 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Add to Cart
      </button>
    </div>
  )
}
