'use client'

import { memo, useMemo } from 'react'
// import { FixedSizeGrid as Grid } from 'react-window'
// import AutoSizer from 'react-virtualized-auto-sizer'
import ProductCard from './ProductCard'
import type { GridProduct } from '@/types/grid'

interface VirtualizedProductGridProps {
  /**
   * Array of products to display
   */
  products: GridProduct[]
  
  /**
   * Number of columns
   */
  columnCount?: number
  
  /**
   * Height of each row in pixels
   */
  rowHeight?: number
  
  /**
   * Gap between items in pixels
   */
  gap?: number
  
  /**
   * Callback when wishlist is toggled
   */
  onWishlistToggle?: (productId: string, isWishlisted: boolean) => void
  
  /**
   * Callback for quick add to cart
   */
  onQuickAdd?: (productId: string, size?: string) => void
}

/**
 * VirtualizedProductGrid Component
 * 
 * High-performance virtualized grid for displaying thousands of products
 * Only renders visible items in the viewport
 * 
 * INSTALLATION REQUIRED:
 * npm install react-window react-virtualized-auto-sizer
 * npm install --save-dev @types/react-window
 * 
 * Use this component when:
 * - Displaying 1000+ products
 * - Performance is critical
 * - You want minimal DOM size
 * 
 * This component is commented out until dependencies are installed.
 */

// Uncomment after installing: npm install react-window react-virtualized-auto-sizer
/*
import { FixedSizeGrid as Grid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
*/
function VirtualizedProductGrid({
  products,
  columnCount = 4,
  rowHeight = 500,
  gap = 24,
  onWishlistToggle,
  onQuickAdd
}: VirtualizedProductGridProps) {
  // Note: This component requires react-window and react-virtualized-auto-sizer
  // Install with: npm install react-window react-virtualized-auto-sizer
  
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h3 className="text-xl font-bold mb-4">Virtualized Grid Not Available</h3>
        <p className="text-gray-600 mb-4">
          This component requires additional dependencies.
        </p>
        <code className="block bg-gray-800 text-white p-4 rounded text-sm">
          npm install react-window react-virtualized-auto-sizer<br />
          npm install --save-dev @types/react-window
        </code>
        <p className="text-sm text-gray-500 mt-4">
          After installation, uncomment the implementation in VirtualizedProductGrid.tsx
        </p>
      </div>
    </div>
  )

  /* Uncomment this after installing dependencies:
  
  // Calculate row count
  const rowCount = Math.ceil(products.length / columnCount)

  // Create cell renderer
  const Cell = useMemo(
    () =>
      ({ columnIndex, rowIndex, style }: any) => {
        const index = rowIndex * columnCount + columnIndex
        const product = products[index]

        if (!product) {
          return null
        }

        return (
          <div
            style={{
              ...style,
              left: Number(style.left) + gap / 2,
              top: Number(style.top) + gap / 2,
              width: Number(style.width) - gap,
              height: Number(style.height) - gap
            }}
          >
            <ProductCard
              product={product}
              onWishlistToggle={onWishlistToggle}
              onQuickAdd={onQuickAdd}
              prefetchOnHover={true}
            />
          </div>
        )
      },
    [products, columnCount, gap, onWishlistToggle, onQuickAdd]
  )

  return (
    <div className="w-full h-screen">
      <AutoSizer>
        {({ height, width }: { height: number; width: number }) => {
          const columnWidth = width / columnCount

          return (
            <Grid
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={height}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={width}
              overscanRowCount={2}
            >
              {Cell}
            </Grid>
          )
        }}
      </AutoSizer>
    </div>
  )
  */
}

export default memo(VirtualizedProductGrid)
