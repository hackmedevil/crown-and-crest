import { cookies } from 'next/headers'
import { getCart } from '@/lib/cart/actions'
import HeaderClient from './Header.client'
import { supabaseServer } from '@/lib/supabase/server'
import { getStoreSettings } from '@/lib/store-settings'

// Always render dynamically so cart count reflects latest server state
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

async function getCategories() {
  const { data } = await supabaseServer
    .from('products')
    .select('category')
    .not('category', 'is', null)

  if (!data) return []

  // Get unique categories and take top 5
  const categories = Array.from(new Set(data.map(item => item.category))).slice(0, 5)
  return categories as string[]
}

export default async function HeaderServer() {
  const cookieStore = await cookies()
  const isLoggedIn = !!cookieStore.get('session')?.value

  const [cart, categories, storeSettings] = await Promise.all([
    isLoggedIn ? getCart().catch(() => []) : [],
    getCategories(),
    getStoreSettings(),
  ])

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity ?? 0), 0)

  return (
    <HeaderClient
      isLoggedIn={isLoggedIn}
      cartCount={cartCount}
      categories={categories}
      storeName={storeSettings.store_name}
      logoUrl={storeSettings.logo_url}
    />
  )
}