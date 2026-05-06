'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface GalleryImage {
  url: string
  alt: string
}

interface ProductGalleryProps {
  images: GalleryImage[]
  productName: string
  variantImages?: GalleryImage[]
  cloudinaryBase?: string
}

export default function ProductGallery({
  images,
  productName,
  variantImages = [],
  cloudinaryBase = 'https://res.cloudinary.com/crown-crest',
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 })

  // Use variant images if available, otherwise use product images
  const displayImages = variantImages && variantImages.length > 0 ? variantImages : images

  const handlePrevious = useCallback(() => {
    setSelectedIndex(prev => (prev === 0 ? displayImages.length - 1 : prev - 1))
  }, [displayImages.length])

  const handleNext = useCallback(() => {
    setSelectedIndex(prev => (prev === displayImages.length - 1 ? 0 : prev + 1))
  }, [displayImages.length])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setZoomPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    })
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    // Swipe detection: if drag is horizontal, go to next/previous
    const deltaX = touch.clientX

    if (deltaX < window.innerWidth / 2) {
      handleNext()
    } else {
      handlePrevious()
    }
  }

  const currentImage = displayImages[selectedIndex]
  if (!currentImage) return <div className="aspect-square bg-gray-200 rounded-lg" />

  // Optimize Cloudinary URL for different sizes
  const optimizeCloudinaryUrl = (url: string, width = 800) => {
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`)
    }
    return url
  }

  return (
    <div className="space-y-4">
      {/* Main Image with Zoom */}
      <div
        className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
      >
        <Image
          src={optimizeCloudinaryUrl(currentImage.url, 800)}
          alt={currentImage.alt || productName}
          fill
          className={`object-contain transition-transform duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
          style={
            isZoomed
              ? {
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }
              : {}
          }
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Zoom Button */}
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Toggle zoom"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>

        {/* Navigation Arrows - Desktop */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded text-sm">
          {selectedIndex + 1} / {displayImages.length}
        </div>
      </div>

      {/* Thumbnail Row */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-amber-600'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <Image
                src={optimizeCloudinaryUrl(image.url, 100)}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Info */}
      <p className="text-xs text-gray-500 text-center">
        ℹ️ Hover to zoom | Drag on mobile to swipe
      </p>
    </div>
  )
}
