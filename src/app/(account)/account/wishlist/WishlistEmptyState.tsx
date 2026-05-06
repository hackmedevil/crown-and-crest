'use client'

import Link from 'next/link'
import { getEmptyStateMessage } from '@/lib/wishlist/constants'

export default function WishlistEmptyState() {
  const { title, subtitle, cta } = getEmptyStateMessage('empty')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      {/* Large Heart Icon */}
      <svg
        className="w-20 h-20 text-gray-200 mb-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>

      {/* Message */}
      <h2 className="text-3xl md:text-4xl font-black text-center tracking-tight mb-3">
        {title}
      </h2>
      <p className="text-sm md:text-base text-gray-700 text-center max-w-md mb-8">{subtitle}</p>

      {/* CTA Button */}
      {cta && (
        <Link
          href={cta.href}
          className="px-8 py-3 bg-black text-white text-sm font-black hover:bg-gray-800 transition-colors"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
