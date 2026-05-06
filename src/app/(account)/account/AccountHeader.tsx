'use client'

import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

type AccountHeaderProps = {
  logoUrl?: string | null
  storeName?: string
}

export default function AccountHeader({ logoUrl, storeName }: AccountHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-[1400px] flex w-full items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex shrink-0 items-center">
          <Link href="/" className="flex items-center group" aria-label="Home">
            <span className="inline-flex h-10 md:h-12 items-center transition-transform group-hover:scale-[1.02]">
              <BrandLogo
                logoUrl={logoUrl}
                storeName={storeName}
                size="default"
                width={160}
                height={48}
              />
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-5 sm:gap-6 text-sm font-semibold">
          <Link href="/account/wishlist" className="hidden sm:block text-gray-500 hover:text-black transition-colors">
            Wishlist
          </Link>
          <Link href="/cart" className="hidden sm:block text-gray-500 hover:text-black transition-colors">
            Cart
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold tracking-wide text-white hover:bg-black hover:shadow-md transition-all active:scale-95"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </header>
  )
}
