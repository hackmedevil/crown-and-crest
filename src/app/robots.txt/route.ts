/**
 * robots.txt generator
 * Route to: /robots.txt
 */

export async function GET() {
  const robots = `# Crown and Crest - SEO-friendly robots.txt
# Generated dynamically for environment-aware crawling

# Allow all crawlers on public pages
User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /account
Disallow: /cart
Disallow: /api

# Specific bot rules
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Sitemap location
Sitemap: https://crownandcrest.com/sitemap.xml
`

  return new Response(robots, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
    },
  })
}
