#!/usr/bin/env node

/**
 * Ranking Refresh Script
 * 
 * Can be run locally or via serverless function
 * Usage:
 *   node scripts/refresh-ranking.js
 *   Or scheduled via cron job
 */

const https = require('https')
const http = require('http')

// Configuration
const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL
const API_KEY = process.env.RANKING_REFRESH_API_KEY

if (!VERCEL_URL || !API_KEY) {
  console.error('Error: Missing VERCEL_URL or RANKING_REFRESH_API_KEY environment variables')
  process.exit(1)
}

const url = `${VERCEL_URL}/api/admin/ranking/refresh`

console.log(`[${new Date().toISOString()}] Starting ranking refresh...`)
console.log(`Endpoint: ${url}`)

const protocol = VERCEL_URL.startsWith('https') ? https : http

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
}

const request = protocol.request(url, options, (response) => {
  let data = ''

  response.on('data', (chunk) => {
    data += chunk
  })

  response.on('end', () => {
    try {
      const result = JSON.parse(data)
      if (response.statusCode === 200 && result.success) {
        console.log(`✓ Ranking refresh successful`)
        console.log(`  Products updated: ${result.stats.productsUpdated}`)
        console.log(`  Duration: ${result.stats.durationSeconds}s`)
        process.exit(0)
      } else {
        console.error(`✗ Ranking refresh failed: ${result.message || response.statusCode}`)
        console.error(`  Details: ${result.error || result.details}`)
        process.exit(1)
      }
    } catch (error) {
      console.error(`✗ Failed to parse response: ${error}`)
      process.exit(1)
    }
  })
})

request.on('error', (error) => {
  console.error(`✗ Request failed: ${error.message}`)
  process.exit(1)
})

request.end()
