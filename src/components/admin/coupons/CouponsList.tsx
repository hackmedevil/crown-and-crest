'use client'

import React, { useState } from 'react'
import { PlusCircle, Search, Tag, CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toggleCouponStatus } from '@/app/actions/coupons'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

// We'll use the type from our DB schema
import { Tables } from '@/types/database.types'
type Coupon = Tables<'coupons'>

export default function CouponsList({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons)
  const [searchTerm, setSearchTerm] = useState('')
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const router = useRouter()

  const handleToggleStatus = async (id: string, currentStatus: boolean | null) => {
    setIsToggling(id)
    try {
      // is_active is boolean | null in DB types, so we default to false if null before flipping
      const newStatus = !(currentStatus ?? false)
      const result = await toggleCouponStatus(id, newStatus)
      if (result.success) {
        setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: newStatus } : c))
        toast.success(`Coupon ${newStatus ? 'activated' : 'deactivated'}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsToggling(null)
    }
  }

  const formatDiscount = (type: string, value: number) => {
    switch (type) {
      case 'percentage': return `${value}% off`
      case 'fixed_amount': return `₹${value} off`
      case 'free_shipping': return 'Free Shipping'
      default: return `${value}`
    }
  }

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons & Discounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage promotional codes and cart-level discounts.
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusCircle className="h-4 w-4" />
          Create Coupon
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Coupon</th>
                  <th className="px-6 py-4 font-medium">Discount</th>
                  <th className="px-6 py-4 font-medium">Usage</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No coupons found.</p>
                      {searchTerm && (
                        <p className="text-xs mt-1">Try adjusting your search term.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold">{coupon.code}</div>
                        {coupon.description && (
                          <div className="text-xs text-muted-foreground mt-1">{coupon.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {formatDiscount(coupon.type, coupon.value)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {coupon.usage_count} 
                        {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ' uses'}
                      </td>
                      <td className="px-6 py-4">
                        {coupon.is_active ? (
                          <span className="inline-flex items-center text-xs font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          className="h-8 px-3"
                          onClick={() => handleToggleStatus(coupon.id, coupon.is_active)}
                          disabled={isToggling === coupon.id}
                        >
                          {isToggling === coupon.id ? 'Updating...' : coupon.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
