import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Dynamic sitemap generation
 * Lists all products and categories for search engines
 * Includes proper priority and change frequency
 * 
 * Route: /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all active products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (productsError) {
      console.error('Failed to fetch products for sitemap:', productsError)
      return getBaseSitemap()
    }

    // Fetch all active categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (categoriesError) {
      console.error('Failed to fetch categories for sitemap:', categoriesError)
      return getBaseSitemap()
    }

    const baseUrl = 'https://www.crowncrest.store'
    const sitemap: MetadataRoute.Sitemap = []

    // Add homepage
    sitemap.push({
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    })

    // Add shop page
    sitemap.push({
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    })

    // Add category pages
    if (categories) {
      categories.forEach(category => {
        sitemap.push({
          url: `${baseUrl}/shop?category=${category.slug}`,
          lastModified: new Date(category.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      })
    }

    // Add product pages
    if (products) {
      products.forEach(product => {
        sitemap.push({
          url: `${baseUrl}/product/${product.slug}`,
          lastModified: new Date(product.updated_at || product.created_at),
          changeFrequency: product.updated_at
            ? calculateChangeFrequency(new Date(product.updated_at))
            : 'weekly',
          priority: 0.7,
        })
      })
    }

    // Add static pages
    const staticPages = [
      { url: '/about', priority: 0.5 },
      { url: '/contact', priority: 0.5 },
      { url: '/shipping', priority: 0.4 },
      { url: '/returns', priority: 0.4 },
      { url: '/refund-policy', priority: 0.4 },
      { url: '/cancellation-policy', priority: 0.4 },
      { url: '/privacy', priority: 0.3 },
      { url: '/terms', priority: 0.3 },
      { url: '/cookies', priority: 0.3 },
      { url: '/faq', priority: 0.4 },
      { url: '/help', priority: 0.4 },
      { url: '/sizing-help', priority: 0.3 },
    ]

    staticPages.forEach(page => {
      sitemap.push({
        url: `${baseUrl}${page.url}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: page.priority,
      })
    })

    return sitemap
  } catch (error) {
    console.error('Sitemap generation failed:', error)
    return getBaseSitemap()
  }
}

/**
 * Get the most important pages as fallback
 */
function getBaseSitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.crowncrest.store'
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}

/**
 * Determine change frequency based on how recently product was updated
 */
function calculateChangeFrequency(
  lastModified: Date
): 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' {
  const now = new Date().getTime()
  const lastMod = lastModified.getTime()
  const diffDays = (now - lastMod) / (1000 * 60 * 60 * 24)

  if (diffDays < 1) return 'hourly'
  if (diffDays < 7) return 'daily'
  if (diffDays < 30) return 'weekly'
  return 'monthly'
}
