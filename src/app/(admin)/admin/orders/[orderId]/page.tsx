import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Package, User, CreditCard, Mail, MapPin, Calendar, Phone, CheckCircle, XCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import ShippingInfoCard from '@/components/admin/ShippingInfoCard'
import LifecyclePanel from './LifecyclePanel'

async function getOrderDetails(orderId: string) {
    // Fetch order with items
    const { data: order, error: orderError } = await supabaseServer
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

    if (orderError || !order) {
        return null
    }

    // Fetch order items with variant and product details
    const { data: items } = await supabaseServer
        .from('order_items')
        .select(`
            *,
            variants:variant_id (
                id,
                size,
                color,
                sku,
                products:product_id (
                    id,
                    name,
                    image_url
                )
            )
        `)
        .eq('order_id', orderId)

    // Fetch Firebase Auth user details
    let firebaseUser = null
    try {
        firebaseUser = await adminAuth.getUser(order.firebase_uid)
    } catch (error) {
        console.error('Failed to fetch Firebase user:', error)
    }

    return {
        order,
        items: items || [],
        firebaseUser: firebaseUser || null
    }
}

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
    const { orderId } = await params
    const data = await getOrderDetails(orderId)

    if (!data) {
        notFound()
    }

    const { order, items, firebaseUser } = data
    const orderAny = order as Record<string, any>

    const shippingAddressData = (() => {
        try {
            return typeof order.shipping_address === 'string'
                ? JSON.parse(order.shipping_address)
                : order.shipping_address
        } catch {
            return null
        }
    })() as Record<string, unknown> | null

    const gatewayNotes = (() => {
        try {
            return typeof order.gateway_notes === 'string'
                ? JSON.parse(order.gateway_notes)
                : order.gateway_notes
        } catch {
            return null
        }
    })() as Record<string, any> | null

    const paymentEntity = gatewayNotes?.payload?.payment?.entity || null
    const orderEntity = gatewayNotes?.payload?.order?.entity || null
    const gatewayCustomer = orderEntity?.customer_details || paymentEntity?.customer_details || null

    const gatewayPhone =
        gatewayCustomer?.contact ||
        paymentEntity?.contact ||
        orderEntity?.notes?.phone ||
        paymentEntity?.notes?.phone ||
        null

    const gatewayAddress =
        gatewayCustomer?.shipping_address ||
        orderEntity?.shipping_address ||
        null

    const addressSource = (shippingAddressData || gatewayAddress || {}) as Record<string, unknown>

    const resolvedShippingAddress = Object.keys(addressSource).length > 0
        ? {
            fullName:
                (typeof shippingAddressData?.fullName === 'string' && shippingAddressData.fullName) ||
                (typeof gatewayCustomer?.name === 'string' && gatewayCustomer.name) ||
                (typeof order.customer_name === 'string' && order.customer_name) ||
                '',
            addressLine1:
                (typeof shippingAddressData?.addressLine1 === 'string' && shippingAddressData.addressLine1) ||
                (typeof shippingAddressData?.line1 === 'string' && shippingAddressData.line1) ||
                (typeof gatewayAddress?.line1 === 'string' && gatewayAddress.line1) ||
                '',
            addressLine2:
                (typeof shippingAddressData?.addressLine2 === 'string' && shippingAddressData.addressLine2) ||
                (typeof shippingAddressData?.line2 === 'string' && shippingAddressData.line2) ||
                (typeof gatewayAddress?.line2 === 'string' && gatewayAddress.line2) ||
                '',
            city:
                (typeof shippingAddressData?.city === 'string' && shippingAddressData.city) ||
                (typeof gatewayAddress?.city === 'string' && gatewayAddress.city) ||
                '',
            state:
                (typeof shippingAddressData?.state === 'string' && shippingAddressData.state) ||
                (typeof gatewayAddress?.state === 'string' && gatewayAddress.state) ||
                '',
            pincode:
                (typeof shippingAddressData?.pincode === 'string' && shippingAddressData.pincode) ||
                (typeof shippingAddressData?.zipcode === 'string' && shippingAddressData.zipcode) ||
                (typeof shippingAddressData?.postal_code === 'string' && shippingAddressData.postal_code) ||
                (typeof gatewayAddress?.zipcode === 'string' && gatewayAddress.zipcode) ||
                (typeof gatewayAddress?.postal_code === 'string' && gatewayAddress.postal_code) ||
                '',
        }
        : null

    const resolvedCustomerName =
        firebaseUser?.displayName ||
        order.customer_name ||
        orderAny.shipping_name ||
        resolvedShippingAddress?.fullName ||
        gatewayCustomer?.name ||
        'Customer'

    const resolvedPhone =
        firebaseUser?.phoneNumber ||
        order.customer_phone ||
        orderAny.shipping_phone ||
        gatewayPhone ||
        null

    const internalNotes = Array.isArray(orderAny.internal_notes) ? orderAny.internal_notes : []
    const orderTimeline = Array.isArray(orderAny.order_timeline) ? orderAny.order_timeline : []

    // Calculate totals from items (with null safety)
    const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0)
    const total = order.amount || 0

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/orders"
                        className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${['PAID', 'SENT_TO_PROVIDER', 'IN_PRODUCTION', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) ? 'bg-green-100 text-green-700' :
                                ['CANCELLED', 'REFUNDED'].includes(order.status) ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                }`}>
                                {order.status}
                            </span>
                            {order.is_cod && (
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                                    COD
                                </span>
                            )}
                            {order.razorpay_risk_tier && (
                                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${order.razorpay_risk_tier === 'LOW' ? 'bg-green-100 text-green-700' :
                                    order.razorpay_risk_tier === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    Risk: {order.razorpay_risk_tier}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Order Items & Payment */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Package className="w-4 h-4 text-gray-500" /> Order Items ({items.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {items.map((item) => {
                                const variant = item.variants
                                const product = variant?.products

                                return (
                                    <div key={item.id} className="p-6 flex items-start gap-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 border border-gray-200 overflow-hidden">
                                            {product?.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                            ) : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{product?.name || 'Product'}</p>
                                            <p className="text-sm text-gray-500 truncate">
                                                {variant?.size && `Size: ${variant.size}`}
                                                {variant?.size && variant?.color && ' / '}
                                                {variant?.color && `Color: ${variant.color}`}
                                            </p>
                                            {variant?.sku && (
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                        SKU: {variant.sku}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900">
                                                {order.currency} {(item.unit_price || 0).toLocaleString()}
                                            </p>
                                            <p className="text-sm text-gray-500">x {item.quantity || 0}</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1">
                                                {order.currency} {((item.unit_price || 0) * (item.quantity || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-gray-500" /> Payment
                            </h3>
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="text-gray-600">{items.length} items</span>
                                <span className="text-gray-900">{order.currency} {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center font-bold text-gray-900">
                                <span>Total</span>
                                <span className="text-xl">{order.currency} {total.toLocaleString()}</span>
                            </div>
                        </div>
                        {order.razorpay_payment_id && (
                            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                                <p className="text-xs text-gray-500">Payment ID: {order.razorpay_payment_id}</p>
                                {order.razorpay_order_id && (
                                    <p className="text-xs text-gray-500 mt-1">Order ID: {order.razorpay_order_id}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Customer Info */}
                <div className="space-y-6">
                    {/* Customer Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" /> Customer
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                                    {firebaseUser?.displayName?.[0]?.toUpperCase() ||
                                        firebaseUser?.email?.[0]?.toUpperCase() ||
                                        'U'}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {resolvedCustomerName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        UID: {order.firebase_uid.slice(0, 12)}...
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-gray-100">
                                {firebaseUser?.email && (
                                    <div className="flex items-start gap-3">
                                        <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-900">{firebaseUser.email}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {firebaseUser.emailVerified ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                                        <span className="text-xs text-green-600">Email Verified</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3 h-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">Email Not Verified</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-3 border-t border-gray-100">
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <CreditCard className="w-5 h-5 text-gray-700" />
                                        <h2 className="font-semibold text-gray-900">Payment Details</h2>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Method</span>
                                            <span className="font-medium">
                                                {order.payment_method || (order.is_cod ? 'COD' : 'PREPAID')}
                                            </span>
                                        </div>

                                        {order.is_cod && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">COD Fee</span>
                                                    <span className="font-medium">₹{order.cod_fee || 0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">COD Status</span>
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${order.cod_allowed_by_razorpay ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {order.cod_allowed_by_razorpay ? 'Approved' : 'Restricted'}
                                                    </span>
                                                </div>
                                                {order.cod_eligibility_reason && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">COD Reason</span>
                                                        <span className="text-xs text-gray-500">{order.cod_eligibility_reason}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="flex justify-between pt-2 border-t">
                                            <span className="text-gray-600">Razorpay Order ID</span>
                                            <span className="font-mono text-xs text-gray-500">{order.razorpay_order_id}</span>
                                        </div>
                                        {order.razorpay_payment_id && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Payment ID</span>
                                                <span className="font-mono text-xs text-gray-500">{order.razorpay_payment_id}</span>
                                            </div>
                                        )}

                                        {order.gateway_notes && (
                                            <details className="pt-2 border-t">
                                                <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                                                    View Razorpay Metadata
                                                </summary>
                                                <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-64">
                                                    {JSON.stringify(order.gateway_notes, null, 2)}
                                                </pre>
                                            </details>
                                        )}

                                    </div>
                                </div>
                                {/* Phone Number Verification Status - Always show */}
                                <div className="flex items-start gap-3">
                                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <div className="flex-1">
                                        {firebaseUser?.phoneNumber ? (
                                            <>
                                                <p className="text-sm text-gray-900">{firebaseUser.phoneNumber}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-green-600" />
                                                    <span className="text-xs text-green-600">Phone Verified (OTP)</span>
                                                </div>
                                            </>
                                        ) : resolvedPhone ? (
                                            <>
                                                <p className="text-sm text-gray-900">{resolvedPhone}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <XCircle className="w-3 h-3 text-amber-500" />
                                                    <span className="text-xs text-amber-600">Phone Not Verified</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-gray-500 italic">No phone number</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <XCircle className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-500">Phone Not Added</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {resolvedShippingAddress && (
                                <div className="space-y-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                        <div className="text-sm text-gray-600">
                                            <p className="font-medium text-gray-900 mb-0.5">Shipping Address</p>
                                            {orderAny.shipping_name && <p>{orderAny.shipping_name}</p>}
                                            {orderAny.shipping_phone && <p>{orderAny.shipping_phone}</p>}
                                            {resolvedShippingAddress.fullName && <p>{resolvedShippingAddress.fullName}</p>}
                                            {resolvedShippingAddress.addressLine1 && <p>{resolvedShippingAddress.addressLine1}</p>}
                                            {resolvedShippingAddress.addressLine2 && <p>{resolvedShippingAddress.addressLine2}</p>}
                                            <p>
                                                {[resolvedShippingAddress.city, resolvedShippingAddress.state, resolvedShippingAddress.pincode].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Information */}
                    <ShippingInfoCard
                        courierName={orderAny.courier || order.courier_name}
                        trackingId={order.tracking_id}
                        shipmentStatus={order.shipment_status}
                        estimatedDeliveryDate={order.estimated_delivery_date}
                        actualDeliveryDate={order.actual_delivery_date}
                        actualShippingFee={order.actual_shipping_fee}
                    />

                    <LifecyclePanel
                        orderId={order.id}
                        currentStatus={order.status}
                        paymentStatus={orderAny.payment_status || null}
                        internalNotes={internalNotes}
                        timeline={orderTimeline}
                    />
                </div>
            </div>
        </div>
    )
}
