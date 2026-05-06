'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, AlertCircle, X, Palette } from 'lucide-react'
import { useCSRFToken } from '@/hooks/useCSRFToken'

interface Color {
  id: string
  name: string
  hex_code: string
  display_order: number
  is_active: boolean
}

interface ColorPalette {
  id: string
  name: string
  description: string | null
  category: string | null
  is_active: boolean
  colors: Color[]
  created_at: string
  updated_at: string
}

export default function ColorsPage() {
  const [palettes, setPalettes] = useState<ColorPalette[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPalette, setEditingPalette] = useState<ColorPalette | null>(null)
  const { csrfToken } = useCSRFToken()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'standard',
    colors: [{ name: '', hex_code: '#000000' }],
  })

  useEffect(() => {
    fetchPalettes()
  }, [])

  const fetchPalettes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/color-palettes')
      const data = await response.json()
      if (data.success) {
        setPalettes(data.palettes || [])
      }
    } catch (err) {
      console.error('Failed to fetch palettes:', err)
      setError('Failed to load color palettes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const validColors = formData.colors.filter(
        (c) => c.name.trim() && c.hex_code.trim()
      )

      if (!formData.name.trim()) {
        setError('Palette name is required')
        return
      }

      if (validColors.length === 0) {
        setError('At least one color is required')
        return
      }

      const url = editingPalette
        ? `/api/admin/color-palettes/${editingPalette.id}`
        : '/api/admin/color-palettes'

      const response = await fetch(url, {
        method: editingPalette ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          ...formData,
          colors: validColors,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save palette')
      }

      resetForm()
      await fetchPalettes()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save palette')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this color palette?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/color-palettes/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken || '',
        },
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete palette')
      }

      await fetchPalettes()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete palette')
    }
  }

  const handleEdit = (palette: ColorPalette) => {
    setEditingPalette(palette)
    setFormData({
      name: palette.name,
      description: palette.description || '',
      category: palette.category || 'standard',
      colors: palette.colors.length > 0
        ? palette.colors.map((c) => ({ name: c.name, hex_code: c.hex_code }))
        : [{ name: '', hex_code: '#000000' }],
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'standard',
      colors: [{ name: '', hex_code: '#000000' }],
    })
    setEditingPalette(null)
    setShowForm(false)
    setError(null)
  }

  const addColor = () => {
    setFormData({
      ...formData,
      colors: [...formData.colors, { name: '', hex_code: '#000000' }],
    })
  }

  const removeColor = (index: number) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((_, i) => i !== index),
    })
  }

  const updateColor = (index: number, field: 'name' | 'hex_code', value: string) => {
    const updated = [...formData.colors]
    updated[index][field] = value
    setFormData({ ...formData, colors: updated })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Color Palettes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage color palettes for product variants
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Palette
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPalette ? 'Edit' : 'New'} Color Palette
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Palette Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Summer Collection"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="standard">Standard</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="brand">Brand</option>
                  <option value="apparel">Apparel</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colors <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {formData.colors.map((color, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={color.name}
                      onChange={(e) => updateColor(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Color name (e.g. Navy Blue)"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex_code}
                        onChange={(e) => updateColor(index, 'hex_code', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={color.hex_code}
                        onChange={(e) => updateColor(index, 'hex_code', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="#000000"
                        pattern="^#[0-9A-Fa-f]{6}$"
                      />
                    </div>
                    {formData.colors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeColor(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addColor}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Color
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {editingPalette ? 'Update' : 'Create'} Palette
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Palettes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {palettes.map((palette) => (
          <div key={palette.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{palette.name}</h3>
                  {palette.category && (
                    <span className="text-xs text-gray-500 capitalize">{palette.category}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(palette)}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(palette.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {palette.description && (
              <p className="text-sm text-gray-600 mb-4">{palette.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {palette.colors.map((color) => (
                <div
                  key={color.id}
                  className="group relative"
                  title={`${color.name} (${color.hex_code})`}
                >
                  <div
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer shadow-sm"
                    style={{ backgroundColor: color.hex_code }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {color.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              {palette.colors.length} color{palette.colors.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {palettes.length === 0 && !showForm && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Palette className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No color palettes yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your first color palette to start managing variant colors
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Palette
          </button>
        </div>
      )}
    </div>
  )
}
