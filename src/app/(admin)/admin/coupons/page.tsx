import { createClient } from '@/utils/supabase/server'
import CouponsList from '@/components/admin/coupons/CouponsList'

export const metadata = {
  title: 'Coupons | Admin Dashboard',
}

export default async function AdminCouponsPage() {
  const supabase = await createClient()

  // Fetch all coupons, ordered by newest first
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching coupons:', error)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CouponsList initialCoupons={coupons || []} />
    </div>
  )
}
