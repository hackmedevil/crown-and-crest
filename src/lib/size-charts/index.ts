// ============================================
// SIZE CHARTS - BARREL EXPORTS
// ============================================
// Admin-only module
// No customer-facing exports
// ============================================

// Types
export type {
  SizeChart,
  SizeChartMeasurements,
  SizeMeasurements,
  ProductSizeChart,
  ProductSizeChartWithDetails,
  CreateSizeChartPayload,
  UpdateSizeChartPayload,
  AssignSizeChartToProductPayload,
  SizeChartActionResult,
  MeasurementsValidationError,
  MeasurementsValidationResult,
} from './types'

// Validation utilities
export {
  validateSizeChartMeasurements,
  validateCategory,
  validateSizeChartName,
  getMeasurementFieldsForCategory,
} from './validation'

// Admin server actions
export {
  createSizeChart,
  updateSizeChart,
  deleteSizeChart,
  listSizeCharts,
  getSizeChart,
  assignSizeChartToProduct,
  removeSizeChartFromProduct,
  getProductSizeChart,
  getProductsUsingSizeChart,
} from './admin-actions'
