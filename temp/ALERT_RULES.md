/**
 * Alert Rule Definitions for Production Observability
 * 
 * These rules define when to trigger alerts based on logs and metrics.
 * Implement these rules in your monitoring platform (e.g., DataDog, CloudWatch, Grafana).
 * 
 * All thresholds are configurable via environment variables.
 */

export const ALERT_RULES = {
  /**
   * PAYMENT VERIFICATION ALERTS
   * Monitor Razorpay webhook and verification failures
   */
  PAYMENT: {
    // Alert if payment verification fails > 5 times in 30 minutes
    VERIFICATION_FAILURE_RATE: {
      name: 'payment_verification_failures',
      condition: 'Count of [payment_verify_failed] > 5 in 30min',
      severity: 'critical',
      action: 'Review Razorpay connectivity and webhook configuration. Check CloudWatch logs for [payment_verify_failed] entries.',
      logPattern: '[ERROR] payment_verify_failed',
      threshold: parseInt(process.env.ALERT_PAYMENT_FAILURES_THRESHOLD || '5'),
      timeWindow: 30 * 60 * 1000, // 30 minutes
    },

    // Alert if payment enters NEEDS_REVIEW but never recovers
    NEEDS_REVIEW_TIMEOUT: {
      name: 'payment_needs_review_timeout',
      condition: 'Order status = NEEDS_REVIEW > 2 hours without state change',
      severity: 'warning',
      action: 'Check admin panel for orders in NEEDS_REVIEW status. Investigate payment inconsistencies. May need manual intervention or recovery execution.',
      logPattern: 'status === "NEEDS_REVIEW"',
      timeoutThreshold: 2 * 60 * 60 * 1000, // 2 hours
    },

    // Alert if webhook signature validation fails
    WEBHOOK_INVALID: {
      name: 'razorpay_webhook_invalid',
      condition: 'Count of [webhook_invalid] > 3 in 10min',
      severity: 'critical',
      action: 'Razorpay webhook signature validation failed. Verify webhook secret and request origin. This may indicate security issue or misconfiguration.',
      logPattern: '[ERROR] webhook_invalid',
      threshold: 3,
      timeWindow: 10 * 60 * 1000, // 10 minutes
    },
  },

  /**
   * INVENTORY ALERTS
   * Monitor inventory reservation, commit, and release
   */
  INVENTORY: {
    // Alert if inventory commit fails > 10 times in 60 minutes
    COMMIT_FAILURE_RATE: {
      name: 'inventory_commit_failures',
      condition: 'Count of [inventory_commit_failed] > 10 in 60min',
      severity: 'critical',
      action: 'Inventory commit failures detected. Check database connection and stock_reservations table. Verify variant IDs exist and have sufficient stock.',
      logPattern: '[ERROR] inventory_commit_failed',
      threshold: parseInt(process.env.ALERT_INVENTORY_COMMIT_FAILURES || '10'),
      timeWindow: 60 * 60 * 1000, // 60 minutes
    },

    // Alert if inventory release fails > 5 times in 60 minutes
    RELEASE_FAILURE_RATE: {
      name: 'inventory_release_failures',
      condition: 'Count of [inventory_release_failed] > 5 in 60min',
      severity: 'critical',
      action: 'Inventory release failures detected. This may indicate stuck reservations or database issues. Check cron recovery job and admin inventory page.',
      logPattern: '[ERROR] inventory_release_failed',
      threshold: parseInt(process.env.ALERT_INVENTORY_RELEASE_FAILURES || '5'),
      timeWindow: 60 * 60 * 1000, // 60 minutes
    },

    // Alert on inventory inconsistencies (committed vs. actual)
    INCONSISTENCY_DETECTED: {
      name: 'inventory_inconsistency',
      condition: 'Any [inventory_inconsistency] log detected',
      severity: 'warning',
      action: 'Stock quantity mismatch between committed reservations and actual inventory. Run manual audit via admin inventory page. May indicate race condition.',
      logPattern: '[WARN] inventory_inconsistency',
    },

    // Alert if release retry exceeds threshold (indicates stubborn failure)
    RELEASE_RETRY_EXHAUSTION: {
      name: 'inventory_release_retry_exhaustion',
      condition: 'Any [inventory_release_retry] with attempt > 5',
      severity: 'warning',
      action: 'Inventory release retry limit approached. Order may be stuck. Check order status and consider manual intervention.',
      logPattern: '[WARN] inventory_release_retry',
    },
  },

  /**
   * CRON JOB ALERTS
   * Monitor scheduled tasks: cleanup, recovery, revalidation
   */
  CRON: {
    // Alert if cleanup cron hasn't run in 30 minutes
    CLEANUP_MISSED: {
      name: 'cron_cleanup_missed',
      condition: 'No [CRON_HEARTBEAT] for cleanup_expired_orders > 30min',
      severity: 'critical',
      action: 'Cron job "cleanup_expired_orders" has not executed. Verify cron service is running and check for deployment issues. Check application logs for errors.',
      logPattern: '[CRON_HEARTBEAT]',
      missedThreshold: 30 * 60 * 1000, // 30 minutes
      cronName: 'cleanup_expired_orders',
    },

    // Alert if recovery cron hasn't run in 30 minutes
    RECOVERY_MISSED: {
      name: 'cron_recovery_missed',
      condition: 'No [CRON_HEARTBEAT] for recover_stuck_orders > 30min',
      severity: 'critical',
      action: 'Cron job "recover_stuck_orders" has not executed. Stuck NEEDS_REVIEW orders may not be recovered. Verify cron service and check logs.',
      logPattern: '[CRON_HEARTBEAT]',
      missedThreshold: 30 * 60 * 1000, // 30 minutes
      cronName: 'recover_stuck_orders',
    },

    // Alert if cron execution exceeds time limit
    CRON_SLOW_EXECUTION: {
      name: 'cron_slow_execution',
      condition: 'duration > expectedDuration (varies per cron)',
      severity: 'warning',
      action: 'Cron job took longer than expected. May indicate database slowdown or high load. Monitor system resources and consider optimization.',
      logPattern: '[CRON_TIMEOUT]',
      thresholds: {
        cleanup_expired_orders: parseInt(process.env.CRON_CLEANUP_TIMEOUT || '300000'), // 5 min
        recover_stuck_orders: parseInt(process.env.CRON_RECOVERY_TIMEOUT || '600000'), // 10 min
      },
    },

    // Alert if cron failure occurs
    CRON_EXECUTION_FAILED: {
      name: 'cron_execution_failed',
      condition: 'Any [CRON_FAILURE] log detected',
      severity: 'critical',
      action: 'Scheduled cron job failed. Check error message in logs. Determine if manual re-execution is needed or if issue is transient.',
      logPattern: '[CRON_FAILURE]',
    },

    // Alert if cron processes fewer rows than expected (data consistency)
    CRON_LOW_ROWS_PROCESSED: {
      name: 'cron_low_rows_processed',
      condition: 'rowsProcessed < threshold for cron',
      severity: 'info',
      action: 'Cron job processed fewer rows than typical. May indicate early success or that data volume is lower. Not urgent but worth monitoring.',
      logPattern: '[CRON_SUCCESS]',
      thresholds: {
        cleanup_expired_orders: parseInt(process.env.CRON_CLEANUP_MIN_ROWS || '0'), // 0 = no minimum
        recover_stuck_orders: parseInt(process.env.CRON_RECOVERY_MIN_ROWS || '0'), // 0 = no minimum
      },
    },
  },

  /**
   * RECOVERY ALERTS
   * Monitor automatic recovery attempts for stuck orders
   */
  RECOVERY: {
    // Alert if recovery attempt fails
    RECOVERY_ATTEMPT_FAILED: {
      name: 'recovery_attempt_failed',
      condition: 'Any [recovery_failed] log detected',
      severity: 'warning',
      action: 'Order recovery attempt failed. Check admin detail page for order. Investigate payment state and reservation state. May need manual resolution.',
      logPattern: '[WARN] recovery_failed',
    },

    // Alert if recovery is marked unrecoverable
    RECOVERY_UNRECOVERABLE: {
      name: 'recovery_unrecoverable',
      condition: 'Any [recovery_unrecoverable] log detected',
      severity: 'critical',
      action: 'Order cannot be automatically recovered. MANUAL INTERVENTION REQUIRED. Check admin detail page for full context and reason. May require customer contact.',
      logPattern: '[ERROR] recovery_unrecoverable',
    },

    // Alert if recovery attempt exceeds time limit
    RECOVERY_TIMEOUT: {
      name: 'recovery_timeout',
      condition: 'duration > 30 seconds for recovery attempt',
      severity: 'warning',
      action: 'Recovery attempt took unusually long. May indicate external service latency (Razorpay, database). Monitor and consider timeout increase if needed.',
      logPattern: 'recovery_complete',
      timeoutThreshold: 30000, // 30 seconds
    },
  },

  /**
   * OPERATIONAL ALERTS
   * Infrastructure and application health
   */
  OPERATIONAL: {
    // Alert on unhandled exceptions in API routes
    API_ROUTE_ERROR: {
      name: 'api_route_error',
      condition: 'Count of [TRACKED_ERROR] in /api/* > 20 in 30min',
      severity: 'warning',
      action: 'High error rate in API routes. Check specific endpoint logs. May indicate DDoS, bad input, or service degradation.',
      logPattern: '[TRACKED_ERROR]',
      threshold: 20,
      timeWindow: 30 * 60 * 1000,
    },

    // Alert on unhandled exceptions in server actions
    SERVER_ACTION_ERROR: {
      name: 'server_action_error',
      condition: 'Count of [TRACKED_ERROR] with action=server_action > 10 in 30min',
      severity: 'warning',
      action: 'Server action errors detected. Check admin pages (products, variants, media, orders). Verify user permissions and input validation.',
      logPattern: '[TRACKED_ERROR]',
      threshold: 10,
      timeWindow: 30 * 60 * 1000,
    },

    // Alert on external service timeouts (Razorpay, Cloudinary, Supabase)
    EXTERNAL_SERVICE_TIMEOUT: {
      name: 'external_service_timeout',
      condition: 'Count of timeout errors > 10 in 30min',
      severity: 'warning',
      action: 'External service timeouts detected. Check status pages and network connectivity. Consider increasing timeout thresholds if services are slow.',
      logPattern: 'timeout|ECONNREFUSED|ETIMEDOUT',
      threshold: 10,
      timeWindow: 30 * 60 * 1000,
    },
  },
}

/**
 * Example: How to implement these rules in different platforms
 * 
 * DataDog Monitor Example:
 * ```
 * {
 *   type: "log alert",
 *   query: 'service:crown-and-crest "[ERROR] payment_verify_failed"',
 *   alertCondition: "error_count > 5",
 *   evaluationDelay: 300,
 *   timeAggregation: "last_30_minutes",
 *   message: "Payment verification failures detected {{value}} in 30min. Check Razorpay connectivity.",
 *   notifyNoData: true
 * }
 * ```
 * 
 * CloudWatch Insights Example:
 * ```
 * fields @timestamp, @message, @level, orderId, action
 * | filter @level = "ERROR" and action = "payment_verify_failed"
 * | stats count() as error_count by action
 * | filter error_count > 5
 * ```
 * 
 * Grafana Loki Example:
 * ```
 * {job="crown-and-crest", level="ERROR"} | pattern `payment_verify_failed`
 * | stats count() by level
 * ```
 */

/**
 * Configuration environment variables
 * 
 * # Enable/disable observability
 * ENABLE_ERROR_TRACKING=true
 * ENABLE_STRUCTURED_LOGGING=true
 * ENABLE_CRON_MONITORING=true
 * 
 * # Alert thresholds
 * ALERT_PAYMENT_FAILURES_THRESHOLD=5
 * ALERT_INVENTORY_COMMIT_FAILURES=10
 * ALERT_INVENTORY_RELEASE_FAILURES=5
 * 
 * # Cron timeouts (ms)
 * CRON_CLEANUP_TIMEOUT=300000    # 5 minutes
 * CRON_RECOVERY_TIMEOUT=600000   # 10 minutes
 * 
 * # Endpoints
 * ERROR_TRACKING_ENDPOINT=https://your-monitoring.service/errors
 * CRON_METRICS_ENDPOINT=https://your-monitoring.service/metrics
 */
