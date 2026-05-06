// Shiprocket Pincode Serviceability Module

import { shiprocketRequest } from './client'
import { ShiprocketPincodeServiceability } from './types'

// Simple in-memory cache for pincode serviceability (1 hour TTL)
const pincodeCache = new Map<string, { data: ServiceabilityResult; expiresAt: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export interface ServiceabilityResult {
  serviceable: boolean
  codAvailable: boolean
  estimatedDays: number
  prepaidAvailable?: boolean
}

/**
 * Check if a pincode is serviceable via Shiprocket
 * Returns COD availability and delivery estimate
 * 
 * @param deliveryPincode - 6-digit Indian pincode
 * @param pickupPincode - Optional pickup pincode (defaults to your warehouse pincode)
 */
export async function checkPincodeServiceability(
  deliveryPincode: string,
  pickupPincode?: string
): Promise<ServiceabilityResult> {
  // Validate pincode format
  if (!/^\d{6}$/.test(deliveryPincode)) {
    throw new Error('Invalid pincode format. Must be 6 digits.')
  }

  // Check cache
  const cacheKey = `${pickupPincode || 'default'}-${deliveryPincode}`
  const cached = pincodeCache.get(cacheKey)
  
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[SHIPROCKET_PINCODE] Using cached result for:', deliveryPincode)
    return cached.data
  }

  try {
    // Call Shiprocket serviceability API
    const response = await shiprocketRequest<{ data: ShiprocketPincodeServiceability }>(
      '/courier/serviceability',
      {
        method: 'GET',
        params: {
          delivery_postcode: deliveryPincode,
          ...(pickupPincode && { pickup_postcode: pickupPincode }),
          cod: 1, // Check COD availability
          weight: 0.5, // Default weight for quick check
        },
      }
    )

    const serviceabilityData = response.data

    const result: ServiceabilityResult = {
      serviceable: serviceabilityData.serviceable,
      codAvailable: serviceabilityData.cod_available,
      estimatedDays: serviceabilityData.estimated_delivery_days || 7, // Default 7 days if not provided
      prepaidAvailable: serviceabilityData.prepaid_available,
    }

    // Cache the result
    pincodeCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL,
    })

    console.log('[SHIPROCKET_PINCODE] Serviceability checked:', deliveryPincode, result)
    return result

  } catch (error) {
    console.error('[SHIPROCKET_PINCODE] Error checking serviceability:', error)
    
    // Graceful degradation: assume serviceable with conservative estimates
    console.warn('[SHIPROCKET_PINCODE] Falling back to default serviceability for:', deliveryPincode)
    return {
      serviceable: true,
      codAvailable: true, // Default to COD available (Razorpay will do final validation)
      estimatedDays: 7,
      prepaidAvailable: true,
    }
  }
}

/**
 * Clear pincode cache (useful for testing)
 */
export function clearPincodeCache(): void {
  pincodeCache.clear()
  console.log('[SHIPROCKET_PINCODE] Cache cleared')
}
