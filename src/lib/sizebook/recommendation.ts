// Phase 13: Sizebook Foundation - Size Recommendation Engine
// Purpose: Pure function to compute size recommendations based on measurements
// Algorithm: Calculate distance between user measurements and each size profile
// Phase 16: Enhanced to apply learned adjustments from feedback

import type {
  Measurements,
  SizeProfile,
  // SizeRecommendation,
  RecommendationInput,
  RecommendationResult,
} from '@/types/sizebook';
import type { FitStatsSummary } from '@/types/order'

// ==========================================
// Constants
// ==========================================

/** Default tolerance in cm for measurement matching */
const DEFAULT_TOLERANCE_CM = 3;

/** Minimum confidence score to return a recommendation (0-100) */
const MIN_CONFIDENCE_THRESHOLD = 60;

/** Maximum distance score for perfect match (used in confidence calculation) */
const PERFECT_MATCH_DISTANCE = 0;

/** Distance penalty per cm of deviation */
// const DISTANCE_PENALTY_PER_CM = 5;

// ==========================================
// Core Recommendation Engine
// ==========================================

/**
 * Compute size recommendation for user based on measurements
 * 
 * @param input - User measurements and available size profiles
 * @returns Size recommendation with confidence score, or null if no good match
 * 
 * @example
 * ```ts
 * const recommendation = computeSizeRecommendation({
 *   user_measurements: { chest_cm: 98, waist_cm: 84, shoulder_cm: 46 },
 *   available_sizes: [sizeS, sizeM, sizeL, sizeXL]
 * });
 * 
 * if (recommendation) {
 *   console.log(`Recommended: ${recommendation.recommended_size} (${recommendation.confidence}% confident)`);
 * }
 * ```
 */
export function computeSizeRecommendation(
  input: RecommendationInput
): RecommendationResult {
  const { user_measurements, available_sizes } = input;

  // Validation: Need at least one size profile
  if (!available_sizes || available_sizes.length === 0) {
    return null;
  }

  // Validation: User must have at least one measurement
  const userMeasurementKeys = Object.keys(user_measurements).filter(
    (key) => typeof user_measurements[key] === 'number'
  );
  if (userMeasurementKeys.length === 0) {
    return null;
  }

  // Calculate match score for each size
  const matches = available_sizes.map((size) => {
    const score = calculateMatchScore(user_measurements, size);
    return { size, score };
  });

  // Find best match
  const bestMatch = matches.reduce((best, current) =>
    current.score.distance < best.score.distance ? current : best
  );

  // Convert distance to confidence score (0-100)
  const confidence = distanceToConfidence(bestMatch.score.distance);

  // Return null if confidence too low
  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    return null;
  }

  return {
    recommended_size: bestMatch.size.name,
    size_profile_id: bestMatch.size.id,
    confidence,
    reason: generateRecommendationReason(bestMatch.score, confidence),
  };
}

// ==========================================
// Match Scoring Algorithm
// ==========================================

interface MatchScore {
  distance: number;  // Lower is better
  matched_measurements: number;  // How many measurements were compared
  details: { [key: string]: number };  // Per-measurement deviations
}

/**
 * Calculate how well user measurements match a size profile
 * Uses weighted Euclidean distance with tolerance
 */
function calculateMatchScore(
  userMeasurements: Measurements,
  sizeProfile: SizeProfile
): MatchScore {
  const tolerance = sizeProfile.fit_rules?.tolerance_cm ?? DEFAULT_TOLERANCE_CM;
  const stretchAllowance = sizeProfile.fit_rules?.stretch_allowance ?? 0;

  let totalDistance = 0;
  let matchedCount = 0;
  const details: { [key: string]: number } = {};

  // Compare each measurement that exists in both user and size profile
  for (const key of Object.keys(userMeasurements)) {
    const userValue = userMeasurements[key];
    const sizeValue = sizeProfile.measurements[key];

    // Skip if measurement missing from either side
    if (typeof userValue !== 'number' || typeof sizeValue !== 'number') {
      continue;
    }

    // Calculate deviation with tolerance and stretch allowance
    let deviation = Math.abs(userValue - sizeValue);

    // Apply stretch allowance (user can be slightly larger for stretch fabrics)
    if (userValue > sizeValue && stretchAllowance > 0) {
      deviation = Math.max(0, deviation - stretchAllowance);
    }

    // Apply tolerance (small deviations are acceptable)
    deviation = Math.max(0, deviation - tolerance);

    details[key] = deviation;
    totalDistance += deviation * deviation;  // Squared for Euclidean distance
    matchedCount++;
  }

  // No measurements in common - worst possible match
  if (matchedCount === 0) {
    return {
      distance: Infinity,
      matched_measurements: 0,
      details: {},
    };
  }

  // Root mean square distance
  const distance = Math.sqrt(totalDistance / matchedCount);

  return {
    distance,
    matched_measurements: matchedCount,
    details,
  };
}

/**
 * Convert distance score to confidence percentage (0-100)
 * 
 * - distance = 0 (perfect match) → 100% confidence
 * - distance = 5cm → 75% confidence
 * - distance = 10cm → 50% confidence
 * - distance > 15cm → below threshold
 */
function distanceToConfidence(distance: number): number {
  if (distance === PERFECT_MATCH_DISTANCE) {
    return 100;
  }

  // Exponential decay: confidence drops faster as distance increases
  const confidence = 100 * Math.exp(-distance / 8);

  return Math.round(Math.max(0, Math.min(100, confidence)));
}

/**
 * Generate human-readable reason for recommendation
 */
function generateRecommendationReason(
  score: MatchScore,
  confidence: number
): string {
  if (confidence >= 90) {
    return 'Excellent match based on your measurements';
  } else if (confidence >= 75) {
    return 'Good match based on your measurements';
  } else {
    return 'Suggested match based on your measurements';
  }
}

// ==========================================
// Validation Helpers
// ==========================================

/**
 * Validate that measurements are within reasonable ranges
 * (Used by user profile actions to prevent clearly wrong data)
 */
export function validateMeasurements(measurements: Measurements): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Define reasonable ranges (in cm)
  const ranges: { [key: string]: { min: number; max: number } } = {
    chest_cm: { min: 70, max: 150 },
    bust_cm: { min: 70, max: 150 },
    waist_cm: { min: 50, max: 150 },
    hip_cm: { min: 70, max: 160 },
    shoulder_cm: { min: 30, max: 70 },
    length_cm: { min: 40, max: 120 },
    inseam_cm: { min: 50, max: 100 },
    rise_cm: { min: 20, max: 40 },
    thigh_cm: { min: 40, max: 90 },
  };

  for (const [key, value] of Object.entries(measurements)) {
    if (typeof value !== 'number') continue;

    const range = ranges[key];
    if (!range) continue;  // Unknown measurement type, skip

    if (value < range.min || value > range.max) {
      errors.push(
        `${key.replace('_cm', '').replace('_', ' ')} must be between ${range.min}-${range.max}cm`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if two measurement sets have at least one common measurement
 * (Used to validate that recommendation is possible)
 */
export function hasCommonMeasurements(
  measurements1: Measurements,
  measurements2: Measurements
): boolean {
  const keys1 = Object.keys(measurements1).filter(
    (k) => typeof measurements1[k] === 'number'
  );
  const keys2 = Object.keys(measurements2).filter(
    (k) => typeof measurements2[k] === 'number'
  );

  return keys1.some((key) => keys2.includes(key));
}

// ==========================================
// Phase 16: Learning-Based Adjustment
// ==========================================

/**
 * Apply learned adjustments to size profiles based on fit feedback
 * 
 * Adjustments are applied to the profile's measurements and tolerance
 * based on accumulated user feedback (too small, too large, fits well)
 * 
 * Example:
 * - If users consistently report chest too small → increase tolerance by +0.5cm
 * - If users consistently report chest too large → decrease tolerance by -0.5cm
 */
export function applyLearnedAdjustments(
  size: SizeProfile,
  fitStats: FitStatsSummary[] | null
): SizeProfile {
  // If no fit stats available, return profile unchanged
  if (!fitStats || fitStats.length === 0) {
    return size;
  }

  // Create adjusted copy of size profile
  const adjustedSize = { ...size };
  const adjustedMeasurements = { ...size.measurements };
  // const adjustedTolerance = size.fit_rules?.tolerance_cm ?? DEFAULT_TOLERANCE_CM;

  // Apply adjustments per metric
  for (const stat of fitStats) {
    const adjustment = stat.adjustment_cm
    if (adjustment === 0 || !stat.metric) {
      continue
    }

    // Apply adjustment to measurement value
    // Example: If chest_cm adjustment is +1.5cm, add to the size's chest measurement
    const currentValue = adjustedMeasurements[stat.metric]
    if (typeof currentValue === 'number') {
      adjustedMeasurements[stat.metric] = currentValue + adjustment
    }
  }

  adjustedSize.measurements = adjustedMeasurements;
  return adjustedSize;
}

/**
 * Compute recommendation with learned adjustments applied
 * 
 * This is the production version called on PDP:
 * 1. Fetch fit stats for the product's size profiles
 * 2. Apply learned adjustments to each profile
 * 3. Compute recommendation with adjusted profiles
 * 4. Return confidence potentially lowered if adjustments skewed the match
 * 
 * @param input - User measurements and available size profiles
 * @param fitStats - Optional: Fit statistics per size profile (from database)
 * @returns Recommendation with adjustments applied
 */
export function computeSizeRecommendationWithAdjustments(
  input: RecommendationInput,
  fitStatsMap: Map<string, FitStatsSummary[]> | null = null
): RecommendationResult {
  let { available_sizes } = input;

  // Apply learned adjustments if available
  if (fitStatsMap && fitStatsMap.size > 0) {
    available_sizes = available_sizes.map((size) => {
      const stats = fitStatsMap.get(size.id) || null
      return applyLearnedAdjustments(size, stats)
    })
  }

  // Compute recommendation with adjusted profiles
  const baseRecommendation = computeSizeRecommendation({
    ...input,
    available_sizes,
  });

  // If fit stats were applied and confidence dropped significantly,
  // we may want to log this for monitoring (future enhancement)
  return baseRecommendation;
}
