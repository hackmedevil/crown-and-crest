# WhatsApp Deep Audit - 2026-04-01

## Scope

This audit covers WhatsApp Cloud API integration, notification workflow, admin tooling, configuration hygiene, and migration readiness in the Crown & Crest codebase.

Reviewed areas:
- Provider implementation
- Template mapping and diagnostics
- Admin send/test UI and API routes
- Runtime triggers from shipping/order flows
- Environment and secret hygiene

## Executive Summary

Current implementation is functional but has multiple production risks:
- High risk: template diagnostics mismatch can report false negatives and hide real readiness state.
- High risk: inconsistent Graph API versions and locale usage may cause unpredictable behavior as Meta versions evolve.
- Medium risk: outbound-only architecture with no WhatsApp webhook ingestion limits delivery/read observability and reconciliation.
- Medium risk: hardcoded test recipient in admin UI introduces operational and privacy risk.

Overall readiness score: 6.5/10

## Findings (Ordered by Severity)

### 1) Broken required-template check (name mismatch)
Severity: High

Evidence:
- `required_templates` includes `cancelled` in `src/app/api/admin/sms/diagnostics/route.ts`
- Actual mapped template for `CANCELLED` is `order_cancelled` in `src/lib/sms/whatsapp-templates.ts`

Impact:
- Diagnostics can incorrectly claim missing approved template.
- Teams may troubleshoot the wrong issue and block rollout.

Recommendation:
- Replace `cancelled` with `order_cancelled`.
- Build required template list from one shared source (`WHATSAPP_TEMPLATE_NAMES`) to prevent drift.

### 2) Graph API version drift (v18 vs v22)
Severity: High

Evidence:
- `v18.0` used in provider and diagnostics (`src/lib/sms/providers/whatsapp-cloud.ts`, `src/app/api/admin/sms/diagnostics/route.ts`)
- `v22.0` used in test endpoint (`src/app/api/admin/whatsapp/test/route.ts`)

Impact:
- Different behavior between prod send path and admin test path.
- Harder debugging because test success may not match production.

Recommendation:
- Centralize API base version in a single config constant.
- Pin one supported version and update all routes/providers together.

### 3) Locale mismatch risk (`en` vs `en_US`)
Severity: High

Evidence:
- Outbound template payload uses `languageCode: 'en'` in `src/lib/sms/whatsapp-templates.ts`
- Template creation script uses `language: 'en_US'` in `temp/create-whatsapp-templates.js`

Impact:
- Template lookup can fail if approved language differs from send language code.
- Causes send failures even with approved templates.

Recommendation:
- Standardize language code across definitions and send path (prefer exact approved locale, often `en_US`).
- Make locale configurable per template if multilingual rollout is planned.

### 4) Template set drift across code paths
Severity: Medium

Evidence:
- Notification types include `ORDER_PACKED`, `PAYMENT_FAILED`, `RTO_INITIATED`, etc. (`src/lib/sms/types.ts`)
- `WHATSAPP_TEMPLATE_DEFINITIONS` covers only a subset in `src/lib/sms/whatsapp-templates.ts`
- `temp/create-whatsapp-templates.js` includes broader set and differs from diagnostics expectations.

Impact:
- Some notifications can fallback unexpectedly or fail if template not approved.
- Documentation/UI confidence can diverge from runtime capability.

Recommendation:
- Define a single source of truth for template catalog.
- Generate diagnostics requirements and template creation payloads from same source.

### 5) No WhatsApp webhook ingestion (status/read callbacks)
Severity: Medium

Evidence:
- No `src/app/api/...` route handling WhatsApp webhooks (`messages`/`statuses`) was found.

Impact:
- No delivered/read/failure status reconciliation from WhatsApp.
- Internal records can show SENT without downstream confirmation.

Recommendation:
- Add webhook verify + receive endpoint with signature verification.
- Persist provider delivery statuses into `sms_notifications` or a dedicated table.

### 6) Hardcoded admin test phone number
Severity: Medium

Evidence:
- Fixed test number is embedded in `src/components/admin/SendSMSButton.tsx`.

Impact:
- Accidental messaging to wrong recipient.
- Compliance/privacy risk and operational confusion.

Recommendation:
- Require explicit input at runtime or use env-configured allowlisted test recipients.
- Add confirmation prompt before send.

### 7) Incomplete resiliency for provider calls
Severity: Medium

Evidence:
- Provider fetch calls have no timeout/retry circuit (`src/lib/sms/providers/whatsapp-cloud.ts`).

Impact:
- Temporary network/API blips can become user-visible failures.

Recommendation:
- Add request timeout and bounded retries for retry-safe failures.
- Include correlation IDs in logs for tracing.

### 8) Secret handling: local file is ignored, but token hygiene required
Severity: Medium

Evidence:
- `.env.local` contains WhatsApp credentials.
- `.gitignore` excludes `.env*` and `.env*.local`.

Impact:
- Low repo-commit risk, but token exposure risk remains operationally.

Recommendation:
- Rotate WhatsApp token immediately if exposed externally.
- Move to secret manager in deployment platform and avoid long-lived tokens where possible.

## Positives

- Provider-agnostic SMS architecture is clean and extendable (`src/lib/sms/sms.ts`).
- Admin-only guards are present on test/send/diagnostics routes.
- Diagnostics endpoint already validates API connectivity and template availability.
- Shipment events are wired to notification sends (`src/app/api/shiprocket/webhook/route.ts`).

## Priority Action Plan (Today)

### P0 (Do immediately)
1. Fix template name mismatch in diagnostics (`cancelled` -> `order_cancelled`).
2. Standardize Graph API version across all WhatsApp call sites.
3. Standardize locale code to the exact approved template locale (`en_US` if that is approved).
4. Remove hardcoded test phone and replace with safe admin input/allowlist.

### P1 (Next)
1. Unify template catalog (single source of truth).
2. Add validation test that every `NotificationType` has a mapped and expected template.
3. Add timeout/retry wrapper for Meta API calls.

### P2 (Short-term roadmap)
1. Add WhatsApp webhook endpoint for status callbacks.
2. Persist delivery/read statuses and surface in admin logs.
3. Add alerting for template/language mismatch and token expiry.

## Suggested Verification Checklist After Fixes

- Diagnostics shows `health_status: OK`.
- Required templates list exactly matches mapped template names.
- Admin test endpoint and production send route use same API version and locale.
- Send tests pass for: `ORDER_CREATED`, `SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`.
- At least one webhook callback (if implemented) updates delivery status.

## Audit Verdict

Proceed with WhatsApp update only after P0 items are completed. Current setup is close, but mismatches in template diagnostics, API versioning, and language config create avoidable rollout risk.
