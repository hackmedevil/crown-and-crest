# Quick Start - AI Features Setup

Follow these exact steps to get AI features working:

## Step 1: Install Dependencies

```bash
cd "c:\Users\user\Desktop\Web App\crown-and-crest"
npm install crypto-js react-image-crop
```

## Step 2: Set Environment Variable

Add to `.env.local`:

```env
AI_ENCRYPTION_KEY=K7mP2nQ9rS4tU6vW8xY0zA1bC3dE5fG7
```

**Generate your own** (PowerShell):

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

## Step 3: Apply Database Migration

### Option A: Supabase CLI

```bash
npx supabase db push
```

### Option B: Manual (Supabase Dashboard)

1. Go to your Supabase Dashboard
2. Click "SQL Editor"
3. Copy everything from `supabase/migrations/20251220060000_ai_settings.sql`
4. Paste and click "Run"

## Step 4: Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## Step 5: Configure AI Provider

1. Go to: `http://localhost:3000/admin/settings/ai`
2. Click "+ Add New Key"
3. Select provider (OpenRouter recommended)
4. Paste your API key
5. Click "Save API Key"
6. Click "Activate" on your saved key

## Step 6: Test It

1. Go to product editor
2. You'll see AI buttons near description/SEO fields
3. Click any AI button to generate content!

---

**Full Guide**: See `.docs/AI_SETUP_GUIDE.md` for complete documentation.

**Troubleshooting**: If you see "No active AI provider" error, make sure you activated a key in Step 5.
