// ============================================
// SIZE RECOMMENDATION ENGINE
// ============================================
// Pure computation layer
// Input: User body (Sizebook) + Garment measurements (Size Charts)
// Output: Recommended size with confidence
// 
// CONSTRAINTS:
// - Pure function (no side effects)
// - Stateless (deterministic)
// - Read-only (no database writes)
// - No assumptions about data completeness
// ============================================

import { UserMeasurements } from '@/lib/sizebook/types'
import { SizeChartMeasurements, SizeMeasurements } from '@/lib/size-charts/types'

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Recommendation result
 */
export interface SizeRecommendation {
  size_label: string              // "M", "L", "XL", etc.
  confidence: number               // 0-100 (100 = perfect match)
  fit_notes: string[]             // ["Regular fit on chest", "Relaxed on waist"]
  reasoning: string                // Human-readable explanation
}

/**
 * Recommendation input
 */
export interface RecommendationInput {
  user_measurements: UserMeasurements
  size_chart: SizeChartMeasurements
}

/**
 * Individual size match result (internal)
 */
interface SizeMatch {
  size_label: string
  total_deviation: number
  deviations_by_field: Record<string, number>
  confidence: number
  common_fields: string[]
}

// ============================================
// RECOMMENDATION ENGINE (PURE FUNCTION)
// ============================================

/**
 * Compute size recommendation
 * Pure function - deterministic given same inputs
 * 
 * @param input User measurements and size chart
 * @returns Recommendation or null if no confident match
 */
export function computeSizeRecommendation(
  input: RecommendationInput
): SizeRecommendation | null {
  const { user_measurements, size_chart } = input

  // Validate inputs
  if (!user_measurements || !size_chart || !size_chart.sizes) {
    return null
  }

  const sizeLabels = Object.keys(size_chart.sizes)
  if (sizeLabels.length === 0) {
    return null
  }

  // Calculate match for each available size
  const matches = sizeLabels
    .map(label => calculateSizeMatch(
      label,
      user_measurements,
      size_chart.sizes[label],
      size_chart.tolerance_cm || 3 // Default tolerance
    ))
    .filter(match => match !== null) as SizeMatch[]

  if (matches.length === 0) {
    return null // No common measurements to compare
  }

  // Find best match (lowest deviation)
  // TIE-BREAKING: If multiple sizes have equal deviation, the first one
  // encountered in size chart iteration order is selected (deterministic).
  // Size charts typically define sizes in ascending order (S, M, L, XL),
  // so ties will prefer smaller sizes.
  const bestMatch = matches.reduce((best, current) => 
    current.total_deviation < best.total_deviation ? current : best
  )

  // Confidence threshold
  const MIN_CONFIDENCE = 60
  if (bestMatch.confidence < MIN_CONFIDENCE) {
    return null // Not confident enough
  }

  // Generate fit notes
  const fitNotes = generateFitNotes(
    bestMatch.deviations_by_field,
    size_chart.tolerance_cm || 3
  )

  // Generate reasoning
  const reasoning = generateReasoning(
    bestMatch.size_label,
    bestMatch.confidence,
    bestMatch.common_fields.length
  )

  return {
    size_label: bestMatch.size_label,
    confidence: bestMatch.confidence,
    fit_notes: fitNotes,
    reasoning
  }
}

// ============================================
// CORE COMPARISON LOGIC
// ============================================

/**
 * Calculate match score for a single size
 * Returns null if no common measurements to compare
 */
function calculateSizeMatch(
  sizeLabel: string,
  userMeasurements: UserMeasurements,
  garmentMeasurements: SizeMeasurements,
  toleranceCm: number
): SizeMatch | null {
  // Find common measurement fields
  const userFields = Object.keys(userMeasurements).filter(k => userMeasurements[k] !== undefined)
  const garmentFields = Object.keys(garmentMeasurements).filter(k => garmentMeasurements[k] !== undefined)
  const commonFields = userFields.filter(field => garmentFields.includes(field))

  if (commonFields.length === 0) {
    return null // No overlap - cannot compare
  }

  // Calculate deviations for each common field
  const deviations: Record<string, number> = {}
  let totalSquaredDeviation = 0

  commonFields.forEach(field => {
    const userValue = userMeasurements[field]!
    const garmentValue = garmentMeasurements[field]!
    
    // Raw deviation
    const rawDeviation = Math.abs(userValue - garmentValue)
    
    // Apply tolerance (forgive small differences)
    const adjustedDeviation = Math.max(0, rawDeviation - toleranceCm)
    
    // Store signed deviation for fit notes
    deviations[field] = userValue - garmentValue
    
    // Accumulate squared deviation for distance calculation
    totalSquaredDeviation += adjustedDeviation * adjustedDeviation
  })

  // Calculate Euclidean distance
  const distance = Math.sqrt(totalSquaredDeviation / commonFields.length)

  // Convert distance to confidence (exponential decay)
  // Perfect match (0cm deviation) = 100% confidence
  // Higher deviation = exponentially lower confidence
  const confidence = Math.round(100 * Math.exp(-distance / 8))

  return {
    size_label: sizeLabel,
    total_deviation: distance,
    deviations_by_field: deviations,
    confidence: Math.min(100, Math.max(0, confidence)),
    common_fields: commonFields
  }
}

// ============================================
// FIT NOTES GENERATION
// ============================================

/**
 * Generate human-readable fit notes
 * Based on deviations from garment measurements
 */
function generateFitNotes(
  deviations: Record<string, number>,
  toleranceCm: number
): string[] {
  const notes: string[] = []

  Object.entries(deviations).forEach(([field, deviation]) => {
    const absDeviation = Math.abs(deviation)
    
    // Skip if within tolerance
    if (absDeviation <= toleranceCm) {
      return
    }

    const fieldLabel = formatFieldLabel(field)
    
    if (deviation > 0) {
      // User is larger than garment
      if (absDeviation > toleranceCm * 2) {
        notes.push(`May be tight on ${fieldLabel}`)
      } else {
        notes.push(`Snug fit on ${fieldLabel}`)
      }
    } else {
      // User is smaller than garment
      if (absDeviation > toleranceCm * 2) {
        notes.push(`Relaxed fit on ${fieldLabel}`)
      } else {
        notes.push(`Regular fit on ${fieldLabel}`)
      }
    }
  })

  // Default note if everything is within tolerance
  if (notes.length === 0) {
    notes.push('True to size fit')
  }

  return notes
}

/**
 * Format measurement field name for display
 */
function formatFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    chest_cm: 'chest',
    bust_cm: 'bust',
    waist_cm: 'waist',
    hip_cm: 'hip',
    shoulder_cm: 'shoulders',
    inseam_cm: 'inseam',
    rise_cm: 'rise',
    sleeve_cm: 'sleeves',
    length_cm: 'length'
  }
  return labels[field] || field.replace('_cm', '')
}

// ============================================
// REASONING GENERATION
// ============================================

/**
 * Generate explanation for recommendation
 */
function generateReasoning(
  sizeLabel: string,
  confidence: number,
  commonFieldsCount: number
): string {
  if (confidence >= 90) {
    return `Excellent match based on ${commonFieldsCount} measurements`
  } else if (confidence >= 80) {
    return `Good match based on ${commonFieldsCount} measurements`
  } else if (confidence >= 70) {
    return `Reasonable match based on ${commonFieldsCount} measurements`
  } else {
    return `Suggested size based on ${commonFieldsCount} measurements`
  }
}

// ============================================
// EDGE CASE HANDLERS
// ============================================

/**
 * Check if user has minimum measurements for recommendation
 * Recommendation requires at least 2 common measurements
 */
export function hasMinimumMeasurements(
  userMeasurements: UserMeasurements,
  sizeChart: SizeChartMeasurements
): boolean {
  if (!userMeasurements || !sizeChart || !sizeChart.sizes) {
    return false
  }

  // Get first size as reference (all sizes should have same fields)
  const sizeLabels = Object.keys(sizeChart.sizes)
  if (sizeLabels.length === 0) {
    return false
  }

  const garmentFields = Object.keys(sizeChart.sizes[sizeLabels[0]])
  const userFields = Object.keys(userMeasurements).filter(k => userMeasurements[k] !== undefined)
  const commonFields = userFields.filter(field => garmentFields.includes(field))

  return commonFields.length >= 2
}

/**
 * Get required measurements for a size chart
 * Helper for UI to guide progressive completion
 */
export function getRequiredMeasurements(sizeChart: SizeChartMeasurements): string[] {
  if (!sizeChart || !sizeChart.sizes) {
    return []
  }

  const sizeLabels = Object.keys(sizeChart.sizes)
  if (sizeLabels.length === 0) {
    return []
  }

  // All sizes should have same fields - use first as reference
  return Object.keys(sizeChart.sizes[sizeLabels[0]])
}
