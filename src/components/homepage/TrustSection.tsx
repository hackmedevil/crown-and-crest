import { Users, Star, ShieldCheck } from 'lucide-react'

interface TrustMetric {
  id: string
  icon: 'users' | 'star' | 'shield'
  value: string
  label: string
}

const iconMap = {
  users: Users,
  star: Star,
  shield: ShieldCheck
}

interface TrustSectionProps {
  metrics?: TrustMetric[]
}

const defaultMetrics: TrustMetric[] = [
  {
    id: '1',
    icon: 'users',
    value: '50,000+',
    label: 'Happy Customers'
  },
  {
    id: '2',
    icon: 'star',
    value: '4.8',
    label: 'Average Rating'
  },
  {
    id: '3',
    icon: 'shield',
    value: 'Premium',
    label: 'Fabric Quality'
  }
]

export default function TrustSection({ metrics = defaultMetrics }: TrustSectionProps) {
  return (
    <section className="py-16 bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-white/80">
            Join our growing community of satisfied customers
          </p>
        </div>

        {/* Trust Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-4xl mx-auto">
          {metrics.map((metric) => {
            const Icon = iconMap[metric.icon]
            
            return (
              <div
                key={metric.id}
                className="text-center group"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                </div>
                <p className="text-4xl md:text-5xl font-bold mb-2">
                  {metric.value}
                </p>
                <p className="text-lg text-white/80">
                  {metric.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
