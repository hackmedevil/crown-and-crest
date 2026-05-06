import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserOrders } from '@/lib/orders/actions'
import ReturnWizardClient from './ReturnWizardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StartReturnPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account/returns/new')
  }

  const orders = await getUserOrders(user.uid)

  return <ReturnWizardClient orders={orders} userId={user.uid} />
}
