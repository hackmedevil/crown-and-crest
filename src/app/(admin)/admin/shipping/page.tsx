'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  MapPin,
  RefreshCw,
  PackageCheck,
  AlertCircle,
  ArrowUpRight,
  Route,
  Factory,
  Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import RazorpayShippingLogger from './RazorpayShippingLogger'

interface ShiprocketDiagnostics {
  configured: boolean
  email: string | null
  webhook_secret: boolean
  api_test?: { status: string; error?: string }
  issues: string[]
}

interface ShiprocketAnalytics {
  counts: {
    shipments_total: number
    in_transit: number
    out_for_delivery: number
    delivered: number
    rto_initiated: number
    rto_delivered: number
    pending: number
  }
  shipments: Array<{
    id: string
    created_at: string
    courier_name: string | null
    tracking_id: string | null
    shipment_status: string | null
    estimated_delivery_date: string | null
    last_tracking_update: string | null
    customer_name?: string | null
    customer_phone?: string | null
    customer_email?: string | null
    shipping_address?: {
      fullName?: string
      addressLine1?: string
      addressLine2?: string
      city?: string
      state?: string
      pincode?: string
    } | null
  }>
}

interface SupplierConfig {
  provider_name: string
  is_enabled: boolean
  api_base_url: string | null
  auth_type: string | null
  auth_config: {
    api_key?: string
    api_secret?: string
    webhook_secret?: string
  }
  operational_config: {
    supports_cod?: boolean
    supports_prepaid?: boolean
    fallback_to_shiprocket?: boolean
    default_dispatch_days?: number
    serviceable_regions?: string[]
  }
  notes?: string | null
  updated_at?: string
  last_test_status?: string | null
  last_test_message?: string | null
  last_tested_at?: string | null
}

interface SupplierForm {
  provider_name: string
  is_enabled: boolean
  api_base_url: string
  auth_type: string
  api_key: string
  api_secret: string
  webhook_secret: string
  supports_cod: boolean
  supports_prepaid: boolean
  fallback_to_shiprocket: boolean
  default_dispatch_days: string
  serviceable_regions: string
  notes: string
}

const EMPTY_SUPPLIER_FORM: SupplierForm = {
  provider_name: 'Supplier Direct',
  is_enabled: false,
  api_base_url: '',
  auth_type: 'qikink_token',
  api_key: '',
  api_secret: '',
  webhook_secret: '',
  supports_cod: true,
  supports_prepaid: true,
  fallback_to_shiprocket: true,
  default_dispatch_days: '2',
  serviceable_regions: '',
  notes: '',
}

export default function ShippingDashboard() {
  const [diagnostics, setDiagnostics] = useState<ShiprocketDiagnostics | null>(null)
  const [analytics, setAnalytics] = useState<ShiprocketAnalytics | null>(null)
  const [supplierConfig, setSupplierConfig] = useState<SupplierConfig | null>(null)
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(EMPTY_SUPPLIER_FORM)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [testingSupplier, setTestingSupplier] = useState(false)
  const [supplierMigrationWarning, setSupplierMigrationWarning] = useState<string | null>(null)

  const hydrateSupplierForm = (config: SupplierConfig | null) => {
    if (!config) {
      setSupplierForm(EMPTY_SUPPLIER_FORM)
      return
    }

    setSupplierForm({
      provider_name: config.provider_name || 'Supplier Direct',
      is_enabled: Boolean(config.is_enabled),
      api_base_url: config.api_base_url || '',
      auth_type: config.auth_type || 'qikink_token',
      api_key: config.auth_config?.api_key || '',
      api_secret: config.auth_config?.api_secret || '',
      webhook_secret: config.auth_config?.webhook_secret || '',
      supports_cod: config.operational_config?.supports_cod ?? true,
      supports_prepaid: config.operational_config?.supports_prepaid ?? true,
      fallback_to_shiprocket: config.operational_config?.fallback_to_shiprocket ?? true,
      default_dispatch_days: String(config.operational_config?.default_dispatch_days ?? 2),
      serviceable_regions: (config.operational_config?.serviceable_regions || []).join(', '),
      notes: config.notes || '',
    })
  }

  const loadData = async () => {
    setRefreshing(true)
    try {
      const [diagRes, analyticsRes, supplierRes] = await Promise.all([
        fetch('/api/admin/shiprocket/diagnostics'),
        fetch('/api/admin/shiprocket/analytics'),
        fetch('/api/admin/shipping/provider-config'),
      ])

      const diagData = await diagRes.json()
      const analyticsData = await analyticsRes.json()
      const supplierData = await supplierRes.json()

      if (diagRes.ok) {
        setDiagnostics(diagData)
      } else {
        toast.error(diagData.error || 'Failed to load Shiprocket diagnostics')
      }

      if (analyticsRes.ok) {
        setAnalytics(analyticsData)
      } else {
        toast.error(analyticsData.error || 'Failed to load Shiprocket analytics')
      }

      if (supplierRes.ok) {
        setSupplierConfig(supplierData.config)
        hydrateSupplierForm(supplierData.config)
        setSupplierMigrationWarning(null)
      } else {
        if (supplierData.code === 'MIGRATION_REQUIRED') {
          setSupplierMigrationWarning(supplierData.error || 'Supplier config migration is required.')
          setSupplierConfig(null)
          hydrateSupplierForm(null)
        } else {
          toast.error(supplierData.error || 'Failed to load supplier shipping config')
        }
      }
    } catch (error) {
      toast.error('Failed to load shipping dashboard data')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveSupplierConfig = async () => {
    try {
      setSavingSupplier(true)

      const payload = {
        provider_name: supplierForm.provider_name,
        is_enabled: supplierForm.is_enabled,
        api_base_url: supplierForm.api_base_url || null,
        auth_type: supplierForm.auth_type,
        auth_config: {
          api_key: supplierForm.api_key,
          api_secret: supplierForm.api_secret,
          webhook_secret: supplierForm.webhook_secret,
        },
        operational_config: {
          supports_cod: supplierForm.supports_cod,
          supports_prepaid: supplierForm.supports_prepaid,
          fallback_to_shiprocket: supplierForm.fallback_to_shiprocket,
          default_dispatch_days: Number(supplierForm.default_dispatch_days) || 2,
          serviceable_regions: supplierForm.serviceable_regions
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
        notes: supplierForm.notes || null,
      }

      const response = await fetch('/api/admin/shipping/provider-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data.code === 'MIGRATION_REQUIRED') {
          setSupplierMigrationWarning(data.error || 'Supplier config migration is required.')
        }
        throw new Error(data.error || 'Failed to save supplier shipping config')
      }

      setSupplierConfig(data.config)
      setSupplierMigrationWarning(null)
      toast.success('Supplier shipping config updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save supplier config')
    } finally {
      setSavingSupplier(false)
    }
  }

  const testSupplierConfig = async () => {
    try {
      setTestingSupplier(true)

      const payload = {
        provider_name: supplierForm.provider_name,
        is_enabled: supplierForm.is_enabled,
        api_base_url: supplierForm.api_base_url || null,
        auth_type: supplierForm.auth_type,
        auth_config: {
          api_key: supplierForm.api_key,
          api_secret: supplierForm.api_secret,
          webhook_secret: supplierForm.webhook_secret,
        },
        operational_config: {
          supports_cod: supplierForm.supports_cod,
          supports_prepaid: supplierForm.supports_prepaid,
          fallback_to_shiprocket: supplierForm.fallback_to_shiprocket,
          default_dispatch_days: Number(supplierForm.default_dispatch_days) || 2,
          serviceable_regions: supplierForm.serviceable_regions
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        },
        notes: supplierForm.notes || null,
      }

      const response = await fetch('/api/admin/shipping/provider-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data.code === 'MIGRATION_REQUIRED') {
          setSupplierMigrationWarning(data.error || 'Supplier config migration is required.')
        }
        throw new Error(data.error || 'Failed to test supplier connection')
      }

      setSupplierConfig(data.config)
      setSupplierMigrationWarning(null)

      if (data.result?.ok) {
        toast.success(data.result.message || 'Supplier connection succeeded')
      } else {
        toast.error(data.result?.message || 'Supplier connection failed')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to test supplier connection')
    } finally {
      setTestingSupplier(false)
    }
  }

  const stats = analytics?.counts

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipping Control</h1>
          <p className="text-sm text-gray-500 mt-1">Shiprocket operations and supplier API orchestration.</p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {supplierMigrationWarning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {supplierMigrationWarning}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-sky-600">In Transit</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.in_transit ?? 0}</h3>
                <p className="text-sm text-gray-500">Active shipments</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Route className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">Delivered</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.delivered ?? 0}</h3>
                <p className="text-sm text-gray-500">Completed deliveries</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <PackageCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-600">Out for Delivery</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.out_for_delivery ?? 0}</h3>
                <p className="text-sm text-gray-500">Last-mile</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-rose-600">RTO</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.rto_initiated ?? 0}</h3>
                <p className="text-sm text-gray-500">Return initiated</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Shiprocket</p>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Diagnostics</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${diagnostics?.configured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {diagnostics?.configured ? <PackageCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-mono text-xs text-gray-900">{diagnostics?.email || 'Missing'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Webhook Secret</span>
              <span className={`text-xs font-semibold ${diagnostics?.webhook_secret ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diagnostics?.webhook_secret ? 'Configured' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">API Test</span>
              <span className={`text-xs font-semibold ${diagnostics?.api_test?.status === 'OK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diagnostics?.api_test?.status || 'Not run'}
              </span>
            </div>
          </div>

          {diagnostics?.issues?.length ? (
            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
              {diagnostics.issues.map((issue) => (
                <p key={issue}>• {issue}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RazorpayShippingLogger />

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Section 1: Shiprocket</h2>
              <p className="text-sm text-gray-500">Primary shipping execution and tracking provider.</p>
            </div>
            <div className="rounded-xl bg-sky-500/10 text-sky-600 p-2">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="https://app.shiprocket.in/"
              target="_blank"
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Shiprocket Dashboard
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="https://apidocs.shiprocket.in/"
              target="_blank"
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Shiprocket API Docs
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </Link>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Webhook URL: <span className="font-mono text-xs">/api/shiprocket/webhook</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="w-4 h-4" />
              Shipments Enabled
            </div>
            <p className="text-xs text-white/70 mt-2">
              Shipping status is synced via Shiprocket webhooks. Keep this active as your baseline provider.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Section 2: Supplier API</h2>
              <p className="text-sm text-gray-500">Qikink-like supplier integration profile for fallback or dedicated lanes.</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 text-amber-600 p-2">
              <Factory className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm text-gray-600">
              Provider Name
              <input
                type="text"
                value={supplierForm.provider_name}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, provider_name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Supplier Direct"
              />
            </label>
            <label className="text-sm text-gray-600">
              API Base URL
              <input
                type="url"
                value={supplierForm.api_base_url}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, api_base_url: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="https://api.supplier.com"
              />
            </label>
            <label className="text-sm text-gray-600">
              Auth Type
              <select
                value={supplierForm.auth_type}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, auth_type: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="qikink_token">Qikink Client ID + Secret</option>
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Dispatch SLA (days)
              <input
                type="number"
                min={0}
                value={supplierForm.default_dispatch_days}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, default_dispatch_days: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="2"
              />
            </label>
            <label className="text-sm text-gray-600">
              Client ID / API Key
              <input
                type="text"
                value={supplierForm.api_key}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, api_key: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Qikink Client ID"
              />
            </label>
            <label className="text-sm text-gray-600">
              Client Secret
              <input
                type="password"
                value={supplierForm.api_secret}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, api_secret: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Qikink client_secret"
              />
            </label>
            <label className="text-sm text-gray-600 md:col-span-2">
              Webhook Secret
              <input
                type="text"
                value={supplierForm.webhook_secret}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, webhook_secret: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Webhook secret"
              />
            </label>
            <label className="text-sm text-gray-600 md:col-span-2">
              Serviceable Regions (comma-separated pincodes/states)
              <input
                type="text"
                value={supplierForm.serviceable_regions}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, serviceable_regions: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="110001, 560001, Maharashtra"
              />
            </label>
            <label className="text-sm text-gray-600 md:col-span-2">
              Notes
              <textarea
                value={supplierForm.notes}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                rows={2}
                placeholder="Operational notes for this supplier"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={supplierForm.is_enabled}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, is_enabled: event.target.checked }))}
              />
              Enable supplier routing
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={supplierForm.fallback_to_shiprocket}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, fallback_to_shiprocket: event.target.checked }))
                }
              />
              Fallback to Shiprocket
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={supplierForm.supports_cod}
                onChange={(event) => setSupplierForm((prev) => ({ ...prev, supports_cod: event.target.checked }))}
              />
              Supports COD
            </label>
            <label className="inline-flex items-center gap-2 text-gray-700">
              <input
                type="checkbox"
                checked={supplierForm.supports_prepaid}
                onChange={(event) =>
                  setSupplierForm((prev) => ({ ...prev, supports_prepaid: event.target.checked }))
                }
              />
              Supports prepaid
            </label>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            Qikink token auth uses `POST /api/token` with `application/x-www-form-urlencoded` body fields `ClientId` and `client_secret`. Use `https://sandbox.qikink.com` for sandbox or `https://api.qikink.com` for live in API Base URL.
          </div>

          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Connection Status</p>
                <p className={`mt-1 text-sm font-semibold ${supplierConfig?.last_test_status === 'OK' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {supplierConfig?.last_test_status || 'Not tested'}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {supplierConfig?.last_tested_at ? new Date(supplierConfig.last_tested_at).toLocaleString() : 'No test recorded'}
              </p>
            </div>
            {supplierConfig?.last_test_message ? (
              <p className="mt-2 text-sm text-gray-600">{supplierConfig.last_test_message}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              Last updated: {supplierConfig?.updated_at ? new Date(supplierConfig.updated_at).toLocaleString() : 'Not yet saved'}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={testSupplierConfig}
                disabled={testingSupplier}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${testingSupplier ? 'animate-spin' : ''}`} />
                {testingSupplier ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={saveSupplierConfig}
                disabled={savingSupplier}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingSupplier ? 'Saving...' : 'Save Supplier Config'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Latest Shipments</h2>
              <p className="text-sm text-gray-500">Recent Shiprocket tracking updates.</p>
            </div>
            <MapPin className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {(analytics?.shipments || []).map((shipment) => (
              <div key={shipment.id} className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{shipment.tracking_id || shipment.id}</p>
                  <span className="text-xs text-gray-500">{shipment.shipment_status || 'UNKNOWN'}</span>
                </div>
                <div className="grid gap-1 text-xs text-gray-600">
                  <p>
                    Customer:{' '}
                    <span className="font-medium text-gray-800">
                      {shipment.customer_name || shipment.shipping_address?.fullName || '-'}
                    </span>
                  </p>
                  <p>Phone: <span className="font-medium text-gray-800">{shipment.customer_phone || '-'}</span></p>
                  <p>Email: <span className="font-medium text-gray-800">{shipment.customer_email || '-'}</span></p>
                  <p>
                    Address:{' '}
                    <span className="font-medium text-gray-800">
                      {[shipment.shipping_address?.addressLine1, shipment.shipping_address?.city, shipment.shipping_address?.state, shipment.shipping_address?.pincode]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{shipment.courier_name || 'Courier not assigned'}</span>
                  <span>
                    {shipment.last_tracking_update
                      ? new Date(shipment.last_tracking_update).toLocaleString()
                      : 'No update yet'}
                  </span>
                </div>
              </div>
            ))}
            {!loading && (!analytics?.shipments || analytics.shipments.length === 0) && (
              <div className="text-sm text-gray-500">No Shiprocket shipments yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Provider Routing Logic</h3>
          <p className="text-sm text-gray-500 mt-1">Recommended execution sequence for order shipping.</p>
          <ol className="mt-4 space-y-3 text-sm text-gray-700 list-decimal list-inside">
            <li>If Supplier API is enabled and region matches, call Supplier API first.</li>
            <li>If Supplier API fails and fallback is enabled, create shipment in Shiprocket.</li>
            <li>Keep webhook events normalized to one order shipment status pipeline.</li>
          </ol>
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            This dashboard stores supplier credentials/rules. Runtime adapter wiring can consume this config in checkout and order fulfillment routes.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Pending Shipments</h3>
          <p className="text-sm text-gray-500 mb-4">Orders awaiting shipment creation.</p>
          <div className="text-3xl font-bold text-gray-900">{stats?.pending ?? 0}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">RTO Delivered</h3>
          <p className="text-sm text-gray-500 mb-4">Returned to origin shipments.</p>
          <div className="text-3xl font-bold text-gray-900">{stats?.rto_delivered ?? 0}</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Total Shipments</h3>
          <p className="text-sm text-gray-500 mb-4">Shipments created in Shiprocket.</p>
          <div className="text-3xl font-bold text-gray-900">{stats?.shipments_total ?? 0}</div>
        </div>
      </div>
    </div>
  )
}
