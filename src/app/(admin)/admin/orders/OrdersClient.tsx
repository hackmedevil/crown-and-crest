'use client'

import { useEffect, useMemo, useState } from 'react'
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Download,
    Package,
    ShoppingCart,
    Truck,
} from 'lucide-react'
import Link from 'next/link'
import OrderFilters from '@/components/admin/OrderFilters'
import BulkActions from '@/components/admin/BulkActions'
import toast from 'react-hot-toast'

interface FilterState {
    payment_method?: string
    risk_tier?: string
    status?: string
    courier?: string
    pincode?: string
    date_from?: string
    date_to?: string
}

interface Order {
    id: string
    created_at: string
    status: string
    amount: number
    currency: string
    payment_method?: string
    is_cod?: boolean
    razorpay_risk_tier?: string
    courier?: string
    courier_name?: string
    tracking_id?: string
    customer_name?: string
    customer_phone?: string
    shipping_address?: Record<string, unknown>
    estimated_delivery_date?: string
}

function statusChip(status: string) {
    if (['PAID', 'SENT_TO_PROVIDER', 'IN_PRODUCTION', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    }

    if (['CANCELLED', 'REFUNDED'].includes(status)) {
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    }

    if (['CREATED'].includes(status)) {
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    }

    return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
}

function riskChip(risk?: string) {
    if (risk === 'LOW') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    if (risk === 'MEDIUM') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    if (risk === 'HIGH') return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
}

function paymentChip(order: Order) {
    if (order.is_cod || order.payment_method === 'COD') {
        return 'bg-violet-50 text-violet-700 ring-1 ring-violet-200'
    }
    return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
}

export default function OrdersClient() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [filters, setFilters] = useState<FilterState>({})
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        fetchOrders()
    }, [filters, page])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const filterParams = Object.entries(filters).reduce((acc, [key, value]) => {
                if (value) acc[key] = value
                return acc
            }, {} as Record<string, string>)

            const params = new URLSearchParams({ ...filterParams, page: String(page), limit: '50' })
            const response = await fetch(`/api/admin/orders?${params}`)
            const data = await response.json()

            if (response.ok) {
                setOrders(data.orders)
                setTotalPages(data.totalPages)
            } else {
                toast.error('Failed to fetch orders')
            }
        } catch {
            toast.error('Error fetching orders')
        } finally {
            setLoading(false)
        }
    }

    const handleFilter = (newFilters: FilterState) => {
        setFilters(newFilters)
        setPage(1)
        setSelectedIds([])
    }

    const handleReset = () => {
        setFilters({})
        setPage(1)
        setSelectedIds([])
    }

    const handleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(orders.map((o) => o.id))
        }
    }

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleBulkUpdate = async (newStatus: string) => {
        const response = await fetch('/api/admin/orders/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_ids: selectedIds, new_status: newStatus }),
        })

        if (response.ok) {
            setSelectedIds([])
            await fetchOrders()
        } else {
            throw new Error('Bulk update failed')
        }
    }

    const handleExport = async () => {
        const filterParams = Object.entries(filters).reduce((acc, [key, value]) => {
            if (value) acc[key] = value
            return acc
        }, {} as Record<string, string>)

        const params = new URLSearchParams(filterParams)
        window.location.href = `/api/admin/orders/export?${params}`
    }

    const metrics = useMemo(() => {
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
        const openOrders = orders.filter((order) => !['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(order.status)).length
        const highRisk = orders.filter((order) => order.razorpay_risk_tier === 'HIGH').length
        const inTransit = orders.filter((order) => ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status)).length

        return { totalRevenue, openOrders, highRisk, inTransit }
    }, [orders])

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Orders Command Center</h1>
                        <p className="mt-1 text-sm text-slate-300">
                            {orders.length} orders on this page • Page {page} of {totalPages}
                        </p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue (page)</p>
                        <Package className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">INR {metrics.totalRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Orders</p>
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{metrics.openOrders}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">High Risk</p>
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-rose-700">{metrics.highRisk}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In Transit</p>
                        <Truck className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{metrics.inTransit}</p>
                </div>
            </div>

            <OrderFilters onApply={handleFilter} onReset={handleReset} />

            <BulkActions
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds([])}
                onStatusUpdate={handleBulkUpdate}
                onExport={handleExport}
            />

            {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                    <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                    <p className="text-slate-600">No orders found</p>
                    <p className="mt-1 text-sm text-slate-400">Orders will appear here when customers make purchases.</p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === orders.length && orders.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-slate-300"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Order</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Customer</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Risk</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Logistics</th>
                                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total</th>
                                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {orders.map((order) => {
                                        const pincode = (() => {
                                            try {
                                                const addr = typeof order.shipping_address === 'string'
                                                    ? JSON.parse(order.shipping_address)
                                                    : order.shipping_address
                                                return addr?.pincode || '-'
                                            } catch {
                                                return '-'
                                            }
                                        })()

                                        return (
                                            <tr key={order.id} className="transition hover:bg-slate-50">
                                                <td className="px-4 py-4 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(order.id)}
                                                        onChange={() => handleSelectOne(order.id)}
                                                        className="rounded border-slate-300"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <div className="font-mono text-xs text-slate-900">#{order.id.slice(0, 10)}</div>
                                                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-900">
                                                    <div>{order.customer_name || 'Unknown customer'}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{order.customer_phone || '-'}</div>
                                                    <div className="mt-1 text-xs text-slate-500">PIN {pincode}</div>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentChip(order)}`}>
                                                        {order.payment_method || (order.is_cod ? 'COD' : 'PREPAID')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${riskChip(order.razorpay_risk_tier)}`}>
                                                        {order.razorpay_risk_tier || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 align-top">
                                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip(order.status)}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm text-slate-700">
                                                    <div>{order.courier || order.courier_name || '-'}</div>
                                                    <div className="mt-1 text-xs text-slate-500">{order.tracking_id || '-'}</div>
                                                </td>
                                                <td className="px-4 py-4 align-top text-sm font-semibold text-slate-900">
                                                    {order.currency} {order.amount.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-4 text-right align-top">
                                                    <Link
                                                        href={`/admin/orders/${order.id}`}
                                                        className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                                    >
                                                        View Details
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-3 lg:hidden">
                        {orders.map((order) => {
                            const pincode = (() => {
                                try {
                                    const addr = typeof order.shipping_address === 'string'
                                        ? JSON.parse(order.shipping_address)
                                        : order.shipping_address
                                    return addr?.pincode || '-'
                                } catch {
                                    return '-'
                                }
                            })()

                            return (
                                <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono text-xs text-slate-900">#{order.id.slice(0, 10)}</p>
                                            <p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusChip(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Customer</p>
                                            <p className="mt-1 text-slate-900">{order.customer_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                                            <p className="mt-1 font-semibold text-slate-900">{order.currency} {order.amount.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Payment</p>
                                            <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${paymentChip(order)}`}>
                                                {order.payment_method || (order.is_cod ? 'COD' : 'PREPAID')}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Pincode</p>
                                            <p className="mt-1 text-slate-900">{pincode}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <Link
                                            href={`/admin/orders/${order.id}`}
                                            className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                        >
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Previous
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
