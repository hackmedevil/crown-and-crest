# PRODUCT PAGE REDESIGN - IMPLEMENTATION QUICK START

**Last Updated:** March 8, 2026  
**Status:** Ready to Implement  
**Estimated Time:** 4-6 hours for full integration

---

## 🚀 5-MINUTE OVERVIEW

You've been given a **complete Product Detail Page (PDP) redesign** with:
- ✅ 8 React components (ProductGallery, ProductInfo, PurchaseBox, etc.)
- ✅ Complete database schema (9 tables, 8 RPC functions)
- ✅ 4 API endpoints (reviews, frequently-bought, similar, recently-viewed)
- ✅ Full analytics tracking
- ✅ SEO schema markup
- ✅ Mobile-responsive design

**Your job:** Integrate into the existing product page.

---

## STEP 1: DATABASE SETUP (15 minutes)

### 1.1 Run Migration
```bash
# Navigate to project root
cd "c:\Users\user\Desktop\Web App\crown-and-crest"

# Push migration to Supabase
supabase db push --linked
```

### 1.2 Verify Tables Created
In Supabase dashboard SQL editor, run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('product_reviews', 'product_combinations', 'recently_viewed_products');
```

Should see: `product_reviews`, `review_helpfulness`, `product_combinations`, `recently_viewed_products`, `product_questions`

### 1.3 Test RPC Functions
```sql
-- Test get_product_detail
SELECT * FROM get_product_detail('your-product-uuid');

-- Test get_rating_distribution
SELECT * FROM get_rating_distribution('your-product-uuid');

-- Test get_frequently_bought_together
SELECT * FROM get_frequently_bought_together('your-product-uuid', 4);
```

---

## STEP 2: COMPONENT SETUP (30 minutes)

### 2.1 Copy Components
All components are in reference docs. Create files:

```
src/components/
├── ProductGallery.tsx
├── ProductInfo.tsx
├── PurchaseBox.tsx
├── TrustSignals.tsx
├── ReviewsSection.tsx
├── FrequentlyBoughtTogether.tsx
├── SimilarProducts.tsx
├── RecentlyViewedProducts.tsx
└── ProductDescription.tsx
```

### 2.2 Component Dependencies
Each component requires:

**ProductGallery:**
- React hooks (useState)
- Cloudinary utils (optimize images)
- Mobile detection hook

**ProductInfo:**
- Formatter utils (price display)
- Rating stars component

**PurchaseBox:**
- Form validation
- Cart context or API call
- Analytics tracking

**ReviewsSection:**
- Form submission handling
- Star rating component
- Date formatting

---

## STEP 3: CREATE API ENDPOINTS (30 minutes)

### 3.1 Endpoint: `GET /api/products/[id]/frequently-bought`

File: `src/app/api/products/[id]/frequently-bought/route.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    const { data, error } = await supabase.rpc(
      'get_frequently_bought_together',
      { product_id: params.id, limit: 4 }
    )
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      products: data || []
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### 3.2 Endpoint: `GET /api/products/[id]/similar`

File: `src/app/api/products/[id]/similar/route.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // First get product category
    const { data: product } = await supabase
      .from('products')
      .select('category_id')
      .eq('id', params.id)
      .single()
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }
    
    // Get similar products
    const { data } = await supabase.rpc(
      'get_similar_products',
      { 
        product_id: params.id,
        category_id: product.category_id,
        limit: 8
      }
    )
    
    return NextResponse.json({
      success: true,
      products: data || []
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### 3.3 Endpoint: `GET /api/products/[id]/reviews`

File: `src/app/api/products/[id]/reviews/route.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sort = searchParams.get('sort') || 'recent'
    
    const supabase = createServerComponentClient({ cookies })
    
    // Get reviews
    let query = supabase
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', params.id)
    
    if (sort === 'helpful') {
      query = query.order('helpful_count', { ascending: false })
    } else if (sort === 'rating') {
      query = query.order('rating', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }
    
    const { data: reviews, count } = await query
      .range((page - 1) * limit, page * limit - 1)
    
    // Get rating distribution
    const { data: distribution } = await supabase.rpc(
      'get_rating_distribution',
      { product_id: params.id }
    )
    
    return NextResponse.json({
      success: true,
      reviews: reviews || [],
      ratingDistribution: distribution || [],
      pagination: {
        page,
        limit,
        total: count || 0
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // Check auth
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { rating, title, review_text, images } = body
    
    // Validate
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be 1-5' },
        { status: 400 }
      )
    }
    
    if (!review_text || review_text.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Review must be at least 10 characters' },
        { status: 400 }
      )
    }
    
    // Check if user has purchased this product
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('product_id', params.id)
      .limit(1)
    
    const verified_purchase = (orders?.length || 0) > 0
    
    // Insert review
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id: params.id,
        user_id: session.user.id,
        rating,
        title: title || 'No title',
        review_text,
        images: images || [],
        verified_purchase
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      review: data
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### 3.4 Endpoint: `GET & POST /api/products/recently-viewed`

File: `src/app/api/products/recently-viewed/route.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({
        success: true,
        products: []
      })
    }
    
    const { data } = await supabase.rpc(
      'get_recently_viewed',
      { user_id: session.user.id, limit: 8 }
    )
    
    return NextResponse.json({
      success: true,
      products: data || []
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({
        success: true,
        message: 'Not authenticated, view not logged'
      })
    }
    
    const body = await request.json()
    const { productId, sessionId } = body
    
    await supabase.rpc('log_product_view', {
      user_id: session.user.id,
      product_id: productId,
      session_id: sessionId
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

---

## STEP 4: INTEGRATE INTO PRODUCT PAGE (45 minutes)

### 4.1 Update Product Page Layout

File: `src/app/(storefront)/product/[slug]/page.tsx`

```typescript
import { ProductGallery } from '@/components/ProductGallery'
import { ProductInfo } from '@/components/ProductInfo'
import { PurchaseBox } from '@/components/PurchaseBox'
import { TrustSignals } from '@/components/TrustSignals'
import { ProductDescription } from '@/components/ProductDescription'
import { ReviewsSection } from '@/components/ReviewsSection'
import { FrequentlyBoughtTogether } from '@/components/FrequentlyBoughtTogether'
import { SimilarProducts } from '@/components/SimilarProducts'
import { RecentlyViewedProducts } from '@/components/RecentlyViewedProducts'

export default async function ProductPage({ params }) {
  // Fetch product data
  const product = await getProduct(params.slug)
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
      {/* Left: Gallery */}
      <ProductGallery 
        images={product.images}
        productName={product.name}
        variantImages={product.variants?.map(v => v.images)}
      />
      
      {/* Right: Product Info */}
      <div className="space-y-6">
        <ProductInfo
          name={product.name}
          price={product.base_price}
          originalPrice={product.compare_price}
          rating={product.average_rating}
          reviewCount={product.review_count}
          inStock={product.stock_quantity > 0}
          stockCount={product.stock_quantity}
        />
        
        <PurchaseBox
          productId={product.id}
          product={product}
        />
        
        <TrustSignals />
      </div>
    </div>
    
    {/* Product Details - Full Width */}
    <div className="mt-12">
      <ProductDescription
        description={product.description}
        materials={product.materials}
        careInstructions={product.care_instructions}
        sizeGuide={product.size_guide}
        shippingPolicy={product.shipping_policy}
      />
    </div>
    
    {/* Reviews - Full Width */}
    <div className="mt-12">
      <ReviewsSection productId={product.id} />
    </div>
    
    {/* Upsell - Full Width */}
    <div className="mt-12">
      <FrequentlyBoughtTogether productId={product.id} />
    </div>
    
    {/* Similar Products - Full Width */}
    <div className="mt-12">
      <SimilarProducts productId={product.id} />
    </div>
    
    {/* Recently Viewed - Full Width */}
    <div className="mt-12">
      <RecentlyViewedProducts />
    </div>
  )
}
```

### 4.2 Add Analytics Tracking

In `src/lib/analytics/events.ts`:

```typescript
export function trackViewProduct(product: Product) {
  if (typeof window === 'undefined') return
  
  gtag.event('view_item', {
    currency: 'INR',
    value: product.base_price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category,
        price: product.base_price
      }
    ]
  })
}

export function trackAddToCart(
  productId: string,
  name: string,
  price: number,
  quantity: number,
  category: string,
  cartValue: number
) {
  if (typeof window === 'undefined') return
  
  gtag.event('add_to_cart', {
    currency: 'INR',
    value: price * quantity,
    items: [
      {
        item_id: productId,
        item_name: name,
        item_category: category,
        price,
        quantity
      }
    ]
  })
}

export function trackAddReview(productId: string, rating: number) {
  gtag.event('custom_event', {
    event_category: 'product_reviews',
    event_label: `rating_${rating}`,
    product_id: productId
  })
}
```

---

## STEP 5: TESTING (1 hour)

### 5.1 Database Testing
```sql
-- Test each RPC function
SELECT * FROM get_product_detail('test-product-id');
SELECT * FROM get_rating_distribution('test-product-id');
SELECT * FROM get_frequently_bought_together('test-product-id', 4);
```

### 5.2 API Testing
```bash
# Test frequently-bought endpoint
curl http://localhost:3000/api/products/[product-id]/frequently-bought

# Test reviews endpoint
curl http://localhost:3000/api/products/[product-id]/reviews?page=1&limit=10

# Test add review
curl -X POST http://localhost:3000/api/products/[product-id]/reviews \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "title": "Great!", "review_text": "Love this product!"}'
```

### 5.3 UI Testing
- [ ] Product gallery zooms and swipes
- [ ] Size/color variants update images
- [ ] Add to cart button works
- [ ] Review form submits
- [ ] Rating distribution displays correctly
- [ ] Mobile layout responsive
- [ ] Bundle add-to-cart works
- [ ] Recently viewed populates

### 5.4 Performance Check
```bash
npm run build
npm run start

# In Chrome: Lighthouse > Generate report
# Target score: 85+
```

---

## STEP 6: EDGE CASES & ERROR HANDLING

### 6.1 Handle Missing Data
```typescript
// If no reviews exist
if (!reviews || reviews.length === 0) {
  return <p>Be the first to review this product</p>
}

// If product not found
if (!product) {
  return redirect('/products')
}
```

### 6.2 Handle Auth States
```typescript
// Reviews form - require login
if (!session) {
  return <LoginPrompt message="Sign in to write a review" />
}

// Recently viewed - gracefully empty if not authenticated
if (!session) {
  return null // Don't show section
}
```

### 6.3 API Error Handling
```typescript
try {
  const res = await fetch(`/api/products/${id}/reviews`)
  if (!res.ok) throw new Error('Failed to load reviews')
  const { reviews } = await res.json()
} catch (error) {
  console.error(error)
  return <ErrorMessage message="Failed to load reviews" />
}
```

---

## STEP 7: DEPLOYMENT CHECKLIST

- [ ] All components created and imported
- [ ] All API endpoints working
- [ ] Database migration successful
- [ ] Analytics events firing
- [ ] Mobile responsive tested
- [ ] All forms submit correctly
- [ ] Error handling in place
- [ ] Performance targets met
- [ ] SEO meta tags added
- [ ] Staging deployment passed QA
- [ ] Production monitoring alerts set up

---

## COMMON ISSUES & SOLUTIONS

### Issue: "product_reviews table not found"
**Solution:** Run `supabase db push --linked` to apply migration

### Issue: API returns null for frequently_bought
**Solution:** Ensure `product_combinations` table has data. Run:
```sql
-- Seed with sample data
INSERT INTO product_combinations VALUES (...);
```

### Issue: Reviews form not submitting
**Solution:** Check authentication status. Add auth check:
```typescript
const session = await getServerSession()
if (!session?.user) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
}
```

### Issue: Mobile gallery not swiping
**Solution:** Ensure touch event listeners are attached to gallery container

### Issue: Lighthouse score low
**Solution:** 
- Lazy load below-fold components
- Optimize images via Cloudinary
- Code split components
- Enable caching headers

---

## TIME ESTIMATES

| Task | Time | Difficulty |
|------|------|------------|
| Database setup | 15 min | Easy |
| API endpoints | 30 min | Medium |
| Component integration | 45 min | Medium |
| Testing | 60 min | Medium |
| Optimization | 30 min | Hard |
| **Total** | **3-4 hours** | - |

---

## SUPPORT & DOCUMENTATION

- **Database Schema:** See PDP_REDESIGN_COMPLETE.md section 1
- **Component Props:** See PDP_REDESIGN_COMPLETE.md section 2
- **API Documentation:** See PDP_REDESIGN_COMPLETE.md section 3
- **Analytics:** See PDP_REDESIGN_COMPLETE.md section 4

---

**Next step:** Start with Step 1 (Database Setup) and work through sequentially. ✅
