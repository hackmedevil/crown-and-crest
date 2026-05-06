'use client'

import { useState } from 'react'

interface ProductDescriptionProps {
  description?: string | null
  specifications: Array<{ label: string; value: string }>
  sizeGuide?: string | null
}

const TABS = ['Description', 'Specifications', 'Size Guide'] as const

type Tab = (typeof TABS)[number]

export default function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <section className="mt-16 lg:mt-20">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">Description</h2>
      <div
        className="text-gray-800 text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: description || 'No description available.' }}
      />
    </section>
  )
}
