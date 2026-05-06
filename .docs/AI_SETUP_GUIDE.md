# AI-Powered Product Editor - Setup Guide

This guide provides **exact commands and steps** to set up and use the new AI-powered product editor.

## 📋 Prerequisites Checklist

- [ ] Node.js and npm installed
- [ ] Supabase project set up
- [ ] Development server running
- [ ] Admin access to the application
- [ ] AI provider API key (OpenRouter, OpenAI, etc.)

---

## Step 1: Install Required Dependencies

Run this command in your project root:

```bash
cd "c:\Users\user\Desktop\Web App\crown-and-crest"
npm install crypto-js react-image-crop
```

**What this does**: Installs encryption library for API keys and image cropping component.

---

## Step 2: Set Up Environment Variables

**Location**: `c:\Users\user\Desktop\Web App\crown-and-crest\.env.local`

Add this line to your `.env.local` file:

```env
AI_ENCRYPTION_KEY=your-32-character-minimum-encryption-key-here-change-this
```

**How to generate a secure key** (run in PowerShell):

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy the output and replace `your-32-character-minimum-encryption-key-here-change-this` with it.

**Example**:

```env
AI_ENCRYPTION_KEY=K7mP2nQ9rS4tU6vW8xY0zA1bC3dE5fG7
```

---

## Step 3: Run Database Migration

**Apply the AI settings migration:**

```bash
# If using Supabase CLI
npx supabase db push

# OR manually apply the migration
# Go to your Supabase Dashboard → SQL Editor
# Copy and paste the contents of:
# supabase/migrations/20251220060000_ai_settings.sql
# Then click "Run"
```

**What this creates**:

- `ai_providers` table (stores provider info)
- `ai_api_keys` table (encrypted keys)
- `ai_presets` table (model configurations)
- Default providers (OpenRouter, OpenAI, Anthropic, Google, Cohere)

---

## Step 4: Restart Development Server

Stop your current server (Ctrl+C) and restart:

```bash
npm run dev
```

**Wait for**: "Ready in XXXms" message

---

## Step 5: Configure AI Provider

### 5.1: Navigate to AI Settings

Open your browser and go to:

```
http://localhost:3000/admin/settings/ai
```

### 5.2: Add Your API Key

1. Click **"+ Add New Key"** button
2. Select your provider from dropdown (e.g., "OpenRouter")
3. Paste your API key
4. (Optional) Add a label like "Production Key"
5. Click **"Save API Key"**

### 5.3: Activate the Provider

1. Find your saved key in the list
2. Click **"Activate"** button
3. You should see a green "Active Provider" banner at the top

### 5.4: Test Connection

1. Click **"Test"** button next to your API key
2. You should see a success toast notification

---

## Step 6: Using AI Features in Product Editor

### Location of Product Editors

- **Create New Product**: `http://localhost:3000/admin/products/new`
- **Edit Product**: `http://localhost:3000/admin/products/[product-id]`

### AI Features Available

#### 1. Generate Product Description

**Where**: Product Description field
**How to use**:

1. Fill in Product Name and Category
2. Look for "✨ Generate with AI" button near description field
3. Click it
4. Select tone (Professional, Casual, Luxury, or Technical)
5. Click "Generate"
6. Review the AI-generated description
7. Click "Insert" to use it

#### 2. Generate SEO Meta Title

**Where**: SEO section → Meta Title field
**How to use**:

1. Enter product name
2. Click "Generate Title" button
3. AI generates optimized title (max 60 chars)
4. Click to insert

#### 3. Generate SEO Meta Description

**Where**: SEO section → Meta Description field
**How to use**:

1. Make sure description is filled
2. Click "Generate Description" button
3. AI generates 150-160 character meta description
4. Click to insert

#### 4. Get Keyword Suggestions

**Where**: SEO section → Keywords field
**How to use**:

1. Enter product name and category
2. Click "Suggest Keywords" button
3. AI provides 5-7 relevant keywords
4. Select which ones to add

#### 5. Generate Image Alt Text

**Where**: Image upload section
**How to use**:

1. Upload an image
2. Click "Generate Alt Text" button
3. AI creates descriptive alt text
4. Click to apply

#### 6. Check SEO Score

**Where**: Right sidebar (when editing product)
**What it shows**:

- Overall score (0-100)
- Individual scores for title, description, slug, content
- Actionable suggestions for improvement

**Score Guide**:

- 🟢 Green (80-100): Excellent SEO
- 🟡 Yellow (60-79): Good, room for improvement
- 🔴 Red (0-59): Needs work

---

## Step 7: Managing Multiple AI Providers

### Saving Multiple Keys

You can save API keys for multiple providers without losing any:

1. Add OpenRouter key → Save
2. Add OpenAI key → Save
3. Add Anthropic key → Save
4. All keys remain saved!

### Switching Providers

1. Go to `/admin/settings/ai`
2. Find the provider you want to use
3. Click **"Activate"** on that key
4. Previous provider becomes inactive but key is NOT deleted
5. Switch back anytime by activating the other key

### Deleting Keys (Manual Only)

Keys are NEVER automatically deleted. To remove:

1. Find the key in the list
2. Click **"Delete"** button
3. Confirm deletion
4. Key is permanently removed

---

## Step 8: Troubleshooting

### "No active AI provider configured"

**Problem**: AI features show this error
**Solution**:

1. Go to `/admin/settings/ai`
2. Make sure you have a key saved
3. Click "Activate" on one of your saved keys
4. Refresh the product editor page

### "Encryption key must be at least 32 characters"

**Problem**: API keys won't save
**Solution**:

1. Check your `.env.local` file
2. Make sure `AI_ENCRYPTION_KEY` is set
3. Make sure it's at least 32 characters long
4. Restart your dev server after changing `.env.local`

### "Failed to decrypt data"

**Problem**: Can't read saved API keys
**Solution**:

1. Your encryption key might have changed
2. Delete all saved API keys from AI settings
3. Re-add them with the new encryption key

### AI Generation Takes Too Long

**Problem**: Waiting more than 10 seconds
**Solution**:

1. Check your internet connection
2. Verify your API key has credits (check provider dashboard)
3. Try a different provider
4. Check browser console for errors (F12)

### "Connection test failed"

**Problem**: Test button shows error
**Solution**:

1. Verify your API key is correct
2. Check the provider is spelled correctly
3. Make sure your API key has proper permissions
4. Check if you have credits/quota remaining

---

## Step 9: Best Practices

### API Key Security

✅ **DO**:

- Keep `AI_ENCRYPTION_KEY` in `.env.local` (never commit to git)
- Use different keys for development and production
- Rotate API keys periodically
- Monitor usage in provider dashboard

❌ **DON'T**:

- Share API keys or encryption key
- Commit `.env.local` to version control
- Use production keys in development

### AI Content Usage

✅ **DO**:

- Review AI-generated content before publishing
- Edit and personalize AI suggestions
- Use AI as a starting point, not final copy
- Check for accuracy and brand voice

❌ **DON'T**:

- Blindly accept all AI suggestions
- Use AI content without review
- Rely solely on AI for critical product info

### SEO Optimization

✅ **DO**:

- Aim for SEO score above 80
- Use suggested keywords naturally
- Write unique meta descriptions
- Keep titles under 60 characters
- Keep descriptions under 160 characters

❌ **DON'T**:

- Keyword stuff
- Copy competitor meta tags
- Use generic descriptions
- Exceed character limits

---

## Step 10: Monitoring and Costs

### Check API Usage

**OpenRouter**: https://openrouter.ai/activity
**OpenAI**: https://platform.openai.com/usage
**Anthropic**: https://console.anthropic.com/settings/billing

### Estimated Costs (per operation)

- Product description: ~$0.001-0.01
- Meta title/description: ~$0.0005-0.005
- Keywords: ~$0.0005-0.005
- Alt text: ~$0.0005-0.005

**Note**: Costs vary by provider and model. Always check provider pricing.

---

## Quick Reference Commands

```bash
# Install dependencies
npm install crypto-js react-image-crop

# Generate encryption key (PowerShell)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Restart dev server
npm run dev

# Apply migrations (if using Supabase CLI)
npx supabase db push
```

---

## File Locations Reference

| What                  | Where                                                |
| --------------------- | ---------------------------------------------------- |
| AI Settings Page      | `/admin/settings/ai`                                 |
| Product Editor        | `/admin/products/[id]` or `/admin/products/new`      |
| Environment Variables | `.env.local` (root folder)                           |
| Database Migration    | `supabase/migrations/20251220060000_ai_settings.sql` |
| Encryption Utils      | `src/lib/utils/encryption.ts`                        |
| AI Actions            | `src/lib/ai/actions.ts`                              |
| AI Settings Actions   | `src/lib/ai/settings/actions.ts`                     |

---

## Support

If you encounter issues not covered here:

1. Check browser console (F12) for errors
2. Check terminal for server errors
3. Verify all environment variables are set
4. Confirm database migration applied successfully
5. Test API key in provider's dashboard directly

---

**Last Updated**: 2025-12-20  
**Version**: 1.0
