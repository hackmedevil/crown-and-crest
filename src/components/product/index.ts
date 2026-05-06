/**
 * Product Grid System - Barrel Exports
 * 
 * Import all product grid components from a single location
 */

// Main Components
export { default as ProductCard } from './ProductCard'
export { default as ProductGrid } from './ProductGrid'
export { default as ProductCardSkeleton, ProductGridSkeleton } from './ProductCardSkeleton'
export { default as VirtualizedProductGrid } from './VirtualizedProductGrid'
export { default as ProductListingExample } from './ProductListingExample'

// Re-export types
export type { GridProduct, ColorVariant, ProductCardProps, ProductGridProps } from '@/types/grid'
