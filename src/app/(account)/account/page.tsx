import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAccountOverview } from '@/lib/account/overview'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

/**
 * Account Page (Server Component)
 * 
 * - Verifies user is authenticated
 * - Redirects to login if not authenticated
 * - CRITICAL: Uses revalidate = 0 to ensure fresh auth check on every visit
 * - This prevents stale auth state from causing double login
 */

export const revalidate = 0 // Disable caching for this page

export default async function AccountPage() {
  const user = await getCurrentUser()

  // If user is not authenticated, redirect to login with redirect parameter
  if (!user) {
    redirect('/?openAuth=1&redirect=/account')
  }

  const overview = await getAccountOverview(user.uid)

  return <AccountClient overview={overview} />
}
