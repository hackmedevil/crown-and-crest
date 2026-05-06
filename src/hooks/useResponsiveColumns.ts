'use client'

import { useState, useEffect } from 'react'

interface UseResponsiveColumnsOptions {
  mobile?: number
  tablet?: number
  desktop?: number
  largeDesktop?: number
}

/**
 * useResponsiveColumns Hook
 * 
 * Returns the appropriate column count based on screen size
 * Useful for virtualized grids and responsive layouts
 */
export function useResponsiveColumns({
  mobile = 2,
  tablet = 3,
  desktop = 4,
  largeDesktop = 5
}: UseResponsiveColumnsOptions = {}): number {
  const [columns, setColumns] = useState(desktop)

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth

      if (width < 768) {
        setColumns(mobile)
      } else if (width < 1024) {
        setColumns(tablet)
      } else if (width < 1536) {
        setColumns(desktop)
      } else {
        setColumns(largeDesktop)
      }
    }

    // Set initial value
    updateColumns()

    // Add resize listener
    window.addEventListener('resize', updateColumns)

    return () => {
      window.removeEventListener('resize', updateColumns)
    }
  }, [mobile, tablet, desktop, largeDesktop])

  return columns
}
