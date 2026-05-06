import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()

  return NextResponse.json({
    authenticated: Boolean(user),
    uid: user?.uid ?? null,
  })
}
