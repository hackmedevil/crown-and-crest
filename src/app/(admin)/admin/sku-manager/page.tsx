'use client'

import React, { useState } from 'react'
import { Search, Package, Trash2, ExternalLink, Tag, Building2 } from 'lucide-react'
import Link from 'next/link'

interface Brand {
  id: string
  name: string
  code: string
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  category: string
  price: number
  image_url: string | null
  status: string
  brand_id: string | null
  brands: Brand | null
}

interface Variant {
  id: string
  sku: string | null
  name: string
  size: string | null
  color: string | null
  stock_quantity: number
  price: number
  image_url: string | null
  products: Product
}

interface SearchResult {
  variants: Variant[]
  products: Product[]
}

export default function SKUManagerPage() {
  const [skuQuery, setSkuQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!skuQuery.trim()) {
      alert('Please enter a SKU to search')
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)
      
      const response = await fetch(`/api/admin/sku-search?sku=${encodeURIComponent(skuQuery.trim())}`)
      const result = await response.json()

      if (result.success) {
        setSearchResults(result)
      } else {
        alert(result.error || 'Failed to search SKU')
      }
    } catch (error) {
      console.error('Error searching SKU:', error)
      alert('Failed to search SKU')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVariant = async (variantId: string, sku: string) => {
    if (!confirm(`Are you sure you want to delete variant SKU: ${sku}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/variants/${variantId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        // Refresh search results
        handleSearch(new Event('submit') as any)
      } else {
        alert(result.error || 'Failed to delete variant')
      }
    } catch (error) {
      console.error('Error deleting variant:', error)
      alert('Failed to delete variant')
    }
  }

  const totalResults = (searchResults?.variants.length || 0) + (searchResults?.products.length || 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">SKU Manager</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search for products and variants by SKU, view details, and manage inventory
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Enter SKU to search (e.g., CC-JACKET-001)..."
            value={skuQuery}
            onChange={(e) => setSkuQuery(e.target.value)}
            className="w-full pl-10 pr-24 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Results */}
      {hasSearched && searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Search Results ({totalResults})
            </h2>
          </div>

          {totalResults === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No products or variants found matching "{skuQuery}"</p>
            </div>
          ) : (
            <>
              {/* Product Results */}
              {searchResults.products.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products ({searchResults.products.length})
                  </h3>
                  {searchResults.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              {product.sku && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Tag className="w-4 h-4 text-gray-400" />
                                  <span className="font-mono text-sm text-gray-700">{product.sku}</span>
                                </div>
                              )}
                              {product.brands && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {product.brands.name} ({product.brands.code})
                                  </span>
                                </div>
                              )}
                              {product.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>

                            <Link
                              href={`/admin/products/${product.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <span className="text-sm">View Details</span>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>

                          <div className="flex gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-gray-500">Category:</span>{' '}
                              <span className="font-medium">{product.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Price:</span>{' '}
                              <span className="font-medium">${product.price.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>{' '}
                              <span
                                className={`font-medium ${
                                  product.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                }`}
                              >
                                {product.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Variant Results */}
              {searchResults.variants.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Variants ({searchResults.variants.length})
                  </h3>
                  {searchResults.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        {variant.image_url || variant.products.image_url ? (
                          <img
                            src={variant.image_url || variant.products.image_url || ''}
                            alt={variant.name}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {variant.products.name} - {variant.name}
                              </h4>
                              {variant.sku && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Tag className="w-4 h-4 text-gray-400" />
                                  <span className="font-mono text-sm text-gray-700">{variant.sku}</span>
                                </div>
                              )}
                              {variant.products.brands && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {variant.products.brands.name} ({variant.products.brands.code})
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Link
                                href={`/admin/products/${variant.products.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <span className="text-sm">View Product</span>
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteVariant(variant.id, variant.sku || 'Unknown')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-4 mt-3 text-sm">
                            {variant.size && (
                              <div>
                                <span className="text-gray-500">Size:</span>{' '}
                                <span className="font-medium">{variant.size}</span>
                              </div>
                            )}
                            {variant.color && (
                              <div>
                                <span className="text-gray-500">Color:</span>{' '}
                                <span className="font-medium">{variant.color}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Stock:</span>{' '}
                              <span className="font-medium">{variant.stock_quantity}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Price:</span>{' '}
                              <span className="font-medium">${variant.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
