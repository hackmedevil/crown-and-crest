# Magic Link Setup & Usage Guide

Magic links are **passwordless email-based authentication** - users receive a secure link via email and just click it to sign in.

---

## 📋 What You Need

### Firebase Setup (Required)

1. **Email/Password Authentication Enabled**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Navigate to **Authentication** → **Sign-in method**
   - Click **Email/Password**
   - Ensure it's **enabled** (toggle on)
   - You don't need to enable "Email link (passwordless sign-in)" separately - our code handles it

2. **Action Code Settings**
   - Firebase automatically handles email sending
   - No additional configuration needed

### Code Files (Already Implemented)

✅ All code is already in place:
- `src/app/(auth)/auth/AuthClient.tsx` - Handles magic link flow
- `src/app/(auth)/auth/steps/MagicLinkStep.tsx` - UI for entering email
- `src/app/(auth)/auth/email-verify/page.tsx` - Handles link verification
- `/api/auth/session/route.ts` - Creates session after verification

---

## 🔄 How Magic Links Work

### Step-by-Step Flow

```
1. User clicks "Magic Link" from auth method selector
   ↓
2. User enters their email address
   ↓
3. User clicks "Send Magic Link"
   ↓
4. Firebase sends email with secure link:
      https://your-site.com/auth/email-verify?code=XXX&...
   ↓
5. User clicks link in email
   ↓
6. /auth/email-verify page processes link
   ↓
7. User automatically signed in
   ↓
8. Session cookie created
   ↓
9. Redirected to original destination
```

### Behind the Scenes

1. **sendEmailOtp()** in AuthClient:
   - Validates email format
   - Calls Firebase: `sendSignInLinkToEmail(auth, email, actionCodeSettings)`
   - Stores email in localStorage
   - Shows success screen

2. **actionCodeSettings** object:
   - `url`: `https://your-site.com/auth/email-verify?redirect=...`
   - `handleCodeInApp: true` - Handles link in-app instead of leaving app

3. **Email link contains**:
   - Encoded Firebase authentication code
   - State parameter
   - OTP code
   - All needed for verification

4. **email-verify page** when user clicks link:
   - Checks if URL is valid sign-in link: `isSignInWithEmailLink(auth, href)`
   - Gets email from localStorage (or prompts user)
   - Verifies with Firebase: `signInWithEmailLink(auth, email, href)`
   - Creates session via `/api/auth/session`
   - Redirects to original page

---

## ✅ Testing Magic Links

### Prerequisites
- Email configured in `.env.local` (Firebase handles this automatically)
- `/auth/email-verify` route accessible
- Session API working

### Test Steps

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Go to login**
   - Open `http://localhost:3000/auth`

3. **Choose Magic Link**
   - Click "Choose login method"
   - Click "Email & Password"
   - Click "Magic link" button

4. **Enter email**
   - Type your real email address (tests use yours)
   - Click "Send Magic Link"
   - Should see success: "Magic link sent!"

5. **Check email**
   - Look in inbox for "Sign in to Crown & Crest"
   - **Check spam folder if not found**
   - Subject: Firebase email link sign-in

6. **Click the link**
   - In the email, click "Sign in to Crown & Crest"
   - Or copy the link and paste in browser

7. **Verify it works**
   - Should automatically sign in
   - Should see loading state briefly
   - Should redirect to home page (or where you came from)
   - Session cookie created (check DevTools → Cookies)

### Expected Behaviors

✅ **Success:**
- Email sent within 5 seconds
- Link valid for 24 hours
- Clicking link signs user in automatically
- Session persists (7-day cookie)
- New user created in Supabase on first magic link sign-in

❌ **Common Issues:**

| Issue | Solution |
|-------|----------|
| Email never arrives | Check spam folder, verify Firebase project ID is correct |
| Link expired | Resend magic link (expires after 24 hours) |
| "Invalid link" error | Link was already used or tampered with |
| Can't click link from Gmail | Copy link and open in new tab instead |
| Signed out immediately | Check session API response for errors |

---

## 🔐 Security Features

**Magic links are secure because:**

1. **Link is one-time use** - Can only be used once
2. **Link expires after 24 hours** - Old links stop working
3. **Email verification proves ownership** - Only person with email can use link
4. **Server-side verification** - `/auth/email-verify` verifies with Firebase
5. **Secure session created** - httpOnly cookie set after verification
6. **No passwords stored** - Uses email-based authentication

**Privacy compliant:**

- ✅ Email address verified (user proves they own it)
- ✅ User can see what site requesting access
- ✅ Can decline email and try different method
- ✅ No tracking or profiling
- ✅ Can delete account anytime

---

## 📨 Email Configuration

### What Firebase Sends

Firebase sends email with:
- **From:** noreply@firebase.yourdomain.com
- **Subject:** Sign in to Crown & Crest
- **Content:**
  - Sign in link (blue button)
  - Expiry info (24 hours)
  - Support info
  - Unsubscribe option

### Custom Email (Optional)

To use custom email domain instead of Firebase default:

1. In Firebase Console → Authentication → Templates
2. Click "Email link sign-in" template
3. Customize:
   - Subject line
   - Sender name
   - Email body
   - Button text

### Test With Multiple Emails

Try signing in with different emails:
- Professional: `your-name@company.com`
- Personal: `yourname@gmail.com`
- Temporary: `test@example.com` (if configured)

Each email creates separate user account.

---

## 🚀 Features

### What Works

✅ Send magic link to any email  
✅ User clicks link, automatically signs in  
✅ New user auto-created in Firebase & Supabase on first link  
✅ Link valid for 24 hours  
✅ Resend link if first expired  
✅ Email stored in localStorage for security  
✅ Redirect to original page after sign-in  
✅ Mobile-friendly (works on any device)  
✅ Works in email clients, never breaks links  

### Not Yet Implemented

❌ Custom email templates (uses Firebase defaults)  
❌ Rate limiting per email (Firebase has built-in)  
❌ Magic link for password reset (separate feature)  
❌ Batch send magic links  

---

## 📱 Mobile Testing

### Works On

- ✅ **iOS** - Click link in Safari, Mail, Gmail apps
- ✅ **Android** - Click link in Chrome, Gmail, email apps
- ✅ **Desktop** - Click link in any browser

### Testing Steps on Mobile

1. Get user to visit `/auth` on phone
2. Select "Magic Link" method
3. Enter email
4. Check email on same or different device
5. Click link (opens in app browser or Safari/Chrome)
6. Should auto-sign-in

### Tips

- If link opens in-app browser, it won't redirect - tell user to open in Safari
- Gmail app links work fine - click "Sign in" button
- WhatsApp/Telegram might block links - copy/paste instead

---

## 🔧 Troubleshooting

### "Send Magic Link" Button Not Working

```
Check:
1. Email is valid format (has @ and .)
2. Firebase initialized (check console for errors)
3. Authentication enabled in Firebase Console
4. No network error (check DevTools → Network)
```

### Email Never Arrives

```
1. Check spam folder first
2. Check if email is correct (typo?)
3. Verify Firebase project ID in .env matches Console
4. Check Firebase email logs in Firebase Console
5. Try different email address
```

### Link Doesn't Work When Clicked

```
1. Link might be expired (24 hours) - resend new one
2. URL might be corrupted in email - copy/paste instead
3. Different browser/device - localStorage email might not match
4. Try opening in private/incognito window
```

### Session Not Created

```
1. Check /api/auth/session API is working
2. Check Supabase connection in env vars
3. Check Firebase Admin SDK key in env
4. Look at server logs for errors
```

---

## 📊 Analytics

Track magic link usage:

```sql
-- See how many signups via magic link
SELECT 
  COUNT(*) as total,
  DATE(created_at) as date
FROM users 
WHERE auth_provider = 'email'
GROUP BY DATE(created_at)
ORDER BY date DESC
```

---

## 🔄 Next Steps

After testing magic links:

1. ✅ **Send test link to yourself** - Verify end-to-end works
2. ✅ **Test on mobile** - Ensure works on phone
3. ✅ **Test expired link** - Try link after 24+ hours
4. ✅ **Check Supabase** - Verify user created with correct fields
5. ✅ **Test redirect** - Try from `/cart?step=checkout` to verify redirect

---

## 📝 Environment Variables Needed

```env
# These should already be set
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx

FIREBASE_ADMIN_SDK_KEY=xxx
SESSION_SECRET=xxx

NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

All should be configured if `.env.local` is set up. Magic links don't require additional config.

---

## ✨ Example: Full Magic Link Flow

### User Perspective

```
1. Opens https://crown-and-crest.com/auth
2. Clicks "Choose login method"
3. Clicks "Magic link" button (✨)
4. Types "john@example.com"
5. Clicks "Send Magic Link"
6. Sees "Check your email!" message
7. Checks email inbox
8. Sees: "Sign in to Crown & Crest"
9. Clicks blue button in email
10. Automatically signed in
11. Redirected to home page
12. Can now browse store logged in ✅
```

### Developer Perspective

```typescript
// AuthClient sends this:
await sendSignInLinkToEmail(auth, 'john@example.com', {
  url: 'https://crown-and-crest.com/auth/email-verify?redirect=...',
  handleCodeInApp: true
})

// Firebase sends email with link:
// https://crown-and-crest.firebaseapp.com/__/auth/handler?apiKey=xxx&code=yyy&...

// User clicks, /auth/email-verify:
const result = await signInWithEmailLink(auth, 'john@example.com', href)

// Create session:
fetch('/api/auth/session', {
  method: 'POST',
  body: JSON.stringify({ idToken: result.user.getIdToken() })
})

// ✅ User now authenticated with session cookie
```

---

## 🎯 Success Checklist

- [ ] Email field validates format before sending
- [ ] Magic link email arrives in inbox within 5 seconds
- [ ] Clicking link automatically signs user in
- [ ] New user appears in Firebase Authentication
- [ ] New user appears in Supabase with auth_provider='email'
- [ ] Session cookie created (check DevTools Cookies)
- [ ] User stays logged in after page reload
- [ ] Expired link (24h+) shows error "Invalid verification link"
- [ ] Works on mobile and desktop
- [ ] Helps text explains to check spam folder

---

**Ready to test?** Start with [AUTH_QUICK_START_TESTING.md](AUTH_QUICK_START_TESTING.md) and jump to Test 4: Magic Link!
