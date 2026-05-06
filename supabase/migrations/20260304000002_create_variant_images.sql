-- Create variant_images table to link variants with their images
CREATE TABLE IF NOT EXISTS variant_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  position INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  alt_text VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_variant_images_variant_id 
    FOREIGN KEY (variant_id) 
    REFERENCES variants(id) 
    ON DELETE CASCADE
);

-- Create index for faster lookups by variant_id
CREATE INDEX IF NOT EXISTS idx_variant_images_variant_id ON variant_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_images_is_primary ON variant_images(variant_id, is_primary);

-- Add comment to table
COMMENT ON TABLE variant_images IS 'Links variant records to their images in order, with support for primary image designation';
COMMENT ON COLUMN variant_images.position IS 'Display order of images for this variant (0 = first)';
COMMENT ON COLUMN variant_images.is_primary IS 'Whether this is the primary/featured image for the variant';
COMMENT ON COLUMN variant_images.alt_text IS 'Alternative text for accessibility';
