'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from 'firebase/auth'
import { auth, getGoogleProvider } from '@/lib/firebase/client'

const LoginModal = dynamic(() => import('./LoginModal'), {
  ssr: false,
})

type PendingAction = (() => Promise<void> | void) | null
type AuthStep = 'method' | 'phone' | 'otp'

type AuthIntent = 'buyNow' | 'addToCart' | 'wishlist' | 'checkout' | 'general'

interface OpenAuthOptions {
  intent?: AuthIntent
  onSuccess?: () => Promise<void> | void
}

interface AuthModalContextValue {
  isAuthenticated: boolean
  isOpen: boolean
  currentIntent: AuthIntent
  openAuthModal: (options?: OpenAuthOptions) => void
  closeAuthModal: () => void
  requireAuth: (action: () => Promise<void> | void, options?: Omit<OpenAuthOptions, 'onSuccess'>) => Promise<void>
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

const OTP_LENGTH = 6
const RESEND_SECONDS = 30
const RECAPTCHA_CONTAINER_ID = 'global-recaptcha-container'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10)
}

function isPhoneValid(phone: string): boolean {
  return /^\d{10}$/.test(phone)
}

function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.length <= 5) return normalized
  return `${normalized.slice(0, 5)} ${normalized.slice(5)}`
}

function maskPhoneForOtp(phone: string): string {
  const normalized = normalizePhone(phone)
  const tail = normalized.slice(-3).padStart(3, '0')
  return `+91 XXXXXXX${tail}`
}

function getFriendlyAuthError(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code || '')
    : ''

  if (code.includes('auth/invalid-phone-number')) return 'Invalid phone number.'
  if (code.includes('auth/invalid-verification-code')) return 'Incorrect code. Please try again.'
  if (code.includes('auth/code-expired')) return 'OTP expired. Please request a new code.'
  if (code.includes('auth/too-many-requests')) return 'Too many requests. Please try again later.'
  if (code.includes('auth/popup-closed-by-user')) return 'Google sign-in was canceled.'

  const message = error instanceof Error ? error.message : fallback
  if (/too many/i.test(message)) return 'Too many requests. Please try again later.'
  return message
}

async function createSessionFromFirebase(idToken: string, provider?: 'google' | 'phone') {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken, provider }),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Failed to create session')
  }
}

async function waitForServerSession(maxAttempts = 6, delayMs = 120): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch('/api/auth/status', {
        cache: 'no-store',
        credentials: 'include',
      })

      if (response.ok) {
        const payload = (await response.json()) as { authenticated?: boolean }
        if (payload.authenticated) {
          return true
        }
      }
    } catch {
      // Best effort polling.
    }

    await new Promise(resolve => window.setTimeout(resolve, delayMs))
  }

  return false
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [step, setStep] = useState<AuthStep>('method')
  const [intent, setIntent] = useState<AuthIntent>('general')
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCompletingAuth, setIsCompletingAuth] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [hasInitializedRecaptcha, setHasInitializedRecaptcha] = useState(false)

  const pendingActionRef = useRef<PendingAction>(null)
  const confirmationResultRef = useRef<ConfirmationResult | null>(null)
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const hasHandledQueryAuthRef = useRef(false)

  const otpCode = useMemo(() => otpDigits.join(''), [otpDigits])

  const resetModalState = useCallback(() => {
    setStep('method')
    setPhone('')
    setOtpDigits(Array(OTP_LENGTH).fill(''))
    setError('')
    setLoading(false)
    setResendIn(0)
    confirmationResultRef.current = null
    setIntent('general')
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsOpen(false)
    resetModalState()
  }, [resetModalState])

  const initializeRecaptcha = useCallback(() => {
    if (!auth || window.recaptchaVerifier) {
      return
    }

    const container = document.getElementById(RECAPTCHA_CONTAINER_ID)
    if (!container) {
      return
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
    })
    setHasInitializedRecaptcha(true)
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/status', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) return
        const payload = (await response.json()) as { authenticated?: boolean }
        setIsAuthenticated(Boolean(payload.authenticated))
      } catch {
        // Best effort only.
      }
    }

    void checkSession()
    void import('firebase/auth')
    initializeRecaptcha()
  }, [initializeRecaptcha])

  useEffect(() => {
    if (!isOpen) return

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT') {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }

    window.addEventListener('focusin', onFocusIn)
    return () => window.removeEventListener('focusin', onFocusIn)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || step !== 'phone') return

    window.setTimeout(() => {
      phoneInputRef.current?.focus()
      phoneInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }, [isOpen, step])

  useEffect(() => {
    if (resendIn <= 0) return

    const timerId = window.setInterval(() => {
      setResendIn(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [resendIn])

  useEffect(() => {
    if (step !== 'otp') return
    if (otpCode.length !== OTP_LENGTH) return
    if (loading) return

    void verifyOtp()
  }, [otpCode, step, loading])

  const runPendingAction = useCallback(async () => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (!action) return

    await action()
  }, [])

  const completeAuth = useCallback(async () => {
    setIsCompletingAuth(true)
    try {
      setIsAuthenticated(true)
      setIsOpen(false)
      resetModalState()
      router.refresh()
      await runPendingAction()
    } finally {
      setIsCompletingAuth(false)
    }
  }, [resetModalState, router, runPendingAction])

  const openAuthModal = useCallback((options?: OpenAuthOptions) => {
    setError('')
    setIntent(options?.intent || 'general')
    if (options?.onSuccess) {
      pendingActionRef.current = options.onSuccess
    }
    setIsOpen(true)
    setStep('method')

    if (!hasInitializedRecaptcha) {
      initializeRecaptcha()
    }
  }, [hasInitializedRecaptcha, initializeRecaptcha])

  useEffect(() => {
    if (hasHandledQueryAuthRef.current) return

    const openAuth = searchParams.get('openAuth')
    if (openAuth !== '1') return

    hasHandledQueryAuthRef.current = true

    const redirectTargetRaw = searchParams.get('redirect')
    const safeRedirect = redirectTargetRaw && redirectTargetRaw.startsWith('/') && !redirectTargetRaw.startsWith('//')
      ? redirectTargetRaw
      : '/'

    if (isAuthenticated) {
      router.replace(safeRedirect)
      return
    }

    openAuthModal({
      intent: 'general',
      onSuccess: async () => {
        router.replace(safeRedirect)
      },
    })
  }, [isAuthenticated, openAuthModal, router, searchParams])

  const requireAuth = useCallback(async (
    action: () => Promise<void> | void,
    options?: Omit<OpenAuthOptions, 'onSuccess'>
  ) => {
    if (isAuthenticated) {
      await action()
      return
    }

    pendingActionRef.current = action
    openAuthModal({ intent: options?.intent })
  }, [isAuthenticated, openAuthModal])

  const ensureRateLimit = useCallback(async (targetPhone: string) => {
    const response = await fetch('/api/auth/otp-rate-limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetPhone }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Too many requests. Please try again later.')
      }
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      throw new Error(payload.error || 'Too many requests. Please try again later.')
    }
  }, [])

  const sendOtp = useCallback(async () => {
    setError('')

    const normalized = normalizePhone(phone)
    if (!isPhoneValid(normalized)) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    if (!auth) {
      setError('Phone login is unavailable right now.')
      return
    }

    if (!window.recaptchaVerifier) {
      initializeRecaptcha()
    }

    if (!window.recaptchaVerifier) {
      setError('Failed to initialize reCAPTCHA. Please refresh and try again.')
      return
    }

    setLoading(true)

    try {
      const e164 = `+91${normalized}`
      await ensureRateLimit(e164)

      const result = await signInWithPhoneNumber(auth, e164, window.recaptchaVerifier)
      confirmationResultRef.current = result
      setPhone(normalized)
      setOtpDigits(Array(OTP_LENGTH).fill(''))
      setStep('otp')
      setResendIn(RESEND_SECONDS)

      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 0)
    } catch (err) {
      setError(getFriendlyAuthError(err, 'Failed to send OTP.'))
    } finally {
      setLoading(false)
    }
  }, [ensureRateLimit, initializeRecaptcha, phone])

  const verifyOtp = useCallback(async () => {
    if (!confirmationResultRef.current) {
      setError('OTP session expired. Please request a new OTP.')
      setStep('phone')
      return
    }

    if (otpCode.length !== OTP_LENGTH) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await confirmationResultRef.current.confirm(otpCode)
      const idToken = await result.user.getIdToken()
      await createSessionFromFirebase(idToken, 'phone')
      await waitForServerSession()
      await completeAuth()
    } catch (err) {
      setError(getFriendlyAuthError(err, 'Invalid OTP.'))
    } finally {
      setLoading(false)
    }
  }, [completeAuth, otpCode])

  const loginWithGoogle = useCallback(async () => {
    if (!auth) {
      setError('Google login is unavailable right now.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const provider = getGoogleProvider()
      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken()
      await createSessionFromFirebase(idToken, 'google')
      await waitForServerSession()
      await completeAuth()
    } catch (err) {
      setError(getFriendlyAuthError(err, 'Google sign-in failed.'))
    } finally {
      setLoading(false)
    }
  }, [completeAuth])

  const resendOtp = useCallback(async () => {
    if (resendIn > 0 || loading) return
    await sendOtp()
  }, [loading, resendIn, sendOtp])

  const handleOtpDigitChange = useCallback((index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 1)

    setOtpDigits(prev => {
      const next = [...prev]
      next[index] = clean
      return next
    })

    if (clean && index < OTP_LENGTH - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleOtpKeyDown = useCallback((index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }, [otpDigits])

  const handleOtpPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return

    const next = Array(OTP_LENGTH).fill('').map((_, idx) => pasted[idx] || '')
    setOtpDigits(next)

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
    otpInputRefs.current[focusIndex]?.focus()
  }, [])

  const setOtpInputRef = useCallback((index: number, element: HTMLInputElement | null) => {
    otpInputRefs.current[index] = element
  }, [])

  return (
    <AuthModalContext.Provider
      value={{
        isAuthenticated,
        isOpen,
        currentIntent: intent,
        openAuthModal,
        closeAuthModal,
        requireAuth,
      }}
    >
      {children}

      <div id={RECAPTCHA_CONTAINER_ID} className="sr-only" />

      {isOpen && (
        <LoginModal
          isOpen={isOpen}
          step={step}
          intent={intent}
          phone={phone}
          phoneDisplay={formatPhoneForDisplay(phone)}
          maskedPhone={maskPhoneForOtp(phone)}
          otpDigits={otpDigits}
          otpLength={OTP_LENGTH}
          otpCodeLength={otpCode.length}
          resendIn={resendIn}
          loading={loading}
          isCompletingAuth={isCompletingAuth}
          error={error}
          canSendOtp={isPhoneValid(phone)}
          onClose={closeAuthModal}
          onSelectPhone={() => setStep('phone')}
          onBackToMethod={() => setStep('method')}
          onChangePhone={() => setStep('phone')}
          onPhoneChange={value => setPhone(normalizePhone(value))}
          onSendOtp={() => void sendOtp()}
          onGoogleLogin={() => void loginWithGoogle()}
          onVerifyOtp={() => void verifyOtp()}
          onResendOtp={() => void resendOtp()}
          onOtpDigitChange={handleOtpDigitChange}
          onOtpKeyDown={handleOtpKeyDown}
          onOtpPaste={handleOtpPaste}
          setOtpInputRef={setOtpInputRef}
          phoneInputRef={phoneInputRef}
        />
      )}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return context
}
