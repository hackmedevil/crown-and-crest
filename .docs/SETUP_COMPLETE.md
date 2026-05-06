# 🚀 AI Provider System - Complete Setup Guide

## ✅ What's Been Implemented

Your admin panel now has a **fully dynamic AI provider system** that automatically adapts to whichever provider you choose.

### Features

- ✅ 5 AI Providers (OpenRouter, OpenAI, Anthropic, Google Gemini, Cohere)
- ✅ Provider-specific authentication (each uses correct headers/endpoints)
- ✅ API Key Reveal/Mask functionality
- ✅ Model selection per provider
- ✅ Provider-specific configuration fields
- ✅ Encrypted API key storage
- ✅ Switch providers without losing keys
- ✅ Automatic code adaptation

---

## 📋 Setup Steps (MUST DO)

### Step 1: Add Encryption Key

**Open:** `c:\Users\user\Desktop\Web App\crown-and-crest\.env.local`

**Add this line:**

```env
AI_ENCRYPTION_KEY=YOUR_32_CHARACTER_KEY_HERE
```

**Generate a secure key (PowerShell):**

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy the output and replace `YOUR_32_CHARACTER_KEY_HERE`

---

### Step 2: Apply Database Migrations

**Go to Supabase Dashboard → SQL Editor**

**Run Migration 1:**
Copy and paste contents of:
`supabase/migrations/20251220060000_ai_settings.sql`

**Run Migration 2:**
Copy and paste contents of:
`supabase/migrations/20251220060001_provider_config.sql`

Click "Run" for each.

---

### Step 3: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

---

### Step 4: Access AI Settings

Navigate to: **Admin → Settings → AI Settings** (in sidebar)

Or directly: `http://localhost:3000/admin/settings/ai`

---

## 🎯 How to Use

### Adding Your First API Key

1. Click **"+ Add New Key"**
2. **Select Provider** (OpenRouter recommended for free tier)
3. **Enter API Key**
   - Click eye icon to show/hide
   - Get keys from provider's dashboard (links provided)
4. **Select Model** from dropdown
   - See pricing and context window
   - Free models available on OpenRouter
5. **Configure Provider Settings** (if any)
   - Anthropic: Select API version
   - OpenRouter: Add site URL (optional)
6. **Add Label** (optional) - e.g., "Production", "Test"
7. Click **"Save API Key"**

### Activating a Provider

1. Find your saved key in the list
2. Click **"Activate"** button
3. Green banner appears showing active provider
4. All AI features now use this provider

### Switching Providers

- Save keys for multiple providers
- Click "Activate" on any provider to switch
- **Keys are NEVER auto-deleted**
- Switch back anytime

### Revealing API Keys

- Click the eye icon next to any key
- Shows masked key by default: `sk-abc...xyz`
- Click again to hide

---

## 🌟 Provider Recommendations

### For Development/Testing

**Use:** OpenRouter (free models)

- Model: `meta-llama/llama-3.1-8b-instruct:free`
- Cost: **FREE**
- Good for: Testing, development

### For Production (Best Value)

**Use:** OpenAI GPT-3.5 or Anthropic Haiku

- GPT-3.5: $0.50/1M tokens
- Haiku: $0.25/1M tokens
- Good for: Production at scale

### For Best Quality

**Use:** OpenAI GPT-4 or Anthropic Claude 3.5 Sonnet

- GPT-4: $10/1M input tokens
- Claude 3.5: $3/1M input tokens
- Good for: High-quality content

---

## 📚 Getting API Keys

### OpenRouter (Recommended)

1. Go to: https://openrouter.ai/keys
2. Sign up/Login
3. Click "Create Key"
4. Copy key: `sk-or-v1-...`
5. **Free models available!**

### OpenAI

1. Go to: https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy key: `sk-proj-...`
4. **Requires billing setup**

### Anthropic

1. Go to: https://console.anthropic.com/settings/keys
2. Click "Create Key"
3. Copy key: `sk-ant-api03-...`
4. **Requires billing setup**

### Google Gemini

1. Go to: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy key: `AIzaSy...`
4. **Free tier: 60 RPM**

### Cohere

1. Go to: https://dashboard.cohere.com/api-keys
2. Click "Create API Key"
3. Copy key
4. **Trial: 1,000 calls/month free**

---

## 🔧 How It Works (Technical)

### Provider-Specific Adapters

Each provider has unique requirements:

**OpenRouter:**

```typescript
Headers:
- Authorization: Bearer sk-or-v1-...
- HTTP-Referer: your-site-url
- X-Title: your-app-name
Endpoint: /chat/completions
```

**OpenAI:**

```typescript
Headers:
- Authorization: Bearer sk-proj-...
Endpoint: /chat/completions
```

**Anthropic:**

```typescript
Headers:
- x-api-key: sk-ant-api03-...
- anthropic-version: 2023-06-01
Endpoint: /messages
```

**Google Gemini:**

```typescript
Auth: API key in URL parameter
Endpoint: /models/{model}:generateContent?key=...
```

**Cohere:**

```typescript
Headers:
- Authorization: Bearer ...
Endpoint: /generate
```

### Automatic Switching

When you activate a provider, the system:

1. Loads provider configuration
2. Uses correct authentication method
3. Formats requests properly
4. Parses responses correctly
5. All happens automatically!

---

## 🎨 Using AI Features

Once configured, AI features are available in:

### Product Editor

- **Generate Description**: AI writes product descriptions
- **Generate Meta Title**: SEO-optimized titles
- **Generate Meta Description**: 160-char descriptions
- **Suggest Keywords**: SEO keywords
- **Generate Alt Text**: Image alt text
- **SEO Score**: Real-time scoring

### How to Use

1. Go to product editor
2. Look for "✨ Generate with AI" buttons
3. Select tone (for descriptions)
4. Click generate
5. Review and insert

---

## 🐛 Troubleshooting

### "No active AI provider configured"

**Fix:** Go to AI Settings → Activate a saved key

### "Invalid API key format"

**Fix:** Check for typos, regenerate key from provider

### "API request failed: 401"

**Fix:** API key is invalid, get a new one

### "API request failed: 429"

**Fix:** Rate limit exceeded, wait or upgrade plan

### "Failed to decrypt data"

**Fix:**

1. Check `AI_ENCRYPTION_KEY` in `.env.local`
2. Make sure it's 32+ characters
3. Restart dev server

### Keys not saving

**Fix:**

1. Check database migrations applied
2. Verify `AI_ENCRYPTION_KEY` is set
3. Check browser console for errors

---

## 📊 Cost Estimation

### Typical E-commerce Product

**Operations per product:**

- Description: ~200 tokens = $0.0001 - $0.002
- Meta Title: ~20 tokens = $0.00001 - $0.0002
- Meta Description: ~50 tokens = $0.00003 - $0.0005
- Keywords: ~30 tokens = $0.00002 - $0.0003

**Total per product:** ~$0.0002 - $0.003

**100 products:** ~$0.02 - $0.30

**Using OpenRouter free models: $0.00**

---

## ✅ Verification Checklist

- [ ] Added `AI_ENCRYPTION_KEY` to `.env.local`
- [ ] Applied both database migrations
- [ ] Restarted dev server
- [ ] Can access `/admin/settings/ai`
- [ ] See "AI Settings" in admin sidebar
- [ ] Added at least one API key
- [ ] Activated a provider
- [ ] Tested connection (Test button)
- [ ] AI features work in product editor

---

## 🚀 Next Steps

1. **Complete setup steps above**
2. **Add your first API key** (OpenRouter recommended)
3. **Test AI features** in product editor
4. **Create products** with AI-generated content
5. **Monitor usage** in provider dashboard

---

## 📁 Files Created

### Core System

- `src/lib/ai/provider-config.ts` - Provider configurations
- `src/lib/ai/client.ts` - Provider-specific clients
- `src/lib/ai/actions.ts` - AI content generation
- `src/lib/ai/settings/actions.ts` - Settings management
- `src/lib/utils/encryption.ts` - API key encryption

### UI Components

- `src/components/admin/AddProviderKeyForm.tsx` - Add key form
- `src/components/admin/AIContentGenerator.tsx` - Content generator modal
- `src/components/admin/SEOScoreWidget.tsx` - SEO scoring
- `src/app/(admin)/admin/settings/ai/page.tsx` - Settings page
- `src/app/(admin)/admin/settings/ai/AISettingsClient.tsx` - Settings UI

### Database

- `supabase/migrations/20251220060000_ai_settings.sql`
- `supabase/migrations/20251220060001_provider_config.sql`

### Documentation

- `.docs/AI_SETUP_GUIDE.md` - Comprehensive setup
- `.docs/AI_PROVIDERS_GUIDE.md` - Provider details
- `.docs/QUICK_START_AI.md` - Quick reference

---

**System Status: 🟢 READY TO USE**

Complete the setup steps and you're good to go!
