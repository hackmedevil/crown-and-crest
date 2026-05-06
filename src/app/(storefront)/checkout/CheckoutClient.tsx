'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Truck, Shield, RotateCcw } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { getGuestCart } from '@/lib/cart/guestCart'
import { getCart, getGuestCartDetails } from '@/lib/cart/actions'
import FullPageSkeleton from '@/components/ui/FullPageSkeleton'
import type { CartItem } from '@/types/cart'

export default function CheckoutClient() {
  const router = useRouter()
  const { isAuthenticated, requireAuth } = useAuth()
  const { cart: clientCart } = useCart()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [subtotal, setSubtotal] = useState(0)

  // Load cart items on mount
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true)

      try {
        if (isAuthenticated) {
          // Authenticated: Load server cart
          const items = await getCart()
          if (items.length === 0) {
            router.replace('/cart')
            return
          }
          setCartItems(items)
          calculateTotals(items)
        } else {
          // Guest: Load from localStorage
          const guestCartItems = getGuestCart()
          if (guestCartItems.length === 0) {
            router.replace('/cart')
            return
          }

          const details = await getGuestCartDetails(guestCartItems)
          if (details.length === 0) {
            router.replace('/cart')
            return
          }

          setCartItems(details)
          calculateTotals(details)
        }
      } catch (error) {
        console.error('Failed to load cart for checkout:', error)
        router.replace('/cart')
      } finally {
        setIsLoading(false)
      }
    }

    loadCart()
  }, [isAuthenticated, router])

  const calculateTotals = (items: CartItem[]) => {
    const total = items.reduce((sum, item) => {
      const price = item.variants?.price_override ?? item.products.base_price
      return sum + (price * item.quantity)
    }, 0)
    setSubtotal(total)
  }

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      // Guests need to login before placing order
      await requireAuth(async () => {
        setIsPlacingOrder(true)
        // After login, reload cart from server
        const items = await getCart()
        setCartItems(items)
        calculateTotals(items)
        setIsPlacingOrder(false)
        // Then show message that they're ready to proceed
      }, 'checkout')
      return
    }

    setIsPlacingOrder(true)
    try {
      // TODO: Call payment API / initiate Razorpay payment
      console.log('Placing order with items:', cartItems)
      // For now, show a placeholder
      alert('Payment integration coming soon!')
    } catch (error) {
      console.error('Failed to place order:', error)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  if (isLoading) {
    return <FullPageSkeleton />
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add items to your cart to proceed with checkout.</p>
        <Link
          href="/shop"
          className="bg-black text-white px-8 py-3 rounded text-sm font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  const shippingCost = 0
  const tax = Math.round(subtotal * 0.18) // 18% GST placeholder
  const total = subtotal + shippingCost + tax

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Summary</h1>

            {/* Cart Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="relative w-20 h-24 bg-gray-100 rounded overflow-hidden shrink-0">
                      <Image
                        src={item.products.image_url || '/placeholder.png'}
                        alt={item.products.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.products.slug}`}
                        className="text-sm font-semibold text-gray-900 hover:underline line-clamp-2"
                      >
                        {item.products.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.variants.size && <span>{item.variants.size}</span>}
                        {item.variants.color && <span className="before:content-['/'] before:mx-1">{item.variants.color}</span>}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        ₹{(item.products.base_price * item.quantity).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-4 flex flex-col items-center text-center">
                <Shield className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-900">Secure Checkout</p>
              </div>
              <div className="bg-white rounded-lg p-4 flex flex-col items-center text-center">
                <Truck className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-900">Free Shipping</p>
              </div>
              <div className="bg-white rounded-lg p-4 flex flex-col items-center text-center">
                <RotateCcw className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-900">Easy Returns</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown & CTA */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6 uppercase tracking-wider">Price Breakdown</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (18% GST)</span>
                  <span className="font-medium text-gray-900">₹{tax.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full bg-black text-white py-4 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlacingOrder ? 'Processing...' : 'Place Order'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {isAuthenticated
                  ? 'Click to proceed to payment'
                  : 'You will be asked to login before confirming your order'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
