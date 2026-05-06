import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
}

const hasConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId)
const app = getApps().length ? getApps()[0] : (hasConfig ? initializeApp(firebaseConfig) : null)

export const auth = app ? getAuth(app) : null

/**
 * Initialize Google OAuth Provider
 * Make sure Google provider is enabled in Firebase Console
 * Project Settings → Authentication → Sign-in method → Google
 */
export function getGoogleProvider() {
  const googleProvider = new GoogleAuthProvider()
  // Require a Google account (don't allow account linking)
  googleProvider.setCustomParameters({ prompt: 'select_account' })
  // Request additional scopes if needed
  // googleProvider.addScope('profile')
  // googleProvider.addScope('email')
  return googleProvider
}

