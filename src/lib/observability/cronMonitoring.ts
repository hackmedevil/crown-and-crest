/**
 * Cron monitoring utility
 * Tracks cron job execution, duration, and success/failure
 * Sends metrics for alerting on missed executions or slow runs
 */

interface CronExecutionMetrics {
  cronName: string
  startTime: string
  endTime?: string
  duration?: number // ms
  rowsProcessed?: number
  success: boolean
  error?: string
  timestamp: string
}

const CRON_MONITORING_ENABLED = process.env.ENABLE_CRON_MONITORING === 'true'
const CRON_METRICS_ENDPOINT = process.env.CRON_METRICS_ENDPOINT

/**
 * Report cron execution metrics (fire-and-forget)
 */
export async function reportCronMetrics(metrics: CronExecutionMetrics): Promise<void> {
  if (!CRON_MONITORING_ENABLED) return

  try {
    const report = {
      ...metrics,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }

    // Log locally
    console.log('[CRON_METRICS]', JSON.stringify(report))

    // Send to metrics endpoint (non-blocking)
    if (CRON_METRICS_ENDPOINT) {
      fetch(CRON_METRICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      }).catch(() => {
        console.error('[CRON_METRICS_SEND_FAILED]', metrics.cronName)
      })
    }
  } catch (err) {
    console.error('[CRON_METRICS_FAILED]', String(err))
  }
}

/**
 * Wrapper to track cron execution
 * Usage: const result = await withCronMetrics('cleanup_expired_orders', async () => { ... })
 */
export async function withCronMetrics<T>(
  cronName: string,
  fn: () => Promise<{ success: boolean; rowsProcessed?: number; error?: string }>
): Promise<T | null> {
  const startTime = new Date().toISOString()
  const timer = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - timer

    await reportCronMetrics({
      cronName,
      startTime,
      endTime: new Date().toISOString(),
      duration,
      rowsProcessed: result.rowsProcessed,
      success: result.success,
      error: result.error,
      timestamp: new Date().toISOString(),
    })

    return null as T
  } catch (err) {
    const duration = Date.now() - timer

    await reportCronMetrics({
      cronName,
      startTime,
      endTime: new Date().toISOString(),
      duration,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    })

    throw err
  }
}

/**
 * Track specific cron health metrics
 */
export const cronHealthMetrics = {
  /**
   * Log cron execution for monitoring "cron stopped running"
   * Call this at the very start of every cron job
   */
  logCronStart: (cronName: string) => {
    const heartbeat = {
      type: 'cron_heartbeat',
      cronName,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }
    console.log('[CRON_HEARTBEAT]', JSON.stringify(heartbeat))
  },

  /**
   * Log cron success
   */
  logCronSuccess: (cronName: string, rowsProcessed: number, duration: number) => {
    const success = {
      type: 'cron_success',
      cronName,
      rowsProcessed,
      duration,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }
    console.log('[CRON_SUCCESS]', JSON.stringify(success))
  },

  /**
   * Log cron failure (should also call trackCronError)
   */
  logCronFailure: (cronName: string, reason: string, duration: number) => {
    const failure = {
      type: 'cron_failure',
      cronName,
      reason,
      duration,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    }
    console.log('[CRON_FAILURE]', JSON.stringify(failure))
  },
}
