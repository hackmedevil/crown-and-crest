# SMS Notifications & Auto Status Sync - README

## Overview
This implementation adds SMS notifications for order updates and automatic order status synchronization from Razorpay and Shiprocket webhooks.

## Features
- ✅ SMS notifications for all order lifecycle events
- ✅ Automatic order status updates from webhooks
- ✅ Admin panel for manual SMS sending
- ✅ SMS history tracking and duplicate prevention
- ✅ Provider-agnostic design (MSG91 & Twilio supported)

## Quick Start

### 1. Environment Setup
Copy the example environment file:
```bash
cp .env.sms.example .env.local
```

Edit `.env.local` and add your SMS provider credentials.

### 2. Database Migration
Run the migration to create the SMS notifications table:
```bash
npx supabase migration up
```

### 3. Choose SMS Provider

**Option A: MSG91 (Recommended for India)**
- Lower cost (~₹0.15-0.25 per SMS)
- Requires template approval
- Best for Indian customers
- Sign up: https://msg91.com/

**Option B: Twilio (International)**
- Higher cost (~₹0.50-1.00 per SMS)
- No template approval needed
- Global support
- Sign up: https://www.twilio.com/

### 4. Configure Webhooks

**Razorpay:**
- Dashboard → Settings → Webhooks
- Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
- Select events: `payment.captured`, `order.paid`, `payment.failed`

**Shiprocket:**
- Dashboard → Settings → Webhooks
- Add webhook URL: `https://yourdomain.com/api/shiprocket/webhook`
- Select all shipment tracking events

## SMS Templates

The following notification types are supported:
- `ORDER_CREATED` - Order confirmation
- `PAYMENT_CONFIRMED` - Payment received
- `COD_CONFIRMED` - COD order confirmed
- `ORDER_PACKED` - Order packed and ready
- `SHIPPED` - Order shipped with tracking
- `OUT_FOR_DELIVERY` - Out for delivery today
- `DELIVERED` - Order delivered successfully
- `CANCELLED` - Order cancelled
- `PAYMENT_FAILED` - Payment failed
- `RTO_INITIATED` - Return to origin
- `CUSTOM` - Custom message

## Admin Panel Usage

### Manual SMS Sending
1. Navigate to `/admin/orders/[order-id]`
2. Scroll to "SMS Notifications" section
3. Click "Send SMS Notification"
4. Select notification type
5. Optionally provide custom message
6. Click "Send SMS"

### View SMS History
1. On the same screen, click "SMS History"
2. View all SMS sent for this order with status indicators
3. Green = Sent/Delivered
4. Red = Failed
5. Yellow = Pending

## Webhook Auto-Updates

### Razorpay Events
- `payment.captured` → Updates order to `PAID` + sends payment confirmation SMS
- `order.paid` (COD) → Updates to `COD_CONFIRMED` + sends COD confirmation SMS
- `payment.failed` → Updates to `FAILED` + sends payment failure SMS

### Shiprocket Events
- `PICKED_UP` / `IN_TRANSIT` → Updates to `SHIPPED` + sends shipping SMS
- `OUT_FOR_DELIVERY` → Updates to `OUT_FOR_DELIVERY` + sends delivery alert SMS
- `DELIVERED` → Updates to `DELIVERED` + sends delivery confirmation SMS
- `RTO_INITIATED` → Updates to `RTO_IN_PROGRESS` + sends RTO alert SMS

## Database Schema

### sms_notifications Table
Tracks all SMS sent with the following fields:
- `id` - Unique identifier
- `order_id` - Associated order
- `phone` - Customer phone number
- `notification_type` - Type of notification
- `message` - SMS content
- `status` - PENDING / SENT / FAILED / DELIVERED
- `provider_message_id` - Provider's tracking ID
- `error_message` - Error details if failed
- `created_at` / `updated_at` - Timestamps

**Duplicate Prevention:**
- Prevents same notification being sent twice within 1 hour
- Automatic via database trigger

## Cost Management

### Estimated Costs (India)
**MSG91:**
- Transactional SMS: ₹0.15 - 0.25 per SMS
- 1000 orders/month → ~₹500-800/month (avg 3 SMS per order)

**Twilio:**
- SMS to India: ₹0.50 - 1.00 per SMS
- 1000 orders/month → ~₹1500-3000/month

### Cost Optimization
- SMS only sent on key milestones
- Duplicate prevention (1-hour window)
- Failed SMS automatically logged (no retry spam)
- Can disable SMS any time via `SMS_ENABLED=false`

## Troubleshooting

### SMS Not Sending
1. Check `SMS_ENABLED=true` in `.env.local`
2. Verify credentials are correct
3. Check `sms_notifications` table for error messages
4. Test with Postman: `POST /api/sms/send`

### Webhooks Not Triggering
1. Verify webhook URLs in Razorpay/Shiprocket dashboard
2. Check webhook signature/secret is configured
3. Review server logs for webhook errors
4. Test with webhook testing tools

### Database Migration Issues
1. Ensure Supabase is running
2. Check migration file syntax
3. Review Supabase logs

## Provider-Specific Notes

### MSG91 Requirements
- KYC verification mandatory
- Sender ID registration (6-8 char alphanumeric)
- SMS template approval (takes 1-2 business days)
- DND compliance mandatory

### Twilio Requirements
- Phone number purchase required
- No template approval needed
- Higher costs for India
- Better for international customers

## File Structure

```
src/
├── lib/sms/
│   ├── types.ts              # SMS type definitions
│   ├── templates.ts           # SMS templates & utilities
│   ├── sms.ts                 # Main SMS service
│   └── providers/
│       ├── msg91.ts           # MSG91 integration
│       └── twilio.ts          # Twilio integration
├── app/api/sms/
│   └── send/route.ts          # SMS API endpoint
└── components/admin/
    └── SendSMSButton.tsx      # Admin SMS UI

supabase/migrations/
└── 20260210154438_create_sms_notifications.sql
```

## Support

For issues or questions:
1. Check `sms_notifications` table for error logs
2. Review webhook logs in API routes
3. Test SMS sending via admin panel first
4. Contact SMS provider support if delivery issues persist

## Future Enhancements

Potential additions:
- Bulk SMS sending from orders list
- SMS scheduling (send at specific time)
- SMS analytics dashboard
- Additional providers (Gupshup, AWS SNS)
- WhatsApp integration
- SMS templates customization UI
