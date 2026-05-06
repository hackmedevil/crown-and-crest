// ============================================
// SIZE CHARTS - TYPE DEFINITIONS
// ============================================
// Matches approved database schema
// Brand truth only (not Sizebook)
// ============================================

/**
 * Measurements for a single size within a size chart
 */
export interface SizeMeasurements {
  chest?: number
  waist?: number
  bust?: number
  hip?: number
  shoulder?: number
  length?: number
  inseam?: number
  rise?: number
  sleeve?: number
  [key: string]: number | undefined // Allow custom measurements
}

/**
 * Complete JSONB measurements structure
 * Enforces approved schema structure
 */
export interface SizeChartMeasurements {
  unit: 'cm' | 'in'
  sizes: {
    [sizeLabel: string]: SizeMeasurements
  }
  tolerance_cm?: number
}

/**
 * Size Chart database row
 */
export interface SizeChart {
  id: string
  name: string
  category: string
  measurements: SizeChartMeasurements
  fit_type: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Product to Size Chart mapping (1:1)
 */
export interface ProductSizeChart {
  product_id: string
  size_chart_id: string
  created_at: string
  updated_at: string
}

/**
 * Extended product-size chart with chart details
 */
export interface ProductSizeChartWithDetails extends ProductSizeChart {
  size_chart: SizeChart
}

// ============================================
// ADMIN API PAYLOADS
// ============================================

export interface CreateSizeChartPayload {
  name: string
  category: string
  measurements: SizeChartMeasurements
  fit_type?: string
  notes?: string
}

export interface UpdateSizeChartPayload {
  id: string
  name?: string
  category?: string
  measurements?: SizeChartMeasurements
  fit_type?: string
  notes?: string
}

export interface AssignSizeChartToProductPayload {
  product_id: string
  size_chart_id: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface SizeChartActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface MeasurementsValidationError {
  field: string
  message: string
}

export interface MeasurementsValidationResult {
  valid: boolean
  errors: MeasurementsValidationError[]
}
