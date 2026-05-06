/**
 * PRODUCT CATEGORIES
 *
 * Product classification for organization and filtering.
 */

export const PRODUCT_CATEGORIES = [
  "Shirts",
  "T-Shirts",
  "Pants",
  "Jeans",
  "Shorts",
  "Jackets",
  "Sweaters",
  "Hoodies",
  "Accessories",
  "Footwear",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Category metadata
 */
export const CATEGORY_META: Record<
  string,
  { icon: string; description: string }
> = {
  Shirts: { icon: "👔", description: "Formal and casual shirts" },
  "T-Shirts": { icon: "👕", description: "Casual t-shirts and polos" },
  Pants: { icon: "👖", description: "Formal and casual pants" },
  Jeans: { icon: "👖", description: "Denim jeans" },
  Shorts: { icon: "🩳", description: "Casual shorts" },
  Jackets: { icon: "🧥", description: "Outerwear and jackets" },
  Sweaters: { icon: "🧶", description: "Sweaters and cardigans" },
  Hoodies: { icon: "🧥", description: "Hoodies and sweatshirts" },
  Accessories: { icon: "👜", description: "Belts, bags, and accessories" },
  Footwear: { icon: "👞", description: "Shoes and sandals" },
  Other: { icon: "📦", description: "Other products" },
};
