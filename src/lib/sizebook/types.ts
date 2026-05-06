// ============================================
// SIZEBOOK - TYPE DEFINITIONS
// ============================================
// User-owned body profile (customer truth)
// Privacy-first, progressive completion
// ============================================

/**
 * User body measurements (all optional)
 * Progressive completion supported
 */
export interface UserMeasurements {
  chest_cm?: number
  bust_cm?: number
  waist_cm?: number
  hip_cm?: number
  shoulder_cm?: number
  inseam_cm?: number
  rise_cm?: number
  sleeve_cm?: number
  [key: string]: number | undefined // Allow custom measurements
}

/**
 * User Sizebook database row
 */
export interface UserSizebook {
  id: string
  user_uid: string
  gender: 'male' | 'female' | 'unisex' | 'prefer_not_to_say' | null
  height_cm: number | null
  weight_kg: number | null
  measurements: UserMeasurements
  fit_preference: 'slim' | 'regular' | 'loose' | null
  created_at: string
  updated_at: string
}

/**
 * Create Sizebook payload
 * All fields optional except measurements object
 */
export interface CreateSizebookPayload {
  gender?: 'male' | 'female' | 'unisex' | 'prefer_not_to_say'
  height_cm?: number
  weight_kg?: number
  measurements?: UserMeasurements
  fit_preference?: 'slim' | 'regular' | 'loose'
}

/**
 * Update Sizebook payload
 * Partial updates supported
 */
export interface UpdateSizebookPayload {
  gender?: 'male' | 'female' | 'unisex' | 'prefer_not_to_say' | null
  height_cm?: number | null
  weight_kg?: number | null
  measurements?: UserMeasurements
  fit_preference?: 'slim' | 'regular' | 'loose' | null
}

/**
 * Sizebook completeness stats
 */
export interface SizebookCompleteness {
  total_fields: number
  filled_fields: number
  completion_pct: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SizebookActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface MeasurementValidationError {
  field: string
  message: string
}

export interface MeasurementValidationResult {
  valid: boolean
  errors: MeasurementValidationError[]
}
