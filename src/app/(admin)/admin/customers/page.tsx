import { supabaseServer } from '@/lib/supabase/server'
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { adminAuth } from '@/lib/firebase/admin'

interface CustomerData {
    firebaseUid: string
    email: string | null
    displayName: string | null
    phoneNumber: string | null
    orderCount: number
    totalSpent: number
    lastOrderDate: string | null
}

async function getCustomers() {
    // Get unique customers from orders
    const { data: orders } = await supabaseServer
        .from('orders')
        .select('firebase_uid, amount, created_at, customer_phone')
        .order('created_at', { ascending: false })

    if (!orders || orders.length === 0) {
        return []
    }

    // Group by firebase_uid to get unique customers
    const customerMap = new Map<string, {
        orderCount: number
        totalSpent: number
        lastOrderDate: string
        customerPhone?: string
    }>()

    for (const order of orders) {
        const existing = customerMap.get(order.firebase_uid)
        if (existing) {
            existing.orderCount++
            existing.totalSpent += order.amount || 0
            if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
                existing.lastOrderDate = order.created_at
                if (order.customer_phone) {
                    existing.customerPhone = order.customer_phone
                }
            }
        } else {
            customerMap.set(order.firebase_uid, {
                orderCount: 1,
                totalSpent: order.amount || 0,
                lastOrderDate: order.created_at,
                customerPhone: order.customer_phone || undefined,
            })
        }
    }

    // Fetch Firebase user details for each customer
    const customers: CustomerData[] = []

    for (const [firebaseUid, stats] of customerMap.entries()) {
        try {
            const firebaseUser = await adminAuth.getUser(firebaseUid)
            customers.push({
                firebaseUid,
                email: firebaseUser.email || null,
                displayName: firebaseUser.displayName || null,
                phoneNumber: firebaseUser.phoneNumber || stats.customerPhone || null,
                orderCount: stats.orderCount,
                totalSpent: stats.totalSpent,
                lastOrderDate: stats.lastOrderDate,
            })
        } catch (error) {
            console.error(`Failed to fetch Firebase user ${firebaseUid}:`, error)
            // Include customer even if Firebase fetch fails
            customers.push({
                firebaseUid,
                email: null,
                displayName: null,
                phoneNumber: stats.customerPhone || null,
                orderCount: stats.orderCount,
                totalSpent: stats.totalSpent,
                lastOrderDate: stats.lastOrderDate,
            })
        }
    }

    // Sort by total spent (highest first)
    return customers.sort((a, b) => b.totalSpent - a.totalSpent)
}

export default async function CustomersPage() {
    const customers = await getCustomers()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-sm text-gray-500 mt-1">{customers.length} total customers</p>
                </div>
            </div>

            {customers.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">No customers yet</p>
                    <p className="text-sm text-gray-400 mt-1">Customers will appear here when they place orders</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Orders
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Total Spent
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Last Order
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {customers.map((customer) => (
                                <tr key={customer.firebaseUid} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {customer.displayName || 'Guest Customer'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    ID: {customer.firebaseUid.slice(0, 8)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1">
                                            {customer.email && (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {customer.email}
                                                </div>
                                            )}
                                            {customer.phoneNumber && (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {customer.phoneNumber}
                                                </div>
                                            )}
                                            {!customer.email && !customer.phoneNumber && (
                                                <span className="text-sm text-gray-400">No contact info</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-semibold text-gray-900">
                                                {customer.orderCount}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm font-semibold text-gray-900">
                                            ₹{customer.totalSpent.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {customer.lastOrderDate
                                            ? new Date(customer.lastOrderDate).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })
                                            : '-'
                                        }
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link
                                            href={`/admin/customers/${customer.firebaseUid}`}
                                            className="text-primary hover:text-gray-900 font-semibold"
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
