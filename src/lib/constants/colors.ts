/**
 * STANDARD PRODUCT COLORS
 *
 * Predefined color options for product variants
 */

export const STANDARD_COLORS = [
  "Black",
  "White",
  "Gray",
  "Navy",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Pink",
  "Purple",
  "Orange",
  "Brown",
  "Beige",
  "Maroon",
  "Olive",
] as const;

export type ProductColor = (typeof STANDARD_COLORS)[number];

/**
 * Color hex codes for visual display
 */
export const COLOR_HEX: Record<string, string> = {
  Black: "#000000",
  White: "#FFFFFF",
  Gray: "#9CA3AF",
  Navy: "#1E3A8A",
  Red: "#DC2626",
  Blue: "#3B82F6",
  Green: "#10B981",
  Yellow: "#FCD34D",
  Pink: "#EC4899",
  Purple: "#8B5CF6",
  Orange: "#F97316",
  Brown: "#92400E",
  Beige: "#D4C5B9",
  Maroon: "#7F1D1D",
  Olive: "#4D7C0F",
};
