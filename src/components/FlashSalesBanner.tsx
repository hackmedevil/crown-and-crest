'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, ShoppingBag } from 'lucide-react'

interface TimeRemaining {
  hours: number
  minutes: number
  seconds: number
}

export default function FlashSalesBanner() {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Calculate time until midnight
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)

      const difference = midnight.getTime() - now.getTime()

      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [])

  const flashSaleProducts = [
    { name: 'Premium Oxford Shirt', discount: '30%', price: '₹1,999', original: '₹2,856', stock: '12 left' },
    { name: 'Classic Cotton Formal', discount: '25%', price: '₹1,699', original: '₹2,265', stock: '8 left' },
    { name: 'Linen Summer Collection', discount: '35%', price: '₹1,299', original: '₹1,998', stock: '5 left' },
  ]

  return (
    <section className="py-8 bg-gradient-to-r from-red-600 to-red-700">
      <div className="container mx-auto px-4">
        {/* Main Flash Sale Banner */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
            {/* Left: Headline + Countdown */}
            <div className="text-white space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-wider">Flash Sale</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold">
                Deal of the Day
              </h2>

              <p className="text-red-100 text-lg">
                Up to <span className="text-3xl font-bold text-white">50% OFF</span> on selected items
              </p>

              {/* Countdown Timer */}
              <div className="bg-black/30 rounded-lg p-4 w-fit backdrop-blur-sm">
                <p className="text-red-100 text-sm mb-2">Offer ends in:</p>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-white w-12 text-center">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <span className="text-xs text-red-100">Hours</span>
                  </div>
                  <div className="text-2xl font-bold text-white">:</div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-white w-12 text-center">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <span className="text-xs text-red-100">Minutes</span>
                  </div>
                  <div className="text-2xl font-bold text-white">:</div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold text-white w-12 text-center">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <span className="text-xs text-red-100">Seconds</span>
                  </div>
                </div>
              </div>

              <Link
                href="/sale"
                className="inline-block px-6 py-3 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition-all duration-300"
              >
                Shop Flash Sale
              </Link>
            </div>

            {/* Right: Featured Products */}
            <div className="space-y-3">
              {flashSaleProducts.map((product, index) => (
                <div
                  key={index}
                  className="bg-white/95 rounded-lg p-3 flex items-start justify-between hover:bg-white transition-all duration-200 group cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold text-gray-900">{product.price}</span>
                      <span className="text-sm text-gray-500 line-through">{product.original}</span>
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                        {product.discount}
                      </span>
                    </div>
                    <p className="text-xs text-red-600 font-semibold mt-1">⚡ {product.stock}</p>
                  </div>
                  <ShoppingBag className="w-5 h-5 text-red-600 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-black/20 rounded-lg p-3 text-center text-white text-xs">
            <p>
              Limited stock available. Offer valid till 11:59 PM today. Use code <span className="font-bold">FLASH50</span> for additional discounts.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
