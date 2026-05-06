'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Bell,
  Eye,
  Heart,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Package,
  LogOut,
  RefreshCcw,
  ChevronRight
} from 'lucide-react'
import type { AccountOverviewData } from '@/lib/account/types'

type AccountClientProps = {
  overview: AccountOverviewData
}

export default function AccountClient({ overview }: AccountClientProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState('')

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)

  const stats = [
    { label: 'Total Orders', value: overview.stats.totalOrders.toLocaleString('en-IN') },
    { label: 'Total Saved', value: formatCurrency(overview.stats.totalSaved) },
    { label: 'Active Offers', value: overview.stats.activeOffers.toLocaleString('en-IN') },
    { label: 'Wallet Balance', value: formatCurrency(overview.stats.walletBalance) },
  ]

  const activeOrders = overview.activeOrders
  const wishlistItems = overview.wishlist
  const recentlyViewed = overview.recentlyViewed

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      setError('')

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      router.push('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to logout'
      setError(message)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <section className="bg-white rounded-3xl p-8 lg:p-10 shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-gray-100 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full translate-x-1/3 -translate-y-1/3 opacity-50 blur-3xl pointer-events-none"></div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Account Overview</p>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
            Hello, {overview.profile.name}
          </h1>
          
          <div className="flex items-center gap-4 pt-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-xl shadow-lg ring-4 ring-white relative overflow-hidden">
              {overview.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overview.profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                overview.profile.name.charAt(0).toUpperCase()
              )}
            </div>
            <Link href="/account/profile" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors flex items-center gap-1.5 group">
              Edit Profile <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </div>

        <div className="w-full lg:max-w-[320px] bg-gray-50 rounded-2xl p-6 relative z-10 border border-gray-100/80">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500 tracking-wider mb-3">
            <span>Quick Access</span>
          </div>
          <p className="text-sm text-gray-600">
            Manage your orders, wishlist, recently viewed products, and saved addresses.
          </p>
          <div className="mt-5 pt-5 border-t border-gray-200/60">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/account/orders"
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-900 transition hover:bg-gray-100"
              >
                View Orders
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/account/addresses"
                className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-900 transition hover:bg-gray-100"
              >
                Manage Addresses
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-[0.03] group-hover:opacity-[0.05] transition-opacity bg-gray-900`}></div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 relative z-10">{stat.label}</p>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight relative z-10">{stat.value}</p>
          </div>
        ))}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-red-500" />
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (Orders) */}
        <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Active Orders</h2>
                        <p className="text-sm text-gray-500 mt-1">Real-time status of your recent purchases.</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                    </div>
                </div>

                {activeOrders.length > 0 ? (
                <div className="space-y-4">
                    {activeOrders.map((order) => (
                    <div key={order.id} className="group flex flex-col gap-5 rounded-2xl border border-gray-100 bg-gray-50/50 p-5 sm:flex-row sm:items-center sm:justify-between hover:bg-white hover:shadow-md hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden text-gray-300 group-hover:scale-105 transition-transform">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div>
                                {order.productSlug ? (
                                  <Link href={`/product/${order.productSlug}`} className="text-sm font-bold text-gray-900 tracking-tight hover:text-black hover:underline underline-offset-2">
                                    {order.productName}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-bold text-gray-900 tracking-tight">{order.productName}</p>
                                )}
                                {order.itemsCount > 1 ? (
                                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">+{order.itemsCount - 1} more item{order.itemsCount > 2 ? 's' : ''}</p>
                                ) : null}
                                <p className="text-xs text-gray-500 mt-1 font-medium">ETA: {order.eta || 'Calculating...'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center rounded-lg bg-white border border-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-700 shadow-sm">
                                {order.status}
                            </span>
                            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>
                            <Link href={`/account/orders#${order.id}`} className="text-xs font-semibold text-gray-600 hover:text-black transition-colors">
                                Details
                            </Link>
                            {order.productSlug ? (
                              <Link href={`/product/${order.productSlug}`} className="text-xs font-semibold text-gray-600 hover:text-black transition-colors">
                                View Product
                              </Link>
                            ) : null}
                            <Link
                              href={`/account/orders#${order.id}`}
                                className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-black hover:shadow-md ml-auto sm:ml-2"
                            >
                                Track
                            </Link>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <ShoppingBag className="w-6 h-6 text-gray-300" />
                    </div>
                    <p className="text-base font-bold text-gray-900 tracking-tight">Ready for your next drop?</p>
                    <p className="text-sm text-gray-500 mt-1 mb-6 max-w-[250px]">You don&apos;t have any active orders right now. Let&apos;s find something new.</p>
                    <Link
                        href="/shop"
                        className="inline-flex items-center rounded-xl bg-gray-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-black hover:shadow-lg active:scale-95"
                    >
                        Shop Collection
                    </Link>
                </div>
                )}
            </section>

            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Recently Viewed</h2>
                        <p className="text-sm text-gray-500 mt-1">Pick up right where you left off.</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
                
                {recentlyViewed.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-2 px-2">
                    {recentlyViewed.map((item) => (
                    <Link key={item.id} href={`/product/${item.slug}`} className="min-w-[180px] group cursor-pointer block">
                      <div className="aspect-[4/5] rounded-2xl bg-gray-100 overflow-hidden relative mb-3">
                            {item.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><Package className="text-gray-300" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <span className="bg-white text-gray-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                  View Product
                                </span>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate tracking-tight">{item.name}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{formatCurrency(item.price)}</p>
                          </Link>
                    ))}
                </div>
                ) : (
                <div className="text-center py-8 text-sm text-gray-500">
                    Browse the store to build your viewing history.
                </div>
                )}
            </section>
        </div>

        {/* Right Column (Wishlist & Shortcuts) */}
        <div className="space-y-8">
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-gray-900 flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-500 fill-red-500/10" /> 
                            Wishlist
                        </h2>
                    </div>
                    <Link href="/account/wishlist" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors">
                        View All
                    </Link>
                </div>

                {wishlistItems.length > 0 ? (
                <div className="space-y-4">
                    {wishlistItems.slice(0, 3).map((item) => (
                    <Link key={item.id} href={`/product/${item.slug}`} className="flex flex-col sm:flex-row gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                        <div className="h-20 w-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                            {item.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-900 truncate leading-snug">{item.name}</p>
                                <p className="text-xs font-semibold text-gray-500 mt-1">{formatCurrency(item.price)}</p>
                            </div>
                            <button className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-black self-start transition-colors mt-2">
                              View Product
                            </button>
                        </div>
                        </Link>
                    ))}
                </div>
                ) : (
                <div className="text-center py-6 text-sm text-gray-500 mt-4 rounded-xl bg-gray-50">
                    Your wishlist is ready for the next drop.
                </div>
                )}
            </section>

            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold tracking-tight text-gray-900 mb-6 flex items-center gap-2">
                    Shortcuts
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { href: '/account/addresses', icon: MapPin, label: 'Addresses' },
                    { href: '/account/wishlist', icon: Heart, label: 'Wishlist' },
                        { href: '/account/returns', icon: RefreshCcw, label: 'Returns' },
                        { href: '/account/notifications', icon: Bell, label: 'Alerts' }
                    ].map((link) => (
                        <Link 
                            key={link.label}
                            href={link.href} 
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-gray-50 hover:bg-gray-900 hover:text-white transition-all text-gray-600 group"
                        >
                            <link.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">{link.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Logout Button */}
            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors"
            >
                <LogOut className="w-4 h-4" />
                {isLoggingOut ? 'Signing out securely...' : 'Sign Out of Account'}
            </button>
        </div>
      </div>
      
      {/* Scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}
