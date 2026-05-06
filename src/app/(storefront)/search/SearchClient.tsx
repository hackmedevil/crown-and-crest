'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search as SearchIcon } from 'lucide-react'

type SearchResult = {
  id: string
  title: string
  description: string | null
  category: string | null
  base_price: number
  image_url: string | null
  slug: string
  score: number
  in_stock: boolean
}

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10))

  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [inputValue, setInputValue] = useState(query)

  useEffect(() => {
    setInputValue(query)
  }, [query])

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = inputValue.trim()
      if (trimmed === query.trim()) return

      const params = new URLSearchParams(searchParams.toString())
      if (trimmed) {
        params.set('q', trimmed)
        params.set('page', '1')
      } else {
        params.delete('q')
        params.set('page', '1')
      }

      router.replace(`/search?${params.toString()}`)
    }, 300)

    return () => clearTimeout(handler)
  }, [inputValue, query, router, searchParams])

  useEffect(() => {
    if (!query) return

    const performSearch = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/search/ai?q=${encodeURIComponent(query)}&page=${pageParam}&limit=20`
        )

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()
        setResults(data.results || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
        setTotal(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    performSearch()
  }, [query, pageParam])

  const trackClick = async (productId: string, position: number, score: number) => {
    try {
      if (query) {
        localStorage.setItem('last_search_query', query)
      }

      await fetch('/api/search/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          productId,
          interactionType: 'click',
          position: position + 1,
          similarityScore: score,
        })
      })
    } catch (error) {
      console.error('Failed to track click:', error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 font-inter">
            {query ? `Search results for "${query}"` : 'Search'}
          </h1>
          {!loading && results.length > 0 && (
            <p className="mt-2 text-sm text-neutral-600">
              Found {total} {total === 1 ? 'product' : 'products'}
            </p>
          )}
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-full border border-neutral-200 bg-white py-3 pl-12 pr-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              aria-label="Search products"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
              <p className="text-sm text-neutral-600">AI searching products...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!query && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <SearchIcon className="h-16 w-16 text-neutral-300" />
            <p className="mt-4 text-neutral-600">Enter a search query to find products</p>
          </div>
        )}

        {!loading && query && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12">
            <SearchIcon className="h-16 w-16 text-neutral-300" />
            <p className="mt-4 text-lg font-medium text-neutral-900">
              No products found
            </p>
            <p className="mt-2 text-neutral-600">
              Try adjusting your search terms or browse our collections
            </p>
            <Link
              href="/shop"
              className="mt-6 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((product, index) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                onClick={() => trackClick(product.id, index, product.score)}
                className="group relative flex flex-col rounded-lg border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-neutral-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-neutral-400">No image</span>
                    </div>
                  )}
                  {!product.in_stock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-xs font-semibold text-white">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-1 flex-col">
                  <h3 className="text-sm font-medium text-neutral-900 line-clamp-2 group-hover:text-accent">
                    {product.title}
                  </h3>
                  {product.category && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {product.category}
                    </p>
                  )}
                  <div className="mt-auto pt-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      ₹{product.base_price.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('page', String(Math.max(1, pageParam - 1)))
                router.replace(`/search?${params.toString()}`)
              }}
              disabled={pageParam === 1}
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-600">Page {pageParam} of {totalPages}</span>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('page', String(Math.min(totalPages, pageParam + 1)))
                router.replace(`/search?${params.toString()}`)
              }}
              disabled={pageParam === totalPages}
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
