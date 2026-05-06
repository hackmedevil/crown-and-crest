# Magic Link Email Troubleshooting

Email not arriving? Let's debug this step-by-step.

---

## 🔍 Step 1: Check Console for Errors

1. Open Browser DevTools: **F12** or **Right Click → Inspect**
2. Go to **Console** tab
3. Look for red error messages when you click "Send Magic Link"

**Common errors:**

| Error | Meaning | Fix |
|-------|---------|-----|
| `auth/invalid-email` | Email format wrong | Use format: `name@domain.com` |
| `auth/user-disabled` | Account disabled in Firebase | Not applicable for magic links |
| `auth/operation-not-allowed` | Email sign-in not enabled | Enable Email/Password in Firebase Console |
| `auth/too-many-requests` | Rate limited | Wait 1 hour, try again |
| `Network error` | No internet or Firebase blocked | Check internet, check firewall |

**Check error:**
```javascript
// In browser console, run:
console.log('Check Network tab for failed requests')
```

---

## 🔐 Step 2: Verify Firebase Configuration

### Check .env.local

Open your `.env.local` file and verify these are present:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=sk_live_xxx          ✅ Must be present
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com  ✅ Must be present
NEXT_PUBLIC_FIREBASE_PROJECT_ID=my-project-id     ✅ Must be present
FIREBASE_ADMIN_SDK_KEY={"type":"service_account"...} ✅ Must be present
SESSION_SECRET=random_32_char_string              ✅ Must be present
```

If any are missing, add them from Firebase Console.

### Check Firebase Project ID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click your project → **Project Settings** (gear icon)
3. Copy **Project ID**
4. Verify it matches `NEXT_PUBLIC_FIREBASE_PROJECT_ID` in `.env.local`
5. **Restart dev server** after changing `.env`

```bash
# Stop server (Ctrl+C)
npm run dev
# Try magic link again
```

---

## 🔓 Step 3: Verify Firebase Authentication Setup

### Is Email/Password Enabled?

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Authentication** → **Sign-in method** tab
3. Look for **Email/Password** in the list
4. It should have a **green toggle** (enabled)

**If disabled (grey toggle):**
- Click **Email/Password**
- Turn on **Enable email/password sign-in**
- Check "Email link (passwordless sign-in)"
- Click **Save**

### Check Authentication Templates

1. In **Authentication** → **Templates** tab
2. Look for "Email link sign-in" template
3. Click it to ensure it's configured
4. Should show:
   - **Subject:** "Sign in to Crown & Crest" (or similar)
   - **Body:** Contains sign-in link
   - **From:** noreply@yourproject.firebaseapp.com

---

## 📧 Step 4: Check Email Service

### Is Gmail/Email Accepting Emails?

Try this test:

```bash
# Send yourself a test email from Gmail or another service
# Can you receive it? 
# - If YES → Email works, Firebase issue
# - If NO → Your email provider blocks something
```

### Check Spam Folder

🚨 **IMPORTANT:** Check **Spam/Junk** folder first!

Firebase emails sometimes go to spam because:
- Novel sender (first time from this address)
- No domain reputation
- ISP filters

**Solutions:**
1. Mark Firebase email as "Not Spam"
2. Add noreply@firebase.com to contacts
3. Whitelist Firebase in email settings

### Check Email Blocklist

Some corporate/school networks block Firebase emails:
- Try from personal email instead
- Try from different network (mobile hotspot)
- Ask IT to whitelist Firebase

---

## 🔧 Step 5: Test Firebase Email Directly

### Use Firebase Admin Panel

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. **Authentication** → **Users** tab
3. Create test user (optional)
4. In **Authentication** → **Templates**
5. Click **Email link sign-in** template
6. Click **Test this template** button

This sends a real test email from Firebase. **Check if it arrives.**

If test email arrives → Firebase works, issue is in your code  
If test email doesn't arrive → Firebase email broken, contact Google Support

---

## 🖥️ Step 6: Check Server Logs

### Look at Terminal Output

When you click "Send Magic Link", check your terminal where `npm run dev` runs.

Look for:
```
[200] POST /api/auth/session
[auth] sendSignInLinkToEmail called
[email] Sent to: john@example.com
```

**If you see errors:**
```
[error] Failed to send email
[error] Firebase admin SDK not initialized
[error] Service account key invalid
```

Then the issue is server-side. Check `.env` variables again.

---

## 🌐 Step 7: Check Network Activity

### Use DevTools Network Tab

1. Open **DevTools** → **Network** tab
2. Click "Send Magic Link"
3. Look for these requests:

```
POST /auth/email-verify        [Should be 200 OK]
POST /api/auth/session          [Should be 200 OK]
```

**If request fails:**
- Red status code (4xx, 5xx)
- Look at "Response" tab for error message
- Copy error message for investigation

---

## 💡 Common Causes & Solutions

### Cause 1: Email/Password Not Enabled in Firebase

**Symptom:** "Email/Password provider not enabled" error in console

**Solution:**
1. Firebase Console → **Authentication** → **Sign-in method**
2. Click **Email/Password**
3. Toggle **Enable**
4. Restart dev server

### Cause 2: Firebase Project ID Mismatch

**Symptom:** Email not sent, no error message

**Solution:**
1. Get Project ID from Firebase Console → Settings
2. Update `.env.local`: `NEXT_PUBLIC_FIREBASE_PROJECT_ID=correct-id`
3. Stop dev server: **Ctrl+C**
4. Restart: `npm run dev`
5. Try again

### Cause 3: Email Goes to Spam

**Symptom:** No email in inbox, but no error either

**Solution:**
1. Check **Spam/Junk** folder
2. Mark as "Not Spam"
3. Add `noreply@firebase.com` to contacts
4. Try again

### Cause 4: Network/Firewall Blocking Firebase

**Symptom:** "Network error" in console

**Solution:**
1. Check internet connection
2. Try from mobile hotspot (bypass company WiFi)
3. Disable VPN if using one
4. Try from different network

### Cause 5: Rate Limited

**Symptom:** Works first time, then fails

**Solution:**
- Firebase limits to ~5 emails per minute per email address
- Wait 1 hour and try again
- Try with different email address

---

## 🧪 Quick Diagnostic

Run this in browser console and send output:

```javascript
// Copy this and paste in DevTools Console:
async function diagnoseMagicLink() {
  const results = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    screen: `${window.innerWidth}x${window.innerHeight}`,
  }
  
  // Check if Firebase loaded
  if (typeof window.firebase !== 'undefined') {
    results.firebase = 'Loaded ✅'
  } else {
    results.firebase = 'NOT loaded ❌'
  }
  
  console.log('Diagnostic Results:')
  console.table(results)
  return results
}

diagnoseMagicLink()
```

---

## 📞 If Still Not Working...

Provide these when asking for help:

1. **Console errors** (copy-paste from DevTools Console)
2. **Network response** (from DevTools Network tab)
3. **Email address used** (format, domain)
4. **Firebase Project ID**
5. **What you see instead** (blank, error, timeout?)

---

## ✅ Checklist Before Retrying

- [ ] `.env.local` has all 5 variables
- [ ] Firebase Project ID matches Console
- [ ] Email/Password **enabled** in Firebase Authentication
- [ ] Email is valid format (`name@domain.com`)
- [ ] Checked spam folder
- [ ] Cleared browser cache (Ctrl+Shift+Delete)
- [ ] Restarted dev server (`npm run dev`)
- [ ] Tested from different email address
- [ ] Tested from different device/network
- [ ] Checked browser console for errors

---

## 🔄 You Should See

### When Clicking "Send Magic Link"

1. ✅ Button changes to "Sending..."
2. ✅ Spinner appears briefly
3. ✅ Message: "✉️ Magic link sent!"
4. ✅ Shows email address
5. ✅ Help text: "Check your email" + "Link expires in 24 hours"

### When Email Arrives

1. ✅ Email from: noreply@firebase.com (or custom domain)
2. ✅ Subject: "Sign in to [Your Site Name]"
3. ✅ Blue button: "Sign in to Crown & Crest"
4. ✅ Text: "or copy this link" + URL

### When Clicking Link

1. ✅ Page says: "Verifying..."
2. ✅ Brief loading state
3. ✅ Signs in automatically
4. ✅ Redirects to home/intended page
5. ✅ Session cookie created (check DevTools → Cookies)

If you see all of these, **magic links work!** ✅

---

## 📚 Additional Resources

- [Firebase Email Link Sign-In Docs](https://firebase.google.com/docs/auth/web/email-link-auth)
- [Firebase Troubleshooting Guide](https://firebase.google.com/docs/auth/troubleshoot)
- [Gmail Spam Filter Help](https://support.google.com/mail/answer/188730)

**Still stuck?** Share the diagnostic results from the console script above, and I can help further debug!
