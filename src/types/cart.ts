import type { Product } from './product'
import type { PDPVariant } from '@/components/VariantSelector'

export type CartItem = {
  id: string
  quantity: number
  variant_id: string
  product_id: string
  products: Product
  variants: PDPVariant
}
