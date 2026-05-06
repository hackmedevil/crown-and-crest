import type { NextConfig } from "next";

const nextConfig = {
  // reactCompiler: true,

  // Increase body size limit for image uploads
  // Increase body size limit for image uploads
  experimental: {
     serverActions: {
       bodySizeLimit: '50mb', // Allow uploads up to 50MB
     },
  },

  /**
   * Image optimization for performance
   * - Cloudinary remote patterns for all media
   * - Auto-optimized delivery (q=auto, f=auto, dpr=auto)
   * - AVIF format support via auto format selection
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      }
    ],
    // Enable AVIF format for better compression
    formats: ['image/avif', 'image/webp'],
    // Allow SVG images from placehold.co
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  /**
   * Headers for performance and security
   */
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300',
          },
        ],
      },
    ]
  },
  // WooCommerce mock rewrites removed — legacy integration no longer needed
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
} satisfies NextConfig;

export default nextConfig;
