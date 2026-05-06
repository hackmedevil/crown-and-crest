# Sizebook System - Phase 13 Foundation

**Status:** Foundation Complete (MVP Ready)  
**Purpose:** Personalized size recommendations based on user body measurements  
**Scope:** Assistive UX only - no checkout blocking, graceful fallbacks, zero impact on existing flows

---

## Overview

The Sizebook system provides intelligent size recommendations on product detail pages (PDP) by matching user body measurements against admin-defined size profiles. This is an **assistive feature** that helps users find their best fit but never blocks checkout or changes inventory/payment logic.

### Key Principles

1. **Assistive Only**: Recommendations are suggestions, not requirements
2. **Graceful Fallbacks**: Missing data never breaks the experience
3. **Zero Business Logic Impact**: No changes to cart, checkout, inventory, or payment flows
4. **Privacy-Conscious**: User measurements stored securely, only visible to user
5. **Admin-Configurable**: Size profiles fully managed by admins per product

---

## Architecture

### Data Model

```
┌─────────────────┐
│ size_profiles   │ ← Admin-defined standards (S, M, L, XL)
│ (admin creates) │
└────────┬────────┘
         │
         │ Many-to-many mapping
         ↓
┌─────────────────────────┐
│ product_size_profiles   │ ← Products have 1+ size profiles
│ (admin assigns)         │
└─────────────────────────┘
         ↓
┌─────────────────┐         ┌──────────────────┐
│ products        │         │ user_size_profile│ ← User measurements per category
│                 │         │ (user provides)  │
└─────────────────┘         └──────────────────┘
         ↓                            ↓
         └────────────────┬───────────┘
                          ↓
                  ┌──────────────────┐
                  │ PDP Recommender  │ ← Pure function matching
                  └──────────────────┘
```

### Three Tables

#### 1. `size_profiles` (Admin-Defined Standards)
Admin creates size profiles (S, M, L, XL) with measurements per category.

```sql
CREATE TABLE size_profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(50),           -- e.g., "M", "L", "34/36"
  category VARCHAR(100),      -- e.g., "men_top", "women_dress"
  measurements JSONB,         -- e.g., {"chest_cm": 96, "waist_cm": 81}
  fit_rules JSONB,           -- e.g., {"tolerance_cm": 3, "stretch_allowance": 5}
  created_at, updated_at,
  UNIQUE (name, category)
);
```

**Example Measurements:**
- Men's Tops: `{chest_cm, waist_cm, shoulder_cm, length_cm}`
- Women's Dresses: `{bust_cm, waist_cm, hip_cm, length_cm}`
- Bottoms: `{waist_cm, hip_cm, inseam_cm, rise_cm}`

#### 2. `product_size_profiles` (Product Mappings)
Maps products to available size profiles (many-to-many).

```sql
CREATE TABLE product_size_profiles (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  size_profile_id UUID REFERENCES size_profiles(id),
  notes TEXT,                 -- e.g., "Runs small, consider sizing up"
  created_at,
  UNIQUE (product_id, size_profile_id)
);
```

#### 3. `user_size_profile` (User Measurements)
User's body measurements per category (one profile per category).

```sql
CREATE TABLE user_size_profile (
  id UUID PRIMARY KEY,
  user_uid VARCHAR(255),      -- Firebase UID
  category VARCHAR(100),      -- Must match size_profiles.category
  measurements JSONB,         -- User's actual measurements
  created_at, updated_at,
  UNIQUE (user_uid, category)
);
```

---

## Workflows

### Admin Workflow: Define & Assign Sizes

1. **Create Size Profiles** (one-time setup per category)
   ```ts
   await createSizeProfile({
     name: 'M',
     category: 'men_top',
     measurements: { chest_cm: 96, waist_cm: 81, shoulder_cm: 45, length_cm: 72 },
     fit_rules: { tolerance_cm: 3 }
   });
   ```

2. **Assign to Products** (per product)
   ```ts
   await assignSizeProfileToProduct({
     product_id: 'product-123',
     size_profile_id: 'size-m-id',
     notes: 'This product runs slightly small'
   });
   ```

3. **Manage Profiles** (CRUD operations)
   - List all profiles: `listSizeProfiles(category?)`
   - Update profile: `updateSizeProfile({ id, measurements })`
   - Delete profile: `deleteSizeProfile(id)`

**Admin UI (Future):** Admin dashboard to manage size profiles and product assignments.

### User Workflow: Set Up Profile

1. **Enter Measurements** (optional, per category)
   ```ts
   await saveUserSizeProfile({
     category: 'men_top',
     measurements: { chest_cm: 98, waist_cm: 84, shoulder_cm: 46, length_cm: 74 }
   });
   ```

2. **View/Edit Profile** (My Account page)
   ```ts
   const profiles = await getAllUserSizeProfiles();
   // Shows all categories user has configured
   ```

3. **Delete Profile** (if desired)
   ```ts
   await deleteUserSizeProfile('men_top');
   ```

**User UI (Future):** Profile setup page with measurement guide images.

### PDP Workflow: Show Recommendations

1. **Fetch Product Size Profiles** (server-side)
   ```ts
   const { data: productSizes } = await supabase
     .from('product_size_profiles')
     .select('*, size_profile:size_profiles(*)')
     .eq('product_id', productId);
   ```

2. **Fetch User Profile** (if logged in)
   ```ts
   const { data: userProfile } = await getUserSizeProfile(category);
   ```

3. **Compute Recommendation** (pure function)
   ```ts
   const recommendation = computeSizeRecommendation({
     user_measurements: userProfile.measurements,
     available_sizes: productSizes.map(ps => ps.size_profile)
   });
   ```

4. **Apply Recommendation** (client-side)
   - If `recommendation`: Auto-select variant with matching size
   - Show badge: "Recommended for you" (if confidence ≥80%)
   - User can still manually change size (standard variant selector)
   - If no recommendation: Show nothing (normal PDP behavior)

---

## Recommendation Algorithm

### Pure Function
```ts
computeSizeRecommendation(input: RecommendationInput): RecommendationResult
```

**Input:**
- `user_measurements`: User's body measurements (from `user_size_profile`)
- `available_sizes`: Product's size profiles (from `product_size_profiles`)

**Output:**
- `recommended_size`: Size name (e.g., "M", "L")
- `size_profile_id`: Profile ID
- `confidence`: Score 0-100 (100 = perfect match)
- `reason`: Human-readable explanation

**Algorithm Steps:**

1. **Validate Input**
   - Need at least 1 size profile
   - User must have at least 1 measurement
   - Return `null` if invalid

2. **Calculate Match Score** (per size profile)
   - Compare each measurement that exists in both user & profile
   - Calculate deviation: `|user_value - profile_value|`
   - Apply tolerance: `max(0, deviation - tolerance_cm)`
   - Apply stretch allowance: If user > profile, reduce penalty
   - Compute weighted Euclidean distance: `sqrt(sum(deviations²) / count)`

3. **Find Best Match**
   - Select size with lowest distance score
   - Convert distance to confidence: `100 * exp(-distance / 8)`
   - Return `null` if confidence < 60%

4. **Return Recommendation**
   - Include size name, profile ID, confidence, reason

**Example:**
```ts
User: { chest_cm: 98, waist_cm: 84 }
Size M: { chest_cm: 96, waist_cm: 81 } (tolerance: 3cm)
Size L: { chest_cm: 101, waist_cm: 86 } (tolerance: 3cm)

Deviations for M:
  chest: |98-96| = 2cm → after tolerance: 0cm (within 3cm)
  waist: |84-81| = 3cm → after tolerance: 0cm (within 3cm)
  Distance: sqrt((0² + 0²) / 2) = 0cm → Confidence: 100%

Deviations for L:
  chest: |98-101| = 3cm → after tolerance: 0cm
  waist: |84-86| = 2cm → after tolerance: 0cm
  Distance: sqrt((0² + 0²) / 2) = 0cm → Confidence: 100%

Result: Both match perfectly! Choose M (appears first).
```

---

## Integration Points

### 1. Product Detail Page (PDP)
**File:** `src/app/product/[slug]/page.tsx`

**Server Component:**
```tsx
// Fetch product size profiles
const { data: productSizes } = await supabase
  .from('product_size_profiles')
  .select('*, size_profile:size_profiles(*)')
  .eq('product_id', product.id);

// Fetch user profile (if logged in)
const user = await getAuthenticatedUser();
const userProfile = user 
  ? await getUserSizeProfile(product.category) 
  : null;

// Pass to client component
<PDPClient 
  product={product} 
  productSizes={productSizes}
  userProfile={userProfile}
/>
```

**Client Component:**
```tsx
'use client';

function PDPClient({ product, productSizes, userProfile }) {
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    // Compute recommendation
    if (userProfile && productSizes.length > 0) {
      const rec = computeSizeRecommendation({
        user_measurements: userProfile.measurements,
        available_sizes: productSizes.map(ps => ps.size_profile)
      });

      if (rec && rec.confidence >= 60) {
        // Auto-select variant with recommended size
        const variant = product.variants.find(v => v.size === rec.recommended_size);
        if (variant) {
          setSelectedVariant(variant.id);
        }
      }
    }
  }, [userProfile, productSizes]);

  return (
    <div>
      {/* Show recommendation badge */}
      {recommendation && recommendation.confidence >= 80 && (
        <div className="badge">
          ✓ Recommended for you ({recommendation.recommended_size})
        </div>
      )}

      {/* Standard variant selector (user can override) */}
      <VariantSelector 
        variants={product.variants}
        selected={selectedVariant}
        onChange={setSelectedVariant}
      />
    </div>
  );
}
```

### 2. User Account Page
**File:** `src/app/account/size-profile/page.tsx` (to be created)

**Features:**
- View all saved profiles (per category)
- Add new profile (with measurement guide)
- Edit existing profile
- Delete profile

### 3. Admin Dashboard
**File:** `src/app/admin/size-profiles/page.tsx` (to be created)

**Features:**
- List all size profiles (filterable by category)
- Create new size profile (with measurement inputs)
- Edit size profile
- Assign size profiles to products
- View product-size mappings

---

## Edge Cases & Fallbacks

### Graceful Degradation
| Scenario | Behavior |
|----------|----------|
| User not logged in | No recommendation, standard PDP |
| User has no profile | No recommendation, show "Set up profile" link |
| Product has no size profiles | No recommendation, standard PDP |
| No confident match (confidence <60%) | No recommendation, standard PDP |
| User profile category ≠ product category | No recommendation |
| User measurements invalid | Profile save rejected with validation errors |

### Validation Rules

**Measurement Ranges (reasonable bounds):**
```ts
chest_cm: 70-150cm
waist_cm: 50-150cm
hip_cm: 70-160cm
shoulder_cm: 30-70cm
length_cm: 40-120cm
inseam_cm: 50-100cm
```

**User provides out-of-range value:**
- Reject with error: "Chest must be between 70-150cm"
- Never silently accept bad data

**Size profile missing measurements:**
- If no common measurements between user & profile → skip that size
- If ALL sizes missing common measurements → no recommendation

---

## API Reference

### Admin Server Actions
All require `requireAdmin()` guard.

```ts
createSizeProfile(payload: CreateSizeProfilePayload): Promise<SizebookActionResult<SizeProfile>>
updateSizeProfile(payload: UpdateSizeProfilePayload): Promise<SizebookActionResult<SizeProfile>>
deleteSizeProfile(id: string): Promise<SizebookActionResult>
listSizeProfiles(category?: string): Promise<SizebookActionResult<SizeProfile[]>>

assignSizeProfileToProduct(payload: AssignSizeProfilePayload): Promise<SizebookActionResult<ProductSizeProfile>>
removeSizeProfileFromProduct(product_id: string, size_profile_id: string): Promise<SizebookActionResult>
getProductSizeProfiles(product_id: string): Promise<SizebookActionResult<ProductSizeProfileExtended[]>>
updateProductSizeProfileNotes(product_id: string, size_profile_id: string, notes: string): Promise<SizebookActionResult<ProductSizeProfile>>
```

### User Server Actions
All require `getAuthenticatedUser()` check.

```ts
saveUserSizeProfile(payload: SaveUserSizeProfilePayload): Promise<SizebookActionResult<UserSizeProfile>>
getUserSizeProfile(category: string): Promise<SizebookActionResult<UserSizeProfile | null>>
getAllUserSizeProfiles(): Promise<SizebookActionResult<UserSizeProfile[]>>
deleteUserSizeProfile(category: string): Promise<SizebookActionResult>
hasUserSizeProfile(category: string): Promise<SizebookActionResult<boolean>>
```

### Pure Functions (No Auth)
```ts
computeSizeRecommendation(input: RecommendationInput): RecommendationResult
validateMeasurements(measurements: Measurements): { valid: boolean; errors: string[] }
hasCommonMeasurements(measurements1: Measurements, measurements2: Measurements): boolean
```

---

## Testing Strategy

### Unit Tests (Recommendation Engine)
```ts
describe('computeSizeRecommendation', () => {
  it('returns perfect match for exact measurements', () => {
    const result = computeSizeRecommendation({
      user_measurements: { chest_cm: 96, waist_cm: 81 },
      available_sizes: [{ name: 'M', measurements: { chest_cm: 96, waist_cm: 81 }, ... }]
    });
    expect(result.confidence).toBe(100);
    expect(result.recommended_size).toBe('M');
  });

  it('returns null for no common measurements', () => {
    const result = computeSizeRecommendation({
      user_measurements: { chest_cm: 96 },
      available_sizes: [{ name: 'M', measurements: { inseam_cm: 81 }, ... }]
    });
    expect(result).toBeNull();
  });

  it('applies tolerance correctly', () => {
    const result = computeSizeRecommendation({
      user_measurements: { chest_cm: 98 },
      available_sizes: [{ 
        name: 'M', 
        measurements: { chest_cm: 96 }, 
        fit_rules: { tolerance_cm: 3 }
      }]
    });
    expect(result.confidence).toBeGreaterThan(90); // Within tolerance
  });
});
```

### Integration Tests (Server Actions)
```ts
describe('saveUserSizeProfile', () => {
  it('creates new profile for user', async () => {
    const result = await saveUserSizeProfile({
      category: 'men_top',
      measurements: { chest_cm: 98, waist_cm: 84 }
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid measurements', async () => {
    const result = await saveUserSizeProfile({
      category: 'men_top',
      measurements: { chest_cm: 200 } // Out of range
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('between 70-150cm');
  });
});
```

### Manual Testing (PDP)
1. Create size profiles as admin (S, M, L, XL for "men_top")
2. Assign profiles to test product
3. Set up user profile with measurements
4. Visit product page → verify auto-selected size matches recommendation
5. Manually change size → verify override works
6. Delete user profile → verify no recommendation shown

---

## Future Enhancements (Out of Scope - Phase 13)

### Phase 14+: Advanced Features
- **Confidence Visualization**: Show "Great fit", "Good fit", "May be tight" labels
- **Fit Labels**: "Runs small", "Runs large", "True to size" per product
- **Learning from Returns**: Track which sizes were returned (size wrong) to improve algorithm
- **AI Recommendations**: Use ML model trained on purchase/return data
- **Virtual Try-On**: AR visualization of garment on user's body
- **Size Comparison**: "You wear M in Brand X? Try L in our brand"
- **Measurement Guide**: Interactive tool with photos/videos showing how to measure
- **Fit Preferences**: User sets preference (prefers tight fit vs loose fit)
- **Multi-Size Cart**: Allow adding multiple sizes to cart for home try-on

### Operations & Analytics
- **Recommendation Acceptance Rate**: Track how often users add recommended size vs override
- **Size Return Rate**: Compare return rates for recommended vs non-recommended sizes
- **Profile Completion Rate**: Track how many users set up profiles
- **A/B Testing**: Test different confidence thresholds, badge copy, UI placement

---

## Implementation Checklist

**Phase 13 Foundation (COMPLETED):**
- [x] SQL migrations for 3 tables (`size_profiles`, `product_size_profiles`, `user_size_profile`)
- [x] TypeScript types (`src/types/sizebook.ts`)
- [x] Recommendation engine (`src/lib/sizebook/recommendation.ts`)
- [x] Admin server actions (`src/lib/sizebook/admin-actions.ts`)
- [x] User server actions (`src/lib/sizebook/user-actions.ts`)
- [x] Barrel exports (`src/lib/sizebook/index.ts`)
- [x] Documentation (this file)

**Phase 14 UI (TODO):**
- [ ] PDP integration (auto-select variant, show badge)
- [ ] User profile setup page (measurement inputs with guide)
- [ ] Admin size profile management page (CRUD UI)
- [ ] Admin product-size assignment UI (assign profiles to products)

**Phase 15 Polish (TODO):**
- [ ] Measurement validation on client (real-time feedback)
- [ ] Measurement guide (images/videos showing how to measure)
- [ ] Confidence badge variants (90%+ = "Perfect fit", 70-90% = "Good fit")
- [ ] Analytics tracking (recommendation shown, accepted, rejected)

---

## Security & Privacy

### Data Access
- **Admin**: Can see all size profiles (no user data)
- **User**: Can only see/edit their own measurements
- **Public**: No access to user measurements (not exposed in API)

### Authentication Guards
```ts
// Admin actions
const { user, isAdmin } = await requireAdmin();
if (!isAdmin) return { success: false, error: 'Admin access required' };

// User actions
const user = await getAuthenticatedUser();
if (!user) return { success: false, error: 'Authentication required' };
```

### Database Security (RLS)
Implement Row Level Security policies:
```sql
-- Admin can manage size_profiles
CREATE POLICY admin_size_profiles ON size_profiles
  FOR ALL USING (auth.role() = 'admin');

-- Users can only access their own profiles
CREATE POLICY user_own_profile ON user_size_profile
  FOR ALL USING (auth.uid() = user_uid);
```

---

## Support & Troubleshooting

### Common Issues

**"Size not auto-selected on PDP"**
- Check: User has profile for product's category?
- Check: Product has size profiles assigned?
- Check: Recommendation confidence ≥60%?
- Check: Variant with recommended size exists?

**"Invalid measurements error"**
- Verify measurements within ranges (see MEASUREMENT_RANGES)
- Check for typos (e.g., 980cm instead of 98cm)
- Ensure all values are numbers, not strings

**"Admin can't create size profile"**
- Verify admin role in `users` table (`role = 'admin'`)
- Check for unique constraint violation (name + category must be unique)

**"Recommendation too confident/not confident"**
- Adjust tolerance_cm in fit_rules (default: 3cm)
- Adjust MIN_CONFIDENCE_THRESHOLD (default: 60)
- Review measurement accuracy (common measurements matter most)

---

## Contact & Feedback

**Implementation Team:** Crown & Crest Engineering  
**Phase:** 13 Foundation  
**Status:** Ready for UI Integration  
**Documentation Version:** 1.0.0  
**Last Updated:** December 2024
