/**
 * Error tracking utility for server-side errors
 * Captures errors with context, sends to monitoring service
 * Non-blocking: all errors logged fire-and-forget
 */

interface ErrorContext {
  orderId?: string
  userId?: string
  action?: string
  environment?: string
  metadata?: Record<string, any>
}

interface TrackedError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: string
  severity: 'error' | 'warn' | 'info'
}

const MONITORING_ENABLED = process.env.ENABLE_ERROR_TRACKING === 'true'
const MONITORING_ENDPOINT = process.env.ERROR_TRACKING_ENDPOINT

/**
 * Track an error with context (fire-and-forget)
 * Never throws or blocks execution
 */
export async function trackError(
  error: Error | unknown,
  context: ErrorContext,
  severity: 'error' | 'warn' | 'info' = 'error'
): Promise<void> {
  if (!MONITORING_ENABLED) return

  try {
    const trackedError: TrackedError = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        ...context,
        environment: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
      severity,
    }

    // Log locally (important even if remote fails)
    console.error('[TRACKED_ERROR]', JSON.stringify(trackedError))

    // Send to monitoring endpoint (non-blocking)
    if (MONITORING_ENDPOINT) {
      // Fire-and-forget fetch
      fetch(MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackedError),
      }).catch(() => {
        // Silently fail - monitoring errors should never impact application
        console.error('[MONITORING_SEND_FAILED]', trackedError.message)
      })
    }
  } catch (err) {
    // Last resort: log that error tracking itself failed
    console.error('[ERROR_TRACKING_FAILED]', String(err))
  }
}

/**
 * Track structured error for a specific flow
 */
export function trackPaymentError(
  error: Error | unknown,
  orderId: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return trackError(error, {
    orderId,
    action: 'payment_verification',
    metadata: additionalContext,
  })
}

export function trackInventoryError(
  error: Error | unknown,
  action: 'commit' | 'release' | 'reserve',
  variantId?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return trackError(error, {
    action: `inventory_${action}`,
    metadata: { variantId, ...additionalContext },
  })
}

export function trackCronError(
  error: Error | unknown,
  cronName: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return trackError(error, {
    action: `cron_${cronName}`,
    metadata: additionalContext,
  })
}

export function trackAdminError(
  error: Error | unknown,
  action: string,
  userId?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return trackError(error, {
    userId,
    action: `admin_${action}`,
    metadata: additionalContext,
  })
}
