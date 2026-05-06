import PriceFilter from './PriceFilter'
import SizeFilter from './SizeFilter'
import ColorFilter from './ColorFilter'
import RatingFilter from './RatingFilter'
import AvailabilityFilter from './AvailabilityFilter'

interface FiltersSidebarProps {
  minPrice?: number
  maxPrice?: number
  className?: string
}

export default function FiltersSidebar({ 
  minPrice = 0, 
  maxPrice = 10000,
  className = ''
}: FiltersSidebarProps) {
  return (
    <aside className={`w-full lg:w-64 flex-shrink-0 ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>
        
        <div className="space-y-0">
          <PriceFilter minPrice={minPrice} maxPrice={maxPrice} />
          <SizeFilter />
          <ColorFilter />
          <RatingFilter />
          <AvailabilityFilter />
        </div>
      </div>
    </aside>
  )
}
