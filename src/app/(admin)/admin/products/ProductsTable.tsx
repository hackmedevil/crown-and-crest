'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowDownAZ,
  CheckSquare,
  Eye,
  EyeOff,
  MoreVertical,
  Search,
  Square,
  Trash2,
} from 'lucide-react'
import { deleteProducts, updateProductStatus } from './actions'
import { useToast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  slug: string
  base_price: number
  image_url: string | null
  category: string | null
  is_active: boolean
  created_at: string
  embedding_status?: string | null
}

type StatusFilter = 'all' | 'active' | 'draft'
type SortBy = 'newest' | 'oldest' | 'name_asc' | 'price_desc' | 'price_asc'

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
  missing: 'bg-gray-100 text-gray-700',
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export default function ProductsTable({ products }: { products: Product[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const { showSuccess, showError } = useToast()
  const router = useRouter()

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    const filtered = products.filter(product => {
      const statusMatch =
        statusFilter === 'all' ? true : statusFilter === 'active' ? product.is_active : !product.is_active

      if (!statusMatch) return false
      if (!normalized) return true

      return (
        product.name.toLowerCase().includes(normalized) ||
        product.slug.toLowerCase().includes(normalized) ||
        (product.category || '').toLowerCase().includes(normalized)
      )
    })

    const sorted = [...filtered]
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'price_desc':
        sorted.sort((a, b) => b.base_price - a.base_price)
        break
      case 'price_asc':
        sorted.sort((a, b) => a.base_price - b.base_price)
        break
      case 'newest':
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return sorted
  }, [products, query, sortBy, statusFilter])

  const visibleIds = useMemo(() => visibleProducts.map(product => product.id), [visibleProducts])
  const selectedVisibleCount = selectedIds.filter(id => visibleIds.includes(id)).length
  const allVisibleSelected = visibleProducts.length > 0 && selectedVisibleCount === visibleProducts.length

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)))
      return
    }

    setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])))
  }

  const clearSelection = () => setSelectedIds([])

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} product${ids.length > 1 ? 's' : ''}?`)) return

    setIsDeleting(true)
    const result = await deleteProducts(ids)

    if (result.success) {
      showSuccess(`Deleted ${ids.length} product${ids.length > 1 ? 's' : ''}`)
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)))
      router.refresh()
    } else {
      showError(result.error || 'Failed to delete products')
    }

    setIsDeleting(false)
  }

  const handleStatusUpdate = async (ids: string[], isActive: boolean) => {
    if (ids.length === 0) return

    const result = await updateProductStatus(ids, isActive)
    if (result.success) {
      showSuccess(`Updated ${ids.length} product${ids.length > 1 ? 's' : ''}`)
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)))
      router.refresh()
    } else {
      showError(result.error || 'Failed to update status')
    }
  }

  const handleRegenerateEmbedding = async (productId: string) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/embedding`, { method: 'POST' })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        showError(data?.error || 'Failed to regenerate embedding')
        return
      }

      showSuccess('Embedding regeneration queued')
      router.refresh()
    } catch {
      showError('Failed to regenerate embedding')
    }
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">No products yet</p>
        <Link href="/admin/products/new" className="mt-2 inline-block text-sm text-primary hover:underline">
          Create your first product
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search by name, slug, or category"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                statusFilter === 'active' ? 'bg-green-700 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                statusFilter === 'draft' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Draft
            </button>

            <div className="relative">
              <ArrowDownAZ className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as SortBy)}
                className="rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-gray-700 focus:border-gray-400 focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name_asc">Name A-Z</option>
                <option value="price_desc">Price High-Low</option>
                <option value="price_asc">Price Low-High</option>
              </select>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Showing {visibleProducts.length} of {products.length} products
        </p>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleStatusUpdate(selectedIds, true)}
              className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
            >
              Set Active
            </button>
            <button
              type="button"
              onClick={() => handleStatusUpdate(selectedIds, false)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Set Draft
            </button>
            <button
              type="button"
              onClick={() => handleDelete(selectedIds)}
              disabled={isDeleting}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {visibleProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-700">No matching products</p>
            <p className="mt-1 text-xs text-gray-500">Try changing search keywords or filters.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <button type="button" onClick={toggleSelectAllVisible} className="text-gray-500 hover:text-gray-700">
                    {allVisibleSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Embedding</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleProducts.map(product => {
                const isSelected = selectedIds.includes(product.id)
                const menuOpen = openMenuId === product.id
                const embeddingStatus = product.embedding_status || 'missing'

                return (
                  <tr key={product.id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4">
                      <button type="button" onClick={() => toggleSelection(product.id)} className="text-gray-500 hover:text-gray-700">
                        {isSelected ? <CheckSquare className="h-5 w-5 text-blue-600" /> : <Square className="h-5 w-5" />}
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                          {product.image_url ? (
                            <Image src={product.image_url} alt={product.name} width={48} height={48} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No image</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                          <p className="truncate text-xs text-gray-500">/{product.slug}</p>
                          <p className="mt-1 text-xs text-gray-400">{product.category || 'Uncategorized'} • {formatDate(product.created_at)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.is_active ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Draft'}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                      Rs.{product.base_price.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[embeddingStatus] || STATUS_STYLES.missing}`}>
                        {embeddingStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate([product.id], !product.is_active)}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title={product.is_active ? 'Set as Draft' : 'Set as Active'}
                        >
                          {product.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>

                        <Link href={`/admin/products/${product.id}`} className="text-sm font-semibold text-primary hover:text-gray-900">
                          Edit
                        </Link>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(menuOpen ? null : product.id)}
                            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {menuOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                <Link
                                  href={`/product/${product.slug}`}
                                  target="_blank"
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View on Store
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleRegenerateEmbedding(product.id)
                                    setOpenMenuId(null)
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Regenerate Embedding
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStatusUpdate([product.id], !product.is_active)
                                    setOpenMenuId(null)
                                  }}
                                  className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  {product.is_active ? 'Set as Draft' : 'Set as Active'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDelete([product.id])
                                    setOpenMenuId(null)
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Product
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
