'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import SizeGuideForm from './SizeGuideForm'

interface SizeVariant {
  size: string
  measurements: Record<string, number>
}

interface SizeGuide {
  id: string
  name: string
  category: string
  sizes: SizeVariant[]
  fit_type: string
  measurement_unit: 'cm' | 'inches'
  created_at: string
}

export default function SizeGuidesPage() {
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const categories = [
    'all',
    'men_top',
    'men_bottom',
    'women_top',
    'women_bottom',
    'women_dress',
    'kids_top',
    'kids_bottom',
    'unisex_top',
  ]

  useEffect(() => {
    loadSizeGuides()
  }, [search, categoryFilter])

  async function loadSizeGuides() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)

      const res = await fetch(`/api/admin/size-guides?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load size guides')
      
      const data = await res.json()
      setSizeGuides(data.sizeGuides || [])
    } catch (error) {
      toast.error('Failed to load size guides')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this size guide?')) return

    try {
      const res = await fetch(`/api/admin/size-guides?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Size guide deleted')
      loadSizeGuides()
    } catch (error) {
      toast.error('Failed to delete size guide')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Size Guides</h1>
          <p className="text-sm text-gray-500 mt-1">{sizeGuides.length} guides</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Guide
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <SizeGuideForm
              onSuccess={() => {
                setShowForm(false)
                loadSizeGuides()
              }}
              onCancel={() => setShowForm(false)}
              editingId={editingId}
              initialData={editingId ? sizeGuides.find(g => g.id === editingId) : undefined}
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
              placeholder="Search size guides..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary text-white'
                  : 'border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat === 'all' ? 'All' : cat.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : sizeGuides.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No size guides found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fit Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Measurements</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sizeGuides.map(guide => (
                <tr key={guide.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{guide.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {guide.category.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {guide.fit_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {guide.measurement_unit === 'cm' ? 'cm' : 'inches'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {guide.sizes.slice(0, 4).map((size, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {size.size}
                        </span>
                      ))}
                      {guide.sizes.length > 4 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{guide.sizes.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(guide.id)
                        setShowForm(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(guide.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
