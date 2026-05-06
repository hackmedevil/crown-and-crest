'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AnnouncementBar from './AnnouncementBar'
import SearchBar from './SearchBar'
import AccountDropdown from './AccountDropdown'
import CartIcon, { WishlistIcon } from './CartIcon'
import NavbarCategories from './NavbarCategories'
import Breadcrumb, { BreadcrumbItem } from '../product/Breadcrumb'
import MobileDrawer from './MobileDrawer'
import BrandLogo from '../BrandLogo'
import { CategoryItem } from './MegaMenu'

interface NavbarProps {
  isLoggedIn: boolean
  firstName?: string
  cartCount?: number
  wishlistCount?: number
  categories?: CategoryItem[]
  storeName?: string
  logoUrl?: string | null
  onLoginClick: () => void
  onLogout?: () => void
  breadcrumbItems?: BreadcrumbItem[]
}

export default function Navbar({
  isLoggedIn,
  firstName,
  cartCount = 0,
  wishlistCount = 0,
  categories = [],
  storeName,
  logoUrl,
  onLoginClick,
  onLogout,
  breadcrumbItems,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isScrollingDown, setIsScrollingDown] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const pathname = usePathname()

  // Handle scroll for sticky navbar shadow and smart hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Add shadow when scrolled
      setIsScrolled(currentScrollY > 10)

      // Smart scroll: hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold
        setIsScrollingDown(true)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsScrollingDown(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Close mobile drawer when route changes
  useEffect(() => {
    setIsMobileDrawerOpen(false)
    setShowSearchBar(false)
  }, [pathname])

  return (
    <>
      {/* Announcement Bar */}
      <AnnouncementBar />

      {/* Main Navbar - Sticky with Smart Scroll */}
      <div
        className={`
          sticky top-0 z-40 bg-white
          transition-all duration-300 ease-in-out
          ${isScrolled ? 'shadow-md' : 'shadow-sm'}
          ${isScrollingDown ? '-translate-y-full' : 'translate-y-0'}
        `}
      >
        {/* Main Navigation Bar */}
        <nav className="border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 lg:h-20">
              {/* Left: Hamburger (Mobile) + Logo */}
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Open menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Logo */}
                <Link 
                  href="/" 
                  className="flex items-center flex-shrink-0"
                  aria-label="Home"
                >
                  <BrandLogo 
                    priority 
                    logoUrl={logoUrl} 
                    storeName={storeName} 
                    showText 
                    size="default" 
                  />
                </Link>
              </div>

              {/* Center: Search Bar (Desktop) */}
              <div className="hidden lg:block flex-1 max-w-2xl mx-8">
                <SearchBar placeholder="Search for products, brands, and more..." />
              </div>

              {/* Right: Icons */}
              <div className="flex items-center gap-3 lg:gap-4">
                {/* Mobile Search Icon */}
                <button
                  onClick={() => setShowSearchBar(!showSearchBar)}
                  className="lg:hidden p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Search"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </button>

                {/* Account Dropdown (Desktop) */}
                <div className="hidden lg:block">
                  <AccountDropdown
                    isLoggedIn={isLoggedIn}
                    firstName={firstName}
                    onLoginClick={onLoginClick}
                    onLogout={onLogout}
                  />
                </div>

                {/* Wishlist Icon */}
                <WishlistIcon itemCount={wishlistCount} className="hidden md:block" />

                {/* Cart Icon */}
                <CartIcon itemCount={cartCount} />
              </div>
            </div>

            {/* Mobile Search Bar (Expandable) */}
            {showSearchBar && (
              <div className="lg:hidden pb-4 animate-slide-down">
                <SearchBar 
                  placeholder="Search products..." 
                  autoFocus 
                />
              </div>
            )}
          </div>
        </nav>

              {/* Category Navigation Bar (Desktop) */}
              <div className="hidden lg:block">
                <NavbarCategories categories={categories} breadcrumbItems={breadcrumbItems} />
              </div>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        categories={categories}
        isLoggedIn={isLoggedIn}
        firstName={firstName}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />
    </>
  )
}
