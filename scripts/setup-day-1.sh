#!/bin/bash

# Day 1 Foundations – Quick Setup Script
# Run this to validate the installation and provide next steps

set -e

echo "🚀 Crown & Crest – Day 1 Foundations Setup Checker"
echo "=================================================="
echo ""

# 1. Check TypeScript strict mode
echo "✓ Checking TypeScript configuration..."
if grep -q '"strict": true' tsconfig.json; then
  echo "  ✅ Strict mode enabled"
else
  echo "  ❌ Strict mode NOT enabled – run: git status"
  exit 1
fi

# 2. Check GA4 files
echo "✓ Checking GA4 files..."
FILES_GA4=(
  "src/lib/gtag.ts"
  "src/components/GA4Tracker.tsx"
)
for file in "${FILES_GA4[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    exit 1
  fi
done

# 3. Check Logger files
echo "✓ Checking Logger files..."
if [ -f "src/lib/logger.ts" ]; then
  echo "  ✅ src/lib/logger.ts"
else
  echo "  ❌ src/lib/logger.ts MISSING"
  exit 1
fi

# 4. Check Sentry config
echo "✓ Checking Sentry configuration..."
FILES_SENTRY=(
  "sentry.server.config.js"
  "sentry.client.config.js"
)
for file in "${FILES_SENTRY[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    exit 1
  fi
done

# 5. Check .env.example
echo "✓ Checking environment variable documentation..."
if [ -f ".env.example" ]; then
  echo "  ✅ .env.example"
else
  echo "  ❌ .env.example MISSING"
  exit 1
fi

# 6. Check implementation guide
echo "✓ Checking documentation..."
if [ -f "DAY_1_IMPLEMENTATION_GUIDE.md" ]; then
  echo "  ✅ DAY_1_IMPLEMENTATION_GUIDE.md"
else
  echo "  ❌ DAY_1_IMPLEMENTATION_GUIDE.md MISSING"
  exit 1
fi

echo ""
echo "=================================================="
echo "✅ ALL FILES PRESENT AND CONFIGURED"
echo "=================================================="
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1️⃣  Set up environment variables:"
echo "    cp .env.example .env.local"
echo "    # Edit .env.local and fill in your GA4 and Sentry DSNs"
echo ""
echo "2️⃣  Run TypeScript type-checker:"
echo "    npx tsc --noEmit"
echo "    # Fix any type errors (see DAY_1_IMPLEMENTATION_GUIDE.md for help)"
echo ""
echo "3️⃣  Install Sentry SDK (if not done):"
echo "    npm install @sentry/nextjs"
echo ""
echo "4️⃣  Start dev server:"
echo "    npm run dev"
echo ""
echo "5️⃣  Test GA4 (in browser):"
echo "    - Open the site"
echo "    - Go to GA4 Dashboard → Real-time"
echo "    - Navigate pages – events should appear"
echo ""
echo "6️⃣  Test Sentry (in browser console):"
echo "    throw new Error('🛑 Test Sentry error');"
echo "    # Then check Sentry Dashboard → Issues"
echo ""
echo "7️⃣  Commit and push:"
echo "    git add ."
echo "    git commit -m 'feat: Day 1 Foundations – TS strict mode, GA4, Sentry'"
echo "    git push origin feat/day-1-foundations"
echo ""
echo "📚 For detailed instructions, see: DAY_1_IMPLEMENTATION_GUIDE.md"
echo ""
