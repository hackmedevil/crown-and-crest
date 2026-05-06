# Sizebook Learning & Fit Feedback Guide
**Phase 16: Returns & Fit Learning**

- **Status:** ✅ Complete & Ready for Production
- **Implementation Date:** December 18, 2024
- **Scope:** Non-breaking learning infrastructure for personalized size recommendations

---

## Overview

Phase 16 adds **learning capabilities** to the Sizebook system. The feature captures post-purchase fit feedback from users and uses it to improve future size recommendations through **automatic, rule-based adjustments**.

### Key Principles

✅ **Non-Blocking**: Feedback is optional, never required, never blocks refunds/returns  
✅ **Auditable**: Every adjustment logged with reason and timestamp  
✅ **Reversible**: All adjustments can be reverted by admins  
✅ **Rule-Based**: No ML/AI, deterministic and explainable adjustments  
✅ **Safe**: Adjustments capped within safe bounds (-5cm to +5cm)  

---

## Data Architecture

### New Tables

#### `order_item_feedback`
Stores user feedback on how items fit after purchase.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `order_item_id` | UUID FK | Links to order_items (unique per item) |
| `user_uid` | UUID FK | User who provided feedback |
| `size_profile_id` | UUID FK | Sizebook profile if recommendation was shown |
| `recommended_size` | VARCHAR | Size that was recommended (snapshot) |
| `selected_size` | VARCHAR | Size user actually selected |
| `feedback_type` | ENUM | TOO_SMALL \| TOO_LARGE \| FITS_WELL \| QUALITY_ISSUE \| OTHER |
| `notes` | TEXT | Optional user notes (max 200 chars) |
| `created_at` | TIMESTAMP | When feedback was submitted |

**RLS Policy:** Users can view/insert their own, admins can view all.

#### `sizebook_fit_stats`
Aggregated feedback statistics per size profile and metric.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `size_profile_id` | UUID FK | Size profile being analyzed |
| `category` | VARCHAR | Category (men_top, women_dress, etc.) |
| `metric` | VARCHAR | Measurement being analyzed (chest_cm, waist_cm, etc.) |
| `total_feedback` | INT | Total feedback count for this metric |
| `fits_well_count` | INT | Count of "fits well" responses |
| `too_small_count` | INT | Count of "too small" responses |
| `too_large_count` | INT | Count of "too large" responses |
| `adjustment_cm` | DECIMAL | Current learned adjustment (+/- cm) |
| `adjustment_updated_at` | TIMESTAMP | When last adjustment was applied |
| `previous_adjustment_cm` | DECIMAL | Previous value (audit trail) |

**Unique Constraint:** One row per (size_profile_id, metric)

#### `sizebook_adjustment_history`
Complete audit trail of all adjustments ever made.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `size_profile_id` | UUID FK | Profile that was adjusted |
| `metric` | VARCHAR | Which measurement was adjusted |
| `previous_adjustment_cm` | DECIMAL | Before value |
| `new_adjustment_cm` | DECIMAL | After value |
| `adjustment_rule` | VARCHAR | Rule that triggered (TOO_SMALL_DOMINANT, etc.) |
| `reason` | VARCHAR | Human-readable reason |
| `sample_count` | INT | Sample size when adjustment made |
| `fits_well_count` | INT | Snapshot of feedback distribution |
| `too_small_count` | INT | (used for audit/analysis) |
| `too_large_count` | INT | (used for audit/analysis) |
| `triggered_by` | VARCHAR | "system" or admin name |
| `created_at` | TIMESTAMP | When adjustment was applied |
| `is_reverted` | BOOLEAN | Whether adjustment was rolled back |
| `reverted_at` | TIMESTAMP | When revert happened |
| `revert_reason` | VARCHAR | Why admin reverted |

**Purpose:** Complete replay-able audit trail. Can reconstruct state at any point in time.

---

## Learning Rules

The system uses **5 deterministic rules** to adjust size profiles based on feedback:

### Rule 1: Too Small Dominant (≥60% TOO_SMALL)
```
Threshold: 60% of feedback = "too small"
Action:   +0.5 cm adjustment (increase size)
Reason:   "Size profile measurements too small, expanding to match user preferences"
```

### Rule 2: Too Large Dominant (≥60% TOO_LARGE)
```
Threshold: 60% of feedback = "too large"
Action:   -0.5 cm adjustment (decrease size)
Reason:   "Size profile measurements too large, tightening to match user preferences"
```

### Rule 3: Moderately Too Small (45-59% TOO_SMALL)
```
Threshold: 45-59% of feedback = "too small"
Action:   +0.25 cm adjustment (smaller increase)
Reason:   "Moderate skew toward too small, slight adjustment"
```

### Rule 4: Moderately Too Large (45-59% TOO_LARGE)
```
Threshold: 45-59% of feedback = "too large"
Action:   -0.25 cm adjustment (smaller decrease)
Reason:   "Moderate skew toward too large, slight adjustment"
```

### Rule 5: Good Fit Dominant (≥70% FITS_WELL)
```
Threshold: 70% of feedback = "fits well"
Action:   Reset to 0 (baseline)
Reason:   "Feedback distribution healthy, resetting any previous adjustments"
```

### Safety Bounds
- Adjustments capped at **±5cm per metric**
- Requires **minimum 10 samples** before applying (rule of 10)
- Quality check: Only applies if `sample_adequate = true`

---

## User Flow: Feedback Capture

### When Feedback Is Shown
Feedback widget appears on **order details page** after delivery:
- Optional section in blue box: "How did the size fit?"
- Appears for all orders
- If Sizebook recommendation exists, shows: "You selected M, Sizebook suggested M"

### User Interaction
1. User clicks "Tell us" (or "Edit" if feedback exists)
2. Modal opens with 5 feedback options:
   - ✓ Fits well (green)
   - ✗ Too small (orange)
   - ✗ Too large (blue)
   - ⚠️ Quality issue (red)
   - ❓ Other (gray)
3. Optional: User adds notes (up to 200 chars)
4. Clicks "Save Feedback"

### Backend Processing
```
User submits feedback
  ↓
saveFeedback() validates & saves to order_item_feedback
  ↓
updateFitStatsFromFeedback() increments counters
  ↓
For each metric in profile:
  - Increment total_feedback
  - Increment category counter (fits_well_count, etc.)
  ↓
Database RPC: increment_fit_stat()
  ↓
Done (feedback saved, stats updated)
```

### Never Blocks
- Feedback is always optional
- Can delete feedback anytime
- Does NOT block returns/refunds
- Returns are processed independently

---

## Admin Flow: Learning Insights

### Dashboard: `/admin/sizebook/insights`

**Key Metrics Summary**
- Categories with feedback (e.g., "2/7")
- Total size profiles across categories
- Learning active status (always "Yes")
- Minimum sample size (always "10")

**Adjustment History**
- Table of all adjustments made by learning system
- Columns: Profile | Metric | Rule | Adjustment | Reason | Action
- Can **revert any adjustment** by clicking "Revert"
- Requires admin to provide revert reason

**Fit Statistics by Category**
- Separate table per category (Men's Top, Women's Dress, etc.)
- For each size profile:
  - Metric (chest_cm, waist_cm, etc.)
  - Sample size (highlighted if <10)
  - Distribution: % Fits Well | % Too Small | % Too Large
  - Current adjustment in cm

### Health Status
Each profile gets a health indicator:
- 🟢 **HEALTHY**: Good fit distribution, adequate samples
- 🟡 **SKEWED**: >60% TOO_SMALL or TOO_LARGE (may indicate quality issue)
- 🟠 **LOW_SAMPLE**: <10 feedback entries (not yet adjusted)

### Admin Actions
- **Monitor**: Check if profiles are healthily distributed
- **Analyze**: Understand why adjustments were made
- **Revert**: Rollback adjustments to test or fix issues
- **Audit**: Full history of every change ever made

---

## Technical Implementation

### Server Actions

#### User Actions (`src/lib/orders/feedback.ts`)

```ts
// Save feedback for order item
export async function saveFeedback(
  itemId: string,
  feedbackType: FeedbackType,
  notes?: string
): Promise<OrderItemFeedback>

// Get existing feedback
export async function getFeedbackForOrderItem(
  itemId: string
): Promise<OrderItemFeedback | null>

// Delete feedback
export async function deleteFeedback(feedbackId: string): Promise<void>
```

#### Admin Actions (`src/lib/admin/feedback.ts`)

```ts
// Get fit stats for a profile
export async function getStatsForProfile(profileId: string): Promise<FitStatsSummary[]>

// Get stats by category
export async function getStatsByCategory(category: string): Promise<...>

// Get adjustment history
export async function getAdjustmentHistory(profileId: string, limit?: number): Promise<...>

// Compute and apply adjustments
export async function computeAndApplyAdjustments(profileId: string): Promise<...>

// Revert adjustment
export async function revertAdjustment(historyId: string, reason: string): Promise<void>

// Get recent adjustments across all profiles
export async function getRecentAdjustments(limit?: number): Promise<...>
```

### Recommendation Engine Update

Enhanced `computeSizeRecommendation()` to apply learned adjustments:

```ts
// Apply learned adjustments to profile
function applyLearnedAdjustments(
  size: SizeProfile,
  fitStats: FitStatsSummary[] | null
): SizeProfile

// Compute recommendation with adjustments
export function computeSizeRecommendationWithAdjustments(
  input: RecommendationInput,
  fitStatsMap?: Map<string, FitStatsSummary[]>
): RecommendationResult
```

**How it works:**
1. PDP server fetches fit stats for product's size profiles
2. Applies learned adjustments to profile measurements
3. Recommendation engine uses adjusted profiles
4. Confidence score reflects adjusted matching

### Components

#### OrderFeedback Component (`src/components/OrderFeedback.tsx`)
- Modal form for capturing feedback
- Shows size context (selected vs recommended)
- 5 feedback options with icons
- Optional notes textarea (200 char limit)
- Save/delete actions with optimistic updates
- Error & success messaging

#### Admin Components
- **StatsTable**: Displays fit stats per profile
- **AdjustmentHistory**: Shows active and reverted adjustments
- **InsightsPage**: Dashboard aggregating everything

---

## Safety & Reversibility

### Preventing Bad Data

**Validation at Save**
```ts
// Only valid if:
1. Feedback type is one of: TOO_SMALL, TOO_LARGE, FITS_WELL, QUALITY_ISSUE, OTHER
2. Order item exists and user owns the order
3. Size profile exists if recommendation context available
4. Notes max 200 characters
```

**Sample Size Requirement**
```ts
// Adjustment only applied if total_feedback >= 10
// Rule of 10 prevents overfitting to small samples
```

**Adjustment Bounds**
```ts
// Clamped to ±5cm per metric
new_adjustment = Math.max(-5, Math.min(5, new_adjustment))
```

### Reverting Adjustments

**As Admin:**
1. Go to `/admin/sizebook/insights`
2. Find adjustment in "Adjustment History" table
3. Click "Revert" button
4. Enter reason for revert (required)
5. Adjustment immediately rolled back
6. History entry marked as `is_reverted = true`

**What Happens**
- `sizebook_fit_stats.adjustment_cm` reset to `previous_adjustment_cm`
- New row added to `sizebook_adjustment_history` with `is_reverted = true`
- All data remains for audit trail
- Confidence scores recalculated for affected products

**Full Rollback (If Needed)**
```sql
-- Manual SQL to reset all adjustments to baseline
UPDATE sizebook_fit_stats
SET adjustment_cm = 0, adjustment_updated_at = NOW()
WHERE size_profile_id IN (
  SELECT id FROM size_profiles WHERE category = 'men_top'
);

-- Log manual reset in audit table
INSERT INTO sizebook_adjustment_history (...)
VALUES (..., 'Manual admin reset', ...);
```

---

## Integration Points

### 1. Order Details Page
- Import `OrderFeedback` component
- Render in order item display
- Automatically loads/saves feedback

```tsx
import OrderFeedback from '@/components/OrderFeedback'

export default function OrderDetailsPage() {
  return (
    // ...
    {orderItems.map(item => (
      <OrderFeedback 
        orderItem={item} 
        selected_size={item.variant_label}
      />
    ))}
  )
}
```

### 2. PDP Recommendation
- PDP server fetches fit stats
- Applies adjustments to profiles
- Client auto-selects with adjusted confidence

```tsx
// In PDP server component
const { data: fitStats } = await supabaseServer
  .from('sizebook_fit_stats')
  .select('*')
  .in('size_profile_id', profileIds)

// Apply adjustments
const recommendation = computeSizeRecommendationWithAdjustments(
  { user_measurements, available_sizes },
  fitStatsMap
)
```

### 3. Admin Dashboard
- Link to Insights at `/admin/sizebook/insights`
- Shown in admin Sizebook dashboard (3 cards: Profiles, Products, Insights)

---

## Monitoring & Alerts

### What to Monitor

**Feedback Volume**
```
Monitor: Average feedback per order across categories
Alert if: <5% of delivered orders provide feedback (low engagement)
Action:  Consider incentivizing feedback or simplifying form
```

**Adjustment Frequency**
```
Monitor: How often rules trigger (e.g., 2 adjustments/week)
Alert if: >1 adjustment per day for same profile (rapid oscillation)
Action:  May indicate quality issue or category mismatch
```

**Sample Size Distribution**
```
Monitor: Profiles with <10 samples (shown as LOW_SAMPLE)
Alert if: >50% of profiles stuck at low sample (slow learning)
Action:  May need to promote Sizebook more to increase feedback
```

**Health Status**
```
Monitor: Profiles marked as SKEWED (>60% too small/large)
Alert if: Any profile stays SKEWED >2 weeks
Action:  Investigate if sizing definition needs revision or if quality issue
```

### Queries for Monitoring

```sql
-- Feedback per profile (last 30 days)
SELECT 
  sp.name,
  sp.category,
  COUNT(DISTINCT oif.id) as feedback_count,
  ROUND(100.0 * SUM(CASE WHEN oif.feedback_type = 'TOO_SMALL' THEN 1 ELSE 0 END) / COUNT(*), 1) as too_small_pct
FROM order_item_feedback oif
JOIN size_profiles sp ON oif.size_profile_id = sp.id
WHERE oif.created_at > NOW() - INTERVAL '30 days'
GROUP BY sp.id, sp.name, sp.category
ORDER BY feedback_count DESC;

-- Recent adjustments
SELECT * FROM sizebook_adjustment_history
WHERE is_reverted = false
ORDER BY created_at DESC
LIMIT 20;

-- Skewed profiles
SELECT 
  sp.name,
  sfs.metric,
  sfs.too_small_count,
  sfs.too_large_count,
  ROUND(100.0 * sfs.too_small_count / sfs.total_feedback, 1) as too_small_pct
FROM sizebook_fit_stats sfs
JOIN size_profiles sp ON sfs.size_profile_id = sp.id
WHERE sfs.total_feedback >= 10
AND (
  ROUND(100.0 * sfs.too_small_count / sfs.total_feedback, 1) > 60
  OR ROUND(100.0 * sfs.too_large_count / sfs.total_feedback, 1) > 60
)
ORDER BY too_small_pct DESC;
```

---

## Troubleshooting

### Problem: "Feedback not saving"
**Diagnosis:**
1. Check user is logged in
2. Verify order_item exists for given item ID
3. Check order belongs to logged-in user (RLS)

**Solution:**
```tsx
// Ensure user auth context passed
const user = await getCurrentUser()
if (!user) throw new Error('Not logged in')

// Verify order ownership in feedback.ts
const { data: order } = await supabaseServer
  .from('orders')
  .select('firebase_uid')
  .eq('id', orderItem.order_id)
  .maybeSingle()

if (!order || order.firebase_uid !== user.uid) {
  throw new Error('Unauthorized')
}
```

### Problem: "Adjustments not applying to recommendations"
**Diagnosis:**
1. Fit stats table might be empty
2. Adjustment values might be 0 (no rule triggered)
3. PDP might not be fetching fit stats

**Solution:**
```tsx
// In PDP server component, verify fit stats fetch
const { data: fitStats, error } = await supabaseServer
  .from('sizebook_fit_stats')
  .select('*')
  .in('size_profile_id', profileIds)

if (error) console.error('Fit stats fetch error:', error)
if (!fitStats?.length) console.warn('No fit stats found')

// Verify map is passed to recommendation function
const fitStatsMap = new Map(
  fitStats.map(stat => [stat.size_profile_id, [stat]])
)

const rec = computeSizeRecommendationWithAdjustments(
  { user_measurements, available_sizes },
  fitStatsMap  // ← Must pass map
)
```

### Problem: "Rules not triggering, adjustments stuck at 0"
**Diagnosis:**
1. Sample size <10 (rule of 10)
2. Feedback distribution balanced (no >45% skew)

**Solution:**
```sql
-- Check sample size
SELECT 
  metric,
  total_feedback,
  ROUND(100.0 * fits_well_count / total_feedback, 1) as fits_well_pct,
  ROUND(100.0 * too_small_count / total_feedback, 1) as too_small_pct,
  ROUND(100.0 * too_large_count / total_feedback, 1) as too_large_pct
FROM sizebook_fit_stats
WHERE size_profile_id = 'profile-uuid'
ORDER BY metric;

-- If sample_adequate = false, wait for more feedback
-- If distribution balanced (each ~33%), that's working as intended
```

---

## Deployment Checklist

- [ ] Run migration: `20251218_create_feedback_learning.sql`
- [ ] Verify `order_item_feedback` table created
- [ ] Verify `sizebook_fit_stats` table created
- [ ] Verify `sizebook_adjustment_history` table created
- [ ] Test feedback save from order page
- [ ] Test admin insights dashboard loads
- [ ] Test revert adjustment
- [ ] Verify RLS policies enforced
- [ ] Set up monitoring queries
- [ ] Document alert thresholds for team

---

## Future Enhancements

### Phase 17: Advanced Learning
- [ ] Confidence visualization (show why recommendation changed)
- [ ] Learning from returns (attribute returns to sizing issues)
- [ ] Seasonal adjustments (e.g., winter vs summer sizing)
- [ ] Brand-specific rules (e.g., "Brand X runs small")
- [ ] Multi-size recommendations (top 3 instead of 1)

### Phase 18: ML/AI (If Needed)
- [ ] Recommendation model training on feedback dataset
- [ ] Anomaly detection (identify outliers and bad sizes)
- [ ] Predictive sizing (estimate size for new users)
- [ ] Fit preference learning (tight vs loose preference)

### UX Improvements
- [ ] Email follow-up 1 week after delivery: "How did it fit?"
- [ ] Incentivize feedback (small reward or discount)
- [ ] Guided measurement wizard with photos
- [ ] Side-by-side size comparison charts

---

## Questions & Support

**Q: Why rule-based instead of ML?**  
A: Explainability and safety. Every adjustment has a clear reason that admins can understand and reverse.

**Q: What if feedback distribution is 50/50 too small vs too large?**  
A: No adjustment applies. System stays at current value (safe default).

**Q: Can I manually override adjustments?**  
A: Yes. Revert any adjustment through insights dashboard and the system will use baseline value again.

**Q: How long until adjustments stabilize?**  
A: Typically 20-50 feedback entries per metric (2-10 weeks depending on order volume).

**Q: What if a category has no feedback?**  
A: No adjustments apply. Recommendations use base profiles with default tolerance.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 18, 2024 | Initial implementation: Feedback capture, rule-based learning, insights dashboard |

---

**Last Updated:** December 18, 2024  
**Owner:** Engineering Team  
**Status:** ✅ Production Ready
