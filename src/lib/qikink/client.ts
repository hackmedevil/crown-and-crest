// Qikink API Client
// Handles token auth (with in-process caching), order creation, and order listing.
// All credentials are read from QIKINK_CLIENT_ID / QIKINK_CLIENT_SECRET env vars.

import {
  QikinkTokenResponse,
  QikinkCreateOrderRequest,
  QikinkCreateOrderResponse,
  QikinkOrder,
} from './types'

const QIKINK_API = 'https://api.qikink.com/api'
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // refresh 5 min before expiry

// In-process token cache (valid for the lifetime of a single serverless warm instance)
let cachedToken: { clientId: string; token: string; expiresAt: number } | null = null

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.QIKINK_CLIENT_ID
  const clientSecret = process.env.QIKINK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET must be set in environment variables')
  }
  return { clientId, clientSecret }
}

/**
 * Fetch a fresh token directly from Qikink.
 * Used by getQikinkToken() and the public /api/providers/qikink/token proxy.
 */
export async function fetchQikinkToken(
  clientId: string,
  clientSecret: string
): Promise<QikinkTokenResponse> {
  const response = await fetch(`${QIKINK_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ClientId: clientId, client_secret: clientSecret }).toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Qikink token request failed: ${response.status} – ${text}`)
  }

  const data: QikinkTokenResponse = await response.json()
  if (!data.Accesstoken) {
    throw new Error('Qikink returned no Accesstoken')
  }
  return data
}

/**
 * Get a valid Qikink access token, using the in-process cache when possible.
 */
export async function getQikinkToken(): Promise<{ clientId: string; token: string }> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_EXPIRY_BUFFER_MS) {
    return { clientId: cachedToken.clientId, token: cachedToken.token }
  }

  const { clientId, clientSecret } = getCredentials()
  const data = await fetchQikinkToken(clientId, clientSecret)

  const expiresInMs = (typeof data.expires_in === 'number' ? data.expires_in : 3600) * 1000
  cachedToken = {
    clientId: data.ClientId || clientId,
    token: data.Accesstoken,
    expiresAt: Date.now() + expiresInMs,
  }

  return { clientId: cachedToken.clientId, token: cachedToken.token }
}

/**
 * POST /api/order/create – submit a fulfillment order to Qikink.
 */
export async function createQikinkOrder(
  payload: QikinkCreateOrderRequest
): Promise<QikinkCreateOrderResponse> {
  const { clientId, token } = await getQikinkToken()

  const response = await fetch(`${QIKINK_API}/order/create`, {
    method: 'POST',
    headers: {
      ClientId: clientId,
      Accesstoken: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Qikink create order failed: ${response.status} – ${text}`)
  }

  return response.json() as Promise<QikinkCreateOrderResponse>
}

/**
 * GET /api/order – fetch all orders from Qikink.
 * Returns a flat array regardless of whether the API responds with an array or { data: [...] }.
 */
export async function fetchQikinkOrders(): Promise<QikinkOrder[]> {
  const { clientId, token } = await getQikinkToken()

  const response = await fetch(`${QIKINK_API}/order`, {
    headers: {
      ClientId: clientId,
      Accesstoken: token,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Qikink fetch orders failed: ${response.status} – ${text}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : ((data as { data?: QikinkOrder[] }).data ?? [])
}
