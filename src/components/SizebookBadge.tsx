'use client'

/**
 * Sizebook Badge Component
 * Shows recommendation confidence on PDP
 * Non-intrusive, confidence-building design
 */

type SizebookBadgeProps = {
  confidence: number
  recommendedSize: string
  variant?: 'compact' | 'full'
}

export function SizebookBadge({ 
  confidence, 
  recommendedSize, 
  variant = 'full' 
}: SizebookBadgeProps) {
  // High confidence (80%+) - Show strong recommendation
  if (confidence >= 80) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
        {variant === 'full' ? (
          <span>
            <strong>Recommended by Sizebook:</strong> Size {recommendedSize}
          </span>
        ) : (
          <span>Sizebook match</span>
        )}
      </div>
    )
  }

  // Good confidence (60-79%) - Show gentle suggestion
  if (confidence >= 60) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 ring-1 ring-blue-200">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
        </svg>
        {variant === 'full' ? (
          <span>
            <strong>Sizebook suggests:</strong> Size {recommendedSize}
          </span>
        ) : (
          <span>Sizebook guidance</span>
        )}
      </div>
    )
  }

  // No recommendation shown (confidence < 60%)
  return null
}

/**
 * Helper Text for users without Sizebook profile
 */
export function SizebookPrompt() {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
      <p className="font-medium">Get personalized size recommendations</p>
      <p className="mt-1">
        <a 
          href="/account/sizebook" 
          className="text-blue-600 hover:text-blue-700 underline"
        >
          Set up your Sizebook
        </a>
        {' '}to see recommendations for this product.
      </p>
    </div>
  )
}
