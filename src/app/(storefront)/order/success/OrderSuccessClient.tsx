'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Copy, Calendar, MapPin, ArrowRight, ShoppingBag, Home, Truck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/useToast'
import type { OrderWithItems } from '@/types/order'

interface OrderData {
    id: string
    created_at: string
    status: string
    total_amount: number
    amount: number
    payment_method?: string
    razorpay_order_id?: string
    razorpay_payment_id?: string
    shipping_address?: Record<string, unknown>
    customer_phone?: string
}

interface OrderItem {
    product_id?: string
    quantity: number
    product_name?: string
    variant_label?: string
    unit_price?: number
    price_at_purchase?: number
    variants?: {
        size?: string | null
        color?: string | null
        price_override?: number | null
        products?: {
            name?: string
            slug?: string
            base_price?: number
            image_url?: string
        }
    }
}

export default function OrderSuccessClient({ order, items }: { order: OrderData, items: OrderItem[] }) {
    const { showSuccess } = useToast()

    useEffect(() => {
        const lastSearchQuery = localStorage.getItem('last_search_query')
        if (!lastSearchQuery) return

        const trackPurchases = async () => {
            await Promise.all(
                items
                    .filter(item => item.product_id)
                    .map(item =>
                        fetch('/api/search/track', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: lastSearchQuery,
                                productId: item.product_id,
                                interactionType: 'purchase'
                            })
                        }).catch(() => null)
                    )
            )
        }

        trackPurchases().catch(() => null)
    }, [items])

    const deliveryDate = new Date(new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000)

    const copyOrderId = () => {
        navigator.clipboard.writeText(order.id)
        showSuccess('Order ID copied to clipboard')
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* LEFT COLUMN: Success Message & Actions */}
                    <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 lg:sticky lg:top-24">

                        {/* Animation */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200"
                        >
                            <motion.div
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <Check className="w-12 h-12 text-white stroke-[3]" />
                            </motion.div>
                        </motion.div>

                        <div className="space-y-4">
                            <h1 className="text-4xl font-display text-gray-900 tracking-tight">Payment Successful</h1>
                            <p className="text-lg text-gray-500 max-w-md">
                                Thank you for your purchase! Your order has been confirmed and will be shipped shortly.
                            </p>
                        </div>

                        {/* Order ID Badge */}
                        <div
                            onClick={copyOrderId}
                            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 cursor-pointer hover:border-black transition-colors group"
                        >
                            <span>Order ID: <span className="text-gray-900 font-bold">#{order.id.slice(0, 8).toUpperCase()}</span></span>
                            <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-black" />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md lg:max-w-none pt-4">
                            <Link
                                href="/account/orders" // Assuming this exists or will exist
                                className="flex-1 bg-black text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" /> View Order
                            </Link>
                            <Link
                                href="/shop"
                                className="flex-1 bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" /> Continue Shopping
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Order Details Cards */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Delivery Details Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Truck className="w-24 h-24 rotate-[-15deg]" />
                            </div>

                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Delivery Details</h2>

                            <div className="space-y-4 relative z-10">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg mb-1">{(order.shipping_address as { fullName?: string })?.fullName || 'Guest User'}</h3>
                                    <p className="text-gray-500 leading-relaxed">
                                        {(order.shipping_address as { addressLine1?: string })?.addressLine1}<br />
                                        {(order.shipping_address as { city?: string; state?: string; pincode?: string })?.city}, {(order.shipping_address as { state?: string })?.state} - {(order.shipping_address as { pincode?: string })?.pincode}
                                    </p>
                                    {order.customer_phone && (
                                        <p className="text-gray-500 mt-1">Phone: +91 {order.customer_phone}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-xl">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Estimated Delivery</p>
                                        <p className="text-sm font-bold text-indigo-900">
                                            {deliveryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Order Summary Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                        >
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Order Summary</h2>

                            <div className="space-y-6">
                                {items.map((item, idx: number) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="relative w-16 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                            <Image
                                                src={
                                                    item.variants?.products?.image_url ||
                                                    (Array.isArray(item.variants?.products) ? item.variants.products[0]?.image_url : null) ||
                                                    '/placeholder.png'
                                                }
                                                alt={item.product_name || 'Product'}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{item.product_name}</h4>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                                                {/* Variant label might be null in DB snapshot, handle gracefully */}
                                                {item.variant_label ? (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{item.variant_label}</span>
                                                ) : (
                                                    <span>Qty: {item.quantity}</span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 mt-2">₹{(item.unit_price || item.price_at_purchase || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 mt-6 pt-6 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Payment Method</span>
                                    <span className="text-sm font-medium text-gray-900">Online (Razorpay)</span>
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span className="text-gray-900">Total Paid</span>
                                    <span className="text-gray-900">₹{order.amount.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </div>
        </div>
    )
}
