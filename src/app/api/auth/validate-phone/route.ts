import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { getCurrentUser } from '@/lib/auth'

/**
 * Phone Validation API
 * 
 * Checks if a phone number is available for verification or already registered
 * Prevents phone hijacking by verifying ownership
 */
export async function POST(req: NextRequest) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { phoneNumber } = await req.json()

    // Validate phone number format
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    // Ensure E.164 format (+91XXXXXXXXXX)
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+91${phoneNumber.replace(/^0+/, '')}`

    try {
      // Check if phone exists in Firebase Auth
      const userRecord = await adminAuth.getUserByPhoneNumber(formattedPhone)

      // Phone exists - check ownership
      if (userRecord.uid === currentUser.uid) {
        // Phone belongs to current user
        return NextResponse.json({
          status: 'OWNED_BY_USER',
          needsVerification: false,
          message: 'This is your verified phone number'
        })
      } else {
        // Phone belongs to different user - SECURITY BLOCK
        return NextResponse.json({
          status: 'OWNED_BY_OTHER',
          needsVerification: false,
          message: 'This number is already registered to another account. Please use a different number.'
        })
      }
    } catch (error: unknown) {
      // Phone not found in Firebase - available for verification
      const firebaseError = error as { code?: string }
      if (firebaseError.code === 'auth/user-not-found') {
        return NextResponse.json({
          status: 'AVAILABLE',
          needsVerification: true,
          message: 'Phone verification required',
          formattedPhone
        })
      }

      // Other Firebase errors
      console.error('[validate-phone] Firebase error:', error)
      return NextResponse.json(
        { error: 'Failed to validate phone number' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[validate-phone] Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
