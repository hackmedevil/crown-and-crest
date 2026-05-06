# Modern Login Experience - Testing Guide

## ✅ What's Been Implemented

### Phase 1: reCAPTCHA Fixes
- ✅ Fixed reCAPTCHA verifier cleanup prevents page refresh requirement on phone change
- ✅ Loading skeleton shows while reCAPTCHA initializes (no more "hung" UI)
- ✅ Proper error handling for reCAPTCHA timeouts

### Phase 2: Method Selector
- ✅ 5 auth methods available from first screen:
  - 📱 Phone OTP (SMS verification)
  - ✉️ Email & Password (Login/Signup/Password Reset)
  - ✨ Magic Link (Passwordless email auth)
  - 🔍 Google OAuth (One-click sign-in)
  - 🍎 Apple OAuth (One-click sign-in)

### Phase 3: Phone OTP Enhancement
- ✅ Phone number entry with validation
- ✅ OTP verification with 6-digit entry
- ✅ Resend OTP after 45-second countdown
- ✅ Back button to change phone number
- ✅ Error messages clear and actionable

### Phase 4: Email & Password
- ✅ **LoginStep**: Email + password login with show/hide toggle
- ✅ **SignupStep**: Account creation with password strength validation:
  - Minimum 8 characters
  - At least 1 number
  - At least 1 special character
  - Password confirmation match
- ✅ **PasswordResetStep**: Self-service password recovery
- ✅ **MagicLinkStep**: Passwordless email sign-in
- ✅ **EmailModeStep**: Choose between Login/Signup/Magic Link on first email selection

### Phase 5: Social Auth (Google & Apple)
- ✅ Google OAuth via Firebase
- ✅ Apple OAuth via Firebase  
- ✅ Loading state while popup appears
- ✅ Error handling for blocked popups
- ✅ Auto-creates Supabase user on first login
- ✅ Stores provider info for analytics

### Phase 6: Visual Polish
- ✅ Smooth fade-in animations (200ms ease-out)
- ✅ Spinner animations (1.5s continuous rotation)
- ✅ Button hover states and active scales
- ✅ Focus ring animations (2px offset ring)
- ✅ Error/success state animations
- ✅ Loading skeleton with spinner

### Phase 7: Accessibility
- ✅ Semantic HTML with proper form structure
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus visible states (3px outline)
- ✅ Screen reader friendly error messages
- ✅ aria-describedby linking error messages to inputs
- ✅ aria-live regions for dynamic updates
- ✅ aria-hidden on decorative icons

---

## 🧪 Testing Checklist

### **Environment Setup**
- [ ] Copy `.env.example` to `.env.local` 
- [ ] Fill in Firebase credentials
- [ ] Fill in Supabase credentials
- [ ] Set SESSION_SECRET to random 32-char string
- [ ] Run `npm run build` successfully
- [ ] No TypeScript errors

### **Test 1: Phone OTP Flow**
**Desktop (1920x1080):**
1. [ ] Load `/auth` → See method selector with 5 buttons
2. [ ] Click "Phone Number" → Go to phone entry screen
3. [ ] Enter invalid phone (< 10 digits) → See error "Must be 10 digits"
4. [ ] Enter valid phone (10 digits) → See success "✓ Valid number"
5. [ ] Click "Send OTP" → See "Initializing security verification…" skeleton loader (should appear for 2-3 seconds)
6. [ ] After loading, should receive SMS with OTP
7. [ ] Enter OTP (6 digits) → Should auto-enable "Verify Code" button
8. [ ] Click "Verify Code" → Should log in successfully
9. [ ] Verify redirects to original intent (or homepage)
10. [ ] Back button returns to method selector without page refresh

**Failure Scenarios:**
- [ ] Invalid OTP → Shows "Invalid OTP. Please try again or request a new code"
- [ ] Slow network (throttle to 3G) → Loading skeleton persists, no blank screen
- [ ] Change phone number mid-flow → Doesn't require page refresh

**Mobile (iPhone SE 375px):**
- [ ] Method buttons full width
- [ ] Phone input readable, not zoomed
- [ ] OTP input boxes stack properly
- [ ] "Resend Code" button appears after 45 seconds
- [ ] All text readable without scroll

### **Test 2: Email & Password - Login**
1. [ ] Click "Email & Password" method → See email mode selector
2. [ ] Click "Log in with password"
3. [ ] Enter email (valid format) → Success checkmark appears
4. [ ] Enter password (6+ chars) → Field enabled
5. [ ] Click "Log In" → Should authenticate or show error
6. [ ] "Forgot password?" link works → Goes to password reset flow

**Failure Scenarios:**
- [ ] Wrong email/password → Clear error message
- [ ] Network timeout → "Network error. Please check your connection"

### **Test 3: Email & Password - Signup**
1. [ ] Go to Email mode → Click "Create new account"
2. [ ] Enter email (valid) → checkmark
3. [ ] Enter password → See requirements checklist:
   - [ ] "○ 8+ characters" → "✓" when met
   - [ ] "○ Contains a number" → "✓" when met
   - [ ] "○ Contains special character" → "✓" when met
4. [ ] Enter confirm password (mismatch) → Error "Passwords don't match"
5. [ ] Match passwords → Success "✓ Passwords match"
6. [ ] Check terms checkbox → Enabled
7. [ ] Click "Create Account" → User created in Firebase + Supabase

**Verification:**
- [ ] User row appears in Supabase with `role: 'customer'`
- [ ] Firebase user has correct email

### **Test 4: Magic Link**
1. [ ] Go to Email mode → Click "Magic link"
2. [ ] Enter email → Shows checkmark
3. [ ] Click "Send Magic Link"
4. [ ] See "Magic link sent!" success state with envelope emoji
5. [ ] Check email inbox
6. [ ] Click magic link from email
7. [ ] Should auto-sign in and redirect

**Verification:**
- [ ] User created in Firebase + Supabase if first-time
- [ ] Session cookie created (check DevTools: Application → Cookies)

### **Test 5: Password Reset**
1. [ ] In login screen, click "Forgot password?"
2. [ ] Enter email → checkmark
3. [ ] Click "Send Reset Link" → Shows "Check your email" state
4. [ ] Check email inbox
5. [ ] Click reset link
6. [ ] Fire base page should open with password reset form
7. [ ] Enter new password → Password updated

**Verification:**
- [ ] Can now log in with new password

### **Test 6: Google OAuth**
**Desktop:**
1. [ ] Click "Google" button → Loading screen appears
2. [ ] Google sign-in popup opens in new tab/window
3. [ ] Select Google account → Popup closes
4. [ ] Should auto-redirect to homepage
5. [ ] Session cookie created

**Failure Scenarios:**
- [ ] Block popup → Shows error "Popup was blocked. Please allow popups"
- [ ] Close popup → Shows error "Sign-in cancelled. Please try again"

**Verification:**
- [ ] New user created in Supabase with `auth_provider: 'google'`
- [ ] Display name populated (if available)
- [ ] Email populated

**Mobile:**
- [ ] Same flow but popup might open in same tab
- [ ] Back button returns from Google sign-in dialog

### **Test 7: Apple OAuth**

**Prerequisites:**
- [ ] Apple Developer Program membership active
- [ ] Firebase Apple provider configured with:
  - [ ] Service ID from Apple Developer Console
  - [ ] Team ID from Apple Membership page
  - [ ] Private Key ID from Apple Keys
  - [ ] Private Key (`.p8` file contents) in Firebase Console
- [ ] See [APPLE_OAUTH_SETUP.md](APPLE_OAUTH_SETUP.md) for detailed setup

**Testing on macOS:**
1. [ ] Click "🍎 Apple" button → See loading spinner ("Connecting to Apple...")
2. [ ] Apple sign-in dialog appears
3. [ ] Enter Apple ID (or select from saved)
4. [ ] When prompted:
   - [ ] "Allow 'Crown & Crest' to access your email address?" → Click **Continue**
   - [ ] "Allow 'Crown & Crest' to access your name?" → Click **Continue**
5. [ ] Dialog closes, redirected to homepage
6. [ ] Session cookie created (DevTools → Cookies → `session`)
7. [ ] User appears in Supabase with `auth_provider: 'apple'`

**Testing on iOS/iPadOS (Real Device Required):**
1. Open on real iPhone/iPad (not simulator)
2. Go to `/auth`
3. Click "🍎 Apple" button
4. Native iOS sign-in sheet appears from bottom
5. Sign in with Face ID, Touch ID, or password
6. Allow email/name sharing as prompted
7. Should redirect back to your app signed in
8. Verify session cookie created

**Testing Private Email (Optional):**
1. In Apple Settings, enable "Sign In with Apple" → "Hide My Email"
2. Complete Apple sign-in
3. Email should be `xxx@privaterelay.appleid.com`
4. You should receive emails at real address if private relay configured

**Failure Scenarios:**
- [ ] **"Invalid Service ID"** → Verify Service ID matches in Firebase Console & Apple Developer Console
- [ ] **"Invalid Key ID"** → Check Key ID is correct in Firebase Console
- [ ] **Popup blocked** → Check browser popup settings, try again
- [ ] **"Sign-in cancelled"** → User closed Apple sign-in dialog (expected, show retry message)
- [ ] **No email provided** → User may have enabled "Hide My Email" - configure private relay

**Verification:**
- [ ] New user created in Supabase with:
  - [ ] `auth_provider: 'apple'`
  - [ ] `auth_provider_uid` set to Apple's unique ID
  - [ ] `full_name` populated (if user shared name)
  - [ ] `email` populated (real or private relay)
- [ ] User can reload page and stay logged in
- [ ] User appears in Firebase Authentication dashboard

### **Test 8: Accessibility - Keyboard Only**
1. [ ] Start at `/auth`
2. [ ] Press **Tab** → Focus moves to first button (phone)
3. [ ] Continue **Tab** → Move through all 5 methods
4. [ ] Press **Enter** on "Phone" → Enters phone flow
5. [ ] **Tab** → Focus phone input, then button
6. [ ] **Enter** → Submits form
7. [ ] Press **Shift+Tab** → Go back button
8. [ ] **Enter** on back → Returns to method selector

**Expected:**
- [ ] All buttons have visible focus outline (3px ring)
- [ ] No keyboard traps (can always move forward/backward)
- [ ] Escape should NOT close dialog (not a modal)

### **Test 9: Accessibility - Screen Reader**
**Using NVDA or JAWS:**
1. [ ] Announce page title: "Crown & Crest - Sign In"
2. [ ] Announce method selector as `<fieldset>` with legend "Authentication methods"
3. [ ] Each button has descriptive aria-label:
   - [ ] "Login with phone number - receive a one-time password via SMS"
   - [ ] "Log in with email and password"
   - [ ] "Log in with magic link - receive a secure link via email"
   - [ ] etc.
4. [ ] Error messages announced immediately with `role="alert"`
5. [ ] Success states include checkmarks announced

**Example:** When user enters 10 digits, should announce:
- "Valid number" with aria-live="polite"

### **Test 10: Session Persistence**
1. [ ] Log in via any method
2. [ ] Reload page → Should stay logged in (not redirected to `/auth`)
3. [ ] Close tab and reopen site → Session persists for 7 days
4. [ ] Check cookie in DevTools: 
   - [ ] Name: `session`
   - [ ] httpOnly: true
   - [ ] Secure: true (production only)
   - [ ] SameSite: Lax
   - [ ] Expires in 7 days

### **Test 11: Redirect Preservation**
1. [ ] Navigate to `/cart?step=checkout` → Redirected to `/auth`
2. [ ] Log in via any method → Should redirect back to `/cart?step=checkout` (not home)
3. [ ] sessionStorage cleared after redirect

### **Test 12: Error Handling**
Test each error scenario:

| Situation | Expected Behavior |
|-----------|------------------|
| No Firebase config | Show red banner at top |
| Network timeout | "Network error. Please check your connection" |
| reCAPTCHA timeout | "Security verification timed out. Please try again" |
| Wrong email format | Error before reCAPTCHA init |
| Password too weak | Clear requirements checklist |
| Account exists (signup) | "Email already in use. Try login instead" |
| User not found (login) | "Email or password incorrect" |
| Session expired | Return to `/auth` with "Session expired" |

### **Test 13: Mobile Responsiveness**
Test on actual devices or DevTools:

| Device | Screen Width | Tests |
|--------|-------------|-------|
| iPhone SE | 375px | Full-width buttons, readable text (16px+), no scroll |
| iPhone 14 | 390px | Portrait + landscape orientation |
| iPad | 768px | Optimal layout, not stretched |
| Android (Pixel 6) | 412px | Touch targets 56px height |

**Specific Mobile Tests:**
- [ ] Input fields 16px font (no iOS zoom on focus)
- [ ] Buttons 56px height (easy to tap)
- [ ] Modal scrollable if content exceeds viewport
- [ ] Landscape doesn't break layout

### **Test 14: Performance**
1. [ ] Lighthouse score → Target 90+
2. [ ] First Contentful Paint → < 1.5s
3. [ ] Largest Contentful Paint → < 2.5s
4. [ ] Cumulative Layout Shift → < 0.1

**Check from:**
```bash
npm run build
npm run start
# Then run Lighthouse in DevTools
```

### **Test 15: Cross-Browser**
- [ ] Chrome (latest)
- [ ] Firefox (latest)  
- [ ] Safari (latest)
- [ ] Edge (latest)

**Check:**
- [ ] All animations smooth
- [ ] Focus rings visible
- [ ] Inputs auto-fill properly
- [ ] OAuth popups work

---

## 🐛 Known Limitations & Future Work

### Not Yet Implemented:
- Social OAuth for existing accounts (linking accounts)
- Two-factor authentication (2FA)
- Social login with Twitter/GitHub/Discord
- Passwordless authentication beyond email links
- Session activity timeout (currently 7 days fixed)

### Future Enhancements:
- Biometric auth (Face ID, Touch ID)
- SMS backup codes
- Login history & device management
- One-click logout on all devices
- Account deletion flow

---

## 📋 Debugging Tips

### Common Issues:

**"Firebase configuration is missing"**
- Check `NEXT_PUBLIC_FIREBASE_*` env vars in `.env.local`
- Restart dev server after changing env vars

**reCAPTCHA keeps timing out**
- Ensure Firebase Console has reCAPTCHA v3 enabled
- Check network throttling (not 2G)

**Google/Apple popup doesn't open**
- Check browser console for errors
- Ensure redirect URLs added to Firebase OAuth settings
- On mobile, ensure Chrome/Safari allows popups

**User doesn't appear in Supabase**
- Check Firebase Admin SDK key is correct
- Ensure Supabase user table exists with correct schema
- Check server logs for SQL errors

**Session doesn't persist**
- Check cookie is being set (DevTools → Application → Cookies)
- Ensure SESSION_SECRET is set in env
- Check secure flag (must be true in production)

### Verify Setup:

```bash
# Test Firebase connection
npm run build

# Test Supabase connection  
# (should auto-create user on first login)

# Check env vars
echo $env:NEXT_PUBLIC_FIREBASE_API_KEY
echo $env:SESSION_SECRET
```

---

## 📞 Support

For issues or questions:
1. Check browser console (F12 → Console tab)
2. Check server logs (terminal where `npm run dev` runs)
3. Check network tab (F12 → Network) for failed requests
4. Review Firebase Console for token/quota issues
5. Review Supabase logs for user creation errors
