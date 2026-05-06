import { supabaseAdmin } from '@/lib/supabase/admin'
import { ensureSupplierConfig, SupplierConfigPayload } from './provider-config'

const QIKINK_SANDBOX_URL = 'https://sandbox.qikink.com'

interface RequestAttemptResult {
  ok: boolean
  status: number
  token?: string | null
  expiresIn?: number | string | null
  message: string
}

interface SupplierOrderRequestResult {
  ok: boolean
  status: number
  message: string
  payload: Record<string, unknown> | null
}

export interface SupplierConnectionTestResult {
  ok: boolean
  status: 'OK' | 'FAILED'
  message: string
  details?: Record<string, unknown>
}

export interface SupplierOrderCreateResult {
  ok: true
  providerName: string
  orderNumber: string
  details?: Record<string, unknown>
}

interface SupplierOrderRow {
  id: string
  amount: number
  created_at: string
  is_cod: boolean | null
  customer_email: string | null
  customer_phone: string | null
  shipping_address: unknown
  order_items: SupplierOrderItemRow[]
}

interface SupplierOrderItemRow {
  quantity: number
  variant_id: string
  product_name?: string | null
  variants?:
    | {
        sku?: string | null
      }
    | Array<{
        sku?: string | null
      }>
}

interface QikinkOrderLineItem {
  search_from_my_products: 1
  quantity: number
  sku: string
}

interface QikinkShippingAddress {
  first_name: string
  last_name?: string
  address1: string
  address2?: string
  phone: string
  email: string
  city: string
  zip: number
  province: string
  country_code: string
}

interface QikinkCreateOrderPayload {
  order_number: string
  qikink_shipping: 1
  gateway: 'COD' | 'Prepaid'
  total_order_value: number
  line_items: QikinkOrderLineItem[]
  shipping_address: QikinkShippingAddress
}

function normalizeBaseUrl(config: SupplierConfigPayload) {
  if (config.api_base_url) {
    return config.api_base_url.replace(/\/+$/, '')
  }

  return QIKINK_SANDBOX_URL
}

async function parseResponse(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return { raw: text }
  }
}

function extractToken(payload: Record<string, unknown> | null) {
  if (!payload) {
    return null
  }

  if (typeof payload.Accesstoken === 'string' && payload.Accesstoken.trim()) {
    const rawExpiresIn = payload.expires_in
    const expiresIn =
      typeof rawExpiresIn === 'number' || typeof rawExpiresIn === 'string'
        ? rawExpiresIn
        : null

    return {
      token: payload.Accesstoken.trim(),
      expiresIn,
    }
  }

  return null
}

async function requestQikinkToken(baseUrl: string, clientId: string, clientSecret: string): Promise<RequestAttemptResult> {
  const response = await fetch(`${baseUrl}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      ClientId: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  const payload = await parseResponse(response)
  const token = extractToken(payload)

  if (response.ok && token) {
    return {
      ok: true,
      status: response.status,
      token: token.token,
      expiresIn: token.expiresIn ?? null,
      message: 'Token generated successfully',
    }
  }

  return {
    ok: false,
    status: response.status,
    message:
      (payload && typeof payload.message === 'string' && payload.message) ||
      (payload && typeof payload.error === 'string' && payload.error) ||
      (payload && typeof payload.raw === 'string' && payload.raw) ||
      `Token request failed with status ${response.status}`,
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function extractVariant(value: SupplierOrderItemRow['variants']) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return {
      firstName: '',
      lastName: '',
    }
  }

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function normalizeGateway(isCod: boolean | null | undefined): 'COD' | 'Prepaid' {
  return isCod ? 'COD' : 'Prepaid'
}

function normalizeZip(value: unknown) {
  const digits = String(value || '').replace(/\D+/g, '')
  return digits ? Number(digits) : NaN
}

function normalizeCountryCode(address: Record<string, unknown>) {
  const rawCountryCode = address.country_code || address.countryCode
  if (typeof rawCountryCode === 'string' && rawCountryCode.trim()) {
    return rawCountryCode.trim().toUpperCase()
  }

  const rawCountry = address.country
  if (typeof rawCountry === 'string' && rawCountry.trim().toUpperCase() === 'INDIA') {
    return 'IN'
  }

  return 'IN'
}

function buildShippingAddress(order: SupplierOrderRow): QikinkShippingAddress {
  const address = asRecord(order.shipping_address)
  if (!address) {
    throw new Error('Order missing shipping address for supplier fulfillment.')
  }

  const fullName = typeof address.fullName === 'string' && address.fullName.trim() ? address.fullName.trim() : ''
  const { firstName, lastName } = splitFullName(fullName)
  const email =
    (typeof order.customer_email === 'string' && order.customer_email.trim() && order.customer_email.trim()) ||
    (typeof address.email === 'string' && address.email.trim() && address.email.trim()) ||
    ''
  const phone =
    (typeof order.customer_phone === 'string' && order.customer_phone.trim() && order.customer_phone.trim()) ||
    (typeof address.phone === 'string' && address.phone.trim() && address.phone.trim()) ||
    ''
  const zip = normalizeZip(address.pincode || address.zip)
  const province = typeof address.state === 'string' ? address.state.trim() : ''
  const city = typeof address.city === 'string' ? address.city.trim() : ''
  const address1 = typeof address.addressLine1 === 'string' ? address.addressLine1.trim() : ''
  const address2 = typeof address.addressLine2 === 'string' ? address.addressLine2.trim() : ''

  if (!firstName) {
    throw new Error('Shipping address full name is required for supplier fulfillment.')
  }

  if (!address1) {
    throw new Error('Shipping address line 1 is required for supplier fulfillment.')
  }

  if (!phone) {
    throw new Error('Customer phone is required for supplier fulfillment.')
  }

  if (!email) {
    throw new Error('Customer email is required for supplier fulfillment.')
  }

  if (!city) {
    throw new Error('Shipping city is required for supplier fulfillment.')
  }

  if (!Number.isFinite(zip)) {
    throw new Error('Shipping pincode is required for supplier fulfillment.')
  }

  if (!province) {
    throw new Error('Shipping state is required for supplier fulfillment.')
  }

  return {
    first_name: firstName,
    last_name: lastName || undefined,
    address1,
    address2: address2 || undefined,
    phone,
    email,
    city,
    zip,
    province,
    country_code: normalizeCountryCode(address),
  }
}

function buildLineItems(order: SupplierOrderRow): QikinkOrderLineItem[] {
  if (!Array.isArray(order.order_items) || order.order_items.length === 0) {
    throw new Error('Order has no items to submit to supplier.')
  }

  return order.order_items.map((item, index) => {
    const variant = extractVariant(item.variants)
    const sku = typeof variant?.sku === 'string' ? variant.sku.trim() : ''

    if (!sku) {
      throw new Error(`Order item ${index + 1} is missing a supplier SKU.`)
    }

    if (!Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new Error(`Order item ${index + 1} has an invalid quantity.`)
    }

    return {
      search_from_my_products: 1,
      quantity: item.quantity,
      sku,
    }
  })
}

async function submitQikinkOrder(
  baseUrl: string,
  clientId: string,
  accessToken: string,
  payload: QikinkCreateOrderPayload
): Promise<SupplierOrderRequestResult> {
  const response = await fetch(`${baseUrl}/api/order/create`, {
    method: 'POST',
    headers: {
      ClientId: clientId,
      Accesstoken: accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responsePayload = await parseResponse(response)

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      message: 'Supplier order created successfully.',
      payload: responsePayload,
    }
  }

  return {
    ok: false,
    status: response.status,
    message:
      (responsePayload && typeof responsePayload.message === 'string' && responsePayload.message) ||
      (responsePayload && typeof responsePayload.error === 'string' && responsePayload.error) ||
      (responsePayload && typeof responsePayload.raw === 'string' && responsePayload.raw) ||
      `Supplier order request failed with status ${response.status}`,
    payload: responsePayload,
  }
}

export async function createSupplierOrder(orderId: string): Promise<SupplierOrderCreateResult> {
  const rawConfig = await ensureSupplierConfig()
  const config = rawConfig as unknown as SupplierConfigPayload & {
    is_enabled?: boolean
  }

  if (!config.is_enabled) {
    throw new Error('Supplier fulfillment is disabled.')
  }

  const operationalConfig = asRecord(config.operational_config) || {}

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      amount,
      created_at,
      is_cod,
      customer_email,
      customer_phone,
      shipping_address,
      order_items (
        quantity,
        variant_id,
        product_name,
        variants:variant_id (
          sku
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (error || !order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  if (order.is_cod && operationalConfig.supports_cod === false) {
    throw new Error('Supplier configuration does not allow COD orders.')
  }

  if (!order.is_cod && operationalConfig.supports_prepaid === false) {
    throw new Error('Supplier configuration does not allow prepaid orders.')
  }

  const authType = config.auth_type || 'qikink_token'
  if (authType !== 'qikink_token') {
    throw new Error(`Auth type ${authType} is not supported by the current documented Qikink flow.`)
  }

  const clientId = config.auth_config.api_key?.trim() || ''
  const clientSecret = config.auth_config.api_secret?.trim() || ''

  if (!clientId || !clientSecret) {
    throw new Error('Supplier Client ID and Client Secret are required.')
  }

  const baseUrl = normalizeBaseUrl(config)
  const tokenResult = await requestQikinkToken(baseUrl, clientId, clientSecret)
  if (!tokenResult.ok || !tokenResult.token) {
    throw new Error(tokenResult.message)
  }

  const typedOrder = order as unknown as SupplierOrderRow
  const payload: QikinkCreateOrderPayload = {
    order_number: typedOrder.id,
    qikink_shipping: 1,
    gateway: normalizeGateway(typedOrder.is_cod),
    total_order_value: typedOrder.amount,
    line_items: buildLineItems(typedOrder),
    shipping_address: buildShippingAddress(typedOrder),
  }

  const submitResult = await submitQikinkOrder(baseUrl, clientId, tokenResult.token, payload)
  if (!submitResult.ok) {
    throw new Error(submitResult.message)
  }

  await supabaseAdmin
    .from('orders')
    .update({
      courier_name: config.provider_name || 'Supplier Direct',
      shipment_status: 'CREATED',
      last_tracking_update: new Date().toISOString(),
    })
    .eq('id', orderId)

  return {
    ok: true,
    providerName: config.provider_name || 'Supplier Direct',
    orderNumber: payload.order_number,
    details: submitResult.payload || undefined,
  }
}

export async function testSupplierConnection(config: SupplierConfigPayload): Promise<SupplierConnectionTestResult> {
  const baseUrl = normalizeBaseUrl(config)
  const clientId = config.auth_config.api_key?.trim() || ''
  const secretOrToken = config.auth_config.api_secret?.trim() || ''

  if (!clientId) {
    return {
      ok: false,
      status: 'FAILED',
      message: 'Client ID is required before testing the supplier connection.',
    }
  }

  if (!secretOrToken) {
    return {
      ok: false,
      status: 'FAILED',
      message: 'Client secret is required before testing the supplier connection.',
    }
  }

  try {
    const authType = config.auth_type || 'qikink_token'

    if (authType !== 'qikink_token') {
      return {
        ok: false,
        status: 'FAILED',
        message: `Auth type ${authType} is not supported by the current documented Qikink flow.`,
        details: {
          baseUrl,
          mode: authType,
        },
      }
    }

    const tokenResult = await requestQikinkToken(baseUrl, clientId, secretOrToken)
    if (!tokenResult.ok) {
      return {
        ok: false,
        status: 'FAILED',
        message: tokenResult.message,
        details: {
          baseUrl,
          mode: 'token-generation',
          httpStatus: tokenResult.status,
        },
      }
    }

    return {
      ok: true,
      status: 'OK',
      message: 'Token generated successfully.',
      details: {
        baseUrl,
        mode: 'token-generation',
        httpStatus: tokenResult.status,
        expiresIn: tokenResult.expiresIn ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Supplier connection test failed.',
      details: {
        baseUrl,
      },
    }
  }
}