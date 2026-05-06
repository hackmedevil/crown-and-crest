# ORDER SYSTEM AUDIT REPORT

**Date:** January 2026  
**Purpose:** Complete analysis of existing order system for clean redesign  
**Scope:** Database schema, order flows, payment processing, shipping, and admin management

---

## 1. DATABASE STRUCTURE

### Core Order Tables

#### `orders` Table
**Purpose:** Primary order tracking and payment records

**Fields:**
- `id` (uuid PK) - Internal order identifier
- `firebase_uid` (text) - Customer identifier from Firebase Auth
- `amount` (integer) - Total amount in paise (₹ 1 = 100 paise)
- `currency` (text) - Default: 'INR'
- `status` (order_status enum) - Order lifecycle state
- `razorpay_order_id` (text) - Razorpay order ID
- `razorpay_payment_id` (text) - Razorpay payment ID (after payment)
- `razorpay_signature` (text) - Payment verification signature
- `shipping_address` (JSONB) - Customer shipping address (flexible structure)
- `customer_email` (text) - Customer email
- `customer_phone` (text) - Customer phone number
- `payment_method` (text) - 'PREPAID' or 'COD'
- `is_cod` (boolean) - Cash on Delivery flag
- `cod_fee` (integer) - COD charges in paise
- `courier_name` (text) - Shipping courier name
- `tracking_id` (text) - AWB/tracking number
- `shipment_status` (text) - Shipping status from Shiprocket
- `estimated_delivery_date` (date)
- `actual_delivery_date` (date)
- `shiprocket_shipment_id` (text)
- `shiprocket_order_id` (text)
- `settlement_id` (text) - Razorpay settlement ID
- `settled_at` (timestamptz) - Settlement timestamp
- `refund_amount` (integer) - Total refunded amount
- `gateway_notes` (JSONB) - Full Razorpay webhook payloads
- `last_tracking_update` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `firebase_uid` - User's orders lookup
- `status` - Order status filtering
- `razorpay_order_id` - Payment reconciliation
- `created_at` - Chronological ordering
- `customer_email` - Email search
- `customer_phone` - Phone search

**Relationships:**
- Parent to `order_items`, `stock_reservations`, `order_disputes`, `order_refunds`

---

#### `order_items` Table
**Purpose:** Immutable snapshot of order line items with historical pricing

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid FK → orders, CASCADE)
- `product_id` (uuid FK → products, RESTRICT)
- `variant_id` (uuid FK → variants, RESTRICT)
- `product_name` (text) - Snapshot at purchase time
- `variant_label` (text) - E.g., "Size M / Black"
- `unit_price` (integer) - Price per unit in paise
- `quantity` (integer)
- `subtotal` (integer) - unit_price × quantity
- `created_at` (timestamptz)

**Indexes:**
- `order_id` - Get all items for an order
- `variant_id` - Variant sales history

**Creation Method:**
- Created by `create_order_items_snapshot(order_id, uid)` RPC
- Joins `cart_items` + `products` + `variants` for complete data
- **Guards:** Only creates if order status = 'PAID' AND reservations committed
- **Idempotent:** Won't duplicate if items already exist

**Evolution:**
- v1: Only had `variant_id`, `quantity`, `price_at_purchase`
- v2: Enhanced with full product snapshot for historical accuracy

---

#### `stock_reservations` Table
**Purpose:** Atomic inventory reservation for order atomicity (prevents overselling)

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid)
- `variant_id` (uuid FK → variants, RESTRICT)
- `user_uid` (text)
- `quantity` (integer)
- `status` (text) - 'reserved', 'released', 'committed'
- `reserved_at` (timestamptz)
- `expires_at` (timestamptz) - Default: 15 minutes from reservation

**Constraints:**
- UNIQUE(order_id, variant_id, status) - Prevents duplicate reservations
- Ensures `variants.stock_quantity >= 0` (never goes negative)

**Indexes:**
- `order_id` - Order's reservations
- `variant_id` - Variant reservation status
- `status` - Active reservations
- `expires_at` (partial on status='reserved') - Expiry cleanup

**Lifecycle:**
1. `reserve_stock(order_id, uid, items_json, ttl_seconds)` - Atomically reserves inventory
   - Decrements `variants.stock_quantity`
   - Creates reservation with 15-min TTL
   - All-or-nothing transaction
   - Raises 'OUT_OF_STOCK' if insufficient

2. `commit_reservation(order_id)` - Makes reservation permanent (after payment)
   - Changes status: 'reserved' → 'committed'
   - Raises exception if expired/missing

3. `release_reservation(order_id)` - Returns stock (on payment failure/cancellation)
   - Returns quantity to `variants.stock_quantity`
   - Changes status to 'released'

4. `release_expired_reservations()` - Cleanup cron job
   - Prevents inventory leakage from abandoned carts

---

#### `cart_items` Table
**Purpose:** Shopping cart persistence across sessions

**Fields:**
- `id` (uuid PK)
- `firebase_uid` (text) - Cart owner
- `variant_id` (uuid FK → variants, CASCADE)
- `product_id` (uuid FK → products, CASCADE)
- `quantity` (integer CHECK > 0)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `firebase_uid` - User's cart
- `product_id` - Product-based queries
- `variant_id` - Variant availability checks

**Note:** Migration uses ALTER (table existed before standardization)

---

### Payment & Financial Tables

#### `order_refunds` Table
**Purpose:** Track refund transactions from Razorpay

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid FK → orders, CASCADE)
- `razorpay_refund_id` (text UNIQUE)
- `razorpay_payment_id` (text)
- `amount` (integer) - Refund amount in paise
- `status` (text) - 'created', 'processed', 'failed', 'speed_changed'
- `refund_data` (JSONB) - Full Razorpay payload
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `order_id`, `status`, `created_at`

---

#### `order_disputes` Table
**Purpose:** Track payment disputes from Razorpay

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid FK → orders, CASCADE)
- `razorpay_payment_id` (text)
- `dispute_id` (text UNIQUE)
- `status` (text) - 'created', 'won', 'lost', 'closed', 'under_review', 'action_required'
- `amount` (integer)
- `reason_code` (text)
- `reason_description` (text)
- `dispute_data` (JSONB)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `order_id`, `status`, `created_at`

---

### Event & Logging Tables

#### `webhook_logs` Table
**Purpose:** Debug and audit all webhook events (Razorpay + Shiprocket)

**Fields:**
- `id` (uuid PK)
- `event_type` (text) - E.g., 'payment.captured', 'order.paid'
- `order_id` (uuid FK → orders, SET NULL)
- `payload` (JSONB) - Full webhook body
- `received_at` (timestamptz)
- `created_at` (timestamptz)

**Indexes:**
- `event_type`, `order_id`, `received_at`

---

#### `order_inventory_logs` Table
**Purpose:** Critical inventory/payment recovery logs

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid FK → orders, CASCADE)
- `user_uid` (text)
- `reservation_ids` (uuid[])
- `action` (text CHECK) - 'RECOVERY_ATTEMPT', 'RECOVERY_SUCCESS', 'RECOVERY_SKIPPED_ALREADY_COMMITTED', 'RECOVERY_FAILED', 'INCONSISTENCY_DETECTED'
- `error_reason` (text)
- `context` (JSONB)
- `created_at` (timestamptz)

**Indexes:**
- `order_id`, `created_at`

---

#### `abandoned_checkouts` Table
**Purpose:** Track abandoned checkout events for recovery campaigns

**Fields:**
- `id` (uuid PK)
- `order_id` (uuid FK → orders, SET NULL)
- `razorpay_order_id` (text)
- `customer_email` (text)
- `customer_phone` (text)
- `amount` (integer)
- `cart_items` (JSONB)
- `abandoned_at` (timestamptz)
- `recovery_sent` (boolean) - Email/SMS sent flag
- `recovered` (boolean) - Customer completed purchase
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `order_id`, `razorpay_order_id`, `customer_email`, `abandoned_at`

---

### Feedback & Learning Tables

#### `order_item_feedback` Table
**Purpose:** Collect post-purchase size/fit feedback

**Fields:**
- `id` (uuid PK)
- `order_item_id` (uuid FK → order_items, CASCADE) UNIQUE
- `user_uid` (uuid FK → auth.users, CASCADE)
- `size_profile_id` (uuid FK → size_profiles, SET NULL)
- `recommended_size` (varchar 50)
- `selected_size` (varchar 50)
- `feedback_type` (feedback_type enum) - 'TOO_SMALL', 'TOO_LARGE', 'FITS_WELL', 'QUALITY_ISSUE', 'OTHER'
- `notes` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Constraint:** One feedback per order item

**Indexes:**
- `order_item_id`, `user_uid`, `size_profile_id`, `feedback_type`

---

#### `sizebook_fit_stats` Table
**Purpose:** Learned adjustments for size recommendation AI

**Fields:**
- `id` (uuid PK)
- `size_profile_id` (uuid FK → size_profiles, CASCADE)
- `category` (varchar 50)
- `metric` (varchar 50) - 'chest_cm', 'waist_cm', etc.
- `total_feedback` (int)
- `fits_well_count`, `too_small_count`, `too_large_count`, `quality_issue_count`, `other_count` (int)
- `adjustment_cm` (decimal 5,2) - Learned offset in cm
- `adjustment_updated_at` (timestamptz)
- `previous_adjustment_cm` (decimal 5,2)
- `adjustment_reason` (varchar 200)
- `created_at`, `updated_at` (timestamptz)

**Constraint:** UNIQUE(size_profile_id, metric)

---

#### `sizebook_adjustment_history` Table
**Purpose:** Audit trail for size recommendation changes

**Fields:**
- `id` (uuid PK)
- `size_profile_id` (uuid FK → size_profiles, CASCADE)
- `metric` (varchar 50)
- `old_adjustment_cm` (decimal 5,2)
- `new_adjustment_cm` (decimal 5,2)
- `feedback_count_at_change` (int)
- `changed_by` (text) - 'SYSTEM' or user ID
- `reason` (text)
- `created_at` (timestamptz)

---

### Order Status Enum

**Type:** `order_status` (PostgreSQL ENUM)

**Values (Evolution):**

**Initial (20251216094709):**
- CREATED
- PAYMENT_PENDING
- PAID
- FAILED
- CANCELLED
- FULFILLMENT_PENDING
- SHIPPED
- DELIVERED

**Added Later:**
- NEEDS_REVIEW (20251216008) - Manual review required
- PAYMENT_AUTHORIZED (20260212000001) - Authorized but not captured
- DISPUTED (20260212000001) - Payment dispute filed
- REFUNDED (20260212000001) - Full/partial refund issued
- ABANDONED (20260212000000) - Abandoned checkout

**Additional Statuses (in code but not in DB enum):**
- COD_CONFIRMED - COD order confirmed by Razorpay
- OUT_FOR_DELIVERY - In final delivery stage
- RTO_IN_PROGRESS - Return to origin initiated

**Total:** 15+ statuses across database and application code

---

## 2. ORDER CREATION FLOW

### A. Cart Checkout Flow

#### Step 1: Cart Validation (`validateCartForCheckout`)
**File:** `src/lib/checkout/actions.ts`

**Process:**
1. Authenticate user (Firebase Auth)
2. Fetch cart items with full product/variant data
3. Call `get_variant_availability(variant_ids)` RPC
   - Returns reservation-aware availability
   - Accounts for active reservations by other users
4. Validate each cart item:
   - Check if variant is enabled
   - Check if sufficient stock available
   - Price calculation: `variant.price_override ?? product.base_price`
5. Return validated items with price snapshots + total amount

**Output:**
```typescript
{
  success: true,
  items: [{
    variant_id: string,
    sku: string,
    quantity: number,
    price_at_purchase: number,
    product_name: string
  }],
  totalAmount: number
}
```

---

#### Step 2: Order Creation (`POST /api/razorpay/order`)
**File:** `src/app/api/razorpay/order/route.ts`

**Process:**

1. **Auth Check:** Verify Firebase user session
2. **Rate Limit:** Check `order:create` rate limit (prevents spam)
3. **Fetch User Details:**
   - Get `email`, `phone` from `users` table
   - Fetch last `shipping_address` from previous orders (autofill)

4. **Validate Cart:** Call `validateCartForCheckout()`
   - Ensures stock availability
   - Captures current prices

5. **Create Internal Order:**
   ```sql
   INSERT INTO orders (
     firebase_uid,
     customer_email,
     customer_phone,
     amount,
     currency,
     status
   ) VALUES (..., 'CREATED')
   ```

6. **Reserve Stock:**
   ```sql
   SELECT reserve_stock(
     p_order_id := order.id,
     p_uid := user.uid,
     p_items := validated_items,
     p_ttl_seconds := 900  -- 15 minutes
   )
   ```
   - Atomically decrements `variants.stock_quantity`
   - Creates `stock_reservations` records with 15-min expiry
   - **Rolls back** if any item out of stock

7. **Create Razorpay Order:**
   ```javascript
   POST https://api.razorpay.com/v1/orders
   Body: {
     amount: totalAmount * 100,  // Convert to paise
     currency: 'INR',
     receipt: order.id,
     line_items_total: totalAmount * 100,
     line_items: [{
       sku, variant_id, price, quantity, name
     }],
     notes: {
       internal_order_id: order.id,
       customer_uid: user.uid,
       checkout_source: 'CART'
     }
   }
   ```
   - **Fallback logic:** Tries `RAZORPAY_KEY_ID` first, then `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - Retries only on 401 (auth failures)

8. **Update Order with Razorpay ID:**
   ```sql
   UPDATE orders SET
     razorpay_order_id = razorpay_order.id,
     status = 'PAYMENT_PENDING'
   WHERE id = order.id
   ```

9. **Return to Frontend:**
   ```json
   {
     "success": true,
     "orderId": "uuid",
     "razorpayOrderId": "order_xyz",
     "amount": 150000,
     "currency": "INR"
   }
   ```

**Error Handling:**
- Stock insufficient → Release reservation, delete order, return 409
- Razorpay API fail → Release reservation, delete order, return 500

---

### B. Buy Now Flow (Variant-Only Checkout)

**Trigger:** Request contains `variant_id` field

**Process (Simplified):**
1. Validate single variant availability
2. Check price from `variant.price_override` or `product.base_price`
3. Create internal order (status: CREATED)
4. Reserve stock (single item)
5. Create Razorpay order with `checkout_source: 'BUY_NOW'`
6. **Create order_items immediately** (before payment):
   ```sql
   INSERT INTO order_items (
     order_id, variant_id, quantity, price_at_purchase
   )
   ```
   - NOTE: This differs from cart flow where items are created AFTER payment

7. Return order IDs to frontend

---

### C. Frontend Payment (Magic Checkout)

**Library:** Razorpay JavaScript SDK

**Configuration:**
```javascript
Razorpay({
  key: NEXT_PUBLIC_RAZORPAY_KEY_ID,
  order_id: razorpayOrderId,
  
  // Magic Checkout: Razorpay collects address + payment
  prefill: {
    email: customerEmail,
    contact: customerPhone
  },
  
  handler: (response) => {
    // Payment success
    verifyPayment(response)
  },
  
  modal: {
    ondismiss: () => {
      // User closed modal
      cancelOrder(orderId)
    }
  }
})
```

**Magic Checkout Features:**
- Address collection (no need for custom address form)
- Payment method selection (cards, UPI, netbanking, wallets, COD)
- COD eligibility check (handled by Razorpay)
- Real-time validation
- PCI-DSS compliant

---

## 3. PAYMENT SYSTEM

### A. Payment Flow Architecture

**Provider:** Razorpay  
**Integration Type:** Magic Checkout (Address + Payment in one flow)

**Flow:**
1. Frontend creates Razorpay order → Razorpay SDK opens modal
2. Customer enters address + selects payment method in Razorpay UI
3. **Prepaid:** Razorpay processes payment → Webhook: `payment.captured`
4. **COD:** Razorpay confirms order → Webhook: `order.paid`
5. Backend verifies signature → Commits stock → Marks PAID/COD_CONFIRMED

---

### B. Webhook Handler (`POST /api/razorpay/webhook`)
**File:** `src/app/api/razorpay/webhook/route.ts`

**Security:**
1. Verify `x-razorpay-signature` header:
   ```javascript
   expectedSig = HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
   if (expectedSig !== signature) return 401
   ```

**Event Processing:**

#### Event: `payment.captured` (Prepaid Success)
1. Extract `internal_order_id` from `notes`
2. Commit stock reservation:
   ```sql
   SELECT commit_reservation(order_id)
   ```
3. Extract shipping address from `payment.customer_details.shipping_address`
4. Update order:
   ```sql
   UPDATE orders SET
     status = 'PAID',
     payment_method = 'PREPAID',
     is_cod = false,
     razorpay_payment_id = payment.id,
     shipping_address = address,
     customer_phone = phone,
     gateway_notes = event  -- Full webhook payload
   WHERE id = order_id
   AND status = 'PAYMENT_PENDING'  -- Guard against double processing
   ```
5. Send SMS: "Payment confirmed"

---

#### Event: `order.paid` (COD Confirmed)
1. Commit stock reservation
2. Extract COD fee from `order.cod_fee`
3. Update order:
   ```sql
   UPDATE orders SET
     status = 'COD_CONFIRMED',
     payment_method = 'COD',
     is_cod = true,
     cod_fee = cod_fee,
     shipping_address = address,
     gateway_notes = event
   WHERE id = order_id
   ```
4. Send SMS: "COD order confirmed with COD charges"

---

#### Event: `payment.authorized` (Not Captured)
- Update status to 'PAYMENT_AUTHORIZED'
- Don't commit reservations yet
- Await manual capture

---

#### Event: `payment.failed`
1. Release stock reservations:
   ```sql
   SELECT release_reservation(order_id)
   ```
2. Update order:
   ```sql
   UPDATE orders SET
     status = 'FAILED',
     gateway_notes = payload
   WHERE id = order_id
   ```
3. Send SMS: "Payment failed"

---

#### Event: `payment.dispute.created`
1. Insert into `order_disputes` table:
   ```sql
   INSERT INTO order_disputes (
     order_id, razorpay_payment_id, dispute_id,
     status, amount, reason_code, dispute_data
   )
   ```
2. Update order status to 'DISPUTED'

---

#### Event: `refund.processed`
1. Insert into `order_refunds` table:
   ```sql
   INSERT INTO order_refunds (
     order_id, razorpay_refund_id, razorpay_payment_id,
     amount, status, refund_data
   )
   ```
2. Update `orders.refund_amount += refund.amount`
3. If fully refunded, set status to 'REFUNDED'

---

#### Event: `settlement.processed`
- Update `orders.settlement_id` and `orders.settled_at`
- Track when funds deposited to bank account

---

### C. Payment Verification (`POST /api/razorpay/verify`)
**File:** `src/app/api/razorpay/verify/route.ts`

**Purpose:** Frontend-initiated verification (backup to webhooks)

**Process:**

1. **Fetch Order:** Verify user owns order
2. **Idempotency Check:**
   ```sql
   IF order.status = 'COMPLETED' THEN
     RETURN { success: true, message: 'Already completed' }
   ```
3. **Verify Signature:**
   ```javascript
   expectedSig = HMAC-SHA256(
     razorpay_order_id + "|" + razorpay_payment_id,
     RAZORPAY_KEY_SECRET
   )
   if (expectedSig !== razorpay_signature) {
     release_reservation(order_id)
     UPDATE orders SET status = 'FAILED'
     RETURN 400
   }
   ```

4. **CRITICAL SEQUENCE (Must Not Fail):**
   
   a. **Create Order Items Snapshot:**
   ```sql
   SELECT create_order_items_snapshot(order_id, uid)
   ```
   - FATAL if fails → Order cannot proceed
   - Prevents stock loss without order items

   b. **Commit Stock Reservations:**
   ```sql
   SELECT commit_reservation(order_id)
   ```
   - FATAL if fails → Order cannot proceed
   - Raises exception if reservation expired

   c. **Atomic Status Update:**
   ```sql
   UPDATE orders SET
     razorpay_payment_id = payment_id,
     razorpay_signature = signature,
     status = 'COMPLETED'
   WHERE id = order_id
   AND status = 'PAYMENT_PENDING'  -- Guard prevents double processing
   ```

5. **Clear Cart:**
   ```sql
   DELETE FROM cart_items WHERE firebase_uid = user.uid
   ```

6. **Revalidate Paths:**
   - `/cart` - Clear cart UI
   - `/orders` - Show new order

**Error States:**
- Signature invalid → Release stock, mark FAILED, return 400
- Reservation commit fails → Contact support (payment succeeded but stock issue)
- Order already processed → Return 409 (conflict)

---

### D. Order Cancellation (`POST /api/razorpay/cancel`)
**File:** `src/app/api/razorpay/cancel/route.ts`

**Trigger:** User closes Razorpay modal or payment timeout

**Process:**
1. Verify user owns order
2. Check order status:
   - If COMPLETED → Return "Cannot cancel"
   - If already CANCELLED → Return "Already cancelled"
   - Only cancel if PAYMENT_PENDING or CREATED

3. Release stock reservations:
   ```sql
   SELECT release_reservation(order_id)
   ```

4. Update order:
   ```sql
   UPDATE orders SET status = 'CANCELLED'
   WHERE id = order_id AND firebase_uid = user.uid
   ```

---

### E. Payment Method Support

**Prepaid Methods:**
- Credit/Debit Cards (Visa, Mastercard, RuPay, Amex)
- UPI (GooglePay, PhonePe, Paytm, BHIM)
- Net Banking (All major banks)
- Wallets (Paytm, PhonePe, Mobikwik)

**COD (Cash on Delivery):**
- Eligibility determined by Razorpay (based on pin code, order value)
- COD fee automatically calculated and added
- Status: `COD_CONFIRMED` after Razorpay validation

---

## 4. ORDER STATUS SYSTEM

### Status Lifecycle Map

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDER STATUS LIFECYCLE                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│   CREATED   │  ← Order record created, no payment yet
└──────┬──────┘
       │
       ↓ (Razorpay order created)
┌─────────────────┐
│ PAYMENT_PENDING │  ← User sees Razorpay modal
└───┬─────────┬───┘
    │         │
    │         └──────→ (User closes modal) ──→ CANCELLED
    │
    ↓ (Payment processed)
┌──────────────────┐
│  PREPAID BRANCH  │
└──────────────────┘
    │
    ├─→ PAYMENT_AUTHORIZED ─→ (manual capture) ─→ PAID
    │
    └─→ PAID ──┐
               │
┌──────────────┴───┐
│   COD BRANCH     │
└──────────────────┘
    │
    └─→ COD_CONFIRMED
               │
               │
        ┌──────┴──────┐
        │             │
        ↓             ↓ (Manual review needed)
FULFILLMENT_PENDING  NEEDS_REVIEW
        │             │
        │             └─→ (Approved) ─→ FULFILLMENT_PENDING
        │
        ↓ (Shiprocket shipment created)
    SHIPPED
        │
        ↓ (Shiprocket: out for delivery)
 OUT_FOR_DELIVERY
        │
        ├─→ DELIVERED ✓
        │
        └─→ RTO_IN_PROGRESS ─→ RTO_DELIVERED

┌──────────────────┐
│  FAILURE STATES  │
└──────────────────┘

FAILED ←── Payment processing failed
CANCELLED ←── User cancelled or timed out
ABANDONED ←── User closed modal, tracked separately
DISPUTED ←── Customer filed dispute with bank
REFUNDED ←── Full/partial refund issued
```

---

### Status Definitions

| Status | Meaning | Trigger | Next State |
|--------|---------|---------|------------|
| **CREATED** | Order record exists, no payment initiated | Order creation API | PAYMENT_PENDING |
| **PAYMENT_PENDING** | Awaiting payment from customer | Razorpay order created | PAID / COD_CONFIRMED / CANCELLED / FAILED |
| **PAYMENT_AUTHORIZED** | Payment authorized but not captured | Webhook: `payment.authorized` | PAID (manual capture) |
| **PAID** | Prepaid payment successful | Webhook: `payment.captured` | FULFILLMENT_PENDING / NEEDS_REVIEW |
| **COD_CONFIRMED** | COD order confirmed by Razorpay | Webhook: `order.paid` | FULFILLMENT_PENDING / NEEDS_REVIEW |
| **NEEDS_REVIEW** | Manual review required (fraud detection) | Admin action / Risk rules | FULFILLMENT_PENDING / CANCELLED |
| **FULFILLMENT_PENDING** | Awaiting shipment creation | Admin marks ready | SHIPPED |
| **SHIPPED** | Shipment created, in transit | Shiprocket: PICKED_UP / IN_TRANSIT | OUT_FOR_DELIVERY / RTO_IN_PROGRESS |
| **OUT_FOR_DELIVERY** | Out for final delivery | Shiprocket webhook | DELIVERED / RTO_IN_PROGRESS |
| **DELIVERED** | Successfully delivered ✓ | Shiprocket webhook | _(terminal)_ |
| **RTO_IN_PROGRESS** | Return to origin initiated | Shiprocket: RTO_INITIATED | RTO_DELIVERED |
| **RTO_DELIVERED** | Returned to origin | Shiprocket: RTO webhook | _(terminal)_ |
| **FAILED** | Payment failed | Webhook: `payment.failed` | _(terminal)_ |
| **CANCELLED** | User cancelled | User action / timeout | _(terminal)_ |
| **ABANDONED** | User abandoned checkout | Razorpay webhook | _(terminal)_ |
| **DISPUTED** | Payment dispute filed | Webhook: `payment.dispute.created` | DISPUTED (won/lost) |
| **REFUNDED** | Full/partial refund issued | Webhook: `refund.processed` | _(terminal)_ |

---

### Status Transition Rules

**Hard Rules (Enforced by Code):**
1. Cannot transition to PAID/COD_CONFIRMED if not in PAYMENT_PENDING
   - Enforced by: `WHERE status = 'PAYMENT_PENDING'` in UPDATE
2. Cannot cancel if already COMPLETED
3. Cannot commit reservation if order not PAID
4. Stock reservation must be committed BEFORE order_items created

**Business Logic:**
- Orders in NEEDS_REVIEW require admin approval
- RTO orders trigger automatic refund (if prepaid)
- Disputes freeze settlements until resolved

---

## 5. SHIPPING & FULFILLMENT

### A. Shiprocket Integration

**Provider:** Shiprocket (Third-party logistics)  
**Purpose:** Order fulfillment, courier booking, tracking

**Shiprocket Webhook Handler:**  
**File:** `src/app/api/shiprocket/webhook/route.ts`

**Security:**
- Validates `x-api-key` header against `SHIPROCKET_WEBHOOK_TOKEN`
- Verifies `x-shiprocket-signature` with HMAC-SHA256

---

### B. Shiprocket Event Handling

**Events Received:**
- SHIPMENT_CREATED
- PICKUP_SCHEDULED
- PICKED_UP
- IN_TRANSIT
- OUT_FOR_DELIVERY
- DELIVERED
- RTO_INITIATED
- RTO_DELIVERED

**Processing Logic:**

```javascript
switch (shiprocket_status) {
  case 'PICKED_UP':
  case 'IN_TRANSIT':
    newOrderStatus = 'SHIPPED'
    sendSMS('SHIPPED')
    break

  case 'OUT_FOR_DELIVERY':
    newOrderStatus = 'OUT_FOR_DELIVERY'
    sendSMS('OUT_FOR_DELIVERY')
    break

  case 'DELIVERED':
    newOrderStatus = 'DELIVERED'
    actual_delivery_date = today
    sendSMS('DELIVERED')
    break

  case 'RTO_INITIATED':
  case 'RTO_DELIVERED':
    newOrderStatus = 'RTO_IN_PROGRESS'
    sendSMS('RTO_INITIATED')
    break
}
```

**Database Updates:**
```sql
UPDATE orders SET
  shipment_status = shiprocket_status,
  status = newOrderStatus,
  courier_name = courier_name,
  tracking_id = awb,
  actual_delivery_date = delivery_date,
  last_tracking_update = NOW()
WHERE id = order_id
```

---

### C. Tracking Information

**Stored in `orders` table:**
- `tracking_id` (AWB number)
- `courier_name` (e.g., "Blue Dart", "Delhivery")
- `shiprocket_shipment_id`
- `shiprocket_order_id`
- `estimated_delivery_date`
- `actual_delivery_date`
- `last_tracking_update`

**Tracking URL Generation:**
```javascript
function getTrackingUrl(awb, courier) {
  // Returns courier-specific tracking URL
  // E.g., https://www.bluedart.com/tracking?awb=123456
}
```

---

### D. SMS Notifications

**Notification Types:**
- ORDER_CREATED
- PAYMENT_CONFIRMED
- COD_CONFIRMED
- ORDER_PACKED
- SHIPPED (with tracking link)
- OUT_FOR_DELIVERY
- DELIVERED
- RTO_INITIATED
- PAYMENT_FAILED
- CANCELLED

**SMS Provider:** (WhatsApp Business API integration detected)

**Template Example (SHIPPED):**
```
Your order {{order_id}} has been shipped via {{courier}}. 
Track: {{tracking_url}}
- Crown & Crest
```

**Storage:** `sms_notifications` table (tracks sent messages)

---

## 6. ADMIN ORDER MANAGEMENT

### A. Admin Interface Components

**Note:** No admin-specific order management routes found in `/src/app/admin/`  
**Likely Admin Tools:**

#### Order Status Actions Component
**File:** `src/components/admin/OrderStatusActions.tsx`

**Features:**
- Status dropdown for manual transitions
- Special handling for COD_CONFIRMED with high risk
- Bulk actions support

#### Order Filters Component
**File:** `src/components/admin/OrderFilters.tsx`

**Filters:**
- By status (all statuses supported)
- By date range
- By payment method (prepaid/COD)
- By customer email/phone

#### Bulk Actions Component
**File:** `src/components/admin/BulkActions.tsx`

**Operations:**
- Bulk status updates
- Bulk SMS sending
- Export orders

#### Send SMS Button Component
**File:** `src/components/admin/SendSMSButton.tsx`

**Triggers:**
- Manual SMS for any notification type
- Resend failed notifications

---

### B. Admin Queries (Supabase RLS Policies)

**Policy Pattern:**
```sql
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );
```

**Admin Capabilities:**
- View all orders (bypass user_uid filter)
- View all feedback
- View webhook logs
- View abandoned checkouts
- View disputes and refunds
- Manual status transitions
- Inventory recovery logs

---

### C. Order Analytics (Detected from Files)

**Payments Analytics Page:**  
**File:** `src/app/(admin)/admin/payments/page.tsx`

**Metrics:**
- Total payment volume
- Success rate
- Abandoned checkouts count
- Payment method breakdown
- COD vs Prepaid ratio

---

## 7. EVENTS & TIMELINE SYSTEM

### Event Logging Infrastructure

#### 1. Webhook Logs (`webhook_logs`)
**Captures:** All external webhook events  
**Sources:** Razorpay, Shiprocket  
**Data:** Full JSON payload + event type + timestamp  
**Retention:** Permanent (for audit)

#### 2. Order Inventory Logs (`order_inventory_logs`)
**Captures:** Critical inventory operations and recovery attempts  
**Data:**
- Reservation IDs affected
- Action type (RECOVERY_ATTEMPT, SUCCESS, FAILED, INCONSISTENCY)
- Error reasons
- Context (JSONB)

#### 3. Abandoned Checkout Tracking (`abandoned_checkouts`)
**Captures:** Users who started but didn't complete payment  
**Trigger:** Razorpay `order.abandoned` webhook  
**Data:**
- Cart items snapshot
- Customer contact info
- Abandonment timestamp
- Recovery email/SMS sent flag

#### 4. SMS Notifications Log (`sms_notifications`)
**Captures:** All SMS sent to customers  
**Data:**
- Phone number
- Message content
- Notification type
- Delivery status
- Order reference

---

### Event Timeline Reconstruction

**No dedicated `order_events` table, but timeline can be reconstructed from:**

1. **Order Status Changes:** `orders.updated_at` + `status` field
2. **Webhook Events:** `webhook_logs` filtered by `order_id`
3. **Payment Events:** `orders.gateway_notes` (full Razorpay payloads)
4. **Shipping Events:** `orders.last_tracking_update` + `shipment_status`
5. **Inventory Events:** `order_inventory_logs`
6. **SMS Events:** `sms_notifications`

**Recommended:** Create unified `order_timeline_view` joining these sources for admin UI

---

## 8. PROBLEMS IN CURRENT SYSTEM

### 🔴 Critical Issues

#### 1. **Order Status Enum Fragmentation**
**Problem:** 
- Database enum has 8 core statuses (20251216094709)
- Migrations added 5 more over time (NEEDS_REVIEW, PAYMENT_AUTHORIZED, DISPUTED, REFUNDED, ABANDONED)
- TypeScript types define 11 statuses
- Code uses additional statuses not in DB enum: `COD_CONFIRMED`, `OUT_FOR_DELIVERY`, `RTO_IN_PROGRESS`

**Impact:**
- Type mismatches between DB and application
- Database constraints may reject valid status updates
- Difficult to trace which statuses are actually used

**Evidence:**
- `COD_CONFIRMED` used in webhook but not in order_status enum
- Shiprocket handler sets `OUT_FOR_DELIVERY` and `RTO_IN_PROGRESS` but these aren't enum values

---

#### 2. **Inconsistent Order Items Creation**
**Problem:**
- **Cart Flow:** Order items created AFTER payment via `create_order_items_snapshot` RPC
- **Buy Now Flow:** Order items created BEFORE payment via direct INSERT

**Impact:**
- Different data guarantees for different checkout flows
- Buy Now orders have items even if payment fails
- Inconsistent error recovery

**Risk:**
- Buy Now failures leave orphaned order_items (cleanup not performed)

---

#### 3. **"COMPLETED" Status Not in Enum**
**Problem:**
- Verify endpoint updates status to 'COMPLETED'
- Initial migration (20251216007) used 'COMPLETED' status
- Current enum (20251216094709) has 'PAID' instead

**Impact:**
- Database rejects frontend-initiated completion
- Webhook uses 'PAID', frontend uses 'COMPLETED'
- Dual status system without clear mapping

---

#### 4. **No Unified Order Timeline**
**Problem:**
- Events scattered across 5+ tables
- No single source of truth for "what happened when"
- Admin must manually correlate webhook_logs + sms_notifications + order updates

**Impact:**
- Difficult to debug payment issues
- No audit trail for status changes
- Customer support can't see full order history

---

#### 5. **Address Data Stored as JSONB**
**Problem:**
- No schema enforcement on `shipping_address` field
- Different webhooks may provide different address structures
- No validation of required fields (pin code, state, etc.)

**Impact:**
- Shiprocket integration may fail if address incomplete
- No way to query orders by city/state (without JSONB operators)
- Data quality issues

---

### 🟡 Medium Issues

#### 6. **Duplicate Stock Reservation Logic**
**Problem:**
- Stock reservation created in order creation
- Order items also store quantity
- No constraint ensuring reservation quantity = order_items quantity

**Risk:**
- Desynchronization between reservations and line items
- Inventory leaks if quantities mismatch

---

#### 7. **Magic Checkout Address Extraction Logic**
**Problem:**
- Address extracted from webhooks using nested conditionals
- No validation that extracted address is complete
- Function `extractShippingAddress()` returns `ShippingAddress | null`
- No handling of null case → orders may have null shipping_address

**Impact:**
- Orders without shipping address cannot be fulfilled
- No UI warning to admin about incomplete orders

---

#### 8. **SMS Failure Handling**
**Problem:**
- SMS failures logged but not retried
- Wrapped in try-catch that swallows errors
- Customer may not receive critical updates (tracking, delivery)

**Impact:**
- Silent failures
- No notification queue for retries

---

#### 9. **Razorpay Credential Fallback Complexity**
**Problem:**
- Function `getRazorpayCredentialCandidates()` tries 2 different API keys
- Retry logic only for 401 errors
- No logging of which credential succeeded

**Risk:**
- Difficult to debug API failures
- May mask configuration errors

---

#### 10. **No Rate Limiting on Webhook Endpoints**
**Problem:**
- Order creation has rate limiting
- Webhook endpoints (Razorpay, Shiprocket) do not

**Risk:**
- Webhook replay attacks
- DOS via fake webhooks (if signature validation bypassed)

---

### 🟢 Minor Issues

#### 11. **Abandoned Checkout ABANDONED Status**
**Problem:**
- Migration adds 'ABANDONED' to order_status enum
- Regular orders use CANCELLED for user-abandoned carts
- Separate `abandoned_checkouts` table exists

**Confusion:**
- Is ABANDONED status for orders or checkouts?
- Duplicate tracking of abandoned sessions

---

#### 12. **Inconsistent Timestamp Fields**
**Problem:**
- Some tables use `created_at` + `updated_at`
- Some only have `created_at`
- `orders` has `created_at`, `updated_at`, `last_tracking_update`

**Impact:**
- Difficulty tracking when status last changed vs when order created

---

#### 13. **No Soft Deletes**
**Problem:**
- All FKs use CASCADE or SET NULL
- No audit trail for deleted data

**Risk:**
- Accidentally deleting order deletes all items, reservations, logs

---

#### 14. **COD Fee Stored in Orders, Not Order Items**
**Problem:**
- `cod_fee` is order-level field
- Not represented as line item

**Impact:**
- Invoices must manually add COD fee
- Total calculation logic scattered

---

## 9. WHAT TO KEEP

### ✅ Strong Components (Keep & Improve)

#### 1. **Stock Reservation System**
**Why Keep:**
- Atomic inventory management prevents overselling
- TTL expiry (15 minutes) balances conversion vs availability
- RPC functions are well-designed
- Handles concurrent reservations correctly

**Improvements Needed:**
- Add monitoring for expired reservations
- Dashboard for admins to view active reservations

---

#### 2. **Razorpay Magic Checkout Integration**
**Why Keep:**
- PCI-DSS compliance handled by Razorpay
- Address collection built-in
- COD eligibility automated
- Supports all major Indian payment methods

**Improvements Needed:**
- Better error messaging
- Retry logic for API failures

---

#### 3. **Webhook-Based Order Updates**
**Why Keep:**
- Asynchronous, reliable
- Signature verification prevents tampering
- Stores full payloads for audit

**Improvements Needed:**
- Add idempotency keys
- Implement replay protection
- Add dead-letter queue for failed webhooks

---

#### 4. **Order Items Snapshot (for Cart Flow)**
**Why Keep:**
- Immutable historical pricing
- Join-based snapshot from cart ensures accuracy
- Idempotent RPC prevents duplicates

**Needs Fix:**
- Apply same snapshot logic to Buy Now flow

---

#### 5. **Shiprocket Webhook Integration**
**Why Keep:**
- Automated tracking updates
- SMS notifications on delivery milestones
- Supports RTO (return to origin) flows

**Improvements Needed:**
- Add fallback polling for missed webhooks
- Track delivery SLAs

---

#### 6. **Feedback & Fit Learning System**
**Why Keep:**
- Innovative size recommendation AI
- Post-purchase feedback loop
- Statistical adjustment tracking

**Keep As-Is:** Well-designed schema

---

#### 7. **JSONB Gateway Notes**
**Why Keep:**
- Full payload storage enables post-hoc debugging
- Flexible for different webhook versions

**Expansion:**
- Also store raw request/response for order creation API

---

#### 8. **Cart Validation Before Checkout**
**Why Keep:**
- Prevents race conditions (price changes, stock outs)
- Reservation-aware availability check
- Clear error messages

**Keep & Document:** Critical for order integrity

---

## 10. WHAT TO REMOVE / REDESIGN

### 🗑️ Components to Remove

#### 1. **Duplicate Status Fields**
**Remove:**
- Choose one: Database enum OR application constants
- Eliminate COD_CONFIRMED (merge into PAID with `is_cod` flag)
- Remove unused ABANDONED status from order_status enum (use abandoned_checkouts table only)

**Rationale:**
- Single source of truth for allowed statuses
- Reduces type mismatches

---

#### 2. **Buy Now Separate Flow**
**Redesign:**
- Unify with cart flow
- Buy Now should create temporary cart item, then use standard flow

**Rationale:**
- Eliminates duplicate order creation logic
- Consistent error handling

---

#### 3. **JSONB Shipping Address**
**Replace:**
- Create `order_addresses` table with structured fields:
  - full_name, address_line1, address_line2, city, state, pin_code, country, phone
  - Enforce required fields with NOT NULL

**Rationale:**
- Enables querying by location
- Validates address completeness before Shiprocket
- Normalized data structure

---

#### 4. **Scattered Event Logs**
**Consolidate:**
- Create unified `order_events` table:
  - order_id, event_type, actor (user/system/webhook), metadata (JSONB), created_at

**Migrate:**
- Webhook logs → order_events
- Inventory logs → order_events
- SMS logs → order_events
- Status changes → order_events

**Rationale:**
- Single timeline view
- Easier auditing

---

#### 5. **SMS Error Swallowing**
**Redesign:**
- Create SMS queue table with retry count
- Background job processes failed SMS
- Admin dashboard for blocked numbers

**Rationale:**
- Reliability

---

#### 6. **Manual Status Transitions (Admin)**
**Add Guardrails:**
- Status transition validation (can't go from DELIVERED to PAYMENT_PENDING)
- Require reason for manual status changes
- Log actor for all transitions

**Rationale:**
- Prevents admin errors
- Audit compliance

---

### 🔄 Components to Redesign

#### 7. **Order Creation Error Handling**
**Current:** Try-catch with order deletion on failure  
**Redesign:** 
- Use database transactions properly
- Don't create order until all validations pass
- Rollback reservation automatically via transaction

**Rationale:**
- Cleaner error states

---

#### 8. **Payment Verification Sequence**
**Current:** Frontend calls verify after webhook  
**Redesign:**
- Webhook is primary source of truth
- Frontend verify is fallback only
- Detect webhook-vs-verify race condition

**Rationale:**
- Eliminates double-processing risk

---

#### 9. **COD Fee Representation**
**Redesign:**
- Add COD fee as virtual line item in order_items
- item_type field: 'PRODUCT', 'COD_FEE', 'SHIPPING_FEE', 'DISCOUNT'

**Rationale:**
- Invoice generation simpler
- Total calculation explicit

---

## 11. FINAL SYSTEM MAP

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                   CROWN & CREST ORDER SYSTEM                    ┃
┃                        ARCHITECTURE MAP                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│   Product   │──────▶│  Cart Page  │──────▶│   Checkout   │
│  Details    │       │ (cart_items)│       │    Button    │
└─────────────┘       └─────────────┘       └───────┬──────┘
                                                     │
                      ┌─────────────┐               │
                      │  Buy Now    │───────────────┘
                      │   Button    │
                      └─────────────┘

                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       ORDER CREATION API                         │
│                 POST /api/razorpay/order                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ↓                           ↓
        [Validate Cart]           [Validate Variant]
                │                           │
                ↓                           ↓
        [Create Order]                [Create Order]
          status: CREATED                   │
                │                           │
                └─────────────┬─────────────┘
                              │
                              ↓
                    [Reserve Stock (RPC)]
              ┌────────────────────────────────┐
              │ stock_reservations:            │
              │   status = 'reserved'          │
              │   expires_at = +15 min         │
              │ variants.stock_quantity -= qty │
              └────────────────────────────────┘
                              │
                              ↓
                    [Create Razorpay Order]
              ┌────────────────────────────────┐
              │ POST razorpay.com/v1/orders    │
              │ Returns: razorpay_order_id     │
              └────────────────────────────────┘
                              │
                              ↓
                [Update Order: PAYMENT_PENDING]
                              │
                              ↓
              Return { orderId, razorpayOrderId }
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       RAZORPAY MODAL                            │
│                  (Magic Checkout UI)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         [User Pays]   [User Cancels]  [Timeout]
                │             │             │
                │             ↓             ↓
                │     POST /api/razorpay/cancel
                │             │
                │      [Release Stock]
                │      status = 'CANCELLED'
                │
                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RAZORPAY WEBHOOKS                           │
└─────────────────────────────────────────────────────────────────┘
                │
    ┌───────────┼───────────────┐
    │           │               │
    ↓           ↓               ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│payment.  │ │ order.   │ │payment.  │
│captured  │ │ paid     │ │ failed   │
│(Prepaid) │ │ (COD)    │ │          │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │             │
     ↓            ↓             ↓
[Commit     [Commit      [Release
 Stock]      Stock]       Stock]
     │            │             │
     ↓            ↓             ↓
[Update     [Update      [Update
 PAID]       COD_         FAILED]
             CONFIRMED]
     │            │             │
     └────────┬───┴─────────────┘
              │
              ↓
      [Send SMS Notification]
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PAYMENT VERIFICATION (Fallback)                 │
│                 POST /api/razorpay/verify                       │
└─────────────────────────────────────────────────────────────────┘
              │
              ↓
      [Verify Signature]
              │
              ↓
      [create_order_items_snapshot]  ← Critical: Must succeed
      ┌──────────────────────────┐
      │ Joins cart + products +  │
      │ variants → order_items   │
      └──────────────────────────┘
              │
              ↓
      [commit_reservation]           ← Critical: Must succeed
              │
              ↓
      [Update: status = COMPLETED]
      [Clear Cart]
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FULFILLMENT WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘
              │
      ┌───────┴────────┐
      │                │
      ↓                ↓
[Admin Reviews]  [Auto-Approve]
      │                │
      └────────┬───────┘
               │
               ↓
     [status: FULFILLMENT_PENDING]
               │
               ↓
     [Create Shiprocket Shipment]
     ┌────────────────────────────┐
     │ POST shiprocket.com/api    │
     │ Books courier, prints AWB  │
     └────────────────────────────┘
               │
               ↓
     [status: SHIPPED]
               │
               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     SHIPROCKET WEBHOOKS                          │
└─────────────────────────────────────────────────────────────────┘
               │
     ┌─────────┼──────────────┐
     │         │              │
     ↓         ↓              ↓
[PICKED_UP] [IN_TRANSIT] [OUT_FOR_DELIVERY]
     │         │              │
     └─────────┼──────────────┘
               │
               ↓
     [Update shipment_status]
     [Send Tracking SMS]
               │
     ┌─────────┴─────────┐
     │                   │
     ↓                   ↓
[DELIVERED]        [RTO_INITIATED]
     │                   │
     ↓                   ↓
[status:            [status:
 DELIVERED]          RTO_IN_PROGRESS]
     │                   │
     ↓                   ↓
[Send SMS]          [Process Refund]

┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                            │
└─────────────────────────────────────────────────────────────────┘

Core Tables:
┌────────────────┐
│    orders      │◀─────────┐
│  (16 statuses) │          │
└───────┬────────┘          │
        │                   │
        ├──▶ order_items ───┘
        │    (snapshot)
        │
        ├──▶ stock_reservations
        │    (atomic inventory)
        │
        ├──▶ order_disputes
        │    (payment disputes)
        │
        ├──▶ order_refunds
        │    (refund tracking)
        │
        └──▶ order_item_feedback
             (size learning)

Event Logs:
┌─────────────────┐
│ webhook_logs    │ ← All webhook events
└─────────────────┘
┌─────────────────┐
│order_inventory_ │ ← Stock recovery logs
│     logs        │
└─────────────────┘
┌─────────────────┐
│ abandoned_      │ ← Abandoned cart tracking
│  checkouts      │
└─────────────────┘
┌─────────────────┐
│sms_notifications│ ← SMS delivery logs
└─────────────────┘

Analytics Tables:
┌─────────────────┐
│sizebook_fit_    │ ← Fit learning metrics
│     stats       │
└─────────────────┘
┌─────────────────┐
│sizebook_        │ ← Adjustment history
│adjustment_      │
│   history       │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Razorpay   │   │  Shiprocket │   │  WhatsApp   │
│  (Payment)  │   │  (Shipping) │   │  Business   │
│             │   │             │   │   (SMS)     │
└─────────────┘   └─────────────┘   └─────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      KEY FLOWS SUMMARY                          │
└─────────────────────────────────────────────────────────────────┘

1. CART CHECKOUT:
   Cart → Validate → Create Order → Reserve Stock → Razorpay →
   Webhook → Commit → Snapshot Items → Clear Cart → PAID

2. BUY NOW:
   Variant → Create Order → Reserve Stock → Create Items →
   Razorpay → Webhook → Commit → PAID

3. PAYMENT FAILURE:
   Webhook (failed) → Release Stock → Update FAILED → SMS

4. CANCELLATION:
   User Cancels → Release Stock → Update CANCELLED

5. FULFILLMENT:
   PAID → Admin Review → Create Shipment → SHIPPED →
   Shiprocket Updates → DELIVERED

6. RETURN (RTO):
   Delivery Failed → RTO_INITIATED → RTO_DELIVERED →
   Process Refund

7. DISPUTE:
   Customer Dispute → Webhook → Create Dispute Record →
   Update DISPUTED → Admin Resolution

┌─────────────────────────────────────────────────────────────────┐
│                    CRITICAL INVARIANTS                           │
└─────────────────────────────────────────────────────────────────┘

✓ Stock never negative (enforced by CHECK constraint)
✓ Reservation must be committed before order_items created (Cart flow)
✓ Order status = PAYMENT_PENDING guard prevents double-processing
✓ Webhook signature verified before any database changes
✓ Full payload stored in gateway_notes for audit
✓ SMS failures don't block order processing
✓ Reservations expire after 15 minutes
```

---

## SUMMARY

### System Strengths
1. **Atomic stock management** prevents overselling
2. **Webhook-driven architecture** ensures reliability
3. **Magic Checkout integration** simplifies frontend
4. **Comprehensive logging** enables debugging
5. **Fit learning system** innovates on size recommendations

### Critical Issues
1. **Status fragmentation** - 15+ statuses across DB/code with inconsistent usage
2. **Dual order creation flows** - Cart vs Buy Now have different guarantees
3. **Address data quality** - JSONB without validation
4. **No unified timeline** - Events scattered across tables
5. **Silent SMS failures** - No retry mechanism

### Redesign Priority
1. **HIGH:** Unify order status system (single enum, eliminate duplicates)
2. **HIGH:** Normalize shipping addresses into structured table
3. **HIGH:** Consolidate event logs into single `order_events` table
4. **MEDIUM:** Merge Buy Now into standard cart flow
5. **MEDIUM:** Add SMS retry queue
6. **LOW:** Remove unused ABANDONED status from orders

### Architecture Quality: 7.5/10
- Strong foundation with stock reservations and webhooks
- Good separation of concerns
- Needs cleanup of technical debt accumulated from rapid iterations
- Ready for redesign with clear path forward

---

**END OF AUDIT REPORT**
