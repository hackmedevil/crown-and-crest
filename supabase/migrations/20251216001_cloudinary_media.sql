-- Cloudinary-based media data model for products and variants
-- No triggers, no UI/upload logic. Future-ready for video and 360 sets.

-- 0) Types
DO $$ BEGIN
  CREATE TYPE media_resource_type AS ENUM ('image','video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_collection_type AS ENUM ('gallery','spin360','video_set');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Optional collections to group media (e.g., 360 spins)
-- Owner can be product OR variant (exclusive). Kept small and optional.
CREATE TABLE IF NOT EXISTS media_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid NULL REFERENCES variants(id) ON DELETE CASCADE,
  collection_type media_collection_type NOT NULL DEFAULT 'gallery',
  label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_collections_owner_xor CHECK (
    (product_id IS NOT NULL)::int + (variant_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS idx_media_collections_product ON media_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_media_collections_variant ON media_collections(variant_id);

-- 2) Product-level media
CREATE TABLE IF NOT EXISTS product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id uuid NULL REFERENCES media_collections(id) ON DELETE SET NULL,
  cloudinary_public_id text NOT NULL,
  resource_type media_resource_type NOT NULL,
  width int NULL CHECK (width IS NULL OR width > 0),
  height int NULL CHECK (height IS NULL OR height > 0),
  -- Aspect ratio stored; optionally computed on write by app layer
  aspect_ratio numeric(8,6) NULL CHECK (aspect_ratio IS NULL OR aspect_ratio > 0),
  alt_text text NULL,
  position int NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure max one primary per product
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_media_primary
  ON product_media(product_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_product_media_product_position
  ON product_media(product_id, position);

CREATE INDEX IF NOT EXISTS idx_product_media_public_id
  ON product_media(cloudinary_public_id);

-- 3) Variant-level media (optional per variant)
CREATE TABLE IF NOT EXISTS variant_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  collection_id uuid NULL REFERENCES media_collections(id) ON DELETE SET NULL,
  cloudinary_public_id text NOT NULL,
  resource_type media_resource_type NOT NULL,
  width int NULL CHECK (width IS NULL OR width > 0),
  height int NULL CHECK (height IS NULL OR height > 0),
  aspect_ratio numeric(8,6) NULL CHECK (aspect_ratio IS NULL OR aspect_ratio > 0),
  alt_text text NULL,
  position int NOT NULL DEFAULT 0 CHECK (position >= 0),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure max one primary per variant
CREATE UNIQUE INDEX IF NOT EXISTS ux_variant_media_primary
  ON variant_media(variant_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_variant_media_variant_position
  ON variant_media(variant_id, position);

CREATE INDEX IF NOT EXISTS idx_variant_media_public_id
  ON variant_media(cloudinary_public_id);

-- Notes on ownership rules (no triggers):
-- - Product soft-delete: Do NOT delete media; storefront queries must exclude soft-deleted products,
--   so product_media remains accessible to admin but hidden on storefront.
-- - Variant disabled: Do NOT delete media; storefront should ignore variant_media for disabled variants
--   and fallback to product_media for imagery.

-- Performance guidance (no code, for reference):
-- - LCP: Always fetch the owner's is_primary=true record first.
-- - Hover image: Use next media by position (position ASC) after primary.
-- - Gallery: Fetch all is_active=true ordered by position.
-- - Responsive: Use stored width/height/aspect_ratio to build sizes/srcset; Cloudinary public_id drives URLs.

-- Integrity helpers (optional best-effort):
-- - Enforce at least one media per product at the application layer.
-- - Prefer image primary; videos can be supplemental.
