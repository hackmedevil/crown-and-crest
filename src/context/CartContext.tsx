'use client'

import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import type { CartItem } from '@/types'

type AddCartPayload = {
  product_id: string
  variant_id: string
  name: string
  price: number
  quantity: number
  size?: string
  color?: string
  image_url?: string
}

interface WishlistItem {
  product_id: string
  name: string
  price: number
  image_url?: string
  slug: string
}

interface RecentlyViewedItem {
  product_id: string
  name: string
  price: number
  image_url?: string
  slug: string
}

type CartContextValue = {
  // Cart
  cart: CartItem[]
  cartCount: number
  totalPrice: number
  addToCart: (item: AddCartPayload) => void
  removeFromCart: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  
  // Wishlist
  wishlist: WishlistItem[]
  wishlistCount: number
  addToWishlist: (item: WishlistItem) => void
  removeFromWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleWishlist: (item: WishlistItem) => void
  
  // Recently Viewed
  recentlyViewed: RecentlyViewedItem[]
  addToRecentlyViewed: (item: RecentlyViewedItem) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart')
      const storedWishlist = localStorage.getItem('wishlist')
      const storedRecent = localStorage.getItem('recentlyViewed')
      
      if (storedCart) setCart(JSON.parse(storedCart))
      if (storedWishlist) setWishlist(JSON.parse(storedWishlist))
      if (storedRecent) setRecentlyViewed(JSON.parse(storedRecent))
    } catch (error) {
      console.error('Error loading cart data:', error)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('cart', JSON.stringify(cart))
    }
  }, [cart, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('wishlist', JSON.stringify(wishlist))
    }
  }, [wishlist, isHydrated])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed))
    }
  }, [recentlyViewed, isHydrated])

  // Cart operations
  const addToCart = useCallback((item: AddCartPayload) => {
    setCart((prev) => {
      const index = prev.findIndex(
        (p) => p.product_id === item.product_id && p.variant_id === item.variant_id
      )

      if (index === -1) {
        // Optimistic local update
        const next = [...prev, { ...item }]

        // Background sync to server (best-effort). We don't await here to keep UI snappy.
        try {
          void fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: item.product_id, variantId: item.variant_id, quantity: item.quantity }),
          })
        } catch (e) {
          // swallow - best-effort sync
          console.warn('Background cart sync failed', e)
        }

        return next
      }

      const next = [...prev]
      const existing = next[index]
      next[index] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
      }
      const next = [...next]

      // Background sync to server for updated quantity
      try {
        void fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: item.product_id, variantId: item.variant_id, quantity: next[index].quantity }),
        })
      } catch (e) {
        console.warn('Background cart sync failed', e)
      }

      return next
    })
  }, [])

  const removeFromCart = useCallback((variantId: string) => {
    setCart((prev) => prev.filter(item => item.variant_id !== variantId))
  }, [])

  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter(item => item.variant_id !== variantId)
      }
      return prev.map(item =>
        item.variant_id === variantId ? { ...item, quantity } : item
      )
    })
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  // Wishlist operations
  const addToWishlist = useCallback((item: WishlistItem) => {
    setWishlist((prev) => {
      const exists = prev.some(w => w.product_id === item.product_id)
      if (exists) return prev
      return [...prev, item]
    })
  }, [])

  const removeFromWishlist = useCallback((productId: string) => {
    setWishlist((prev) => prev.filter(item => item.product_id !== productId))
  }, [])

  const isInWishlist = useCallback((productId: string) => {
    return wishlist.some(item => item.product_id === productId)
  }, [wishlist])

  const toggleWishlist = useCallback((item: WishlistItem) => {
    if (isInWishlist(item.product_id)) {
      removeFromWishlist(item.product_id)
    } else {
      addToWishlist(item)
    }
  }, [isInWishlist, removeFromWishlist, addToWishlist])

  // Recently Viewed operations
  const addToRecentlyViewed = useCallback((item: RecentlyViewedItem) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter(v => v.product_id !== item.product_id)
      return [item, ...filtered].slice(0, 10) // Keep last 10
    })
  }, [])

  // Computed values
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const wishlistCount = wishlist.length

  const value = useMemo(
    () => ({
      cart,
      cartCount,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      wishlist,
      wishlistCount,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      recentlyViewed,
      addToRecentlyViewed,
    }),
    [
      cart,
      cartCount,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      wishlist,
      wishlistCount,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      recentlyViewed,
      addToRecentlyViewed,
    ]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)

  if (!context) {
    // Fallback keeps components functional even if provider is not mounted.
    return {
      cart: [],
      cartCount: 0,
      totalPrice: 0,
      addToCart: () => {},
      removeFromCart: () => {},
      updateQuantity: () => {},
      clearCart: () => {},
      wishlist: [],
      wishlistCount: 0,
      addToWishlist: () => {},
      removeFromWishlist: () => {},
      isInWishlist: () => false,
      toggleWishlist: () => {},
      recentlyViewed: [],
      addToRecentlyViewed: () => {},
    }
  }

  return context
}

// Export types
export type { WishlistItem, RecentlyViewedItem }
