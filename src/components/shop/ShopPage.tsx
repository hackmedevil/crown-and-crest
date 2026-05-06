'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopFilters from './ShopFilters'
import ShopPagination from './ShopPagination'
import ShopProductGrid from './ShopProductGrid'
import ShopSortDropdown from './ShopSortDropdown'
import { ShopApiResponse, ShopFiltersPayload, ShopProduct, ShopQueryState, ShopSort } from './types'

interface ShopPageProps {
  initialCategory?: string
}

const EMPTY_FILTERS: ShopFiltersPayload = {
  brands: [],
  sizes: [],
  colors: [],
  price_range: { min_price: 0, max_price: 0 }
}

function buildQueryString(state: ShopQueryState) {
  const params = new URLSearchParams()

  if (state.category) params.set('category', state.category)
  if (state.search) params.set('search', state.search)
  if (state.brand.length) params.set('brand', state.brand.join(','))
  if (state.size.length) params.set('size', state.size.join(','))
  if (state.color.length) params.set('color', state.color.join(','))
  if (typeof state.min_price === 'number') params.set('min_price', String(state.min_price))
  if (typeof state.max_price === 'number') params.set('max_price', String(state.max_price))
  if (typeof state.rating === 'number') params.set('rating', String(state.rating))

  params.set('sort', state.sort)
  params.set('page', String(state.page))
  params.set('limit', String(state.limit))

  return params.toString()
}

export default function ShopPage({ initialCategory }: ShopPageProps) {
  const [query, setQuery] = useState<ShopQueryState>({
    category: initialCategory,
    brand: [],
    size: [],
    color: [],
    sort: 'ranking',
    page: 1,
    limit: 24
  })
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [filters, setFilters] = useState<ShopFiltersPayload>(EMPTY_FILTERS)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const fetchData = useCallback(async (state: ShopQueryState) => {
    setLoading(true)
    const queryString = buildQueryString(state)
    const response = await fetch(`/api/discovery/shop?${queryString}`, {
      method: 'GET'
    })

    if (!response.ok) {
      setLoading(false)
      return
    }

    const data = (await response.json()) as ShopApiResponse
    setProducts(data.products)
    setFilters(data.filters)
    setTotal(data.pagination.total)
    setTotalPages(data.pagination.total_pages)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(query)
  }, [query, fetchData])

  const updateQuery = (patch: Partial<ShopQueryState>, resetPage = true) => {
    setQuery((prev) => ({
      ...prev,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? prev.page)
    }))
  }

  const minAvailablePrice = useMemo(() => filters.price_range.min_price || 0, [filters.price_range.min_price])
  const maxAvailablePrice = useMemo(() => filters.price_range.max_price || 0, [filters.price_range.max_price])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Shop</h1>
          <p className="text-sm text-gray-600">{total} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-gray-300 px-3 py-2 text-sm lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filters
          </button>
          <ShopSortDropdown value={query.sort} onChange={(sort) => updateQuery({ sort: sort as ShopSort })} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <ShopFilters
            filters={filters}
            selectedBrands={query.brand}
            selectedSizes={query.size}
            selectedColors={query.color}
            minPrice={query.min_price}
            maxPrice={query.max_price}
            minAvailablePrice={minAvailablePrice}
            maxAvailablePrice={maxAvailablePrice}
            onBrandChange={(brand) => updateQuery({ brand })}
            onSizeChange={(size) => updateQuery({ size })}
            onColorChange={(color) => updateQuery({ color })}
            onPriceChange={(min_price, max_price) => updateQuery({ min_price, max_price })}
            onClear={() =>
              updateQuery({
                brand: [],
                size: [],
                color: [],
                min_price: undefined,
                max_price: undefined,
                rating: undefined,
                sort: 'ranking'
              })
            }
          />
        </aside>

        <div>
          <ShopProductGrid products={products} loading={loading} />
          <ShopPagination page={query.page} totalPages={totalPages} onChange={(page) => updateQuery({ page }, false)} />
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button className="text-sm underline" onClick={() => setMobileFiltersOpen(false)}>
                Close
              </button>
            </div>
            <ShopFilters
              filters={filters}
              selectedBrands={query.brand}
              selectedSizes={query.size}
              selectedColors={query.color}
              minPrice={query.min_price}
              maxPrice={query.max_price}
              minAvailablePrice={minAvailablePrice}
              maxAvailablePrice={maxAvailablePrice}
              onBrandChange={(brand) => updateQuery({ brand })}
              onSizeChange={(size) => updateQuery({ size })}
              onColorChange={(color) => updateQuery({ color })}
              onPriceChange={(min_price, max_price) => updateQuery({ min_price, max_price })}
              onClear={() =>
                updateQuery({
                  brand: [],
                  size: [],
                  color: [],
                  min_price: undefined,
                  max_price: undefined,
                  rating: undefined,
                  sort: 'ranking'
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
