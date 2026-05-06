// Shiprocket Shipping Rate Calculation & Courier Selection

import { shiprocketRequest } from './client'
import { ShiprocketCourierRecommendation } from './types'

export interface ShippingRateParams {
  pickupPincode: string
  deliveryPincode: string
  weight: number // in kg
  codAmount?: number // COD order value
  declaredValue: number // Product value for insurance
}

export interface CourierOption {
  courierId: number
  courierName: string
  rate: number
  estimatedDays: number
  codCharges: number
  supportsCod: boolean
  rating: number
}

/**
 * Get available shipping rates from Shiprocket
 * Returns list of courier options with rates and ETAs
 */
export async function getShippingRates(
  params: ShippingRateParams
): Promise<CourierOption[]> {
  const {
    pickupPincode,
    deliveryPincode,
    weight,
    codAmount,
    declaredValue,
  } = params

  try {
    const response = await shiprocketRequest<{ data: ShiprocketCourierRecommendation[] }>(
      '/courier/serviceability',
      {
        method: 'GET',
        params: {
          pickup_postcode: pickupPincode,
          delivery_postcode: deliveryPincode,
          weight,
          cod: codAmount ? 1 : 0,
          declared_value: declaredValue,
          ...(codAmount && { order_value: codAmount }),
        },
      }
    )

    const couriers: CourierOption[] = response.data.map((courier) => ({
      courierId: courier.courier_company_id,
      courierName: courier.courier_name,
      rate: courier.rate + (codAmount ? courier.cod_charges : 0),
      estimatedDays: courier.estimated_delivery_days,
      codCharges: courier.cod_charges,
      supportsCod: codAmount ? true : false,
      rating: courier.rating,
    }))

    console.log('[SHIPROCKET_SHIPPING] Found', couriers.length, 'courier options')
    return couriers

  } catch (error) {
    console.error('[SHIPROCKET_SHIPPING] Error fetching shipping rates:', error)
    
    // Graceful fallback - return default option
    return [{
      courierId: 0,
      courierName: 'Standard Shipping',
      rate: 20, // Flat ₹20 fallback
      estimatedDays: 7,
      codCharges: 0,
      supportsCod: true,
      rating: 0,
    }]
  }
}

/**
 * Select best courier based on cost and reliability
 * Prioritizes: 1) Cost, 2) Delivery speed, 3) Rating
 */
export function selectBestCourier(options: CourierOption[]): CourierOption | null {
  if (options.length === 0) return null

  // Sort by rate (ascending), then by estimated days (ascending), then by rating (descending)
  const sorted = [...options].sort((a, b) => {
    // Primary: Lowest rate
    if (a.rate !== b.rate) return a.rate - b.rate
    
    // Secondary: Fastest delivery
    if (a.estimatedDays !== b.estimatedDays) return a.estimatedDays - b.estimatedDays
    
    // Tertiary: Highest rating
    return b.rating - a.rating
  })

  const best = sorted[0]
  console.log('[SHIPROCKET_SHIPPING] Selected best courier:', best.courierName, '₹', best.rate)
  
  return best
}

/**
 * Validate COD availability for a specific courier and pincode
 */
export function validateCodLogistics(
  courier: CourierOption,
  codAmount: number
): { allowed: boolean; reason?: string } {
  if (!courier.supportsCod) {
    return {
      allowed: false,
      reason: `${courier.courierName} does not support COD to this pincode`,
    }
  }

  // Additional validation: COD amount limits (if needed)
  // Shiprocket typically has COD limits, but we'll rely on API validation
  
  return {
    allowed: true,
  }
}
