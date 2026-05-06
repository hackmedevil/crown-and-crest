import { NextRequest, NextResponse } from 'next/server'
import {
  assertAdmin,
  ensureSupplierConfig,
  isMissingSupplierConfigTableError,
  sanitizeSupplierConfigPayload,
  updateSupplierTestStatus,
} from '@/lib/shipping/provider-config'
import { testSupplierConnection } from '@/lib/shipping/supplier-provider'

export async function POST(req: NextRequest) {
  try {
    const auth = await assertAdmin()
    if (auth.error) return auth.error

    await ensureSupplierConfig()

    const body = await req.json()
    const config = sanitizeSupplierConfigPayload(body)
    const result = await testSupplierConnection(config)
    const savedConfig = await updateSupplierTestStatus(result.status, result.message)

    return NextResponse.json({
      ok: result.ok,
      result,
      config: savedConfig,
    })
  } catch (error) {
    if (isMissingSupplierConfigTableError(error) || (error instanceof Error && error.message.startsWith('MIGRATION_REQUIRED:'))) {
      return NextResponse.json(
        {
          error: 'shipping_provider_configs table is missing. Run the latest shipping provider migration.',
          code: 'MIGRATION_REQUIRED',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}