-- Create color_groups table for hierarchical variant structure
-- Level 1: Color Groups (master variants with shared images)
-- Level 2: Size Variants (child variants under color groups)

CREATE TABLE IF NOT EXISTS color_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  color_id UUID NOT NULL,
  color_name VARCHAR(255) NOT NULL,
  hex_code VARCHAR(7),
  enabled BOOLEAN NOT NULL DEFAULT true,
  position INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_color_groups_product_id 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_color_groups_color_id 
    FOREIGN KEY (color_id) 
    REFERENCES colors(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT unique_product_color 
    UNIQUE (product_id, color_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_color_groups_product_id ON color_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_color_groups_color_id ON color_groups(color_id);
CREATE INDEX IF NOT EXISTS idx_color_groups_enabled ON color_groups(product_id, enabled);

-- Add comments
COMMENT ON TABLE color_groups IS 'Master variant groups representing each color. Images are stored at this level and shared across all size variants under the same color.';
COMMENT ON COLUMN color_groups.product_id IS 'Link to parent product';
COMMENT ON COLUMN color_groups.color_id IS 'Link to color profile color';
COMMENT ON COLUMN color_groups.color_name IS 'Denormalized color name for quick access';
COMMENT ON COLUMN color_groups.hex_code IS 'Denormalized hex code for quick access';
COMMENT ON COLUMN color_groups.enabled IS 'Whether this color is active/visible on storefront';
COMMENT ON COLUMN color_groups.position IS 'Display order of colors in product gallery';

-- Modify variants table to support color group hierarchy
-- Add color_group_id foreign key
ALTER TABLE variants
  ADD COLUMN IF NOT EXISTS color_group_id UUID;

ALTER TABLE variants
  ADD CONSTRAINT fk_variants_color_group_id 
    FOREIGN KEY (color_group_id) 
    REFERENCES color_groups(id) 
    ON DELETE CASCADE;

-- Create index for faster lookups by color group
CREATE INDEX IF NOT EXISTS idx_variants_color_group_id ON variants(color_group_id);

-- Add comment
COMMENT ON COLUMN variants.color_group_id IS 'Link to parent color group. All size variants under same color share color group images.';

-- Create color_group_images table
CREATE TABLE IF NOT EXISTS color_group_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  color_group_id UUID NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  position INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  alt_text VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_color_group_images_color_group_id 
    FOREIGN KEY (color_group_id) 
    REFERENCES color_groups(id) 
    ON DELETE CASCADE
);

-- Create indexes for color group images
CREATE INDEX IF NOT EXISTS idx_color_group_images_color_group_id ON color_group_images(color_group_id);
CREATE INDEX IF NOT EXISTS idx_color_group_images_is_primary ON color_group_images(color_group_id, is_primary);

-- Add comment
COMMENT ON TABLE color_group_images IS 'Images for color groups. All size variants under the same color group display these images. Images are shared across sizes to reduce duplication.';
COMMENT ON COLUMN color_group_images.position IS 'Display order of images within color group (0 = first)';
COMMENT ON COLUMN color_group_images.is_primary IS 'Whether this is the primary/featured image for the color group';
