import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'

let adminAuthInstance: Auth | null = null

function getFirebaseAdminApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
    return null
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }

  return getApps()[0] ?? null
}

function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = getFirebaseAdminApp()
    if (!app) {
      throw new Error('Firebase admin credentials are not configured')
    }

    adminAuthInstance = getAuth(app)
  }

  return adminAuthInstance
}

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth()
    const value = auth[prop as keyof Auth]

    if (typeof value === 'function') {
      return value.bind(auth)
    }

    return value
  },
})