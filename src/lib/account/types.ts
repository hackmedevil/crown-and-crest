export type AccountMetrics = {
  ordersCount: number
  totalSpend: number
  rewardsPoints: number
  activeOrderCount: number
}

export type AccountOverviewProduct = {
  id: string
  name: string
  slug: string
  price: number
  imageUrl: string | null
  stockLabel?: string
  priceLabel?: string
  note?: string
}

export type AccountOverviewOrder = {
  id: string
  status: string
  eta: string | null
  productName: string
  productSlug: string | null
  itemsCount: number
}

export type AccountOverviewStats = {
  totalOrders: number
  totalSaved: number
  activeOffers: number
  walletBalance: number
}

export type AccountOverviewProfile = {
  name: string
  avatarUrl: string | null
  referralCode: string | null
}

export type AccountOverviewData = {
  profile: AccountOverviewProfile
  stats: AccountOverviewStats
  activeOrders: AccountOverviewOrder[]
  wishlist: AccountOverviewProduct[]
  recommendations: AccountOverviewProduct[]
  recentlyViewed: AccountOverviewProduct[]
}
