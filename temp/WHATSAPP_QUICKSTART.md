## ✅ WhatsApp Cloud API - Quick Start Checklist

### 🔐 Step 1: Credentials Configured ✅
Your WhatsApp Cloud API credentials have been securely added to `.env.local`:
- ✅ Access Token
- ✅ Phone Number ID  
- ✅ Business Account ID
- ✅ Provider set to `whatsapp-cloud`

### 📝 Step 2: Create Message Templates (REQUIRED)

Before sending WhatsApp messages, you MUST create and get approval for message templates in Meta Business Manager.

**Go to:** https://business.facebook.com/latest/whatsapp_manager/message_templates

**Create these templates:**

#### Template 1: order_created
```
Category: UTILITY
Language: English

Body:
Hi {{1}}, thank you for your order! 🎉

Order ID: {{2}}
Amount: ₹{{3}}

We'll keep you updated via WhatsApp.

- Crown & Crest
```

#### Template 2: order_shipped  
```
Category: UTILITY
Language: English

Body:
Your order is on the way! 📦

Order: #{{1}}
Courier: {{2}}
Tracking: {{3}}

Track your order: {{4}}

- Crown & Crest
```

#### Template 3: order_delivered
```
Category: UTILITY
Language: English

Body:
Your order has been delivered! 🎉

Order: #{{1}}

Thank you for shopping with Crown & Crest. We'd love your feedback!
```

#### Template 4: out_for_delivery
```
Category: UTILITY
Language: English

Body:
Your order is out for delivery! 🚚

Order: #{{1}}
Courier: {{2}}

You should receive it today!

- Crown & Crest
```

#### Template 5: payment_confirmed
```
Category: UTILITY
Language: English

Body:
Payment confirmed! ✅

Your payment for order #{{1}} (₹{{2}}) has been received.

Your order is now being processed.

- Crown & Crest
```

### ⏱️ Step 3: Wait for Approval (1-2 hours)

Meta reviews templates. You'll get an email when approved.

### 🧪 Step 4: Test (Once Templates Approved)

1. Add your phone number as a test recipient in Meta dashboard
2. Restart your app:
   ```bash
   npm run dev
   ```
3. Go to an order in admin panel
4. Click "Send SMS Notification"
5. Select notification type
6. Check your WhatsApp! 📱

### 📊 Monitoring

Check WhatsApp message logs:
- **Meta Business Manager:** https://business.facebook.com/latest/whatsapp_manager/phone_numbers
- **Insights:** View delivery rates, read rates, etc.

### 🚨 Troubleshooting

**"Template not found" error:**
- Templates not yet approved by Meta
- Wait for approval email

**"Access token expired":**
- Generate new permanent token
- Update WHATSAPP_ACCESS_TOKEN in .env.local

**Message not delivered:**
- Recipient hasn't opted in
- Check phone number format (must include country code)
- Check rate limits (1000/day initially)

---

## 🎯 What Happens Now

Once templates are approved:

1. **Payment Completed** → Customer gets WhatsApp message ✅
2. **Order Shipped** → Customer gets shipping update ✅  
3. **Out for Delivery** → Customer gets delivery alert ✅
4. **Delivered** → Customer gets delivery confirmation ✅

All automatic via webhooks! 🎉

---

**Next Steps:**
1. Create 5 templates above in Meta Business Manager
2. Wait for approval (~1-2 hours)
3. Test with a real order
4. Monitor delivery rates in Meta dashboard

Full documentation: `WHATSAPP_SETUP.md`
