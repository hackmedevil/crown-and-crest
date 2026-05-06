# Production Observability & Alerting Guide

## Overview

This guide documents the observability infrastructure added to Crown and Crest for production monitoring. All monitoring is **read-only** and **non-blocking** — errors are captured and logged without affecting user flows.

---

## 1. Architecture

### Three Layers

1. **Error Tracking** (`errorTracking.ts`)
   - Captures exceptions from API routes, server actions, middleware
   - Sends to monitoring endpoint (fire-and-forget)
   - Includes context: orderId, userId, action name, environment
   - Never blocks execution

2. **Structured Logging** (`structuredLogging.ts`)
   - JSON-formatted logs for critical flows
   - Three levels: info (normal), warn (retryable), error (action required)
   - Predefined log entries for payment, inventory, cron, recovery

3. **Cron Monitoring** (`cronMonitoring.ts`)
   - Tracks scheduled job execution, duration, success/failure
   - Sends heartbeats for "cron stopped" detection
   - Metrics for latency and row processing

---

## 2. Log Format & Filtering

### Structured JSON Format

All logs follow this structure:

```json
{
  "timestamp": "2025-12-18T10:30:45.123Z",
  "level": "error|warn|info",
  "message": "Human-readable description",
  "context": {
    "orderId": "order_xyz",
    "userId": "user_abc",
    "action": "payment_verify_complete",
    "duration": 450,
    "metadata": { "attempt": 1 }
  },
  "environment": "production"
}
```

### Log Prefixes (for easy filtering)

- `[INFO]` – Normal operations (log rotation may be needed)
- `[WARN]` – Retryable issues, warnings
- `[ERROR]` – Action required, critical issues
- `[TRACKED_ERROR]` – Exceptions with context
- `[CRON_METRICS]` – Cron job metrics
- `[CRON_HEARTBEAT]` – Cron execution started
- `[CRON_SUCCESS]` – Cron job succeeded
- `[CRON_FAILURE]` – Cron job failed

### Query Examples

#### CloudWatch Insights
```
fields @timestamp, @message, orderId, action
| filter @message like /payment_verify_failed/
| stats count() as failures by orderId
| filter failures > 1
```

#### Grafana Loki
```
{job="crown-and-crest", level="ERROR"} 
| pattern `<level> <message>` 
| unwrap action
```

#### DataDog
```
service:crown-and-crest source:nodejs "payment_verify_failed"
```

---

## 3. Alert Rules

See [ALERT_RULES.md](./ALERT_RULES.md) for complete alert definitions.

### High-Severity Alerts (Page on-call)

- ⚠️ **Payment Verification Failures** > 5 in 30min
  - Check: Razorpay webhook configuration, network connectivity
  - Action: Verify webhook secret, check IP whitelisting

- ⚠️ **Inventory Commit Failures** > 10 in 60min
  - Check: Database connection, stock_reservations table
  - Action: Verify table exists, check disk space, review RLS policies

- ⚠️ **Cron Job Missed** (no heartbeat > 30min)
  - Check: Cron service running, application logs
  - Action: Restart cron service, check for deployment issues

- ⚠️ **Recovery Unrecoverable**
  - Check: Order detail page in admin panel
  - Action: MANUAL INTERVENTION - investigate payment/inventory state

### Medium-Severity Alerts (Review within 1 hour)

- ⚠️ **Payment Enters NEEDS_REVIEW** > 2 hours without recovery
  - Check: Admin orders page for stuck orders
  - Action: Investigate payment inconsistency, trigger recovery

- ⚠️ **Inventory Release Failures** > 5 in 60min
  - Check: Cron recovery job, reservation table
  - Action: Review recovery job logs, check database state

- ⚠️ **Webhook Signature Invalid** > 3 in 10min
  - Check: Razorpay webhook configuration
  - Action: Verify webhook secret hasn't changed, check request origin

- ⚠️ **Recovery Attempt Failed**
  - Check: Order detail page, payment state
  - Action: Investigate reason, may be transient

### Low-Severity Alerts (Informational)

- ℹ️ **Cron Slow Execution**
  - Check: System resources, database performance
  - Action: Monitor trends, consider optimization if consistent

- ℹ️ **Inventory Inconsistency Detected**
  - Check: Admin inventory page
  - Action: Run manual audit, may indicate race condition

---

## 4. Critical Flows Monitored

### Payment Flow

1. Webhook received → `logInfo.paymentVerificationStart`
2. Signature validated → `logWarn.paymentVerificationRetry` (if error)
3. Payment verified → `logInfo.paymentVerificationComplete`
4. If fails repeatedly → Alert: **Payment Verification Failures**
5. If enters NEEDS_REVIEW → Alert: **Payment Needs Review Timeout**

**Where to look**: Admin Orders page → Order detail → Payment ID + Reservation State

### Inventory Flow

1. Variant selected → Inventory commit begins
2. Reservation created → `logInfo.inventoryCommit`
3. If fails → `logError.inventoryCommitFailed` → Alert: **Inventory Commit Failures**
4. If release fails during recovery → Alert: **Inventory Release Failures**
5. If inconsistency detected → `logWarn.inventoryInconsistency`

**Where to look**: Admin Inventory page → Stock levels + status

### Cron Jobs

1. Every 30 min: `cleanup_expired_orders`
   - Cleans up expired reservations
   - Alert if missed > 30min
   
2. Every 5 min: `recover_stuck_orders`
   - Attempts recovery on NEEDS_REVIEW orders
   - Alert if missed > 30min or fails

**Where to look**: Application logs for `[CRON_*]` entries

### Recovery Flow

1. Order stuck in NEEDS_REVIEW → Recovery cron triggers
2. Payment state checked → `logInfo.recoveryAttemptStart`
3. Attempt made → `logInfo.recoveryAttemptComplete`
4. If fails → `logWarn.recoveryAttemptFailed`
5. If unrecoverable → `logError.recoveryAttemptUnrecoverable` → Alert (manual action needed)

**Where to look**: Admin Orders page → Order detail → Recovery instructions

---

## 5. Environment Configuration

### Enable/Disable Observability

```bash
# .env.production
ENABLE_ERROR_TRACKING=true
ENABLE_STRUCTURED_LOGGING=true
ENABLE_CRON_MONITORING=true

# Monitoring endpoints
ERROR_TRACKING_ENDPOINT=https://your-monitoring.service/errors
CRON_METRICS_ENDPOINT=https://your-monitoring.service/metrics

# Alert thresholds
ALERT_PAYMENT_FAILURES_THRESHOLD=5
ALERT_INVENTORY_COMMIT_FAILURES=10
ALERT_INVENTORY_RELEASE_FAILURES=5

# Cron timeouts (milliseconds)
CRON_CLEANUP_TIMEOUT=300000    # 5 minutes
CRON_RECOVERY_TIMEOUT=600000   # 10 minutes
```

### Local Development

```bash
# .env.local (disable to reduce log noise)
ENABLE_ERROR_TRACKING=false
ENABLE_STRUCTURED_LOGGING=true   # Keep logs for debugging
ENABLE_CRON_MONITORING=false
```

---

## 6. Integrating with Monitoring Platforms

### DataDog

```python
# Example: Create monitor for payment failures
from datadog_api_client.v1 import ApiClient, Configuration
from datadog_api_client.v1.api.monitors_api import MonitorsApi
from datadog_api_client.v1.model.monitor import Monitor

body = Monitor(
    type="log alert",
    query='service:crown-and-crest source:nodejs "[ERROR] payment_verify_failed"',
    monitor_thresholds={
        "critical": 5,
    },
    evaluation_delay=300,
    name="Payment Verification Failures High",
    message="""
    Payment verification failures detected: {{value}} in 30 minutes.
    Check: Razorpay webhook configuration and network connectivity.
    Action: Verify webhook secret, check IP whitelisting.
    """,
    tags=["service:payments", "severity:critical"],
)
```

### CloudWatch

```json
{
  "MetricAlarms": [
    {
      "AlarmName": "payment-verification-failures",
      "MetricName": "payment_verify_failed",
      "Namespace": "crown-and-crest",
      "Statistic": "Sum",
      "Period": 1800,
      "EvaluationPeriods": 1,
      "Threshold": 5,
      "ComparisonOperator": "GreaterThanThreshold",
      "AlarmActions": ["arn:aws:sns:..."]
    }
  ]
}
```

### Grafana + Loki

```yaml
# rules.yaml
groups:
  - name: crown-and-crest
    rules:
      - alert: PaymentVerificationFailures
        expr: |
          sum(rate({job="crown-and-crest", level="error"} |= "payment_verify_failed"[30m]))
        for: 5m
        threshold: 5
        annotations:
          summary: "Payment verification failures detected"
```

---

## 7. Runbook: Responding to Alerts

### Alert: Payment Verification Failures High

**Severity**: 🔴 Critical

**What it means**: Razorpay webhook verification is failing repeatedly (likely signature mismatch).

**Where to look**:
1. CloudWatch Logs: Filter `[ERROR] payment_verify_failed`
2. Admin Orders page: Check recent orders, look for NEEDS_REVIEW

**Response steps**:
1. Check Razorpay Dashboard → Webhook → Verify secret hasn't changed
2. Check IP whitelisting: Is webhook sender IP allowed?
3. Check network: Can application reach Razorpay API?
4. If persistent: Contact Razorpay support with webhook logs
5. Temporary mitigation: Increase verification retry count (see `PAYMENT_RETRY_COUNT` in code)

---

### Alert: Cron Job Missed

**Severity**: 🔴 Critical

**What it means**: `cleanup_expired_orders` or `recover_stuck_orders` hasn't run in 30+ minutes.

**Where to look**:
1. CloudWatch Logs: Filter `[CRON_HEARTBEAT]`
2. Application deployment: Check if cron service is running
3. Task scheduler: Verify cron job is registered

**Response steps**:
1. Check application logs for errors
2. Verify cron service is running: `ps aux | grep cron`
3. Check if application was recently deployed: May need restart
4. Manually trigger recovery if stuck orders exist: Admin panel
5. Re-deploy or restart application

---

### Alert: Inventory Commit Failures High

**Severity**: 🔴 Critical

**What it means**: Creating reservations is failing (likely database issue).

**Where to look**:
1. CloudWatch Logs: Filter `[ERROR] inventory_commit_failed`
2. Admin Inventory page: Check stock levels
3. Database: Check `stock_reservations` table RLS policies

**Response steps**:
1. Check database connectivity: Is Supabase online?
2. Check table permissions: RLS policies on `stock_reservations`
3. Check disk space: Is database running out of storage?
4. Verify table schema: Does `stock_reservations` table exist?
5. If transient: Wait and monitor, likely will resolve
6. If persistent: Contact database support with error logs

---

### Alert: Recovery Unrecoverable

**Severity**: 🔴 Critical (MANUAL ACTION REQUIRED)

**What it means**: An order is stuck and automatic recovery cannot fix it.

**Where to look**:
1. Admin Orders page → Find order in NEEDS_REVIEW
2. Order detail page → Check Payment ID and Reservation State
3. CloudWatch Logs: Filter `[ERROR] recovery_unrecoverable`

**Response steps**:
1. Understand the state: Is payment completed? Is inventory available?
2. Decision tree:
   - ✅ Payment succeeded + inventory available → Manually release reservation, update status to PAID
   - ❌ Payment failed + inventory committed → Manual refund, then release reservation
   - ⚠️ Payment pending → Wait for webhook, then retry recovery
3. Contact customer if needed (refund, reschedule order)
4. Log manual action in admin notes for audit trail

---

### Alert: Inventory Inconsistency Detected

**Severity**: 🟡 Warning

**What it means**: Reserved quantity doesn't match available quantity.

**Where to look**:
1. Admin Inventory page → Check stock for affected variant
2. CloudWatch Logs: Filter `[WARN] inventory_inconsistency`
3. Database: Check `variants` vs. `stock_reservations`

**Response steps**:
1. Run manual inventory audit (admin page)
2. If minor (1-2 units): Likely race condition, monitor for recurrence
3. If significant: Check for failed releases or phantom reservations
4. Consider running manual cleanup: Delete orphaned reservations
5. Monitor for further inconsistencies

---

## 8. Metrics to Monitor

### Business Metrics

- **Conversion rate**: Orders completed / sessions
- **Payment success rate**: PAID / Total orders
- **Stuck orders**: NEEDS_REVIEW count
- **Recovery success rate**: Recovered / Stuck

### Operational Metrics

- **Payment verification latency**: p50, p95, p99
- **Inventory commit latency**: p50, p95, p99
- **Cron duration**: Cleanup, Recovery
- **Error rates**: By endpoint, by action

### Infrastructure Metrics

- **Database latency**: Query times, connection pool
- **Disk usage**: Application, database
- **Memory usage**: Application, cron jobs
- **Uptime**: Cron job heartbeat

---

## 9. Escalation Paths

```
Customer Impact?
├─ YES (checkout broken, orders not processing)
│  └─ Page on-call immediately
│     ├─ Check: Critical alerts
│     ├─ Check: Database/API health
│     └─ Decision: Roll back vs. fix
│
└─ NO (single orders stuck, warning logs)
   └─ Review within 1 hour
      ├─ Check: Root cause
      ├─ Check: Frequency
      └─ Decision: Monitor vs. action
```

---

## 10. Testing Observability

### Local Testing

```bash
# Enable structured logging locally
ENABLE_STRUCTURED_LOGGING=true npm run dev

# Trigger payment error
curl -X POST http://localhost:3000/api/razorpay/webhook \
  -H "Content-Type: application/json" \
  -d '{"event": "invalid"}'

# Check logs for [ERROR] messages
```

### Staging Deployment

1. Deploy to staging with observability enabled
2. Run load test / manual test scenarios
3. Verify logs appear in monitoring platform
4. Test alert rules with synthetic events
5. Verify on-call notifications work

---

## 11. FAQ

**Q: Why are errors logged but not shown to users?**
A: Errors are captured for operational visibility (monitoring), while user-facing errors are handled separately in the application UI.

**Q: Can errors block user requests?**
A: No. Error tracking is fire-and-forget. A slow monitoring endpoint won't delay user responses.

**Q: What if monitoring endpoint is down?**
A: Failures to send to monitoring endpoint are silently caught. Application continues normally. Local logs are always written.

**Q: Do I need to change alert thresholds?**
A: Yes! Thresholds are in `ALERT_RULES.md` and `.env`. Adjust based on your baseline (0 failures = strict, 10+ failures = lenient).

**Q: How do I know if a cron job runs?**
A: Look for `[CRON_HEARTBEAT]` logs. If no heartbeat in 30+ minutes, cron job may be stuck or not running.

**Q: Can I disable observability in production?**
A: Not recommended. It's read-only and non-blocking. Disable only specific features (payment tracking, cron monitoring, etc.) via env vars.

---

## 12. Resources

- [Alert Rules](./ALERT_RULES.md) – Complete alert definitions
- [Error Tracking](./src/lib/observability/errorTracking.ts) – Implementation
- [Structured Logging](./src/lib/observability/structuredLogging.ts) – Log helpers
- [Cron Monitoring](./src/lib/observability/cronMonitoring.ts) – Cron tracking

