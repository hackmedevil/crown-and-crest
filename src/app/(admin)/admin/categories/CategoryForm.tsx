'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

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
}

interface CategoryFormProps {
  onSuccess: () => void
  onCancel: () => void
  editingId?: string | null
  initialData?: Category
}

export default function CategoryForm({
  onSuccess,
  onCancel,
  editingId,
  initialData,
}: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    meta_title: '',
    meta_description: '',
    parent_id: null as string | null,
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [parentCategories, setParentCategories] = useState<Category[]>([])
  const [loadingParents, setLoadingParents] = useState(true)

  useEffect(() => {
    loadParentCategories()
  }, [])

  async function loadParentCategories() {
    try {
      setLoadingParents(true)
      const res = await fetch('/api/admin/categories?parent=true')
      if (!res.ok) throw new Error('Failed to load parent categories')
      const data = await res.json()
      setParentCategories(data.categories || [])
    } catch (error) {
      console.error('Failed to load parent categories:', error)
    } finally {
      setLoadingParents(false)
    }
  }

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        slug: initialData.slug,
        description: initialData.description || '',
        image_url: initialData.image_url || '',
        meta_title: initialData.meta_title || '',
        meta_description: initialData.meta_description || '',
        parent_id: initialData.parent_id || null,
        is_active: initialData.is_active,
      })
    }
  }, [initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }
      
      // Auto-generate slug from name if name changed and slug is empty or matches old name
      if (name === 'name' && (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/\s+/g, '-'))) {
        updated.slug = value.toLowerCase().replace(/\s+/g, '-')
      }
      
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    // Auto-generate slug if empty
    const slug = formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-')

    setLoading(true)

    try {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId
        ? `/api/admin/categories?id=${editingId}`
        : '/api/admin/categories'

      const payload = {
        name: formData.name,
        slug: slug,
        description: formData.description,
        image_url: formData.image_url,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        parent_id: formData.parent_id,
        is_active: formData.is_active,
      }

      console.log('Submitting payload:', payload)

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to save category')
      }

      const result = await res.json()
      console.log('API response:', result)
      
      toast.success(editingId ? 'Category updated' : 'Category created')
      onSuccess()
    } catch (error) {
      console.error('Form submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {editingId ? 'Edit Category' : 'New Category'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Men's Shirts"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Parent Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Parent Category (optional - for subcategories)
        </label>
        <select
          name="parent_id"
          value={formData.parent_id || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            parent_id: e.target.value || null
          }))}
          disabled={loadingParents}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">No parent (top-level category)</option>
          {parentCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Select a parent to make this a subcategory (e.g., Shirts → Fitted, Oversized)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Slug
        </label>
        <input
          type="text"
          name="slug"
          value={formData.slug}
          onChange={handleChange}
          placeholder="e.g., mens-shirts"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Category description for internal use"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image URL
        </label>
        <input
          type="text"
          name="image_url"
          value={formData.image_url}
          onChange={handleChange}
          placeholder="https://..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* SEO Fields */}
      <div className="pt-2 border-t">
        <p className="text-xs font-semibold text-gray-700 mb-3 uppercase">SEO</p>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title
          </label>
          <input
            type="text"
            name="meta_title"
            value={formData.meta_title}
            onChange={handleChange}
            maxLength={60}
            placeholder="SEO title (max 60 chars)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.meta_title.length}/60</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
          </label>
          <textarea
            name="meta_description"
            value={formData.meta_description}
            onChange={handleChange}
            maxLength={160}
            placeholder="SEO description (max 160 chars)"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.meta_description.length}/160</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-3 pt-2">
        <input
          type="checkbox"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          id="is_active"
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
          Active
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
