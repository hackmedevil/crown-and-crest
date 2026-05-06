import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import LoginModal from '@/components/auth/LoginModal'
import { GA4Tracker } from '@/components/GA4Tracker'

// Manrope font is loaded via Google Fonts CDN in globals.css

export const metadata: Metadata = {
  title: "Crown and Crest – Premium Products",
  description: "Discover our curated collection of fine goods. Premium products for discerning customers.",
  keywords: ["products", "shop", "premium", "fine goods"],
  creator: "Crown and Crest",
  openGraph: {
    type: "website",
    url: "https://crownandcrest.com",
    title: "Crown and Crest – Premium Products",
    description: "Discover our curated collection of fine goods.",
    siteName: "Crown and Crest",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crown and Crest – Premium Products",
    description: "Discover our curated collection of fine goods.",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

/**
 * Root Layout
 * 
 * Minimal layout with Inter font only
 * Clean design system from mobile mockups
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Performance: Preconnect to critical domains */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    send_page_view: false
                  });
                `,
              }}
            />
          </>
        )}
        
        {/* Cloudinary Upload Widget */}
        <script src="https://upload-widget.cloudinary.com/global/all.js" type="text/javascript" async></script>
      </head>
      <body className="font-sans bg-background-light text-primary antialiased" suppressHydrationWarning>
        <Suspense fallback={null}>
          <AuthProvider>
            <CartProvider>
              <GA4Tracker />
              {children}
              <LoginModal />
            </CartProvider>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}