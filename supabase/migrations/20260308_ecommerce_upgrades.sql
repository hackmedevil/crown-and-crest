-- ==============================================================
-- ECOMMERCE PLATFORM UPGRADES
-- Date: 2026-03-08
-- Purpose: Foundation for checkout, discovery, search, analytics, SEO
-- ==============================================================

-- ================================================================
-- PART 1: CATEGORIES TABLE (Product Discovery Foundation)
-- ================================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ================================================================
-- PART 2: UPDATE PRODUCTS TABLE FOR CATEGORY
-- ================================================================

-- Add category_id column (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='products' AND column_name='category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id);
    CREATE INDEX idx_products_category_id ON products(category_id);
  END IF;
END $$;

-- ================================================================
-- PART 3: FULL TEXT SEARCH SUPPORT
-- ================================================================

-- Add search_vector to products if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='products' AND column_name='search_vector'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN search_vector TSVECTOR 
    GENERATED ALWAYS AS (
      to_tsvector('english',
        coalesce(name, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(category, '')
      )
    ) STORED;
    
    CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);
  END IF;
END $$;

-- ================================================================
-- PART 4: ANALYTICS EVENTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,  -- Firebase UID or anonymous ID
  event_type TEXT NOT NULL,  -- view_product, add_to_cart, purchase, etc.
  product_id UUID REFERENCES products(id),
  order_id UUID,  -- When event is part of order
  category TEXT,  -- Product category at time of event
  metadata JSONB DEFAULT '{}',  -- Flexible data storage
  session_id TEXT,  -- Track user session
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'view_homepage',
      'view_shop',
      'view_product',
      'add_to_cart',
      'remove_from_cart',
      'view_cart',
      'begin_checkout',
      'add_shipping_info',
      'add_payment_info',
      'purchase',
      'purchase_refund',
      'search',
      'filter_used',
      'view_category'
    )
  )
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_product ON analytics_events(product_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

-- Performance: Partition by month for large datasets
CREATE TABLE IF NOT EXISTS analytics_events_202603 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- ================================================================
-- PART 5: SEARCH TRACKING (for search quality analytics)
-- ================================================================

CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id TEXT,
  category_filter TEXT,
  results_count INTEGER,
  clicked_product_id UUID,  -- Which product user clicked
  clicked_position INTEGER,  -- Position of clicked result
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (clicked_product_id) REFERENCES products(id)
);

CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_created ON search_analytics(created_at DESC);

-- ================================================================
-- PART 6: ABANDONED CARTS (for recovery campaigns)
-- ================================================================

CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  cart_items JSONB NOT NULL,  -- Snapshot of cart
  cart_total INTEGER,  -- Total in paise
  email TEXT,
  phone TEXT,
  recovery_email_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX idx_abandoned_carts_user ON abandoned_carts(user_id);
CREATE INDEX idx_abandoned_carts_created ON abandoned_carts(created_at DESC);
CREATE INDEX idx_abandoned_carts_expires ON abandoned_carts(expires_at) WHERE NOT recovered;

-- ================================================================
-- PART 7: PRODUCT ANALYTICS (aggregated metrics)
-- ================================================================

CREATE TABLE IF NOT EXISTS product_analytics (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  views_count INTEGER DEFAULT 0,
  add_to_cart_count INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  revenue_total INTEGER DEFAULT 0,  -- in paise
  avg_rating DECIMAL(2, 1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_analytics_orders ON product_analytics(orders_count DESC);
CREATE INDEX idx_product_analytics_revenue ON product_analytics(revenue_total DESC);

-- ================================================================
-- PART 8: SEO METADATA TABLE (for dynamic metadata per page)
-- ================================================================

CREATE TABLE IF NOT EXISTS seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT,  -- products, categories, pages
  entity_id UUID,
  title TEXT,
  description TEXT,
  keywords TEXT,
  canonical_url TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('products', 'categories', 'pages'))
);

CREATE INDEX idx_seo_metadata_entity ON seo_metadata(entity_type, entity_id);

-- ================================================================
-- PART 9: CREATE TRIGGERS FOR UPDATED_AT COLUMNS
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to categories
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to seo_metadata
DROP TRIGGER IF EXISTS trigger_seo_metadata_updated_at ON seo_metadata;
CREATE TRIGGER trigger_seo_metadata_updated_at
  BEFORE UPDATE ON seo_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- PART 10: RPC FUNCTIONS FOR PRODUCTION QUERIES
-- ================================================================

-- Get products with filters (production-ready)
CREATE OR REPLACE FUNCTION get_filtered_products(
  p_category_id UUID DEFAULT NULL,
  p_min_price INTEGER DEFAULT NULL,
  p_max_price INTEGER DEFAULT NULL,
  p_size TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  base_price INTEGER,
  image_url TEXT,
  category_id UUID,
  views_count INTEGER,
  orders_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.base_price,
    p.image_url,
    p.category_id,
    COALESCE(pa.views_count, 0),
    COALESCE(pa.orders_count, 0)
  FROM products p
  LEFT JOIN product_analytics pa ON p.id = pa.product_id
  LEFT JOIN product_variants pv ON p.id = pv.product_id
  WHERE 
    (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_min_price IS NULL OR p.base_price >= p_min_price)
    AND (p_max_price IS NULL OR p.base_price <= p_max_price)
    AND (p_size IS NULL OR pv.size = p_size)
    AND p.is_active = TRUE
  GROUP BY p.id, pa.views_count, pa.orders_count
  ORDER BY
    CASE p_sort
      WHEN 'price_asc' THEN p.base_price
      WHEN 'price_desc' THEN -p.base_price
      WHEN 'bestseller' THEN -COALESCE(pa.orders_count, 0)
      WHEN 'newest' THEN -EXTRACT(EPOCH FROM p.created_at)
      ELSE -EXTRACT(EPOCH FROM p.created_at)
    END
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Search products with ranking
CREATE OR REPLACE FUNCTION search_products(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  base_price INTEGER,
  image_url TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.base_price,
    p.image_url,
    ts_rank(p.search_vector, plainto_tsquery('english', p_query))
  FROM products p
  WHERE 
    p.search_vector @@ plainto_tsquery('english', p_query)
    AND p.is_active = TRUE
  ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Log analytics event (used by frontend)
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_user_id TEXT,
  p_event_type TEXT,
  p_product_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    user_id,
    event_type,
    product_id,
    metadata,
    session_id,
    ip_address
  ) VALUES (
    p_user_id,
    p_event_type,
    p_product_id,
    COALESCE(p_metadata, '{}'),
    p_session_id,
    p_ip_address
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Update product analytics after order
CREATE OR REPLACE FUNCTION update_product_analytics_after_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_analytics (
    product_id,
    views_count,
    add_to_cart_count,
    orders_count,
    revenue_total
  ) VALUES (
    NEW.product_id,
    0,
    0,
    1,
    NEW.line_total
  )
  ON CONFLICT (product_id) DO UPDATE SET
    orders_count = product_analytics.orders_count + 1,
    revenue_total = product_analytics.revenue_total + NEW.line_total,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Products - critical lookups
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(base_price);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Variants - frequently joined
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_size ON product_variants(size);

-- Stock lookup
CREATE INDEX IF NOT EXISTS idx_stock_variants_product ON stock_variants(product_id);

-- ================================================================
-- DOCUMENTATION
-- ================================================================

COMMENT ON TABLE categories IS 'Product categories with hierarchy support for discovery';
COMMENT ON TABLE analytics_events IS 'All ecommerce events (view, add-to-cart, purchase, etc)';
COMMENT ON TABLE search_analytics IS 'Search queries and user interactions for SEO optimization';
COMMENT ON TABLE abandoned_carts IS 'Shopping carts abandoned before checkout - for recovery campaigns';
COMMENT ON TABLE product_analytics IS 'Aggregated product performance metrics';
COMMENT ON TABLE seo_metadata IS 'Custom SEO metadata per product/category/page';

COMMENT ON FUNCTION get_filtered_products IS 'Production-grade product filtering with sorting';
COMMENT ON FUNCTION search_products IS 'Full-text search with ranking';
COMMENT ON FUNCTION log_analytics_event IS 'Log ecommerce event to analytics table';

-- ================================================================
-- INITIAL DATA
-- ================================================================

-- Insert sample categories (can be customized per store)
INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
  ('Men', 'men', 'Mens clothing and accessories', 1, TRUE),
  ('Women', 'women', 'Womens clothing and accessories', 2, TRUE),
  ('Kids', 'kids', 'Childrens clothing', 3, TRUE),
  ('Sale', 'sale', 'Discounted items', 4, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- ================================================================
-- GRANTS (if using RLS)
-- ================================================================

-- Allow authenticated users to read analytics
-- ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own analytics" ON analytics_events
--   FOR SELECT USING (auth.uid()::text = user_id);

-- ================================================================
-- END OF MIGRATION
-- ================================================================

-- Drop old checkout redirect page will be handled in app migration
-- Created at: 2026-03-08
-- Version: 1.0
-- Status: Ready for production
