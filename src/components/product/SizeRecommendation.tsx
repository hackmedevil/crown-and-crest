'use client'

// ============================================
// SIZE RECOMMENDATION UI COMPONENT
// ============================================
// Displays personalized size recommendations
// 6 distinct UX states (see spec)
// Advisory, never authoritative
// ============================================

import { useState } from 'react'
import Link from 'next/link'
import { SizeRecommendation as SizeRecommendationData } from '@/lib/recommendation'

interface Props {
    recommendation: SizeRecommendationData | null
    hasUserSizebook: boolean
    isAuthenticated: boolean
    sizeChartExists: boolean
    onSizeSelect?: (size: string) => void
}

export default function SizeRecommendation({
    recommendation,
    hasUserSizebook,
    isAuthenticated,
    sizeChartExists,
    onSizeSelect
}: Props) {
    const [showConfidenceTooltip, setShowConfidenceTooltip] = useState(false)

    // State 1: User not logged in
    if (!isAuthenticated) {
        return (
            <div className="bg-gray-50 rounded-xl p-4 mb-8 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📏</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">Find Your Perfect Fit</p>
                    <p className="text-xs text-gray-600 mb-3">
                        Create a size profile for personalized recommendations
                    </p>
                    <Link
                        href="/?openAuth=1&redirect=/account/size-profile"
                        className="inline-block text-xs font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-700 transition-colors"
                    >
                        Set Up Size Profile →
                    </Link>
                </div>
            </div>
        )
    }

    // State 2: User logged in, no Sizebook
    if (!hasUserSizebook) {
        return (
            <div className="bg-blue-50 rounded-xl p-4 mb-8 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📏</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">Unlock Smart Sizing</p>
                    <p className="text-xs text-gray-600 mb-3">
                        Add your measurements to get size recommendations
                    </p>
                    <Link
                        href="/account/size-profile"
                        className="inline-block text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-600 transition-colors"
                    >
                        Add Measurements →
                    </Link>
                </div>
            </div>
        )
    }

    // State 3: Has Sizebook, no size chart for product
    if (!sizeChartExists) {
        // Silent fallback - render nothing
        return null
    }

    // State 4: Has Sizebook, recommendation failed (null)
    if (!recommendation) {
        return (
            <div className="bg-amber-50 rounded-xl p-4 mb-8 flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">📏</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">Need More Measurements</p>
                    <p className="text-xs text-gray-600 mb-3">
                        Add chest & waist measurements for accurate size recommendations
                    </p>
                    <Link
                        href="/account/size-profile"
                        className="inline-block text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-600 transition-colors"
                    >
                        Update Profile →
                    </Link>
                </div>
            </div>
        )
    }

    // State 5 & 6: Recommendation exists
    const isHighConfidence = recommendation.confidence >= 80
    const showConfidencePercentage = recommendation.confidence >= 90

    return (
        <div className="bg-green-50 rounded-xl p-4 mb-8">
            <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white flex-shrink-0">
                    <span className="text-lg font-bold">✓</span>
                </div>
                <div className="flex-1">
                    {/* Recommendation Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-gray-900">
                            {isHighConfidence ? 'Recommended' : 'Suggested'} Size: {recommendation.size_label}
                        </p>
                        <button
                            onClick={() => setShowConfidenceTooltip(!showConfidenceTooltip)}
                            className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700 hover:bg-gray-400 transition-colors"
                            aria-label="Confidence explanation"
                        >
                            ?
                        </button>
                    </div>

                    {/* Reasoning */}
                    <p className="text-xs text-gray-600 mb-2">
                        {recommendation.reasoning}
                        {showConfidencePercentage && ` • ${recommendation.confidence}% Confidence`}
                    </p>

                    {/* Fit Notes */}
                    {recommendation.fit_notes.length > 0 && (
                        <ul className="space-y-0.5">
                            {recommendation.fit_notes.map((note, idx) => (
                                <li key={idx} className="text-xs text-gray-700 flex items-start gap-1">
                                    <span className="text-gray-400">•</span>
                                    <span>{note}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Confidence Tooltip */}
                    {showConfidenceTooltip && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs">
                            <p className="font-bold text-gray-900 mb-2">Confidence Explained</p>
                            <div className="space-y-1 text-gray-600">
                                <p><strong>90-100%:</strong> Excellent match</p>
                                <p><strong>80-89%:</strong> Good match</p>
                                <p><strong>70-79%:</strong> Reasonable match</p>
                                <p><strong>60-69%:</strong> Suggested size</p>
                            </div>
                            <p className="mt-2 text-gray-500 text-xs">
                                Based on comparing your body measurements with garment specs.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
