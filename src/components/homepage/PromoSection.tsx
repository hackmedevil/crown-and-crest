import { TruckIcon, Tag, Gift } from 'lucide-react'

interface PromoCard {
  id: string
  icon: 'truck' | 'tag' | 'gift'
  title: string
  description: string
  bgColor?: string
}

const iconMap = {
  truck: TruckIcon,
  tag: Tag,
  gift: Gift
}

interface PromoSectionProps {
  promos?: PromoCard[]
}

const defaultPromos: PromoCard[] = [
  {
    id: '1',
    icon: 'truck',
    title: 'Free Shipping Above ₹999',
    description: 'Get free delivery on all orders above ₹999',
    bgColor: 'bg-blue-50'
  },
  {
    id: '2',
    icon: 'tag',
    title: 'Summer Sale 30% Off',
    description: 'Limited time offer on selected items',
    bgColor: 'bg-amber-50'
  },
  {
    id: '3',
    icon: 'gift',
    title: 'Buy 2 Get 1 Free',
    description: 'Add 3 items to cart, pay for only 2',
    bgColor: 'bg-green-50'
  }
]

export default function PromoSection({ promos = defaultPromos }: PromoSectionProps) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Special Offers
          </h2>
          <p className="text-lg text-gray-600">
            Don't miss out on our exclusive deals
          </p>
        </div>

        {/* Promo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {promos.map((promo) => {
            const Icon = iconMap[promo.icon]
            
            return (
              <div
                key={promo.id}
                className={`
                  ${promo.bgColor || 'bg-neutral-50'} 
                  rounded-xl p-8 text-center border-2 border-transparent
                  hover:border-black hover:shadow-lg transition-all duration-300
                  cursor-pointer group
                `}
              >
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {promo.title}
                </h3>
                <p className="text-gray-600">
                  {promo.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
