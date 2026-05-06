'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface ProductDescriptionProps {
  description: string
  materials?: string
  careInstructions?: string
  sizeGuideContent?: string
  shippingInfo?: string
  returnsPolicty?: string
}

export default function ProductDescription({
  description,
  materials,
  careInstructions,
  sizeGuideContent,
  shippingInfo,
  returnsPolicty,
}: ProductDescriptionProps) {
  const [expandedTab, setExpandedTab] = useState<string>('description')

  const tabs = [
    {
      id: 'description',
      label: 'Description',
      content: description,
      available: !!description,
    },
    {
      id: 'materials',
      label: 'Materials',
      content: materials,
      available: !!materials,
    },
    {
      id: 'care',
      label: 'Care Instructions',
      content: careInstructions,
      available: !!careInstructions,
    },
    {
      id: 'sizeGuide',
      label: 'Size Guide',
      content: sizeGuideContent,
      available: !!sizeGuideContent,
    },
    {
      id: 'shipping',
      label: 'Shipping & Returns',
      content: shippingInfo || returnsPolicty,
      available: !!(shippingInfo || returnsPolicty),
    },
  ]

  const availableTabs = tabs.filter(tab => tab.available)

  return (
    <div className="py-12 border-t">
      <h2 className="text-2xl font-serif mb-6">Product Details</h2>

      {/* Desktop Tabs */}
      <div className="hidden md:block">
        <div className="flex border-b border-gray-200 mb-6">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setExpandedTab(tab.id)}
              className={`px-6 py-4 font-medium transition border-b-2 -mb-px ${
                expandedTab === tab.id
                  ? 'text-gray-900 border-amber-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="prose prose-sm max-w-none">
          {availableTabs.find(tab => tab.id === expandedTab)?.content && (
            <div
              className="text-gray-700 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: availableTabs.find(tab => tab.id === expandedTab)?.content || '',
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile Accordion */}
      <div className="md:hidden space-y-2">
        {availableTabs.map(tab => (
          <div
            key={tab.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedTab(expandedTab === tab.id ? '' : tab.id)
              }
              className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
            >
              <span className="font-medium text-gray-900">{tab.label}</span>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 transition-transform ${
                  expandedTab === tab.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedTab === tab.id && (
              <div className="px-4 py-4 bg-white border-t border-gray-200">
                <div
                  className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: tab.content || '',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
