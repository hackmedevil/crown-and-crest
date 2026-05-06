'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PDPProduct } from '@/types/pdp'

interface ProductDetailsAccordionProps {
  product: PDPProduct
}

/**
 * ProductDetailsAccordion Component
 * 
 * Displays product details in collapsible sections:
 * - Product Description
 * - Delivery & Returns
 * - Materials & Care
 */
export default function ProductDetailsAccordion({
  product
}: ProductDetailsAccordionProps) {
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>('description')

  const toggleAccordion = (id: string) => {
    setExpandedAccordion(expandedAccordion === id ? null : id)
  }

  // Build materials section content dynamically
  const buildMaterialsContent = () => {
    const parts: string[] = []
    
    if (product.fabric) parts.push(`<p><strong>Fabric:</strong> ${product.fabric}</p>`)
    if (product.gsm) parts.push(`<p><strong>GSM:</strong> ${product.gsm}</p>`)
    if (product.fit_type) parts.push(`<p><strong>Fit:</strong> ${product.fit_type}</p>`)
    if (product.print_type) parts.push(`<p><strong>Print Type:</strong> ${product.print_type}</p>`)
    
    // Add care instructions
    parts.push(`
      <p><strong>Care Instructions:</strong></p>
      <ul>
        <li>Machine wash cold with like colors</li>
        <li>Tumble dry low</li>
        <li>Do not bleach</li>
        <li>Iron on low heat if needed</li>
      </ul>
    `)
    
    return parts.join('<br />')
  }

  // Build delivery section content dynamically
  const buildDeliveryContent = () => {
    const shippingText = product.shipping_charge === 0 
      ? 'Free shipping on all orders' 
      : `Shipping: ₹${product.shipping_charge}`
    
    return `
      <p><strong>Delivery Information:</strong></p>
      <ul>
        <li>${shippingText}</li>
        <li>Estimated delivery: 5-7 business days</li>
        <li>Express shipping available at checkout</li>
      </ul>
      <br />
      <p><strong>Returns Policy:</strong></p>
      <ul>
        <li>30-day easy returns</li>
        <li>Free return shipping</li>
        <li>Full refund or exchange</li>
      </ul>
    `
  }

  const sections = [
    {
      id: 'description',
      title: 'Product Description',
      content:
        product.description ||
        'Experience luxury with this premium piece from Crown & Crest. Crafted with attention to detail and designed for the modern aesthetic.'
    },
    {
      id: 'delivery',
      title: 'Delivery & Returns',
      content: buildDeliveryContent()
    },
    {
      id: 'care',
      title: 'Materials & Care',
      content: buildMaterialsContent()
    }
  ]

  return (
    <div className="space-y-4 mb-8">
      {sections.map(section => (
        <div
          key={section.id}
          className="border-b border-gray-100 last:border-0 pb-4"
        >
          <button
            onClick={() => toggleAccordion(section.id)}
            className="w-full flex justify-between items-center py-2"
          >
            <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              {section.title}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedAccordion === section.id ? 'rotate-180' : ''
              }`}
            />
          </button>
          <AnimatePresence>
            {expandedAccordion === section.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none pt-2"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
