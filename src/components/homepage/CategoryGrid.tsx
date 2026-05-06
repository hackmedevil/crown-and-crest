import Image from 'next/image'
import Link from 'next/link'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image_url?: string | null
  product_count?: number
}

interface CategoryGridProps {
  categories: Category[]
  title?: string
}

export default function CategoryGrid({ 
  categories, 
  title = "Shop by Category" 
}: CategoryGridProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {title}
          </h2>
          <p className="text-lg text-gray-600">
            Discover your perfect style
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group relative overflow-hidden rounded-lg aspect-square bg-neutral-100 hover:shadow-xl transition-all duration-300"
            >
              {/* Category Image */}
              {category.image_url ? (
                <Image
                  src={category.image_url}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300" />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Category Info */}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <h3 className="text-white font-bold text-lg md:text-xl mb-1 drop-shadow-lg">
                  {category.name}
                </h3>
                {category.product_count !== undefined && (
                  <p className="text-white/90 text-sm drop-shadow">
                    {category.product_count} items
                  </p>
                )}
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
