import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserOrdersWithItems } from '@/lib/orders/actions'
import OrdersClient from './OrdersClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AccountOrdersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account/orders')
  }

  const { orders, items } = await getUserOrdersWithItems(user.uid)

  return <OrdersClient orders={orders} items={items} />
}
