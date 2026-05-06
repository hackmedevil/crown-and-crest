/**
 * HOMEPAGE TYPES
 * 
 * Defines the structure for admin-configurable homepage sections.
 * Each section has a type, optional collection, position, and flexible config.
 */

import type { CollectionWithProducts } from './collection'

/**
 * Available homepage section types
 * Each type corresponds to a different layout/component
 */
export enum HomepageSectionType {
  HERO = 'hero',
  BANNER = 'banner',
  CATEGORY_GRID = 'category_grid',
  PRODUCT_GRID = 'product_grid',
  PRODUCT_SLIDER = 'product_slider',
  SEASONAL_HIGHLIGHT = 'seasonal_highlight'
}

/**
 * Base section configuration
 * Extended by specific section types
 */
export interface BaseSectionConfig {
  // Common config fields across all sections
  backgroundColor?: string
  textColor?: string
  padding?: string
  maxWidth?: string
}

/**
 * Hero section config
 */
export interface HeroSectionConfig extends BaseSectionConfig {
  heading: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  backgroundImage?: string
  alignment?: 'left' | 'center' | 'right'
}

/**
 * Banner section config
 */
export interface BannerSectionConfig extends BaseSectionConfig {
  text: string
  ctaText?: string
  ctaLink?: string
  image?: string
  layout?: 'full-width' | 'centered' | 'split'
}

/**
 * Product grid section config
 */
export interface ProductGridSectionConfig extends BaseSectionConfig {
  columns?: number
  showPrice?: boolean
  showAddToCart?: boolean
  itemsPerPage?: number
}

/**
 * Product slider section config
 */
export interface ProductSliderSectionConfig extends BaseSectionConfig {
  autoplay?: boolean
  autoplayDelay?: number
  showNavigation?: boolean
  showPagination?: boolean
  itemsPerView?: number
}

/**
 * Category grid section config
 */
export interface CategoryGridSectionConfig extends BaseSectionConfig {
  columns?: number
  showDescription?: boolean
  layout?: 'grid' | 'masonry'
}

/**
 * Seasonal highlight section config
 */
export interface SeasonalHighlightSectionConfig extends BaseSectionConfig {
  theme?: string
  badge?: string
  featured?: boolean
}

/**
 * Union type for all possible section configs
 */
export type HomepageSectionConfig =
  | HeroSectionConfig
  | BannerSectionConfig
  | ProductGridSectionConfig
  | ProductSliderSectionConfig
  | CategoryGridSectionConfig
  | SeasonalHighlightSectionConfig
  | Record<string, unknown> // Fallback for custom configs

/**
 * Homepage section (raw from database)
 */
export interface HomepageSection {
  id: string
  title: string
  type: HomepageSectionType
  collection_id: string | null
  position: number
  is_active: boolean
  config: HomepageSectionConfig
  created_at: string
  updated_at: string
}

/**
 * Homepage section with nested collection data
 * Used when rendering the homepage
 */
export interface HomepageSectionWithCollection extends Omit<HomepageSection, 'collection_id'> {
  collection: CollectionWithProducts | null
}

/**
 * Complete homepage data structure
 * Returned by getHomepageData()
 */
export interface HomepageData {
  sections: HomepageSectionWithCollection[]
}
