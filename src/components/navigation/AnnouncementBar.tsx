'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Announcement {
  id: number
  message: string
  link?: string
}

export default function AnnouncementBar() {
  const announcements: Announcement[] = [
    { id: 1, message: 'Free shipping on orders above ₹999', link: '/shop' },
    { id: 2, message: 'Summer sale – up to 40% off', link: '/shop?category=sale' },
    { id: 3, message: 'Easy returns within 15 days', link: '/help#returns' },
    { id: 4, message: 'Cash on Delivery available across India', link: '/help#payment' },
  ]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 4000) // Rotate every 4 seconds

    return () => clearInterval(interval)
  }, [mounted, announcements.length])

  const currentAnnouncement = announcements[currentIndex]

  return (
    <div className="w-full bg-black text-white z-50 relative" suppressHydrationWarning>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div className="flex items-center justify-between h-10 text-xs sm:text-sm" suppressHydrationWarning>
          {/* Left: Main Announcement (with animation) */}
          <div className="flex-1 flex items-center justify-center overflow-hidden" suppressHydrationWarning>
            {mounted && (
              <div
                key={currentAnnouncement.id}
                className="animate-fade-in text-center"
              >
                {currentAnnouncement.link ? (
                  <Link
                    href={currentAnnouncement.link}
                    className="hover:text-gray-300 transition-colors font-medium"
                  >
                    {currentAnnouncement.message}
                  </Link>
                ) : (
                  <span className="font-medium">{currentAnnouncement.message}</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Quick Links */}
          <div className="hidden md:flex items-center gap-4 text-xs" suppressHydrationWarning>
            <div className="h-3 w-px bg-white/30" aria-hidden="true" suppressHydrationWarning />
            <Link
              href="/account/orders"
              className="hover:text-gray-300 transition-colors whitespace-nowrap"
            >
              Track Order
            </Link>
            <div className="h-3 w-px bg-white/30" aria-hidden="true" suppressHydrationWarning />
            <Link
              href="/help"
              className="hover:text-gray-300 transition-colors whitespace-nowrap"
            >
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Progress indicator dots */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1 pb-1" suppressHydrationWarning>
        {announcements.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/40'
            }`}
            aria-label={`Go to announcement ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
