# WhatsApp Templates - Meta Business Manager Submission Guide

## Overview
You have created the following WhatsApp templates for Crown & Crest. These templates must be submitted to Meta Business Manager for approval before they can be used in your production WhatsApp messaging.

## Templates Ready for Approval

### 1. **payment_confirmed** ✅ (Already Approved)
**Status**: Live in Production
**Message**: 
```
Payment confirmed! ✅

Your payment for order #{{1}} (₹{{2}}) has been received.

Your order is now being processed.

- Crown & Crest
```
**Parameters**: Order ID (1), Amount (2)

---

### 2. **order_shipped** ✅ (Already Approved)
**Status**: Live in Production
**Message**: 
```
Your order is on the way! 📦

Order: #{{1}}
Courier: {{2}}
Tracking: {{3}}

Track your order: {{4}}

- Crown & Crest
```
**Parameters**: Order ID (1), Courier (2), Tracking ID (3), Tracking URL (4)

---

### 3. **out_for_delivery** ✅ (Already Approved)
**Status**: Live in Production
**Message**: 
```
Your order is out for delivery! 🚚

Order: #{{1}}
Courier: {{2}}

You should receive it today!

- Crown & Crest
```
**Parameters**: Order ID (1), Courier (2)

---

### 4. **order_delivered** ✅ (Already Approved)
**Status**: Live in Production
**Message**: 
```
Your order has been delivered! 🎉

Order: #{{1}}

Thank you for shopping with Crown & Crest. We'd love your feedback!
```
**Parameters**: Order ID (1)

---

### 5. **order_in_production** 🆕 (Needs Approval)
**Status**: Ready for Submission
**Message**: 
```
Your order is being prepared! 👷

Order: #{{1}}

We're carefully crafting your items. You'll receive tracking details soon.

- Crown & Crest
```
**Parameters**: Order ID (1)

---

### 6. **sent_to_logistics** 🆕 (Needs Approval)
**Status**: Ready for Submission
**Message**: 
```
Your order is sent for fulfillment! 📬

Order: #{{1}}

You'll receive tracking details soon!

- Crown & Crest
```
**Parameters**: Order ID (1)

---

### 7. **refund_initiated** 🆕 (Needs Approval)
**Status**: Ready for Submission
**Message**: 
```
Refund initiated! ✨

Order: #{{1}}
Refund Amount: ₹{{2}}

The amount will be credited to your original payment method within 5-7 business days.

- Crown & Crest
```
**Parameters**: Order ID (1), Refund Amount (2)

---

### 8. **order_cancelled** 🆕 (Needs Approval)
**Status**: Ready for Submission
**Message**: 
```
Your order has been cancelled. ❌

Order: #{{1}}

If you have any questions, please contact our support team.

- Crown & Crest
```
**Parameters**: Order ID (1)

---

### 9. **order_created** (Optional - Not Active Yet)
**Status**: Available but not integrated
**Message**: 
```
Hi {{1}}, thank you for your order! 🎉

Order ID: {{2}}
Amount: ₹{{3}}

We'll keep you updated via WhatsApp.

- Crown & Crest
```
**Parameters**: Customer Name (1), Order ID (2), Amount (3)

---

## How to Submit Templates to Meta Business Manager

### Step-by-Step Instructions:

1. **Go to Meta Business Suite**
   - Visit: https://business.facebook.com
   - Log in with your account

2. **Navigate to WhatsApp Manager**
   - Go to: All Tools → WhatsApp Manager → Account Tools → Message Templates

3. **Create New Template**
   - Click "Create Template"
   - Select Language: **English (en_US)**
   - Select Category: **Utility**

4. **Fill Template Details**
   - **Template Name**: Use the template name from above (e.g., `order_in_production`)
   - **Message Body**: Paste the exact message text from above
   - **Note**: Use {{1}}, {{2}}, etc. for parameters (they should auto-detect)

5. **Submit for Approval**
   - Click "Submit"
   - Meta typically approves within 1-2 hours

6. **Integration**
   - Once approved, the template is automatically available in your API calls
   - Your code already uses these template names!

---

## Current Status

| Template | Status | Action |
|----------|--------|--------|
| payment_confirmed | ✅ Approved | Live - No action needed |
| order_shipped | ✅ Approved | Live - No action needed |
| out_for_delivery | ✅ Approved | Live - No action needed |
| order_delivered | ✅ Approved | Live - No action needed |
| **order_in_production** | ⏳ Pending | **SUBMIT NOW** |
| **sent_to_logistics** | ⏳ Pending | **SUBMIT NOW** |
| **refund_initiated** | ⏳ Pending | **SUBMIT NOW** |
| **order_cancelled** | ⏳ Pending | **SUBMIT NOW** |

---

## Testing

Once templates are approved, they will automatically trigger when you:
- Click "Mark Paid" → Sends `payment_confirmed`
- Click "Mark In Production" → Sends `order_in_production`
- Click "Send to Logistics" → Sends `sent_to_logistics`
- Click "Mark Shipped" → Sends `order_shipped` (with tracking)
- Click "Mark Out for Delivery" → Sends `out_for_delivery`
- Click "Mark Delivered" → Sends `order_delivered`
- Click "Cancel Order" → Sends `order_cancelled`
- Click "Refund Order" → Sends `refund_initiated`

---

## Notes

- ⏸️ Templates using unapproved names will fail to send
- ✅ Once approved, messages send automatically with no manual intervention
- 📱 Customers receive messages on their WhatsApp
- 🔄 A message is only sent once per order per status change (duplicate prevention active)
- 🚫 If a template name doesn't exist/isn't approved, the system skips sending with a logged reason

**All templates are configured and deployed. You just need to submit the 4 new templates to Meta Business Manager!**
