// ============================================
// SIZE CHARTS - MEASUREMENTS VALIDATION
// ============================================
// Enforces approved JSONB structure
// Server-side validation only
// ============================================

import { 
  SizeChartMeasurements, 
  MeasurementsValidationError,
  MeasurementsValidationResult 
} from './types'

/**
 * Reasonable measurement ranges (in cm)
 * Prevents data entry errors
 */
const MEASUREMENT_RANGES = {
  chest: { min: 70, max: 150 },
  bust: { min: 70, max: 150 },
  waist: { min: 50, max: 150 },
  hip: { min: 70, max: 160 },
  shoulder: { min: 30, max: 70 },
  length: { min: 40, max: 120 },
  inseam: { min: 50, max: 100 },
  rise: { min: 15, max: 50 },
  sleeve: { min: 40, max: 100 },
} as const

/**
 * Known garment types (applies_to values)
 * NOTE: Non-exhaustive - new types may be added
 * Semantically represents "what type of garment" not navigation category
 * This list is for measurement field suggestions only
 */
const KNOWN_GARMENT_TYPES = [
  'men_top',
  'men_bottom',
  'women_top',
  'women_bottom',
  'women_dress',
  'unisex_top',
  'unisex_bottom',
] as const

/**
 * Validate complete size chart measurements structure
 */
export function validateSizeChartMeasurements(
  measurements: unknown
): MeasurementsValidationResult {
  const errors: MeasurementsValidationError[] = []

  // Type guard
  if (typeof measurements !== 'object' || measurements === null) {
    return {
      valid: false,
      errors: [{ field: 'measurements', message: 'Measurements must be an object' }]
    }
  }

  const data = measurements as Partial<SizeChartMeasurements>

  // Required: unit
  if (!data.unit) {
    errors.push({ field: 'unit', message: 'Unit is required' })
  } else if (data.unit !== 'cm' && data.unit !== 'in') {
    errors.push({ field: 'unit', message: 'Unit must be "cm" or "in"' })
  }

  // Required: sizes object
  if (!data.sizes) {
    errors.push({ field: 'sizes', message: 'Sizes object is required' })
  } else if (typeof data.sizes !== 'object' || Array.isArray(data.sizes)) {
    errors.push({ field: 'sizes', message: 'Sizes must be an object' })
  } else {
    const sizeLabels = Object.keys(data.sizes)
    
    // Must have at least one size
    if (sizeLabels.length === 0) {
      errors.push({ field: 'sizes', message: 'At least one size must be defined' })
    }

    // Validate each size's measurements
    sizeLabels.forEach(label => {
      const sizeMeasurements = data.sizes![label]
      
      if (typeof sizeMeasurements !== 'object' || sizeMeasurements === null) {
        errors.push({ 
          field: `sizes.${label}`, 
          message: `Size ${label} must have measurements object` 
        })
        return
      }

      // Validate each measurement value
      Object.entries(sizeMeasurements).forEach(([key, value]) => {
        if (typeof value !== 'number') {
          errors.push({
            field: `sizes.${label}.${key}`,
            message: `${key} must be a number`
          })
          return
        }

        // Check ranges for known measurements
        if (key in MEASUREMENT_RANGES) {
          const { min, max } = MEASUREMENT_RANGES[key as keyof typeof MEASUREMENT_RANGES]
          if (value < min || value > max) {
            errors.push({
              field: `sizes.${label}.${key}`,
              message: `${key} must be between ${min} and ${max} cm`
            })
          }
        }
      })
    })
  }

  // Optional: tolerance_cm
  if (data.tolerance_cm !== undefined) {
    if (typeof data.tolerance_cm !== 'number') {
      errors.push({ field: 'tolerance_cm', message: 'Tolerance must be a number' })
    } else if (data.tolerance_cm < 0 || data.tolerance_cm > 10) {
      errors.push({ field: 'tolerance_cm', message: 'Tolerance must be between 0 and 10 cm' })
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate category value (non-authoritative)
 * Returns true for known types, but does NOT reject unknown values
 * This is intentionally permissive to allow future garment types
 * 
 * @deprecated Internal name: Consider this as "applies_to" not navigation category
 */
export function validateCategory(category: string): boolean {
  if (!category || category.trim().length === 0) {
    return false
  }
  // Accept all non-empty strings (non-exhaustive validation)
  return true
}

/**
 * Check if garment type is known (for measurement field suggestions)
 */
export function isKnownGarmentType(category: string): boolean {
  return KNOWN_GARMENT_TYPES.includes(category as typeof KNOWN_GARMENT_TYPES[number])
}

/**
 * Validate size chart name
 */
export function validateSizeChartName(name: string): MeasurementsValidationError | null {
  if (!name || name.trim().length === 0) {
    return { field: 'name', message: 'Name is required' }
  }
  
  if (name.length > 100) {
    return { field: 'name', message: 'Name must be 100 characters or less' }
  }

  return null
}

/**
 * Get suggested measurement fields for a garment type
 * Returns sensible defaults for unknown types
 * 
 * Note: This is a suggestion helper, not enforcement
 */
export function getMeasurementFieldsForCategory(category: string): string[] {
  // Only use switch for known types
  if (!isKnownGarmentType(category)) {
    // Default for unknown garment types
    return ['chest', 'waist', 'length', 'shoulder']
  }

  switch (category) {
    case 'men_top':
    case 'women_top':
    case 'unisex_top':
      return ['chest', 'waist', 'shoulder', 'length', 'sleeve']
    
    case 'men_bottom':
    case 'unisex_bottom':
      return ['waist', 'inseam', 'rise']
    
    case 'women_bottom':
      return ['waist', 'hip', 'inseam', 'rise']
    
    case 'women_dress':
      return ['bust', 'waist', 'hip', 'length', 'shoulder']
    
    default:
      return ['chest', 'waist', 'length', 'shoulder']
  }
}
