'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CategoryItem } from './MegaMenu'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  categories: CategoryItem[]
  isLoggedIn: boolean
  firstName?: string
  onLoginClick: () => void
  onLogout?: () => void
}

export default function MobileDrawer({
  isOpen,
  onClose,
  categories,
  isLoggedIn,
  firstName,
  onLoginClick,
  onLogout,
}: MobileDrawerProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleCategoryToggle = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId)
  }

  const handleLogout = () => {
    onClose()
    if (onLogout) {
      onLogout()
    }
  }

  const accountLinks = [
    { icon: '👤', label: 'My Profile', href: '/account' },
    { icon: '📦', label: 'My Orders', href: '/account/orders' },
    { icon: '❤️', label: 'Wishlist', href: '/account/wishlist' },
    { icon: '📍', label: 'Addresses', href: '/account/addresses' },
    { icon: '⚙️', label: 'Settings', href: '/account/settings' },
  ]

  const quickLinks = [
    { icon: '🆕', label: 'New Arrivals', href: '/shop?collection=new-arrivals' },
    { icon: '🔥', label: 'Best Sellers', href: '/shop?sort=bestseller' },
    { icon: '🏷️', label: 'Sale', href: '/shop?category=sale' },
    { icon: '❓', label: 'Help & Support', href: '/help' },
  ]

  return (
    <>
      {/* Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 w-full max-w-sm bg-white z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-y-auto overscroll-contain
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* User Section */}
          {isLoggedIn ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {firstName ? firstName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Hello, {firstName || 'User'}!
                  </p>
                  <p className="text-xs text-gray-500">Welcome back</p>
                </div>
              </div>

              {/* Account Links */}
              <ul className="space-y-1">
                {accountLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-white hover:text-black rounded-md transition-colors"
                    >
                      <span className="text-lg">{link.icon}</span>
                      <span className="font-medium">{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          ) : (
            <div className="bg-black text-white rounded-lg p-4">
              <p className="text-sm mb-3">Sign in to access your account</p>
              <button
                onClick={() => {
                  onClose()
                  onLoginClick()
                }}
                className="w-full py-2.5 bg-white text-black rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Sign In / Create Account
              </button>
            </div>
          )}

          {/* Categories */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Categories
            </h3>
            <ul className="space-y-1">
              {categories.map((category) => {
                const hasSubcategories = category.subcategories && category.subcategories.length > 0
                const isExpanded = expandedCategory === category.id

                return (
                  <li key={category.id}>
                    {hasSubcategories ? (
                      <>
                        <button
                          onClick={() => handleCategoryToggle(category.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          <span>{category.name}</span>
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Subcategories */}
                        {isExpanded && (
                          <ul className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 pl-3">
                            <li>
                              <Link
                                href={`/shop?category=${category.slug}`}
                                onClick={onClose}
                                className="block px-3 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded-md transition-colors font-medium"
                              >
                                View All {category.name}
                              </Link>
                            </li>
                            {category.subcategories!.map((sub) => (
                              <li key={sub.id}>
                                <Link
                                  href={`/shop?category=${sub.slug}`}
                                  onClick={onClose}
                                  className="block px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-md transition-colors"
                                >
                                  {sub.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      <Link
                        href={`/shop?category=${category.slug}`}
                        onClick={onClose}
                        className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        {category.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Links
            </h3>
            <ul className="space-y-1">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-black rounded-md transition-colors"
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Contact Us
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                support@crownandcrest.com
              </p>
              <p className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                1800-123-4567
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
