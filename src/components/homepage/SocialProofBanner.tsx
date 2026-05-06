import { Star, Users, Award } from 'lucide-react'

interface SocialProofBannerProps {
  rating?: number
  totalCustomers?: number
  totalReviews?: number
  className?: string
}

/**
 * SocialProofBanner Component
 * 
 * Displays social proof metrics to build trust and credibility
 * - Average rating (with stars)
 * - Total happy customers
 * - Total reviews
 */
export default function SocialProofBanner({
  rating = 4.8,
  totalCustomers = 50000,
  totalReviews = 12500,
  className = ''
}: SocialProofBannerProps) {
  // Format large numbers (50000 → 50K)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <section className={`py-12 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-y border-amber-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          {/* Rating */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-amber-400 rounded-full">
              <Star className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-gray-900">
                  {rating.toFixed(1)}
                </span>
                <span className="text-gray-600 font-medium">/ 5.0</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Average Rating
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-16 bg-amber-300" />

          {/* Happy Customers */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">
                {formatNumber(totalCustomers)}+
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Happy Customers
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px h-16 bg-amber-300" />

          {/* Total Reviews */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
              <Award className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-gray-900">
                {formatNumber(totalReviews)}+
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Verified Reviews
              </p>
            </div>
          </div>
        </div>

        {/* Optional Tagline */}
        <div className="mt-8 text-center">
          <p className="text-lg md:text-xl text-gray-700 font-medium">
            Trusted by thousands of customers worldwide 🌍
          </p>
        </div>
      </div>
    </section>
  )
}
