## Monitoring Platform Integration Guide

This guide provides step-by-step instructions for setting up Crown and Crest observability infrastructure with major monitoring platforms.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [DataDog Integration](#datadog-integration)
3. [CloudWatch Integration](#cloudwatch-integration)
4. [Grafana + Loki Integration](#grafana--loki-integration)
5. [Alert Rules](#alert-rules)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Crown and Crest observability infrastructure consists of three layers:

```
┌─────────────────────────────────────────┐
│  Application Layer (Next.js)            │
│  ├── errorTracking.ts                   │ Fire-and-forget error tracking
│  ├── structuredLogging.ts               │ JSON-structured logs
│  └── cronMonitoring.ts                  │ Cron job heartbeats
└──────────────┬──────────────────────────┘
               │
               ├──────────────────────────────────────────┐
               │                                          │
               v                                          v
┌──────────────────────────┐              ┌─────────────────────────┐
│  Monitoring Endpoint     │              │  Cloud Logging          │
│  (Configured via ENV)    │              │  (stdout/stderr)        │
└────────┬─────────────────┘              └────────┬────────────────┘
         │                                        │
         ├────────────────────┬───────────────────┤
         v                    v                   v
    ┌──────────┐         ┌──────────┐      ┌──────────┐
    │ DataDog  │         │CloudWatch│      │ Grafana  │
    │   APM    │         │  Logs    │      │  Loki    │
    └────┬─────┘         └────┬─────┘      └────┬─────┘
         │                    │                  │
         v                    v                  v
    ┌──────────────────────────────────────────────────────┐
    │  Alert Rules & Dashboards                           │
    │  - Payment Failure Alerts                           │
    │  - Inventory Issue Alerts                           │
    │  - Cron Job Failure Alerts                          │
    │  - Recovery State Alerts                            │
    └──────────────────────────────────────────────────────┘
```

**Key Features:**
- **Fire-and-Forget**: All tracking is async and non-blocking
- **Non-Intrusive**: Errors are never re-thrown; system continues functioning
- **Configurable**: Enable/disable per environment via ENV variables
- **Fallback to Console**: If monitoring endpoint unreachable, logs go to console only
- **Structured Format**: JSON logs for easy parsing and filtering

---

## DataDog Integration

DataDog is the recommended platform for full-stack observability.

### Step 1: Set Up DataDog

1. Log into [DataDog Dashboard](https://app.datadoghq.com)
2. Go to **Admin** → **API and Application Keys**
3. Create a new API Key for logs (e.g., `crown-and-crest-logs-key`)
4. Copy the API Key and your Org ID

### Step 2: Configure Environment Variables

Add to `.env.production` and `.env.staging`:

```env
# DataDog Configuration
DATADOG_API_KEY=<your-api-key>
DATADOG_SITE=datadoghq.com           # Or datadoghq.eu for EU
DATADOG_SERVICE_NAME=crown-and-crest
DATADOG_ENV=production               # or staging

# Enable observability layers
ENABLE_ERROR_TRACKING=true
ENABLE_STRUCTURED_LOGGING=true
ENABLE_CRON_MONITORING=true

# Monitoring endpoint (for error tracking)
ERROR_TRACKING_ENDPOINT=https://http-intake.logs.${DATADOG_SITE}/v1/input/${DATADOG_API_KEY}

# Cron monitoring endpoint (optional; can use ERROR_TRACKING_ENDPOINT)
CRON_METRICS_ENDPOINT=https://http-intake.logs.${DATADOG_SITE}/v1/input/${DATADOG_API_KEY}

# Alert thresholds
ALERT_PAYMENT_FAILURES_THRESHOLD=5
ALERT_PAYMENT_FAILURES_TIME_WINDOW=1800  # 30 minutes
ALERT_INVENTORY_COMMIT_THRESHOLD=10
ALERT_INVENTORY_COMMIT_TIME_WINDOW=3600  # 60 minutes
ALERT_CRON_MISSED_THRESHOLD=1
ALERT_CRON_MISSED_TIME_WINDOW=1800       # 30 minutes (if no heartbeat in 30min)
ALERT_RECOVERY_DURATION_MAX=3600         # Alert if recovery takes >1 hour
ALERT_NEEDS_REVIEW_DURATION_MAX=7200     # Alert if order in NEEDS_REVIEW >2 hours
```

### Step 3: Create DataDog Log Monitors

1. Go to **Monitors** → **New Monitor** → **Logs**

#### Monitor 1: Payment Verification Failures

```datadog_query
service:razorpay @type:payment_error @action:verify_signature
```

- **Alert if**: More than 5 errors in the last 30 minutes
- **Threshold**: 5
- **Time Window**: 30 minutes
- **Severity**: High (P2)
- **Notification**: Slack channel `#payment-alerts`

#### Monitor 2: Inventory Commit Failures

```datadog_query
service:inventory @type:inventory_error @action:commit_reservation
```

- **Alert if**: More than 10 errors in the last 60 minutes
- **Threshold**: 10
- **Time Window**: 60 minutes
- **Severity**: High (P2)

#### Monitor 3: Cron Job Failures

```datadog_query
service:cron @type:cron_error
```

- **Alert if**: Any cron job failure
- **Threshold**: 1
- **Time Window**: 5 minutes
- **Severity**: Critical (P1)

#### Monitor 4: NEEDS_REVIEW Orders (Stuck Recovery)

```datadog_query
source:app tag:order_status:NEEDS_REVIEW
```

This requires adding structured logs when orders enter NEEDS_REVIEW state.

- **Alert if**: Order in NEEDS_REVIEW for >2 hours (requires custom metric)
- **Severity**: Medium (P3)

### Step 4: Create DataDog Dashboard

1. Go to **Dashboards** → **New Dashboard** → **New Timeboard**
2. Add the following widgets:

**Widget 1: Payment Success Rate**
```datadog_query
avg:payment.success_rate{service:crown-and-crest}
```

**Widget 2: Inventory Operations**
```datadog_query
sum:inventory.reserve_count{service:crown-and-crest}, sum:inventory.commit_count{service:crown-and-crest}, sum:inventory.release_count{service:crown-and-crest}
```

**Widget 3: Cron Job Duration**
```datadog_query
avg:cron.duration_ms{service:crown-and-crest} by {job_name}
```

**Widget 4: Error Rate by Service**
```datadog_query
sum:errors{service:crown-and-crest} by {service}
```

### Step 5: Test DataDog Integration

```bash
# Test sending error to DataDog
curl -X POST https://http-intake.logs.datadoghq.com/v1/input/<YOUR_API_KEY> \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
    "level": "error",
    "service": "crown-and-crest",
    "type": "payment_error",
    "message": "Test error from integration guide",
    "context": {
      "orderId": "test-123",
      "environment": "staging"
    }
  }'
```

---

## CloudWatch Integration

CloudWatch is ideal if running on AWS infrastructure.

### Step 1: Set Up CloudWatch

1. Log into AWS Console
2. Go to **CloudWatch** → **Logs**
3. Create Log Group: `/aws/crown-and-crest/errors`
4. Create Log Group: `/aws/crown-and-crest/cron`

### Step 2: Create IAM Role for Logs

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:CreateLogGroup"
      ],
      "Resource": "arn:aws:logs:*:*:/aws/crown-and-crest/*"
    }
  ]
}
```

### Step 3: Configure Environment Variables

```env
# CloudWatch Configuration
AWS_REGION=us-east-1                        # Your AWS region
AWS_LOG_GROUP=/aws/crown-and-crest/errors   # CloudWatch log group
CLOUDWATCH_ENABLED=true

# Monitoring endpoint (CloudWatch API)
ERROR_TRACKING_ENDPOINT=https://logs.${AWS_REGION}.amazonaws.com/
```

### Step 4: CloudWatch Insights Queries

#### Query 1: Payment Failures in Last 30 Minutes

```cloudwatch_insights
fields @timestamp, @message, orderId, error_type
| filter service = "razorpay" and level = "error"
| stats count() by error_type
| sort count() desc
```

#### Query 2: Cron Job Duration

```cloudwatch_insights
fields @timestamp, jobName, duration_ms
| filter service = "cron" and level = "info"
| stats avg(duration_ms), max(duration_ms), min(duration_ms) by jobName
```

#### Query 3: Inventory Commit Failures

```cloudwatch_insights
fields @timestamp, orderId, reason
| filter service = "inventory" and @message like /commit/ and level = "error"
| stats count() as failures
```

### Step 5: Create CloudWatch Alarms

#### Alarm 1: Payment Error Rate

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name crown-crest-payment-errors \
  --alarm-description "Alert on payment verification failures" \
  --metric-name ErrorCount \
  --namespace crown-and-crest/payments \
  --statistic Sum \
  --period 1800 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

#### Alarm 2: Cron Job Failure

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name crown-crest-cron-failure \
  --alarm-description "Alert on cron job failures" \
  --metric-name CronFailures \
  --namespace crown-and-crest/cron \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:crown-crest-alerts
```

---

## Grafana + Loki Integration

Grafana provides powerful visualization and Loki is a log aggregation system.

### Step 1: Set Up Loki

Option A: **Use Grafana Cloud (Easiest)**
1. Go to [Grafana Cloud](https://grafana.com/products/cloud/)
2. Create a new stack
3. Go to **Connections** → **Loki**
4. Get your Loki endpoint and API key

Option B: **Self-Hosted Loki**
```bash
# Docker Compose example
version: '3.8'
services:
  loki:
    image: grafana/loki:2.8.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
    command: -config.file=/etc/loki/local-config.yaml

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
volumes:
  grafana-storage:
```

### Step 2: Configure Promtail (Log Agent)

Create `promtail-config.yaml`:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: crown-and-crest
    static_configs:
      - targets:
          - localhost
        labels:
          job: crown-and-crest
          service: api
          __path__: /var/log/crown-and-crest/*.json

  - job_name: cron
    static_configs:
      - targets:
          - localhost
        labels:
          job: cron
          service: cron
          __path__: /var/log/crown-and-crest/cron/*.json
```

### Step 3: Configure Environment Variables

```env
# Loki Configuration
LOKI_ENDPOINT=http://localhost:3100/loki/api/v1/push
LOKI_ENABLED=true
ENABLE_STRUCTURED_LOGGING=true
```

### Step 4: Grafana Dashboard Queries

#### Query 1: Error Rate Over Time

```loki_query
{service="crown-and-crest", level="error"}
| pattern `<_> <_> <_> <_>`
| stats count() by service
```

#### Query 2: Payment Failures

```loki_query
{service="razorpay"}
| json
| error_type != ""
| stats count() by error_type
```

#### Query 3: Cron Job Duration

```loki_query
{service="cron", action="complete"}
| json
| line_format "{{.jobName}}: {{.duration}}ms"
| stats avg(duration) by jobName
```

### Step 5: Create Grafana Alerts

1. Go to **Alerts** → **Alert Rules**
2. Click **Create Alert Rule**

**Alert 1: Payment Verification Failures**
- Query: `{service="razorpay", action="verify"} | json | error != ""` 
- Condition: `count > 5`
- Time Window: `30m`
- Severity: `Critical`

---

## Alert Rules

All alert rules are defined in [ALERT_RULES.md](./ALERT_RULES.md). Key alerts:

| Alert | Threshold | Window | Action |
|-------|-----------|--------|--------|
| Payment Failures | >5 errors | 30min | Page on-call, investigate Razorpay |
| Inventory Commit | >10 errors | 60min | Check DB, review recovery logs |
| Cron Missed | 1 heartbeat missed | 30min | Check cron scheduler, restart if needed |
| NEEDS_REVIEW Stuck | >2hr | Per order | Manual review and recovery |
| Recovery Unrecoverable | 3+ retries failed | Per order | Escalate to dev team |

---

## Testing & Validation

### Local Testing

1. **Enable observability in `.env.local`:**
   ```env
   ENABLE_ERROR_TRACKING=true
   ENABLE_STRUCTURED_LOGGING=true
   ENABLE_CRON_MONITORING=true
   NODE_ENV=development  # Logs go to console in dev
   ```

2. **Trigger test errors:**
   ```bash
   # Start app
   npm run dev
   
   # In another terminal, trigger payment verification failure
   curl -X POST http://localhost:3000/api/razorpay/verify \
     -H "Content-Type: application/json" \
     -d '{ "razorpay_order_id": "bad", "razorpay_payment_id": "bad", "razorpay_signature": "bad", "orderId": "test-123" }'
   ```

3. **Check console output:**
   ```json
   {
     "timestamp": "2024-01-15T10:30:45.123Z",
     "level": "error",
     "service": "razorpay",
     "type": "payment_error",
     "message": "Invalid payment signature",
     "context": {
       "orderId": "test-123",
       "action": "verify_signature",
       "environment": "development"
     }
   }
   ```

### Staging Testing

1. **Set up monitoring platform** (DataDog, CloudWatch, or Grafana)
2. **Deploy to staging** with observability enabled
3. **Create test orders** and trigger failures:
   - Valid order ID, invalid signature → payment error
   - Low inventory → reservation failure
   - Scale inventory → stress test commit/release
4. **Verify logs appear** in monitoring platform
5. **Test alert rules** to ensure notifications fire

### Production Rollout

1. **Enable observability** in production `.env`:
   ```env
   ENABLE_ERROR_TRACKING=true
   ENABLE_STRUCTURED_LOGGING=true
   ENABLE_CRON_MONITORING=true
   ERROR_TRACKING_ENDPOINT=https://...  # Real endpoint
   ```

2. **Monitor for 24-48 hours** to ensure:
   - Logs are flowing correctly
   - No performance degradation
   - Alert rules are not firing incorrectly

3. **Fine-tune alert thresholds** based on production traffic

---

## Troubleshooting

### Logs Not Appearing

1. **Check if observability is enabled:**
   ```bash
   echo $ENABLE_ERROR_TRACKING  # Should be 'true'
   ```

2. **Check monitoring endpoint connectivity:**
   ```bash
   curl -v ${ERROR_TRACKING_ENDPOINT}/health
   ```

3. **Verify logs in console:**
   - In development: Set `NODE_ENV=development` to see console logs
   - Check application logs: `docker logs <container-id>`

4. **Check credentials:**
   - Verify API key is correct in `ERROR_TRACKING_ENDPOINT`
   - Verify service account has write permissions

### High Log Volume

If logs are too verbose:
1. Reduce `ENABLE_STRUCTURED_LOGGING` in non-prod environments
2. Filter logs by severity level in monitoring platform
3. Use sampling: only log 10% of info-level events

### Alert Fatigue

If alerts are firing too frequently:
1. Increase threshold (e.g., 10 errors instead of 5)
2. Increase time window (e.g., 60min instead of 30min)
3. Add filters to exclude known issues

### Monitoring Endpoint Unreachable

The system is designed to handle this gracefully:
1. Error tracking fails silently (logged to console only)
2. Application continues functioning normally
3. Check network connectivity, firewall rules, API key validity

---

## Environment Variables Reference

```env
# Core Observability
ENABLE_ERROR_TRACKING=true|false           # Enable error tracking
ENABLE_STRUCTURED_LOGGING=true|false       # Enable structured logs
ENABLE_CRON_MONITORING=true|false          # Enable cron monitoring
NODE_ENV=production|staging|development    # Environment

# Monitoring Endpoints
ERROR_TRACKING_ENDPOINT=https://...        # Error tracking URL
CRON_METRICS_ENDPOINT=https://...          # Cron metrics URL

# Service Identification
SERVICE_NAME=crown-and-crest               # Service name in logs
DATADOG_SITE=datadoghq.com                # DataDog site (US or EU)
DATADOG_API_KEY=...                        # DataDog API key
AWS_REGION=us-east-1                       # AWS region
LOKI_ENDPOINT=http://localhost:3100        # Loki endpoint

# Alert Thresholds
ALERT_PAYMENT_FAILURES_THRESHOLD=5         # Payment errors threshold
ALERT_PAYMENT_FAILURES_TIME_WINDOW=1800    # Time window in seconds
ALERT_INVENTORY_COMMIT_THRESHOLD=10        # Inventory commit threshold
ALERT_INVENTORY_COMMIT_TIME_WINDOW=3600    # Time window in seconds
ALERT_CRON_MISSED_THRESHOLD=1              # Cron missed threshold
ALERT_CRON_MISSED_TIME_WINDOW=1800         # Time window in seconds
ALERT_RECOVERY_DURATION_MAX=3600           # Max recovery duration (seconds)
ALERT_NEEDS_REVIEW_DURATION_MAX=7200       # Max NEEDS_REVIEW duration (seconds)

# Operational
CRON_SECRET=<your-secret>                  # Cron job security token
```

---

## Next Steps

1. **Choose your monitoring platform** (DataDog recommended)
2. **Set up log aggregation** (DataDog, CloudWatch, or Loki)
3. **Configure alert rules** using examples above
4. **Test in staging** before production deployment
5. **Create on-call runbooks** for each alert (see [ALERT_RULES.md](./ALERT_RULES.md))

---

**Document Version:** 1.0  
**Last Updated:** January 2024  
**Maintainer:** DevOps Team
