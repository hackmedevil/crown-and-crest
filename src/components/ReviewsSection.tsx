'use client'

import { useState } from 'react'
import { Star, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Review {
  id: string
  title: string
  rating: number
  text: string
  author: string
  createdAt: string
  verifiedPurchase: boolean
  helpfulCount: number
  images?: string[]
}

interface RatingDistribution {
  rating: number
  count: number
  percentage: number
}

interface ReviewsSectionProps {
  productId: string
  averageRating: number
  reviewCount: number
  ratingDistribution: RatingDistribution[]
  reviews: Review[]
  onSubmitReview?: (data: any) => Promise<void>
}

export default function ReviewsSection({
  productId,
  averageRating,
  reviewCount,
  ratingDistribution,
  reviews,
  onSubmitReview,
}: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'rating'>('helpful')
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    text: '',
  })

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'helpful':
        return b.helpfulCount - a.helpfulCount
      case 'rating':
        return b.rating - a.rating
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
  })

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmitReview) {
      await onSubmitReview({
        productId,
        ...formData,
      })
      setFormData({ rating: 5, title: '', text: '' })
      setShowForm(false)
    }
  }

  return (
    <div className="py-12">
      <h2 className="text-2xl font-serif mb-8">Customer Reviews</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Rating Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-6">
            {/* Average Rating */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const dist = ratingDistribution.find(d => d.rating === rating)
                const percentage = dist?.percentage || 0

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="text-sm text-gray-600 w-12">{rating} star</div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 w-10 text-right">{percentage}%</div>
                  </div>
                )
              })}
            </div>

            {/* Write Review Button */}
            <Button onClick={() => setShowForm(true)} className="w-full">
              Write a Review
            </Button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sort Options */}
          <div className="flex gap-4 items-center border-b pb-4">
            <span className="text-sm font-medium">Sort by:</span>
            {['helpful', 'recent', 'rating'].map(option => (
              <button
                key={option}
                onClick={() => setSortBy(option as any)}
                className={`text-sm capitalize px-3 py-1 rounded transition ${
                  sortBy === option
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Review Form */}
          {showForm && (
            <form onSubmit={handleSubmitReview} className="bg-gray-50 p-6 rounded-lg space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900">Share Your Review</h3>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rating }))}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          rating <= formData.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Review Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Your Review
                </label>
                <textarea
                  value={formData.text}
                  onChange={e => setFormData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Post Review
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          {sortedReviews.length === 0 ? (
            <p className="text-center text-gray-600 py-8">No reviews yet. Be the first!</p>
          ) : (
            <div className="space-y-6">
              {sortedReviews.map(review => (
                <div key={review.id} className="border rounded-lg p-6 hover:shadow-md transition">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        {review.verifiedPurchase && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{review.title}</h4>
                    </div>
                  </div>

                  {/* Review Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {review.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Review Text */}
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">{review.text}</p>

                  {/* Helpful */}
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <span className="text-xs text-gray-600">Was this helpful?</span>
                    <button className="text-xs text-gray-600 hover:text-gray-900">
                      👍 Helpful
                    </button>
                    <button className="text-xs text-gray-600 hover:text-gray-900">
                      👎 Not helpful
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
