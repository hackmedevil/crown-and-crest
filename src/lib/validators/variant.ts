/**
 * Variant Validation Schemas
 * Zod schemas for validating variant creation and update requests
 */

import { z } from 'zod';

/**
 * Variant Attributes Schema
 * Flexible key-value pairs for size, color, material, etc.
 */
export const VariantAttributesSchema = z.record(
  z.string().min(1, 'Attribute name cannot be empty').max(50, 'Attribute name too long'),
  z.string().min(1, 'Attribute value cannot be empty').max(100, 'Attribute value too long')
);

export type VariantAttributes = z.infer<typeof VariantAttributesSchema>;

/**
 * Variant Create Schema
 * Validates data for creating a new variant
 */
export const VariantCreateSchema = z.object({
  // Required fields
  product_id: z.string().uuid('Invalid product ID'),

  stock_quantity: z
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity cannot be negative')
    .max(1000000, 'Stock quantity is too large'),

  // Optional fields
  sku: z
    .string()
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU must be less than 100 characters')
    .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores')
    .optional(),

  price_override: z
    .number()
    .min(0, 'Price override cannot be negative')
    .finite('Price override must be a valid number')
    .max(10000000, 'Price override is too large')
    .optional()
    .nullable(),

  enabled: z.boolean().optional().default(true),

  images: z
    .array(z.string().url('Variant image must be a valid URL'))
    .max(20, 'Maximum 20 variant images allowed')
    .optional()
    .default([]),

  barcode: z
    .string()
    .min(8, 'Barcode must be at least 8 characters')
    .max(50, 'Barcode must be less than 50 characters')
    .regex(/^[0-9A-Z-]+$/, 'Barcode must contain only numbers, uppercase letters, and hyphens')
    .optional()
    .nullable(),

  cost_price: z
    .number()
    .positive('Cost price must be positive')
    .finite('Cost price must be a valid number')
    .max(10000000, 'Cost price is too large')
    .optional()
    .nullable(),

  weight_grams: z
    .number()
    .int('Weight must be an integer')
    .positive('Weight must be positive')
    .max(1000000, 'Weight is too large (max 1000kg)')
    .optional()
    .nullable(),

  // Flexible attributes (size, color, material, pattern, etc.)
  attributes: VariantAttributesSchema.optional().default({}),
});

export type VariantCreateInput = z.infer<typeof VariantCreateSchema>;

/**
 * Variant Update Schema
 * Validates data for updating an existing variant
 * All fields are optional
 */
export const VariantUpdateSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU cannot be empty')
    .max(100, 'SKU must be less than 100 characters')
    .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores')
    .optional(),

  price_override: z
    .number()
    .min(0, 'Price override cannot be negative')
    .finite('Price override must be a valid number')
    .max(10000000, 'Price override is too large')
    .optional()
    .nullable(),

  enabled: z.boolean().optional(),

  images: z
    .array(z.string().url('Variant image must be a valid URL'))
    .max(20, 'Maximum 20 variant images allowed')
    .optional(),

  stock_quantity: z
    .number()
    .int('Stock quantity must be an integer')
    .nonnegative('Stock quantity cannot be negative')
    .max(1000000, 'Stock quantity is too large')
    .optional(),

  barcode: z
    .string()
    .min(8, 'Barcode must be at least 8 characters')
    .max(50, 'Barcode must be less than 50 characters')
    .regex(/^[0-9A-Z-]+$/, 'Barcode must contain only numbers, uppercase letters, and hyphens')
    .optional()
    .nullable(),

  cost_price: z
    .number()
    .positive('Cost price must be positive')
    .finite('Cost price must be a valid number')
    .max(10000000, 'Cost price is too large')
    .optional()
    .nullable(),

  weight_grams: z
    .number()
    .int('Weight must be an integer')
    .positive('Weight must be positive')
    .max(1000000, 'Weight is too large (max 1000kg)')
    .optional()
    .nullable(),

  attributes: VariantAttributesSchema.optional(),
});

export type VariantUpdateInput = z.infer<typeof VariantUpdateSchema>;

/**
 * Variant Query Schema
 * Validates query parameters for listing variants
 */
export const VariantQuerySchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
});

export type VariantQueryInput = z.infer<typeof VariantQuerySchema>;

/**
 * Variant ID Schema
 * Validates UUID variant ID
 */
export const VariantIdSchema = z.object({
  id: z.string().uuid('Invalid variant ID'),
});

export type VariantIdInput = z.infer<typeof VariantIdSchema>;

/**
 * Stock Reservation Schema
 * Validates stock reservation request
 */
export const StockReservationSchema = z.object({
  variant_id: z.string().uuid('Invalid variant ID'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive')
    .max(100, 'Cannot reserve more than 100 items at once'),
});

export type StockReservationInput = z.infer<typeof StockReservationSchema>;

/**
 * Batch Stock Reservation Schema
 * Validates batch stock reservation request
 */
export const BatchStockReservationSchema = z.object({
  items: z
    .array(StockReservationSchema)
    .min(1, 'At least one item required')
    .max(50, 'Cannot reserve more than 50 variants at once'),
});

export type BatchStockReservationInput = z.infer<typeof BatchStockReservationSchema>;
