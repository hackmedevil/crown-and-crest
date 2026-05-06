'use client'

import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'

interface ReviewItem {
  id: string
  user_name?: string
  title?: string
  review_text?: string
  rating: number
  created_at?: string
  verified_purchase?: boolean
}

interface ReviewsSectionProps {
  productId: string
}

export default function ReviewsSection({ productId }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadReviews() {
      setLoading(true)
      try {
        const response = await fetch(`/api/products/${productId}/reviews?page=${page}&limit=5&sort=recent`, {
          cache: 'no-store',
        })
        const json = await response.json()

        if (!mounted || !json?.success) {
          setReviews([])
          return
        }

        setReviews(json.reviews || [])
        setTotalPages(json.pagination?.totalPages || 1)
        setTotal(json.pagination?.total || 0)
      } catch {
        if (mounted) {
          setReviews([])
          setTotalPages(1)
          setTotal(0)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadReviews()
    return () => {
      mounted = false
    }
  }, [productId, page])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  }, [reviews])

  return (
    <section className="mt-16 lg:mt-20">
      <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-6">Customer Reviews</h2>
      
      {/* Review Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 lg:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-yellow-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={`w-5 h-5 ${index < Math.round(averageRating) ? 'fill-current' : ''}`}
                />
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
              <p className="text-xs text-gray-500">out of 5</p>
            </div>
          </div>
          <div className="border-l border-gray-200 pl-4 sm:pl-6">
            <p className="text-sm text-gray-600">Based on <span className="font-semibold">{total}</span> reviews</p>
          </div>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading reviews...</p>}

      {!loading && reviews.length === 0 && (
        <div className="bg-white text-center py-12 border border-gray-200 rounded-lg">
          <p className="text-gray-500">No reviews yet for this product.</p>
        </div>
      )}

      <div className="space-y-6">
        {reviews.map(review => (
          <article key={review.id} className="rounded-lg border border-gray-200 bg-white p-6 lg:p-8 transition-shadow">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="font-semibold text-gray-900">{review.user_name || 'Verified Buyer'}</p>
                {review.verified_purchase && (
                  <span className="inline-block mt-1 text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded">✓ Verified Purchase</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-yellow-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`w-4 h-4 ${index < review.rating ? 'fill-current' : ''}`}
                  />
                ))}
              </div>
            </div>
            {review.title && <p className="text-base font-semibold text-gray-800 mb-2">{review.title}</p>}
            <p className="text-sm text-gray-600 leading-relaxed">{review.review_text || ''}</p>
          </article>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
