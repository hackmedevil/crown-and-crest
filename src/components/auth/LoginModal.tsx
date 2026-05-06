'use client'

import Link from 'next/link'
import type { KeyboardEvent, ClipboardEvent, RefObject } from 'react'

type AuthIntent = 'buyNow' | 'addToCart' | 'wishlist' | 'checkout' | 'general'
type AuthStep = 'method' | 'phone' | 'otp'

type LoginModalProps = {
  isOpen: boolean
  step: AuthStep
  intent: AuthIntent
  phone: string
  phoneDisplay: string
  maskedPhone: string
  otpDigits: string[]
  otpLength: number
  otpCodeLength: number
  resendIn: number
  loading: boolean
  isCompletingAuth: boolean
  error: string
  canSendOtp: boolean
  onClose: () => void
  onSelectPhone: () => void
  onBackToMethod: () => void
  onChangePhone: () => void
  onPhoneChange: (value: string) => void
  onSendOtp: () => void
  onGoogleLogin: () => void
  onVerifyOtp: () => void
  onResendOtp: () => void
  onOtpDigitChange: (index: number, value: string) => void
  onOtpKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void
  onOtpPaste: (event: ClipboardEvent<HTMLInputElement>) => void
  setOtpInputRef: (index: number, element: HTMLInputElement | null) => void
  phoneInputRef: RefObject<HTMLInputElement | null>
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" role="img">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.46a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.08 3.55-5.15 3.55-8.67Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.46 1.14-4.07 1.14-3.12 0-5.77-2.1-6.72-4.92H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.31A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.31V6.59H1.27A12 12 0 0 0 0 12c0 1.93.46 3.75 1.27 5.41l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.33.61 4.57 1.81l3.43-3.43C17.95 1.2 15.24 0 12 0A12 12 0 0 0 1.27 6.59l4.01 3.1c.95-2.82 3.6-4.92 6.72-4.92Z" />
    </svg>
  )
}

function PendingActionHint({ intent }: { intent: AuthIntent }) {
  if (intent === 'general') return null

  const actionLabel =
    intent === 'buyNow'
      ? 'Buy Now'
      : intent === 'addToCart'
        ? 'Add to Cart'
        : intent === 'wishlist'
          ? 'Wishlist'
          : 'Checkout'

  return (
    <p className="mt-4 text-xs text-neutral-500">
      Login completes your {actionLabel} action automatically.
    </p>
  )
}

export default function LoginModal(props: Partial<LoginModalProps> = {}) {
  if (!props.isOpen) return null

  const {
  step = 'method',
  intent = 'general',
  phoneDisplay = '',
  maskedPhone = '',
  otpDigits = [],
  otpLength = 6,
  otpCodeLength = 0,
  resendIn = 0,
  loading = false,
  isCompletingAuth = false,
  error,
  canSendOtp = false,
  onClose = () => {},
  onSelectPhone = () => {},
  onBackToMethod = () => {},
  onChangePhone = () => {},
  onPhoneChange = () => {},
  onSendOtp = () => {},
  onGoogleLogin = () => {},
  onVerifyOtp = () => {},
  onResendOtp = () => {},
  onOtpDigitChange = () => {},
  onOtpKeyDown = () => {},
  onOtpPaste = () => {},
  setOtpInputRef = () => {},
  phoneInputRef,
  } = props

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-2 sm:items-center sm:p-4">
      <div className="w-[95%] max-h-[88vh] overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.18)] sm:w-full sm:max-w-[420px] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Continue to Crown &amp; Crest</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-transparent p-2 text-neutral-500 transition hover:border-neutral-200 hover:text-neutral-900"
            aria-label="Close login modal"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'method' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={onSelectPhone}
                className="h-12 w-full rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-900"
              >
                Continue with Phone
              </button>

              <div className="text-center text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">OR</div>

              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleLogo />
                {loading ? 'Please wait...' : 'Continue with Google'}
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-neutral-900">Enter your phone number</h3>

              <div className="flex h-12 items-center gap-3 rounded-xl border border-neutral-300 px-4 focus-within:border-neutral-900">
                <span className="text-sm font-semibold text-neutral-700">+91</span>
                <input
                  ref={phoneInputRef}
                  id="auth-phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phoneDisplay}
                  onChange={e => onPhoneChange(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full border-none bg-transparent text-sm text-neutral-900 outline-none"
                  aria-label="Phone number"
                />
              </div>

              <button
                type="button"
                onClick={onSendOtp}
                disabled={loading || !canSendOtp}
                className="h-12 w-full rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <p className="text-xs text-neutral-500">
                By continuing you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-900">
                  Terms &amp; Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-neutral-900">
                  Privacy Policy
                </Link>
                . Refund and cancellation terms are covered in our{' '}
                <Link href="/refund-policy" className="underline underline-offset-2 hover:text-neutral-900">
                  Refund Policy
                </Link>{' '}
                and{' '}
                <Link href="/cancellation-policy" className="underline underline-offset-2 hover:text-neutral-900">
                  Cancellation Policy
                </Link>
                .
              </p>

              <button
                type="button"
                onClick={onBackToMethod}
                className="w-full text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
              >
                Back
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-neutral-900">Enter verification code</h3>
              <p className="text-sm text-neutral-600">We sent a code to {maskedPhone}</p>

              <div className="flex items-center justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => setOtpInputRef(idx, el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => onOtpDigitChange(idx, e.target.value)}
                    onKeyDown={e => onOtpKeyDown(idx, e)}
                    onPaste={onOtpPaste}
                    className="h-14 w-12 rounded-xl border border-neutral-300 text-center text-xl font-semibold text-neutral-900 outline-none transition focus:border-neutral-900"
                    aria-label={`OTP digit ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={loading || otpCodeLength !== otpLength}
                className="h-12 w-full rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              {resendIn > 0 ? (
                <p className="text-center text-sm text-neutral-500">Resend code in {resendIn} seconds</p>
              ) : (
                <button
                  type="button"
                  onClick={onResendOtp}
                  disabled={loading}
                  className="w-full text-sm font-semibold text-neutral-700 transition hover:text-neutral-900 disabled:opacity-60"
                >
                  Resend OTP
                </button>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={onChangePhone}
                className="w-full text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
              >
                Change phone number
              </button>
            </div>
          )}

          {isCompletingAuth && (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              Signing you in...
            </div>
          )}

          <PendingActionHint intent={intent} />
        </div>
      </div>
    </div>
  )
}
