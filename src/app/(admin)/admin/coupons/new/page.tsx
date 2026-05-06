import CreateCouponForm from '@/components/admin/coupons/CreateCouponForm'

export const metadata = {
  title: 'Create Coupon | Admin Dashboard',
}

export default function NewCouponPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <CreateCouponForm />
    </div>
  )
}
