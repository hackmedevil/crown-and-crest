'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    LayoutTemplate,
    Package,
    Users,
    ShoppingCart,
    CreditCard,
    Truck,
    RotateCcw,
    Plug,
    Settings,
    Search,
    Bell,
    Menu,
    X,
    Home,
    Bookmark,
    Grid2x2,
    Ruler,
    Palette,
    MessageCircle,
    TicketPercent,
    ShieldCheck
} from 'lucide-react'

type AdminNotification = {
    id: string
    type: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    is_read: boolean
    created_at: string
}

type AdminSearchResult = {
    id: string
    title: string
    category: string | null
    base_price: number
    image_url: string | null
}

type AdminLayoutProps = {
    children: React.ReactNode
    currentUser?: { uid: string } | null
    notifications?: {
        notifications: AdminNotification[]
        count: number
    }
}

// Categorized navigation structure
const navigationGroups = [
    {
        name: 'Overview',
        items: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Homepage Content', href: '/admin/homepage', icon: LayoutTemplate },
        ]
    },
    {
        name: 'Catalog',
        items: [
            { name: 'Products', href: '/admin/products', icon: Package },
            { name: 'Categories', href: '/admin/categories', icon: Bookmark },
            { name: 'Collections', href: '/admin/collections', icon: Grid2x2 },
            { name: 'Colors', href: '/admin/colors', icon: Palette },
            { name: 'Size Guides', href: '/admin/size-guides', icon: Ruler },
            { name: 'Wash Instructions', href: '/admin/wash-instructions', icon: Ruler },
        ]
    },
    {
        name: 'Sales & Marketing',
        items: [
            { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
            { name: 'Returns', href: '/admin/returns', icon: RotateCcw },
            { name: 'Review Moderation', href: '/admin/reviews', icon: ShieldCheck },
            { name: 'Customers', href: '/admin/customers', icon: Users },
            { name: 'WhatsApp Inbox', href: '/admin/whatsapp-inbox', icon: MessageCircle },
            { name: 'Coupons', href: '/admin/coupons', icon: TicketPercent },
            { name: 'Shipping', href: '/admin/shipping', icon: Truck },
            { name: 'Payments', href: '/admin/payments', icon: CreditCard },
        ]
    },
    {
        name: 'System',
        items: [
            { name: 'Notifications', href: '/admin/notifications', icon: MessageCircle },
            { name: 'Integrations', href: '/admin/services', icon: Plug },
            { name: 'Store Settings', href: '/admin/settings', icon: Settings },
            { name: 'Advanced Mgmt', href: '/admin/management', icon: Settings },
        ]
    }
]

export default function AdminLayout({ children, currentUser, notifications }: AdminLayoutProps) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isNotificationOpen, setIsNotificationOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([])
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

    const unreadCount = notifications?.count || 0
    const notificationItems = notifications?.notifications || []

    const userLabel = useMemo(() => {
        if (!currentUser?.uid) return 'Admin'
        return `UID ${currentUser.uid.slice(0, 6)}`
    }, [currentUser?.uid])

    const userInitial = useMemo(() => {
        if (!currentUser?.uid) return 'A'
        return currentUser.uid.slice(0, 1).toUpperCase()
    }, [currentUser?.uid])

    const isNavActive = (href: string) => {
        if (!pathname) return false
        if (href === '/admin') return pathname === '/admin'
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    // Effect for handling search
    useEffect(() => {
        const trimmed = searchQuery.trim()
        if (trimmed.length < 2) {
            setSearchResults([])
            setSearchLoading(false)
            setSearchError(null)
            return
        }

        setSearchLoading(true)
        setSearchError(null)

        const handle = setTimeout(async () => {
            try {
                const response = await fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`)
                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data?.error || 'Search failed')
                }
                setSearchResults(data.results || [])
                setSearchOpen(true)
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Search failed'
                setSearchError(message)
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 300)

        return () => clearTimeout(handle)
    }, [searchQuery])

    // Close mobile menu when pathname changes
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

    // Render Navigation Links Component
    const renderNavGroups = () => (
        <div className="flex-1 w-full space-y-6">
            {navigationGroups.map((group) => (
                <div key={group.name} className="px-3">
                    <h3 className="px-3 mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                        {group.name}
                    </h3>
                    <ul className="space-y-1">
                        {group.items.map((item) => {
                            const isActive = isNavActive(item.href)
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                                            isActive
                                                ? 'bg-primary text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} strokeWidth={isActive ? 2.5 : 2} />
                                        {item.name}
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
        <div className="min-h-screen bg-[#F9FAFB]">
            {/* Mobile Overlay Sidebar */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div 
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
                        onClick={() => setMobileMenuOpen(false)} 
                    />
                    <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl transition-transform border-r">
                        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-bold tracking-tight text-gray-900">Crown & Crest</span>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex-1 py-6 overflow-y-auto bg-white custom-scrollbar">
                            {renderNavGroups()}
                        </nav>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-primary rounded-xl transition-colors border border-transparent hover:border-gray-200 hover:shadow-sm">
                                <Home className="w-5 h-5" />
                                Back to Client Store
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar - Always Visible on lg+ screens */}
            <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-72 lg:flex lg:flex-col bg-white border-r shadow-sm">
                <div className="flex flex-col flex-1 h-full">
                    {/* Logo Area */}
                    <div className="flex items-center h-20 px-8 border-b border-gray-100/80 bg-white sticky top-0 z-10">
                        <Link href="/admin" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 group-hover:bg-primary/20">
                                <Image
                                    src="/assets/admin/logo-icon.png"
                                    alt="Crown & Crest"
                                    width={24}
                                    height={24}
                                    className="object-contain drop-shadow-sm"
                                    onError={(e) => {
                                        // Fallback if image missing
                                        e.currentTarget.style.display = 'none'
                                    }}
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-base font-bold tracking-tight text-gray-900 group-hover:text-primary transition-colors">Crown & Crest</span>
                                <span className="text-[11px] font-medium text-gray-500 tracking-wider uppercase">Admin Portal</span>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Area */}
                    <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                        {renderNavGroups()}
                    </nav>

                    {/* Bottom Utility Area */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-white hover:text-primary rounded-xl border border-transparent hover:border-gray-200 shadow-sm transition-all group"
                        >
                            <Home className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                            Storefront
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:pl-72 flex flex-col min-h-screen">
                {/* Top Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between h-20 px-4 sm:px-6 lg:px-8">
                        {/* Mobile left side */}
                        <div className="flex items-center lg:hidden">
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <span className="font-bold text-lg text-gray-900">Admin</span>
                        </div>

                        {/* Search Bar - Center/Leftish */}
                        <div className="hidden sm:flex flex-1 max-w-2xl relative lg:ml-0">
                            <div
                                className="relative w-full group"
                                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                            >
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search global commands, products, orders..."
                                    value={searchQuery}
                                    onChange={(event) => {
                                        setSearchQuery(event.target.value)
                                        setSearchOpen(true)
                                    }}
                                    onFocus={() => setSearchOpen(true)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all text-sm shadow-sm"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-sans font-medium text-gray-400 bg-white border border-gray-200 rounded-md">⌘</kbd>
                                    <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-sans font-medium text-gray-400 bg-white border border-gray-200 rounded-md">K</kbd>
                                </div>

                                {/* Floating Search Results */}
                                {searchOpen && (searchQuery.trim().length >= 2 || searchLoading || searchError) && (
                                    <div
                                        className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 ring-1 ring-black/5"
                                        onMouseDown={(event) => event.preventDefault()} // Keep open if clicking inside
                                    >
                                        <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/50 text-[11px] font-semibold tracking-wider text-gray-500 uppercase flex justify-between items-center">
                                            <span>Search Results</span>
                                            {searchLoading && <span className="animate-pulse text-primary">Searching...</span>}
                                        </div>
                                        <div className="max-h-96 overflow-y-auto p-2">
                                            {!searchLoading && searchError && (
                                                <div className="p-4 text-sm text-red-500 bg-red-50 rounded-xl">{searchError}</div>
                                            )}
                                            {!searchLoading && !searchError && searchResults.length === 0 && (
                                                <div className="p-8 text-center text-sm text-gray-500">
                                                    No results found for &quot;{searchQuery}&quot;
                                                </div>
                                            )}
                                            {!searchLoading && !searchError && searchResults.map((result) => (
                                                <Link
                                                    key={result.id}
                                                    href={`/admin/products/${result.id}`}
                                                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                                                >
                                                    <div className="w-12 h-12 rounded-lg bg-white border shadow-sm overflow-hidden flex-shrink-0">
                                                        {result.image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={result.image_url} alt={result.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-gray-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate tracking-tight">{result.title}</p>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">{result.category || 'Uncategorized'}</p>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-900 tracking-tight bg-gray-50 px-3 py-1.5 rounded-lg border">
                                                        ₹{result.base_price.toLocaleString()}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Actions Menu */}
                        <div className="flex items-center gap-4 sm:gap-6 ml-auto lg:ml-auto">
                            {/* Notification Bell */}
                            <div className="relative">
                                <button
                                    className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    onClick={() => setIsNotificationOpen((prev) => !prev)}
                                    aria-label="View notifications"
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                                    )}
                                </button>
                                
                                {/* Notifications Dropdown */}
                                {isNotificationOpen && (
                                    <>
                                        {/* Invisible backdrop for clicking outside on mobile primarily */}
                                        <div className="fixed inset-0 z-40 hidden sm:block md:hidden" onClick={() => setIsNotificationOpen(false)} />
                                        
                                        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(380px,calc(100vw-2rem))] bg-white border rounded-3xl shadow-2xl overflow-hidden z-50 ring-1 ring-black/5 transform origin-top-right transition-all">
                                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 rounded-full">
                                                        {unreadCount} New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
                                                {notificationItems.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                            <Bell className="w-5 h-5 text-gray-300" />
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-900">You&apos;re all caught up!</p>
                                                        <p className="text-xs text-gray-500 mt-1">Check back later for new alters.</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-gray-50">
                                                        {notificationItems.map((item) => (
                                                            <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                                                                <div className="flex gap-3">
                                                                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!item.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900 leading-snug group-hover:text-primary transition-colors">{item.message}</p>
                                                                        <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                                                                            {new Date(item.created_at).toLocaleString(undefined, {
                                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 bg-gray-50 border-t border-gray-100">
                                                <Link href="/admin/notifications" onClick={() => setIsNotificationOpen(false)} className="block w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-200/50">
                                                    View All Activity
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
                            
                            {/* Profile Menu Toggle */}
                            <div className="flex items-center gap-3 pl-1 sm:pl-0">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-bold tracking-tight text-gray-900 leading-none">{userLabel}</p>
                                    <p className="text-[11px] font-medium text-gray-500 uppercase mt-1 tracking-wider">Administrator</p>
                                </div>
                                <button className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white hover:ring-gray-100 transition-all">
                                    {userInitial}
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Render Box */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            
            {/* Styles for scrollbar */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.3);
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.5);
                }
            `}</style>
        </div>
    )
}
