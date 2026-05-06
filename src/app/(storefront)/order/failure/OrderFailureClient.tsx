'use client'

import Link from 'next/link'
import { AlertCircle, Copy, RefreshCw, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/useToast'
import { useRouter } from 'next/navigation'

export default function OrderFailureClient({ orderdata }: { orderdata: Record<string, unknown> }) {
    const { showSuccess } = useToast()
    const router = useRouter()
    const { order, genericError } = orderdata as { order?: { id: string; amount: number }; genericError?: boolean }

    // Handle generic error case (unauthenticated or order not found)
    if (genericError || !order) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md mx-auto text-center space-y-6">
                    <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-display text-gray-900">Payment Failed</h1>
                    <p className="text-gray-500">
                        We couldn't process your payment. Please try again or contact support if you need assistance.
                    </p>
                    <div className="flex flex-col gap-4 pt-4">
                        <Link
                            href="/shop"
                            className="w-full bg-black text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-900 transition-all"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const copyOrderId = () => {
        navigator.clipboard.writeText(order.id)
        showSuccess('Order ID copied to clipboard')
    }

    const handleRetry = () => {
        // Retry via cart flow (Razorpay Magic Checkout)
        // Note: This starts a NEW order flow. The failed one remains as failed.
        router.push('/cart')
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[60vh]">

                    {/* LEFT COLUMN: Error Message & Actions */}
                    <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-8">

                        {/* Animation */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4"
                        >
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </motion.div>

                        <div className="space-y-4">
                            <h1 className="text-4xl font-display text-gray-900 tracking-tight">Payment Incomplete</h1>
                            <p className="text-lg text-gray-500 max-w-md">
                                Your order is not confirmed yet. Please retry the payment to complete your purchase.
                            </p>
                        </div>

                        {/* Order ID Badge */}
                        <div
                            onClick={copyOrderId}
                            className="bg-white px-6 py-4 rounded-xl border border-gray-200 flex items-center gap-4 w-full max-w-md cursor-pointer hover:border-black transition-colors group shadow-sm"
                        >
                            <div className="flex-1 text-left">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                                <p className="text-lg font-mono font-bold text-gray-900">#{order.id.slice(0, 12).toUpperCase()}</p>
                            </div>
                            <Copy className="w-5 h-5 text-gray-400 group-hover:text-black" />
                        </div>

                        {/* Total Amount */}
                        <div className="w-full max-w-md bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                            <span className="text-sm text-gray-500">Total Amount</span>
                            <span className="text-xl font-bold text-gray-900">₹{order.amount.toLocaleString('en-IN')}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-4 w-full max-w-md pt-4">
                            <button
                                onClick={handleRetry}
                                className="w-full bg-black text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                            >
                                <RefreshCw className="w-4 h-4" /> Retry Payment
                            </button>
                            <Link
                                href="/shop"
                                className="w-full bg-white text-gray-900 border border-gray-200 px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" /> Continue Shopping
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Illustration or Help (Simplified for Failure) */}
                    <div className="hidden lg:flex lg:col-span-5 justify-center opacity-50">
                        <div className="relative w-full aspect-square max-w-md">
                            {/* Abstract decorative element */}
                            <div className="absolute inset-0 bg-red-50 rounded-full blur-3xl opacity-50"></div>
                            <div className="relative z-10 p-8 border-2 border-dashed border-red-100 rounded-2xl h-full flex items-center justify-center text-center">
                                <div>
                                    <p className="font-display text-2xl text-red-300 mb-2">Need Help?</p>
                                    <p className="text-gray-400">If money was deducted, it will be refunded automatically within 5-7 business days.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
