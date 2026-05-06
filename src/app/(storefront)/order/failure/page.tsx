import { supabaseServer } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import OrderFailureClient from './OrderFailureClient'

/**
 * Order Failure Page - PASS-3 Security Compliant
 * 
 * Security Contract:
 * - Uses user-scoped supabaseServer (NO admin client)
 * - Enforces strict authentication
 * - Filters all queries by firebase_uid
 * - Fails closed (no data leakage)
 */
export default async function OrderFailurePage({
    searchParams,
}: {
    searchParams: Promise<{ orderId?: string }>
}) {
    const params = await searchParams
    const orderId = params.orderId

    // TASK 2: Enforce authentication (Option A - Preferred)
    const user = await getCurrentUser()

    if (!user) {
        // Unauthenticated - show generic failure page
        return (
            <OrderFailureClient
                orderdata={{
                    order: null,
                    genericError: true
                }}
            />
        )
    }

    // TASK 4: Fail closed if order ID missing
    if (!orderId) {
        return (
            <OrderFailureClient
                orderdata={{
                    order: null,
                    genericError: true
                }}
            />
        )
    }

    // TASK 3: Use user-scoped Supabase client WITH uid filtering
    const { data: order, error } = await supabaseServer
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('firebase_uid', user.uid) // Double-check: user owns this order
        .single()

    // TASK 4: Fail closed on any error (don't reveal if order exists)
    if (error || !order) {
        // Order not found OR doesn't belong to user
        // Generic message - no data leakage
        return (
            <OrderFailureClient
                orderdata={{
                    order: null,
                    genericError: true
                }}
            />
        )
    }

    // User authenticated, order exists, order belongs to user - safe to show
    return <OrderFailureClient orderdata={{ order }} />
}
