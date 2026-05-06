import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  assertAdmin,
  ensureSupplierConfig,
  isMissingSupplierConfigTableError,
  sanitizeSupplierConfigPayload,
  SUPPLIER_PROVIDER_KEY,
} from '../../../../../lib/shipping/provider-config'

export async function GET() {
  try {
    const auth = await assertAdmin()
    if (!auth || auth.error) {
      return auth?.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await ensureSupplierConfig()
    return NextResponse.json({ config })
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

export async function PUT(req: NextRequest) {
  try {
    const auth = await assertAdmin()
    if (!auth || auth.error) {
      return auth?.error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await ensureSupplierConfig()
    const body = await req.json()
    const payload = sanitizeSupplierConfigPayload(body)

    payload.last_test_status = payload.last_test_status ?? existing.last_test_status ?? null
    payload.last_test_message = payload.last_test_message ?? existing.last_test_message ?? null
    payload.last_tested_at = payload.last_tested_at ?? existing.last_tested_at ?? null

    const { data, error } = await supabaseAdmin
      .from('shipping_provider_configs')
      .upsert(
        {
          provider_key: SUPPLIER_PROVIDER_KEY,
          ...payload,
        },
        { onConflict: 'provider_key' }
      )
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, config: data })
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
