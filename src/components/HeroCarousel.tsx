'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Slide {
  id: number
  headline: string
  subheadline: string
  cta: {
    text: string
    href: string
  }
  bgColor: string
  highlight: string
  image?: string
}

const defaultSlides: Slide[] = [
  {
    id: 1,
    headline: 'Perfect Fit. Every Time.',
    subheadline: 'Premium shirts tailored to your measurements. Save your Size Book once.',
    cta: { text: 'Shop Now', href: '/shop' },
    bgColor: 'from-blue-50 to-blue-100',
    highlight: 'Blue Collection',
  },
  {
    id: 2,
    headline: 'New Arrivals Just Dropped',
    subheadline: 'Explore our latest collection of premium fabrics and timeless designs.',
    cta: { text: 'View New Arrivals', href: '/new' },
    bgColor: 'from-emerald-50 to-emerald-100',
    highlight: 'Limited Edition',
  },
  {
    id: 3,
    headline: 'Flat 30% Off - This Weekend Only',
    subheadline: 'Use code WEEKEND30 on all items. Free shipping included.',
    cta: { text: 'Shop Sale', href: '/sale' },
    bgColor: 'from-amber-50 to-amber-100',
    highlight: 'Flash Sale',
  },
  {
    id: 4,
    headline: 'Build Your Capsule Wardrobe',
    subheadline: 'Curated collections for every occasion. Mix, match, repeat.',
    cta: { text: 'Explore Collections', href: '/collections' },
    bgColor: 'from-purple-50 to-purple-100',
    highlight: 'Collections',
  },
]

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [carouselSlides, setCarouselSlides] = useState<Slide[]>(defaultSlides)

  useEffect(() => {
    // Load carousel from localStorage
    const savedCarousel = localStorage.getItem('admin_carousel_slides')
    if (savedCarousel) {
      try {
        const parsed = JSON.parse(savedCarousel)
        setCarouselSlides(parsed)
      } catch (err) {
        console.error('Failed to parse carousel data:', err)
      }
    }
  }, [])

  useEffect(() => {
    if (!isAutoPlay || carouselSlides.length === 0) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlay, carouselSlides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
    setIsAutoPlay(false)
    setTimeout(() => setIsAutoPlay(true), 10000)
  }

  if (carouselSlides.length === 0) return null

  const slide = carouselSlides[currentSlide]

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Carousel Container */}
      <div className="relative h-[400px] md:h-[500px] lg:h-[600px]">
        {/* Slides */}
        {carouselSlides.map((s, index) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Gradient or Image */}
            {s.image ? (
              <Image
                src={s.image}
                alt={s.headline}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === currentSlide}
                quality={85}
                loading={index === currentSlide ? 'eager' : 'lazy'}
              />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${s.bgColor}`} />
            )}

            {/* Content Overlay */}
            <div className="absolute inset-0 bg-black/30" />

            {/* Content */}
            <div className="relative h-full flex items-center justify-center">
              <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  {/* Left: Text Content */}
                  <div className="space-y-4 md:space-y-6">
                    {/* Highlight Badge */}
                    <div className="inline-block">
                      <span className="px-4 py-2 bg-white/80 text-gray-900 text-xs font-bold uppercase tracking-wider rounded-full">
                        {s.highlight}
                      </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                      {s.headline}
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-white leading-relaxed max-w-md drop-shadow-md">
                      {s.subheadline}
                    </p>

                    {/* CTA Button */}
                    <div className="pt-4">
                      <Link
                        href={s.cta.href}
                        className="inline-block px-8 py-4 bg-white text-gray-900 font-bold text-lg rounded-lg hover:bg-gray-100 transition-all duration-300 hover:shadow-lg"
                      >
                        {s.cta.text}
                      </Link>
                    </div>
                  </div>

                  {/* Right: Visual Element (if no image, show emoji) */}
                  {!s.image && (
                    <div className="hidden md:block">
                      <div className={`aspect-square rounded-2xl bg-white/20 opacity-50 flex items-center justify-center`}>
                        <div className="text-6xl">{'🎁'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white text-gray-900 rounded-full transition-all duration-200 hover:shadow-lg"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 hover:bg-white text-gray-900 rounded-full transition-all duration-200 hover:shadow-lg"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots Navigation */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentSlide
                  ? 'w-8 h-2 bg-white'
                  : 'w-2 h-2 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
