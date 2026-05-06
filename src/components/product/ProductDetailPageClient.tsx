'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { GridProduct } from '@/types/grid'
import type { PDPData, PDPVariant } from '@/types/pdp'
import { useCart } from '@/context/CartContext'
import { findMatchingVariant, getVariantSizeValue } from '@/lib/products/buildAvailabilityMatrix'
import ProductGallery from './ProductGallery'
import ProductInfo from './ProductInfo'
import VariantSelector from './VariantSelector'
import QuantitySelector from './QuantitySelector'
import AddToCartButton from './AddToCartButton'
import WishlistButton from './WishlistButton'
import ProductDescription from './ProductDescription'
import SizeGuideModal from './SizeGuideModal'

const RelatedProducts = dynamic(() => import('./RelatedProducts'))
const FrequentlyBoughtTogether = dynamic(() => import('./FrequentlyBoughtTogether'))
import { ChevronDown, ShieldCheck, Star, Truck, Undo2 } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface ProductDetailPageClientProps {
  pdpData: PDPData
  relatedProducts: GridProduct[]
  initialRating: number
  initialReviewCount: number
  breadcrumbItems?: BreadcrumbItem[]
}

export default function ProductDetailPageClient({
  pdpData,
  relatedProducts,
  initialRating,
  initialReviewCount,
  breadcrumbItems,
}: ProductDetailPageClientProps) {
  const { isInWishlist, addToRecentlyViewed, toggleWishlist } = useCart()

  const hasSizeVariants = pdpData.variants.some(variant => getVariantSizeValue(variant) !== null)

  const defaultSelection = useMemo(() => {
    const firstInStock = pdpData.variants.find(variant => variant.enabled && !variant.is_out_of_stock)

    if (!firstInStock) {
      return { colorGroupId: null as string | null, size: null as string | null }
    }

    return {
      colorGroupId: firstInStock.color_group_id,
      size: hasSizeVariants ? getVariantSizeValue(firstInStock) : null,
    }
  }, [pdpData.variants, hasSizeVariants])

  const [selectedColorGroupId, setSelectedColorGroupId] = useState<string | null>(defaultSelection.colorGroupId)
  const [selectedSize, setSelectedSize] = useState<string | null>(defaultSelection.size)
  const [quantity, setQuantity] = useState(1)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [isSpecsOpen, setIsSpecsOpen] = useState(false)
  const [isWashOpen, setIsWashOpen] = useState(false)

  useEffect(() => {
    addToRecentlyViewed({
      product_id: pdpData.product.id,
      name: pdpData.product.name,
      slug: pdpData.product.slug,
      price: pdpData.pricing.selling_price,
      image_url: pdpData.images.gallery[0]?.url,
    })
  }, [
    addToRecentlyViewed,
    pdpData.product.id,
    pdpData.product.name,
    pdpData.product.slug,
    pdpData.pricing.selling_price,
    pdpData.images.gallery,
  ])

  const selectedVariant = useMemo<PDPVariant | null>(() => {
    if (hasSizeVariants) {
      if (!selectedColorGroupId || !selectedSize) return null
      return findMatchingVariant(pdpData.variants, selectedColorGroupId, selectedSize)
    }

    if (!selectedColorGroupId) return null

    return (
      pdpData.variants.find(
        variant => variant.enabled && !variant.is_out_of_stock && variant.color_group_id === selectedColorGroupId
      ) || null
    )
  }, [hasSizeVariants, selectedColorGroupId, selectedSize, pdpData.variants])

  const fallbackVariant = useMemo(
    () => pdpData.variants.find(variant => variant.enabled && !variant.is_out_of_stock) || null,
    [pdpData.variants]
  )

  const activeVariant = selectedVariant || fallbackVariant
  const maxQty = Math.max(1, activeVariant?.available_to_sell || activeVariant?.stock_quantity || 1)
  const inStock = !!activeVariant && !activeVariant.is_out_of_stock

  useEffect(() => {
    setQuantity(previous => Math.min(previous, maxQty))
  }, [maxQty])

  const displayPrice = activeVariant?.final_price || pdpData.pricing.selling_price
  const reviewCount = initialReviewCount
  const rating = initialRating

  const specs = [
    pdpData.product.fabric ? { label: 'Fabric', value: pdpData.product.fabric } : null,
    pdpData.product.fit_type ? { label: 'Fit', value: pdpData.product.fit_type } : null,
    pdpData.product.print_type ? { label: 'Print', value: pdpData.product.print_type } : null,
    pdpData.product.gsm ? { label: 'GSM', value: String(pdpData.product.gsm) } : null,
  ].filter((value): value is { label: string; value: string } => value !== null)

  const transformedSizeChart = useMemo(() => {
    if (!pdpData.size_chart) return null

    const originalUnit = pdpData.size_chart.unit_system === 'metric' ? 'cm' as const : 'in' as const
    const sizes: Record<string, Record<string, number>> = {}

    pdpData.size_chart.measurements.forEach((row) => {
      sizes[row.size_label] = row.measurements
    })

    const convertValue = (value: number, toUnit: 'cm' | 'in') => {
      if (toUnit === originalUnit) return value
      return toUnit === 'in' ? value / 2.54 : value * 2.54
    }

    const sizesCm: Record<string, Record<string, number>> = {}
    const sizesIn: Record<string, Record<string, number>> = {}

    Object.entries(sizes).forEach(([sizeLabel, fields]) => {
      sizesCm[sizeLabel] = {}
      sizesIn[sizeLabel] = {}

      Object.entries(fields).forEach(([field, value]) => {
        sizesCm[sizeLabel][field] = convertValue(value, 'cm')
        sizesIn[sizeLabel][field] = convertValue(value, 'in')
      })
    })

    return {
      name: pdpData.size_chart.name,
      fit_type: pdpData.product.fit_type,
      measurements: {
        originalUnit,
        sizes,
        sizesCm,
        sizesIn,
      },
    }
  }, [pdpData.size_chart, pdpData.product.fit_type])

  const sizeGuideFields = useMemo(() => {
    if (!pdpData.size_chart || pdpData.size_chart.measurements.length === 0) return []
    return Object.keys(pdpData.size_chart.measurements[0].measurements)
  }, [pdpData.size_chart])

  const demoReviews = [
    {
      id: 'demo-1',
      name: 'Aarav S.',
      rating: 5,
      title: 'Great fabric and fit',
      text: 'Premium quality feel and true-to-size fit. Stitching and finish are excellent.',
    },
    {
      id: 'demo-2',
      name: 'Riya M.',
      rating: 4,
      title: 'Looks exactly like the photos',
      text: 'Color and print match the listing. Delivery was quick and packaging was neat.',
    },
  ]

  return (
    <>
      {/* Breadcrumb injected into navbar via prop, not rendered here */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] lg:items-start gap-8 lg:gap-12">
        <div className="rounded-xl bg-white p-2 md:p-4 lg:p-6 flex flex-col justify-start self-start lg:sticky lg:top-24">
          <ProductGallery
            productName={pdpData.product.name}
            images={pdpData.images}
            selectedVariant={activeVariant}
            selectedColorGroupId={selectedColorGroupId}
            colorGroups={pdpData.color_groups}
            isOutOfStock={!inStock}
            isWishlisted={isInWishlist(pdpData.product.id)}
            onToggleWishlist={() => {
              toggleWishlist({
                product_id: pdpData.product.id,
                name: pdpData.product.name,
                slug: pdpData.product.slug,
                price: displayPrice,
                image_url: pdpData.images.gallery[0]?.url,
              })
            }}
          />
        </div>

        <div className="rounded-xl bg-white p-6 flex flex-col gap-6">
          {/* 1. Collection label removed: property does not exist on PDPProduct */}

          {/* 2. Title, rating, price, trust badges */}
          <div className="flex flex-col gap-2 border-b border-gray-100 pb-4">
            {pdpData.product.brand ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{pdpData.product.brand}</p>
            ) : null}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{pdpData.product.name}</h1>
            <div className="flex items-center gap-3">
              {/* Rating */}
              <span className="text-yellow-500 font-semibold text-sm">★ {rating.toFixed(1)}</span>
              <span className="text-xs text-gray-500">({reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">₹{displayPrice}</span>
              {pdpData.pricing.mrp > displayPrice && (
                <span className="text-base line-through text-gray-400">₹{pdpData.pricing.mrp}</span>
              )}
              <span className="ml-2 text-xs font-medium text-green-600">{inStock ? `In Stock (${maxQty})` : 'Out of Stock'}</span>
            </div>
            {/* Trust badges with icons and theme colors */}
            <div className="flex gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded text-green-700">
                <ShieldCheck className="w-4 h-4 text-green-600" aria-hidden="true" />
                100% Authentic
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded text-primary">
                <Truck className="w-4 h-4 text-primary" aria-hidden="true" />
                Free Shipping
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded text-yellow-700">
                <Undo2 className="w-4 h-4 text-yellow-600" aria-hidden="true" />
                Easy Returns
              </span>
            </div>
          </div>

          {/* 3. Short description/specs (expandable in future) */}
          {pdpData.product.short_description && (
            <div className="text-gray-700 text-sm border-b border-gray-100 pb-4">
              <p className="mb-2">{pdpData.product.short_description}</p>
            </div>
          )}

          {/* 4. Variant selector */}
          <VariantSelector
            variants={pdpData.variants}
            colorGroups={pdpData.color_groups}
            availabilityMatrix={pdpData.availability_matrix}
            hasSizeVariants={hasSizeVariants}
            selectedColorGroupId={selectedColorGroupId}
            selectedSize={selectedSize}
            onColorChange={setSelectedColorGroupId}
            onSizeChange={setSelectedSize}
            onSizeGuideClick={() => setShowSizeGuide(true)}
            showSizeGuide={!!pdpData.size_chart}
          />

          {/* 5. Quantity selector */}
          <QuantitySelector value={quantity} max={maxQty} onChange={setQuantity} />

          {/* 6. Add to Cart + Wishlist */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <AddToCartButton
                productId={pdpData.product.id}
                productName={pdpData.product.name}
                productSlug={pdpData.product.slug}
                variantId={activeVariant?.id ?? ""}
                price={displayPrice}
                quantity={quantity}
                disabled={!inStock}
                size={activeVariant ? getVariantSizeValue(activeVariant) : undefined}
                color={activeVariant?.color}
                imageUrl={pdpData.images.gallery[0]?.url}
              />
            </div>
            <WishlistButton
              productId={pdpData.product.id}
              name={pdpData.product.name}
              slug={pdpData.product.slug}
              price={displayPrice}
              imageUrl={pdpData.images.gallery[0]?.url}
            />
          </div>

          {specs.length > 0 ? (
            <section className="mt-2 pt-6 border-t border-gray-100" id="specifications">
              <button
                type="button"
                onClick={() => setIsSpecsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between"
                aria-expanded={isSpecsOpen}
                aria-controls="specifications-content"
              >
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-0">Specifications</h3>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSpecsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSpecsOpen ? (
                <ul id="specifications-content" className="space-y-2 text-sm mt-4">
                  {specs.map((row) => (
                    <li key={row.label} className="grid grid-cols-[120px_1fr] gap-3">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="text-gray-900 font-medium">{row.value}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {pdpData.wash_instruction ? (
            <section className="pt-6 border-t border-gray-100" id="wash-instruction">
              <button
                type="button"
                onClick={() => setIsWashOpen((prev) => !prev)}
                className="w-full flex items-center justify-between"
                aria-expanded={isWashOpen}
                aria-controls="wash-instruction-content"
              >
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-0">Wash Instruction</h3>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isWashOpen ? 'rotate-180' : ''}`} />
              </button>
              {isWashOpen ? (
                <div id="wash-instruction-content" className="space-y-3 mt-4">
                  <p className="text-sm font-semibold text-gray-900">{pdpData.wash_instruction.name}</p>
                  {pdpData.wash_instruction.summary ? (
                    <p className="text-sm text-gray-600">{pdpData.wash_instruction.summary}</p>
                  ) : null}
                  {pdpData.wash_instruction.details.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {pdpData.wash_instruction.details.map((line, idx) => (
                        <li key={`${line}-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No detailed wash steps available.</p>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

        </div>
      </section>

      <ProductDescription
        description={pdpData.product.description}
        specifications={specs}
        sizeGuide={pdpData.size_chart ? `Size chart: ${pdpData.size_chart.name}` : null}
      />

      <section className="mt-16 lg:mt-20">
        <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-6">Product Review</h2>
        <div className="space-y-6">
          {demoReviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-gray-200 bg-white p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{review.name}</p>
                  <span className="inline-block mt-1 text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded">
                    Demo Review
                  </span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={`${review.id}-${index}`} className={`w-4 h-4 ${index < review.rating ? 'fill-current' : ''}`} />
                  ))}
                </div>
              </div>
              <p className="text-base font-semibold text-gray-800 mb-2">{review.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      <FrequentlyBoughtTogether productId={pdpData.product.id} />
      <RelatedProducts products={relatedProducts} title="You May Also Like" />

      <SizeGuideModal
        sizeChart={transformedSizeChart}
        productName={pdpData.product.name}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </>
  )
}
