/**
 * STANDARD PRODUCT SIZES
 *
 * Standardized size options for apparel products.
 * Used in variant creation dropdowns.
 */

export const STANDARD_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "Free Size",
] as const;

export type ProductSize = (typeof STANDARD_SIZES)[number];

/**
 * Size display names with descriptions
 */
export const SIZE_DESCRIPTIONS: Record<string, string> = {
  XS: "Extra Small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
  XXL: "2X Large",
  XXXL: "3X Large",
  "Free Size": "One Size Fits All",
};
