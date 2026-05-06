-- ============================================
-- HOMEPAGE SYSTEM - PHASE 1: FOUNDATION
-- ============================================
-- Purpose: Enable admin-driven homepage content
-- without code changes or UI redesign
-- ============================================

-- Create enum for homepage section types
CREATE TYPE homepage_section_type AS ENUM (
  'hero',
  'banner',
  'category_grid',
  'product_grid',
  'product_slider',
  'seasonal_highlight'
);

-- ============================================
-- TABLE: collections
-- ============================================
-- Purpose: Reusable product groups for homepage
-- and other pages (e.g., "Best Sellers", "New Arrivals")
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active collections lookup
CREATE INDEX idx_collections_active ON collections(is_active) WHERE is_active = true;

-- Index for slug lookup
CREATE INDEX idx_collections_slug ON collections(slug);

-- ============================================
-- TABLE: collection_items
-- ============================================
-- Purpose: Junction table linking products to collections
-- with ordering capability
-- ============================================
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure a product isn't added to the same collection twice
  UNIQUE(collection_id, product_id)
);

-- Index for ordering products within a collection
CREATE INDEX idx_collection_items_ordering ON collection_items(collection_id, position);

-- Index for product lookup
CREATE INDEX idx_collection_items_product ON collection_items(product_id);

-- ============================================
-- TABLE: homepage_sections
-- ============================================
-- Purpose: Define sections on the homepage with
-- ordering, type, and flexible JSON config
-- ============================================
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type homepage_section_type NOT NULL,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering active sections on homepage
CREATE INDEX idx_homepage_sections_ordering ON homepage_sections(position) 
  WHERE is_active = true;

-- Index for active sections
CREATE INDEX idx_homepage_sections_active ON homepage_sections(is_active) 
  WHERE is_active = true;

-- Index for collection lookup
CREATE INDEX idx_homepage_sections_collection ON homepage_sections(collection_id);

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homepage_sections_updated_at
  BEFORE UPDATE ON homepage_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE collections IS 'Reusable product groups used across the site';
COMMENT ON TABLE collection_items IS 'Products within collections with ordering';
COMMENT ON TABLE homepage_sections IS 'Admin-configurable homepage sections';
COMMENT ON COLUMN homepage_sections.config IS 'JSON configuration for layout, colors, CTA text, etc.';
COMMENT ON TYPE homepage_section_type IS 'Available homepage section layout types';
