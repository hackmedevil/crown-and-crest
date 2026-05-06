'use client'

import { useState, useEffect } from 'react'
import { Phone, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { RecaptchaVerifier, signInWithPhoneNumber, linkWithPhoneNumber } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

interface PhoneVerificationModalProps {
    isOpen: boolean
    onClose: () => void
    phoneNumber: string
    onVerified: () => void
    verifyOnly?: boolean  // If true, only verify OTP without linking to account
}

type VerificationState = 'IDLE' | 'SENDING_OTP' | 'OTP_SENT' | 'VERIFYING' | 'VERIFIED' | 'ERROR'

export default function PhoneVerificationModal({
    isOpen,
    onClose,
    phoneNumber,
    onVerified,
    verifyOnly = false
}: PhoneVerificationModalProps) {
    const [state, setState] = useState<VerificationState>('IDLE')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [resendTimer, setResendTimer] = useState(0)
    const [confirmationResult, setConfirmationResult] = useState<any>(null)
    const recaptchaContainerId = 'phone-verification-recaptcha-container'

    // Start resend timer
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
            return () => clearTimeout(timer)
        }
        return undefined
    }, [resendTimer])

    // Setup reCAPTCHA on mount
    useEffect(() => {
        if (!isOpen) return

        const setupRecaptcha = async () => {
            try {
                if (!auth) {
                    setError('Phone verification is unavailable. Please check configuration and try again.')
                    setState('ERROR')
                    return
                }

                const container = document.getElementById(recaptchaContainerId)
                if (!container) return

                if ((window as any).recaptchaVerifier) {
                    try {
                        (window as any).recaptchaVerifier.clear()
                    } catch {
                        // Ignore cleanup errors
                    }
                    ;(window as any).recaptchaVerifier = undefined
                }

                container.innerHTML = ''

                ;(window as any).recaptchaVerifier = new RecaptchaVerifier(
                    auth,
                    recaptchaContainerId,
                    {
                        size: 'invisible',
                        callback: () => {
                            // reCAPTCHA solved
                        }
                    }
                )
            } catch (error) {
                console.error('reCAPTCHA setup error:', error)
            }
        }

        setupRecaptcha()

        return () => {
            if ((window as any).recaptchaVerifier) {
                try {
                    (window as any).recaptchaVerifier.clear()
                } catch {
                    // Ignore cleanup errors
                }
                ;(window as any).recaptchaVerifier = undefined
            }

            const container = document.getElementById(recaptchaContainerId)
            if (container) {
                container.innerHTML = ''
            }
        }
    }, [isOpen])

    const sendOTP = async () => {
        setState('SENDING_OTP')
        setError('')

        try {
            if (!auth) {
                setError('Phone verification is unavailable. Please check configuration and try again.')
                setState('ERROR')
                return
            }
            const appVerifier = (window as any).recaptchaVerifier
            const user = auth.currentUser

            if (!user) {
                throw new Error('No authenticated user')
            }

            // Link phone to existing account (or just verify if verifyOnly)
            const confirmation = verifyOnly
                ? await signInWithPhoneNumber(auth, phoneNumber, appVerifier)
                : await linkWithPhoneNumber(user, phoneNumber, appVerifier)
            setConfirmationResult(confirmation)
            setState('OTP_SENT')
            setResendTimer(30) // 30 second cooldown
        } catch (error: unknown) {
            console.error('Send OTP error:', error)

            const firebaseError = error as { code?: string }
            let errorMessage = 'Failed to send OTP'
            if (firebaseError.code === 'auth/too-many-requests') {
                errorMessage = 'Too many attempts. Please try again later.'
            } else if (firebaseError.code === 'auth/invalid-phone-number') {
                errorMessage = 'Invalid phone number format'
            } else if (firebaseError.code === 'auth/provider-already-linked') {
                errorMessage = 'This phone is already linked to your account'
                setState('VERIFIED')
                setTimeout(() => onVerified(), 1000)
                return
            }

            setError(errorMessage)
            setState('ERROR')
        }
    }

    const verifyOTP = async () => {
        if (!confirmationResult || otp.length !== 6) {
            setError('Please enter 6-digit OTP')
            return
        }

        setState('VERIFYING')
        setError('')

        try {
            await confirmationResult.confirm(otp)
            setState('VERIFIED')

            // Success - close modal and notify parent
            setTimeout(() => {
                onVerified()
                onClose()
            }, 1500)
        } catch (error: unknown) {
            console.error('Verify OTP error:', error)

            const firebaseError = error as { code?: string }
            let errorMessage = 'Invalid OTP'
            if (firebaseError.code === 'auth/invalid-verification-code') {
                errorMessage = 'Invalid OTP. Please check and try again.'
            } else if (firebaseError.code === 'auth/code-expired') {
                errorMessage = 'OTP expired. Please request a new one.'
            }

            setError(errorMessage)
            setState('ERROR')
        }
    }

    const handleResend = () => {
        if (resendTimer > 0) return
        setOtp('')
        setState('IDLE')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 relative animate-fade-in">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    disabled={state === 'SENDING_OTP' || state === 'VERIFYING'}
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Verify Phone Number</h2>
                        <p className="text-sm text-gray-500">{phoneNumber}</p>
                    </div>
                </div>

                {/* reCAPTCHA container (invisible) */}
                <div id={recaptchaContainerId}></div>

                {/* Content based on state */}
                {(state === 'IDLE' || state === 'SENDING_OTP') && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            We'll send a 6-digit OTP to verify your phone number. Standard SMS rates may apply.
                        </p>
                        <button
                            onClick={sendOTP}
                            disabled={state === 'SENDING_OTP'}
                            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {state === 'SENDING_OTP' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending OTP...
                                </>
                            ) : (
                                'Send OTP'
                            )}
                        </button>
                    </div>
                )}

                {(state === 'OTP_SENT' || state === 'VERIFYING') && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter 6-digit OTP
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest"
                                placeholder="000000"
                                disabled={state === 'VERIFYING'}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={verifyOTP}
                            disabled={state === 'VERIFYING' || otp.length !== 6}
                            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {state === 'VERIFYING' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify OTP'
                            )}
                        </button>

                        {/* Resend */}
                        <div className="text-center">
                            {resendTimer > 0 ? (
                                <p className="text-sm text-gray-500">
                                    Resend OTP in {resendTimer}s
                                </p>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    className="text-sm text-primary font-semibold hover:underline"
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {state === 'VERIFIED' && (
                    <div className="text-center py-8">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Phone Verified!</h3>
                        <p className="text-sm text-gray-600">Your phone number has been successfully verified.</p>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
