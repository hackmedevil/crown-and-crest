import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getActiveReturns, getCompletedReturns } from '@/lib/returns/actions'
import ReturnsClient from './ReturnsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReturnsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account/returns')
  }

  const [activeReturns, completedReturns] = await Promise.all([
    getActiveReturns(user.uid),
    getCompletedReturns(user.uid),
  ])

  return <ReturnsClient activeReturns={activeReturns} completedReturns={completedReturns} />
}
