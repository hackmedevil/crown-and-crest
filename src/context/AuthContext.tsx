'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { AuthModalProvider, useAuthModal } from '@/components/auth/AuthModalProvider'

type PendingAction = 'buyNow' | 'addToCart' | 'wishlist' | 'checkout' | null

type AuthContextValue = {
  user: { uid: string } | null
  loginOpen: boolean
  pendingAction: PendingAction
  openLoginModal: (action?: PendingAction) => void
  closeLoginModal: () => void
  requireAuth: (action: () => Promise<void> | void, intent?: Exclude<PendingAction, null>) => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeIntent(action?: PendingAction): 'buyNow' | 'addToCart' | 'wishlist' | 'checkout' | 'general' {
  return action || 'general'
}

function AuthContextBridge({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOpen, currentIntent, openAuthModal, closeAuthModal, requireAuth } = useAuthModal()

  const value: AuthContextValue = {
    user: isAuthenticated ? { uid: 'session-user' } : null,
    loginOpen: isOpen,
    pendingAction: currentIntent === 'general' ? null : currentIntent,
    openLoginModal: (action = null) => {
      openAuthModal({ intent: normalizeIntent(action) })
    },
    closeLoginModal: closeAuthModal,
    requireAuth: async (action, intent) => {
      await requireAuth(action, { intent: normalizeIntent(intent || null) })
    },
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthModalProvider>
      <AuthContextBridge>{children}</AuthContextBridge>
    </AuthModalProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
