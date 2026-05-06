/**
 * Core Web Vitals Real User Monitoring (RUM)
 * 
 * Tracks and reports Core Web Vitals metrics for PDP performance monitoring.
 * Install: npm install web-vitals
 * 
 * Usage:
 * 1. Import this in your root layout or PDP page
 * 2. Call reportWebVitals() on client side
 * 3. Metrics will be sent to your analytics endpoint
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals'

interface WebVitalsReport {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
  pathname: string
  timestamp: number
}

/**
 * Send metric to analytics endpoint
 * Replace with your actual analytics service (Google Analytics, Mixpanel, etc.)
 */
function sendToAnalytics(report: WebVitalsReport) {
  // Example: Send to custom analytics endpoint
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true, // Ensures request completes even if page unloads
    }).catch((error) => {
      console.error('[Web Vitals] Failed to send metric:', error)
    })
  }

  // Example: Send to Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const { name, value, id, rating } = report
    ;(window as any).gtag('event', name, {
      event_category: 'Web Vitals',
      event_label: id,
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      metric_rating: rating,
      non_interaction: true,
    })
  }

  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', report)
  }
}

/**
 * Get rating for metric value
 */
function getMetricRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    INP: [200, 500], // Replaced FID
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [600, 1000],
  }

  const [good, poor] = thresholds[name] || [0, Infinity]
  
  if (value <= good) return 'good'
  if (value > poor) return 'poor'
  return 'needs-improvement'
}

/**
 * Process and report a single metric
 */
function onMetric(metric: Metric) {
  const report: WebVitalsReport = {
    name: metric.name,
    value: metric.value,
    rating: getMetricRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    pathname: window.location.pathname,
    timestamp: Date.now(),
  }

  sendToAnalytics(report)
}

/**
 * Initialize Core Web Vitals tracking
 * Call this from a client component or useEffect
 */
export function reportWebVitals() {
  if (typeof window === 'undefined') return

  try {
    // Track all Core Web Vitals
    onCLS(onMetric)  // Cumulative Layout Shift
    onINP(onMetric)  // Interaction to Next Paint (replaces FID)
    onFCP(onMetric)  // First Contentful Paint
    onLCP(onMetric)  // Largest Contentful Paint ⭐ Primary target
    onTTFB(onMetric) // Time To First Byte ⭐ Primary target
  } catch (error) {
    console.error('[Web Vitals] Failed to initialize tracking:', error)
  }
}

/**
 * Track page-specific metrics (e.g., PDP only)
 */
export function reportPDPVitals() {
  if (typeof window === 'undefined') return
  
  // Only track on PDP routes
  if (!window.location.pathname.startsWith('/product/')) return
  
  reportWebVitals()
}

/**
 * Get current vitals snapshot for debugging
 */
export async function getVitalsSnapshot(): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    const vitals: Record<string, number> = {}
    let count = 0
    const total = 5

    const check = () => {
      count++
      if (count === total) resolve(vitals)
    }

    onCLS((metric) => { vitals.CLS = metric.value; check() })
    onINP((metric) => { vitals.INP = metric.value; check() }) // Replaced FID
    onFCP((metric) => { vitals.FCP = metric.value; check() })
    onLCP((metric) => { vitals.LCP = metric.value; check() })
    onTTFB((metric) => { vitals.TTFB = metric.value; check() })

    // Timeout after 5 seconds
    setTimeout(() => resolve(vitals), 5000)
  })
}
