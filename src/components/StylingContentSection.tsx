'use client'

import Link from 'next/link'
import { Shirt, Zap, BookOpen, TrendingUp } from 'lucide-react'

export default function StylingContentSection() {
  const styleGuides = [
    {
      icon: Shirt,
      title: 'Fabric Guide',
      description: 'Learn about premium materials: cotton, linen, oxford, and more.',
      href: '/fabric-guide',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      icon: BookOpen,
      title: 'Care Instructions',
      description: 'Keep your shirts looking fresh with our care guide.',
      href: '/care-guide',
      color: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      icon: Zap,
      title: 'Quick Styling Tips',
      description: 'Discover versatile ways to wear and style every shirt.',
      href: '/styling-tips',
      color: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: TrendingUp,
      title: 'Size Book Tutorial',
      description: 'Master your perfect fit in just 2 minutes.',
      href: '/size-book-tutorial',
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Master Your Style</h2>
          <p className="text-lg text-gray-600">
            Premium fabrics, expert care, and perfect fit—everything you need to look confident every day.
          </p>
        </div>

        {/* Content Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {styleGuides.map((guide) => {
            const IconComponent = guide.icon
            return (
              <Link
                key={guide.title}
                href={guide.href}
                className="group block p-8 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:shadow-lg transition-all duration-300"
              >
                <div className={`${guide.color} w-16 h-16 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <IconComponent className={`w-8 h-8 ${guide.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-gray-900">{guide.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{guide.description}</p>
                <span className="inline-flex items-center text-sm font-semibold text-gray-900 group-hover:gap-2 transition-all gap-1">
                  Learn More →
                </span>
              </Link>
            )
          })}
        </div>

        {/* Premium Fabrics Highlight */}
        <div className="max-w-6xl mx-auto bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 md:p-12 text-white">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4">Premium Fabrics Only</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                We exclusively use the finest materials sourced globally. Every shirt is tested for durability, comfort, and longevity.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  <span>100% organic cotton options</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  <span>Breathable linen for warm climates</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  <span>Premium oxford for longevity</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-white rounded-full" />
                  <span>Sustainably sourced materials</span>
                </div>
              </div>
              <Link
                href="/fabric-guide"
                className="inline-block mt-8 px-6 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-all"
              >
                Explore Our Fabrics
              </Link>
            </div>

            {/* Visual */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Cotton', icon: '🌾' },
                { name: 'Linen', icon: '🌿' },
                { name: 'Oxford', icon: '✨' },
                { name: 'Premium Blend', icon: '⭐' },
              ].map((fabric) => (
                <div
                  key={fabric.name}
                  className="bg-white/10 backdrop-blur border border-white/20 rounded-lg p-4 text-center hover:bg-white/20 transition-all"
                >
                  <span className="text-3xl mb-2 block">{fabric.icon}</span>
                  <p className="text-sm font-semibold">{fabric.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
