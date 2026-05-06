/**
 * Cache Service
 * Provides granular cache management with specific tags for products, variants, and lists
 * Uses Next.js revalidateTag for precise cache invalidation
 */

import { revalidateTag } from 'next/cache';

/**
 * Cache tags used throughout the application
 * Granular tags prevent over-invalidation
 */
export const CACHE_TAGS = {
  PRODUCTS_LIST: 'products-list',
  PRODUCT: (id: string) => `product-${id}`,
  VARIANTS: (productId: string) => `variants-${productId}`,
  PRODUCT_IMAGES: (productId: string) => `product-images-${productId}`,
  PRODUCT_EMBEDDING: (productId: string) => `product-embedding-${productId}`,
  COLLECTIONS_LIST: 'collections-list',
  CATEGORIES_LIST: 'categories-list',
} as const;

/**
 * Cache durations (in seconds)
 */
export const CACHE_DURATION = {
  PRODUCTS_LIST: 300, // 5 minutes
  PRODUCT_DETAIL: 600, // 10 minutes
  VARIANTS: 600, // 10 minutes
  COLLECTIONS: 1800, // 30 minutes
  CATEGORIES: 1800, // 30 minutes
} as const;

export class CacheService {
  /**
   * Invalidate the products list cache
   * Call when products are created, updated, or deleted
   */
  static invalidateProductsList(): void {
    revalidateTag(CACHE_TAGS.PRODUCTS_LIST, 'layout');
  }

  /**
   * Invalidate a specific product's cache
   * Call when a product is updated or deleted
   */
  static invalidateProduct(productId: string): void {
    revalidateTag(CACHE_TAGS.PRODUCT(productId), 'layout');
  }

  /**
   * Invalidate a product's variants cache
   * Call when variants are added, updated, or deleted
   */
  static invalidateVariants(productId: string): void {
    revalidateTag(CACHE_TAGS.VARIANTS(productId), 'layout');
  }

  /**
   * Invalidate a product's images cache
   * Call when images are added, reordered, or deleted
   */
  static invalidateProductImages(productId: string): void {
    revalidateTag(CACHE_TAGS.PRODUCT_IMAGES(productId), 'layout');
  }

  /**
   * Invalidate a product's embedding cache
   * Call when product content changes and embedding needs regeneration
   */
  static invalidateProductEmbedding(productId: string): void {
    revalidateTag(CACHE_TAGS.PRODUCT_EMBEDDING(productId), 'layout');
  }

  /**
   * Invalidate collections list cache
   * Call when collections are created, updated, or deleted
   */
  static invalidateCollectionsList(): void {
    revalidateTag(CACHE_TAGS.COLLECTIONS_LIST, 'layout');
  }

  /**
   * Invalidate categories list cache
   * Call when categories are created, updated, or deleted
   */
  static invalidateCategoriesList(): void {
    revalidateTag(CACHE_TAGS.CATEGORIES_LIST, 'layout');
  }

  /**
   * Invalidate all caches related to a product
   * Use when making significant changes (e.g., archiving, major updates)
   */
  static invalidateAllProductCaches(productId: string): void {
    this.invalidateProduct(productId);
    this.invalidateVariants(productId);
    this.invalidateProductImages(productId);
    this.invalidateProductEmbedding(productId);
    this.invalidateProductsList();
  }

  /**
   * Get cache tag for use in fetch options
   * Example: fetch(url, { next: { tags: [CacheService.getProductTag(id)] } })
   */
  static getProductTag(productId: string): string {
    return CACHE_TAGS.PRODUCT(productId);
  }

  static getVariantsTag(productId: string): string {
    return CACHE_TAGS.VARIANTS(productId);
  }

  static getProductImagesTag(productId: string): string {
    return CACHE_TAGS.PRODUCT_IMAGES(productId);
  }

  static getProductsListTag(): string {
    return CACHE_TAGS.PRODUCTS_LIST;
  }
}
