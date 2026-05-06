'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { GridProduct } from '@/types/grid'
import type { PDPData, PDPVariant } from '@/types/pdp'
import { useCart } from '@/context/CartContext'
import { findMatchingVariant, getVariantSizeValue } from '@/lib/products/buildAvailabilityMatrix'
import ProductGallery from './ProductGallery'
import VariantSelector from './VariantSelector'
import QuantitySelector from './QuantitySelector'
import AddToCartButton from './AddToCartButton'
import WishlistButton from './WishlistButton'
import ProductDescription from './ProductDescription'
import SizeGuideModal from './SizeGuideModal'
import { ChevronDown, MapPin, ShieldCheck, Truck, Undo2 } from 'lucide-react'

const RelatedProducts = dynamic(() => import('./RelatedProducts'))
const FrequentlyBoughtTogether = dynamic(() => import('./FrequentlyBoughtTogether'))

interface ProductDetailStudioClientProps {
  pdpData: PDPData
  relatedProducts: GridProduct[]
  initialRating: number
  initialReviewCount: number
}

export default function ProductDetailStudioClient({
  pdpData,
  relatedProducts,
  initialRating,
  initialReviewCount,
}: ProductDetailStudioClientProps) {
  const { isInWishlist, addToRecentlyViewed, toggleWishlist } = useCart()

  const hasSizeVariants = pdpData.variants.some((variant) => getVariantSizeValue(variant) !== null)

  const defaultSelection = useMemo(() => {
    const firstInStock = pdpData.variants.find((variant) => variant.enabled && !variant.is_out_of_stock)

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
  const [isSpecsOpen, setIsSpecsOpen] = useState(true)
  const [isWashOpen, setIsWashOpen] = useState(true)

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
        (variant) => variant.enabled && !variant.is_out_of_stock && variant.color_group_id === selectedColorGroupId
      ) || null
    )
  }, [hasSizeVariants, selectedColorGroupId, selectedSize, pdpData.variants])

  const fallbackVariant = useMemo(
    () => pdpData.variants.find((variant) => variant.enabled && !variant.is_out_of_stock) || null,
    [pdpData.variants]
  )

  const activeVariant = selectedVariant || fallbackVariant
  const maxQty = Math.max(1, activeVariant?.available_to_sell || activeVariant?.stock_quantity || 1)
  const inStock = !!activeVariant && !activeVariant.is_out_of_stock

  useEffect(() => {
    setQuantity((previous) => Math.min(previous, maxQty))
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

    const originalUnit = pdpData.size_chart.unit_system === 'metric' ? ('cm' as const) : ('in' as const)
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

  const shippingLabel =
    pdpData.product.shipping_charge === 0
      ? 'Free shipping'
      : `Shipping: Rs. ${pdpData.product.shipping_charge}`

  return (
    <>
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.9fr_0.7fr] lg:gap-8">
        <div className="rounded-xl border border-gray-200 bg-white p-3 lg:sticky lg:top-24 lg:self-start">
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

        <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
          {pdpData.product.brand ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{pdpData.product.brand}</p>
          ) : null}

          <h1 className="mt-1 text-3xl font-bold leading-tight text-gray-900">{pdpData.product.name}</h1>

          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="font-semibold text-yellow-600">★ {rating.toFixed(1)}</span>
            <span className="text-gray-500">{reviewCount} reviews</span>
          </div>

          <div className="mt-4 border-y border-gray-200 py-4">
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">Rs. {displayPrice}</span>
              {pdpData.pricing.mrp > displayPrice ? (
                <span className="text-sm text-gray-400 line-through">Rs. {pdpData.pricing.mrp}</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-gray-500">Inclusive of all taxes</p>
          </div>

          {pdpData.product.short_description ? (
            <p className="mt-4 text-sm leading-relaxed text-gray-700">{pdpData.product.short_description}</p>
          ) : null}

          <div className="mt-5">
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
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-200 p-2 text-center text-[11px] font-semibold text-gray-700">
              <ShieldCheck className="mx-auto mb-1 h-4 w-4 text-green-600" />
              Authentic
            </div>
            <div className="rounded-lg border border-gray-200 p-2 text-center text-[11px] font-semibold text-gray-700">
              <Truck className="mx-auto mb-1 h-4 w-4 text-primary" />
              Fast Ship
            </div>
            <div className="rounded-lg border border-gray-200 p-2 text-center text-[11px] font-semibold text-gray-700">
              <Undo2 className="mx-auto mb-1 h-4 w-4 text-yellow-600" />
              Easy Return
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-lg font-bold text-gray-900">Buy Now</h2>

          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">Rs. {displayPrice}</p>
            <p className="mt-1 text-xs text-gray-500">{shippingLabel}</p>
          </div>

          <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <p className={`font-semibold ${inStock ? 'text-green-700' : 'text-red-600'}`}>
              {inStock ? `In stock (${maxQty})` : 'Currently unavailable'}
            </p>
            <p className="mt-1 text-gray-600">Dispatch in 24-48 hours for most pin codes</p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-gray-700">Quantity</p>
            <QuantitySelector value={quantity} max={maxQty} onChange={setQuantity} />
          </div>

          <div className="mt-4">
            <AddToCartButton
              productId={pdpData.product.id}
              productName={pdpData.product.name}
              productSlug={pdpData.product.slug}
              variantId={activeVariant?.id ?? ''}
              price={displayPrice}
              quantity={quantity}
              disabled={!inStock}
              size={activeVariant ? getVariantSizeValue(activeVariant) : undefined}
              color={activeVariant?.color}
              imageUrl={pdpData.images.gallery[0]?.url}
            />
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Ships from</span>
              <span className="font-medium text-gray-900">Crown & Crest</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">Sold by</span>
              <span className="font-medium text-gray-900">Crown & Crest</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              Delivery options available at checkout
            </div>
          </div>

          <div className="mt-4">
            <WishlistButton
              productId={pdpData.product.id}
              name={pdpData.product.name}
              slug={pdpData.product.slug}
              price={displayPrice}
              imageUrl={pdpData.images.gallery[0]?.url}
            />
          </div>
        </aside>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setIsSpecsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between"
            aria-expanded={isSpecsOpen}
            aria-controls="studio-specifications-content"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Specifications</h3>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isSpecsOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSpecsOpen ? (
            <ul id="studio-specifications-content" className="mt-4 space-y-2 text-sm">
              {specs.length > 0 ? (
                specs.map((row) => (
                  <li key={row.label} className="grid grid-cols-[120px_1fr] gap-3">
                    <span className="text-gray-500">{row.label}</span>
                    <span className="font-medium text-gray-900">{row.value}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">No specifications available.</li>
              )}
            </ul>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <button
            type="button"
            onClick={() => setIsWashOpen((prev) => !prev)}
            className="flex w-full items-center justify-between"
            aria-expanded={isWashOpen}
            aria-controls="studio-wash-content"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Wash Instruction</h3>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isWashOpen ? 'rotate-180' : ''}`} />
          </button>

          {isWashOpen ? (
            <div id="studio-wash-content" className="mt-4 space-y-2">
              {pdpData.wash_instruction ? (
                <>
                  <p className="text-sm font-semibold text-gray-900">{pdpData.wash_instruction.name}</p>
                  {pdpData.wash_instruction.summary ? (
                    <p className="text-sm text-gray-600">{pdpData.wash_instruction.summary}</p>
                  ) : null}
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                    {pdpData.wash_instruction.details.map((line, idx) => (
                      <li key={`${line}-${idx}`}>{line}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-gray-500">No wash instruction assigned for this product.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <ProductDescription
        description={pdpData.product.description}
        specifications={specs}
        sizeGuide={pdpData.size_chart ? `Size chart: ${pdpData.size_chart.name}` : null}
      />

      <FrequentlyBoughtTogether productId={pdpData.product.id} />
      <RelatedProducts products={relatedProducts} title="Customers also viewed" />

      <SizeGuideModal
        sizeChart={transformedSizeChart}
        productName={pdpData.product.name}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </>
  )
}
