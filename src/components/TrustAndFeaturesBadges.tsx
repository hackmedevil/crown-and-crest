'use client'

import { Shield, Truck, RotateCcw, Lock, Zap, Award } from 'lucide-react'

export default function TrustAndFeaturesBadges() {
  const features = [
    {
      icon: Award,
      title: 'Premium Quality',
      description: '100% premium fabrics tested for durability',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      icon: Truck,
      title: 'Free Shipping',
      description: 'Free shipping on all orders across India',
      color: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      description: '30-day hassle-free return policy',
      color: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: Lock,
      title: 'Secure Payments',
      description: '100% secure & encrypted transactions',
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      icon: Zap,
      title: 'Perfect Fit Guarantee',
      description: 'Size Book system for guaranteed fit',
      color: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      icon: Shield,
      title: 'Ethical & Sustainable',
      description: 'Responsibly sourced materials',
      color: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
  ]

  return (
    <section className="py-16 bg-neutral-50 border-t border-b border-neutral-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const IconComponent = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white rounded-lg p-6 text-center border border-neutral-200 hover:border-gray-900 hover:shadow-md transition-all duration-300"
              >
                {/* Icon */}
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4`}>
                  <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm mb-2 leading-tight">{feature.title}</h3>

                {/* Description */}
                <p className="text-xs text-gray-600 leading-snug">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
