'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, X, SlidersHorizontal, ChevronLeft, Filter, ArrowUpDown, ChevronDown } from 'lucide-react'

interface Product {
    id: string
    name: string
    slug: string
    base_price: number
    image_url: string | null
    category: string | null
    is_out_of_stock?: boolean
}

interface ShopClientProps {
    initialProducts: Product[]
    categoryName?: string
}

export default function ShopClient({ initialProducts }: ShopClientProps) {
    const [products] = useState<Product[]>(initialProducts)
    const router = useRouter()
    const searchParams = useSearchParams()

    // UI States (Mobile drawers)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [mobileSortOpen, setMobileSortOpen] = useState(false)

    // Read State from URL
    const selectedCategories = useMemo(() => {
        const param = searchParams.get('category')
        return param ? param.split(',') : []
    }, [searchParams])

    const selectedSize = searchParams.get('size') || ''

    const currentMinPrice = searchParams.get('minPrice')
    const currentMaxPrice = searchParams.get('maxPrice')

    const sortBy = searchParams.get('sort') || 'recommended'

    // Mock constants
    const allCategories = ['Dresses', 'Tops & Tunics', 'Sarees', 'Kurtas', 'Jumpsuits']
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

    const updateURL = (newParams: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null) {
                params.delete(key)
            } else {
                params.set(key, value)
            }
        })
        router.push(`/shop?${params.toString()}`, { scroll: false })
    }

    // Helper functions for filter updates
    const setSelectedSize = (size: string) => {
        updateURL({ size: size || null })
    }

    const toggleCategory = (category: string) => {
        const current = new Set(selectedCategories)
        if (current.has(category)) {
            current.delete(category)
        } else {
            current.add(category)
        }

        const newValue = Array.from(current).join(',')
        updateURL({ category: newValue || null })
    }

    const toggleSize = (size: string) => {
        const newValue = selectedSize === size ? null : size
        updateURL({ size: newValue })
    }

    const setSort = (value: string) => {
        updateURL({ sort: value })
        setMobileSortOpen(false)
    }

    const isPriceRangeActive = (rangeLabel: string) => {
        switch (rangeLabel) {
            case 'Under ₹1,000': return currentMaxPrice === '1000' && !currentMinPrice
            case '₹1,000 - ₹2,500': return currentMinPrice === '1000' && currentMaxPrice === '2500'
            case '₹2,500 - ₹5,000': return currentMinPrice === '2500' && currentMaxPrice === '5000'
            case 'Above ₹5,000': return currentMinPrice === '5000' && !currentMaxPrice
            default: return false
        }
    }

    const togglePriceRange = (rangeLabel: string) => {
        let min = null
        let max = null

        // If clicking the active one, toggle off
        if (isPriceRangeActive(rangeLabel)) {
            updateURL({ minPrice: null, maxPrice: null })
            return
        }

        switch (rangeLabel) {
            case 'Under ₹1,000':
                max = '1000'
                break
            case '₹1,000 - ₹2,500':
                min = '1000'; max = '2500'
                break
            case '₹2,500 - ₹5,000':
                min = '2500'; max = '5000'
                break
            case 'Above ₹5,000':
                min = '5000'
                break
        }

        updateURL({ minPrice: min, maxPrice: max })
    }

    const clearAllFilters = () => {
        router.push('/shop')
    }

    const totalFilters = selectedCategories.length + (selectedSize ? 1 : 0) + (currentMinPrice || currentMaxPrice ? 1 : 0)

    return (
        <div className="min-h-screen bg-background-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                    <div>
                        {/* Breadcrumbs */}
                        <nav className="flex text-sm text-gray-500 mb-2">
                            <ol className="flex items-center space-x-2">
                                <li><Link href="/" className="hover:text-gray-900">Home</Link></li>
                                <li><ChevronRight className="w-4 h-4" /></li>
                                <li><span className="text-gray-900 font-medium">New Arrivals</span></li>
                            </ol>
                        </nav>
                        <h1 className="text-3xl font-display text-gray-900">New Arrivals</h1>
                        <p className="text-gray-500 mt-1 text-sm">{products.length} products found</p>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="mt-4 md:mt-0 relative group z-20">
                        <button className="flex items-center space-x-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded px-4 py-2 hover:bg-gray-50 transition-colors">
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Sort by: Popularity</span>
                            <ChevronRight className="w-4 h-4 rotate-90" />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                            <div className="py-1">
                                <a className="block px-4 py-2 text-sm text-gray-900 bg-gray-100 font-medium" href="#">Popularity</a>
                                <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" href="#">New Arrivals</a>
                                <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" href="#">Price: Low to High</a>
                                <a className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" href="#">Price: High to Low</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters - Desktop */}
                    <aside className="w-full lg:w-64 flex-shrink-0 hidden lg:block">
                        <div className="sticky top-24 space-y-8 pr-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
                            {/* Category */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Category</h3>
                                <div className="space-y-3">
                                    {['Dresses', 'Tops & Tunics', 'Sarees', 'Kurtas', 'Jumpsuits'].map((category) => (
                                        <label key={category} className="flex items-center group cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(category)}
                                                onChange={() => toggleCategory(category)}
                                                className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                            />
                                            <span className="ml-3 text-sm text-gray-700 group-hover:text-primary transition-colors">{category}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-200"></div>

                            {/* Size */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Size</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size === selectedSize ? '' : size)}
                                            className={`px-3 py-2 text-xs font-medium border rounded transition-all ${size === selectedSize
                                                ? 'border-primary bg-primary text-white shadow-sm'
                                                : size === 'XXL'
                                                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                    : 'border-gray-200 hover:border-primary text-gray-700 hover:text-primary'
                                                }`}
                                            disabled={size === 'XXL'}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-200"></div>

                            {/* Color */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Color</h3>
                                <div className="flex flex-wrap gap-3">
                                    <button className="w-8 h-8 rounded-full bg-black border-2 border-white ring-1 ring-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-primary"></button>
                                    <button className="w-8 h-8 rounded-full bg-[#f5f5dc] border border-gray-300 hover:ring-2 hover:ring-primary hover:ring-offset-1"></button>
                                    <button className="w-8 h-8 rounded-full bg-red-900 border border-gray-300 hover:ring-2 hover:ring-primary hover:ring-offset-1"></button>
                                    <button className="w-8 h-8 rounded-full bg-blue-900 border border-gray-300 hover:ring-2 hover:ring-primary hover:ring-offset-1"></button>
                                    <button className="w-8 h-8 rounded-full bg-green-700 border border-gray-300 hover:ring-2 hover:ring-primary hover:ring-offset-1"></button>
                                </div>
                            </div>

                            <div className="border-t border-gray-200"></div>

                            {/* Price */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Price</h3>
                                <div className="space-y-3">
                                    {[
                                        'Under ₹1,000',
                                        '₹1,000 - ₹2,500',
                                        '₹2,500 - ₹5,000',
                                        'Above ₹5,000'
                                    ].map((range) => (
                                        <label key={range} className="flex items-center group cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isPriceRangeActive(range)}
                                                onChange={() => togglePriceRange(range)}
                                                className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                            />
                                            <span className="ml-3 text-sm text-gray-700 group-hover:text-primary transition-colors">{range}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Active Filters */}
                        <div className="flex flex-wrap gap-2 mb-6">
                            {selectedCategories.map((category) => (
                                <span key={category} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {category}
                                    <button onClick={() => toggleCategory(category)} className="ml-2 text-gray-500 hover:text-gray-700">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {selectedSize && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Size: {selectedSize}
                                    <button onClick={() => setSelectedSize('')} className="ml-2 text-gray-500 hover:text-gray-700">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {(selectedCategories.length > 0 || selectedSize) && (
                                <button onClick={clearAllFilters} className="text-xs text-gray-500 underline hover:text-primary ml-2">
                                    Clear all
                                </button>
                            )}
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                            {products.length > 0 ? (
                                products.map((product, index) => (
                                    <div key={product.id} className="group relative">
                                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-gray-200">
                                            {product.image_url ? (
                                                <>
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                                        priority={index < 4}
                                                        className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    {/* Server-computed stock status */}
                                                    {product.is_out_of_stock && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-2 rounded">OUT OF STOCK</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}

                                            {/* Badges */}
                                            {index === 0 && (
                                                <div className="absolute bottom-4 left-4 z-10">
                                                    <span className="bg-white/90 text-gray-900 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                                        Bestseller
                                                    </span>
                                                </div>
                                            )}
                                            {index === 2 && (
                                                <div className="absolute bottom-4 left-4 z-10">
                                                    <span className="bg-white/90 text-gray-900 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                                        Trending
                                                    </span>
                                                </div>
                                            )}

                                            {/* Favorite Button */}
                                            <button className="absolute top-4 right-4 p-2 rounded-full bg-white/70 text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Product Info */}
                                        <div className="mt-4 flex justify-between">
                                            <div>
                                                <h3 className="text-sm font-medium text-gray-900">
                                                    <Link href={`/product/${product.slug}`}>
                                                        <span aria-hidden="true" className="absolute inset-0"></span>
                                                        {product.name}
                                                    </Link>
                                                </h3>
                                                <p className="mt-1 text-xs text-gray-500">{product.category || 'LUMIÈRE'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-baseline gap-2">
                                            <p className="text-sm font-semibold text-gray-900">₹{product.base_price.toLocaleString('en-IN')}</p>
                                            {index % 3 === 0 && (
                                                <>
                                                    <p className="text-xs text-gray-400 line-through">₹{(product.base_price * 1.3).toLocaleString('en-IN')}</p>
                                                    <p className="text-xs text-red-600 font-medium">(24% OFF)</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 text-gray-500">
                                    No products available
                                </div>
                            )}
                        </div>

                        {/* Load More */}
                        {products.length >= 8 && (
                            <div className="mt-16 flex justify-center">
                                <button className="px-8 py-3 border border-gray-200 text-sm font-medium rounded-full text-gray-900 hover:bg-gray-50 transition-colors uppercase tracking-widest">
                                    Load More
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}
