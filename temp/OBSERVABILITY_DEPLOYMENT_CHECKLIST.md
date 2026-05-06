# Observability Deployment Checklist

Quick reference for deploying production observability to Crown and Crest.

## Phase 1: Pre-Deployment (Local Testing)

- [ ] Configure `.env.local`:
  ```env
  ENABLE_ERROR_TRACKING=true
  ENABLE_STRUCTURED_LOGGING=true
  ENABLE_CRON_MONITORING=true
  NODE_ENV=development
  ```

- [ ] Run `npm run dev` and verify no new errors introduced

- [ ] Trigger test payment error:
  ```bash
  curl -X POST http://localhost:3000/api/razorpay/verify \
    -H "Content-Type: application/json" \
    -d '{"razorpay_order_id":"bad","razorpay_payment_id":"bad","razorpay_signature":"bad","orderId":"test"}'
  ```

- [ ] Verify JSON log appears in console with structure:
  ```json
  {
    "timestamp": "...",
    "level": "error",
    "service": "razorpay",
    "type": "payment_error"
  }
  ```

## Phase 2: Staging Deployment

- [ ] **Choose monitoring platform:**
  - [ ] DataDog (Recommended for full-stack observability)
  - [ ] CloudWatch (If using AWS)
  - [ ] Grafana + Loki (If self-hosted)

- [ ] **Set up monitoring service:**
  - [ ] Create account/workspace
  - [ ] Generate API keys
  - [ ] Create log groups/indexes
  - [ ] Note endpoint URLs and credentials

- [ ] **Configure environment variables in staging:**
  ```env
  ENABLE_ERROR_TRACKING=true
  ENABLE_STRUCTURED_LOGGING=true
  ENABLE_CRON_MONITORING=true
  ERROR_TRACKING_ENDPOINT=https://...  # Real monitoring endpoint
  NODE_ENV=staging
  ```

- [ ] **Deploy to staging** and verify:
  - [ ] Application starts without errors
  - [ ] Logs appear in monitoring dashboard within 30 seconds
  - [ ] Dashboard shows structured JSON format

- [ ] **Create test orders** to verify all integrations:
  - [ ] Valid order → logs appear (payment success flow)
  - [ ] Invalid signature → error tracked and appears in dashboard
  - [ ] Out of stock item → inventory error tracked

- [ ] **Set up alert rules** in monitoring platform:
  - [ ] Payment failure alert (>5 in 30 min)
  - [ ] Inventory commit alert (>10 in 60 min)
  - [ ] Cron job failure alert (immediate)
  - [ ] Test alert firing mechanism

- [ ] **Create dashboards** showing:
  - [ ] Error rate by service
  - [ ] Payment success rate
  - [ ] Inventory operation metrics
  - [ ] Cron job duration

- [ ] **Monitor for 48 hours:**
  - [ ] Watch for false positives in alerts
  - [ ] Observe normal traffic patterns
  - [ ] Fine-tune alert thresholds if needed

## Phase 3: Production Deployment

- [ ] **Review staging results:**
  - [ ] No unexpected errors
  - [ ] Alert thresholds are reasonable
  - [ ] Dashboards are useful for operations

- [ ] **Configure production environment variables:**
  ```env
  ENABLE_ERROR_TRACKING=true
  ENABLE_STRUCTURED_LOGGING=true
  ENABLE_CRON_MONITORING=true
  ERROR_TRACKING_ENDPOINT=https://...  # Real endpoint
  CRON_METRICS_ENDPOINT=https://...    # Optional; can reuse ERROR_TRACKING_ENDPOINT
  NODE_ENV=production
  ```

- [ ] **Set alert notification channels:**
  - [ ] Slack: `#payment-alerts`
  - [ ] Slack: `#inventory-alerts`
  - [ ] Slack: `#cron-alerts`
  - [ ] PagerDuty: Critical alerts
  - [ ] Email: On-call team for escalation

- [ ] **Deploy to production** with observability enabled

- [ ] **Verify logs flowing** within first 5 minutes:
  - Check monitoring dashboard for incoming logs
  - Search for any errors in recent logs
  - Verify cron job metrics appearing

- [ ] **Monitor first 24 hours closely:**
  - [ ] No performance degradation
  - [ ] All critical flows covered by observability
  - [ ] Alert rules not firing unexpectedly
  - [ ] Log volume reasonable (not overwhelming dashboard)

- [ ] **Document any adjustments:**
  - [ ] Alert threshold changes
  - [ ] New log entries added
  - [ ] Dashboard updates

## Phase 4: Ongoing Operations

- [ ] **Daily monitoring:**
  - [ ] Check critical alerts in #payment-alerts
  - [ ] Review error trends in dashboard
  - [ ] Verify cron jobs running successfully

- [ ] **Weekly review:**
  - [ ] Analyze error patterns
  - [ ] Check for recurring issues
  - [ ] Review alert effectiveness

- [ ] **Monthly review:**
  - [ ] Update runbooks based on real incidents
  - [ ] Fine-tune alert thresholds
  - [ ] Plan improvements based on gaps found

## Critical Integration Points (Already Done)

The following integration points have been completed:

### Payment Verification (`src/app/api/razorpay/verify/route.ts`)
- [x] trackPaymentError on signature validation failure
- [x] trackPaymentError on payment status update failure
- [x] trackPaymentError on reservation commit failure
- [x] logInfo/logError for verification flow
- [x] logWarn for non-blocking failures (snapshot, cart clear)

### Inventory Actions (`src/lib/inventory/actions.ts`)
- [x] logInfo.inventoryReserveStart at function entry
- [x] logError.inventoryReserveFailed on error
- [x] trackInventoryError on error with context
- [x] Same pattern for commit and release operations

### Cron Job Cleanup (`src/app/api/cron/cleanup-reservations/route.ts`)
- [x] cronHealthMetrics.logCronStart
- [x] cronHealthMetrics.logCronSuccess/Failure
- [x] logInfo/logError for execution results
- [x] trackCronError on failures
- [x] reportCronMetrics to monitoring endpoint

## Quick Rollback Instructions

If observability is causing issues in production:

1. **Disable all observability** in environment:
   ```env
   ENABLE_ERROR_TRACKING=false
   ENABLE_STRUCTURED_LOGGING=false
   ENABLE_CRON_MONITORING=false
   ```

2. **Redeploy application** (no code changes needed)

3. **Verify application stability** returns

4. **Investigate root cause** in staging with same reproducer

## Verification Commands

### Check Observability Libraries Exist
```bash
ls -la src/lib/observability/
# Should show:
# - errorTracking.ts
# - structuredLogging.ts
# - cronMonitoring.ts
# - index.ts
```

### Verify Imports in Route Files
```bash
grep -l "trackPaymentError\|logInfo\|cronHealthMetrics" \
  src/app/api/razorpay/verify/route.ts \
  src/lib/inventory/actions.ts \
  src/app/api/cron/cleanup-reservations/route.ts
# Should show all three files
```

### Test Local Logging
```bash
# Set dev environment
export NODE_ENV=development
export ENABLE_STRUCTURED_LOGGING=true

# Start app and check console for JSON logs
npm run dev
```

## Team Responsibilities

| Role | Responsibility |
|------|-----------------|
| DevOps | Set up monitoring platform, manage credentials, configure dashboards |
| On-Call | Monitor alerts, respond to incidents, update runbooks |
| Engineering | Deploy observability code, integrate new features, fix monitoring bugs |
| Product | Review metrics, identify business insights, report issues |

## Support & Documentation

- **Architecture**: [OBSERVABILITY_GUIDE.md](./OBSERVABILITY_GUIDE.md)
- **Alert Rules**: [ALERT_RULES.md](./ALERT_RULES.md)
- **Platform Setup**: [MONITORING_PLATFORM_SETUP.md](./MONITORING_PLATFORM_SETUP.md)
- **Error Tracking**: [src/lib/observability/errorTracking.ts](./src/lib/observability/errorTracking.ts)
- **Structured Logging**: [src/lib/observability/structuredLogging.ts](./src/lib/observability/structuredLogging.ts)
- **Cron Monitoring**: [src/lib/observability/cronMonitoring.ts](./src/lib/observability/cronMonitoring.ts)

## Success Metrics

- ✅ All payment errors detected and logged within 1 minute
- ✅ All inventory issues detected and logged within 30 seconds
- ✅ All cron job failures detected and alerted within 5 minutes
- ✅ <5 false positive alerts per week
- ✅ <50MB log storage per day (depends on traffic)
- ✅ <1s latency impact on critical paths (fire-and-forget design)

---

**Status**: Ready for staging deployment  
**Last Updated**: January 2024  
**Next Review**: Before production deployment
