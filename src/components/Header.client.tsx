'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { getGuestCartCount } from '@/lib/cart/guestCart'
import BrandLogo from './BrandLogo'
import { useAuth } from '@/context/AuthContext'

const ShoppingBagIcon = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z"
    />
  </svg>
)

const AccountIcon = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0L12 21m-4.017-2.275A5.963 5.963 0 0 1 12 15.75v-1.5"
    />
  </svg>
)

const MenuIcon = ({ className = 'w-7 h-7' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
  </svg>
)

const SearchIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
)

const links = [
  { href: '/shop', label: 'Shop' },
  { href: '/new', label: 'New Arrivals' },
  { href: '/men', label: 'Men' },
  { href: '/women', label: 'Women' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About' },
]

export default function HeaderClient({
  isLoggedIn,
  cartCount,
  firstName,
  categories = [],
  storeName,
  logoUrl,
}: {
  isLoggedIn: boolean
  cartCount: number
  firstName?: string
  categories?: string[]
  storeName?: string
  logoUrl?: string | null
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { openLoginModal } = useAuth()
  const { cartCount: clientCartCount } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  const [searchQuery, setSearchQuery] = useState('')

  const isActive = (href: string) => pathname?.startsWith(href)
  const currentSearch = searchParams.toString()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  // Combined links: Static + Dynamic Categories
  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/account/size-profile', label: 'Size Book', highlight: true },
    { href: '/new', label: 'New Arrivals' },
    ...categories.map(cat => ({ href: `/shop?category=${encodeURIComponent(cat)}`, label: cat })),
    { href: '/about', label: 'About' },
  ]

  const guestCartCount = typeof window !== 'undefined' ? getGuestCartCount() : 0

  return (
    <header className="w-full bg-white">
      <nav aria-label="Primary" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 text-neutral-900 hover:text-[#d1966e] transition-colors duration-200" aria-label="Home">
            <BrandLogo priority logoUrl={logoUrl} storeName={storeName} showText size="default" />
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex items-center gap-6 font-inter text-sm font-semibold text-neutral-900">
            {navLinks.map(({ href, label }) => (
              <li key={label}>
                <Link
                  href={href}
                  className={`relative py-1 transition-colors duration-200 hover:text-[#d1966e] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-[#d1966e] after:transition-transform after:duration-300 hover:after:scale-x-100 ${isActive(href) ? 'font-semibold' : ''}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Side: Search + Cart + Account */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Search Bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden lg:flex flex-shrink-0 w-56">
              <div className="relative w-full group">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-[#d1966e] transition-colors duration-200 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-12 py-1.5 rounded-md font-inter text-sm text-neutral-900 placeholder:text-neutral-400 bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#d1966e] transition-all duration-200"
                  aria-label="Search products"
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-50 border border-neutral-200 rounded">
                  ⌘K
                </kbd>
              </div>
            </form>

            {/* Shopping Bag */}
            <Link
              href="/cart"
              className="relative text-black hover:text-[#d1966e] transition-colors duration-200"
              aria-label={`Cart with ${isMounted ? clientCartCount : cartCount} items`}
            >
              <ShoppingBagIcon />
              {( (isMounted ? clientCartCount : cartCount) || guestCartCount) > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {((isMounted ? clientCartCount : cartCount) || guestCartCount) > 99 ? '99+' : ((isMounted ? clientCartCount : cartCount) || guestCartCount)}
                </span>
              )}
            </Link>

            {/* Desktop Account Link */}
            <div className="hidden md:block">
              {isLoggedIn ? (
                <Link
                  href="/account"
                  className="font-inter text-sm font-semibold text-neutral-900 hover:text-[#d1966e] transition-colors duration-200 whitespace-nowrap"
                >
                  {firstName ? `Hi, ${firstName}` : 'Account'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openLoginModal()}
                  className="font-inter text-sm font-semibold text-neutral-900 hover:text-[#d1966e] transition-colors duration-200"
                >
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Account Icon */}
            {isLoggedIn ? (
              <Link
                href="/account"
                className="md:hidden text-neutral-900 hover:text-[#d1966e] transition-colors duration-200"
                aria-label="Account"
              >
                <AccountIcon />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="md:hidden text-neutral-900 hover:text-[#d1966e] transition-colors duration-200"
                aria-label="Sign In"
              >
                <AccountIcon />
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-neutral-900 hover:text-[#d1966e] transition-colors duration-200 p-1"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-2" id="mobile-menu">
            {/* Mobile Search Bar */}
            <form onSubmit={handleSearch} className="mb-4 lg:hidden">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg font-inter text-sm text-neutral-900 placeholder:text-neutral-400 bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#d1966e]"
                  aria-label="Search products"
                />
              </div>
            </form>

            <ul className="space-y-2">
              {navLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-2 font-inter text-[15px] font-semibold text-neutral-900 hover:text-[#d1966e] transition-colors duration-200 ${isActive(href) ? 'font-semibold text-[#d1966e]' : ''}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  )
}
