/**
 * Product Validation Schemas
 * Zod schemas for validating product creation and update requests
 */

import { z } from 'zod';

/**
 * Product status enum
 */
export const ProductStatusSchema = z.enum(['draft', 'active', 'archived']);

/**
 * AI Metadata Schema
 * Flexible JSON object for AI-generated content
 */
export const AIMetadataSchema = z
  .object({
    generated_description: z.string().optional(),
    generated_tags: z.array(z.string()).optional(),
    style_attributes: z.array(z.string()).optional(),
    target_audience: z.string().optional(),
    season: z.string().optional(),
    occasion: z.array(z.string()).optional(),
  })
  .passthrough(); // Allow additional fields

/**
 * Product Create Schema
 * Validates data for creating a new product
 */
export const ProductCreateSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(255, 'Product name must be less than 255 characters')
    .trim(),

  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),

  base_price: z
    .number()
    .positive('Base price must be positive')
    .finite('Base price must be a valid number')
    .max(10000000, 'Base price is too large'),

  cost_price: z
    .number()
    .nonnegative('Cost price must be zero or positive')
    .finite('Cost price must be a valid number')
    .max(10000000, 'Cost price is too large')
    .optional()
    .nullable(),

  mrp: z
    .number()
    .nonnegative('MRP must be zero or positive')
    .finite('MRP must be a valid number')
    .max(10000000, 'MRP is too large')
    .optional()
    .nullable(),

  discount_engine_enabled: z.boolean().default(false),

  discount_type: z.enum(['percentage', 'fixed']).default('percentage'),

  discount_value: z
    .number()
    .nonnegative('Discount value must be zero or positive')
    .finite('Discount value must be a valid number')
    .max(10000000, 'Discount value is too large')
    .optional()
    .nullable(),

  selling_price: z
    .number()
    .nonnegative('Selling price must be zero or positive')
    .finite('Selling price must be a valid number')
    .max(10000000, 'Selling price is too large')
    .optional()
    .nullable(),

  fabric: z
    .string()
    .max(100, 'Fabric must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  gsm: z
    .number()
    .positive('GSM must be positive')
    .finite('GSM must be a valid number')
    .max(2000, 'GSM is too large')
    .optional()
    .nullable(),

  fit_type: z
    .string()
    .max(100, 'Fit type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  print_type: z
    .string()
    .max(100, 'Print type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  shipping_charge: z
    .number()
    .nonnegative('Shipping charge must be zero or positive')
    .finite('Shipping charge must be a valid number')
    .max(10000, 'Shipping charge is too large')
    .default(0),

  shipping_included_in_price: z.boolean().default(false),

  // Optional fields
  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),

  short_description: z
    .string()
    .max(500, 'Short description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  category_id: z.string().uuid('Invalid category ID').optional().nullable(),

  collection_ids: z.array(z.string().uuid('Invalid collection ID')).max(100).optional().default([]),

  brand: z.string().max(100, 'Brand must be less than 100 characters').trim().optional().nullable(),

  size_chart_id: z.string().uuid('Invalid size chart ID').optional().nullable(),

  wash_instruction_id: z.string().uuid('Invalid wash instruction ID').optional().nullable(),

  status: ProductStatusSchema.default('draft'),

  is_searchable: z.boolean().default(true),

  enable_variant_image_switching: z.boolean().default(true),

  tags: z
    .array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .default([]),

  seo_keywords: z
    .array(z.string().min(1).max(100))
    .max(50, 'Maximum 50 SEO keywords allowed')
    .default([]),

  meta_title: z
    .string()
    .max(255, 'Meta title must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),

  meta_description: z
    .string()
    .max(500, 'Meta description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  // Logistics fields
  hs_code: z
    .string()
    .max(20, 'HS code must be less than 20 characters')
    .regex(/^[0-9.]+$/, 'HS code must contain only numbers and dots')
    .optional()
    .nullable(),

  country_of_origin: z
    .string()
    .length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
    .optional()
    .nullable(),

  // AI metadata
  ai_metadata: AIMetadataSchema.optional().default({}),
}).superRefine((data, ctx) => {
  if (
    data.discount_engine_enabled &&
    data.discount_type === 'percentage' &&
    data.discount_value != null &&
    data.discount_value > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Percentage discount cannot exceed 100',
    });
  }
});

export type ProductCreateInput = z.infer<typeof ProductCreateSchema>;

/**
 * Product Update Schema
 * Validates data for updating an existing product
 * All fields are optional
 */
export const ProductUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name cannot be empty')
    .max(255, 'Product name must be less than 255 characters')
    .trim()
    .optional(),

  slug: z
    .string()
    .min(1, 'Slug cannot be empty')
    .max(255, 'Slug must be less than 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .trim()
    .optional(),

  description: z
    .string()
    .min(1, 'Description is required')
    .max(5000, 'Description must be less than 5000 characters')
    .trim()
    .optional(),

  short_description: z
    .string()
    .max(500, 'Short description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  base_price: z
    .number()
    .positive('Base price must be positive')
    .finite('Base price must be a valid number')
    .max(10000000, 'Base price is too large')
    .optional(),

  cost_price: z
    .number()
    .nonnegative('Cost price must be zero or positive')
    .finite('Cost price must be a valid number')
    .max(10000000, 'Cost price is too large')
    .optional()
    .nullable(),

  mrp: z
    .number()
    .nonnegative('MRP must be zero or positive')
    .finite('MRP must be a valid number')
    .max(10000000, 'MRP is too large')
    .optional()
    .nullable(),

  discount_engine_enabled: z.boolean().optional(),

  discount_type: z.enum(['percentage', 'fixed']).optional(),

  discount_value: z
    .number()
    .nonnegative('Discount value must be zero or positive')
    .finite('Discount value must be a valid number')
    .max(10000000, 'Discount value is too large')
    .optional()
    .nullable(),

  selling_price: z
    .number()
    .nonnegative('Selling price must be zero or positive')
    .finite('Selling price must be a valid number')
    .max(10000000, 'Selling price is too large')
    .optional()
    .nullable(),

  fabric: z
    .string()
    .max(100, 'Fabric must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  gsm: z
    .number()
    .positive('GSM must be positive')
    .finite('GSM must be a valid number')
    .max(2000, 'GSM is too large')
    .optional()
    .nullable(),

  fit_type: z
    .string()
    .max(100, 'Fit type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  print_type: z
    .string()
    .max(100, 'Print type must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  shipping_charge: z
    .number()
    .nonnegative('Shipping charge must be zero or positive')
    .finite('Shipping charge must be a valid number')
    .max(10000, 'Shipping charge is too large')
    .optional(),

  shipping_included_in_price: z.boolean().optional(),

  category_id: z.string().uuid('Invalid category ID').optional().nullable(),

  collection_ids: z.array(z.string().uuid('Invalid collection ID')).max(100).optional(),

  brand: z.string().max(100, 'Brand must be less than 100 characters').trim().optional().nullable(),

  size_chart_id: z.string().uuid('Invalid size chart ID').optional().nullable(),

  wash_instruction_id: z.string().uuid('Invalid wash instruction ID').optional().nullable(),

  status: ProductStatusSchema.optional(),

  is_searchable: z.boolean().optional(),

  enable_variant_image_switching: z.boolean().optional(),

  tags: z
    .array(z.string().min(1).max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),

  seo_keywords: z
    .array(z.string().min(1).max(100))
    .max(50, 'Maximum 50 SEO keywords allowed')
    .optional(),

  meta_title: z
    .string()
    .max(255, 'Meta title must be less than 255 characters')
    .trim()
    .optional()
    .nullable(),

  meta_description: z
    .string()
    .max(500, 'Meta description must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  hs_code: z
    .string()
    .max(20, 'HS code must be less than 20 characters')
    .regex(/^[0-9.]+$/, 'HS code must contain only numbers and dots')
    .optional()
    .nullable(),

  country_of_origin: z
    .string()
    .length(2, 'Country code must be 2 characters (ISO 3166-1 alpha-2)')
    .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters')
    .optional()
    .nullable(),

  ai_metadata: AIMetadataSchema.optional(),
}).superRefine((data, ctx) => {
  if (
    data.discount_engine_enabled === true &&
    data.discount_type === 'percentage' &&
    data.discount_value != null &&
    data.discount_value > 100
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount_value'],
      message: 'Percentage discount cannot exceed 100',
    });
  }
});

export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;

/**
 * Product Query Schema
 * Validates query parameters for listing products
 */
export const ProductQuerySchema = z.object({
  status: ProductStatusSchema.optional(),

  category_id: z.string().uuid('Invalid category ID').optional(),

  brand: z.string().max(100).optional(),

  is_searchable: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),

  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .default('20'),

  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().nonnegative())
    .default('0'),

  order_by: z.enum(['created_at', 'updated_at', 'name', 'base_price']).default('created_at'),

  order_direction: z.enum(['asc', 'desc']).default('desc'),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

/**
 * Product ID Schema
 * Validates UUID product ID
 */
export const ProductIdSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

export type ProductIdInput = z.infer<typeof ProductIdSchema>;
