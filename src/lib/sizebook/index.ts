// ============================================
// SIZEBOOK - BARREL EXPORTS
// ============================================
// User-owned module (privacy-first)
// Architecture: One user = one body = one profile
// ============================================

// Types
export type {
  UserSizebook,
  UserMeasurements,
  CreateSizebookPayload,
  UpdateSizebookPayload,
  SizebookCompleteness,
  SizebookActionResult,
  MeasurementValidationError,
  MeasurementValidationResult,
} from './types'

// Validation utilities
export {
  validateUserMeasurements,
  validateHeight,
  validateWeight,
  validateGender,
  validateFitPreference,
  getSuggestedMeasurementFields,
  calculateCompleteness,
} from './validation'

// User server actions
export {
  createSizebook,
  updateSizebook,
  getSizebook,
  deleteSizebook,
  hasSizebook,
  getSizebookCompleteness,
  updateMeasurement,
} from './user-actions'
