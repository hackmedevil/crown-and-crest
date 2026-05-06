'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ProductGalleryFullscreenProps {
  isOpen: boolean
  images: string[]
  productName: string
  currentIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function distance(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }): number {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

const DEFAULT_ZOOM_STATE = {
  isHoverZoom: false,
  hoverOrigin: { x: 50, y: 50 },
  scale: 1,
  panOffset: { x: 0, y: 0 },
}

export default function ProductGalleryFullscreen({
  isOpen,
  images,
  productName,
  currentIndex,
  onIndexChange,
  onClose,
}: ProductGalleryFullscreenProps) {
  const imageAreaRef = useRef<HTMLDivElement | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number; ts: number } | null>(null)
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)

  const [zoomState, setZoomState] = useState({
    index: -1,
    ...DEFAULT_ZOOM_STATE,
  })

  const imageCount = images.length

  const canNavigate = imageCount > 1

  const normalizedIndex = useMemo(() => {
    if (imageCount === 0) return 0
    return clamp(currentIndex, 0, imageCount - 1)
  }, [currentIndex, imageCount])

  const activeZoom =
    zoomState.index === normalizedIndex
      ? zoomState
      : { index: normalizedIndex, ...DEFAULT_ZOOM_STATE }

  const isHoverZoom = activeZoom.isHoverZoom
  const hoverOrigin = activeZoom.hoverOrigin
  const scale = activeZoom.scale
  const panOffset = activeZoom.panOffset

  const updateZoom = useCallback(
    (
      patch: Partial<{
        isHoverZoom: boolean
        hoverOrigin: { x: number; y: number }
        scale: number
        panOffset: { x: number; y: number }
      }>
    ) => {
      setZoomState(prev => {
        const base = prev.index === normalizedIndex ? prev : { index: normalizedIndex, ...DEFAULT_ZOOM_STATE }
        return { ...base, ...patch, index: normalizedIndex }
      })
    },
    [normalizedIndex]
  )

  const goNext = useCallback(() => {
    if (!canNavigate) return
    onIndexChange((normalizedIndex + 1) % imageCount)
  }, [canNavigate, onIndexChange, normalizedIndex, imageCount])

  const goPrev = useCallback(() => {
    if (!canNavigate) return
    onIndexChange((normalizedIndex - 1 + imageCount) % imageCount)
  }, [canNavigate, onIndexChange, normalizedIndex, imageCount])

  useEffect(() => {
    if (!isOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowRight') {
        goNext()
      } else if (event.key === 'ArrowLeft') {
        goPrev()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose, goNext, goPrev])

  useEffect(() => {
    if (!isOpen || imageCount === 0) return

    const current = images[normalizedIndex]
    const next = images[(normalizedIndex + 1) % imageCount]
    const prev = images[(normalizedIndex - 1 + imageCount) % imageCount]

    ;[current, next, prev].forEach(src => {
      if (!src) return
      const img = new window.Image()
      img.decoding = 'async'
      img.src = src
    })
  }, [isOpen, normalizedIndex, images, imageCount])

  if (!isOpen || imageCount === 0) {
    return null
  }

  const currentImage = images[normalizedIndex]
  const displayScale = isHoverZoom ? 2 : scale

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen product gallery"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {canNavigate && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div className="flex h-full w-full flex-col items-center justify-center px-4 pb-24 pt-16">
        <div
          ref={imageAreaRef}
          className="relative h-full w-full max-h-[78vh] max-w-[1200px] overflow-hidden rounded-lg"
          style={{ touchAction: 'none' }}
          onMouseEnter={() => updateZoom({ isHoverZoom: true })}
          onMouseLeave={() => {
            updateZoom({ isHoverZoom: false, hoverOrigin: { x: 50, y: 50 } })
          }}
          onMouseMove={(event) => {
            if (!imageAreaRef.current) return
            const rect = imageAreaRef.current.getBoundingClientRect()
            const x = ((event.clientX - rect.left) / rect.width) * 100
            const y = ((event.clientY - rect.top) / rect.height) * 100
            updateZoom({ hoverOrigin: { x: clamp(x, 0, 100), y: clamp(y, 0, 100) } })
          }}
          onTouchStart={(event) => {
            if (event.touches.length === 2) {
              pinchStartRef.current = {
                distance: distance(event.touches[0], event.touches[1]),
                scale,
              }
              panStartRef.current = null
              swipeStartRef.current = null
              return
            }

            if (event.touches.length === 1) {
              const t = event.touches[0]
              if (scale > 1) {
                panStartRef.current = { x: t.clientX - panOffset.x, y: t.clientY - panOffset.y }
              } else {
                swipeStartRef.current = { x: t.clientX, y: t.clientY, ts: Date.now() }
              }
            }
          }}
          onTouchMove={(event) => {
            if (event.touches.length === 2 && pinchStartRef.current) {
              const nextDistance = distance(event.touches[0], event.touches[1])
              const nextScale = (nextDistance / pinchStartRef.current.distance) * pinchStartRef.current.scale
              updateZoom({ scale: clamp(nextScale, 1, 4) })
              return
            }

            if (event.touches.length === 1 && panStartRef.current && scale > 1) {
              const t = event.touches[0]
              updateZoom({
                panOffset: {
                  x: t.clientX - panStartRef.current.x,
                  y: t.clientY - panStartRef.current.y,
                },
              })
            }
          }}
          onTouchEnd={() => {
            pinchStartRef.current = null
            panStartRef.current = null

            const swipeStart = swipeStartRef.current
            swipeStartRef.current = null

            if (!swipeStart || scale > 1) return

            const elapsed = Date.now() - swipeStart.ts
            if (elapsed > 600) return

            // Use last known offset from one-finger movement approximation via pan offset not set here.
            // Rely on move-less end by comparing touch start with no move unavailable; keep simple by skipping.
          }}
          onTouchCancel={() => {
            pinchStartRef.current = null
            panStartRef.current = null
            swipeStartRef.current = null
          }}
        >
          {/* Simple swipe area with pointer events for mobile one-finger navigation */}
          <div
            className="absolute inset-0 z-10"
            onPointerDown={(event) => {
              if (event.pointerType !== 'touch' || scale > 1) return
              swipeStartRef.current = { x: event.clientX, y: event.clientY, ts: Date.now() }
            }}
            onPointerUp={(event) => {
              if (event.pointerType !== 'touch') return
              const swipeStart = swipeStartRef.current
              swipeStartRef.current = null
              if (!swipeStart || scale > 1) return

              const dx = event.clientX - swipeStart.x
              const dy = event.clientY - swipeStart.y
              const dt = Date.now() - swipeStart.ts

              if (dt < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) goNext()
                else goPrev()
              }
            }}
          />

          <Image
            src={currentImage}
            alt={`${productName} fullscreen image ${normalizedIndex + 1} of ${imageCount}`}
            fill
            priority={false}
            loading="eager"
            sizes="100vw"
            className="object-contain select-none"
            draggable={false}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${displayScale})`,
              transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
              transition: isHoverZoom ? 'transform 80ms linear' : 'transform 150ms ease-out',
              cursor: 'zoom-in',
            }}
          />
        </div>

        {/* Thumbnail strip */}
        <div className="mt-4 flex w-full max-w-[1200px] gap-2 overflow-x-auto pb-1">
          {images.map((imageUrl, idx) => (
            <button
              key={`${imageUrl}-${idx}`}
              type="button"
              onClick={() => onIndexChange(idx)}
              className={`relative h-16 w-12 shrink-0 overflow-hidden rounded border-2 ${
                idx === normalizedIndex ? 'border-white' : 'border-white/30'
              }`}
              aria-label={`Open image ${idx + 1}`}
            >
              <Image
                src={imageUrl}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                sizes="48px"
                loading="lazy"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
