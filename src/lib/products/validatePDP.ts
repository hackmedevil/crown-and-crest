/**
 * Product Page Architecture Validation Suite
 * 
 * Comprehensive tests for Phase 1 implementation.
 * Tests data integrity, pricing, images, availability matrix, performance.
 */

import { getProductForPDP } from '@/lib/products/getProductForPDP'
import { calculatePrice } from '@/lib/products/calculatePricing'
import { resolveProductImages } from '@/lib/products/resolveProductImages'
import { buildAvailabilityMatrix } from '@/lib/products/buildAvailabilityMatrix'
import type { PDPData, PricingParams } from '@/types/pdp'

// ============================================================================
// Test 1: Data Integrity Verification
// ============================================================================

interface DataIntegrityReport {
  productSlug: string
  hasProduct: boolean
  hasPricing: boolean
  hasVariants: boolean
  variantCount: number
  hasColorGroups: boolean
  colorGroupCount: number
  hasImages: boolean
  imageCount: number
  hasAvailabilityMatrix: boolean
  hasMeta: boolean
  issues: string[]
}

export async function validateDataIntegrity(slug: string): Promise<DataIntegrityReport> {
  console.log(`\n=== Data Integrity Test: ${slug} ===`)
  
  const issues: string[] = []
  const pdpData = await getProductForPDP(slug)

  if (!pdpData) {
    return {
      productSlug: slug,
      hasProduct: false,
      hasPricing: false,
      hasVariants: false,
      variantCount: 0,
      hasColorGroups: false,
      colorGroupCount: 0,
      hasImages: false,
      imageCount: 0,
      hasAvailabilityMatrix: false,
      hasMeta: false,
      issues: ['Product data is null - product not found or inactive'],
    }
  }

  // Check product core fields
  if (!pdpData.product) {
    issues.push('Missing product core object')
  } else {
    if (!pdpData.product.id) issues.push('Missing product.id')
    if (!pdpData.product.name) issues.push('Missing product.name')
    if (!pdpData.product.slug) issues.push('Missing product.slug')
  }

  // Check pricing
  if (!pdpData.pricing) {
    issues.push('Missing pricing object')
  } else {
    if (typeof pdpData.pricing.base_price !== 'number') issues.push('Invalid pricing.base_price')
    if (typeof pdpData.pricing.selling_price !== 'number') issues.push('Invalid pricing.selling_price')
    if (typeof pdpData.pricing.mrp !== 'number') issues.push('Invalid pricing.mrp')
    if (typeof pdpData.pricing.savings_amount !== 'number') issues.push('Invalid pricing.savings_amount')
    if (typeof pdpData.pricing.savings_percentage !== 'number') issues.push('Invalid pricing.savings_percentage')
  }

  // Check variants
  if (!pdpData.variants) {
    issues.push('Missing variants array')
  } else if (!Array.isArray(pdpData.variants)) {
    issues.push('variants is not an array')
  } else if (pdpData.variants.length === 0) {
    issues.push('No variants found (empty array)')
  } else {
    // Validate first variant structure
    const v = pdpData.variants[0]
    if (!v.id) issues.push('Variant missing id')
    if (!v.sku) issues.push('Variant missing sku')
    if (typeof v.enabled !== 'boolean') issues.push('Variant missing enabled flag')
    if (typeof v.final_price !== 'number') issues.push('Variant missing final_price')
    if (typeof v.stock_quantity !== 'number') issues.push('Variant missing stock_quantity')
    if (typeof v.available_to_sell !== 'number') issues.push('Variant missing available_to_sell')
    if (typeof v.is_out_of_stock !== 'boolean') issues.push('Variant missing is_out_of_stock')
    if (!v.options) issues.push('Variant missing options object')
    if (!Array.isArray(v.images)) issues.push('Variant images is not an array')
  }

  // Check color groups
  if (!Array.isArray(pdpData.color_groups)) {
    issues.push('color_groups is not an array')
  } else if (pdpData.color_groups.length > 0) {
    const cg = pdpData.color_groups[0]
    if (!cg.id) issues.push('ColorGroup missing id')
    if (!cg.name) issues.push('ColorGroup missing name')
    if (!cg.primary_hex) issues.push('ColorGroup missing primary_hex')
    if (!Array.isArray(cg.images)) issues.push('ColorGroup images is not an array')
    if (!Array.isArray(cg.available_sizes)) issues.push('ColorGroup missing available_sizes')
  }

  // Check images
  if (!pdpData.images) {
    issues.push('Missing images object')
  } else {
    if (!pdpData.images.hero) issues.push('Missing images.hero')
    if (!Array.isArray(pdpData.images.gallery)) issues.push('images.gallery is not an array')
    if (!pdpData.images.priority_source) issues.push('Missing images.priority_source')
  }

  // Check availability matrix
  if (!pdpData.availability_matrix) {
    issues.push('Missing availability_matrix')
  } else {
    if (!pdpData.availability_matrix.color_to_sizes) issues.push('Missing availability_matrix.color_to_sizes')
    if (!pdpData.availability_matrix.size_to_colors) issues.push('Missing availability_matrix.size_to_colors')
    if (!Array.isArray(pdpData.availability_matrix.out_of_stock_variants)) {
      issues.push('availability_matrix.out_of_stock_variants is not an array')
    }
  }

  // Check meta
  if (!pdpData.meta) {
    issues.push('Missing meta object')
  } else {
    if (typeof pdpData.meta.has_size_recommendation !== 'boolean') issues.push('Invalid meta.has_size_recommendation')
    if (typeof pdpData.meta.total_variants !== 'number') issues.push('Invalid meta.total_variants')
    if (typeof pdpData.meta.in_stock_variants !== 'number') issues.push('Invalid meta.in_stock_variants')
  }

  const report: DataIntegrityReport = {
    productSlug: slug,
    hasProduct: !!pdpData.product,
    hasPricing: !!pdpData.pricing,
    hasVariants: Array.isArray(pdpData.variants) && pdpData.variants.length > 0,
    variantCount: pdpData.variants?.length || 0,
    hasColorGroups: Array.isArray(pdpData.color_groups) && pdpData.color_groups.length > 0,
    colorGroupCount: pdpData.color_groups?.length || 0,
    hasImages: !!pdpData.images && !!pdpData.images.hero,
    imageCount: pdpData.images?.gallery?.length || 0,
    hasAvailabilityMatrix: !!pdpData.availability_matrix,
    hasMeta: !!pdpData.meta,
    issues,
  }

  console.log('Report:', JSON.stringify(report, null, 2))
  return report
}

// ============================================================================
// Test 2: Pricing Validation
// ============================================================================

interface PricingTestCase {
  name: string
  params: PricingParams
  expectedBehavior: string
}

export function validatePricing(): void {
  console.log('\n=== Pricing Validation Tests ===')

  const testCases: PricingTestCase[] = [
    {
      name: 'Base price only',
      params: {
        base_price: 1000,
        variant_price_override: null,
        discount_engine_enabled: false,
        discount_type: 'percentage',
        discount_value: null,
        mrp: null,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 1000, mrp = 1300 (fallback), no discount',
    },
    {
      name: 'With selling_price',
      params: {
        base_price: 1000,
        variant_price_override: null,
        discount_engine_enabled: false,
        discount_type: 'percentage',
        discount_value: null,
        mrp: 1500,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 1000, mrp = 1500 (from DB)',
    },
    {
      name: 'Variant price override',
      params: {
        base_price: 1000,
        variant_price_override: 1200,
        discount_engine_enabled: false,
        discount_type: 'percentage',
        discount_value: null,
        mrp: null,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 1200 (override), mrp = 1560',
    },
    {
      name: 'Percentage discount',
      params: {
        base_price: 1000,
        variant_price_override: null,
        discount_engine_enabled: true,
        discount_type: 'percentage',
        discount_value: 20,
        mrp: 1500,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 800 (20% off), mrp = 1500, savings = 700',
    },
    {
      name: 'Fixed discount',
      params: {
        base_price: 1000,
        variant_price_override: null,
        discount_engine_enabled: true,
        discount_type: 'fixed',
        discount_value: 300,
        mrp: 1500,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 700 (1000 - 300), mrp = 1500, savings = 800',
    },
    {
      name: 'Product with MRP set',
      params: {
        base_price: 1000,
        variant_price_override: null,
        discount_engine_enabled: false,
        discount_type: 'percentage',
        discount_value: null,
        mrp: 2000,
        cost_price: 500,
      },
      expectedBehavior: 'selling_price = 1000, mrp = 2000 (use DB value, not fallback)',
    },
  ]

  testCases.forEach((tc) => {
    console.log(`\n--- ${tc.name} ---`)
    console.log('Params:', tc.params)
    const result = calculatePrice(tc.params)
    console.log('Result:', result)
    console.log('Expected:', tc.expectedBehavior)

    // Validation checks
    const issues: string[] = []
    if (typeof result.selling_price !== 'number' || isNaN(result.selling_price)) {
      issues.push('Invalid selling_price')
    }
    if (typeof result.mrp !== 'number' || isNaN(result.mrp)) {
      issues.push('Invalid mrp')
    }
    if (typeof result.savings_amount !== 'number' || isNaN(result.savings_amount)) {
      issues.push('Invalid savings_amount')
    }
    if (typeof result.savings_percentage !== 'number' || isNaN(result.savings_percentage)) {
      issues.push('Invalid savings_percentage')
    }
    if (result.selling_price < 0) {
      issues.push('Negative selling_price')
    }
    if (result.mrp < result.selling_price) {
      issues.push('MRP less than selling price')
    }

    if (issues.length > 0) {
      console.error('❌ FAILED:', issues)
    } else {
      console.log('✅ PASSED')
    }
  })
}

// ============================================================================
// Test 3: Image Resolution Validation
// ============================================================================

export function validateImageResolution(): void {
  console.log('\n=== Image Resolution Validation ===')

  // Test case 1: Variant has images
  console.log('\n--- Case 1: Variant with images ---')
  const result1 = resolveProductImages({
    product: {
      images: ['product1.jpg', 'product2.jpg'],
      image_url: 'legacy.jpg',
      enable_variant_image_switching: true,
    },
    selected_variant: {
      id: 'v1',
      color_group_id: 'cg1',
      images: [
        { image_url: 'variant1.jpg', position: 0, is_primary: true },
        { image_url: 'variant2.jpg', position: 1, is_primary: false },
      ],
    },
    color_group_images: [
      { image_url: 'color1.jpg', position: 0 },
      { image_url: 'color2.jpg', position: 1 },
    ],
    product_images: [],
  })
  console.log('Result:', result1)
  console.log('Expected: variant images with priority_source = "variant"')
  console.log(result1.priority_source === 'variant' ? '✅ PASSED' : '❌ FAILED')

  // Test case 2: No variant images, color group has images
  console.log('\n--- Case 2: No variant images, color group has images ---')
  const result2 = resolveProductImages({
    product: {
      images: ['product1.jpg'],
      image_url: 'legacy.jpg',
      enable_variant_image_switching: true,
    },
    selected_variant: {
      id: 'v1',
      color_group_id: 'cg1',
      images: [],
    },
    color_group_images: [
      { image_url: 'color1.jpg', position: 0 },
      { image_url: 'color2.jpg', position: 1 },
    ],
    product_images: [],
  })
  console.log('Result:', result2)
  console.log('Expected: color group images with priority_source = "color_group"')
  console.log(result2.priority_source === 'color_group' ? '✅ PASSED' : '❌ FAILED')

  // Test case 3: No variant/color images, product has images
  console.log('\n--- Case 3: Product images fallback ---')
  const result3 = resolveProductImages({
    product: {
      images: ['product1.jpg', 'product2.jpg'],
      image_url: 'legacy.jpg',
      enable_variant_image_switching: true,
    },
    selected_variant: null,
    color_group_images: [],
    product_images: [
      { image_url: 'prod1.jpg', position: 0 },
      { image_url: 'prod2.jpg', position: 1 },
    ],
  })
  console.log('Result:', result3)
  console.log('Expected: product images with priority_source = "product"')
  console.log(result3.priority_source === 'product' ? '✅ PASSED' : '❌ FAILED')

  // Test case 4: Only legacy image_url
  console.log('\n--- Case 4: Only legacy image_url ---')
  const result4 = resolveProductImages({
    product: {
      images: null,
      image_url: 'legacy-only.jpg',
      enable_variant_image_switching: false,
    },
    selected_variant: null,
    color_group_images: [],
    product_images: [],
  })
  console.log('Result:', result4)
  console.log('Expected: legacy image with priority_source = "product"')
  console.log(
    result4.priority_source === 'product' && result4.hero.includes('legacy-only.jpg')
      ? '✅ PASSED'
      : '❌ FAILED'
  )

  // Test case 5: Duplicate URL detection
  console.log('\n--- Case 5: Duplicate URL detection ---')
  const result5 = resolveProductImages({
    product: {
      images: ['same.jpg', 'same.jpg', 'unique.jpg'],
      image_url: 'same.jpg',
      enable_variant_image_switching: false,
    },
    selected_variant: null,
    color_group_images: [],
    product_images: [{ image_url: 'same.jpg', position: 0 }],
  })
  console.log('Result:', result5)
  const urls = result5.gallery.map((img) => img.url)
  const uniqueUrls = Array.from(new Set(urls))
  console.log('Gallery URLs:', urls)
  console.log('Unique count:', uniqueUrls.length)
  console.log(urls.length === uniqueUrls.length ? '✅ PASSED - No duplicates' : '❌ FAILED - Has duplicates')
}

// ============================================================================
// Test 4: Availability Matrix Validation
// ============================================================================

export function validateAvailabilityMatrix(): void {
  console.log('\n=== Availability Matrix Validation ===')

  // Test case 1: Many colors, few sizes
  console.log('\n--- Case 1: Many colors, few sizes ---')
  const variants1 = [
    {
      id: 'v1',
      color_group_id: 'red',
      size: 'M',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v2',
      color_group_id: 'red',
      size: 'L',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v3',
      color_group_id: 'blue',
      size: 'M',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v4',
      color_group_id: 'green',
      size: 'L',
      enabled: true,
      is_out_of_stock: false,
    },
  ] as any

  const matrix1 = buildAvailabilityMatrix(variants1)
  console.log('Matrix:', JSON.stringify(matrix1, null, 2))
  console.log('Expected: red→[M,L], blue→[M], green→[L]')
  console.log(
    matrix1.color_to_sizes['red']?.length === 2 &&
      matrix1.color_to_sizes['blue']?.length === 1 &&
      matrix1.color_to_sizes['green']?.length === 1
      ? '✅ PASSED'
      : '❌ FAILED'
  )

  // Test case 2: One color, many sizes
  console.log('\n--- Case 2: One color, many sizes ---')
  const variants2 = [
    {
      id: 'v1',
      color_group_id: 'black',
      size: 'XS',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v2',
      color_group_id: 'black',
      size: 'S',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v3',
      color_group_id: 'black',
      size: 'M',
      enabled: true,
      is_out_of_stock: false,
    },
    {
      id: 'v4',
      color_group_id: 'black',
      size: 'L',
      enabled: true,
      is_out_of_stock: false,
    },
  ] as any

  const matrix2 = buildAvailabilityMatrix(variants2)
  console.log('Matrix:', JSON.stringify(matrix2, null, 2))
  console.log('Expected: black→[XS,S,M,L] in order')
  const blackSizes = matrix2.color_to_sizes['black']
  console.log('Actual order:', blackSizes)
  console.log(
    blackSizes?.length === 4 && blackSizes[0] === 'XS' && blackSizes[3] === 'L' ? '✅ PASSED' : '❌ FAILED'
  )

  // Test case 3: Out of stock variants
  console.log('\n--- Case 3: Out of stock tracking ---')
  const variants3 = [
    {
      id: 'v1',
      color_group_id: 'red',
      size: 'M',
      enabled: true,
      is_out_of_stock: true,
    },
    {
      id: 'v2',
      color_group_id: 'red',
      size: 'L',
      enabled: true,
      is_out_of_stock: false,
    },
  ] as any

  const matrix3 = buildAvailabilityMatrix(variants3)
  console.log('Matrix:', JSON.stringify(matrix3, null, 2))
  console.log('Expected: out_of_stock_variants = ["v1"]')
  console.log(
    matrix3.out_of_stock_variants.includes('v1') && !matrix3.out_of_stock_variants.includes('v2')
      ? '✅ PASSED'
      : '❌ FAILED'
  )

  // Test case 4: Disabled variants excluded
  console.log('\n--- Case 4: Disabled variants excluded ---')
  const variants4 = [
    {
      id: 'v1',
      color_group_id: 'red',
      size: 'M',
      enabled: false,
      is_out_of_stock: false,
    },
    {
      id: 'v2',
      color_group_id: 'red',
      size: 'L',
      enabled: true,
      is_out_of_stock: false,
    },
  ] as any

  const matrix4 = buildAvailabilityMatrix(variants4)
  console.log('Matrix:', JSON.stringify(matrix4, null, 2))
  console.log('Expected: red→[L] only, M excluded')
  console.log(
    matrix4.color_to_sizes['red']?.length === 1 && matrix4.color_to_sizes['red']?.includes('L')
      ? '✅ PASSED'
      : '❌ FAILED'
  )
}

// ============================================================================
// Test 5: Performance Measurement (Placeholder - requires actual DB)
// ============================================================================

export async function measurePerformance(slug: string): Promise<void> {
  console.log(`\n=== Performance Measurement: ${slug} ===`)

  const iterations = 5
  const times: number[] = []

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await getProductForPDP(slug)
    const end = performance.now()
    times.push(end - start)
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)

  console.log('Times:', times.map((t) => `${t.toFixed(0)}ms`).join(', '))
  console.log(`Average: ${avgTime.toFixed(0)}ms`)
  console.log(`Min: ${minTime.toFixed(0)}ms`)
  console.log(`Max: ${maxTime.toFixed(0)}ms`)
  console.log(`Target: <200ms`)
  console.log(avgTime < 200 ? '✅ PASSED' : '⚠️  NEEDS OPTIMIZATION')
}

// ============================================================================
// Run all tests
// ============================================================================

export async function runAllValidations(testSlug: string): Promise<void> {
  console.log('=' .repeat(80))
  console.log('PRODUCT PAGE ARCHITECTURE - PHASE 1 VALIDATION SUITE')
  console.log('='.repeat(80))

  // Test 1: Data Integrity
  console.log('\n' + '='.repeat(80))
  console.log('TEST 1: DATA INTEGRITY')
  console.log('='.repeat(80))
  await validateDataIntegrity(testSlug)

  // Test 2: Pricing
  console.log('\n' + '='.repeat(80))
  console.log('TEST 2: PRICING VALIDATION')
  console.log('='.repeat(80))
  validatePricing()

  // Test 3: Image Resolution
  console.log('\n' + '='.repeat(80))
  console.log('TEST 3: IMAGE RESOLUTION')
  console.log('='.repeat(80))
  validateImageResolution()

  // Test 4: Availability Matrix
  console.log('\n' + '='.repeat(80))
  console.log('TEST 4: AVAILABILITY MATRIX')
  console.log('='.repeat(80))
  validateAvailabilityMatrix()

  // Test 5: Performance
  console.log('\n' + '='.repeat(80))
  console.log('TEST 5: PERFORMANCE')
  console.log('='.repeat(80))
  await measurePerformance(testSlug)

  console.log('\n' + '='.repeat(80))
  console.log('VALIDATION SUITE COMPLETE')
  console.log('='.repeat(80))
}
