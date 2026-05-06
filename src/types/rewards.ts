/**
 * Rewards Types
 *
 * Type definitions for rewards and loyalty system.
 */

export type RewardsTier = 'Starter' | 'Silver' | 'Gold' | 'Platinum'

export interface RewardsSummary {
  points: number
  redeemedPoints: number
  totalSavings: number // in paise
  referralEarnings: number // in paise
  tier: RewardsTier
  tierProgress: number // 0-100
  referralCode: string | null
}

export interface RewardsTierConfig {
  id: RewardsTier
  label: string
  minPoints: number
  benefits: string[]
  accent: string
}

export interface RewardsHistoryItem {
  id: string
  date: string
  activity: string
  pointsEarned: number
  pointsUsed: number
  balance: number
}

export interface RewardsRedeemOption {
  id: string
  title: string
  pointsRequired: number
  status: 'available' | 'locked' | 'limited'
  subtitle?: string
}
