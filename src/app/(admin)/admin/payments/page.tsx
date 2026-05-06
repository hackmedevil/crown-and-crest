'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Activity,
  Globe,
  RefreshCw,
  Webhook,
  BadgeIndianRupee,
  FileText,
  ArrowUpRight,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface RazorpayDiagnostics {
  configured: boolean
  key_id: string | null
  public_key_id: string | null
  webhook_secret: boolean
  api_test?: { status: string; error?: string }
  issues: string[]
}

interface RazorpayAnalytics {
  counts: {
    orders_total: number
    orders_paid: number
    orders_pending: number
    orders_authorized: number
    orders_failed: number
    refunds_total: number
    disputes_total: number
    abandoned_checkouts: number
  }
  amounts: {
    refunds_total: number
    disputes_total: number
  }
  webhooks: Array<{ id: string; event_type: string; order_id: string | null; received_at: string }>
}

export default function PaymentsDashboard() {
  const [diagnostics, setDiagnostics] = useState<RazorpayDiagnostics | null>(null)
  const [analytics, setAnalytics] = useState<RazorpayAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    setRefreshing(true)
    try {
      const [diagRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/razorpay/diagnostics'),
        fetch('/api/admin/razorpay/analytics'),
      ])

      const diagData = await diagRes.json()
      const analyticsData = await analyticsRes.json()

      if (diagRes.ok) {
        setDiagnostics(diagData)
      } else {
        toast.error(diagData.error || 'Failed to load Razorpay diagnostics')
      }

      if (analyticsRes.ok) {
        setAnalytics(analyticsData)
      } else {
        toast.error(analyticsData.error || 'Failed to load Razorpay analytics')
      }
    } catch (error) {
      toast.error('Failed to load Razorpay dashboard data')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = analytics?.counts
  const amounts = analytics?.amounts
  const totalOrders = stats?.orders_total ?? 0
  const paidOrders = stats?.orders_paid ?? 0
  const failedOrders = stats?.orders_failed ?? 0
  const paymentSuccessRate = totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : '0.0'

  const healthScore =
    diagnostics?.configured && diagnostics?.api_test?.status === 'OK'
      ? failedOrders > paidOrders
        ? 'At Risk'
        : 'Healthy'
      : 'Needs Attention'

  const healthTone =
    healthScore === 'Healthy'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : healthScore === 'At Risk'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-rose-700 bg-rose-50 border-rose-200'

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 mb-3">
            <CreditCard className="w-3.5 h-3.5" />
            Admin Payments
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor gateway health, settlements, refunds, disputes, and webhook flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${healthTone}`}>
            {healthScore === 'Healthy' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            Health: {healthScore}
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white animate-pulse" />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600">Payments</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.orders_paid ?? 0}</h3>
                <p className="text-sm text-gray-500">Successful payments</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <BadgeIndianRupee className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-600">Pending</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.orders_pending ?? 0}</h3>
                <p className="text-sm text-gray-500">Awaiting payment</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-rose-600">Refunds</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.refunds_total ?? 0}</h3>
                <p className="text-sm text-gray-500">Total refunds</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-600">Disputes</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{stats?.disputes_total ?? 0}</h3>
                <p className="text-sm text-gray-500">Chargebacks</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-sky-700">Payment Success Rate</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{paymentSuccessRate}%</h3>
                <p className="text-sm text-gray-600">Paid orders over total orders</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>Total: <span className="font-semibold text-gray-900">{totalOrders}</span></p>
                <p>Failed: <span className="font-semibold text-rose-700">{failedOrders}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Magic Checkout</p>
              <h3 className="text-xl font-bold text-gray-900 mt-2">Diagnostics</h3>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${diagnostics?.configured ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
              {diagnostics?.configured ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Key ID</span>
              <span className="font-mono text-xs text-gray-900">{diagnostics?.key_id || 'Missing'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Public Key</span>
              <span className="font-mono text-xs text-gray-900">{diagnostics?.public_key_id || 'Missing'}</span>
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

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${diagnostics?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {diagnostics?.configured ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Credentials
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${diagnostics?.webhook_secret ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {diagnostics?.webhook_secret ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              Webhook Secret
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${diagnostics?.api_test?.status === 'OK' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {diagnostics?.api_test?.status === 'OK' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              API Reachability
            </span>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Webhook Activity</h2>
              <p className="text-sm text-gray-500">Latest Razorpay events captured in the webhook log.</p>
            </div>
            <Webhook className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {(analytics?.webhooks || []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{entry.event_type}</p>
                  <p className="text-xs text-gray-500">Order: {entry.order_id || 'N/A'}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(entry.received_at).toLocaleString()}
                </span>
              </div>
            ))}
            {!loading && (!analytics?.webhooks || analytics.webhooks.length === 0) && (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                No webhook events captured yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tools & Links</h2>
            <p className="text-sm text-gray-500">Quick access to Razorpay controls and docs.</p>
          </div>

          <div className="space-y-3">
            <Link
              href="https://dashboard.razorpay.com/app/payments"
              target="_blank"
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Razorpay Dashboard
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </Link>
            <Link
              href="https://razorpay.com/docs/payments/magic-checkout/"
              target="_blank"
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Magic Checkout Docs
              <ArrowUpRight className="w-4 h-4 text-gray-400" />
            </Link>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Promotions API: <span className="font-mono text-xs">/api/razorpay/promotions</span>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Apply Promotion: <span className="font-mono text-xs">/api/razorpay/promotions/apply</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 p-4 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="w-4 h-4" />
              Live Keys Active
            </div>
            <p className="text-xs text-white/70 mt-2">
              If Magic Checkout still shows standard UI, Razorpay needs to enable the Magic Checkout UI for your account/domain.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Refunds & Disputes</h3>
          <p className="text-sm text-gray-500 mb-4">Aggregate totals from your order tables.</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Refund Amount</span>
              <span className="font-semibold text-gray-900">₹ {(amounts?.refunds_total || 0) / 100}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Dispute Amount</span>
              <span className="font-semibold text-gray-900">₹ {(amounts?.disputes_total || 0) / 100}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Abandoned Checkouts</span>
              <span className="font-semibold text-gray-900">{stats?.abandoned_checkouts ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">Payment Health</h3>
          <p className="text-sm text-gray-500 mb-4">Current status breakdown of payment lifecycle.</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-gray-500">Authorized</p>
              <p className="text-lg font-semibold text-gray-900">{stats?.orders_authorized ?? 0}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-gray-500">Failed</p>
              <p className="text-lg font-semibold text-gray-900">{stats?.orders_failed ?? 0}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-gray-500">Total Orders</p>
              <p className="text-lg font-semibold text-gray-900">{stats?.orders_total ?? 0}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-gray-900">{stats?.orders_pending ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
