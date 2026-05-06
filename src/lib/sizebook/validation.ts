// ============================================
// SIZEBOOK - MEASUREMENTS VALIDATION
// ============================================
// User body measurements validation
// Progressive completion (all fields optional)
// ============================================

import { 
  UserMeasurements,
  MeasurementValidationError,
  MeasurementValidationResult 
} from './types'

/**
 * Reasonable measurement ranges for user body measurements (in cm)
 * These are safety bounds to prevent data entry errors
 */
const USER_MEASUREMENT_RANGES = {
  chest_cm: { min: 70, max: 150, label: 'Chest' },
  bust_cm: { min: 70, max: 150, label: 'Bust' },
  waist_cm: { min: 50, max: 150, label: 'Waist' },
  hip_cm: { min: 70, max: 160, label: 'Hip' },
  shoulder_cm: { min: 30, max: 70, label: 'Shoulder' },
  inseam_cm: { min: 50, max: 100, label: 'Inseam' },
  rise_cm: { min: 15, max: 50, label: 'Rise' },
  sleeve_cm: { min: 40, max: 100, label: 'Sleeve' },
} as const

/**
 * Height range validation (cm)
 */
const HEIGHT_RANGE = { min: 100, max: 250 }

/**
 * Weight range validation (kg)
 */
const WEIGHT_RANGE = { min: 20, max: 300 }

/**
 * Validate user measurements
 * All fields are optional (progressive completion)
 */
export function validateUserMeasurements(
  measurements: unknown
): MeasurementValidationResult {
  const errors: MeasurementValidationError[] = []

  // Type guard
  if (typeof measurements !== 'object' || measurements === null) {
    return {
      valid: false,
      errors: [{ field: 'measurements', message: 'Measurements must be an object' }]
    }
  }

  const data = measurements as Partial<UserMeasurements>

  // Empty object is valid (progressive completion)
  if (Object.keys(data).length === 0) {
    return { valid: true, errors: [] }
  }

  // Validate each measurement if provided
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      // Optional fields - skip validation
      return
    }

    if (typeof value !== 'number') {
      errors.push({
        field: key,
        message: `${key} must be a number`
      })
      return
    }

    // Check known measurement ranges
    if (key in USER_MEASUREMENT_RANGES) {
      const measurementKey = key as keyof typeof USER_MEASUREMENT_RANGES
      const { min, max, label } = USER_MEASUREMENT_RANGES[measurementKey]
      
      if (value < min || value > max) {
        errors.push({
          field: key,
          message: `${label} must be between ${min} and ${max} cm`
        })
      }
    } else {
      // Unknown custom measurement - basic sanity check
      if (value < 0 || value > 300) {
        errors.push({
          field: key,
          message: `${key} must be between 0 and 300 cm`
        })
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate height
 */
export function validateHeight(height: number | null | undefined): MeasurementValidationError | null {
  if (height === null || height === undefined) {
    return null // Optional field
  }

  if (typeof height !== 'number') {
    return { field: 'height_cm', message: 'Height must be a number' }
  }

  if (height < HEIGHT_RANGE.min || height > HEIGHT_RANGE.max) {
    return { 
      field: 'height_cm', 
      message: `Height must be between ${HEIGHT_RANGE.min} and ${HEIGHT_RANGE.max} cm` 
    }
  }

  return null
}

/**
 * Validate weight
 */
export function validateWeight(weight: number | null | undefined): MeasurementValidationError | null {
  if (weight === null || weight === undefined) {
    return null // Optional field
  }

  if (typeof weight !== 'number') {
    return { field: 'weight_kg', message: 'Weight must be a number' }
  }

  if (weight < WEIGHT_RANGE.min || weight > WEIGHT_RANGE.max) {
    return { 
      field: 'weight_kg', 
      message: `Weight must be between ${WEIGHT_RANGE.min} and ${WEIGHT_RANGE.max} kg` 
    }
  }

  return null
}

/**
 * Validate gender
 */
export function validateGender(gender: string | null | undefined): boolean {
  if (gender === null || gender === undefined) {
    return true // Optional field
  }

  return ['male', 'female', 'unisex', 'prefer_not_to_say'].includes(gender)
}

/**
 * Validate fit preference
 */
export function validateFitPreference(fitPreference: string | null | undefined): boolean {
  if (fitPreference === null || fitPreference === undefined) {
    return true // Optional field
  }

  return ['slim', 'regular', 'loose'].includes(fitPreference)
}

/**
 * Get suggested measurement fields based on gender
 * Returns field names in user-friendly order
 */
export function getSuggestedMeasurementFields(gender?: string | null): string[] {
  switch (gender) {
    case 'male':
      return ['chest_cm', 'waist_cm', 'shoulder_cm', 'inseam_cm', 'sleeve_cm']
    
    case 'female':
      return ['bust_cm', 'waist_cm', 'hip_cm', 'shoulder_cm', 'inseam_cm']
    
    case 'unisex':
    case 'prefer_not_to_say':
    default:
      return ['chest_cm', 'waist_cm', 'hip_cm', 'shoulder_cm', 'inseam_cm']
  }
}

/**
 * Calculate completeness percentage
 * Based on core measurements
 */
export function calculateCompleteness(measurements: UserMeasurements, height?: number | null): number {
  const suggestedFields = ['chest_cm', 'bust_cm', 'waist_cm', 'hip_cm', 'shoulder_cm', 'height']
  let filled = 0
  let total = 5 // Core body measurements

  // Check measurements
  if (measurements.chest_cm || measurements.bust_cm) filled++
  if (measurements.waist_cm) filled++
  if (measurements.hip_cm) filled++
  if (measurements.shoulder_cm) filled++
  if (height) filled++

  return Math.round((filled / total) * 100)
}
