'use client'

import { useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import type { PDPImages, PDPVariant, PDPColorGroup } from '@/types/pdp'
import { optimizeCloudinaryUrl } from '@/lib/cloudinary/optimizeImageUrl'
import ProductGalleryFullscreen from './ProductGalleryFullscreen'

interface ProductGalleryProps {
  productName: string
  images: PDPImages
  selectedVariant: PDPVariant | null
  selectedColorGroupId: string | null
  colorGroups: PDPColorGroup[]
  isOutOfStock: boolean
  isWishlisted: boolean
  onToggleWishlist: () => void
}

/**
 * ProductGallery Component
 * 
 * Handles image display with smart switching:
 * - Color change → gallery updates to color group images
 * - Variant change → primary image updates
 * - Uses images.gallery as canonical source (no merging)
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - First image marked with priority for LCP
 * - Cloudinary auto-optimization (f_auto, q_auto, w_auto, dpr_auto)
 * - Lazy loading for non-LCP images
 * - Proper responsive sizing
 */
export default function ProductGallery({
  productName,
  images,
  selectedVariant,
  selectedColorGroupId,
  colorGroups,
  isOutOfStock,
  isWishlisted,
  onToggleWishlist
}: ProductGalleryProps) {
  const [gallerySelection, setGallerySelection] = useState<{ key: string; index: number }>({
    key: '',
    index: 0,
  })
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
  const touchStartXRef = useRef<number | null>(null)

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

  const dedupeUrls = (urls: string[]) => Array.from(new Set(urls.filter(Boolean)))

  // Get current gallery based on selection
  const currentGallery = (() => {
    // Priority 1: Variant-specific images
    if (selectedVariant?.images && selectedVariant.images.length > 0) {
      return dedupeUrls(selectedVariant.images.map(img => img.url))
    }

    // Priority 2: Color group images
    if (selectedColorGroupId) {
      const colorGroup = colorGroups.find(cg => cg.id === selectedColorGroupId)
      if (colorGroup && colorGroup.images.length > 0) {
        return dedupeUrls(colorGroup.images.map(img => img.url))
      }
    }

    // Priority 3: Fallback to PDPImages gallery
    return dedupeUrls(images.gallery.map(img => img.url))
  })()

  // Optimize all gallery images with Cloudinary transformations
  const optimizedGallery = currentGallery.map(url => 
    optimizeCloudinaryUrl(url, {
      quality: 'auto:good',
      format: 'auto',
      dpr: true
    })
  )

  // Derive selection key from active variant/color context so image index naturally resets per gallery.
  const galleryKey = useMemo(
    () => `${selectedVariant?.id ?? 'variant-none'}|${selectedColorGroupId ?? 'color-none'}|${optimizedGallery.length}`,
    [selectedVariant?.id, selectedColorGroupId, optimizedGallery.length]
  )

  const currentImageIndex =
    gallerySelection.key === galleryKey
      ? clamp(gallerySelection.index, 0, Math.max(optimizedGallery.length - 1, 0))
      : 0

  const setActiveImageIndex = (nextIndex: number) => {
    setGallerySelection({ key: galleryKey, index: nextIndex })
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current
    const endX = event.changedTouches[0]?.clientX ?? null

    if (startX === null || endX === null) return

    const delta = startX - endX
    const threshold = 40

    if (Math.abs(delta) < threshold) return

    if (delta > 0) {
      setActiveImageIndex(Math.min(currentImageIndex + 1, optimizedGallery.length - 1))
    } else {
      setActiveImageIndex(Math.max(currentImageIndex - 1, 0))
    }
  }

  const variantLabel = selectedVariant
    ? [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' / ')
    : ''

  return (
    <>
      {/* Desktop: Main carousel + vertical thumbnail selector */}
      <div className="hidden md:flex gap-4">
        <div className="flex w-20 flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
          {optimizedGallery.map((imageUrl, idx) => (
            <button
              key={`desktop-thumb-${imageUrl}-${idx}`}
              type="button"
              onClick={() => setActiveImageIndex(idx)}
              className={`relative h-24 w-full overflow-hidden ${currentImageIndex === idx ? '' : ''}`}
              aria-label={`Select image ${idx + 1}`}
            >
              <Image
                src={imageUrl}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                loading="lazy"
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        <div className="relative flex-1 aspect-[3/4] overflow-hidden">
          <Image
            src={optimizedGallery[currentImageIndex] || '/placeholder.png'}
            alt={`${productName}${variantLabel ? ` - ${variantLabel}` : ''} - View ${currentImageIndex + 1} of ${optimizedGallery.length}`}
            fill
            priority={currentImageIndex === 0}
            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
            sizes="(max-width: 1024px) 55vw, 50vw"
            className="object-cover rounded-xl"
          />
          <button
            type="button"
            onClick={() => setIsFullscreenOpen(true)}
            className="absolute inset-0 z-10 cursor-zoom-in"
            aria-label={`Open image ${currentImageIndex + 1} in fullscreen`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-red-500 text-white text-lg font-bold px-6 py-3 rounded">
                OUT OF STOCK
              </span>
            </div>
          )}

          {/* Image Counter Badge */}
          {optimizedGallery.length > 1 && (
            <div className="absolute top-4 right-4 z-20 bg-black/70 text-white text-xs font-medium px-2.5 py-1.5 rounded">
              {currentImageIndex + 1} / {optimizedGallery.length}
            </div>
          )}

          {optimizedGallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex(Math.max(currentImageIndex - 1, 0))}
                disabled={currentImageIndex === 0}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 hover:bg-white px-4 py-2.5 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous image"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex(Math.min(currentImageIndex + 1, optimizedGallery.length - 1))}
                disabled={currentImageIndex === optimizedGallery.length - 1}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/95 hover:bg-white px-4 py-2.5 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next image"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: Carousel with Thumbnails */}
      <div className="md:hidden">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={optimizedGallery[currentImageIndex] || '/placeholder.png'}
            alt={`${productName}${variantLabel ? ` - ${variantLabel}` : ''} - View ${currentImageIndex + 1} of ${optimizedGallery.length}`}
            fill
            priority={currentImageIndex === 0}
            loading={currentImageIndex === 0 ? 'eager' : 'lazy'}
            sizes="100vw"
            className="object-cover rounded-xl"
          />
          <button
            type="button"
            onClick={() => setIsFullscreenOpen(true)}
            className="absolute inset-0 z-10 cursor-zoom-in"
            aria-label={`Open image ${currentImageIndex + 1} in fullscreen`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded">
                OUT OF STOCK
              </span>
            </div>
          )}

          {/* Pagination Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {optimizedGallery.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`rounded-full transition-all ${
                  currentImageIndex === idx ? 'bg-white w-6 h-2.5' : 'bg-white/60 w-2.5 h-2.5 hover:bg-white/80'
                }`}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Mobile Thumbnails */}
        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2 px-4">
          {optimizedGallery.map((imageUrl, idx) => (
            <button
              key={`thumb-${imageUrl}-${idx}`}
              type="button"
              onClick={() => setActiveImageIndex(idx)}
              className="relative flex-shrink-0 w-20 h-24 overflow-hidden"
            >
              <Image
                src={imageUrl}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                loading="lazy"
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Wishlist Button - Fixed for both mobile/desktop */}
      <button
        type="button"
        onClick={onToggleWishlist}
        className="fixed top-20 md:top-24 right-4 md:right-8 lg:right-16 p-3 rounded-full bg-white shadow-lg z-40 hover:scale-110 transition-transform"
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={`w-5 h-5 ${
            isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-900'
          }`}
        />
      </button>

      {isFullscreenOpen && (
        <ProductGalleryFullscreen
          isOpen={isFullscreenOpen}
          images={optimizedGallery}
          productName={productName}
          currentIndex={currentImageIndex}
          onIndexChange={setActiveImageIndex}
          onClose={() => setIsFullscreenOpen(false)}
        />
      )}
    </>
  )
}
