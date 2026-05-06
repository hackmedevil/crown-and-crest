'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, MoreVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import CategoryForm from './CategoryForm'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string
  meta_title?: string
  meta_description?: string
  parent_id?: string | null
  is_active: boolean
  position: number
  created_at: string
  updated_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [search, activeFilter])

  async function loadCategories() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (activeFilter !== 'all') params.set('active', activeFilter === 'active' ? 'true' : 'false')

      const res = await fetch(`/api/admin/categories?${params.toString()}`)
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (error) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Category deleted')
      loadCategories()
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  async function handleBulkToggle(active: boolean) {
    if (selectedIds.length === 0) {
      toast.error('Select categories first')
      return
    }

    try {
      for (const id of selectedIds) {
        await fetch(`/api/admin/categories?id=${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: active }),
        })
      }
      toast.success(`${selectedIds.length} categories ${active ? 'activated' : 'deactivated'}`)
      setSelectedIds([])
      loadCategories()
    } catch (error) {
      toast.error('Failed to update categories')
    }
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    const newCategories = [...categories]
    const [movedCategory] = newCategories.splice(fromIndex, 1)
    newCategories.splice(toIndex, 0, movedCategory)

    // Update positions
    for (let i = 0; i < newCategories.length; i++) {
      newCategories[i].position = i
    }

    setCategories(newCategories)

    // Save to backend
    try {
      for (const cat of newCategories) {
        await fetch(`/api/admin/categories?id=${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position: cat.position }),
        })
      }
      toast.success('Order updated')
    } catch (error) {
      toast.error('Failed to save order')
      loadCategories()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">{categories.length} categories</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-96 overflow-y-auto">
            <CategoryForm
              onSuccess={() => {
                setShowForm(false)
                loadCategories()
              }}
              onCancel={() => setShowForm(false)}
              editingId={editingId}
              initialData={editingId ? categories.find(c => c.id === editingId) : undefined}
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
              placeholder="Search categories..."
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
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p>No categories found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === categories.length && categories.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(categories.map(c => c.id))
                      } else {
                        setSelectedIds([])
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Position</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category, index) => {
                const parentCategory = category.parent_id 
                  ? categories.find(c => c.id === category.parent_id)
                  : null
                
                return (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, category.id])
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== category.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className={`${category.parent_id ? 'pl-4' : ''}`}>
                      {category.parent_id && (
                        <div className="text-xs text-gray-500 mb-1">
                          └─ Subcategory of: <span className="font-medium">{parentCategory?.name}</span>
                        </div>
                      )}
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{category.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{category.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      category.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">#{category.position}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(category.id)
                        setShowForm(true)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
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
