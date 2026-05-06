# WhatsApp Template Creation - Updated with Official API Format

Based on official WhatsApp Cloud API documentation, here's the exact format to use when creating templates.

## 📋 Quick Method Comparison

| Method | Time | Difficulty | Requirements |
|--------|------|------------|--------------|
| **Manual (Meta Business Manager)** | 20 mins | Easy | Just browser |
| **Automated Script** | 2 mins | Medium | Node.js + dotenv |

---

## 🎯 Method 1: Automated (Recommended if you have Node.js)

### Step 1: Install dependency
```bash
npm install dotenv
```

### Step 2: Run script
```bash
node create-whatsapp-templates.js
```

The script will:
- ✅ Create all 9 templates automatically
- ✅ Use proper API format (UTILITY category, en_US language)
- ✅ Include example values
- ✅ Show success/failure for each template

---

## 📝 Method 2: Manual Creation

If you prefer to create templates manually or the script fails:

### Go to Meta Business Manager
https://business.facebook.com/latest/whatsapp_manager/message_templates

### For Each Template:

**1. Template: order_created**
```
Name: order_created
Category: Utility
Language: English (US)

Body:
Hi {{1}}, thank you for your order! 🎉

Order ID: {{2}}
Amount: ₹{{3}}

We'll keep you updated via WhatsApp.

- Crown & Crest

Examples:
{{1}}: Rajesh
{{2}}: ORD12345
{{3}}: 999
```

**2. Template: payment_confirmed**
```
Name: payment_confirmed
Category: Utility
Language: English (US)

Body:
Payment confirmed! ✅

Your payment for order #{{1}} (₹{{2}}) has been received.

Your order is now being processed.

- Crown & Crest

Examples:
{{1}}: ORD12345
{{2}}: 999
```

**3. Template: cod_confirmed**
```
Name: cod_confirmed
Category: Utility
Language: English (US)

Body:
Order confirmed! 📦

Your COD order #{{1}} for ₹{{2}} has been confirmed.

We'll update you when it ships!

- Crown & Crest

Examples:
{{1}}: ORD12345
{{2}}: 999
```

**4. Template: order_packed**
```
Name: order_packed
Category: Utility
Language: English (US)

Body:
Your order is packed! 📦

Order #{{1}} has been packed and is ready to ship.

You'll receive tracking details soon.

- Crown & Crest

Examples:
{{1}}: ORD12345
```

**5. Template: order_shipped**
```
Name: order_shipped
Category: Utility
Language: English (US)

Body:
Your order is on the way! 📦

Order: #{{1}}
Courier: {{2}}
Tracking: {{3}}

Track: {{4}}

- Crown & Crest

Examples:
{{1}}: ORD12345
{{2}}: Blue Dart
{{3}}: BD123456
{{4}}: https://track.example.com
```

**6. Template: out_for_delivery**
```
Name: out_for_delivery
Category: Utility
Language: English (US)

Body:
Your order is out for delivery! 🚚

Order: #{{1}}
Courier: {{2}}

You should receive it today!

- Crown & Crest

Examples:
{{1}}: ORD12345
{{2}}: Blue Dart
```

**7. Template: order_delivered**
```
Name: order_delivered
Category: Utility
Language: English (US)

Body:
Your order has been delivered! 🎉

Order: #{{1}}

Thank you for shopping with Crown & Crest. We'd love your feedback!

Examples:
{{1}}: ORD12345
```

**8. Template: order_cancelled**
```
Name: order_cancelled
Category: Utility
Language: English (US)

Body:
Order cancelled 🔴

Your order #{{1}} has been cancelled.

If you didn't request this, please contact us immediately.

- Crown & Crest

Examples:
{{1}}: ORD12345
```

**9. Template: rto_initiated**
```
Name: rto_initiated
Category: Utility
Language: English (US)

Body:
Delivery unsuccessful 📭

Order #{{1}} couldn't be delivered and is being returned.

Please contact us to arrange reshipment.

- Crown & Crest

Examples:
{{1}}: ORD12345
```

---

## ⏰ After Submission

1. **Wait for approval** (1-2 hours, sometimes instant)
2. **Check email** for approval notifications
3. **Verify status:** Run `node check-template-status.js`
4. **Or check manually:** https://business.facebook.com/latest/whatsapp_manager/message_templates

---

## ✅ Verification

Once all templates show "APPROVED" status, you're ready to test!

```bash
# Restart your app
npm run dev

# Test from admin panel
# Go to any order → Send SMS Notification → Check WhatsApp!
```

---

## 💡 Important Notes

- **Template names MUST match exactly** (lowercase, underscores)
- **Category MUST be "Utility"** for transactional messages
- **Language MUST be "English (US)"** (en_US)
- **Variables use {{1}}, {{2}}** format (positional parameters)
- **Examples are required** for all variables

---

**Estimated Time:**
- Automated: 2 minutes
- Manual: 20-30 minutes
- Approval: 1-2 hours
