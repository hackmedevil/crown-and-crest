import Image from 'next/image'
import Link from 'next/link'
import type { GridProduct } from '@/types/grid'
import Skeleton from '@/components/ui/Skeleton'

interface ProductModulesProps {
  trendingProducts: GridProduct[]
  bestSellers: GridProduct[]
  newArrivals: GridProduct[]
  fallbackProducts: GridProduct[]
}

interface ModuleConfig {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  products: GridProduct[]
}

function assignUniqueProducts(
  usedIds: Set<string>,
  primary: GridProduct[],
  ...fallbackSets: GridProduct[][]
): GridProduct[] {
  const selected: GridProduct[] = []

  const pickFromSet = (set: GridProduct[]) => {
    for (const product of set) {
      if (usedIds.has(product.id)) {
        continue
      }

      usedIds.add(product.id)
      selected.push(product)

      if (selected.length === 4) {
        return true
      }
    }

    return false
  }

  if (pickFromSet(primary)) {
    return selected
  }

  for (const fallbackSet of fallbackSets) {
    if (pickFromSet(fallbackSet)) {
      return selected
    }
  }

  return selected
}

function GalleryProductCard({
  product,
}: {
  product: GridProduct
}) {
  const productHref = product.slug ? `/product/${product.slug}` : '/shop'
  const basePrice = Number(product.base_price || 0)
  const mrp = Number(product.mrp || 0)
  const discount = mrp > basePrice
    ? Math.round(((mrp - basePrice) / mrp) * 100)
    : 0

  return (
    <Link
      href={productHref}
      className="group block"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="pt-2">
        <p className="line-clamp-2 text-sm font-semibold text-neutral-900">
          {product.name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-sm font-bold text-neutral-900">Rs.{basePrice.toLocaleString('en-IN')}</span>
          {mrp > basePrice && (
            <span className="text-xs text-neutral-500 line-through">Rs.{mrp.toLocaleString('en-IN')}</span>
          )}
        </div>
        {discount > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">{discount}% off</p>
        )}
      </div>
    </Link>
  )
}

function ProductModuleCard(config: ModuleConfig) {
  const rows = config.products.slice(0, 4)

  return (
    <article className="rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 sm:text-xl">
            {config.title}
          </h2>
          <p className="mt-1 text-xs text-neutral-600 sm:text-sm">
            {config.subtitle}
          </p>
        </div>
        <Link
          href={config.ctaHref}
          className="shrink-0 text-xs font-semibold text-neutral-700 transition-colors hover:text-black"
        >
          {config.ctaLabel}
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {rows.map((product) => (
            <GalleryProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="group block">
              <Skeleton />
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default function ProductModules({
  trendingProducts,
  bestSellers,
  newArrivals,
  fallbackProducts,
}: ProductModulesProps) {
  const usedIds = new Set<string>()
  const rankedPicks = assignUniqueProducts(usedIds, trendingProducts, bestSellers, newArrivals, fallbackProducts)
  const topSelling = assignUniqueProducts(usedIds, bestSellers, trendingProducts, newArrivals, fallbackProducts)
  const freshArrivals = assignUniqueProducts(usedIds, newArrivals, trendingProducts, bestSellers, fallbackProducts)

  const modules: ModuleConfig[] = [
    {
      title: 'Top Ranked Picks',
      subtitle: 'Highest ranked products right now.',
      ctaLabel: 'View all',
      ctaHref: '/shop?sort=trending',
      products: rankedPicks,
    },
    {
      title: 'Top Selling',
      subtitle: 'Best selling products this week.',
      ctaLabel: 'View all',
      ctaHref: '/shop?sort=bestseller',
      products: topSelling,
    },
    {
      title: 'New Arrivals',
      subtitle: 'Latest arrivals from recent drops.',
      ctaLabel: 'Explore',
      ctaHref: '/shop?new=true',
      products: freshArrivals,
    },
  ]

  return (
    <section className="bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Shop Ranked Collections
          </h1>
          <Link
            href="/shop"
            className="text-sm font-semibold text-neutral-700 hover:text-black"
          >
            Browse all products
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {modules.map((module) => (
            <ProductModuleCard key={module.title} {...module} />
          ))}
        </div>
      </div>
    </section>
  )
}
