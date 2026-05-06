/**
 * Product Detail Page (PDP) Type Definitions
 * 
 * Clean, canonical data contract for the product page.
 * This replaces raw database types with structured, computed data.
 */

export interface PDPProduct {
  id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  category: { id: string; name: string } | null
  brand: string | null
  fabric: string | null
  gsm: number | null
  fit_type: string | null
  print_type: string | null
  tags: string[]
  enable_variant_image_switching: boolean
  shipping_charge: number
}

export interface PDPPricing {
  base_price: number
  selling_price: number
  mrp: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number | null
  discount_active: boolean
  savings_amount: number
  savings_percentage: number
}

export interface PDPVariant {
  id: string
  sku: string
  enabled: boolean
  size: string | null
  color: string | null
  color_group_id: string | null
  price_override: number | null
  final_price: number
  stock_quantity: number
  available_to_sell: number
  is_out_of_stock: boolean
  options: Record<string, string>
  images: Array<{ url: string; position: number }>
}

export interface PDPColorGroup {
  id: string
  name: string
  primary_color_id: string
  primary_hex: string
  variant_ids: string[]
  images: Array<{ url: string; position: number }>
  available_sizes: string[]
}

export interface PDPImages {
  hero: string
  gallery: Array<{ url: string; position: number }>
  priority_source: 'variant' | 'color_group' | 'product'
}

export interface PDPSizeChart {
  id: string
  name: string
  unit_system: 'metric' | 'imperial'
  measurements: Array<{
    size_label: string
    measurements: Record<string, number>
  }>
}

export interface PDPWashInstruction {
  id: string
  name: string
  summary: string | null
  details: string[]
}

export interface PDPMeta {
  has_size_recommendation: boolean
  total_variants: number
  in_stock_variants: number
}

export interface AvailabilityMatrix {
  color_to_sizes: Record<string, string[]>
  size_to_colors: Record<string, string[]>
  out_of_stock_variants: string[]
}

export interface PDPData {
  product: PDPProduct
  pricing: PDPPricing
  variants: PDPVariant[]
  color_groups: PDPColorGroup[]
  images: PDPImages
  size_chart: PDPSizeChart | null
  wash_instruction: PDPWashInstruction | null
  availability_matrix: AvailabilityMatrix
  meta: PDPMeta
}

/**
 * Internal helper types for data transformation
 */
export interface PricingParams {
  base_price: number
  variant_price_override: number | null
  discount_engine_enabled: boolean
  discount_type: 'percentage' | 'fixed'
  discount_value: number | null
  mrp: number | null
  cost_price: number | null
}

export interface ImageResolverParams {
  product: {
    images: any
    image_url: string | null
    enable_variant_image_switching: boolean
  }
  selected_variant: {
    id: string
    color_group_id: string | null
    images: Array<{ image_url: string; position: number; is_primary: boolean }>
  } | null
  color_group_images: Array<{ image_url: string; position: number }>
  product_images: Array<{ image_url: string; position: number }>
}
