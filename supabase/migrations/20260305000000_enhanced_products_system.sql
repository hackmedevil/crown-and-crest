-- Enhanced Products System Migration
-- Created: March 5, 2026
-- Purpose: Add AI embeddings, flexible variants, performance optimization, and atomic stock operations

-- ============================================================================
-- 1. PRODUCT EMBEDDINGS TABLE (AI Semantic Search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  model_version text NOT NULL DEFAULT 'text-embedding-3-small',
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one embedding per product per model version
  UNIQUE(product_id, model_version)
);

-- Index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_product_embeddings_vector 
ON product_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_product_embeddings_product_id 
ON product_embeddings(product_id);

COMMENT ON TABLE product_embeddings IS 'Stores AI embeddings for semantic product search';
COMMENT ON COLUMN product_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';

-- ============================================================================
-- 2. VARIANT ATTRIBUTES TABLE (Flexible Attributes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS variant_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_name text NOT NULL CHECK (attribute_name != ''),
  attribute_value text NOT NULL CHECK (attribute_value != ''),
  display_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique attribute names per variant
  UNIQUE(variant_id, attribute_name)
);

-- Index for efficient variant attribute lookups
CREATE INDEX IF NOT EXISTS idx_variant_attributes_variant_id 
ON variant_attributes(variant_id);

-- Index for searching by attribute name
CREATE INDEX IF NOT EXISTS idx_variant_attributes_name 
ON variant_attributes(attribute_name);

COMMENT ON TABLE variant_attributes IS 'Flexible key-value attributes for product variants (size, color, material, pattern, etc.)';
COMMENT ON COLUMN variant_attributes.attribute_name IS 'Attribute key (e.g., "size", "color", "material")';
COMMENT ON COLUMN variant_attributes.attribute_value IS 'Attribute value (e.g., "Large", "Red", "Cotton")';

-- ============================================================================
-- 3. PRODUCT IMAGES TABLE (Structured Media Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cloudinary_public_id text NOT NULL,
  cloudinary_version text,
  position int NOT NULL DEFAULT 0,
  alt_text text,
  is_primary boolean NOT NULL DEFAULT false,
  width int,
  height int,
  format text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique positions per product
  UNIQUE(product_id, position),
  -- Ensure cloudinary_public_id is not empty
  CHECK (cloudinary_public_id != '')
);

-- Index for efficient product image lookups
CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
ON product_images(product_id);

-- Index for finding primary images
CREATE INDEX IF NOT EXISTS idx_product_images_primary 
ON product_images(product_id, is_primary) 
WHERE is_primary = true;

COMMENT ON TABLE product_images IS 'Structured storage for product images with Cloudinary integration';
COMMENT ON COLUMN product_images.cloudinary_public_id IS 'Cloudinary public ID for the image';
COMMENT ON COLUMN product_images.position IS 'Display order (0 = first image)';

-- ============================================================================
-- 4. EXTEND PRODUCTS TABLE
-- ============================================================================

-- Add brand column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'brand'
  ) THEN
    ALTER TABLE products ADD COLUMN brand text;
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand) WHERE brand IS NOT NULL;
  END IF;
END $$;

-- Add status enum and column
DO $$ 
BEGIN
  -- Create enum type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status product_status NOT NULL DEFAULT 'draft';
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
  END IF;
END $$;

-- Add AI metadata column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'ai_metadata'
  ) THEN
    ALTER TABLE products ADD COLUMN ai_metadata jsonb DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_products_ai_metadata ON products USING gin(ai_metadata);
  END IF;
END $$;

-- Add logistics fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'hs_code'
  ) THEN
    ALTER TABLE products ADD COLUMN hs_code text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'country_of_origin'
  ) THEN
    ALTER TABLE products ADD COLUMN country_of_origin text;
  END IF;
END $$;

-- Add search visibility flag
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_searchable'
  ) THEN
    ALTER TABLE products ADD COLUMN is_searchable boolean NOT NULL DEFAULT true;
    CREATE INDEX IF NOT EXISTS idx_products_searchable ON products(is_searchable) WHERE is_searchable = true;
  END IF;
END $$;

-- Add SEO keywords array
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'seo_keywords'
  ) THEN
    ALTER TABLE products ADD COLUMN seo_keywords text[] DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_products_seo_keywords ON products USING gin(seo_keywords);
  END IF;
END $$;

-- Add product constraints
DO $$
BEGIN
  -- First, fix any existing products with invalid base_price
  UPDATE products SET base_price = 1.00 WHERE base_price <= 0;
  
  -- Ensure base_price is positive
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_base_price_positive'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_base_price_positive CHECK (base_price > 0);
  END IF;
END $$;

-- ============================================================================
-- 5. EXTEND VARIANTS TABLE
-- ============================================================================

-- Add barcode column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variants' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE variants ADD COLUMN barcode text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;

-- Add cost_price column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variants' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE variants ADD COLUMN cost_price numeric(10,2);
  END IF;
END $$;

-- Add weight_grams column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'variants' AND column_name = 'weight_grams'
  ) THEN
    ALTER TABLE variants ADD COLUMN weight_grams int;
  END IF;
END $$;

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Variants table indexes
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON variants(stock_quantity);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_status_created 
ON products(status, created_at DESC) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_products_searchable_status 
ON products(is_searchable, status) 
WHERE is_searchable = true AND status = 'active';

-- ============================================================================
-- 7. ATOMIC STOCK RESERVATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION reserve_variant_stock_atomic(
  p_variant_id uuid,
  p_quantity int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock int;
  v_sku text;
BEGIN
  -- Lock the variant row for update
  SELECT stock_quantity, sku INTO v_current_stock, v_sku
  FROM variants
  WHERE id = p_variant_id
  FOR UPDATE;
  
  -- Check if variant exists
  IF v_current_stock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VARIANT_NOT_FOUND',
      'message', 'Variant not found'
    );
  END IF;
  
  -- Check if sufficient stock
  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_STOCK',
      'message', 'Insufficient stock available',
      'available', v_current_stock,
      'requested', p_quantity
    );
  END IF;
  
  -- Reserve stock
  UPDATE variants
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_variant_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'sku', v_sku,
    'reserved', p_quantity,
    'remaining', v_current_stock - p_quantity
  );
END;
$$;

COMMENT ON FUNCTION reserve_variant_stock_atomic IS 'Atomically reserves stock for a variant with row-level locking';

-- ============================================================================
-- 8. RELEASE STOCK FUNCTION (For Cart Cleanup)
-- ============================================================================

CREATE OR REPLACE FUNCTION release_variant_stock_atomic(
  p_variant_id uuid,
  p_quantity int
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sku text;
  v_new_stock int;
BEGIN
  -- Lock the variant row for update and release stock
  UPDATE variants
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_variant_id
  RETURNING sku, stock_quantity INTO v_sku, v_new_stock;
  
  -- Check if variant exists
  IF v_sku IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VARIANT_NOT_FOUND',
      'message', 'Variant not found'
    );
  END IF;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'sku', v_sku,
    'released', p_quantity,
    'new_stock', v_new_stock
  );
END;
$$;

COMMENT ON FUNCTION release_variant_stock_atomic IS 'Atomically releases reserved stock back to a variant';

-- ============================================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
DO $$
BEGIN
  -- product_embeddings trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_product_embeddings_updated_at'
  ) THEN
    CREATE TRIGGER update_product_embeddings_updated_at
      BEFORE UPDATE ON product_embeddings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- variant_attributes trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_variant_attributes_updated_at'
  ) THEN
    CREATE TRIGGER update_variant_attributes_updated_at
      BEFORE UPDATE ON variant_attributes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- product_images trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_product_images_updated_at'
  ) THEN
    CREATE TRIGGER update_product_images_updated_at
      BEFORE UPDATE ON product_images
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE product_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Public read access for active products' embeddings (for search)
CREATE POLICY "Public users can view embeddings for searchable products"
ON product_embeddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_embeddings.product_id
    AND products.status = 'active'
    AND products.is_searchable = true
  )
);

-- Public read access for variant attributes of active products
CREATE POLICY "Public users can view variant attributes for active products"
ON variant_attributes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM variants
    JOIN products ON products.id = variants.product_id
    WHERE variants.id = variant_attributes.variant_id
    AND products.status = 'active'
  )
);

-- Public read access for product images of active products
CREATE POLICY "Public users can view images for active products"
ON product_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = product_images.product_id
    AND products.status = 'active'
  )
);

-- Admin users have full access (handled by service role key in backend)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260305000000_enhanced_products_system.sql completed successfully';
  RAISE NOTICE '✓ Created product_embeddings table with vector search support';
  RAISE NOTICE '✓ Created variant_attributes table for flexible attributes';
  RAISE NOTICE '✓ Created product_images table for structured media';
  RAISE NOTICE '✓ Extended products table with brand, status, AI metadata, logistics, SEO';
  RAISE NOTICE '✓ Extended variants table with barcode, cost_price, weight_grams';
  RAISE NOTICE '✓ Added 15+ performance indexes';
  RAISE NOTICE '✓ Created reserve_variant_stock_atomic and release_variant_stock_atomic functions';
  RAISE NOTICE '✓ Configured RLS policies for public read access';
END $$;
