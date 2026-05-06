import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { DollarSign, ShoppingCart, Users, TrendingUp, Plus, ArrowRight, Package, Sparkles, LayoutTemplate } from 'lucide-react'

async function getDashboardData() {
    const [productsCount, ordersCount, customersCount] = await Promise.all([
        supabaseServer.from('products').select('*', { count: 'exact', head: true }),
        supabaseServer.from('orders').select('*', { count: 'exact', head: true }),
        supabaseServer.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    return {
        products: productsCount.count || 0,
        orders: ordersCount.count || 0,
        customers: customersCount.count || 0,
    }
}

export default async function AdminDashboard() {
    const stats = await getDashboardData()

    const statCards = [
        {
            name: 'Total Sales',
            value: '₹0',
            change: '+0%',
            trend: 'neutral',
            icon: DollarSign,
            color: 'bg-emerald-500/10 text-emerald-600',
            border: 'border-emerald-100',
        },
        {
            name: 'Total Orders',
            value: stats.orders.toString(),
            change: '+0%',
            trend: 'neutral',
            icon: ShoppingCart,
            color: 'bg-blue-500/10 text-blue-600',
            border: 'border-blue-100',
        },
        {
            name: 'Total Customers',
            value: stats.customers.toString(),
            change: '+0%',
            trend: 'neutral',
            icon: Users,
            color: 'bg-purple-500/10 text-purple-600',
            border: 'border-purple-100',
        },
        {
            name: 'Active Products',
            value: stats.products.toString(),
            change: '+0%',
            trend: 'neutral',
            icon: Package,
            color: 'bg-orange-500/10 text-orange-600',
            border: 'border-orange-100',
        },
    ]

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Overview of your store's performance today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <Link
                        href="/admin/products/new"
                        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Add Product
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div
                        key={stat.name}
                        className={`bg-white rounded-2xl p-6 border ${stat.border} shadow-sm hover:shadow-md transition-all duration-200 group`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                                <h3 className="text-2xl font-bold text-gray-900 mt-2 tracking-tight group-hover:scale-105 transition-transform origin-left">
                                    {stat.value}
                                </h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.color} transition-colors`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-xs font-medium bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                                {stat.change} vs last month
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
                            <p className="text-sm text-gray-500">Latest transactions from your store</p>
                        </div>
                        <Link href="/admin/orders" className="text-sm font-medium text-primary hover:text-gray-600 flex items-center gap-1 transition-colors">
                            View All <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">Answer the first order</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">
                            No orders have been placed yet. Share your store link to get started!
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <Link
                                href="/admin/products/new"
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 text-sm">Add Product</p>
                                        <p className="text-xs text-gray-500">Create a new listing</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                href="/admin/settings"
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 text-sm">Store Settings</p>
                                        <p className="text-xs text-gray-500">Manage configuration</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                href="/admin/homepage"
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <LayoutTemplate className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 text-sm">Homepage</p>
                                        <p className="text-xs text-gray-500">Manage storefront sections</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link
                                href="/admin/customers"
                                className="group flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all duration-200"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-900 text-sm">Customers</p>
                                        <p className="text-xs text-gray-500">View user base</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
