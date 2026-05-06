'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import RewardsHistoryTable from './RewardsHistoryTable'
import { RewardsHistoryItem, RewardsRedeemOption, RewardsTierConfig } from '@/types/rewards'
import { formatCurrency } from '@/lib/returns/constants'

interface RewardsClientProps {
  points: number
  redeemedPoints: number
  totalSavings: number
  referralEarnings: number
  tier: RewardsTierConfig['id']
  tierProgress: number
  referralCode: string | null
  history: RewardsHistoryItem[]
}

const TIER_CONFIGS: RewardsTierConfig[] = [
  {
    id: 'Starter',
    label: 'STARTER',
    minPoints: 0,
    benefits: ['Early access to drops', '1% extra points'],
    accent: 'bg-black text-white',
  },
  {
    id: 'Silver',
    label: 'SILVER',
    minPoints: 1000,
    benefits: ['Early access', '2% extra points', 'Priority support'],
    accent: 'bg-gray-900 text-white',
  },
  {
    id: 'Gold',
    label: 'GOLD',
    minPoints: 3000,
    benefits: ['Free returns', '5% extra points', 'Exclusive previews'],
    accent: 'bg-yellow-900 text-white',
  },
  {
    id: 'Platinum',
    label: 'PLATINUM',
    minPoints: 6000,
    benefits: ['Exclusive drops', 'Priority shipping', 'VIP support'],
    accent: 'bg-neutral-800 text-white',
  },
]

const REDEEM_OPTIONS: RewardsRedeemOption[] = [
  { id: 'reward-200', title: '₹200 Off Coupon', pointsRequired: 500, status: 'available' },
  { id: 'reward-500', title: '₹500 Off Coupon', pointsRequired: 1200, status: 'available' },
  { id: 'reward-ship', title: 'Free Shipping', pointsRequired: 300, status: 'available' },
  { id: 'reward-drop', title: 'Exclusive Drop Access', pointsRequired: 2000, status: 'locked' },
]

export default function RewardsClient({
  points,
  redeemedPoints,
  totalSavings,
  referralEarnings,
  tier,
  tierProgress,
  referralCode,
  history,
}: RewardsClientProps) {
  const [copied, setCopied] = useState(false)

  const tierConfig = useMemo(
    () => TIER_CONFIGS.find((t) => t.id === tier) || TIER_CONFIGS[0],
    [tier]
  )

  const nextTier = useMemo(() => {
    const currentIndex = TIER_CONFIGS.findIndex((t) => t.id === tierConfig.id)
    return TIER_CONFIGS[currentIndex + 1] || null
  }, [tierConfig.id])

  const pointsToNext = nextTier ? Math.max(0, nextTier.minPoints - points) : 0

  const handleCopy = async () => {
    if (!referralCode) return
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header */}
      <section className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`inline-flex items-center px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${tierConfig.accent}`}>
                {tierConfig.label}
              </p>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-5xl">Your Rewards</h1>
              <p className="mt-2 text-sm text-gray-700">Earn more. Unlock more.</p>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Points Balance</p>
              <p className="mt-2 text-4xl font-black tracking-tight">{points.toLocaleString('en-IN')}</p>
              <Link
                href="#rewards-redeem"
                className="mt-4 inline-flex items-center justify-center px-6 py-3 bg-black text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-colors"
              >
                Redeem Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Points Overview */}
      <section id="rewards-points" className="border-b border-black">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { label: 'Available Points', value: points.toLocaleString('en-IN') },
              { label: 'Redeemed Points', value: redeemedPoints.toLocaleString('en-IN') },
              { label: 'Total Savings', value: formatCurrency(totalSavings) },
              { label: 'Referral Earnings', value: formatCurrency(referralEarnings) },
            ].map((stat) => (
              <div key={stat.label} className="border border-black bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Tier */}
      <section id="rewards-tier" className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">Membership Tier</h2>
              <p className="mt-2 text-sm text-gray-700">Progress-driven perks designed for loyal members.</p>
            </div>
            {nextTier && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{pointsToNext.toLocaleString('en-IN')}</span> points to reach{' '}
                <span className="font-semibold uppercase">{nextTier.label}</span>
              </p>
            )}
          </div>

          <div className="mt-8">
            <div className="h-2 w-full bg-gray-200">
              <div className="h-2 bg-black" style={{ width: `${Math.min(100, Math.max(0, tierProgress))}%` }} />
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-gray-500">{tierProgress}% to next tier</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {TIER_CONFIGS.map((tierItem) => (
              <div
                key={tierItem.id}
                className={`border border-black p-4 ${tierItem.id === tier ? 'bg-black text-white' : 'bg-white text-gray-900'}`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em]">{tierItem.label}</p>
                <p className="mt-2 text-xs text-gray-600">{tierItem.minPoints.toLocaleString('en-IN')} points</p>
                <ul className="mt-4 space-y-2 text-xs">
                  {tierItem.benefits.map((benefit) => (
                    <li key={benefit}>• {benefit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Redeem Points */}
      <section id="rewards-redeem" className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black uppercase tracking-tight">Redeem Points</h2>
            <Link href="/account/rewards/history" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600 hover:text-black">
              View history
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {REDEEM_OPTIONS.map((reward) => {
              const isLocked = reward.status === 'locked'
              return (
                <div key={reward.id} className="border border-black bg-white p-4">
                  <p className="text-sm font-black uppercase tracking-tight">{reward.title}</p>
                  <p className="mt-2 text-xs text-gray-600">{reward.pointsRequired} points</p>
                  <button
                    className={`mt-4 w-full px-3 py-2 text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                      isLocked ? 'border border-gray-400 text-gray-400' : 'bg-black text-white hover:bg-gray-800'
                    }`}
                    disabled={isLocked}
                  >
                    {isLocked ? 'Locked' : 'Redeem'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section id="rewards-referral" className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">Referral Program</h2>
              <p className="mt-2 text-sm text-gray-700">Give ₹200, Get ₹200. Share your link and earn rewards.</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { step: '01', text: 'Share your link' },
                  { step: '02', text: 'Friend makes a purchase' },
                  { step: '03', text: 'You earn rewards' },
                ].map((step) => (
                  <div key={step.step} className="border border-black p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{step.step}</p>
                    <p className="mt-3 text-xs font-medium text-gray-900">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Your Referral Code</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 border border-black px-4 py-3 text-sm font-semibold">
                  {referralCode || 'CROWN-NEW'}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-black text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-800"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['WhatsApp', 'Instagram', 'Copy Link'].map((label) => (
                  <button
                    key={label}
                    className="border border-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-6 border border-black p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Referral Earnings</p>
                <p className="mt-2 text-2xl font-black">{formatCurrency(referralEarnings)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Points History */}
      <section id="rewards-history" className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black uppercase tracking-tight">Points History</h2>
            <Link href="/account/rewards/history" className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600 hover:text-black">
              Full history
            </Link>
          </div>
          <div className="mt-6">
            <RewardsHistoryTable items={history} />
          </div>
        </div>
      </section>

      {/* Rewards Rules */}
      <section id="rewards-coupons" className="border-b border-black">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black uppercase tracking-tight">Rewards Rules</h2>
          <div className="mt-6 space-y-4">
            {[
              {
                title: 'How points are earned',
                content: 'Earn 1 point for every ₹100 spent. Bonus multipliers apply by tier.',
              },
              {
                title: 'Points expiration',
                content: 'Points expire after 12 months of inactivity.',
              },
              {
                title: 'Minimum redemption',
                content: 'Minimum redemption is 300 points.',
              },
              {
                title: 'Tier upgrades',
                content: 'Tier status is reviewed every 12 months based on total points earned.',
              },
            ].map((rule) => (
              <details key={rule.title} className="border border-black p-4">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.2em] text-gray-700">
                  {rule.title}
                </summary>
                <p className="mt-3 text-sm text-gray-600">{rule.content}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
