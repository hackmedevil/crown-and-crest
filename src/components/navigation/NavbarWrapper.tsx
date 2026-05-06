'use client'

import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { CategoryItem } from './MegaMenu'

/**
 * NavbarWrapper - Client Component
 * 
 * Wraps the Navbar component and provides it with data from contexts and API
 * This allows Navbar to remain a reusable component while getting live data
 */
import type { BreadcrumbItem } from '../product/Breadcrumb'

interface NavbarWrapperProps {
  breadcrumbItems?: BreadcrumbItem[]
}

export default function NavbarWrapper({ breadcrumbItems }: NavbarWrapperProps = {}) {
  const { isAuthenticated, openLoginModal, closeLoginModal } = useAuth()
  const { cartCount, wishlistCount } = useCart()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [storeName, setStoreName] = useState<string>()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories/navigation', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          const nextCategories = Array.isArray(data.categories) ? data.categories : []

          if (nextCategories.length > 0) {
            setCategories(nextCategories)
            return
          }
        }

        // Fallback to shop filters categories if navigation endpoint has no data.
        const fallbackResponse = await fetch('/api/shop?limit=1', { cache: 'no-store' })
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          const filterCategories = Array.isArray(fallbackData?.filters?.categories)
            ? fallbackData.filters.categories
            : []

          if (filterCategories.length > 0) {
            setCategories(
              filterCategories.map((item: { id: string; name: string; slug: string }) => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
              }))
            )
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }

    fetchCategories()
  }, [])

  // Fetch store settings (optional)
  useEffect(() => {
    async function fetchStoreSettings() {
      try {
        const response = await fetch('/api/admin/store-settings')
        if (response.ok) {
          const data = await response.json()
          setStoreName(data.storeName)
          setLogoUrl(data.logoUrl)
        }
      } catch (error) {
        console.error('Failed to fetch store settings:', error)
      }
    }

    fetchStoreSettings()
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        closeLoginModal()
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <Navbar
      isLoggedIn={isAuthenticated}
      firstName={undefined}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      categories={categories}
      storeName={storeName}
      logoUrl={logoUrl}
      onLoginClick={openLoginModal}
      onLogout={handleLogout}
      breadcrumbItems={breadcrumbItems}
    />
  )
}
