'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  ShoppingBag,
  RefreshCcw,
  Heart,
  RotateCw,
  MapPin,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  User,
  Ruler,
  BookOpen,
  Menu,
  X,
  LifeBuoy
} from 'lucide-react'
import type { AccountMetrics } from '@/lib/account/types'

const accountGroups = [
  {
    name: 'Dashboard',
    items: [
      { href: '/account', label: 'Overview', icon: LayoutGrid },
      { href: '/account/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
    ]
  },
  {
    name: 'Profile & Size',
    items: [
      { href: '/account/profile', label: 'Profile Settings', icon: User },
      { href: '/account/size-profile', label: 'Size Profile', icon: Ruler },
      { href: '/account/sizebook', label: 'Sizebook', icon: BookOpen },
    ]
  },
  {
    name: 'Benefits & Support',
    items: [
      { href: '/account/returns', label: 'Returns', icon: RefreshCcw },
      { href: '/account/reviews', label: 'My Reviews', icon: MessageSquare },
      { href: '/account/support', label: 'Customer Support', icon: LifeBuoy },
    ]
  },
  {
    name: 'Preferences',
    items: [
      { href: '/account/addresses', label: 'Addresses', icon: MapPin },
      { href: '/account/settings#payments', label: 'Payment Methods', icon: CreditCard },
      { href: '/account/notifications', label: 'Notifications', icon: Bell },
      { href: '/account/settings', label: 'Account Settings', icon: Settings },
    ]
  }
]

type AccountSidebarProps = {
  metrics?: AccountMetrics | null
}

export default function AccountSidebar({ metrics }: AccountSidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/account') return pathname === '/account'
    // For hash URLs, we only compare the path part
    const pathPart = href.split('#')[0]
    return pathname === pathPart || pathname.startsWith(`${pathPart}/`)
  }

  const unreadNotifications = (metrics?.activeOrderCount ?? 0) > 0

  const renderSidebarContent = () => (
    <div className="space-y-8">
      {accountGroups.map((group) => (
        <div key={group.name} className="space-y-3">
          <h3 className="px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            {group.name}
          </h3>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href)
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`h-[18px] w-[18px] ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-900'}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    
                    {/* Dynamic Badges */}
                    {item.label === 'Orders' && metrics?.ordersCount ? (
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {metrics.ordersCount}
                      </span>
                    ) : null}
                    
                    {item.label === 'Notifications' && unreadNotifications ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900">Account Menu</h2>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 max-w-[calc(100%-2rem)] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-900">Navigation</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {renderSidebarContent()}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block sticky top-[104px] w-full bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
        <div className="mb-6 pb-6 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Account Area</p>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 mt-1">Your Dashboard</h2>
        </div>
        {renderSidebarContent()}
      </aside>
    </>
  )
}
