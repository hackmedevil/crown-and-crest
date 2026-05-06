'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { RewardsSummary, RewardsHistoryItem } from '@/types/rewards'

export async function getRewardsSummary(uid: string): Promise<RewardsSummary> {
  try {
    const [rewardsResult, savingsResult] = await Promise.all([
      supabaseAdmin
        .from('account_rewards')
        .select('points, tier, tier_progress, referral_code')
        .eq('firebase_uid', uid)
        .maybeSingle(),
      supabaseAdmin
        .from('account_savings')
        .select('total_saved')
        .eq('firebase_uid', uid)
        .maybeSingle(),
    ])

    if (rewardsResult.error) {
      console.error('getRewardsSummary rewards error:', JSON.stringify(rewardsResult.error, null, 2))
    }

    if (savingsResult.error) {
      console.error('getRewardsSummary savings error:', JSON.stringify(savingsResult.error, null, 2))
    }

    return {
      points: rewardsResult.data?.points ?? 0,
      redeemedPoints: 0,
      totalSavings: savingsResult.data?.total_saved ?? 0,
      referralEarnings: 0,
      tier: (rewardsResult.data?.tier as RewardsSummary['tier']) ?? 'Starter',
      tierProgress: rewardsResult.data?.tier_progress ?? 0,
      referralCode: rewardsResult.data?.referral_code ?? null,
    }
  } catch (error) {
    console.error('getRewardsSummary exception:', JSON.stringify(error, null, 2))
    return {
      points: 0,
      redeemedPoints: 0,
      totalSavings: 0,
      referralEarnings: 0,
      tier: 'Starter',
      tierProgress: 0,
      referralCode: null,
    }
  }
}

export async function getRewardsHistory(uid: string): Promise<RewardsHistoryItem[]> {
  try {
    // Placeholder: replace with real history table when available
    void uid
    return []
  } catch (error) {
    console.error('getRewardsHistory exception:', JSON.stringify(error, null, 2))
    return []
  }
}
