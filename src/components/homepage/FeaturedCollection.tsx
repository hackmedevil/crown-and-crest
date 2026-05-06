import Image from 'next/image'
import Link from 'next/link'

interface FeaturedCollectionProps {
  title?: string
  description?: string
  ctaText?: string
  ctaLink?: string
  imageUrl?: string
}

export default function FeaturedCollection({
  title = "Oversized Streetwear Collection",
  description = "Embrace comfort and style with our latest oversized collection. Premium fabrics, modern fits, and everyday versatility.",
  ctaText = "Shop Collection",
  ctaLink = "/shop?collection=oversized",
  imageUrl = "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=1600&h=600&fit=crop&q=80"
}: FeaturedCollectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-neutral-900 h-[400px] md:h-[500px]">
          {/* Background Image */}
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover opacity-60"
            sizes="(max-width: 768px) 100vw, 1280px"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

          {/* Content */}
          <div className="relative h-full flex items-center">
            <div className="max-w-2xl px-8 md:px-16">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {title}
              </h2>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
                {description}
              </p>
              <Link
                href={ctaLink}
                className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-lg hover:bg-neutral-100 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                {ctaText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
