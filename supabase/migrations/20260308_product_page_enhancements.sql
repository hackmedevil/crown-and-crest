-- ==============================================================
-- PRODUCT DETAIL PAGE ENHANCEMENTS
-- Date: 2026-03-08
-- Purpose: Reviews, recommendations, analytics for PDP
-- ==============================================================

-- ================================================================
-- PART 1: PRODUCT REVIEWS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL,
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT FALSE,
  images JSONB DEFAULT '[]',  -- Array of image URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT unique_review_per_user CHECK (user_id IS NOT NULL)
);

CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_created ON product_reviews(created_at DESC);
CREATE INDEX idx_product_reviews_verified ON product_reviews(verified_purchase);

-- ================================================================
-- PART 2: REVIEW HELPFULNESS TRACKING
-- ================================================================

CREATE TABLE IF NOT EXISTS review_helpfulness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(review_id, user_id)  -- One vote per user per review
);

CREATE INDEX idx_review_helpfulness_review ON review_helpfulness(review_id);
CREATE INDEX idx_review_helpfulness_user ON review_helpfulness(user_id);

-- ================================================================
-- PART 3: PRODUCT COMBINATIONS (Frequently Bought Together)
-- ================================================================

CREATE TABLE IF NOT EXISTS product_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  frequently_bought_with_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  frequency INTEGER DEFAULT 1,
  combo_value DECIMAL(10, 2) DEFAULT 0,  -- Average cart value with both products
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT no_self_reference CHECK (product_id != frequently_bought_with_id),
  UNIQUE(product_id, frequently_bought_with_id)
);

CREATE INDEX idx_product_combinations_main ON product_combinations(product_id);
CREATE INDEX idx_product_combinations_related ON product_combinations(frequently_bought_with_id);

-- ================================================================
-- PART 4: RECENTLY VIEWED PRODUCTS (Analytics)
-- ================================================================

CREATE TABLE IF NOT EXISTS recently_viewed_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  session_id TEXT,
  view_count INTEGER DEFAULT 1,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_recently_viewed_user ON recently_viewed_products(user_id);
CREATE INDEX idx_recently_viewed_product ON recently_viewed_products(product_id);
CREATE INDEX idx_recently_viewed_timestamp ON recently_viewed_products(last_viewed_at DESC);

-- ================================================================
-- PART 5: PRODUCT QA TABLE (Q&A feature - optional future)
-- ================================================================

CREATE TABLE IF NOT EXISTS product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES product_questions(id),  -- Admin answer
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

CREATE INDEX idx_product_questions_product ON product_questions(product_id);
CREATE INDEX idx_product_questions_answered ON product_questions(answer) WHERE answer IS NOT NULL;

-- ================================================================
-- PART 6: UPDATE PRODUCTS TABLE (Add review fields)
-- ================================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='products' AND column_name='average_rating'
  ) THEN
    ALTER TABLE products
    ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0,
    ADD COLUMN review_count INTEGER DEFAULT 0,
    ADD COLUMN verified_purchase_count INTEGER DEFAULT 0;
    
    CREATE INDEX idx_products_average_rating ON products(average_rating DESC);
    CREATE INDEX idx_products_review_count ON products(review_count DESC);
  END IF;
END $$;

-- ================================================================
-- PART 7: RPC FUNCTIONS FOR PRODUCT PAGE
-- ================================================================

-- Get product with all related data
CREATE OR REPLACE FUNCTION get_product_detail(p_product_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  base_price INTEGER,
  compare_price INTEGER,
  image_url TEXT,
  images JSONB,
  category_id UUID,
  average_rating DECIMAL,
  review_count INTEGER,
  verified_purchases INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.description,
    p.base_price,
    p.compare_price,
    p.image_url,
    p.images,
    p.category_id,
    p.average_rating,
    p.review_count,
    p.verified_purchase_count,
    p.status
  FROM products p
  WHERE p.id = p_product_id
  AND p.is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get rating distribution
CREATE OR REPLACE FUNCTION get_rating_distribution(p_product_id UUID)
RETURNS TABLE(
  rating INTEGER,
  count INTEGER,
  percentage DECIMAL
) AS $$
DECLARE
  v_total_reviews INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_reviews FROM product_reviews WHERE product_id = p_product_id;
  
  IF v_total_reviews = 0 THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT 
    r.rating,
    COUNT(*)::INTEGER as count,
    ROUND((COUNT(*)::DECIMAL / v_total_reviews * 100), 1)
  FROM product_reviews r
  WHERE r.product_id = p_product_id
  GROUP BY r.rating
  ORDER BY r.rating DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get frequently bought together
CREATE OR REPLACE FUNCTION get_frequently_bought_together(p_product_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  base_price INTEGER,
  image_url TEXT,
  frequency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.frequently_bought_with_id,
    p.name,
    p.base_price,
    p.image_url,
    pc.frequency
  FROM product_combinations pc
  JOIN products p ON pc.frequently_bought_with_id = p.id
  WHERE pc.product_id = p_product_id
  AND p.is_active = TRUE
  ORDER BY pc.frequency DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get similar products
CREATE OR REPLACE FUNCTION get_similar_products(p_product_id UUID, p_category_id UUID, p_limit INTEGER DEFAULT 8)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  base_price INTEGER,
  image_url TEXT,
  average_rating DECIMAL,
  review_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.slug,
    p.base_price,
    p.image_url,
    p.average_rating,
    p.review_count
  FROM products p
  WHERE p.category_id = p_category_id
  AND p.id != p_product_id
  AND p.is_active = TRUE
  ORDER BY p.average_rating DESC, p.review_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get recently viewed products for user
CREATE OR REPLACE FUNCTION get_recently_viewed(p_user_id TEXT, p_limit INTEGER DEFAULT 8)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  slug TEXT,
  base_price INTEGER,
  image_url TEXT,
  viewed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rv.product_id,
    p.name,
    p.slug,
    p.base_price,
    p.image_url,
    rv.last_viewed_at
  FROM recently_viewed_products rv
  JOIN products p ON rv.product_id = p.id
  WHERE rv.user_id = p_user_id
  AND p.is_active = TRUE
  ORDER BY rv.last_viewed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Log product view (upsert)
CREATE OR REPLACE FUNCTION log_product_view(p_user_id TEXT, p_product_id UUID, p_session_id TEXT DEFAULT NULL)
RETURNS UUID AS $$
BEGIN
  INSERT INTO recently_viewed_products (user_id, product_id, session_id, view_count, last_viewed_at)
  VALUES (p_user_id, p_product_id, p_session_id, 1, NOW())
  ON CONFLICT (user_id, product_id) DO UPDATE SET
    view_count = recently_viewed_products.view_count + 1,
    last_viewed_at = NOW();
  
  RETURN p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 8: TRIGGERS FOR AUTO-UPDATE RATING
-- ================================================================

CREATE OR REPLACE FUNCTION update_product_rating_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM product_reviews
      WHERE product_id = NEW.product_id
        AND created_at > NOW() - INTERVAL '2 years'
    ), 0),
    review_count = COALESCE((
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id
    ), 0),
    verified_purchase_count = COALESCE((
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = NEW.product_id
        AND verified_purchase = TRUE
    ), 0)
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_rating ON product_reviews;
CREATE TRIGGER trigger_update_product_rating
  AFTER INSERT ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_product_rating_summary();

-- ================================================================
-- PART 9: FUNCTION TO UPDATE FREQUENTLY BOUGHT TOGETHER
-- ================================================================

-- This should be run periodically (daily cron) to update combinations
CREATE OR REPLACE FUNCTION update_frequently_bought_together()
RETURNS TABLE(
  processed_count INTEGER
) AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert/update combinations from recent orders
  INSERT INTO product_combinations (product_id, frequently_bought_with_id, frequency, combo_value)
  SELECT 
    oi1.product_id,
    oi2.product_id,
    COUNT(*) as frequency,
    AVG(CAST(oi1.line_total + oi2.line_total AS DECIMAL)) as avg_value
  FROM order_items oi1
  JOIN order_items oi2 ON oi1.order_id = oi2.order_id
  JOIN orders o ON oi1.order_id = o.id
  WHERE oi1.product_id != oi2.product_id
    AND o.created_at > NOW() - INTERVAL '30 days'
  GROUP BY oi1.product_id, oi2.product_id
  HAVING COUNT(*) >= 2  -- Only combos bought together at least twice
  ON CONFLICT (product_id, frequently_bought_with_id) DO UPDATE SET
    frequency = EXCLUDED.frequency,
    combo_value = EXCLUDED.combo_value,
    last_updated = NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- INITIAL DATA
-- ================================================================

-- Update existing product ratings from reviews if any exist
DO $$
BEGIN
  UPDATE products
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM product_reviews
      WHERE product_id = products.id
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = products.id
    )
  WHERE review_count = 0
    AND EXISTS (SELECT 1 FROM product_reviews WHERE product_id = products.id);
END $$;

-- ================================================================
-- DOCUMENTATION
-- ================================================================

COMMENT ON TABLE product_reviews IS 'Customer reviews and ratings for products';
COMMENT ON TABLE product_combinations IS 'Track products frequently bought together for upselling';
COMMENT ON TABLE recently_viewed_products IS 'User browsing history for personalization';
COMMENT ON FUNCTION get_product_detail IS 'Get complete product information for PDP';
COMMENT ON FUNCTION get_rating_distribution IS 'Get rating breakdown (5 stars, 4 stars, etc.)';
COMMENT ON FUNCTION get_frequently_bought_together IS 'Get products commonly purchased with this product';
COMMENT ON FUNCTION get_similar_products IS 'Get related products in same category';

-- ================================================================
-- END OF MIGRATION
-- ================================================================
