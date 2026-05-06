/**
 * Validation Schema Tests
 * Tests Zod schemas for products and variants
 */

import {
  ProductCreateSchema,
  ProductUpdateSchema,
  VariantCreateSchema,
  VariantUpdateSchema,
} from '@/lib/validators';

describe('ProductCreateSchema', () => {
  it('should validate valid product data', () => {
    const validData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      description: 'Test description',
      status: 'draft' as const,
      tags: ['test', 'product'],
    };

    const result = ProductCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test Product');
      expect(result.data.base_price).toBe(100);
    }
  });

  it('should reject empty name', () => {
    const invalidData = {
      name: '',
      slug: 'test-product',
      base_price: 100,
    };

    const result = ProductCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('should reject negative price', () => {
    const invalidData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: -100,
    };

    const result = ProductCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('base_price');
    }
  });

  it('should reject invalid slug format', () => {
    const invalidData = {
      name: 'Test Product',
      slug: 'Test Product!', // Spaces and special chars not allowed
      base_price: 100,
    };

    const result = ProductCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('slug');
    }
  });

  it('should accept valid slug formats', () => {
    const validSlugs = ['test-product', 'test123', 'product-1-2-3'];

    validSlugs.forEach((slug) => {
      const data = {
        name: 'Test Product',
        slug,
        base_price: 100,
      };

      const result = ProductCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  it('should validate HS code format', () => {
    const validData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      hs_code: '1234.56',
    };

    const result = ProductCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should reject invalid HS code format', () => {
    const invalidData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      hs_code: 'ABC123', // Letters not allowed
    };

    const result = ProductCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it('should validate country code', () => {
    const validData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      country_of_origin: 'IN',
    };

    const result = ProductCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should reject invalid country code', () => {
    const invalidData = {
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      country_of_origin: 'IND', // Must be 2 characters
    };

    const result = ProductCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});

describe('VariantCreateSchema', () => {
  it('should validate valid variant data', () => {
    const validData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: 100,
      sku: 'TEST-SKU-123',
      price_override: 150,
      attributes: {
        size: 'L',
        color: 'Red',
      },
    };

    const result = VariantCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock_quantity).toBe(100);
      expect(result.data.attributes.size).toBe('L');
    }
  });

  it('should reject negative stock quantity', () => {
    const invalidData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: -10,
    };

    const result = VariantCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it('should reject invalid product ID', () => {
    const invalidData = {
      product_id: 'not-a-uuid',
      stock_quantity: 100,
    };

    const result = VariantCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it('should validate barcode format', () => {
    const validData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: 100,
      barcode: '1234567890123',
    };

    const result = VariantCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should reject too short barcode', () => {
    const invalidData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: 100,
      barcode: '12345', // Less than 8 characters
    };

    const result = VariantCreateSchema.safeParse(invalidData);

    expect(result.success).toBe(false);
  });

  it('should validate weight_grams', () => {
    const validData = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: 100,
      weight_grams: 500,
    };

    const result = VariantCreateSchema.safeParse(validData);

    expect(result.success).toBe(true);
  });

  it('should default empty attributes object', () => {
    const data = {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      stock_quantity: 100,
    };

    const result = VariantCreateSchema.safeParse(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attributes).toEqual({});
    }
  });
});
