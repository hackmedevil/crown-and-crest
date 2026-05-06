'use client'

import { type Order, type OrderItem, type OrderStatus } from '@/types/order'
import Link from 'next/link'
import { Package, ShoppingBag, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface OrdersClientProps {
  orders: Order[]
  items: OrderItem[]
}

export default function OrdersClient({ orders, items }: OrdersClientProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Group items by order_id
  const itemsByOrderId = items.reduce(
    (acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = []
      acc[item.order_id].push(item)
      return acc
    },
    {} as Record<string, OrderItem[]>
  )

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  useEffect(() => {
    const applyHashTarget = () => {
      const hashId = window.location.hash.replace('#', '')
      if (!hashId) return
      setExpandedOrderId(hashId)
      document.getElementById(`order-${hashId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    applyHashTarget()
    window.addEventListener('hashchange', applyHashTarget)

    return () => {
      window.removeEventListener('hashchange', applyHashTarget)
    }
  }, [])

  const statusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'CREATED': return 'Created'
      case 'PAID': return 'Paid'
      case 'SENT_TO_PROVIDER': return 'Sent to Provider'
      case 'IN_PRODUCTION': return 'In Production'
      case 'CANCELLED': return 'Cancelled'
      case 'SHIPPED': return 'Shipped'
      case 'OUT_FOR_DELIVERY': return 'Out for Delivery'
      case 'DELIVERED': return 'Delivered'
      case 'REFUNDED': return 'Refunded'
      default: return status
    }
  }

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <section className="bg-white rounded-3xl p-8 lg:p-10 border border-gray-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full translate-x-1/3 -translate-y-1/3 opacity-50 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end justify-between">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Order History</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 leading-tight">Your Orders</h1>
            <p className="text-sm text-gray-500 max-w-md">Track the status of recent purchases and view full receipt details below.</p>
          </div>
          <div className="bg-gray-50 rounded-2xl px-6 py-4 flex flex-col items-center justify-center border border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
          </div>
        </div>
      </section>

      {/* Orders List */}
      <section className="space-y-6">
        {orders.length > 0 ? (
          orders.map((order) => {
            const orderItems = itemsByOrderId[order.id] || []
            const primaryItem = orderItems[0]
            const isExpanded = expandedOrderId === order.id
            const shippingAddr =
              typeof order.shipping_address === 'string'
                ? order.shipping_address
                : JSON.stringify(order.shipping_address)

            return (
              <div
                key={order.id}
                id={`order-${order.id}`}
                className={`bg-white rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-gray-200 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
              >
                {/* Order Summary Strip */}
                <div 
                  onClick={() => toggleOrderDetails(order.id)}
                  className="p-6 lg:p-8 cursor-pointer group flex flex-col gap-6 lg:flex-row lg:items-center justify-between"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    {/* Status Icon Indicator */}
                    <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 text-gray-900 group-hover:scale-105 transition-transform">
                      {order.status === 'DELIVERED' ? (
                        <Package className="h-6 w-6" />
                      ) : (
                        <ShoppingBag className="h-6 w-6" />
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900 tracking-tight">{primaryItem?.product_name || 'Order Summary'}</span>
                        <span className="inline-flex py-1 px-2.5 rounded-lg bg-gray-50 border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-700">
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      {orderItems.length > 1 ? (
                        <p className="text-xs text-gray-500 font-medium">+{orderItems.length - 1} more item{orderItems.length > 2 ? 's' : ''}</p>
                      ) : null}
                      <p className="text-sm text-gray-500 font-medium tracking-tight">
                        Placed on {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-8 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-gray-100">
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Order Total</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(order.amount, order.currency)}</p>
                    </div>
                    <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-gray-100 group-hover:text-black transition-colors shrink-0">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-6 lg:px-8 pb-8 pt-2 border-t border-gray-100 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mt-6">
                      
                      {/* Left: Items Breakdown */}
                      <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                          Purchased Items <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-[10px]">{orderItems.length}</span>
                        </h3>
                        <div className="space-y-4">
                          {orderItems.map((item) => (
                            <Link
                              key={item.id}
                              href={item.product_slug ? `/product/${item.product_slug}` : '/shop'}
                              className="flex gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-colors"
                            >
                              <div className="h-20 w-16 bg-white rounded-xl overflow-hidden shrink-0 relative border border-gray-100 shadow-[0_2px_8px_rgb(0,0,0,0.04)]">
                                {item.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag className="h-5 w-5" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pr-2 pb-1 pt-1 flex flex-col justify-between">
                                <div>
                                  <p className="text-sm font-bold text-gray-900 tracking-tight leading-snug break-words">{item.product_name}</p>
                                  {item.variant_label && <p className="text-[10px] uppercase font-bold text-gray-500 mt-1 tracking-wider">{item.variant_label}</p>}
                                </div>
                                <div className="flex justify-between items-end">
                                  <p className="text-xs font-bold text-gray-400">Qty: {item.quantity}</p>
                                  <p className="text-sm font-bold text-gray-900">{formatCurrency(item.subtotal, order.currency)}</p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Right: Order Info & Tracking */}
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Delivery Details</h3>
                          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                            <div className="flex justify-between items-start text-sm">
                              <span className="text-gray-500 font-medium">ETA / Delivery</span>
                              <span className="font-bold text-gray-900 text-right">
                                {order.status === 'DELIVERED' 
                                  ? formatDate(order.actual_delivery_date || order.created_at)
                                  : (order.estimated_delivery_date ? formatDate(order.estimated_delivery_date) : 'Preparing for Dispatch')}
                              </span>
                            </div>
                            <div className="flex justify-between items-start text-sm">
                              <span className="text-gray-500 font-medium">Courier</span>
                              <span className="font-bold text-gray-900 text-right">{order.courier_name || 'Processing...'}</span>
                            </div>
                            {order.tracking_id && (
                              <div className="flex justify-between items-start text-sm">
                                <span className="text-gray-500 font-medium">Tracking ID</span>
                                <span className="font-bold text-gray-900 text-right">{order.tracking_id}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Shipping Address</h3>
                          <div className="p-5 rounded-2xl border border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed break-words">{shippingAddr || 'No address saved.'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-gray-500">History Empty</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
              You haven&apos;t placed any orders yet.
            </h2>
            <Link 
              href="/shop"
              className="mt-8 inline-flex items-center justify-center gap-2 bg-gray-900 px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white hover:bg-black transition-colors shadow-lg active:scale-95"
            >
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
