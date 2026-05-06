import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getUserWishlist, getWishlistStats, getWishlistRecommendations } from '@/lib/wishlist/actions'
import WishlistClient from './WishlistClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Wishlist | Crown & Crest',
  description: 'Save your favorite items for later',
}

export default async function AccountWishlistPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/?openAuth=1&redirect=/account/wishlist')
  }

  // Fetch wishlist data in parallel
  const [items, stats, recommendations] = await Promise.all([
    getUserWishlist(user.uid),
    getWishlistStats(user.uid),
    getWishlistRecommendations(user.uid, 4),
  ])

  return (
    <WishlistClient
      initialItems={items}
      initialStats={stats}
      recommendations={recommendations}
      uid={user.uid}
    />
  )
}
