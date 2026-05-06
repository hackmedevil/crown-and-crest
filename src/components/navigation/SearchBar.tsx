'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart, type RecentlyViewedItem } from '@/context/CartContext'

interface SearchProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  imageUrl: string
}

interface SearchCategory {
  id: string
  name: string
  slug: string
}

interface SearchResults {
  products: SearchProduct[]
  categories: SearchCategory[]
}

interface SearchBarProps {
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export default function SearchBar({ 
  placeholder = 'Search for products...', 
  className = '',
  autoFocus = false 
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResults>({ products: [], categories: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchCacheRef = useRef(new Map<string, { results: SearchResults; timestamp: number }>())
  const router = useRouter()
  const { recentlyViewed } = useCart()

  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse recent searches', e)
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [results, query, recentSearches])

  // Debounced search with caching
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ products: [], categories: [] })
      setIsLoading(false)
      return
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    const cached = searchCacheRef.current.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      setResults(cached.results)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timeoutId = setTimeout(async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`),
          fetch(`/api/admin/categories?search=${encodeURIComponent(query)}&active=true`)
        ])

        const productsData = await productsRes.json()
        const categoriesData = await categoriesRes.json()

        const searchResults = {
          products: productsData.results || [],
          categories: (categoriesData.categories || []).slice(0, 4)
        }

        // Cache the results
        searchCacheRef.current.set(cacheKey, {
          results: searchResults,
          timestamp: now
        })

        // Limit cache size to prevent memory issues
        if (searchCacheRef.current.size > 50) {
          const firstKey = searchCacheRef.current.keys().next().value
          if (firstKey) {
            searchCacheRef.current.delete(firstKey)
          }
        }

        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults({ products: [], categories: [] })
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query])

  const saveRecentSearch = useCallback((searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }, [recentSearches])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      saveRecentSearch(query)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      setIsOpen(false)
      setQuery('')
    }
  }

  const handleProductClick = (product: SearchProduct) => {
    saveRecentSearch(query)
    setIsOpen(false)
    setQuery('')
  }

  const handleCategoryClick = (category: SearchCategory) => {
    saveRecentSearch(category.name)
    setIsOpen(false)
    setQuery('')
  }

  const handleRecentSearchClick = (search: string) => {
    setQuery(search)
    setIsOpen(true)
    inputRef.current?.focus()
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price / 100)
  }

  const hasResults = results.products.length > 0 || results.categories.length > 0
  const showRecentSearches = !query && recentSearches.length > 0
  const showRecentlyViewed = !query && recentlyViewed.length > 0

  // Calculate total number of selectable items
  const getTotalSelectableItems = () => {
    if (showRecentSearches) {
      return recentSearches.length
    }
    return results.categories.length + results.products.length
  }

  // Navigate to selected item
  const navigateToItem = (index: number) => {
    if (showRecentSearches) {
      handleRecentSearchClick(recentSearches[index])
      return
    }

    const categoryCount = results.categories.length
    if (index < categoryCount) {
      const category = results.categories[index]
      router.push(`/shop?category=${category.slug}`)
      handleCategoryClick(category)
    } else {
      const productIndex = index - categoryCount
      const product = results.products[productIndex]
      router.push(`/products/${product.slug}`)
      handleProductClick(product)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return

    const totalItems = getTotalSelectableItems()

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < totalItems) {
          navigateToItem(highlightedIndex)
        } else if (query.trim()) {
          handleSearch(e)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative group">
          {/* Search Icon */}
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-600 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 bg-white
                     text-gray-900 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                     transition-all duration-200"
            aria-label="Search products"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            role="combobox"
            aria-controls="search-results"
            aria-activedescendant={highlightedIndex >= 0 ? `search-item-${highlightedIndex}` : undefined}
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Dropdown Results */}
      {isOpen && (showRecentSearches || showRecentlyViewed || hasResults || query.length >= 2) && (
        <div 
          id="search-results" 
          role="listbox" 
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-[500px] overflow-y-auto z-50"
        >
          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Recent Searches</h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-2">
                {recentSearches.map((search, index) => (
                  <li key={index}>
                    <button
                      id={`search-item-${index}`}
                      onClick={() => handleRecentSearchClick(search)}
                      className={`flex items-center gap-2 text-sm w-full text-left p-2 rounded-md transition-colors ${
                        highlightedIndex === index
                          ? 'bg-gray-100 text-black'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === index}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {search}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recently Viewed Products */}
          {showRecentlyViewed && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recently Viewed</h3>
              <ul className="space-y-2">
                {recentlyViewed.slice(0, 5).map((item: RecentlyViewedItem) => (
                  <li key={item.product_id}>
                    <Link
                      href={`/products/${item.slug}`}
                      onClick={() => {
                        setIsOpen(false)
                        setQuery('')
                      }}
                      className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-md transition-colors group"
                    >
                      {/* Product Image */}
                      <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-black">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-600 font-semibold">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Categories */}
          {results.categories.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Categories
              </h3>
              <ul className="space-y-2">
                {results.categories.map((category, index) => (
                  <li key={category.id}>
                    <Link
                      id={`search-item-${index}`}
                      href={`/shop?category=${category.slug}`}
                      onClick={() => handleCategoryClick(category)}
                      className={`flex items-center gap-2 text-sm p-2 rounded-md transition-colors ${
                        highlightedIndex === index
                          ? 'bg-gray-100 text-black'
                          : 'text-gray-700 hover:text-black hover:bg-gray-50'
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === index}
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Products
              </h3>
              <ul className="space-y-2">
                {results.products.map((product, index) => {
                  const itemIndex = results.categories.length + index
                  return (
                  <li key={product.id}>
                    <Link
                      id={`search-item-${itemIndex}`}
                      href={`/products/${product.slug}`}
                      onClick={() => handleProductClick(product)}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors group ${
                        highlightedIndex === itemIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === itemIndex}
                    >
                      {/* Product Image */}
                      <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-black">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-600 font-semibold">
                          {formatPrice(product.basePrice)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* No Results */}
          {query.length >= 2 && !isLoading && !hasResults && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm text-gray-600 mb-1">No results found for "{query}"</p>
              <p className="text-xs text-gray-500">Try searching with different keywords</p>
            </div>
          )}

          {/* View All Results */}
          {query.trim() && hasResults && (
            <div className="p-4 border-t border-gray-100">
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  saveRecentSearch(query)
                  setIsOpen(false)
                  setQuery('')
                }}
                className="block w-full text-center py-2 px-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                View all results for "{query}"
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
