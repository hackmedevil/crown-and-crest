import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Delete session cookie
    cookieStore.delete('session')

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Logout error:', error)
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
    })
  }
}
