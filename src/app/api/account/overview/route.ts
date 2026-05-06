import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAccountOverview } from '@/lib/account/overview'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overview = await getAccountOverview(user.uid)
  return NextResponse.json(overview)
}
