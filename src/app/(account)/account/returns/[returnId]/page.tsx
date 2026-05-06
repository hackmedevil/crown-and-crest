import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getReturnById } from '@/lib/returns/actions'
import ReturnDetailsClient from './ReturnDetailsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReturnDetailsPage({
  params,
}: {
  params: Promise<{ returnId: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account/returns')
  }

  const { returnId } = await params

  const returnData = await getReturnById(returnId)

  // Verify ownership
  if (returnData.firebase_uid !== user.uid) {
    redirect('/account/returns')
  }

  return <ReturnDetailsClient return={returnData} />
}
