export type ProductMedia = {
  id: string
  cloudinary_public_id: string
  resource_type: 'image' | 'video'
  width: number | null
  height: number | null
  aspect_ratio: number | null
  alt_text: string | null
  position: number
  is_primary: boolean
}

export type Product = {
  id: string
  name: string
  slug: string
  base_price: number  // Renamed from 'price'
  description?: string  // Renamed from 'short_description'
  short_description?: string
  bullet_points?: string[]
  image_url?: string  // Legacy field from database
  images?: Array<{ url: string; alt: string }>  // Changed from 'image_url' text
  tags?: string[]  // New field
  category?: string
  gender?: string
  fit?: string
  target_audience?: string
  weight_grams?: number | null
  dimensions_json?: {
    length: number
    width: number
    height: number
  } | null
  is_active?: boolean  // Legacy field from database
  active?: boolean
  published?: boolean
  featured?: boolean
  meta_title?: string
  meta_description?: string
  created_at?: string
  updated_at?: string
  media?: ProductMedia[]  // Cloudinary media (primary first, then by position)
  product_variants?: unknown[]  // For PDP compatibility
}

export type Variant = {
  id: string
  product_id: string
  sku: string
  size: string
  color?: string
  price_override?: number
  stock_quantity: number
  low_stock_threshold: number
  enabled: boolean  // Renamed from 'is_enabled'
  images?: Array<{ url: string; alt: string }>  // New field
  position: number
  created_at: string
  updated_at: string
}

export type CartItem = {
  id: string
  firebase_uid: string
  variant_id: string  // Only variant_id now, removed product_id
  quantity: number
  created_at: string
  updated_at: string
}

