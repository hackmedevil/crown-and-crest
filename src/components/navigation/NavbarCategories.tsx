'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import MegaMenu, { CategoryItem } from './MegaMenu'

import Breadcrumb, { BreadcrumbItem } from '../product/Breadcrumb'

interface NavbarCategoriesProps {
  categories: CategoryItem[]
  breadcrumbItems?: BreadcrumbItem[]
}

export default function NavbarCategories({ categories, breadcrumbItems }: NavbarCategoriesProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  const handleMouseEnter = (categoryId: string) => {
    clearHoverTimeout()
    setActiveCategory(categoryId)
  }

  const handleMouseLeave = () => {
    clearHoverTimeout()
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveCategory(null)
      hoverTimeoutRef.current = null
    }, 220) // Keep menu open while cursor moves from trigger to panel
  }

  const handleMenuClose = () => {
    clearHoverTimeout()
    setActiveCategory(null)
  }

  // Get active category object
  const activeCategoryData = categories.find(cat => cat.id === activeCategory)

  // Featured categories (show in the main nav)
  const featuredCategories = [
    { name: 'New Arrivals', href: '/shop?collection=new-arrivals', highlight: true },
    ...categories.slice(0, 6), // Show first 6 categories
    { name: 'Sale', href: '/shop?category=sale', highlight: true, isSpecial: true },
  ]

  return (
    <div className="relative bg-white border-b border-gray-200">
      <nav 
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        aria-label="Category navigation"
      >
        <ul className="flex items-center justify-center gap-1 h-14 overflow-x-auto scrollbar-hide">
          {featuredCategories.map((item) => {
            const isCategory = 'id' in item
            const itemId = isCategory ? (item as CategoryItem).id : item.name
            const itemName = isCategory ? (item as CategoryItem).name : item.name
            const itemHref = isCategory 
              ? `/shop?category=${(item as CategoryItem).slug}` 
              : (item as any).href
            const hasSubcategories = isCategory && (item as CategoryItem).subcategories && (item as CategoryItem).subcategories!.length > 0
            const isActive = activeCategory === itemId
            const isSpecial = !isCategory && (item as any).isSpecial

            return (
              <li
                key={itemId}
                onMouseEnter={() => isCategory && handleMouseEnter(itemId)}
                onMouseLeave={handleMouseLeave}
                className="relative"
              >
                <Link
                  href={itemHref}
                  className={`
                    relative block px-4 py-4 text-sm font-semibold whitespace-nowrap
                    transition-all duration-200 group
                    ${isActive
                      ? 'text-black bg-gray-50' 
                      : isSpecial
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      : 'text-gray-700 hover:text-black hover:bg-gray-50'
                    }
                    ${(item as any).highlight && !isSpecial ? 'text-black font-bold' : ''}
                    rounded-md
                    before:content-[''] before:absolute before:bottom-2 before:left-4 before:right-4
                    before:h-[2px] before:bg-black
                    before:origin-left before:scale-x-0
                    before:transition-transform before:duration-300 before:ease-out
                    ${!isActive && !isSpecial ? 'hover:before:scale-x-100' : 'before:hidden'}
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex items-center gap-1">
                    {itemName}
                    {isCategory && hasSubcategories && (
                      <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </span>
                </Link>

                {/* Underline indicator for active item */}
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black animate-slide-in" />
                )}
              </li>
            )
          })}

          {/* Inject breadcrumb as last menu element only if present */}
          {breadcrumbItems && breadcrumbItems.length > 0 && (
            <li className="ml-4 flex items-center h-14">
              <Breadcrumb items={breadcrumbItems} />
            </li>
          )}
        </ul>
      </nav>

      {/* Mega Menu */}
      {activeCategoryData && (
        <div
          onMouseEnter={() => {
            clearHoverTimeout()
          }}
          onMouseLeave={handleMouseLeave}
        >
          <MegaMenu
            category={activeCategoryData}
            isOpen={true}
            onClose={handleMenuClose}
          />
        </div>
      )}
    </div>
  )
}
