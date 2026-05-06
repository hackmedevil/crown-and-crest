// ============================================
// RECOMMENDATION ENGINE - EXPORTS
// ============================================
// Pure computation only
// No side effects, no storage, no UI coupling
// ============================================

export type {
  SizeRecommendation,
  RecommendationInput,
} from './engine'

export {
  computeSizeRecommendation,
  hasMinimumMeasurements,
  getRequiredMeasurements,
} from './engine'
