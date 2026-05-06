'use client'

import React, { useState, useEffect } from 'react'
import { Building2, Plus, Pencil, Trash2, Search, CheckCircle, XCircle } from 'lucide-react'

interface Brand {
  id: string
  name: string
  code: string
  description?: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BrandFormData {
  name: string
  code: string
  description: string
  logo_url: string
  is_active: boolean
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<BrandFormData>({
    name: '',
    code: '',
    description: '',
    logo_url: '',
    is_active: true,
  })

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/brands')
      const result = await response.json()
      
      if (result.success) {
        setBrands(result.brands || [])
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBrand = async () => {
    try {
      const response = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        await fetchBrands()
        setShowCreateForm(false)
        resetForm()
      } else {
        alert(result.error || 'Failed to create brand')
      }
    } catch (error) {
      console.error('Error creating brand:', error)
      alert('Failed to create brand')
    }
  }

  const handleUpdateBrand = async () => {
    if (!editingBrand) return

    try {
      const response = await fetch(`/api/admin/brands/${editingBrand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        await fetchBrands()
        setEditingBrand(null)
        resetForm()
      } else {
        alert(result.error || 'Failed to update brand')
      }
    } catch (error) {
      console.error('Error updating brand:', error)
      alert('Failed to update brand')
    }
  }

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? Products using this brand will have their brand removed.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        await fetchBrands()
      } else {
        alert(result.error || 'Failed to delete brand')
      }
    } catch (error) {
      console.error('Error deleting brand:', error)
      alert('Failed to delete brand')
    }
  }

  const startEdit = (brand: Brand) => {
    setEditingBrand(brand)
    setFormData({
      name: brand.name,
      code: brand.code,
      description: brand.description || '',
      logo_url: brand.logo_url || '',
      is_active: brand.is_active,
    })
    setShowCreateForm(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      logo_url: '',
      is_active: true,
    })
    setEditingBrand(null)
    setShowCreateForm(false)
  }

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Brand Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage brands for product categorization and SKU generation
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowCreateForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Brand
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search brands by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingBrand) && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            {editingBrand ? 'Edit Brand' : 'Create New Brand'}
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Crown & Crest"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand Code * <span className="text-xs text-gray-500">(uppercase, letters/numbers/hyphens only)</span>
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CC or CROWN"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional brand description..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="text"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={editingBrand ? handleUpdateBrand : handleCreateBrand}
              disabled={!formData.name.trim() || !formData.code.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {editingBrand ? 'Update Brand' : 'Create Brand'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Brands List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading brands...</div>
      ) : filteredBrands.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchQuery ? 'No brands found matching your search' : 'No brands created yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                          {brand.code}
                        </span>
                        {brand.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      {brand.description && (
                        <p className="text-sm text-gray-600 mt-1">{brand.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(brand)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
