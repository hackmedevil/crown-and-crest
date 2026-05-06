'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, ShoppingBag, TrendingUp, CreditCard, Eye, EyeOff } from 'lucide-react'

type CustomerDetail = {
    id: string
    displayName: string
    email: string | null
    phoneNumber: string | null
    joinDate: string | null
    ordersCount: number
    totalSpent: number
    avgOrderValue: number
    lastOrderDate: string | null
    addresses: Array<{
        label: string
        fullName: string | null
        addressLine1: string | null
        addressLine2: string | null
        city: string | null
        state: string | null
        pincode: string | null
        country: string | null
    }>
    recentOrders: Array<{
        id: string
        createdAt: string
        status: string
        amount: number
        currency: string
    }>
}

function formatDate(value: string | null) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

function formatStatusLabel(status: string) {
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function statusBadgeClass(status: string) {
    switch (status) {
        case 'DELIVERED':
        case 'SHIPPED':
        case 'OUT_FOR_DELIVERY':
            return 'bg-green-100 text-green-700'
        case 'FAILED':
        case 'CANCELLED':
        case 'RTO_IN_PROGRESS':
            return 'bg-red-100 text-red-700'
        case 'NEEDS_REVIEW':
            return 'bg-yellow-100 text-yellow-700'
        default:
            return 'bg-gray-100 text-gray-700'
    }
}

function maskPhone(phone: string) {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return phone
    const visibleCount = Math.min(4, digits.length)
    const maskedDigits = '*'.repeat(Math.max(0, digits.length - visibleCount)) + digits.slice(-visibleCount)
    let index = 0
    return phone.replace(/\d/g, () => maskedDigits[index++] || '*')
}

export default function CustomerDetailClient({ customer }: { customer: CustomerDetail }) {
    const [isPhoneVisible, setIsPhoneVisible] = useState(false)

    const phoneLabel = useMemo(() => {
        if (!customer.phoneNumber) return null
        return isPhoneVisible ? customer.phoneNumber : maskPhone(customer.phoneNumber)
    }, [customer.phoneNumber, isPhoneVisible])

    return (
        <div className="min-h-screen pb-20 animate-fade-in space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/customers"
                        className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{customer.displayName}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                Active Customer
                            </span>
                            <span>•</span>
                            <span>Customer since {formatDate(customer.joinDate)}</span>
                        </div>
                    </div>
                </div>
                <button className="text-sm font-semibold text-gray-500 hover:text-gray-900">
                    Edit Customer
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <ShoppingBag className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Orders</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{customer.ordersCount}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Spent</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">₹{customer.totalSpent.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Avg Order Value</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">₹{customer.avgOrderValue.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Recent Orders</h3>
                            <Link href="/admin/orders" className="text-sm font-semibold text-primary hover:underline">View all</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Order</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {customer.recentOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 font-semibold text-gray-900 group-hover:text-primary transition-colors">
                                                #{order.id.slice(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{formatDate(order.createdAt)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(order.status)}`}>
                                                    {formatStatusLabel(order.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 font-medium text-right">
                                                {order.currency} {order.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-900">Contact Information</h3>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Mail className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {customer.email || 'No email on file'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-4 h-4 text-gray-400 mt-1" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-gray-900">
                                            {phoneLabel || 'No phone on file'}
                                        </p>
                                        {customer.phoneNumber && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPhoneVisible((prev) => !prev)}
                                                className="p-1 rounded-md border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                                                aria-label={isPhoneVisible ? 'Hide phone number' : 'Show phone number'}
                                            >
                                                {isPhoneVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">Registered num.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Default Address</h3>
                            <button className="text-xs font-semibold text-primary hover:underline">Manage</button>
                        </div>
                        {customer.addresses.length === 0 ? (
                            <p className="text-sm text-gray-500">No address on file</p>
                        ) : (
                            customer.addresses.map((addr) => (
                                <div key={addr.label} className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                                    <div className="text-sm text-gray-600 leading-relaxed">
                                        <p className="font-medium text-gray-900">{addr.fullName || customer.displayName}</p>
                                        {addr.addressLine1 && <p>{addr.addressLine1}</p>}
                                        {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                                        {(addr.city || addr.state || addr.pincode) && (
                                            <p>
                                                {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                        {addr.country && <p>{addr.country}</p>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-gray-900">Marketing</h3>
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 block"></span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Subscribed</p>
                                <p className="text-xs text-gray-500">Users subscribed to email marketing.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
