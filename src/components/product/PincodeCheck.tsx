'use client'

import { useState } from 'react'
import { Truck } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface PincodeCheckProps {
  className?: string
}

/**
 * PincodeCheck Component
 * 
 * Allows users to check delivery availability for their pincode
 */
export default function PincodeCheck({ className = '' }: PincodeCheckProps) {
  const { showSuccess, showError } = useToast()
  const [pincode, setPincode] = useState('')
  const [pincodeResult, setPincodeResult] = useState<{
    serviceable: boolean
    cod_available: boolean
    estimated_days: number
  } | null>(null)
  const [checkingPincode, setCheckingPincode] = useState(false)

  const handleCheckPincode = async () => {
    if (!pincode || pincode.length !== 6) {
      showError('Please enter a valid 6-digit pincode')
      return
    }

    setCheckingPincode(true)
    setPincodeResult(null)

    try {
      const response = await fetch('/api/shipping/pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode })
      })

      const data = await response.json()

      if (response.ok) {
        setPincodeResult(data)
        if (!data.serviceable) {
          showError('Delivery not available for this pincode')
        } else {
          showSuccess(`Delivery available in ${data.estimated_days} days!`)
        }
      } else {
        showError('Failed to check pincode. Please try again.')
      }
    } catch (error) {
      console.error('Pincode check error:', error)
      showError('Network error. Please try again.')
    } finally {
      setCheckingPincode(false)
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
        <Truck className="w-4 h-4" /> Check Delivery
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="Enter Pincode"
          value={pincode}
          onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && handleCheckPincode()}
          className="w-full pl-4 pr-20 py-3 border border-gray-300 rounded-lg text-sm focus:ring-black focus:border-black"
          maxLength={6}
        />
        <button
          onClick={handleCheckPincode}
          disabled={checkingPincode || pincode.length !== 6}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-black px-3 py-1.5 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkingPincode ? 'CHECKING...' : 'CHECK'}
        </button>
      </div>
      {pincodeResult && (
        <div
          className={`mt-3 p-3 rounded-lg text-sm ${
            pincodeResult.serviceable
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {pincodeResult.serviceable ? (
            <>
              <p className="font-semibold">✓ Delivery Available</p>
              <p className="text-xs mt-1">
                Expected by:{' '}
                {new Date(
                  Date.now() + (pincodeResult.estimated_days + 1) * 24 * 60 * 60 * 1000
                ).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
                {pincodeResult.cod_available && ' • COD Available'}
              </p>
            </>
          ) : (
            <p className="font-semibold">✗ Delivery not available for this pincode</p>
          )}
        </div>
      )}
    </div>
  )
}
