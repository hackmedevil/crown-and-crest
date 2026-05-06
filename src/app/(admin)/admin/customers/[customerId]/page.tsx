import { notFound } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { adminAuth } from '@/lib/firebase/admin'
import CustomerDetailClient from './CustomerDetailClient'

type ShippingAddress = {
    fullName?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
}

type OrderRow = {
    id: string
    amount: number | null
    currency: string | null
    status: string
    created_at: string
    customer_phone: string | null
    shipping_address?: ShippingAddress | string | null
}

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

function parseShippingAddress(value: OrderRow['shipping_address']): ShippingAddress | null {
    if (!value) return null
    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as ShippingAddress
        } catch {
            return null
        }
    }
    return value
}

async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
    const { data: orders, error } = await supabaseServer
        .from('orders')
        .select('id, amount, currency, status, created_at, customer_phone, shipping_address')
        .eq('firebase_uid', customerId)
        .order('created_at', { ascending: false })

    if (error || !orders || orders.length === 0) {
        return null
    }

    const orderRows = orders as OrderRow[]
    let firebaseUser: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null

    try {
        firebaseUser = await adminAuth.getUser(customerId)
    } catch (fetchError) {
        console.error('Failed to fetch Firebase user:', fetchError)
    }

    const totalSpent = orderRows.reduce((sum, order) => sum + (order.amount || 0), 0)
    const ordersCount = orderRows.length
    const avgOrderValue = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0
    const lastOrderDate = orderRows[0]?.created_at || null
    const joinDate = orderRows[orderRows.length - 1]?.created_at || null

    const addressSource =
        orderRows.find((order) => order.shipping_address)?.shipping_address || null
    const parsedAddress = parseShippingAddress(addressSource)

    const email = firebaseUser?.email || null

    const phoneNumber =
        firebaseUser?.phoneNumber ||
        orderRows.find((order) => order.customer_phone)?.customer_phone ||
        null

    const displayName =
        firebaseUser?.displayName ||
        parsedAddress?.fullName ||
        email ||
        'Customer'

    const addresses = parsedAddress
        ? [
            {
                label: 'Default',
                fullName: parsedAddress.fullName || null,
                addressLine1: parsedAddress.addressLine1 || null,
                addressLine2: parsedAddress.addressLine2 || null,
                city: parsedAddress.city || null,
                state: parsedAddress.state || null,
                pincode: parsedAddress.pincode || null,
                country: parsedAddress.country || 'India',
            },
        ]
        : []

    const recentOrders = orderRows.slice(0, 5).map((order) => ({
        id: order.id,
        createdAt: order.created_at,
        status: order.status,
        amount: order.amount || 0,
        currency: order.currency || 'INR',
    }))

    return {
        id: customerId,
        displayName,
        email,
        phoneNumber,
        joinDate,
        ordersCount,
        totalSpent,
        avgOrderValue,
        lastOrderDate,
        addresses,
        recentOrders,
    }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
    const { customerId } = await params
    const customer = await getCustomerDetail(customerId)

    if (!customer) {
        notFound()
    }

    return <CustomerDetailClient customer={customer} />
}
