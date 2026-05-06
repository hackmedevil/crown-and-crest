# WhatsApp Cloud API Setup Guide

Complete step-by-step guide to configure **Meta WhatsApp Cloud API** for order notifications.

## ✅ Why WhatsApp Cloud API?

- **FREE**: 1000 conversations/month
- **No DLT Required**: For transactional messages
- **98% Open Rate**: vs 20% for SMS
- **Rich Media**: Images, buttons, receipts
- **Two-way**: Customers can reply

---

## 📋 Step 1: Create Meta Business Account

1. Go to: https://business.facebook.com/
2. Click "Create Account"
3. Fill in details:
   - Business name: **Crown & Crest**
   - Your name
   - Business email
4. Click "Submit"
5. Verify email

---

## 📱 Step 2: Create WhatsApp Business App

1. Go to: https://developers.facebook.com/apps/
2. Click "Create App"
3. Select app type: **Business**
4. App details:
   - App name: **Crown & Crest Notifications**
   - App contact email: your_email@example.com
   - Business account: Select your business
5. Click "Create App"

---

## 🔧 Step 3: Add WhatsApp Product

1. In your app dashboard, find "Add Products"
2. Find **WhatsApp** → Click "Set Up"
3. Select or create WhatsApp Business Account
4. You'll see the WhatsApp setup page

---

## ☎️ Step 4: Get Test Phone Number

**Option A: Use Test Number (Immediate)**
1. In WhatsApp dashboard, you'll see a test number
2. It looks like: `+1 555-025-XXXX`
3. Click "Add Phone Number" 
4. Enter YOUR phone number (to receive test messages)
5. Send "join <code>" to the test number from WhatsApp
6. You can now receive WhatsApp messages!

**Option B: Register Business Number (Production)**
1. Click "Add Phone Number"
2. Select country: India (+91)
3. Enter your business WhatsApp number
4. Verify via SMS/call
5. **Note**: This number cannot be already on WhatsApp

---

## 🔑 Step 5: Get API Credentials

### 5a. Get Temporary Access Token (For Testing)
1. In WhatsApp dashboard, find "**API Setup**"
2. You'll see "**Temporary access token**"
3. Copy this token (valid for 24 hours)
4. This is your `WHATSAPP_ACCESS_TOKEN`

### 5b. Get Phone Number ID
1. In same section, find "**Phone number ID**"
2. Copy the number (looks like: `106xxxxxxxxxx`)
3. This is your `WHATSAPP_PHONE_NUMBER_ID`

### 5c. Generate Permanent Access Token
1. Go to **Settings** → **Basic**
2. Copy your **App ID**
3. Go to **App roles** → **Administrators**
4. Add yourself as admin
5. Go to: https://developers.facebook.com/tools/explorer/
6. Select your app
7. Click "Get Token" → "Get System User Token"
8. Grant permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
9. Generate token
10. Copy and save securely (永久 token)

---

## ⚙️ Step 6: Configure Your Application

Update `.env.local`:

```bash
# WhatsApp Cloud API Configuration
SMS_ENABLED=true
SMS_PROVIDER=whatsapp-cloud
SMS_DEFAULT_COUNTRY_CODE=+91

# WhatsApp Credentials
WHATSAPP_ACCESS_TOKEN=EAAJR... # Your permanent token
WHATSAPP_PHONE_NUMBER_ID=106xxxxxxxxxx
WHATSAPP_BUSINESS_ID=123xxxxxxxxxx # Optional, for template creation
```

---

## 📝 Step 7: Create Message Templates

### Why Templates?
WhatsApp requires pre-approved templates for business-initiated messages.

### How to Create:

1. **Via Meta Business Manager:**
   - Go to: https://business.facebook.com/latest/whatsapp_manager/message_templates
   - Click "Create Template"
   - Use templates from `WHATSAPP_TEMPLATE_DEFINITIONS`

2. **Template: Order Created**
   ```
   Name: order_created
   Category: UTILITY
   Language: English
   
   Body:
   Hi {{1}}, thank you for your order! 🎉
   
   Order ID: {{2}}
   Amount: ₹{{3}}
   
   We'll keep you updated via WhatsApp.
   
   - Crown & Crest
   ```

3. **Template: Order Shipped**
   ```
   Name: order_shipped
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

4. **Submit all templates for approval** (takes 1-2 days)

---

## 🧪 Step 8: Test Immediately (Sandbox)

While waiting for template approval, test with your test number:

```bash
# Restart your app
npm run dev

# Go to admin panel
# Try sending a WhatsApp notification
# Check your WhatsApp for the message!
```

---

## ✅ Step 9: Verify Setup

### Test Checklist:
- [ ] Meta Business account created
- [ ] WhatsApp app created  
- [ ] Test phone number added
- [ ] Access token copied
- [ ] Phone number ID copied
- [ ] `.env.local` updated
- [ ] App restarted
- [ ] Test message received ✅

---

## 🚀 Step 10: Go to Production

### Complete Business Verification:
1. Go to **Business Settings** → **Security Center**
2. Start business verification
3. Submit required documents:
   - Business registration
   - Address proof
   - Director/Owner ID
4. Wait for verification (2-5 business days)

### Template Approval:
1. Check template status in Meta Business Manager
2. Templates must be "APPROVED" before production use
3. Usually takes 1-2 hours to 2 days

### Launch:
1. Replace test number with business number
2. Ensure all templates approved
3. Monitor WhatsApp Manager for message insights
4. You're live! 🎉

---

## 🔒 Security Best Practices

### Never Commit Tokens:
```bash
# Add to .gitignore
.env.local
.env*.local
```

### Token Rotation:
- Rotate access tokens every 60 days
- Use system user tokens (never personal)

### Rate Limits:
- Free tier: 1000 conversations/month
- Paid: Unlimited (pay per conversation)
- Business phone: 1000 messages/day initially

---

## 💰 Cost Structure

| Tier | Free Messages | Cost After |
|------|---------------|------------|
| **Free** | 1000/month | ₹0.60/conversation |
| **Conversation** | First 1000 free | Then charged |

**Conversation**: 24-hour window after customer message

**Business-initiated**: Requires template, counts as conversation

---

## 📊 Template Variables Reference

Copy these when creating templates in Meta Business Manager:

```
ORDER_CREATED:
{{1}} = Customer Name
{{2}} = Order ID (8 chars)
{{3}} = Amount

PAYMENT_CONFIRMED:
{{1}} = Order ID
{{2}} = Amount

ORDER_SHIPPED:
{{1}} = Order ID
{{2}} = Courier Name
{{3}} = Tracking ID
{{4}} = Tracking URL

OUT_FOR_DELIVERY:
{{1}} = Order ID
{{2}} = Courier Name

ORDER_DELIVERED:
{{1}} = Order ID
```

---

## 🆘 Troubleshooting

### "Invalid access token"
- Token expired (regenerate permanent token)
- Wrong token copied (check spaces)

### "Phone number not verified"
- Complete business verification
- Verify business phone ownership

### "Template not found"
- Template not approved yet
- Template name mismatch (check spelling)

### "Message failed to send"
- Customer hasn't opted in
- Phone number incorrect
- Rate limit exceeded

---

## 📚 Additional Resources

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

---

## ✨ You're All Set!

Once setup is complete:
1. Orders automatically trigger WhatsApp messages
2. Customers receive rich notifications
3. Monitor in Meta Business Manager
4. Scale to unlimited messages

**Next**: Start sending WhatsApp notifications and enjoy 98% open rates! 🚀
