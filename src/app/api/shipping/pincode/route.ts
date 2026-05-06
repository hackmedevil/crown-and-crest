import { NextRequest, NextResponse } from 'next/server'
import { checkPincodeServiceability } from '@/lib/shiprocket/pincode'

/**
 * Public API: Check Pincode Serviceability
 * 
 * Used by:
 * - Product Detail Page (Check Delivery availability)
 * - Checkout flow (informational)
 * 
 * No authentication required (customer-facing)
 */
export async function POST(req: NextRequest) {
  try {
    const { pincode } = await req.json()

    // Validate pincode
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: 'Invalid pincode. Must be 6 digits.' },
        { status: 400 }
      )
    }

    console.log('[PINCODE_API] Checking serviceability for:', pincode)

    // Check serviceability via Shiprocket
    const result = await checkPincodeServiceability(pincode)

    return NextResponse.json({
      serviceable: result.serviceable,
      cod_available: result.codAvailable,
      estimated_days: result.estimatedDays,
      prepaid_available: result.prepaidAvailable,
    })

  } catch (error) {
    console.error('[PINCODE_API] Error:', error)
    
    // Return graceful fallback
    return NextResponse.json({
      serviceable: true,
      cod_available: true,
      estimated_days: 7,
      prepaid_available: true,
    })
  }
}
