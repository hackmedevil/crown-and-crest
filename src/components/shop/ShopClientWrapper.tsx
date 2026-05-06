'use client'

import { useState } from 'react'
import FiltersDrawer from './FiltersDrawer'
import MobileFilterBar from './MobileFilterBar'

interface ShopClientWrapperProps {
  children: React.ReactNode
  minPrice?: number
  maxPrice?: number
}

export default function ShopClientWrapper({ 
  children, 
  minPrice, 
  maxPrice 
}: ShopClientWrapperProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)

  return (
    <>
      {/* Mobile Filter Bar */}
      <MobileFilterBar
        onOpenFilters={() => setShowFilters(true)}
        onOpenSort={() => setShowSort(true)}
      />

      {/* Filters Drawer (Mobile) */}
      <FiltersDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />

      {/* Main Content */}
      {children}
    </>
  )
}
