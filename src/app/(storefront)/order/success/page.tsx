import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import OrderSuccessClient from './OrderSuccessClient'

export default async function OrderSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ orderId: string }>
}) {
    const { orderId } = await searchParams
    const user = await getCurrentUser()

    if (!user || !orderId) {
        redirect('/')
    }

    // Fetch Order & Items
    // Using server client with explicit firebase_uid filter for data isolation
    const { data: order, error } = await supabaseServer
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('firebase_uid', user.uid)
        .single()

    if (error || !order) {
        console.error('Order fetch error:', error)
        redirect('/')
    }

    const { data: items } = await supabaseServer
        .from('order_items')
        .select(`
            *,
            variants:variant_id (
                id,
                products:product_id (
                    image_url
                )
            )
        `)
        .eq('order_id', orderId)

    return <OrderSuccessClient order={order} items={items || []} />
}
