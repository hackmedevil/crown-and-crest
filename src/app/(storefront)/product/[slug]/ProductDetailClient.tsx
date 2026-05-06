'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star } from 'lucide-react'
import type { PDPData } from '@/types/pdp'
import { findMatchingVariant, getVariantSizeValue } from '@/lib/products/buildAvailabilityMatrix'
import { computeSizeRecommendation } from '@/lib/recommendation'
import { addToCart } from '@/lib/cart/actions'
import { addToGuestCart } from '@/lib/cart/guestCart'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/context/AuthContext'
import ProductGallery from '@/components/product/ProductGallery'
import ProductInfo from '@/components/product/ProductInfo'
import PriceDisplay from '@/components/product/PriceDisplay'
import VariantSelector from '@/components/product/VariantSelector'
import PincodeCheck from '@/components/product/PincodeCheck'
import AddToCart from '@/components/product/AddToCart'
import TrustBadges from '@/components/product/TrustBadges'
import SizeRecommendation from '@/components/product/SizeRecommendation'
import SizeGuideModal from '@/components/product/SizeGuideModal'
import StickyAddToCart from '@/components/product/StickyAddToCart'
import RelatedProducts from '@/components/product/RelatedProducts'
import RecentlyViewedProducts from '@/components/product/RecentlyViewedProducts'

interface RelatedProduct {
  id: string
  name: string
  slug: string
  base_price: number
  image_url: string | null
  category: string | null
}

interface UserSizebook {
  id: string
  user_uid: string
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  measurements: any
  fit_preference: string | null
}

type PendingCheckoutOrder = {
  orderId: string
  razorpayOrderId: string
}

/**
 * ProductDetailClient - Phase 2 Refactor
 * 
 * Consumes PDPData directly (no adapter, no legacy fields)
 * Uses new component structure for clarity and maintainability
 */
export default function ProductDetailClient({
  pdpData,
  relatedProducts = [],
  userSizebook = null,
  isAuthenticated = false
}: {
  pdpData: PDPData
  relatedProducts?: RelatedProduct[]
  userSizebook?: UserSizebook | null
  isAuthenticated?: boolean
}) {
  const RECENTLY_VIEWED_STORAGE_KEY = 'recently_viewed_products'
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToast()
  const { requireAuth, isAuthenticated: isAuthContextAuthenticated } = useAuth()
  console.count('ProductDetailClient render')

  const hasSizeVariants = pdpData.variants.some(v => getVariantSizeValue(v) !== null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY) || '[]')
      const normalized = Array.isArray(stored) ? stored : []

      const filtered = normalized.filter((item: { id?: string } | null) => item?.id !== pdpData.product.id)

      const updated = [
        {
          id: pdpData.product.id,
          name: pdpData.product.name,
          slug: pdpData.product.slug,
          image: pdpData.images.gallery?.[0]?.url || '',
          price: pdpData.pricing.selling_price,
        },
        ...filtered,
      ].slice(0, 10)

      window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(updated))
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [pdpData.product.id, pdpData.product.name, pdpData.product.slug, pdpData.images.gallery, pdpData.pricing.selling_price])

  useEffect(() => {
    console.log('hasSizeVariants', hasSizeVariants)
  }, [hasSizeVariants])

  // Helper: Find first in-stock color and size
  const getDefaultSelection = (): { colorId: string | null; size: string | null } => {
    // Try to get from URL params
    const urlColor = searchParams.get('color')
    const urlSize = searchParams.get('size')

    if (urlColor && !hasSizeVariants) {
      const colorGroup = pdpData.color_groups.find(
        cg => cg.name.toLowerCase() === urlColor.toLowerCase()
      )

      if (colorGroup) {
        const variantForColor = pdpData.variants.find(
          v => v.enabled && !v.is_out_of_stock && v.color_group_id === colorGroup.id
        )

        if (variantForColor) {
          return { colorId: colorGroup.id, size: null }
        }
      }
    }

    if (urlColor && urlSize && hasSizeVariants) {
      // Validate URL params for size-based products
      const colorGroup = pdpData.color_groups.find(
        cg => cg.name.toLowerCase() === urlColor.toLowerCase()
      )
      if (colorGroup) {
        const availableSizes = pdpData.availability_matrix.color_to_sizes[colorGroup.id] || []
        if (availableSizes.includes(urlSize.toUpperCase())) {
          const variant = findMatchingVariant(pdpData.variants, colorGroup.id, urlSize.toUpperCase())
          if (variant && !variant.is_out_of_stock) {
            return { colorId: colorGroup.id, size: urlSize.toUpperCase() }
          }
        }
      }
    }

    if (hasSizeVariants) {
      // Default: Find first available in-stock color and size
      for (const colorGroup of pdpData.color_groups) {
        const availableSizes = pdpData.availability_matrix.color_to_sizes[colorGroup.id] || []
        for (const size of availableSizes) {
          const variant = findMatchingVariant(pdpData.variants, colorGroup.id, size)
          if (variant && !variant.is_out_of_stock) {
            return { colorId: colorGroup.id, size }
          }
        }
      }
    } else {
      // Color-only products: pick first in-stock variant by color.
      for (const colorGroup of pdpData.color_groups) {
        const variantForColor = pdpData.variants.find(
          v => v.enabled && !v.is_out_of_stock && v.color_group_id === colorGroup.id
        )
        if (variantForColor) {
          return { colorId: colorGroup.id, size: null }
        }
      }
    }

    // Legacy fallback: first in-stock variant even when no color groups exist.
    const fallbackVariant = pdpData.variants.find(v => v.enabled && !v.is_out_of_stock)
    if (fallbackVariant) {
      return {
        colorId: fallbackVariant.color_group_id ?? null,
        size: fallbackVariant.size ?? null
      }
    }

    return { colorId: null, size: null }
  }

  // State management with improved defaults
  const defaultSelection = useMemo(() => getDefaultSelection(), [])
  const [selectedColorGroupId, setSelectedColorGroupId] = useState<string | null>(defaultSelection.colorId)
  const [selectedSize, setSelectedSize] = useState<string | null>(defaultSelection.size)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [isBuyingNow] = useState(false)
  const [preloadedImageUrls, setPreloadedImageUrls] = useState<Set<string>>(new Set())
  const preloadTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Find currently selected variant using availability matrix
  const selectedVariant = useMemo(() => {
    if (!hasSizeVariants) {
      if (!selectedColorGroupId) return null
      return (
        pdpData.variants.find(
          v => v.enabled && !v.is_out_of_stock && v.color_group_id === selectedColorGroupId
        ) || null
      )
    }

    if (!selectedSize) return null

    // Size-only products can have no color group. In that case, resolve by size alone.
    if (!selectedColorGroupId) {
      return (
        pdpData.variants.find(v => {
          return v.enabled && !v.is_out_of_stock && getVariantSizeValue(v) === selectedSize
        }) || null
      )
    }

    return findMatchingVariant(pdpData.variants, selectedColorGroupId, selectedSize)
  }, [selectedColorGroupId, selectedSize, pdpData.variants, hasSizeVariants])

  const inStockVariants = useMemo(
    () => pdpData.variants.filter(v => v.enabled && !v.is_out_of_stock),
    [pdpData.variants]
  )

  const firstInStockVariant = useMemo(() => inStockVariants[0] ?? null, [inStockVariants])

  const firstAvailableSelection = useMemo(() => {
    if (!firstInStockVariant) {
      return { colorId: null, size: null }
    }
    return {
      colorId: firstInStockVariant.color_group_id ?? null,
      size: firstInStockVariant.size ?? null
    }
  }, [firstInStockVariant])

  const getEnabledSizesForColor = (colorGroupId: string): string[] => {
    const sizes = Array.from(
      new Set(
        pdpData.variants
          .filter(v => v.enabled && v.color_group_id === colorGroupId)
          .map(v => getVariantSizeValue(v))
          .filter((size): size is string => !!size)
      )
    )

    return sizes
  }

  const safeSelectedVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant
    // Only use first in-stock variant before a concrete color is selected.
    if (!selectedColorGroupId) return firstInStockVariant
    return null
  }, [selectedVariant, firstInStockVariant, selectedColorGroupId])

  useEffect(() => {
    if (!hasSizeVariants && selectedColorGroupId && !selectedVariant) {
      console.warn('Variant resolution failed', {
        selectedColorGroupId,
        selectedSize,
      })
      return
    }

    if (hasSizeVariants && selectedColorGroupId && selectedSize && !selectedVariant) {
      console.warn('Variant resolution failed', {
        selectedColorGroupId,
        selectedSize,
      })
    }
  }, [selectedColorGroupId, selectedSize, selectedVariant, hasSizeVariants])

  const handleColorChange = (colorGroupId: string) => {
    if (!hasSizeVariants) {
      const hasVariantForColor = pdpData.variants.some(
        v => v.enabled && !v.is_out_of_stock && v.color_group_id === colorGroupId
      )
      if (!hasVariantForColor) {
        console.warn('Color ignored: no in-stock variant for color', colorGroupId)
        return
      }
      setSelectedColorGroupId(colorGroupId)
      return
    }

    const sizesForColor = getEnabledSizesForColor(colorGroupId)
    if (sizesForColor.length === 0) {
      console.warn('Color ignored: no enabled sizes for color', colorGroupId)
      return
    }

    setSelectedColorGroupId(colorGroupId)

    if (!selectedSize || !sizesForColor.includes(selectedSize)) {
      setSelectedSize(sizesForColor[0])
    }
  }

  const handleSizeChange = (size: string) => {
    if (!hasSizeVariants) return
    setSelectedSize(size)
  }

  const currentGalleryUrls = useMemo(() => {
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return new Set(selectedVariant.images.map(img => img.url))
    }

    if (selectedColorGroupId) {
      const selectedColorGroup = pdpData.color_groups.find(cg => cg.id === selectedColorGroupId)
      if (selectedColorGroup?.images?.length) {
        return new Set(selectedColorGroup.images.map(img => img.url))
      }
    }

    return new Set(pdpData.images.gallery.map(img => img.url))
  }, [selectedVariant, selectedColorGroupId, pdpData.color_groups, pdpData.images.gallery])

  // Update URL when variant changes (Phase 3: Deep Linking)
  useEffect(() => {
    if (!selectedColorGroupId) return

    const colorGroup = pdpData.color_groups.find(cg => cg.id === selectedColorGroupId)
    if (!colorGroup) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('color', colorGroup.name.toLowerCase().replace(/\s+/g, '-'))

    if (hasSizeVariants && selectedSize) {
      params.set('size', selectedSize.toLowerCase())
    } else {
      params.delete('size')
    }

    const nextSearch = params.toString()
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname
    const currentUrl = `${window.location.pathname}${window.location.search}`

    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [selectedColorGroupId, selectedSize, pdpData.color_groups, router, hasSizeVariants])

  // Keep size valid for the currently selected color.
  // This prevents color clicks from being immediately reverted by fallback logic.
  useEffect(() => {
    if (!hasSizeVariants) {
      return
    }

    if (!selectedColorGroupId) {
      return
    }

    const sizesForColor = getEnabledSizesForColor(selectedColorGroupId)
    if (sizesForColor.length === 0) {
      return
    }

    if (!selectedSize || !sizesForColor.includes(selectedSize)) {
      setSelectedSize(sizesForColor[0])
    }
  }, [selectedColorGroupId, hasSizeVariants, pdpData.variants])

  // Variant safety: keep selection in a valid in-stock state
  useEffect(() => {
    if (!hasSizeVariants) {
      return
    }

    if (!firstInStockVariant) {
      return
    }

    if (!selectedSize) {
      if (selectedSize !== firstAvailableSelection.size) {
        setSelectedSize(firstAvailableSelection.size)
      }
      return
    }

    // Size-only products do not have color groups; do not force-reset selection.
    if (!selectedColorGroupId) {
      return
    }

    if (selectedVariant) {
      return
    }

    const hasAnyEnabledVariantForColor = pdpData.variants.some(v => {
      return v.enabled && v.color_group_id === selectedColorGroupId && getVariantSizeValue(v) !== null
    })

    // If the selected color has variants, keep user selection (may be out of stock)
    // instead of force-jumping to another color.
    if (hasAnyEnabledVariantForColor) {
      return
    }

    const sameColorVariant = inStockVariants.find(v => v.color_group_id === selectedColorGroupId)
    if (sameColorVariant?.size) {
      if (selectedSize !== sameColorVariant.size) {
        setSelectedSize(sameColorVariant.size)
      }
      return
    }

    if (selectedColorGroupId !== firstAvailableSelection.colorId) {
      setSelectedColorGroupId(firstAvailableSelection.colorId)
    }
    if (selectedSize !== firstAvailableSelection.size) {
      setSelectedSize(firstAvailableSelection.size)
    }
  }, [selectedColorGroupId, selectedSize, selectedVariant, inStockVariants, firstAvailableSelection, firstInStockVariant, hasSizeVariants, pdpData.variants])

  // Preload images for hovered color, skipping already visible/preloaded URLs.
  const preloadColorGroupImages = (colorGroupId: string) => {
    Object.entries(preloadTimeoutsRef.current).forEach(([pendingColorId, timeoutId]) => {
      if (pendingColorId !== colorGroupId) {
        clearTimeout(timeoutId)
        delete preloadTimeoutsRef.current[pendingColorId]
      }
    })

    const colorGroup = pdpData.color_groups.find(cg => cg.id === colorGroupId)
    if (!colorGroup?.images?.length) return

    if (preloadTimeoutsRef.current[colorGroupId]) {
      clearTimeout(preloadTimeoutsRef.current[colorGroupId])
    }

    preloadTimeoutsRef.current[colorGroupId] = setTimeout(() => {
      const urlsToPreload = colorGroup.images
        .map(image => image.url)
        .filter(url => !currentGalleryUrls.has(url) && !preloadedImageUrls.has(url))

      if (urlsToPreload.length === 0) {
        delete preloadTimeoutsRef.current[colorGroupId]
        return
      }

      urlsToPreload.forEach(url => {
        const img = new Image()
        img.decoding = 'async'
        img.src = url
      })

      setPreloadedImageUrls(prev => {
        const next = new Set(prev)
        urlsToPreload.forEach(url => next.add(url))
        return next
      })

      delete preloadTimeoutsRef.current[colorGroupId]
    }, 120)
  }

  const cancelPreloadColorGroupImages = (colorGroupId: string) => {
    const timeoutId = preloadTimeoutsRef.current[colorGroupId]
    if (timeoutId) {
      clearTimeout(timeoutId)
      delete preloadTimeoutsRef.current[colorGroupId]
    }
  }

  useEffect(() => {
    return () => {
      Object.values(preloadTimeoutsRef.current).forEach(timeoutId => clearTimeout(timeoutId))
      preloadTimeoutsRef.current = {}
    }
  }, [])

  // Compute size recommendation
  const sizeRecommendation = useMemo(() => {
    if (!userSizebook || !pdpData.size_chart) return null

    // Transform PDPSizeChart to SizeChartMeasurements format
    const sizes: Record<string, Record<string, number>> = {}
    pdpData.size_chart.measurements.forEach(sizeMeasurement => {
      sizes[sizeMeasurement.size_label] = sizeMeasurement.measurements
    })

    const sizeChartData = {
      unit: pdpData.size_chart.unit_system === 'metric' ? 'cm' as const : 'in' as const,
      sizes
    }

    return computeSizeRecommendation({
      user_measurements: userSizebook.measurements,
      size_chart: sizeChartData
    })
  }, [userSizebook, pdpData.size_chart])

  // Pre-select recommended size (if available)
  useEffect(() => {
    if (!hasSizeVariants) return

    if (sizeRecommendation && !selectedSize) {
      const recommendedSize = sizeRecommendation.size_label
      const isAvailable = selectedColorGroupId
        ? pdpData.availability_matrix.color_to_sizes[selectedColorGroupId]?.includes(recommendedSize)
        : pdpData.variants.some(v => v.size === recommendedSize && !v.is_out_of_stock)

      if (isAvailable) {
        setSelectedSize(recommendedSize)
      }
    }
  }, [sizeRecommendation, selectedSize, selectedColorGroupId, pdpData.availability_matrix, pdpData.variants, hasSizeVariants])

  const isOutOfStock = !safeSelectedVariant || safeSelectedVariant.is_out_of_stock

  // Build selection label for cart messages
  const selectionLabel = useMemo(() => {
    const parts: string[] = []
    if (selectedColorGroupId) {
      const colorGroup = pdpData.color_groups.find(cg => cg.id === selectedColorGroupId)
      if (colorGroup) parts.push(colorGroup.name)
    }
    if (selectedSize) parts.push(selectedSize)
    return parts.join(' / ')
  }, [selectedColorGroupId, selectedSize, pdpData.color_groups])

  const handleAddToCart = async (): Promise<boolean> => {
    const canProceed = isAuthenticated || isAuthContextAuthenticated

    // If user is not authenticated, add to guest cart (localStorage) instead
    if (!canProceed) {
      if (!safeSelectedVariant) {
        showError('Please select a variant')
        return false
      }

      const success = addToGuestCart(pdpData.product.id, safeSelectedVariant.id, 1)
      if (success) {
        showSuccess(`${pdpData.product.name}${selectionLabel ? ` (${selectionLabel})` : ''} has been added to your cart.`)
        return true
      }

      // Fallback to requireAuth if guest add fails for any reason
      await requireAuth(async () => {
        await executeAddToCart()
      }, 'addToCart')
      return false
    }

    return executeAddToCart()
  }

  const executeAddToCart = async (): Promise<boolean> => {
    if (isAddingToCart || isBuyingNow) return false

    if (isOutOfStock || !safeSelectedVariant) {
      showError(!safeSelectedVariant ? 'Please select a variant' : 'Selected combination is out of stock')
      return false
    }

    setIsAddingToCart(true)

    try {
      const formData = new FormData()
      formData.append('productId', pdpData.product.id)
      formData.append('variantId', safeSelectedVariant.id)
      formData.append('quantity', '1')

      const result = await addToCart(null, formData)

      if (!result.success) {
        showError(result.error || 'Failed to add to cart. Please try again.')
        return false
      }

      showSuccess(`${pdpData.product.name}${selectionLabel ? ` (${selectionLabel})` : ''} has been added.`)

      try {
        const lastSearchQuery = localStorage.getItem('last_search_query')
        if (lastSearchQuery) {
          await fetch('/api/search/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: lastSearchQuery,
              productId: pdpData.product.id,
              interactionType: 'cart_add'
            })
          })
        }
      } catch (trackError) {
        console.warn('Failed to track cart_add interaction:', trackError)
      }

      return true
    } catch (error) {
      console.error('Add to cart error:', error)
      showError('An unexpected error occurred.')
      return false
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleBuyNow = async (): Promise<void> => {
    const canProceed = isAuthenticated || isAuthContextAuthenticated

    if (!canProceed) {
      // For guests: require auth, then redirect to checkout
      await requireAuth(async () => {
        router.push('/checkout')
      }, 'buyNow')
      return
    }

    // For authenticated users: add to cart then redirect to checkout
    const added = await handleAddToCart()
    if (added) {
      router.push('/checkout')
    }
  }

  const handleToggleWishlist = () => {
    const canProceed = isAuthenticated || isAuthContextAuthenticated

    if (!canProceed) {
      void requireAuth(async () => {
        setIsWishlisted(prev => !prev)
      }, 'wishlist')
      return
    }

    setIsWishlisted(prev => !prev)
  }

  // Transform PDPSizeChart to SizeGuideModal format
  const transformedSizeChart = useMemo(() => {
    if (!pdpData.size_chart) return null

    const sizes: Record<string, Record<string, number>> = {}
    pdpData.size_chart.measurements.forEach(sizeMeasurement => {
      sizes[sizeMeasurement.size_label] = sizeMeasurement.measurements
    })

    const originalUnit = pdpData.size_chart.unit_system === 'metric' ? 'cm' as const : 'in' as const
    
    // Convert between units for display purposes
    const convertValue = (value: number, from: 'cm' | 'in', to: 'cm' | 'in') => {
      if (from === to) return value
      if (from === 'cm' && to === 'in') return value / 2.54
      return value * 2.54
    }

    const sizesCm: Record<string, Record<string, number>> = {}
    const sizesIn: Record<string, Record<string, number>> = {}

    Object.entries(sizes).forEach(([sizeLabel, measurements]) => {
      sizesCm[sizeLabel] = {}
      sizesIn[sizeLabel] = {}
      
      Object.entries(measurements).forEach(([field, value]) => {
        if (originalUnit === 'cm') {
          sizesCm[sizeLabel][field] = value
          sizesIn[sizeLabel][field] = convertValue(value, 'cm', 'in')
        } else {
          sizesIn[sizeLabel][field] = value
          sizesCm[sizeLabel][field] = convertValue(value, 'in', 'cm')
        }
      })
    })

    return {
      measurements: {
        originalUnit,
        sizes,
        sizesCm,
        sizesIn
      },
      name: pdpData.size_chart.name,
      fit_type: null
    }
  }, [pdpData.size_chart])

  const specificationRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = []

    if (pdpData.product.brand) rows.push({ label: 'Brand', value: pdpData.product.brand })
    if (pdpData.product.category?.name) rows.push({ label: 'Category', value: pdpData.product.category.name })
    if (pdpData.product.fabric) rows.push({ label: 'Fabric', value: pdpData.product.fabric })
    if (pdpData.product.gsm) rows.push({ label: 'GSM', value: String(pdpData.product.gsm) })
    if (pdpData.product.fit_type) rows.push({ label: 'Fit', value: pdpData.product.fit_type })
    if (pdpData.product.print_type) rows.push({ label: 'Print Type', value: pdpData.product.print_type })
    rows.push({ label: 'Shipping', value: pdpData.product.shipping_charge === 0 ? 'Free' : `Rs. ${pdpData.product.shipping_charge}` })

    return rows
  }, [pdpData.product])

  const sizeGuideFields = useMemo(() => {
    if (!pdpData.size_chart || pdpData.size_chart.measurements.length === 0) return []

    return Object.keys(pdpData.size_chart.measurements[0].measurements)
  }, [pdpData.size_chart])

  return (
    <div className="bg-white min-h-screen pb-24 md:pb-0">
      <StickyAddToCart
        product={pdpData.product}
        pricing={pdpData.pricing}
        selectedVariant={safeSelectedVariant}
        isOutOfStock={isOutOfStock}
        selectionLabel={selectionLabel}
        onAddToCart={() => {
          void handleAddToCart()
        }}
        onBuyNow={() => {
          void handleBuyNow()
        }}
        isAddingToCart={isAddingToCart}
        isBuyingNow={isBuyingNow}
      />

      <div className="max-w-7xl mx-auto md:px-6 lg:px-8 md:py-8">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
          {/* Left Column: Product Gallery */}
          <div className="w-full md:w-1/2 lg:w-[55%]">
            <div className="md:sticky md:top-24">
              <ProductGallery
                productName={pdpData.product.name}
                images={pdpData.images}
                selectedVariant={safeSelectedVariant}
                selectedColorGroupId={selectedColorGroupId}
                colorGroups={pdpData.color_groups}
                isOutOfStock={isOutOfStock}
                isWishlisted={isWishlisted}
                onToggleWishlist={handleToggleWishlist}
              />
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="w-full md:w-1/2 lg:w-[45%] px-4 md:px-0">
            <div className="mt-6 md:mt-0">
              <ProductInfo product={pdpData.product} />

              <PriceDisplay
                pricing={pdpData.pricing}
                selectedVariant={safeSelectedVariant}
                isOutOfStock={isOutOfStock}
              />

              <PincodeCheck className="mb-8" />

              <VariantSelector
                variants={pdpData.variants}
                colorGroups={pdpData.color_groups}
                availabilityMatrix={pdpData.availability_matrix}
                hasSizeVariants={hasSizeVariants}
                selectedColorGroupId={selectedColorGroupId}
                selectedSize={selectedSize}
                onColorChange={handleColorChange}
                onSizeChange={handleSizeChange}
                onColorHover={preloadColorGroupImages}
                onColorLeave={cancelPreloadColorGroupImages}
                onSizeGuideClick={() => setShowSizeGuide(true)}
                showSizeGuide={!!pdpData.size_chart}
              />

              {/* Size Recommendation */}
              <SizeRecommendation
                recommendation={sizeRecommendation}
                hasUserSizebook={!!userSizebook}
                isAuthenticated={isAuthenticated || isAuthContextAuthenticated}
                sizeChartExists={!!pdpData.size_chart}
              />

              <AddToCart
                product={pdpData.product}
                pricing={pdpData.pricing}
                selectedVariant={safeSelectedVariant}
                isOutOfStock={isOutOfStock}
                isAddingToCart={isAddingToCart}
                isBuyingNow={isBuyingNow}
                onAddToCart={async () => {
                  await handleAddToCart()
                }}
                onBuyNow={handleBuyNow}
                selectionLabel={selectionLabel}
              />

              <TrustBadges />

              {/* Specifications */}
              <section className="mt-8 pt-8 border-t border-gray-100" id="specifications">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Specifications</h3>
                <ul className="space-y-2 text-sm">
                  {specificationRows.map((row) => (
                    <li key={row.label} className="grid grid-cols-[140px_1fr] gap-3">
                      <span className="text-gray-500">{row.label}</span>
                      <span className="text-gray-900 font-medium">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Wash Instruction */}
              <section className="mt-8 pt-8 border-t border-gray-100" id="wash-instruction">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Wash Instruction</h3>
                {pdpData.wash_instruction ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900">{pdpData.wash_instruction.name}</p>
                    {pdpData.wash_instruction.summary ? (
                      <p className="text-sm text-gray-600">{pdpData.wash_instruction.summary}</p>
                    ) : null}
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      {pdpData.wash_instruction.details.map((line, idx) => (
                        <li key={`${line}-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No wash instruction assigned for this product.</p>
                )}
              </section>

              {/* Size Guide */}
              <section className="mt-8 pt-8 border-t border-gray-100" id="size-guide">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Size Guide</h3>
                  {pdpData.size_chart ? (
                    <button
                      type="button"
                      onClick={() => setShowSizeGuide(true)}
                      className="text-xs underline text-gray-600 hover:text-gray-900"
                    >
                      Open Full Guide
                    </button>
                  ) : null}
                </div>

                {pdpData.size_chart && sizeGuideFields.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-3 py-2 border-b border-gray-200">Size</th>
                          {sizeGuideFields.map((field) => (
                            <th key={field} className="text-left px-3 py-2 border-b border-gray-200 capitalize">
                              {field.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pdpData.size_chart.measurements.map((row) => (
                          <tr key={row.size_label}>
                            <td className="px-3 py-2 border-b border-gray-100 font-semibold">{row.size_label}</td>
                            {sizeGuideFields.map((field) => (
                              <td key={`${row.size_label}-${field}`} className="px-3 py-2 border-b border-gray-100">
                                {row.measurements[field] ?? '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No size guide assigned for this product.</p>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* Reviews Teaser - appears after top panel sections */}
        <div className="mt-10 pt-8 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Reviews{' '}
              <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs ml-1">
                120
              </span>
            </h3>
            <button className="text-xs underline text-gray-500">View all</button>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl max-w-3xl">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-3 h-3 fill-black text-black" />
              ))}
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">Stunning quality</p>
            <p className="text-xs text-gray-600 italic">
              "The fabric is incredibly soft and the fit is true to size. I've worn it to
              three events already!"
            </p>
            <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide">
              — Sarah J., Verified Buyer
            </p>
          </div>
        </div>

        <RelatedProducts products={relatedProducts} />

        <RecentlyViewedProducts currentProductId={pdpData.product.id} />
      </div>

      {/* Size Chart Modal */}
      <SizeGuideModal
        sizeChart={transformedSizeChart}
        productName={pdpData.product.name}
        userSizebook={userSizebook}
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </div>
  )
}

