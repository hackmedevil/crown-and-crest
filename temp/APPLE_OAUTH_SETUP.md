# Apple OAuth Setup Guide

This guide walks you through configuring Apple Sign In for Firebase, following the **official Firebase documentation**.

## 📋 Requirements Checklist

Before you start, ensure you have:

- ✅ Active **Apple Developer Program membership** ($99/year - required for Sign In with Apple)
- ✅ An **Apple ID with 2FA enabled** (for testing)
- ✅ Device signed into **iCloud** (for testing - required to test Apple sign-in)
- ✅ **Firebase project** already set up
- ✅ Access to **Firebase Console**
- ✅ Access to **Apple Developer Console**

## 🚀 Step 1: Configure Apple Developer Console

### 1a. Register Domain with Apple

1. Go to [Apple Developer Account](https://developer.apple.com/account/)
2. Click **App IDs** in the sidebar
3. Create new App ID or edit existing one:
   - Product Name: `Crown and Crest`
   - Capabilities: Check "Sign In with Apple"
4. Configure the web domain:
   - Domain: Your production domain (e.g., `crown-and-crest.com`)
   - Return URL: `https://YOUR_FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler`
     - Replace `YOUR_FIREBASE_PROJECT_ID` with your actual Firebase project ID
     - Example: `https://crown-crest-app.firebaseapp.com/__/auth/handler`

### 1b. Create Service ID

1. In Apple Developer Console, go to **Identifiers**
2. Select **Services IDs**
3. Register new Services ID:
   - Description: `Crown and Crest Web Service`
   - Identifier: `com.crown-and-crest.web` (unique reverse-domain notation)
4. **Check "Sign In with Apple"** capability
5. Click **Configure** and set:
   - Primary App ID: (select the domain you registered above)
   - Return URL: `https://YOUR_FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler`
6. **Save this Service ID** - you'll need it for Firebase

### 1c. Create Private Key

1. In Apple Developer Console, go to **Keys**
2. Click **Create a new key**
3. Name it: `Firebase Apple Sign In`
4. Check "Sign In with Apple" capability
5. Click **Configure** and select the Services ID you created in 1b
6. **Save** and download the key file
7. **Important**: Safely save the `.p8` file - Apple won't let you download it again
8. **Note your Key ID** (shown in Apple Developer Console)

### 1d. Configure Private Email Relay (Optional but Recommended)

If you'll send emails to users (password resets, verifications, etc.):

1. Go to **More** → **Certificates, IDs & Profiles**
2. Select your App ID
3. Click **Configure** next to "Sign In with Apple"
4. Enable "Configure Private Email Relay service"
5. Register email: `noreply@YOUR_FIREBASE_PROJECT_ID.firebaseapp.com`
   - Or use custom domain: `noreply@crown-and-crest.com`

---

## 🔧 Step 2: Configure Firebase Console

### 2a. Enable Apple Provider

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Click **Add new provider** → **Apple**
5. **Enable** the provider

### 2b. Add Apple Configuration

In the Apple provider settings, fill in:

| Field | Value | Where to Find |
|-------|-------|---------------|
| **Service ID** | `com.crown-and-crest.web` | Apple Developer Console → Services IDs |
| **Team ID** | Your Apple Team ID (10 chars) | Apple Developer Console → Membership |
| **Key ID** | Your private key ID | Apple Developer Console → Keys |
| **Private Key** | Contents of `.p8` file | Downloaded in Step 1c |

**To find your Team ID:**
1. Go to [Apple Developer Membership](https://developer.apple.com/account/)
2. Look for "Team ID" in the top-right corner
3. It's a 10-character alphanumeric code

### 2c. Save Configuration

Click **Save** in Firebase Console.

---

## 🧪 Step 3: Test Apple Sign In

### On Desktop (Mac Only)

1. Go to your app's login page (`/auth`)
2. Click **Apple** button
3. Should see Apple sign-in dialog
4. Sign in with your Apple ID
5. If prompted, allow access to email + name
6. Should be redirected and logged in

### On iOS

1. Use Safari on iPhone/iPad
2. Go to your site
3. Click **Apple** button
4. Should see native iOS sign-in dialog
5. Complete sign-in
6. Should redirect back to your app signed in

### Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid Service ID" | Check Service ID matches in Apple Console & Firebase Console |
| "Invalid Key ID" | Verify Key ID is correct in Firebase Console |
| "Popup blocked" | Check browser popup settings for apple.com |
| "No user info provided" | User may have hidden their email/name in Apple settings |
| Doesn't work on Android | Apple sign-in is **not available on Android** - recommended to fallback to Google |

---

## 📝 Privacy & Compliance Notes

### Important: Apple's Private Email Relay

When users choose to **hide their email** during Apple sign-in:
- Apple gives them an anonymized email: `xyz@privaterelay.appleid.com`
- You should NOT reveal to the user that they're using a private relay
- Configure private email relay (Step 1d) so emails sent to the private address are forwarded to their real email

### Account Deletion Required

Per Apple App Store guidelines, you MUST:
1. ✅ Provide in-app account deletion
2. ✅ Have a privacy policy
3. ✅ Not link anonymous Apple IDs to personally identifiable information without consent

Our current implementation doesn't have account deletion yet - this should be added before production:

```typescript
// Example: Delete account with Apple
const provider = new OAuthProvider('apple.com');
const result = await signInWithPopup(auth, provider);
const credential = OAuthProvider.credentialFromResult(result);
const accessToken = credential.accessToken;

// Revoke token before deleting
await revokeAccessToken(auth, accessToken);

// Then delete user
await deleteUser(auth.currentUser);
```

---

## 🔐 Secure Implementation

### Environment Variables

Ensure `.env.local` has:

```env
# Firebase (no secrets - public)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx

# Server-side only (secrets)
FIREBASE_ADMIN_SDK_KEY=xxx
SESSION_SECRET=xxx
```

### What NOT to Store

⚠️ **Never commit to Git:**
- Apple private key (`.p8` file)
- Firebase Admin SDK key
- Session secret

✅ **Use `.env.local` and add to `.gitignore`**

---

## 🧬 Code Implementation

Our current code in `src/lib/firebase/client.ts` is correct:

```typescript
import { OAuthProvider } from 'firebase/auth'

export function getAppleProvider() {
  const appleProvider = new OAuthProvider('apple.com')
  appleProvider.addScope('email')    // Request email
  appleProvider.addScope('name')     // Request name
  return appleProvider
}
```

And in `src/app/(auth)/auth/AuthClient.tsx`:

```typescript
async function handleAppleLogin() {
  const provider = getAppleProvider()
  const result = await signInWithPopup(auth, provider)
  const idToken = await result.user.getIdToken()
  
  // Send to session API to create signed cookie
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      provider: 'apple',
      displayName: result.user.displayName,
      email: result.user.email,
    }),
  })
}
```

This implementation:
- ✅ Uses `OAuthProvider('apple.com')` - correct Firebase pattern
- ✅ Requests `email` and `name` scopes
- ✅ Handles popup flow with error handling
- ✅ Sends secure token to server-side session API
- ✅ Creates signed session cookie
- ✅ Stores user in Supabase with provider info

---

## 📱 Multi-Platform Testing

### Works On:
- ✅ **macOS** - Full browser support (Safari, Chrome)
- ✅ **iOS** - Full browser support (Safari in-app browser, Chrome)
- ✅ **iPadOS** - Full browser support

### Doesn't Work:
- ❌ **Android** - Apple doesn't officially support Android
- ❌ **Windows** - No Apple browser implementation

**Recommendation**: For Android users, have them sign in with Google instead.

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Apple Developer Program membership active ($99/year)
- [ ] Production domain registered with Apple (not just localhost)
- [ ] Firebase Apple provider configured with Service ID + Team ID + Key ID
- [ ] Private email relay configured if sending emails
- [ ] Account deletion feature implemented
- [ ] Privacy policy updated mentioning Apple sign-in
- [ ] Tested on real Apple device (required for App Store approval later)
- [ ] Session secret generated and set in production environment
- [ ] Firebase Admin SDK key set in production environment

---

## 🔗 Useful Links

- **[Firebase Apple Auth Official Docs](https://firebase.google.com/docs/auth/web/apple)**
- **[Apple Developer Console](https://developer.apple.com/account/)**
- **[Apple Sign In with Apple Docs](https://developer.apple.com/sign-in-with-apple/)**
- **[Firebase Console Settings](https://console.firebase.google.com/project/_/settings/general)**

---

## ❓ FAQ

**Q: Do I really need Apple Developer Program membership?**
A: Yes, Sign In with Apple is exclusive to members. It's $99/year.

**Q: Can I test Apple sign-in without a real Apple device?**
A: Partially. You can test on macOS. For mobile, you need actual iOS/iPad device.

**Q: What if user doesn't share their email?**
A: Apple provides anonymized email (`xyz@privaterelay.appleid.com`). Set this up in Step 1d.

**Q: How do I link Apple account to existing email account?**
A: Use `linkWithPopup()` after user logs in with email first.

**Q: Is our implementation secure?**
A: Yes! We send tokens server-side, create signed sessions, and never expose secrets to client.

---

## 📞 Support

If you encounter issues:

1. Check **[Apple Developer Status Page](https://developer.apple.com/system-status/)**
2. Review **[Firebase Auth Error Codes](https://firebase.google.com/docs/reference/js/auth#autherrorcodes)**
3. Check browser console (F12) for detailed error messages
4. Verify all environment variables are set
5. Clear browser cache and try again

Last updated: February 20, 2026
