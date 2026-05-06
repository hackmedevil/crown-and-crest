/**
 * Structured logging utility for production observability
 * Provides JSON-structured logs for critical flows
 * All logs include context, timestamp, and severity level
 */

interface LogContext {
  orderId?: string
  userId?: string
  variantId?: string
  action?: string
  duration?: number // ms
  rowsProcessed?: number
  metadata?: Record<string, any>
}

interface StructuredLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  context: LogContext
  environment: string
}

const STRUCTURED_LOGGING_ENABLED = process.env.ENABLE_STRUCTURED_LOGGING !== 'false'

/**
 * Log a structured message
 */
function logStructured(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: LogContext = {}
): void {
  if (!STRUCTURED_LOGGING_ENABLED) return

  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    environment: process.env.NODE_ENV || 'development',
  }

  // Prefix indicates log type for easy filtering
  const prefix = `[${level.toUpperCase()}]`
  console.log(`${prefix} ${JSON.stringify(log)}`)
}

/**
 * Info-level logs (normal operations)
 */
export const logInfo = {
  paymentVerificationStart: (orderId: string) =>
    logStructured('info', 'Payment verification started', { orderId, action: 'payment_verify_start' }),
  
  paymentVerificationComplete: (orderId: string, duration: number) =>
    logStructured('info', 'Payment verification completed', { orderId, action: 'payment_verify_complete', duration }),
  
  inventoryCommit: (variantId: string, quantity: number, duration: number) =>
    logStructured('info', 'Inventory committed', { variantId, action: 'inventory_commit', duration, metadata: { quantity } }),
  
  inventoryRelease: (orderId: string, variantId: string, quantity: number, duration: number) =>
    logStructured('info', 'Inventory released', { orderId, variantId, action: 'inventory_release', duration, metadata: { quantity } }),
  
  cronExecutionStart: (cronName: string) =>
    logStructured('info', `Cron job started: ${cronName}`, { action: `cron_${cronName}_start` }),
  
  cronExecutionComplete: (cronName: string, duration: number, rowsProcessed: number) =>
    logStructured('info', `Cron job completed: ${cronName}`, { action: `cron_${cronName}_complete`, duration, rowsProcessed }),
  
  recoveryAttemptStart: (orderId: string, recoveryType: string) =>
    logStructured('info', `Recovery attempt started: ${recoveryType}`, { orderId, action: 'recovery_start', metadata: { type: recoveryType } }),
  
  recoveryAttemptComplete: (orderId: string, recoveryType: string, duration: number, success: boolean) =>
    logStructured('info', `Recovery attempt completed: ${recoveryType}`, { orderId, action: 'recovery_complete', duration, metadata: { type: recoveryType, success } }),
}

/**
 * Warn-level logs (retryable issues, degraded state)
 */
export const logWarn = {
  paymentVerificationRetry: (orderId: string, attempt: number, reason: string) =>
    logStructured('warn', 'Payment verification retry', { orderId, action: 'payment_verify_retry', metadata: { attempt, reason } }),
  
  inventoryReleaseRetry: (orderId: string, attempt: number, reason: string) =>
    logStructured('warn', 'Inventory release retry', { orderId, action: 'inventory_release_retry', metadata: { attempt, reason } }),
  
  cronExecutionTimeout: (cronName: string, expectedDuration: number, actualDuration: number) =>
    logStructured('warn', `Cron job exceeded timeout: ${cronName}`, { action: `cron_${cronName}_timeout`, metadata: { expectedDuration, actualDuration } }),
  
  recoveryAttemptFailed: (orderId: string, recoveryType: string, reason: string) =>
    logStructured('warn', `Recovery attempt failed: ${recoveryType}`, { orderId, action: 'recovery_failed', metadata: { type: recoveryType, reason } }),
  
  inventoryInconsistency: (variantId: string, expected: number, actual: number) =>
    logStructured('warn', 'Inventory inconsistency detected', { variantId, action: 'inventory_inconsistency', metadata: { expected, actual } }),
}

/**
 * Error-level logs (action required)
 */
export const logError = {
  paymentVerificationFailed: (orderId: string, reason: string, metadata?: Record<string, any>) =>
    logStructured('error', 'Payment verification failed', { orderId, action: 'payment_verify_failed', metadata: { reason, ...metadata } }),
  
  inventoryCommitFailed: (orderId: string, variantId: string, reason: string) =>
    logStructured('error', 'Inventory commit failed', { orderId, variantId, action: 'inventory_commit_failed', metadata: { reason } }),
  
  inventoryReleaseFailed: (orderId: string, variantId: string, reason: string) =>
    logStructured('error', 'Inventory release failed', { orderId, variantId, action: 'inventory_release_failed', metadata: { reason } }),
  
  cronExecutionFailed: (cronName: string, reason: string, duration: number) =>
    logStructured('error', `Cron job failed: ${cronName}`, { action: `cron_${cronName}_failed`, duration, metadata: { reason } }),
  
  recoveryAttemptUnrecoverable: (orderId: string, recoveryType: string, reason: string) =>
    logStructured('error', `Recovery attempt unrecoverable: ${recoveryType}`, { orderId, action: 'recovery_unrecoverable', metadata: { type: recoveryType, reason } }),
  
  razorpayWebhookInvalid: (orderId: string, reason: string) =>
    logStructured('error', 'Invalid Razorpay webhook', { orderId, action: 'webhook_invalid', metadata: { reason } }),
}

/**
 * Helper to measure operation duration
 */
export function createDurationTracker() {
  const start = Date.now()
  return {
    end: () => Date.now() - start,
  }
}
