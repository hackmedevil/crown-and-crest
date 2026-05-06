import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Account | Crown & Crest',
  description: 'Manage your account',
}

export default async function RewardsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account')
  }

  redirect('/account')
}
