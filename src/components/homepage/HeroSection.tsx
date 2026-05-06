'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface HeroSlide {
  id: string
  headline: string
  subtitle: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  textPosition?: 'left' | 'center' | 'right'
}

interface HeroSectionProps {
  slides?: HeroSlide[]
}

const defaultSlides: HeroSlide[] = [
  {
    id: '1',
    headline: 'Spring Streetwear Collection',
    subtitle: 'New oversized styles just dropped',
    ctaText: 'Shop Now',
    ctaLink: '/shop',
    imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&h=800&fit=crop&q=80',
    textPosition: 'left'
  },
  {
    id: '2',
    headline: 'Premium Quality Essentials',
    subtitle: 'Elevate your everyday wardrobe',
    ctaText: 'Discover More',
    ctaLink: '/shop?collection=essentials',
    imageUrl: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=1920&h=800&fit=crop&q=80',
    textPosition: 'center'
  },
  {
    id: '3',
    headline: 'End of Season Sale',
    subtitle: 'Up to 50% off selected styles',
    ctaText: 'Shop Sale',
    ctaLink: '/shop?sale=true',
    imageUrl: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=1920&h=800&fit=crop&q=80',
    textPosition: 'right'
  }
]

export default function HeroSection({ slides = defaultSlides }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
  }

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setIsAutoPlaying(false)
  }

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
  }

  const getTextPositionClasses = (position?: string) => {
    switch (position) {
      case 'left':
        return 'items-start text-left'
      case 'right':
        return 'items-end text-right'
      case 'center':
      default:
        return 'items-center text-center'
    }
  }

  return (
    <section className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden bg-neutral-100">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`
            absolute inset-0 transition-opacity duration-700 ease-in-out
            ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}
          `}
        >
          {/* Background Image */}
          <Image
            src={slide.imageUrl}
            alt={slide.headline}
            fill
            priority={index === 0}
            className="object-cover"
            quality={90}
            sizes="100vw"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Content */}
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
            <div className={`flex flex-col justify-center ${getTextPositionClasses(slide.textPosition)} max-w-2xl z-20`}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
                {slide.headline}
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow-md">
                {slide.subtitle}
              </p>
              <div>
                <Link
                  href={slide.ctaLink}
                  className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  {slide.ctaText}
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows (only show if more than 1 slide) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/80 hover:bg-white transition-all shadow-lg"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-black" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/80 hover:bg-white transition-all shadow-lg"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-black" />
          </button>
        </>
      )}

      {/* Dots Indicator (only show if more than 1 slide) */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/50 hover:bg-white/75'
                }
              `}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
