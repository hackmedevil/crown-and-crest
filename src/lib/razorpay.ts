import Razorpay from 'razorpay'

let razorpayInstance: Razorpay | null = null

function getRazorpayInstance() {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys are missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.')
    }

    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }

  return razorpayInstance
}

export const razorpay = new Proxy({} as Razorpay, {
  get(target, prop) {
    return getRazorpayInstance()[prop as keyof Razorpay]
  },
})

export async function createRazorpayOrder(
  amount: number,
  receipt: string,
  notes?: Record<string, string>
) {
  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: 'INR',
    receipt,
    notes,
  })
}

/**
 * Fetch all active offers from Razorpay
 */
export async function getRazorpayOffers() {
  try {
    const response = await fetch('https://api.razorpay.com/v1/offers', {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString('base64'),
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Razorpay offers API failed: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('[RAZORPAY] Failed to fetch offers:', error)
    throw error
  }
}

/**
 * Get a specific offer by ID
 */
export async function getRazorpayOffer(offerId: string) {
  try {
    const response = await fetch(`https://api.razorpay.com/v1/offers/${offerId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
        ).toString('base64'),
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`Razorpay offer API failed: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('[RAZORPAY] Failed to fetch offer:', error)
    throw error
  }
}
