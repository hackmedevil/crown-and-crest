/**
 * Canonical Product Read Model for PDP
 * 
 * Single source of truth for product detail page data.
 * Used by both generateMetadata() and page render to eliminate duplicate queries.
 * 
 * Returns complete PDPData contract with:
 * - Product core fields
 * - Resolved pricing (with discount engine)
 * - Variants with reservation-aware availability
 * - Color groups with available sizes
 * - Images with priority resolution
 * - Size chart data (if linked)
 * - Availability matrix
 * 
 * PERFORMANCE: Cached for 30 minutes with stale-while-revalidate pattern
 */

import { unstable_cache } from 'next/cache'
import { supabaseServer } from '@/lib/supabase/server'
import type { PDPData, PDPVariant, PDPColorGroup, PDPSizeChart } from '@/types/pdp'
import { calculatePrice } from './calculatePricing'
import { resolveInitialImages } from './resolveProductImages'
import { buildAvailabilityMatrix, getVariantSizeValue } from './buildAvailabilityMatrix'

// Database types for raw query results
interface RawVariant {
  id: string
  sku: string
  enabled: boolean
  stock_quantity: number
  size: string | null
  color: string | null
  color_group_id: string | null
  price_override: number | null
  variant_attributes: Array<{
    attribute_name: string
    attribute_value: string
    display_order: number | null
  }>
  variant_images: Array<{
    image_url: string
    position: number
    is_primary: boolean
  }>
}

interface RawProduct {
  id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  base_price: number
  cost_price: number | null
  mrp: number | null
  selling_price: number | null
  discount_engine_enabled: boolean
  discount_type: 'percentage' | 'fixed'
  discount_value: number | null
  fabric: string | null
  gsm: number | null
  fit_type: string | null
  print_type: string | null
  wash_instruction_id: string | null
  shipping_charge: number | null
  brand: string | null
  brand_id: string | null
  palette_id: string | null
  category_id: string | null
  status: 'draft' | 'active' | 'archived'
  enable_variant_image_switching: boolean
  tags: string[]
  seo_keywords: string[]
  image_url: string | null
  images: any
  brands?: { name: string | null } | Array<{ name: string | null }> | null
  categories: { id: string; name: string } | null
  variants: RawVariant[]
}

interface RawColorGroup {
  id: string
  color_name: string
  enabled: boolean
  position: number
  colors: {
    id: string
    name: string
    hex_code: string
  } | null | Array<{ id: string; name: string; hex_code: string }>
}

interface AvailabilityData {
  variant_id: string
  available_to_sell: number
  is_out_of_stock: boolean
}

interface RawWashInstruction {
  id: string
  name: string
  summary: string | null
  details: string | string[] | null
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeWashInstructionDetails(input: string | string[] | null): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input.map((line) => String(line).trim()).filter(Boolean)
  }

  const details = String(input)
  const liMatches = Array.from(details.matchAll(/<li>(.*?)<\/li>/gi)).map((m) => (m[1] || '').trim())
  if (liMatches.length > 0) return liMatches.filter(Boolean)

  return details
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Normalize size chart measurements to support both cm and inches
 */
function normalizeSizeChartMeasurements(
  rawMeasurements: unknown,
  rawUnit?: string | null
): PDPSizeChart['measurements'] | null {
  if (!rawMeasurements || typeof rawMeasurements !== 'object' || Array.isArray(rawMeasurements)) {
    return null
  }

  const measurementsObj = rawMeasurements as Record<string, unknown>
  const nestedSizes = measurementsObj.sizes
  const hasNestedFormat = !!nestedSizes && typeof nestedSizes === 'object' && !Array.isArray(nestedSizes)

  const sourceSizes = (hasNestedFormat ? nestedSizes : measurementsObj) as Record<string, unknown>
  const measurements: PDPSizeChart['measurements'] = []

  for (const [sizeLabel, fields] of Object.entries(sourceSizes)) {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue

    const rawFields = fields as Record<string, unknown>
    const numericFields: Record<string, number> = {}

    for (const [fieldName, value] of Object.entries(rawFields)) {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        numericFields[fieldName] = value
      }
    }

    if (Object.keys(numericFields).length > 0) {
      measurements.push({
        size_label: sizeLabel,
        measurements: numericFields,
      })
    }
  }

  return measurements.length > 0 ? measurements : null
}

function normalizeColorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function synthesizeColorGroupId(colorName: string): string {
  const key = normalizeColorKey(colorName)
  return `variant-color:${key || 'unknown'}`
}

function inferColorHex(colorName: string | null): string {
  const fallbackHex = '#111111'
  if (!colorName) return fallbackHex

  const normalized = normalizeColorKey(colorName)
  const knownHexByName: Record<string, string> = {
    black: '#111111',
    white: '#f5f5f5',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    yellow: '#eab308',
    orange: '#ea580c',
    pink: '#ec4899',
    purple: '#7c3aed',
    grey: '#6b7280',
    gray: '#6b7280',
    brown: '#7c2d12',
    navy: '#1e3a8a',
    maroon: '#7f1d1d',
    olive: '#4d7c0f',
    beige: '#d6d3d1',
    cream: '#f5f5dc',
    'baby blue': '#89CFF0',
    flamingo: '#FC8EAC',
    lavender: '#E6E6FA',
    jade: '#00A86B',
  }

  return knownHexByName[normalized] || fallbackHex
}

/**
 * Fetch product with all related data in a single query
 * Internal implementation without caching
 */
async function getProductForPDPInternal(slug: string): Promise<PDPData | null> {
  const startTime = performance.now()

  try {
    // Single optimized query with selective fields
    const { data: product, error: productError } = await supabaseServer
      .from('products')
      .select(`
        id,
        name,
        slug,
        short_description,
        description,
        base_price,
        cost_price,
        mrp,
        selling_price,
        discount_engine_enabled,
        discount_type,
        discount_value,
        fabric,
        gsm,
        fit_type,
        print_type,
        wash_instruction_id,
        shipping_charge,
        brand,
        brand_id,
        palette_id,
        brands:brand_id (
          name
        ),
        category_id,
        status,
        enable_variant_image_switching,
        tags,
        seo_keywords,
        image_url,
        images,
        categories:category_id (
          id,
          name
        ),
        variants (
          id,
          sku,
          enabled,
          stock_quantity,
          size,
          color,
          color_group_id,
          price_override,
          variant_attributes (
            attribute_name,
            attribute_value,
            display_order
          ),
          variant_images (
            image_url,
            position,
            is_primary
          )
        )
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      console.error('[PDP] Product not found:', slug, productError)
      return null
    }

    // Resolve brand display name robustly across legacy and normalized schemas.
    let resolvedBrandName: string | null = null
    const relatedBrand = Array.isArray(product.brands) ? product.brands[0] : product.brands
    if (relatedBrand?.name) {
      resolvedBrandName = relatedBrand.name
    }

    if (!resolvedBrandName && product.brand && !isUuidLike(product.brand)) {
      resolvedBrandName = product.brand
    }

    if (!resolvedBrandName) {
      const candidateBrandId = product.brand_id || (product.brand && isUuidLike(product.brand) ? product.brand : null)
      if (candidateBrandId) {
        const { data: brandRow } = await supabaseServer
          .from('brands')
          .select('name')
          .eq('id', candidateBrandId)
          .maybeSingle()

        resolvedBrandName = brandRow?.name || null
      }
    }

    // PERFORMANCE OPTIMIZATION: Parallelize all secondary queries
    const variantIds = (product.variants || []).map((v: RawVariant) => v.id)

    const [
      { data: colorGroups, error: colorGroupsError },
      { data: productImages },
      { data: availabilityData, error: availError },
      { data: productSizeCharts, error: sizeChartError },
      { data: paletteColors }
    ] = await Promise.all([
      // Fetch color groups with palette information
      supabaseServer
        .from('color_groups')
        .select(`
          id,
          color_name,
          enabled,
          position,
          colors (
            id,
            name,
            hex_code
          )
        `)
        .eq('product_id', product.id)
        .eq('enabled', true)
        .order('position', { ascending: true }),
      
      // Fetch product images (fallback)
      supabaseServer
        .from('product_images')
        .select('image_url, position')
        .eq('product_id', product.id)
        .order('position', { ascending: true }),
      
      // Get reservation-aware availability for all variants
      variantIds.length > 0
        ? supabaseServer.rpc('get_variant_availability', { variant_ids: variantIds })
        : Promise.resolve({ data: null, error: null }),
      
      // Fetch size chart
      supabaseServer
        .from('product_size_charts')
        .select(`
          size_chart_id,
          size_charts:size_chart_id (
            id,
            name,
            measurements,
            measurement_unit
          )
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false })
        .limit(1),

      product.palette_id
        ? supabaseServer
            .from('colors')
            .select('id, name, hex_code')
            .eq('palette_id', product.palette_id)
        : Promise.resolve({ data: null, error: null })
    ])

    if (colorGroupsError) {
      console.error('[PDP] Error fetching color groups:', colorGroupsError)
    }

    // Fetch assigned wash instruction profile if available.
    let washInstructionData: RawWashInstruction | null = null
    if (product.wash_instruction_id) {
      const [{ data: wiA }, { data: wiB }] = await Promise.all([
        supabaseServer
          .from('wash_instructions')
          .select('id, name, summary, details')
          .eq('id', product.wash_instruction_id)
          .maybeSingle(),
        supabaseServer
          .from('wash_instruction_profiles')
          .select('id, name, summary, details')
          .eq('id', product.wash_instruction_id)
          .maybeSingle(),
      ])

      washInstructionData = (wiA || wiB || null) as RawWashInstruction | null
    }

    // Build availability map
    const availabilityMap = new Map<string, AvailabilityData>()
    if (!availError && availabilityData) {
      availabilityData.forEach((av: AvailabilityData) => {
        availabilityMap.set(av.variant_id, av)
      })
    } else if (availError) {
      console.error('[PDP] Error fetching variant availability:', availError)
    }

    // Fetch color group images (only if color groups exist)
    const colorGroupIds = (colorGroups || []).map((cg) => cg.id)
    let colorGroupImagesMap = new Map<string, Array<{ url: string; position: number }>>()

    if (colorGroupIds.length > 0) {
      const { data: colorGroupImages } = await supabaseServer
        .from('color_group_images')
        .select('color_group_id, image_url, position')
        .in('color_group_id', colorGroupIds)
        .order('position', { ascending: true })

      if (colorGroupImages) {
        for (const img of colorGroupImages) {
          if (!colorGroupImagesMap.has(img.color_group_id)) {
            colorGroupImagesMap.set(img.color_group_id, [])
          }
          colorGroupImagesMap.get(img.color_group_id)!.push({
            url: img.image_url,
            position: img.position,
          })
        }
      }
    }

    // Process size chart data
    let sizeChartData: PDPSizeChart | null = null

    if (!sizeChartError && productSizeCharts && productSizeCharts.length > 0) {
      const rawLinkedChart = productSizeCharts[0].size_charts
      const assignedSizeChart = (Array.isArray(rawLinkedChart) ? rawLinkedChart[0] : rawLinkedChart) as {
        id: string
        name: string
        measurements: unknown
        measurement_unit?: string | null
      } | null

      if (assignedSizeChart) {
        const normalizedMeasurements = normalizeSizeChartMeasurements(
          assignedSizeChart.measurements,
          assignedSizeChart.measurement_unit
        )

        if (normalizedMeasurements) {
          sizeChartData = {
            id: assignedSizeChart.id,
            name: assignedSizeChart.name,
            unit_system: assignedSizeChart.measurement_unit === 'in' || assignedSizeChart.measurement_unit === 'inches' ? 'imperial' : 'metric',
            measurements: normalizedMeasurements,
          }
        }
      }
    }

    // Calculate product-level pricing
    const productPricing = calculatePrice({
      base_price: product.base_price,
      variant_price_override: null,
      discount_engine_enabled: product.discount_engine_enabled,
      discount_type: product.discount_type,
      discount_value: product.discount_value,
      mrp: product.mrp,
      cost_price: product.cost_price,
    })

    // Transform variants with computed fields.
    // Some catalog entries store color text without a color_group_id; normalize to a synthetic id.
    const variants: PDPVariant[] = (product.variants || []).map((v: RawVariant) => {
      // Build options object from variant_attributes
      const attributes = (v.variant_attributes || [])
        .slice()
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      const options: Record<string, string> = {}
      attributes.forEach((attr) => {
        options[attr.attribute_name] = attr.attribute_value
      })

      const sizeKey = Object.keys(options).find((key) => key.toLowerCase() === 'size')
      const colorKey = Object.keys(options).find((key) => key.toLowerCase() === 'color')
      const sizeFromAttributes = sizeKey ? options[sizeKey].trim() : ''
      const colorFromAttributes = colorKey ? options[colorKey].trim() : ''

      const normalizedSize = v.size?.trim() || sizeFromAttributes || null
      const normalizedColorName = v.color?.trim() || colorFromAttributes || null
      const normalizedColorGroupId =
        v.color_group_id || (normalizedColorName ? synthesizeColorGroupId(normalizedColorName) : null)

      // Add size and color to options if not already present
      if (!options.Size && normalizedSize) options.Size = normalizedSize
      if (!options.Color && normalizedColorName) options.Color = normalizedColorName

      // Get availability data
      const availability = availabilityMap.get(v.id) || {
        available_to_sell: v.stock_quantity,
        is_out_of_stock: v.stock_quantity <= 0,
      }

      // Calculate variant-specific pricing
      const variantPricing = calculatePrice({
        base_price: product.base_price,
        variant_price_override: v.price_override,
        discount_engine_enabled: product.discount_engine_enabled,
        discount_type: product.discount_type,
        discount_value: product.discount_value,
        mrp: product.mrp,
        cost_price: product.cost_price,
      })

      return {
        id: v.id,
        sku: v.sku,
        enabled: v.enabled,
        size: normalizedSize,
        color: normalizedColorName,
        color_group_id: normalizedColorGroupId,
        price_override: v.price_override,
        final_price: variantPricing.selling_price,
        stock_quantity: v.stock_quantity,
        available_to_sell: availability.available_to_sell,
        is_out_of_stock: availability.is_out_of_stock,
        options,
        images: (v.variant_images || [])
          .sort((a, b) => a.position - b.position)
          .map((img) => ({
            url: img.image_url,
            position: img.position,
          })),
      }
    })

    // Build a canonical color->hex lookup from authoritative palette sources.
    const paletteHexByColorKey = new Map<string, string>()

    for (const cg of colorGroups || []) {
      const colorsData = Array.isArray(cg.colors) ? cg.colors[0] : cg.colors
      if (cg.color_name && colorsData?.hex_code) {
        paletteHexByColorKey.set(normalizeColorKey(cg.color_name), colorsData.hex_code)
      }
    }

    for (const paletteColor of paletteColors || []) {
      if (paletteColor?.name && paletteColor?.hex_code) {
        paletteHexByColorKey.set(normalizeColorKey(paletteColor.name), paletteColor.hex_code)
      }
    }

    // Fallback for products not linked to palette_id: resolve by variant color names.
    const variantColorNames = Array.from(
      new Set(
        variants
          .map((variant) => variant.color)
          .filter((color): color is string => Boolean(color && color.trim()))
      )
    )

    if (variantColorNames.length > 0) {
      const colorResolutionResults = await Promise.all(
        variantColorNames.map(async (colorName) => {
          const { data } = await supabaseServer
            .from('colors')
            .select('name, hex_code')
            .ilike('name', colorName)
            .limit(1)

          const first = data?.[0]
          return first?.hex_code ? { name: colorName, hex: first.hex_code } : null
        })
      )

      for (const resolved of colorResolutionResults) {
        if (resolved) {
          paletteHexByColorKey.set(normalizeColorKey(resolved.name), resolved.hex)
        }
      }
    }

    // Build color groups with available sizes
    const pdpColorGroups: PDPColorGroup[] = (colorGroups || []).map((cg) => {
      const variantsForColor = variants.filter((v) => v.color_group_id === cg.id)
      const availableSizes = Array.from(
        new Set(variantsForColor.map((v) => getVariantSizeValue(v)).filter(Boolean))
      ) as string[]

      // Sort sizes in standard order
      const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
      availableSizes.sort((a, b) => {
        const aIndex = sizeOrder.indexOf(a.toUpperCase())
        const bIndex = sizeOrder.indexOf(b.toUpperCase())
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        return a.localeCompare(b)
      })

      // Handle colors being either an object or array (Supabase sometimes returns array for foreign keys)
      const colorsData = Array.isArray(cg.colors) ? cg.colors[0] : cg.colors

      return {
        id: cg.id,
        name: cg.color_name,
        primary_color_id: colorsData?.id || '',
        primary_hex:
          colorsData?.hex_code ||
          paletteHexByColorKey.get(normalizeColorKey(cg.color_name)) ||
          inferColorHex(cg.color_name),
        variant_ids: variantsForColor.map((v) => v.id),
        images: colorGroupImagesMap.get(cg.id) || [],
        available_sizes: availableSizes,
      }
    })

    // Backfill any color groups missing from color_groups table but present in variants.
    const knownColorGroupIds = new Set(pdpColorGroups.map((cg) => cg.id))
    const variantsByColorGroup = new Map<string, PDPVariant[]>()

    variants.forEach((variant) => {
      if (!variant.color_group_id) return
      if (!variantsByColorGroup.has(variant.color_group_id)) {
        variantsByColorGroup.set(variant.color_group_id, [])
      }
      variantsByColorGroup.get(variant.color_group_id)!.push(variant)
    })

    for (const [colorGroupId, groupedVariants] of variantsByColorGroup.entries()) {
      if (knownColorGroupIds.has(colorGroupId)) continue

      const firstNamedVariant = groupedVariants.find((v) => v.color)?.color || 'Color'
      const availableSizes = Array.from(
        new Set(groupedVariants.map((v) => getVariantSizeValue(v)).filter(Boolean))
      ) as string[]

      pdpColorGroups.push({
        id: colorGroupId,
        name: firstNamedVariant,
        primary_color_id: '',
        primary_hex:
          paletteHexByColorKey.get(normalizeColorKey(firstNamedVariant)) ||
          inferColorHex(firstNamedVariant),
        variant_ids: groupedVariants.map((v) => v.id),
        images: colorGroupImagesMap.get(colorGroupId) || [],
        available_sizes: availableSizes,
      })
      knownColorGroupIds.add(colorGroupId)
    }

    // Resolve images using priority system
    const images = resolveInitialImages(
      {
        images: product.images,
        image_url: product.image_url,
        enable_variant_image_switching: product.enable_variant_image_switching,
      },
      pdpColorGroups.length > 0 ? pdpColorGroups[0].images.map(img => ({ image_url: img.url, position: img.position })) : [],
      (productImages || []).map(img => ({ image_url: img.image_url, position: img.position }))
    )

    // Build availability matrix
    const availability_matrix = buildAvailabilityMatrix(variants)

    // Calculate metadata
    const inStockVariants = variants.filter((v) => !v.is_out_of_stock).length

    // Handle categories being either an object or array
    const categoryData = Array.isArray(product.categories) ? product.categories[0] : product.categories

    const pdpData: PDPData = {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        short_description: product.short_description,
        description: product.description,
        category: categoryData || null,
        brand: resolvedBrandName,
        fabric: product.fabric,
        gsm: product.gsm,
        fit_type: product.fit_type,
        print_type: product.print_type,
        tags: product.tags || [],
        enable_variant_image_switching: product.enable_variant_image_switching,
        shipping_charge: product.shipping_charge ?? 0,
      },
      pricing: productPricing,
      variants,
      color_groups: pdpColorGroups,
      images,
      size_chart: sizeChartData,
      wash_instruction: washInstructionData
        ? {
            id: washInstructionData.id,
            name: washInstructionData.name,
            summary: washInstructionData.summary,
            details: normalizeWashInstructionDetails(washInstructionData.details),
          }
        : null,
      availability_matrix,
      meta: {
        has_size_recommendation: !!sizeChartData,
        total_variants: variants.length,
        in_stock_variants: inStockVariants,
      },
    }

    const queryTime = performance.now() - startTime
    if (queryTime > 1000) {
      console.warn(`[PDP] Slow query for slug="${slug}": ${queryTime.toFixed(0)}ms`)
    }

    return pdpData
  } catch (error) {
    const queryTime = performance.now() - startTime
    console.error(`[PDP] Query failed for slug="${slug}" after ${queryTime.toFixed(0)}ms`, error)
    return null
  }
}

/**
 * Cached wrapper for PDP data fetching
 * Revalidates every 30 minutes (1800 seconds)
 * Uses stale-while-revalidate pattern for optimal TTFB
 */
export const getProductForPDP = unstable_cache(
  getProductForPDPInternal,
  ['pdp-data'],
  {
    revalidate: 60, // keep stock/availability reasonably fresh
    tags: ['products', 'pdp']
  }
)
