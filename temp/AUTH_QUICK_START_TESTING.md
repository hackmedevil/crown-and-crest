# Auth Implementation - Quick Start Testing

## 🚀 Ready to Test? Follow These Steps

### Prerequisites for Full Testing

**Basic Testing (no setup needed):**
- ✅ Phone OTP, Email/Password, Magic Link, Google OAuth

**For Apple OAuth Testing (requires configuration):**
- ✅ [See APPLE_OAUTH_SETUP.md](APPLE_OAUTH_SETUP.md) - must configure Service ID, Team ID, and Private Key in Firebase Console
- ✅ Real Apple device for iOS/iPadOS testing (simulator won't work)
- ✅ Apple ID with 2FA enabled
- ✅ Device signed into iCloud

### Step 1: Verify Build (2 minutes)
```powershell
npm run build
```
**Expected:** All routes compile successfully, no TypeScript errors

### Step 2: Environment Setup (3 minutes)
Your `.env.local` should have:
```env
# Firebase (from Firebase Console)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx  
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Firebase Admin (server-side, keep secret)
FIREBASE_ADMIN_SDK_KEY=xxx

# Session (generate: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
SESSION_SECRET=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Step 3: Start Dev Server
```powershell
npm run dev
```
**Expected:** Server starts on `http://localhost:3000`

### Step 4: Navigate to Auth
Open your browser → `http://localhost:3000/auth`

**You should see:**
- Page title: "Crown & Crest - Sign In"
- 5 buttons: Phone, Email & Password, Magic Link, Google, Apple
- "Don't have an account? [Sign up]" link at bottom
- Modern minimal design with good spacing

---

## ✅ Critical Tests to Run First (15 minutes)

### Test A: Phone OTP (Most Important - Tests reCAPTCHA Fix)
1. Click "📱 Phone Number"
2. Enter your phone number (10 digits)
3. Click "Send OTP"
4. **IMPORTANT**: Watch for "Initializing security verification…" loading skeleton (2-3 seconds)
5. Receive SMS with OTP
6. Enter OTP in the input
7. Click "Verify Code"
8. ✅ Should log in successfully

**What we're verifying:**
- reCAPTCHA loads without making UI feel "hung"
- No page refresh required
- Proper error handling if OTP wrong

### Test B: Back Navigation Without Page Refresh
1. In OTP screen, click "← Change Phone Number"
2. Enter a **different** phone number
3. Click "Send OTP" again
4. ✅ Should **NOT** require page refresh
5. Should receive SMS on new number
6. ✅ Success = reCAPTCHA bug is fixed!

### Test C: Email & Password - Signup
1. Go back to method selector (← Back)
2. Click "✉️ Email & Password"
3. Click "Create new account"
4. Enter email + password
5. Watch password requirements:
   - 8+ characters ☐ → ✓ when typed
   - Contains number ☐ → ✓ when added
   - Special character ☐ → ✓ when added
6. ✅ Should create account

### Test D: Google OAuth
1. Go back to method selector
2. Click "🔍 Google"
3. Wait for "Connecting to Google..." loading state
4. Google sign-in popup appears (may open in new window)
5. Select your Google account
6. ✅ Should auto-sign in and redirect

**What to watch for:**
- No blank screen while popup initializes (should see spinner)
- If popup blocked → Shows error message

---

## 🔥 If Something Goes Wrong

### Error: "Firebase configuration is missing"
```
✅ FIX: Copy env vars to .env.local, restart dev server
npm run dev
```

### Error: Blank page / No auth screen appears
```
✅ FIX: 
1. Check browser console (F12 → Console)
2. Check for red error messages
3. Restart dev server
```

### Error: reCAPTCHA spinner appears forever
```
✅ FIX:
1. Check Firebase Console → reCAPTCHA section
2. Verify Firebase project ID matches NEXT_PUBLIC_FIREBASE_PROJECT_ID
3. Wait 60 seconds (reCAPTCHA service initializing)
```

### Error: OTP doesn't arrive
```
✅ FIX:
1. Verify Firebase has SMS sending enabled
2. Check test phone is in Firebase Console (phone auth)
3. Try again in 60 seconds (rate limit)
```

### Error: Google/Apple doesn't work
```
✅ FIX:
1. Check popup blocker isn't blocking (reload, try again)
2. Verify OAuth app IDs in Firebase Console
3. Check browser allows third-party popups for google.com
```

---

## 📊 Test Coverage Map

| Flow | Status | Priority | Time |
|------|--------|----------|------|
| Phone OTP | ✅ Ready | 🔴 HIGH | 5 min |
| Email Login | ✅ Ready | 🔴 HIGH | 3 min |
| Email Signup | ✅ Ready | 🔴 HIGH | 3 min |
| Password Reset | ✅ Ready | 🟡 MEDIUM | 5 min |
| Magic Link | ✅ Ready | 🟡 MEDIUM | 5 min |
| Google OAuth | ✅ Ready | 🔴 HIGH | 3 min |
| Apple OAuth | ✅ Ready | 🟡 MEDIUM | 3 min |
| Accessibility | ✅ Ready | 🟡 MEDIUM | 10 min |
| Mobile (375px) | ✅ Ready | 🟡 MEDIUM | 5 min |

---

## 🎯 Success Criteria

You'll know implementation is complete when:

✅ **reCAPTCHA Bug Fixed**
- [ ] User can change phone number without page refresh
- [ ] Loading skeleton appears while reCAPTCHA initializes
- [ ] No "tried to verify with old verifier" errors

✅ **Multi-Method Auth Works**
- [ ] All 5 methods appear on method selector
- [ ] Each method routes to correct flow
- [ ] Back buttons work everywhere

✅ **Phone OTP Complete**
- [ ] Phone validation works
- [ ] reCAPTCHA loads properly
- [ ] OTP entry works (6-digit input)
- [ ] Resend button appears after 45 seconds

✅ **Email & Password Complete**
- [ ] Email login works
- [ ] Email signup with password strength requirements works
- [ ] Password reset works (email sent, link works)
- [ ] Forgot password? link works

✅ **Passwordless Email Complete**
- [ ] Magic link tab available
- [ ] Magic link email sent
- [ ] Clicking link auto-signs in

✅ **Social OAuth Complete**
- [ ] Google button shows loading state, popup appears, sign-in works
- [ ] Apple button shows loading state, popup appears, sign-in works
- [ ] Proper error handling if popup blocked

✅ **Session Created**
- [ ] After login, session cookie exists (HttpOnly, Secure)
- [ ] User can reload page and stays logged in
- [ ] New user created in Supabase with correct fields

✅ **Accessibility**
- [ ] Can use Tab key to navigate all buttons
- [ ] Can use Enter to click buttons
- [ ] Focus rings visible (3px outline)
- [ ] Screen reader announces buttons and error messages

---

## 📱 Quick Mobile Test

### On iPhone (or DevTools mobile simulation):
1. Rotate to portrait (375px width)
2. Go to `/auth`
3. Check:
   - [ ] Buttons full width, properly spaced
   - [ ] Text readable (16px+, not tiny)
   - [ ] Input fields tappable (56px height)
   - [ ] No horizontal scroll
   - [ ] Landscape orientation works without breaking

---

## 🎬 Full Test Sequence (30 minutes)

If you want to test everything:

1. **Phone OTP** (5 min)
   - Enter phone → Get OTP → Verify
   - Change phone, verify no refresh needed

2. **Email Signup** (5 min)
   - Test password strength requirements
   - Verify account created

3. **Email Login** (3 min)
   - Log in with created account
   - Test "Forgot password?" flow

4. **Password Reset** (5 min)
   - Receive reset email
   - Open link, set new password
   - Log in with new password

5. **Magic Link** (5 min)
   - Enter different email
   - Test magic link sign-in

6. **Google OAuth** (3 min)
   - Test popup opening
   - Test sign-in flow

7. **Apple OAuth** (3 min)
   - Same as Google

8. **Session** (2 min)
   - Reload page, verify logged in
   - Check session cookie exists

---

## 📞 Next Actions After Testing

Once tests pass:
1. ✅ Share feedback on UX/design
2. ✅ Report any bugs found
3. ✅ Request any feature additions
4. ✅ Discuss mobile polish/improvements
5. ✅ Plan deployment to staging/production

---

## 💾 Files Ready for Testing

All files are built and ready:
- ✅ `/app/(auth)/page.tsx` - Main auth page
- ✅ `/app/(auth)/(steps)/` - All step components
- ✅ `/lib/firebase/client.ts` - Firebase config with OAuth
- ✅ `/api/auth/session/route.ts` - Session creation API
- ✅ `/app/globals.css` - Animations

**No further code changes needed.** Everything's compiled and running.

Start testing! 🚀
