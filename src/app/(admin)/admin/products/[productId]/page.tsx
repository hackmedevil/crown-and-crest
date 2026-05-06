'use client'

import { use, useEffect, useState } from 'react'
import ProductFormV2 from '@/components/admin/products/ProductFormV2'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ProductData {
    id: string
  name: string
  slug: string
  description: string | null
    short_description: string | null
  base_price: number
    cost_price: number | null
    mrp: number | null
    discount_engine_enabled: boolean
    discount_type: 'percentage' | 'fixed'
    discount_value: number | null
    selling_price: number | null
    fabric: string | null
    gsm: number | null
    fit_type: string | null
    print_type: string | null
    shipping_charge: number
    shipping_included_in_price: boolean
    brand_id: string | null
    category_id: string | null
  status: 'draft' | 'active' | 'archived'
  is_searchable: boolean
  tags: string[]
  hs_code: string | null
  country_of_origin: string | null
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[]
}

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
    const { productId } = use(params)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [productData, setProductData] = useState<ProductData | null>(null)

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const response = await fetch(`/api/admin/products/${productId}`)
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => null)
                    const errorMessage =
                        errorData?.error?.message ||
                        errorData?.error ||
                        `HTTP ${response.status}: ${response.statusText}`
                    throw new Error(errorMessage)
                }

                const data = await response.json()
                const product = data?.product ?? data?.data?.product ?? null
                setProductData(product)
            } catch (err) {
                console.error('Error fetching product:', err)
                setError(err instanceof Error ? err.message : 'Failed to load product')
            } finally {
                setIsLoading(false)
            }
        }

        fetchProduct()
    }, [productId])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (error || !productData) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-800">Error loading product</h3>
                            <p className="text-red-700 mt-2">{error || 'Product not found'}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <ProductFormV2
            productId={productId}
            initialData={{
                ...productData,
                description: productData.description ?? '',
                short_description: productData.short_description ?? '',
            }}
        />
    )
}
