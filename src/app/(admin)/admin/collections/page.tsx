'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import CollectionForm from '@/app/(admin)/admin/collections/CollectionForm'

interface Collection {
  id: string
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  collection_items?: any[]
}

const PROTECTED_COLLECTION_SLUGS = new Set(['new-arrivals', 'new-arrival'])

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    loadCollections()
  }, [search, activeFilter])

  async function loadCollections() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (activeFilter !== 'all') params.set('active', activeFilter === 'active' ? 'true' : 'false')

      const res = await fetch(`/api/admin/collections?${params.toString()}`)
      const data = await res.json()
      setCollections(data.collections || [])
    } catch (error) {
      toast.error('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    const target = collections.find((collection) => collection.id === id)
    if (target && PROTECTED_COLLECTION_SLUGS.has(target.slug)) {
      toast.error('New Arrivals is protected and cannot be deleted')
      return
    }

    if (!confirm('Are you sure you want to delete this collection?')) return

    try {
      const res = await fetch(`/api/admin/collections?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Collection deleted')
      loadCollections()
    } catch (error) {
      toast.error('Failed to delete collection')
    }
  }

  async function handleBulkToggle(active: boolean) {
    if (selectedIds.length === 0) {
      toast.error('Select collections first')
      return
    }

    try {
      const safeIds = selectedIds.filter((id) => {
        const collection = collections.find((item) => item.id === id)
        return collection ? !PROTECTED_COLLECTION_SLUGS.has(collection.slug) : true
      })

      if (safeIds.length === 0) {
        toast.error('Selected collection(s) are protected and cannot be modified')
        return
      }

      for (const id of safeIds) {
        await fetch(`/api/admin/collections?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: active }),
        })
      }
      const skipped = selectedIds.length - safeIds.length
      toast.success(`${safeIds.length} collections ${active ? 'activated' : 'deactivated'}${skipped > 0 ? ` (${skipped} protected skipped)` : ''}`)
      setSelectedIds([])
      loadCollections()
    } catch (error) {
      toast.error('Failed to update collections')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
          <p className="text-sm text-gray-500 mt-1">{collections.length} collections</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Collection
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-96 overflow-y-auto">
            <CollectionForm
              onSuccess={() => {
                setShowForm(false)
                loadCollections()
              }}
              onCancel={() => setShowForm(false)}
              editingId={editingId}
              initialData={editingId ? collections.find(c => c.id === editingId) : undefined}
            />
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === status
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-sm font-medium text-gray-700">{selectedIds.length} selected</span>
          <button
            onClick={() => handleBulkToggle(true)}
            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            className="px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Deactivate
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-4 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No collections found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === collections.length && collections.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(collections.map(c => c.id))
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Products</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {collections.map((collection) => {
                const isProtected = PROTECTED_COLLECTION_SLUGS.has(collection.slug)

                return (
                <tr key={collection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(collection.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, collection.id])
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== collection.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-900">{collection.name}</div>
                      {isProtected && (
                        <span
                          className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800"
                          title="System collection: protected from delete and critical edits"
                        >
                          System
                        </span>
                      )}
                    </div>
                    {collection.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{collection.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{collection.slug}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {collection.collection_items?.[0]?.count || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      collection.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {collection.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(collection.id)
                        setShowForm(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(collection.id)}
                      disabled={isProtected}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title={isProtected ? 'Protected collection cannot be deleted' : 'Delete collection'}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
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
