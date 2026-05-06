'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export interface CategoryItem {
  id: string
  name: string
  slug: string
  image_url?: string
  description?: string
  subcategories?: CategoryItem[]
}

interface MegaMenuProps {
  category: CategoryItem
  isOpen: boolean
  onClose: () => void
}

export default function MegaMenu({ category, isOpen, onClose }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isOpen) return null

  const hasSubcategories = category.subcategories && category.subcategories.length > 0
  const hasImage = Boolean(category.image_url)

  return (
    <div
      ref={menuRef}
      className="absolute left-0 right-0 top-full mt-0 bg-white shadow-2xl border-t border-gray-200 z-40 animate-fade-in"
      role="menu"
      aria-label={`${category.name} menu`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8" style={{ 
          gridTemplateColumns: hasImage ? 'minmax(0, 1fr) 300px' : '1fr' 
        }}>
          {/* Main Content Area */}
          <div>
            {/* Category Header */}
            <div className="mb-6">
              <Link
                href={`/shop?category=${category.slug}`}
                onClick={onClose}
                className="group inline-flex items-center gap-2"
                prefetch={true}
              >
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-black">
                  {category.name}
                </h3>
                <svg 
                  className="w-5 h-5 text-gray-400 group-hover:text-black transition-transform group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              {category.description && (
                <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                  {category.description}
                </p>
              )}
            </div>

            {/* Subcategories Grid */}
            {hasSubcategories ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                {category.subcategories!.map((subcategory) => (
                  <div key={subcategory.id}>
                    <Link
                      href={`/shop?category=${subcategory.slug}`}
                      onClick={onClose}
                      className="group block"
                      prefetch={true}
                    >
                      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-black mb-2 flex items-center gap-1">
                        {subcategory.name}
                        <svg 
                          className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </h4>
                      {subcategory.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {subcategory.description}
                        </p>
                      )}
                    </Link>

                    {/* Nested subcategories (if any) */}
                    {subcategory.subcategories && subcategory.subcategories.length > 0 && (
                      <ul className="mt-2 space-y-1.5 pl-3 border-l-2 border-gray-100">
                        {subcategory.subcategories.slice(0, 5).map((nested) => (
                          <li key={nested.id}>
                            <Link
                              href={`/shop?category=${nested.slug}`}
                              onClick={onClose}
                              className="text-xs text-gray-600 hover:text-black transition-colors"
                              prefetch={true}
                            >
                              {nested.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* If no subcategories, show popular items placeholder */
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Link
                    key={i}
                    href={`/shop?category=${category.slug}`}
                    onClick={onClose}
                    className="group"
                    prefetch={true}
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                      <span className="text-gray-400 text-xs">Product {i}</span>
                    </div>
                    <p className="text-sm text-gray-700 group-hover:text-black">Item name</p>
                    <p className="text-sm font-semibold text-gray-900">₹999</p>
                  </Link>
                ))}
              </div>
            )}

            {/* View All Link */}
            <div className="mt-8">
              <Link
                href={`/shop?category=${category.slug}`}
                onClick={onClose}
                className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:gap-3 transition-all"
                prefetch={true}
              >
                View all {category.name}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Featured Image/Banner (Right Side) */}
          {hasImage && (
            <div className="hidden lg:block">
              <Link
                href={`/shop?category=${category.slug}`}
                onClick={onClose}
                className="group relative block h-full min-h-[300px] rounded-lg overflow-hidden bg-gray-100"
                prefetch={true}
              >
                <Image
                  src={category.image_url!}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="300px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h4 className="text-xl font-bold mb-2">{category.name}</h4>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    Shop now
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links (Optional) */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-500 font-medium">Quick Links:</span>
            <Link
              href="/shop?collection=new-arrivals"
              onClick={onClose}
              className="text-gray-700 hover:text-black font-medium"
              prefetch={true}
            >
              New Arrivals
            </Link>
            <Link
              href="/shop?sort=bestseller"
              onClick={onClose}
              className="text-gray-700 hover:text-black font-medium"
              prefetch={true}
            >
              Best Sellers
            </Link>
            <Link
              href="/shop?category=sale"
              onClick={onClose}
              className="text-red-600 hover:text-red-700 font-semibold"
              prefetch={true}
            >
              Sale
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
