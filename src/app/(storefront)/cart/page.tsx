import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import CartClient from './CartClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Shopping Cart | Lumière',
    description: 'Review your selected items and proceed to secure checkout.',
}

export default async function CartPage() {
    const user = await getCurrentUser()

    if (!user) {
        return <CartClient />
    }

    let firebaseUser = null
    try {
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            const { adminAuth } = await import('@/lib/firebase/admin')
            firebaseUser = await adminAuth.getUser(user.uid)
        }
    } catch (error) {
        console.error('[Cart] Failed to fetch Firebase user:', error)
    }

    return (
        <CartClient
            user={{
                uid: user.uid,
                email: firebaseUser?.email || undefined,
                phoneNumber: firebaseUser?.phoneNumber || undefined,
                displayName: firebaseUser?.displayName || undefined,
            }}
        />
    )
}
