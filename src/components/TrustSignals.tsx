'use client'

import { Shield, Truck, RotateCcw, CreditCard } from 'lucide-react'

export default function TrustSignals() {
  const signals = [
    {
      icon: Shield,
      title: 'Secure Checkout',
      description: '256-bit SSL encryption protects your data',
    },
    {
      icon: Truck,
      title: 'Fast Shipping',
      description: 'Free delivery on orders above ₹500',
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      description: '30-day return policy, no questions asked',
    },
    {
      icon: CreditCard,
      title: 'Multiple Payment Options',
      description: 'Cards, UPI, Wallets, Cash on Delivery',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-t border-b">
      {signals.map((signal, index) => {
        const Icon = signal.icon
        return (
          <div key={index} className="flex flex-col items-center text-center p-4 hover:bg-gray-50 rounded transition">
            <Icon className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">{signal.title}</h3>
            <p className="text-xs text-gray-600 mt-1">{signal.description}</p>
          </div>
        )
      })}
    </div>
  )
}
