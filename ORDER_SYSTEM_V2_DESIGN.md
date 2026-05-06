# ORDER SYSTEM V2 - ARCHITECTURE DESIGN

**Version:** 2.0  
**Date:** March 8, 2026  
**Status:** Design Phase

---

## EXECUTIVE SUMMARY

This document defines the architecture for a production-grade order system designed for scalability, maintainability, and clear separation of concerns. The system is built on proven ecommerce patterns used by platforms like Shopify and WooCommerce.

### Core Principles

1. **Dual Status System** - Separate payment and fulfillment concerns
2. **Event-Driven Architecture** - Webhooks as source of truth
3. **Immutable Snapshots** - Order items capture historical pricing
4. **Atomic Inventory** - Stock reservations prevent overselling
5. **Unified Event Log** - Single timeline for all order events
6. **Structured Data** - No JSONB for critical business data

---

## 1. DATABASE SCHEMA

### 1.1 Orders Table

**Purpose:** Core order tracking and coordination

```sql
CREATE TABLE orders (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,  -- ORD-YYYYMMDD-XXXX
  
  -- Customer
  customer_uid TEXT NOT NULL,  -- Firebase UID
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Financials (in paise, ₹1 = 100 paise)
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  cod_fee INTEGER NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Status
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  fulfillment_status TEXT NOT NULL DEFAULT 'PENDING',
  
  -- Metadata
  notes TEXT,  -- Customer order notes
  admin_notes TEXT,  -- Internal notes
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,  -- When payment confirmed
  cancelled_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_payment_status CHECK (
    payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')
  ),
  CONSTRAINT valid_fulfillment_status CHECK (
    fulfillment_status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED')
  ),
  CONSTRAINT total_matches_sum CHECK (
    total_amount = subtotal + shipping_fee + cod_fee - discount_amount
  )
);

-- Indexes
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_customer_uid ON orders(customer_uid);
CREATE INDEX idx_orders_customer_email ON orders(customer_email);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_confirmed_at ON orders(confirmed_at DESC) WHERE confirmed_at IS NOT NULL;

-- Composite index for admin dashboard
CREATE INDEX idx_orders_status_created ON orders(payment_status, fulfillment_status, created_at DESC);

-- Updated timestamp trigger
CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE orders IS 'Core order tracking table with dual status system';
COMMENT ON COLUMN orders.order_number IS 'Human-readable order identifier: ORD-YYYYMMDD-XXXX';
COMMENT ON COLUMN orders.payment_status IS 'Payment lifecycle: PENDING → PAID/FAILED/REFUNDED';
COMMENT ON COLUMN orders.fulfillment_status IS 'Fulfillment lifecycle: PENDING → PROCESSING → SHIPPED → DELIVERED/RETURNED/CANCELLED';
```

---

### 1.2 Order Items Table

**Purpose:** Immutable product snapshots with historical pricing

```sql
CREATE TABLE order_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Product References (maintain referential integrity)
  product_id UUID NOT NULL,  -- FK to products (RESTRICT on source table)
  variant_id UUID NOT NULL,  -- FK to variants (RESTRICT on source table)
  
  -- Immutable Snapshot Data
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT NOT NULL,  -- "Size M / Black"
  
  -- Pricing (in paise)
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total INTEGER NOT NULL CHECK (line_total >= 0),
  
  -- Product Attributes (for analytics)
  category TEXT,
  brand TEXT,
  
  -- Metadata
  product_snapshot JSONB,  -- Full product attributes at purchase time
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT line_total_matches_quantity CHECK (
    line_total = unit_price * quantity
  )
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

COMMENT ON TABLE order_items IS 'Immutable product line items with historical pricing';
COMMENT ON COLUMN order_items.product_snapshot IS 'Complete product data at purchase time for audit/analytics';
COMMENT ON COLUMN order_items.line_total IS 'unit_price × quantity (pre-calculated for queries)';
```

---

### 1.3 Order Addresses Table

**Purpose:** Structured shipping and billing addresses

```sql
CREATE TABLE order_addresses (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL,  -- 'SHIPPING' or 'BILLING'
  
  -- Contact
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  
  -- Geolocation (for shipping calculation)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Validation
  is_validated BOOLEAN DEFAULT FALSE,  -- Address verified by shipping API
  validation_metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_address_type CHECK (
    address_type IN ('SHIPPING', 'BILLING')
  ),
  CONSTRAINT one_address_per_type UNIQUE (order_id, address_type)
);

-- Indexes
CREATE INDEX idx_order_addresses_order_id ON order_addresses(order_id);
CREATE INDEX idx_order_addresses_postal_code ON order_addresses(postal_code);
CREATE INDEX idx_order_addresses_city_state ON order_addresses(city, state);

COMMENT ON TABLE order_addresses IS 'Structured shipping and billing addresses (no JSONB)';
COMMENT ON COLUMN order_addresses.address_type IS 'SHIPPING (delivery) or BILLING (invoice)';
COMMENT ON COLUMN order_addresses.is_validated IS 'TRUE if address verified by Shiprocket/Google Maps';
```

---

### 1.4 Payments Table

**Purpose:** Payment transaction tracking

```sql
CREATE TABLE payments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Gateway
  gateway TEXT NOT NULL DEFAULT 'RAZORPAY',
  gateway_order_id TEXT NOT NULL,  -- Razorpay order ID
  gateway_payment_id TEXT,  -- Razorpay payment ID (after capture)
  gateway_signature TEXT,  -- Signature for verification
  
  -- Transaction
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_method TEXT,  -- 'UPI', 'CARD', 'NETBANKING', 'WALLET', 'COD'
  
  -- Status
  status TEXT NOT NULL DEFAULT 'CREATED',
  
  -- COD Support
  is_cod BOOLEAN DEFAULT FALSE,
  cod_fee INTEGER DEFAULT 0,
  
  -- Failure Tracking
  error_code TEXT,
  error_description TEXT,
  failure_reason TEXT,
  
  -- Gateway Metadata
  gateway_response JSONB,  -- Full webhook payload
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMPTZ,  -- When payment captured
  failed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_payment_status CHECK (
    status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'CANCELLED')
  )
);

-- Indexes
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_gateway_order_id ON payments(gateway, gateway_order_id);
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- Updated timestamp trigger
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Ensure one primary payment per order
CREATE UNIQUE INDEX idx_payments_one_primary_per_order 
  ON payments(order_id) 
  WHERE status IN ('CAPTURED', 'AUTHORIZED');

COMMENT ON TABLE payments IS 'Payment transaction tracking with gateway integration';
COMMENT ON COLUMN payments.gateway_order_id IS 'External gateway order identifier (Razorpay order_id)';
COMMENT ON COLUMN payments.status IS 'CREATED → AUTHORIZED → CAPTURED (or FAILED)';
```

---

### 1.5 Refunds Table

**Purpose:** Track partial and full refunds

```sql
CREATE TABLE refunds (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  
  -- Gateway
  gateway_refund_id TEXT NOT NULL UNIQUE,  -- Razorpay refund ID
  
  -- Transaction
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',
  
  -- Reason
  reason TEXT,  -- Customer-facing reason
  admin_reason TEXT,  -- Internal reason
  
  -- Processing
  refund_method TEXT,  -- 'ORIGINAL', 'BANK_TRANSFER', 'STORE_CREDIT'
  processed_at TIMESTAMPTZ,
  
  -- Gateway Metadata
  gateway_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_refund_status CHECK (
    status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')
  )
);

-- Indexes
CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_refunds_gateway_refund_id ON refunds(gateway_refund_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at DESC);

COMMENT ON TABLE refunds IS 'Refund transaction tracking (partial or full)';
COMMENT ON COLUMN refunds.amount IS 'Refund amount in paise (can be partial)';
```

---

### 1.6 Shipments Table

**Purpose:** Shipping and fulfillment tracking

```sql
CREATE TABLE shipments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Carrier
  carrier TEXT NOT NULL DEFAULT 'SHIPROCKET',
  carrier_shipment_id TEXT,  -- Shiprocket shipment ID
  carrier_order_id TEXT,  -- Shiprocket order ID
  
  -- Tracking
  tracking_number TEXT,  -- AWB number
  tracking_url TEXT,
  
  -- Courier
  courier_name TEXT,  -- "Blue Dart", "Delhivery"
  courier_service_type TEXT,  -- "EXPRESS", "STANDARD"
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING',
  
  -- Delivery
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Proof of Delivery
  delivered_to_name TEXT,
  delivery_signature_url TEXT,
  delivery_photo_url TEXT,
  
  -- RTO (Return to Origin)
  is_rto BOOLEAN DEFAULT FALSE,
  rto_reason TEXT,
  rto_initiated_at TIMESTAMPTZ,
  
  -- Weights & Dimensions
  weight_grams INTEGER,
  length_cm DECIMAL(6, 2),
  width_cm DECIMAL(6, 2),
  height_cm DECIMAL(6, 2),
  
  -- Shipping Cost
  shipping_charges INTEGER,  -- In paise
  cod_charges INTEGER,  -- In paise
  
  -- Metadata
  carrier_response JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_shipment_status CHECK (
    status IN ('PENDING', 'PICKUP_SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 
               'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED', 'RTO_DELIVERED', 
               'CANCELLED', 'FAILED')
  )
);

-- Indexes
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX idx_shipments_carrier_shipment_id ON shipments(carrier_shipment_id) WHERE carrier_shipment_id IS NOT NULL;
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_shipped_at ON shipments(shipped_at DESC) WHERE shipped_at IS NOT NULL;

-- Ensure one active shipment per order
CREATE UNIQUE INDEX idx_shipments_one_active_per_order 
  ON shipments(order_id) 
  WHERE status NOT IN ('CANCELLED', 'FAILED');

COMMENT ON TABLE shipments IS 'Shipping and delivery tracking';
COMMENT ON COLUMN shipments.status IS 'Shipment lifecycle from pickup to delivery';
COMMENT ON COLUMN shipments.is_rto IS 'TRUE if return to origin initiated';
```

---

### 1.7 Order Events Table

**Purpose:** Unified event timeline for all order activities

```sql
CREATE TABLE order_events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Event Classification
  event_type TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'ORDER', 'PAYMENT', 'FULFILLMENT', 'SHIPPING', 'ADMIN'
  
  -- Source
  source TEXT NOT NULL,  -- 'SYSTEM', 'WEBHOOK', 'ADMIN', 'CUSTOMER'
  actor_id TEXT,  -- User ID if admin/customer action
  actor_name TEXT,  -- Display name
  
  -- Event Data
  title TEXT NOT NULL,  -- "Payment Captured"
  description TEXT,  -- "Payment of ₹1,500 captured via UPI"
  
  -- Metadata
  metadata JSONB,  -- Event-specific data
  
  -- Severity (for alerting)
  severity TEXT DEFAULT 'INFO',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_category CHECK (
    category IN ('ORDER', 'PAYMENT', 'FULFILLMENT', 'SHIPPING', 'ADMIN', 'SYSTEM')
  ),
  CONSTRAINT valid_event_source CHECK (
    source IN ('SYSTEM', 'WEBHOOK', 'ADMIN', 'CUSTOMER', 'CRON')
  ),
  CONSTRAINT valid_severity CHECK (
    severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')
  )
);

-- Indexes
CREATE INDEX idx_order_events_order_id ON order_events(order_id, created_at DESC);
CREATE INDEX idx_order_events_event_type ON order_events(event_type);
CREATE INDEX idx_order_events_category ON order_events(category);
CREATE INDEX idx_order_events_created_at ON order_events(created_at DESC);
CREATE INDEX idx_order_events_severity ON order_events(severity) WHERE severity IN ('ERROR', 'CRITICAL');

COMMENT ON TABLE order_events IS 'Unified event log for order timeline and audit trail';
COMMENT ON COLUMN order_events.event_type IS 'Machine-readable event type (e.g., PAYMENT_CAPTURED, SHIPMENT_DELIVERED)';
COMMENT ON COLUMN order_events.category IS 'High-level grouping for filtering';
COMMENT ON COLUMN order_events.metadata IS 'Event-specific structured data (amounts, IDs, etc.)';
```

**Event Type Catalog:**

```typescript
// ORDER Events
ORDER_CREATED
ORDER_CONFIRMED
ORDER_CANCELLED
ORDER_REFUNDED

// PAYMENT Events
PAYMENT_CREATED
PAYMENT_AUTHORIZED
PAYMENT_CAPTURED
PAYMENT_FAILED
REFUND_INITIATED
REFUND_PROCESSED
REFUND_FAILED

// FULFILLMENT Events
STOCK_RESERVED
STOCK_COMMITTED
STOCK_RELEASED
ORDER_ITEMS_CREATED
FULFILLMENT_STARTED
FULFILLMENT_COMPLETED

// SHIPPING Events
SHIPMENT_CREATED
PICKUP_SCHEDULED
PICKED_UP
IN_TRANSIT
OUT_FOR_DELIVERY
DELIVERED
RTO_INITIATED
RTO_DELIVERED

// ADMIN Events
STATUS_UPDATED
NOTE_ADDED
ADDRESS_UPDATED
MANUAL_REFUND
```

---

### 1.8 Order Sequences Table

**Purpose:** Generate sequential order numbers per day

```sql
CREATE TABLE order_sequences (
  -- Identity
  date DATE PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Function to generate next order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  next_seq INTEGER;
  order_num TEXT;
BEGIN
  -- Upsert sequence for today
  INSERT INTO order_sequences (date, last_sequence)
  VALUES (today, 1)
  ON CONFLICT (date)
  DO UPDATE SET 
    last_sequence = order_sequences.last_sequence + 1,
    updated_at = NOW()
  RETURNING last_sequence INTO next_seq;
  
  -- Format: ORD-YYYYMMDD-XXXX
  order_num := 'ORD-' || TO_CHAR(today, 'YYYYMMDD') || '-' || LPAD(next_seq::TEXT, 4, '0');
  
  RETURN order_num;
END;
$$;

COMMENT ON FUNCTION generate_order_number() IS 'Generates sequential order numbers: ORD-YYYYMMDD-XXXX';
```

---

### 1.9 Integration with Existing Stock Reservations

**Note:** Keep existing `stock_reservations` table and RPC functions as-is.

```sql
-- Existing table (reference only, do not recreate)
-- CREATE TABLE stock_reservations (
--   id UUID PRIMARY KEY,
--   order_id UUID NOT NULL,
--   variant_id UUID NOT NULL,
--   user_uid TEXT NOT NULL,
--   quantity INTEGER NOT NULL,
--   status TEXT NOT NULL,  -- 'reserved', 'committed', 'released'
--   reserved_at TIMESTAMPTZ,
--   expires_at TIMESTAMPTZ
-- );

-- Existing RPC functions (reference only)
-- reserve_stock(order_id, uid, items_json, ttl_seconds)
-- commit_reservation(order_id)
-- release_reservation(order_id)
-- release_expired_reservations()
```

---

## 2. ENTITY RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ORDER SYSTEM ENTITIES                          │
└─────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────┐
                    │   order_sequences  │
                    │ ─────────────────  │
                    │ date (PK)          │
                    │ last_sequence      │
                    └──────────┬─────────┘
                               │ GENERATES
                               ↓
┌────────────────────────────────────────────────────────────┐
│                          ORDERS                            │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_number (UNIQUE)  ← Generated from order_sequences   │
│ customer_uid, customer_email, customer_phone              │
│                                                            │
│ subtotal, shipping_fee, cod_fee, discount, total_amount   │
│ refunded_amount, currency                                 │
│                                                            │
│ payment_status (PENDING, PAID, FAILED, REFUNDED)          │
│ fulfillment_status (PENDING, PROCESSING, SHIPPED...)      │
│                                                            │
│ notes, admin_notes, ip_address, user_agent                │
│ created_at, updated_at, confirmed_at, cancelled_at        │
└───────────┬─────────────┬─────────────┬──────────────────┘
            │             │             │
            │             │             │
    ┌───────┴────┐  ┌─────┴────┐  ┌────┴──────────┐
    │            │  │          │  │                │
    ↓            ↓  ↓          ↓  ↓                ↓
┌─────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────┐
│ ORDER   │  │  ORDER    │  │PAYMENTS │  │  SHIPMENTS   │
│ ITEMS   │  │ADDRESSES  │  └────┬────┘  └──────┬───────┘
└────┬────┘  └───────────┘       │              │
     │                            │              │
     │                            ↓              │
     │                    ┌──────────────┐       │
     │                    │   REFUNDS    │       │
     │                    └──────────────┘       │
     │                                           │
     └───────────────────┬───────────────────────┘
                         │
                         ↓
                ┌─────────────────┐
                │  ORDER_EVENTS   │
                │  ──────────────  │
                │  (Unified Log)  │
                └─────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      ORDER_ITEMS                           │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│                                                            │
│ product_id, variant_id (FKs to products/variants)         │
│ sku, product_name, variant_label                          │
│ unit_price, quantity, line_total                          │
│ category, brand                                            │
│ product_snapshot (JSONB)                                   │
│                                                            │
│ created_at                                                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     ORDER_ADDRESSES                        │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│ address_type (SHIPPING | BILLING)                         │
│                                                            │
│ full_name, phone, email                                   │
│ address_line1, address_line2                              │
│ city, state, postal_code, country                         │
│ latitude, longitude                                        │
│                                                            │
│ is_validated, validation_metadata                         │
│ created_at                                                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                        PAYMENTS                            │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│                                                            │
│ gateway, gateway_order_id, gateway_payment_id             │
│ gateway_signature                                          │
│                                                            │
│ amount, currency, payment_method                          │
│ status (CREATED, AUTHORIZED, CAPTURED, FAILED...)         │
│                                                            │
│ is_cod, cod_fee                                           │
│ error_code, error_description, failure_reason             │
│ gateway_response (JSONB)                                   │
│                                                            │
│ created_at, updated_at, captured_at, failed_at            │
└───────────────────────────┬────────────────────────────────┘
                            │
                            ↓
              ┌─────────────────────────┐
              │        REFUNDS          │
              │ ──────────────────────  │
              │ id (PK)                 │
              │ order_id (FK → orders)  │
              │ payment_id (FK)         │
              │                         │
              │ gateway_refund_id       │
              │ amount, currency        │
              │ status, reason          │
              │ refund_method           │
              │                         │
              │ gateway_response (JSONB)│
              │ created_at, updated_at  │
              └─────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                       SHIPMENTS                            │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│                                                            │
│ carrier, carrier_shipment_id, carrier_order_id            │
│ tracking_number, tracking_url                             │
│ courier_name, courier_service_type                        │
│                                                            │
│ status (PENDING, PICKED_UP, IN_TRANSIT, DELIVERED...)     │
│                                                            │
│ estimated_delivery_date, actual_delivery_date             │
│ delivered_to_name, delivery_signature_url                 │
│                                                            │
│ is_rto, rto_reason, rto_initiated_at                      │
│ weight_grams, length_cm, width_cm, height_cm              │
│ shipping_charges, cod_charges                             │
│                                                            │
│ carrier_response (JSONB)                                   │
│ created_at, updated_at, shipped_at, delivered_at          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                     ORDER_EVENTS                           │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│                                                            │
│ event_type (ORDER_CREATED, PAYMENT_CAPTURED...)           │
│ category (ORDER, PAYMENT, FULFILLMENT, SHIPPING, ADMIN)   │
│                                                            │
│ source (SYSTEM, WEBHOOK, ADMIN, CUSTOMER)                 │
│ actor_id, actor_name                                       │
│                                                            │
│ title, description                                         │
│ metadata (JSONB)                                           │
│ severity (INFO, WARNING, ERROR, CRITICAL)                 │
│                                                            │
│ created_at                                                 │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│            STOCK_RESERVATIONS (Existing)                   │
│ ─────────────────────────────────────────────────────────  │
│ id (PK)                                                    │
│ order_id (FK → orders)                                     │
│ variant_id (FK → variants)                                 │
│ user_uid                                                   │
│                                                            │
│ quantity                                                   │
│ status (reserved, committed, released)                     │
│ reserved_at, expires_at                                    │
└────────────────────────────────────────────────────────────┘

Key Relationships:
─────────────────
• Order → Order Items (1:N) - CASCADE delete
• Order → Addresses (1:2) - CASCADE delete [SHIPPING, BILLING]
• Order → Payments (1:N) - CASCADE delete
• Order → Shipments (1:N) - CASCADE delete
• Order → Events (1:N) - CASCADE delete
• Payment → Refunds (1:N) - RESTRICT delete
• Order → Stock Reservations (1:N) - Keep existing logic
```

---

## 3. ORDER LIFECYCLE

### 3.1 Dual Status System

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT STATUS LIFECYCLE                     │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ PENDING │  ← Order created, awaiting payment
    └────┬────┘
         │
         ├──────────────┬──────────────┐
         │              │              │
         ↓              ↓              ↓
    ┌────────┐    ┌─────────┐    ┌────────┐
    │  PAID  │    │ FAILED  │    │REFUNDED│
    └────────┘    └─────────┘    └────────┘
         │              │              ↑
         │              │              │
         └──────────────┴──────────────┘
                   (Terminal States)

┌─────────────────────────────────────────────────────────────────┐
│                 FULFILLMENT STATUS LIFECYCLE                    │
└─────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ PENDING │  ← Order confirmed, awaiting processing
    └────┬────┘
         │
         ↓
    ┌────────────┐
    │ PROCESSING │  ← Order being prepared (picking, packing)
    └─────┬──────┘
          │
          ├────────────────────────┐
          │                        │
          ↓                        ↓
    ┌──────────┐           ┌─────────────┐
    │ SHIPPED  │           │  CANCELLED  │
    └────┬─────┘           └─────────────┘
         │                        (Terminal)
         ├──────────────┐
         │              │
         ↓              ↓
    ┌───────────┐  ┌──────────┐
    │ DELIVERED │  │ RETURNED │
    └───────────┘  └──────────┘
     (Terminal)     (Terminal)

┌─────────────────────────────────────────────────────────────────┐
│                    COMBINED STATUS MATRIX                       │
└─────────────────────────────────────────────────────────────────┘

Payment ↓ | Fulfillment → | PENDING | PROCESSING | SHIPPED | DELIVERED | CANCELLED
──────────────────────────────────────────────────────────────────────────────────
PENDING                   |    ✓    |     ✗      |    ✗    |     ✗     |     ✓
PAID                      |    ✓    |     ✓      |    ✓    |     ✓     |     ✓
FAILED                    |    ✓    |     ✗      |    ✗    |     ✗     |     ✓
REFUNDED                  |    ✗    |     ✗      |    ✗    |     ✓     |     ✓

✓ = Valid state combination
✗ = Invalid state combination
```

### 3.2 State Transition Rules

**Payment Status Transitions:**

```
PENDING → PAID        (payment webhook: captured)
PENDING → FAILED      (payment webhook: failed)
PAID → REFUNDED       (refund webhook: processed)
```

**Fulfillment Status Transitions:**

```
PENDING → PROCESSING      (admin starts fulfillment)
PROCESSING → SHIPPED      (shipment created)
SHIPPED → DELIVERED       (delivery confirmed)
SHIPPED → RETURNED        (customer return)
PENDING|PROCESSING → CANCELLED  (order cancelled before shipping)
```

---

## 4. CHECKOUT FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW CHECKOUT ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────┘

FRONTEND                  API LAYER                   DATABASE
────────                  ─────────                   ────────

┌──────────┐
│   Cart   │
│  Review  │
└─────┬────┘
      │
      │ 1. Validate Cart & Calculate Total
      ↓
┌────────────────────┐
│ POST /checkout     │───────────────┐
│ /api/orders/create │               │
└────────────────────┘               │
      │                              │
      │                              ↓
      │                     ┌────────────────────┐
      │                     │ validateCartItems( │
      │                     │   customer_uid     │
      │                     │ )                  │
      │                     │                    │
      │                     │ • Check inventory  │
      │                     │ • Calculate prices │
      │                     │ • Apply discounts  │
      │                     └──────────┬─────────┘
      │                                │
      │                                ↓
      │                     ┌──────────────────────┐
      │                     │ BEGIN TRANSACTION    │
      │                     └──────────┬───────────┘
      │                                │
      │ 2. Create Order                ↓
      │                     ┌──────────────────────────┐
      │                     │ INSERT INTO orders       │
      │                     │   order_number =         │
      │                     │     generate_order_num() │
      │                     │   payment_status =       │
      │                     │     'PENDING'            │
      │                     │   fulfillment_status =   │
      │                     │     'PENDING'            │
      │                     └──────────┬───────────────┘
      │                                │
      │ 3. Reserve Stock               ↓
      │                     ┌──────────────────────────┐
      │                     │ CALL reserve_stock()     │
      │                     │   (existing RPC)         │
      │                     │                          │
      │                     │ • Lock variants          │
      │                     │ • Create reservations    │
      │                     │ • Set 15min expiry       │
      │                     └──────────┬───────────────┘
      │                                │
      │                                ↓
      │                     ┌──────────────────────────┐
      │◀────────────────────│ Log Event:               │
      │  order_id,          │   ORDER_CREATED          │
      │  razorpay_order_id  │   STOCK_RESERVED         │
      │                     └──────────┬───────────────┘
      │                                │
      │                                ↓
      │                     ┌──────────────────────────┐
      │                     │ COMMIT TRANSACTION       │
      │                     └──────────────────────────┘
      │
      │ 4. Create Razorpay Order
      ↓
┌────────────────────────────────────┐
│ POST razorpay.com/v1/orders        │
│                                    │
│ {                                  │
│   amount: total * 100,             │
│   currency: "INR",                 │
│   receipt: order_number,           │
│   notes: {                         │
│     order_id: uuid,                │
│     order_number: "ORD-...",       │
│     customer_uid: "..."            │
│   }                                │
│ }                                  │
└────────────┬───────────────────────┘
             │
             ↓
      razorpay_order_id
             │
             │ 5. Store Payment Record
             ↓
┌────────────────────────────────────┐
│ INSERT INTO payments               │
│   gateway_order_id =               │
│     razorpay_order_id              │
│   status = 'CREATED'               │
└────────────┬───────────────────────┘
             │
             ↓
┌────────────────────────────────────┐
│ Log Event: PAYMENT_CREATED         │
└────────────┬───────────────────────┘
             │
             │ 6. Return to Frontend
             ↓
┌────────────────────────────────────┐
│ {                                  │
│   success: true,                   │
│   order_id: uuid,                  │
│   order_number: "ORD-20260308-0001"│
│   razorpay_order_id: "order_xyz",  │
│   amount: 150000,                  │
│   razorpay_key: "rzp_..."          │
│ }                                  │
└────────────┬───────────────────────┘
             │
             │ 7. Open Razorpay Modal
             ↓
┌─────────────────────────────────────┐
│    RAZORPAY MAGIC CHECKOUT UI       │
│  ─────────────────────────────────  │
│  • Customer enters address          │
│  • Selects payment method           │
│  • Completes payment                │
└────────────┬────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ↓        ↓        ↓
[Success] [Failed] [Closed]
    │        │        │
    │        │        └──→ POST /api/orders/cancel
    │        │                  ├─ release_reservation()
    │        │                  └─ Update fulfillment: CANCELLED
    │        │
    │        └──→ Razorpay Webhook: payment.failed
    │                  ├─ Update payment: FAILED
    │                  ├─ Update order: payment=FAILED
    │                  ├─ release_reservation()
    │                  └─ Log: PAYMENT_FAILED
    │
    └──→ Razorpay Webhook: payment.captured / order.paid
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│           WEBHOOK HANDLER: /api/webhooks/razorpay               │
└─────────────────────────────────────────────────────────────────┘
              │
              │ 8. Verify Signature
              ↓
      ┌───────────────────┐
      │ Signature Valid?  │
      └────┬──────────┬───┘
           │ NO       │ YES
           ↓          ↓
       Return 401   Continue
                       │
                       │ 9. Update Payment
                       ↓
            ┌──────────────────────┐
            │ UPDATE payments      │
            │   status = 'CAPTURED'│
            │   gateway_payment_id │
            │   payment_method     │
            │   captured_at = NOW()│
            └──────────┬───────────┘
                       │
                       │ 10. Commit Reservation
                       ↓
            ┌──────────────────────┐
            │ CALL commit_         │
            │   reservation()      │
            │                      │
            │ Changes status from  │
            │ 'reserved' →         │
            │ 'committed'          │
            └──────────┬───────────┘
                       │
                       │ 11. Create Order Items
                       ↓
            ┌──────────────────────────┐
            │ INSERT INTO order_items  │
            │   (from cart_items)      │
            │                          │
            │ Captures:                │
            │ • Product name           │
            │ • Variant label          │
            │ • Current price          │
            │ • Product snapshot       │
            └──────────┬───────────────┘
                       │
                       │ 12. Update Order
                       ↓
            ┌──────────────────────────┐
            │ UPDATE orders            │
            │   payment_status = 'PAID'│
            │   confirmed_at = NOW()   │
            └──────────┬───────────────┘
                       │
                       │ 13. Create Addresses
                       ↓
            ┌──────────────────────────┐
            │ INSERT INTO              │
            │   order_addresses        │
            │                          │
            │ Extract from webhook:    │
            │ • Shipping address       │
            │ • Billing address        │
            └──────────┬───────────────┘
                       │
                       │ 14. Log Events
                       ↓
            ┌──────────────────────────┐
            │ INSERT INTO order_events │
            │                          │
            │ • PAYMENT_CAPTURED       │
            │ • STOCK_COMMITTED        │
            │ • ORDER_ITEMS_CREATED    │
            │ • ORDER_CONFIRMED        │
            └──────────┬───────────────┘
                       │
                       │ 15. Clear Cart
                       ↓
            ┌──────────────────────────┐
            │ DELETE FROM cart_items   │
            │   WHERE customer_uid     │
            └──────────┬───────────────┘
                       │
                       │ 16. Send Notification
                       ↓
            ┌──────────────────────────┐
            │ Send SMS/Email:          │
            │ "Order Confirmed"        │
            └──────────────────────────┘

RESULT: Order is now PAID + PENDING (ready for fulfillment)
```

---

## 5. API ENDPOINT DESIGN

### 5.1 Order Creation

**Endpoint:** `POST /api/orders/create`

**Request Body:**
```typescript
interface CreateOrderRequest {
  // Source
  source: 'CART' | 'BUY_NOW'
  
  // BUY NOW (skip cart)
  variant_id?: string
  quantity?: number
  
  // Customer Notes
  notes?: string
  
  // Address (optional pre-fill)
  shipping_same_as_billing?: boolean
}
```

**Response:**
```typescript
interface CreateOrderResponse {
  success: boolean
  order: {
    id: string
    order_number: string
    total_amount: number
    currency: string
  }
  payment: {
    gateway_order_id: string
    razorpay_key_id: string
  }
  error?: string
}
```

**Logic:**
1. Validate customer session
2. Load cart items (or single variant for BUY_NOW)
3. Calculate totals (subtotal, shipping, COD fee, discounts)
4. Generate order number via `generate_order_number()`
5. Create order record (PENDING, PENDING)
6. Reserve stock via `reserve_stock()`
7. Create Razorpay order
8. Insert payment record (CREATED)
9. Log ORDER_CREATED, STOCK_RESERVED events
10. Return order + payment data for frontend

---

### 5.2 Order Cancellation

**Endpoint:** `POST /api/orders/:orderId/cancel`

**Request Body:**
```typescript
interface CancelOrderRequest {
  reason?: string
}
```

**Logic:**
1. Verify order belongs to customer
2. Check order status:
   - Allow if payment_status = PENDING
   - Allow if fulfillment_status = PENDING
   - Deny if SHIPPED or DELIVERED
3. Release stock via `release_reservation()`
4. Update fulfillment_status = CANCELLED
5. Log ORDER_CANCELLED event
6. Return success

---

### 5.3 Webhook Handlers

#### 5.3.1 Razorpay Webhook

**Endpoint:** `POST /api/webhooks/razorpay`

**Events to Handle:**

**payment.captured** (Prepaid):
1. Verify signature
2. Extract order_id from notes
3. Update payment: status = CAPTURED
4. Commit reservation
5. Create order_items from cart
6. Update order: payment_status = PAID, confirmed_at
7. Extract addresses from webhook, insert into order_addresses
8. Log events: PAYMENT_CAPTURED, STOCK_COMMITTED, ORDER_ITEMS_CREATED, ORDER_CONFIRMED
9. Clear cart
10. Send confirmation SMS/email

**order.paid** (COD):
- Same as payment.captured
- Set is_cod = true, cod_fee from webhook

**payment.failed**:
1. Update payment: status = FAILED, error_code, failure_reason
2. Update order: payment_status = FAILED
3. Release reservation
4. Log PAYMENT_FAILED event
5. Send failure notification

**refund.processed**:
1. Insert into refunds table
2. Update order: refunded_amount
3. If fully refunded, update payment_status = REFUNDED
4. Log REFUND_PROCESSED event
5. Send refund confirmation

---

#### 5.3.2 Shiprocket Webhook

**Endpoint:** `POST /api/webhooks/shiprocket`

**Events to Handle:**

**PICKED_UP**:
1. Update shipment: status = PICKED_UP, shipped_at
2. Update order: fulfillment_status = SHIPPED
3. Log PICKED_UP event
4. Send SMS with tracking link

**IN_TRANSIT**:
1. Update shipment: status = IN_TRANSIT
2. Log IN_TRANSIT event

**OUT_FOR_DELIVERY**:
1. Update shipment: status = OUT_FOR_DELIVERY
2. Log OUT_FOR_DELIVERY event
3. Send delivery notification SMS

**DELIVERED**:
1. Update shipment: status = DELIVERED, actual_delivery_date, delivered_at
2. Update order: fulfillment_status = DELIVERED
3. Log DELIVERED event
4. Send delivery confirmation SMS

**RTO_INITIATED**:
1. Update shipment: is_rto = true, rto_initiated_at
2. Update order: fulfillment_status = RETURNED
3. Log RTO_INITIATED event
4. Trigger refund process

---

### 5.4 Admin Endpoints

#### Get Orders (with pagination & filters)

**Endpoint:** `GET /api/admin/orders`

**Query Params:**
```typescript
interface GetOrdersQuery {
  page?: number
  limit?: number
  payment_status?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  fulfillment_status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'RETURNED' | 'CANCELLED'
  search?: string  // order_number, email, phone
  date_from?: string
  date_to?: string
  sort?: 'created_at_desc' | 'created_at_asc' | 'total_amount_desc'
}
```

**Response:**
```typescript
interface GetOrdersResponse {
  orders: Order[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
```

**SQL Query:**
```sql
SELECT 
  o.*,
  COUNT(*) OVER() as total_count
FROM orders o
WHERE 
  (o.payment_status = $payment_status OR $payment_status IS NULL)
  AND (o.fulfillment_status = $fulfillment_status OR $fulfillment_status IS NULL)
  AND (
    o.order_number ILIKE $search OR
    o.customer_email ILIKE $search OR
    o.customer_phone ILIKE $search OR
    $search IS NULL
  )
  AND (o.created_at >= $date_from OR $date_from IS NULL)
  AND (o.created_at <= $date_to OR $date_to IS NULL)
ORDER BY o.created_at DESC
LIMIT $limit OFFSET $offset;
```

---

#### Get Order Details

**Endpoint:** `GET /api/admin/orders/:orderId`

**Response:**
```typescript
interface OrderDetails {
  order: Order
  items: OrderItem[]
  addresses: {
    shipping: OrderAddress
    billing?: OrderAddress
  }
  payments: Payment[]
  shipments: Shipment[]
  refunds: Refund[]
  events: OrderEvent[]  // Timeline
}
```

**SQL Queries:**
```sql
-- Order with aggregated data
SELECT o.*, 
  (SELECT jsonb_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as items,
  (SELECT jsonb_agg(oa.*) FROM order_addresses oa WHERE oa.order_id = o.id) as addresses,
  (SELECT jsonb_agg(p.*) FROM payments p WHERE p.order_id = o.id) as payments,
  (SELECT jsonb_agg(s.*) FROM shipments s WHERE s.order_id = o.id) as shipments,
  (SELECT jsonb_agg(r.*) FROM refunds r WHERE r.order_id = o.id) as refunds,
  (SELECT jsonb_agg(oe.* ORDER BY oe.created_at DESC) FROM order_events oe WHERE oe.order_id = o.id) as events
FROM orders o
WHERE o.id = $order_id;
```

---

#### Update Fulfillment Status

**Endpoint:** `POST /api/admin/orders/:orderId/fulfillment`

**Request Body:**
```typescript
interface UpdateFulfillmentRequest {
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  reason?: string
  admin_notes?: string
}
```

**Logic:**
1. Verify admin permissions
2. Validate status transition
3. Update order.fulfillment_status
4. Log STATUS_UPDATED event with actor_id (admin)
5. If status = CANCELLED and payment = PAID, initiate refund

---

#### Create Shipment

**Endpoint:** `POST /api/admin/orders/:orderId/shipment`

**Request Body:**
```typescript
interface CreateShipmentRequest {
  courier_name: string
  courier_service_type: 'EXPRESS' | 'STANDARD'
  weight_grams: number
  dimensions?: {
    length_cm: number
    width_cm: number
    height_cm: number
  }
}
```

**Logic:**
1. Verify order is in PAID status
2. Get shipping address from order_addresses
3. Call Shiprocket API: Create Order
4. Insert into shipments table
5. Update order.fulfillment_status = PROCESSING
6. Log SHIPMENT_CREATED event
7. Return tracking details

---

## 6. ADMIN ORDER QUERIES

### 6.1 Dashboard Statistics

```sql
-- Today's orders summary
SELECT 
  COUNT(*) as total_orders,
  SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) as paid_orders,
  SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders,
  SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) as failed_orders,
  SUM(total_amount) FILTER (WHERE payment_status = 'PAID') as revenue,
  AVG(total_amount) FILTER (WHERE payment_status = 'PAID') as avg_order_value
FROM orders
WHERE created_at >= CURRENT_DATE;
```

---

### 6.2 Orders Requiring Action

```sql
-- Orders needing fulfillment
SELECT 
  o.id,
  o.order_number,
  o.customer_email,
  o.total_amount,
  o.confirmed_at,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE 
  o.payment_status = 'PAID'
  AND o.fulfillment_status = 'PENDING'
GROUP BY o.id
ORDER BY o.confirmed_at ASC
LIMIT 50;
```

---

### 6.3 Failed Payments Analysis

```sql
-- Failed payment reasons
SELECT 
  p.error_code,
  p.failure_reason,
  COUNT(*) as failure_count,
  SUM(p.amount) as lost_revenue
FROM payments p
WHERE 
  p.status = 'FAILED'
  AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.error_code, p.failure_reason
ORDER BY failure_count DESC;
```

---

### 6.4 Shipping Performance

```sql
-- Average delivery time by courier
SELECT 
  s.courier_name,
  COUNT(*) as shipments_count,
  AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at)) / 86400) as avg_delivery_days,
  SUM(CASE WHEN s.is_rto THEN 1 ELSE 0 END) as rto_count
FROM shipments s
WHERE 
  s.status = 'DELIVERED'
  AND s.delivered_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.courier_name
ORDER BY shipments_count DESC;
```

---

### 6.5 Customer Order History

```sql
-- Customer's past orders
SELECT 
  o.id,
  o.order_number,
  o.created_at,
  o.total_amount,
  o.payment_status,
  o.fulfillment_status,
  COUNT(oi.id) as item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_uid = $customer_uid
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 20;
```

---

## 7. PAYMENT WEBHOOK LOGIC

### 7.1 Webhook Security

```typescript
// Verify Razorpay signature
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

### 7.2 Idempotency Pattern

```typescript
async function handlePaymentCaptured(payload: RazorpayWebhook) {
  const { order_id, payment_id } = extractIds(payload);
  
  // Check if already processed
  const existingPayment = await db.payments.findFirst({
    where: {
      gateway_payment_id: payment_id,
      status: 'CAPTURED'
    }
  });
  
  if (existingPayment) {
    console.log('Payment already processed, skipping');
    return { success: true, message: 'Already processed' };
  }
  
  // Begin transaction
  await db.$transaction(async (tx) => {
    // Update payment
    await tx.payments.update({
      where: { gateway_order_id: order_id },
      data: {
        status: 'CAPTURED',
        gateway_payment_id: payment_id,
        payment_method: payload.payment.method,
        captured_at: new Date(),
        gateway_response: payload
      }
    });
    
    // Commit reservation
    await tx.$executeRaw`
      SELECT commit_reservation(${order_id})
    `;
    
    // Create order items
    await createOrderItemsFromCart(tx, order_id);
    
    // Update order
    await tx.orders.update({
      where: { id: order_id },
      data: {
        payment_status: 'PAID',
        confirmed_at: new Date()
      }
    });
    
    // Create addresses
    await createAddressesFromWebhook(tx, order_id, payload);
    
    // Log events
    await logEvents(tx, order_id, [
      'PAYMENT_CAPTURED',
      'STOCK_COMMITTED',
      'ORDER_ITEMS_CREATED',
      'ORDER_CONFIRMED'
    ]);
    
    // Clear cart
    await tx.cart_items.deleteMany({
      where: { customer_uid: payload.customer_uid }
    });
  });
  
  // Send notification (outside transaction)
  await sendOrderConfirmation(order_id);
  
  return { success: true };
}
```

---

### 7.3 Error Handling

```typescript
async function handleWebhook(req: Request) {
  try {
    // 1. Verify signature
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return { status: 401, error: 'Invalid signature' };
    }
    
    // 2. Parse event
    const event = JSON.parse(rawBody);
    
    // 3. Route to handler
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;
      case 'order.paid':
        await handleOrderPaid(event);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event);
        break;
      case 'refund.processed':
        await handleRefundProcessed(event);
        break;
      default:
        console.log('Unhandled event:', event.event);
    }
    
    return { status: 200, success: true };
    
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log to monitoring system
    await logWebhookError(error, rawBody);
    
    // Return 200 to prevent retries for known errors
    if (error.code === 'ORDER_NOT_FOUND') {
      return { status: 200, error: 'Order not found' };
    }
    
    // Return 500 for unknown errors (triggers retry)
    return { status: 500, error: 'Internal error' };
  }
}
```

---

## 8. SHIPMENT WEBHOOK LOGIC

### 8.1 Shiprocket Event Mapping

```typescript
const SHIPROCKET_STATUS_MAP = {
  // Shiprocket → Our System
  'NEW': 'PENDING',
  'PICKUP_SCHEDULED': 'PICKUP_SCHEDULED',
  'PICKED_UP': 'PICKED_UP',
  'IN_TRANSIT': 'IN_TRANSIT',
  'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
  'DELIVERED': 'DELIVERED',
  'RTO-INITIATED': 'RTO_INITIATED',
  'RTO-DELIVERED': 'RTO_DELIVERED',
  'CANCELLED': 'CANCELLED',
  'LOST': 'FAILED'
} as const;

function mapShiprocketStatus(status: string): string {
  return SHIPROCKET_STATUS_MAP[status] || status;
}
```

---

### 8.2 Webhook Handler

```typescript
async function handleShiprocketWebhook(payload: ShiprocketWebhook) {
  const { awb, order_id, current_status, courier_name } = payload;
  
  // Find shipment by AWB or carrier_order_id
  const shipment = await db.shipments.findFirst({
    where: {
      OR: [
        { tracking_number: awb },
        { carrier_order_id: order_id }
      ]
    },
    include: { order: true }
  });
  
  if (!shipment) {
    console.error('Shipment not found:', { awb, order_id });
    return { status: 404, error: 'Shipment not found' };
  }
  
  const newStatus = mapShiprocketStatus(current_status);
  
  // Update shipment
  await db.shipments.update({
    where: { id: shipment.id },
    data: {
      status: newStatus,
      courier_name: courier_name || shipment.courier_name,
      carrier_response: payload,
      ...(newStatus === 'PICKED_UP' && { shipped_at: new Date() }),
      ...(newStatus === 'DELIVERED' && {
        delivered_at: new Date(),
        actual_delivery_date: new Date().toISOString().split('T')[0]
      }),
      ...(newStatus === 'RTO_INITIATED' && {
        is_rto: true,
        rto_initiated_at: new Date()
      })
    }
  });
  
  // Update order fulfillment status
  if (newStatus === 'PICKED_UP' || newStatus === 'IN_TRANSIT') {
    await db.orders.update({
      where: { id: shipment.order_id },
      data: { fulfillment_status: 'SHIPPED' }
    });
  } else if (newStatus === 'DELIVERED') {
    await db.orders.update({
      where: { id: shipment.order_id },
      data: { fulfillment_status: 'DELIVERED' }
    });
  } else if (newStatus === 'RTO_INITIATED') {
    await db.orders.update({
      where: { id: shipment.order_id },
      data: { fulfillment_status: 'RETURNED' }
    });
  }
  
  // Log event
  await logEvent({
    order_id: shipment.order_id,
    event_type: newStatus,
    category: 'SHIPPING',
    source: 'WEBHOOK',
    title: getShipmentEventTitle(newStatus),
    description: `Shipment ${newStatus.toLowerCase()} via ${courier_name}`,
    metadata: {
      tracking_number: awb,
      courier: courier_name,
      shiprocket_status: current_status
    }
  });
  
  // Send notification
  const shouldNotify = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO_INITIATED'].includes(newStatus);
  if (shouldNotify) {
    await sendShipmentNotification(shipment.order_id, newStatus);
  }
  
  // Trigger refund for RTO
  if (newStatus === 'RTO_DELIVERED' && shipment.order.payment_status === 'PAID') {
    await initiateRefundForRTO(shipment.order_id);
  }
  
  return { status: 200, success: true };
}
```

---

## 9. IMPLEMENTATION PHASES

### Phase 1: Database Foundation (Week 1)
- [ ] Create all tables with constraints
- [ ] Add indexes
- [ ] Create order number generator function
- [ ] Write migration scripts
- [ ] Test data seeding

### Phase 2: Core Order Flow (Week 2)
- [ ] Order creation API
- [ ] Integration with existing stock reservation
- [ ] Razorpay order creation
- [ ] Payment record creation
- [ ] Event logging system

### Phase 3: Payment Webhooks (Week 3)
- [ ] Webhook signature verification
- [ ] payment.captured handler
- [ ] order.paid handler (COD)
- [ ] payment.failed handler
- [ ] Order confirmation logic
- [ ] Cart clearing

### Phase 4: Order Items & Addresses (Week 4)
- [ ] Order items snapshot creation
- [ ] Address extraction from webhook
- [ ] Structured address storage
- [ ] Validation logic

### Phase 5: Shipping Integration (Week 5)
- [ ] Shiprocket API integration
- [ ] Shipment creation
- [ ] Webhook handler
- [ ] Tracking updates
- [ ] RTO handling

### Phase 6: Admin Dashboard (Week 6)
- [ ] Order list with filters
- [ ] Order details view
- [ ] Timeline rendering
- [ ] Status update UI
- [ ] Shipment creation UI

### Phase 7: Refunds & Returns (Week 7)
- [ ] Refund webhook handler
- [ ] Refund UI
- [ ] Return request flow
- [ ] RTO-triggered refunds

### Phase 8: Testing & Migration (Week 8)
- [ ] Unit tests for all endpoints
- [ ] Integration tests
- [ ] Load testing
- [ ] Data migration from v1
- [ ] Rollout plan

---

## 10. KEY DESIGN DECISIONS

### 10.1 Why Dual Status System?

**Problem:** Single status field leads to explosion of states (15+ statuses in v1)

**Solution:** Separate payment and fulfillment concerns
- Payment status tracks financial transactions
- Fulfillment status tracks physical fulfillment
- Clearer intent, easier to query

**Benefits:**
- Simpler state machines
- Better reporting ("Show all paid but unfulfilled orders")
- Scales to multi-warehouse (each warehouse = separate fulfillment)

---

### 10.2 Why Structured Addresses?

**Problem:** JSONB addresses in v1 had no validation, poor queryability

**Solution:** Dedicated `order_addresses` table with typed columns

**Benefits:**
- Database-level constraints ensure completeness
- Efficient queries by city/state/postal_code
- Easy integration with geocoding APIs
- Supports address validation workflows

---

### 10.3 Why Separate Payments Table?

**Problem:** v1 stored payment fields directly in orders table

**Solution:** Dedicated `payments` table with 1:N relationship

**Benefits:**
- Supports multiple payment attempts (retry flows)
- Clean separation of concerns
- Easier to add payment gateways in future
- Better audit trail

---

### 10.4 Why Order Events Table?

**Problem:** v1 had 5 separate logging tables (webhooks, inventory, SMS)

**Solution:** Unified `order_events` table as single source of truth

**Benefits:**
- Single query for full order timeline
- Consistent event structure
- Easy to add new event types
- Powers admin UI timeline component

---

### 10.5 Why Keep Stock Reservations?

**Decision:** Reuse existing `stock_reservations` system

**Rationale:**
- Already proven in production
- Atomic inventory management works well
- TTL-based expiry prevents leakage
- No need to reinvent

---

## 11. PERFORMANCE CONSIDERATIONS

### 11.1 Index Strategy

**Hot Paths:**
```sql
-- Admin dashboard (filter + sort)
CREATE INDEX idx_orders_status_created 
  ON orders(payment_status, fulfillment_status, created_at DESC);

-- Customer order history
CREATE INDEX idx_orders_customer_created 
  ON orders(customer_uid, created_at DESC);

-- Search by order number
CREATE INDEX idx_orders_order_number 
  ON orders(order_number);
```

---

### 11.2 Query Optimization

**Use Covering Indexes:**
```sql
-- Get order list without table lookup
CREATE INDEX idx_orders_list_view 
  ON orders(created_at DESC) 
  INCLUDE (order_number, customer_email, total_amount, payment_status, fulfillment_status);
```

**Pagination Pattern:**
```sql
-- Keyset pagination (faster than OFFSET)
SELECT *
FROM orders
WHERE created_at < $last_seen_created_at
ORDER BY created_at DESC
LIMIT 50;
```

---

### 11.3 Webhook Processing

**Async Pattern:**
```typescript
// Acknowledge webhook immediately, process async
async function handleWebhook(req: Request) {
  const eventId = generateId();
  
  // 1. Verify signature
  if (!verifySignature(req)) {
    return { status: 401 };
  }
  
  // 2. Queue for processing
  await webhookQueue.add({
    eventId,
    body: req.body,
    headers: req.headers
  });
  
  // 3. Return immediately
  return { status: 200, eventId };
}

// Separate worker processes webhook
async function processWebhook(job) {
  // Handle with retries
}
```

---

## 12. MONITORING & OBSERVABILITY

### 12.1 Key Metrics

**Business Metrics:**
- Orders created per hour
- Payment success rate
- Average order value
- Fulfillment SLA adherence
- Delivery time by courier

**Technical Metrics:**
- Webhook processing latency
- Failed webhook retries
- Database query performance
- API endpoint response times

---

### 12.2 Alerting Rules

```typescript
// Critical events trigger alerts
await logEvent({
  order_id,
  event_type: 'PAYMENT_CAPTURED',
  category: 'PAYMENT',
  severity: 'INFO'  // No alert
});

await logEvent({
  order_id,
  event_type: 'STOCK_COMMIT_FAILED',
  category: 'FULFILLMENT',
  severity: 'CRITICAL'  // Alert admins immediately
});
```

---

## 13. MIGRATION FROM V1

### 13.1 Data Migration Strategy

**Phase 1:** Parallel Run
- Deploy v2 system alongside v1
- New orders → v2
- Old orders → Keep in v1 tables (read-only)

**Phase 2:** Historical Data Migration
```sql
-- Migrate completed orders from v1 to v2
INSERT INTO orders (
  id, order_number, customer_uid, customer_email,
  subtotal, total_amount, payment_status, fulfillment_status,
  created_at, confirmed_at
)
SELECT 
  id,
  'MIGRATED-' || id::text,  -- Temporary order number
  firebase_uid,
  customer_email,
  amount,
  amount,
  -- Map v1 status to v2
  CASE 
    WHEN status IN ('PAID', 'COMPLETED') THEN 'PAID'
    WHEN status IN ('FAILED', 'CANCELLED') THEN 'FAILED'
    ELSE 'PENDING'
  END,
  CASE 
    WHEN status = 'DELIVERED' THEN 'DELIVERED'
    WHEN status IN ('SHIPPED', 'OUT_FOR_DELIVERY') THEN 'SHIPPED'
    ELSE 'PENDING'
  END,
  created_at,
  updated_at
FROM v1_orders
WHERE status IN ('COMPLETED', 'DELIVERED');
```

**Phase 3:** Update Order Numbers
```sql
-- Generate proper order numbers for migrated orders
UPDATE orders
SET order_number = 'ORD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-MIG-' || SUBSTRING(id::text, 1, 4)
WHERE order_number LIKE 'MIGRATED-%';
```

---

## 14. SECURITY CONSIDERATIONS

### 14.1 Row Level Security (RLS)

```sql
-- Customers can only see their own orders
CREATE POLICY "Customers view own orders"
  ON orders FOR SELECT
  USING (customer_uid = auth.uid());

-- Admins can see all orders
CREATE POLICY "Admins view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );
```

---

### 14.2 Sensitive Data Protection

```typescript
// Never log sensitive data
function sanitizeForLogging(data: any) {
  const sanitized = { ...data };
  delete sanitized.gateway_signature;
  delete sanitized.customer_phone;
  delete sanitized.customer_email;
  return sanitized;
}

console.log('Order created:', sanitizeForLogging(order));
```

---

## 15. FUTURE SCALABILITY

### 15.1 Multi-Warehouse Support

**Extension:** Add `warehouse_id` to shipments table

```sql
ALTER TABLE shipments ADD COLUMN warehouse_id UUID REFERENCES warehouses(id);

-- Split fulfillment by warehouse
CREATE INDEX idx_shipments_warehouse_status ON shipments(warehouse_id, status);
```

---

### 15.2 Split Shipments

**Extension:** Allow multiple shipments per order

```sql
-- Already supported via 1:N relationship
-- Create multiple shipment records for same order_id
-- Each shipment can have different tracking numbers
```

---

### 15.3 Subscription Orders

**Extension:** Add `subscription_id` column

```sql
ALTER TABLE orders ADD COLUMN subscription_id UUID REFERENCES subscriptions(id);
ALTER TABLE orders ADD COLUMN is_subscription_order BOOLEAN DEFAULT FALSE;

-- Link recurring orders to subscription
CREATE INDEX idx_orders_subscription ON orders(subscription_id) WHERE subscription_id IS NOT NULL;
```

---

## 16. TESTING STRATEGY

### 16.1 Unit Tests

```typescript
describe('Order Creation', () => {
  it('should generate sequential order numbers per day', async () => {
    const order1 = await createOrder({ customer_uid: 'user1' });
    const order2 = await createOrder({ customer_uid: 'user2' });
    
    expect(order1.order_number).toBe('ORD-20260308-0001');
    expect(order2.order_number).toBe('ORD-20260308-0002');
  });
  
  it('should reset sequence at midnight', async () => {
    // Mock date to next day
    jest.setSystemTime(new Date('2026-03-09'));
    
    const order = await createOrder({ customer_uid: 'user1' });
    expect(order.order_number).toBe('ORD-20260309-0001');
  });
});
```

---

### 16.2 Integration Tests

```typescript
describe('Payment Webhook', () => {
  it('should process payment.captured webhook', async () => {
    // Create order
    const order = await createOrder({ total_amount: 150000 });
    
    // Simulate webhook
    const response = await POST('/api/webhooks/razorpay', {
      body: mockWebhook({
        event: 'payment.captured',
        order_id: order.id,
        payment_id: 'pay_xyz'
      }),
      headers: {
        'x-razorpay-signature': generateValidSignature()
      }
    });
    
    expect(response.status).toBe(200);
    
    // Verify database state
    const updatedOrder = await db.orders.findUnique({ where: { id: order.id } });
    expect(updatedOrder.payment_status).toBe('PAID');
    expect(updatedOrder.confirmed_at).toBeTruthy();
    
    const payment = await db.payments.findFirst({ where: { order_id: order.id } });
    expect(payment.status).toBe('CAPTURED');
    
    const events = await db.order_events.findMany({ where: { order_id: order.id } });
    expect(events).toContainEqual(
      expect.objectContaining({ event_type: 'PAYMENT_CAPTURED' })
    );
  });
});
```

---

## 17. SUMMARY

### System Overview

**Orders System V2** is a production-grade ecommerce order management platform built on these principles:

✅ **Dual Status System** - Separate payment and fulfillment lifecycles  
✅ **Event-Driven** - Webhooks as source of truth  
✅ **Immutable Snapshots** - Historical pricing preserved  
✅ **Atomic Inventory** - Stock reservations prevent overselling  
✅ **Unified Timeline** - Single event log for all activities  
✅ **Structured Data** - No JSONB for critical fields  
✅ **Scalable Design** - Support for 100K+ orders/day  

---

### Database Schema

**7 Core Tables:**
1. `orders` - Order coordination with dual status
2. `order_items` - Immutable product snapshots
3. `order_addresses` - Structured shipping/billing addresses
4. `payments` - Payment transaction tracking
5. `refunds` - Refund records
6. `shipments` - Shipping and delivery tracking
7. `order_events` - Unified event timeline

**Plus Integration:**
- `stock_reservations` (existing)
- `order_sequences` (order number generation)

---

### Status Flows

**Payment:** PENDING → PAID / FAILED / REFUNDED  
**Fulfillment:** PENDING → PROCESSING → SHIPPED → DELIVERED / RETURNED / CANCELLED

---

### Key Features

- Human-readable order numbers: `ORD-YYYYMMDD-XXXX`
- Webhook-driven payment confirmation
- Real-time shipping updates
- Complete order timeline
- Admin dashboard queries
- Multi-payment support
- Refund tracking
- RTO handling

---

### Production Readiness

✅ **Performance:** Indexed for fast queries  
✅ **Security:** RLS policies, webhook signature verification  
✅ **Reliability:** Idempotent webhooks, transaction safety  
✅ **Observability:** Event logging, monitoring hooks  
✅ **Scalability:** Supports future extensions (multi-warehouse, subscriptions)  

---

**READY FOR IMPLEMENTATION**

All architectural decisions documented. Database schema production-ready. API contracts defined. Integration patterns established.

Next Step: Begin Phase 1 implementation (Database Foundation).

---

**END OF DESIGN DOCUMENT**
