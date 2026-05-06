// Phase 13: Sizebook Foundation - Type Definitions
// Purpose: Type-safe interfaces for size recommendation system

// ==========================================
// Core Types
// ==========================================

/** Product category for size profiles (extensible) */
export type SizeCategory =
  | 'men_top'
  | 'men_bottom'
  | 'women_top'
  | 'women_bottom'
  | 'women_dress'
  | 'unisex_top'
  | 'unisex_bottom'
  | 'kids_top'
  | 'kids_bottom';

/** Body measurements in centimeters (flexible schema per category) */
export type Measurements = {
  // Common measurements for tops
  chest_cm?: number;
  bust_cm?: number;
  waist_cm?: number;
  shoulder_cm?: number;
  length_cm?: number;
  
  // Common measurements for bottoms
  hip_cm?: number;
  inseam_cm?: number;
  rise_cm?: number;
  thigh_cm?: number;
  
  // Additional measurements (category-specific)
  [key: string]: number | undefined;
};

/** Fit rules for size matching algorithm */
export type FitRules = {
  /** Tolerance in cm for matching (default: 3) */
  tolerance_cm?: number;
  
  /** Additional allowance for stretch fabrics (default: 0) */
  stretch_allowance?: number;
  
  /** Fit type (default: "regular") */
  fit_type?: 'slim' | 'regular' | 'relaxed' | 'oversized';
  
  /** Custom rules (extensible) */
  [key: string]: string | number | undefined;
};

// ==========================================
// Database Models
// ==========================================

/** Admin-defined size profile (S, M, L, XL, etc.) */
export interface SizeProfile {
  id: string;
  name: string;  // e.g., "S", "M", "L", "XL", "32", "34/36"
  category: SizeCategory;
  measurements: Measurements;
  fit_rules: FitRules;
  created_at: string;
  updated_at: string;
}

/** Product-to-size-profile mapping */
export interface ProductSizeProfile {
  id: string;
  product_id: string;
  size_profile_id: string;
  notes?: string;  // e.g., "Runs small, consider sizing up"
  created_at: string;
}

/** User's body measurements per category */
export interface UserSizeProfile {
  id: string;
  user_uid: string;  // Firebase UID
  category: SizeCategory;
  measurements: Measurements;
  created_at: string;
  updated_at: string;
}

// ==========================================
// Extended Models (with joins)
// ==========================================

/** Product size profile with full size details */
export interface ProductSizeProfileExtended extends ProductSizeProfile {
  size_profile: SizeProfile;
}

// ==========================================
// Action Payloads
// ==========================================

/** Admin action: Create new size profile */
export interface CreateSizeProfilePayload {
  name: string;
  category: SizeCategory;
  measurements: Measurements;
  fit_rules?: FitRules;
}

/** Admin action: Update existing size profile */
export interface UpdateSizeProfilePayload {
  id: string;
  name?: string;
  measurements?: Measurements;
  fit_rules?: FitRules;
}

/** Admin action: Assign size profile to product */
export interface AssignSizeProfilePayload {
  product_id: string;
  size_profile_id: string;
  notes?: string;
}

/** User action: Save/update size profile */
export interface SaveUserSizeProfilePayload {
  category: SizeCategory;
  measurements: Measurements;
}

// ==========================================
// Recommendation Types
// ==========================================

/** Size recommendation result */
export interface SizeRecommendation {
  /** Recommended size name (e.g., "M", "L") */
  recommended_size: string;
  
  /** Size profile ID */
  size_profile_id: string;
  
  /** Confidence score 0-100 (100 = perfect match) */
  confidence: number;
  
  /** Explanation of why this size was recommended */
  reason?: string;
}

/** Recommendation engine input */
export interface RecommendationInput {
  user_measurements: Measurements;
  available_sizes: SizeProfile[];
}

/** Recommendation engine output (with fallback handling) */
export type RecommendationResult = SizeRecommendation | null;

// ==========================================
// Validation Types
// ==========================================

/** Measurement validation result */
export interface MeasurementValidation {
  valid: boolean;
  errors: string[];
}

/** Reasonable measurement ranges (in cm) */
export const MEASUREMENT_RANGES = {
  chest_cm: { min: 70, max: 150 },
  bust_cm: { min: 70, max: 150 },
  waist_cm: { min: 50, max: 150 },
  hip_cm: { min: 70, max: 160 },
  shoulder_cm: { min: 30, max: 70 },
  length_cm: { min: 40, max: 120 },
  inseam_cm: { min: 50, max: 100 },
  rise_cm: { min: 20, max: 40 },
  thigh_cm: { min: 40, max: 90 },
} as const;

// ==========================================
// Helper Types
// ==========================================

/** Result type for server actions */
export type SizebookActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
