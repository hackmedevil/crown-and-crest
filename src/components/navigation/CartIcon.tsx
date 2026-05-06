'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface CartIconProps {
  itemCount?: number
  href?: string
  className?: string
}

export default function CartIcon({ 
  itemCount = 0, 
  href = '/cart',
  className = '' 
}: CartIconProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevCount, setPrevCount] = useState(itemCount)

  // Animate when cart count changes
  useEffect(() => {
    if (itemCount !== prevCount && itemCount > prevCount) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      setPrevCount(itemCount)
      return () => clearTimeout(timer)
    }
    setPrevCount(itemCount)
    return undefined
  }, [itemCount, prevCount])

  return (
    <Link
      href={href}
      className={`relative group ${className}`}
      aria-label={`Shopping cart with ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
    >
      {/* Cart Icon */}
      <svg
        className="w-6 h-6 text-gray-700 group-hover:text-black transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>

      {/* Badge with count */}
      {itemCount > 0 && (
        <span
          className={`
            absolute -top-2 -right-2 
            flex items-center justify-center 
            min-w-[20px] h-5 px-1.5
            bg-black text-white 
            text-xs font-bold 
            rounded-full
            transition-all duration-200
            ${isAnimating ? 'animate-bounce scale-110' : 'scale-100'}
          `}
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
        {itemCount === 0 ? 'Cart is empty' : `${itemCount} item${itemCount !== 1 ? 's' : ''} in cart`}
        {/* Arrow */}
        <div className="absolute bottom-full right-3 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-black"></div>
      </div>
    </Link>
  )
}

// Wishlist Icon Component (bonus)
export function WishlistIcon({ 
  itemCount = 0, 
  href = '/account/wishlist',
  className = '' 
}: CartIconProps) {
  return (
    <Link
      href={href}
      className={`relative group ${className}`}
      aria-label={`Wishlist with ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
    >
      {/* Heart Icon */}
      <svg
        className={`w-6 h-6 transition-colors ${
          itemCount > 0 
            ? 'text-red-500 fill-red-500 group-hover:text-red-600 group-hover:fill-red-600' 
            : 'text-gray-700 group-hover:text-red-500'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>

      {/* Badge with count */}
      {itemCount > 0 && (
        <span
          className="
            absolute -top-2 -right-2 
            flex items-center justify-center 
            min-w-[20px] h-5 px-1.5
            bg-red-500 text-white 
            text-xs font-bold 
            rounded-full
          "
        >
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-black text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
        {itemCount === 0 ? 'Wishlist is empty' : `${itemCount} item${itemCount !== 1 ? 's' : ''} saved`}
        {/* Arrow */}
        <div className="absolute bottom-full right-3 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-black"></div>
      </div>
    </Link>
  )
}
