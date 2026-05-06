"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Tag } from "lucide-react"
import { createCoupon, DiscountType } from "@/app/actions/coupons"
import { toast } from "react-hot-toast"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Select, Textarea } from "@/components/ui/Input"

export default function CreateCouponForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<DiscountType>("percentage")
  const [value, setValue] = useState("")
  const [minOrder, setMinOrder] = useState("")
  const [maxDiscount, setMaxDiscount] = useState("")
  const [usageLimit, setUsageLimit] = useState("")
  const [perUserLimit, setPerUserLimit] = useState("1")
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 16))
  const [endsAt, setEndsAt] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!code.trim()) {
        toast.error("Coupon code is required")
        return
      }

      let numValue = 0
      if (type !== "free_shipping") {
        numValue = parseFloat(value)
        if (isNaN(numValue) || numValue <= 0) {
          toast.error("Valid discount value is required")
          return
        }
      }

      if (type === "percentage" && numValue > 100) {
        toast.error("Percentage discount cannot exceed 100%")
        return
      }

      const result = await createCoupon({
        code: code.trim(),
        description: description.trim(),
        type,
        value: numValue,
        minimum_order_amount: minOrder ? parseFloat(minOrder) : undefined,
        maximum_discount_amount:
          type === "percentage" && maxDiscount ? parseFloat(maxDiscount) : undefined,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : undefined,
        per_user_limit: perUserLimit ? parseInt(perUserLimit, 10) : 1,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
        is_active: isActive,
      })

      if (result.success) {
        toast.success(`Coupon ${code.trim()} created successfully`)
        router.push("/admin/coupons")
      } else {
        toast.error(result.error || "Failed to create coupon")
      }
    } catch (err) {
      toast.error("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/admin/coupons")}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Coupon</h1>
          <p className="text-muted-foreground mt-1">Add a new promotional code for your store.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card variant="admin">
            <CardHeader title="Basic Information" description="The core details of your discount code." />
            <CardContent className="space-y-4">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  id="code"
                  label="Coupon Code"
                  placeholder="e.g. SUMMER2026"
                  className="pl-9 uppercase"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  required
                />
              </div>

              <Textarea
                id="description"
                label="Internal Description (Optional)"
                placeholder="E.g., Summer sale promo promoted on Instagram"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card variant="admin">
            <CardHeader title="Discount Rules" description="Configure how much this coupon saves the customer." />
            <CardContent className="space-y-4">
              <Select
                id="type"
                label="Discount Type"
                value={type}
                onChange={(e) => setType(e.target.value as DiscountType)}
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed_amount", label: "Fixed Amount (INR)" },
                  { value: "free_shipping", label: "Free Shipping" },
                ]}
                required
              />

              <Input
                id="value"
                label="Discount Value"
                type="number"
                min="0"
                step={type === "percentage" ? "1" : "0.01"}
                placeholder={type === "percentage" ? "e.g. 10" : "e.g. 100"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={type === "free_shipping"}
                required={type !== "free_shipping"}
              />

              <Input
                id="minOrder"
                label="Minimum Order Amount (INR)"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 1000"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
              />

              <Input
                id="maxDiscount"
                label="Maximum Discount Cap (INR)"
                helperText="Only applies to percentage discounts"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 500"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                disabled={type !== "percentage"}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="admin">
            <CardHeader title="Schedule" description="When is this coupon active?" />
            <CardContent className="space-y-4">
              <Input
                id="startsAt"
                label="Start Date and Time"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />

              <Input
                id="endsAt"
                label="End Date and Time (Optional)"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card variant="admin">
            <CardHeader title="Usage Limits" description="Set usage restrictions for this coupon." />
            <CardContent className="space-y-4">
              <Input
                id="usageLimit"
                label="Total Usage Limit"
                type="number"
                min="1"
                placeholder="e.g. 100 (Leave blank for unlimited)"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              />

              <Input
                id="perUserLimit"
                label="Limit Per User"
                type="number"
                min="1"
                placeholder="e.g. 1"
                value={perUserLimit}
                onChange={(e) => setPerUserLimit(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card variant="admin">
            <CardHeader title="Active Status" description="Is this coupon currently usable?" />
            <CardContent>
              <label htmlFor="isActive" className="inline-flex items-center gap-2 text-sm font-medium text-brand-black">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4"
                />
                Active
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 flex justify-end gap-4 mt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => router.push("/admin/coupons")}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Coupon"}
          </Button>
        </div>
      </form>

      <div>
        <Link href="/admin/coupons" className="sr-only">
          Back to coupons
        </Link>
      </div>
    </div>
  )
}
