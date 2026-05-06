'use client'

// ============================================
// SIZEBOOK UI - CLIENT COMPONENT
// ============================================
// User-owned profile management
// Optional, progressive, privacy-first
// No size labels, no recommendations, no products
// ============================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSizebook } from '@/lib/sizebook/types'
import { updateSizebook, createSizebook, deleteSizebook } from '@/lib/sizebook/user-actions'
import { useToast } from '@/hooks/useToast'

interface Props {
    initialSizebook: UserSizebook | null
}

interface SizebookDraft {
    basicInfo: {
        height_cm?: number
        weight_kg?: number
        gender?: 'male' | 'female' | 'unisex' | 'prefer_not_to_say'
    }
    measurements: {
        chest_cm?: number
        bust_cm?: number
        waist_cm?: number
        hip_cm?: number
        shoulder_cm?: number
    }
    fit_preference?: 'slim' | 'regular' | 'loose'
}

export default function SizeProfileClient({ initialSizebook }: Props) {
    const router = useRouter()
    const { showSuccess, showError } = useToast()

    // State ownership: Single source of truth
    const [draft, setDraft] = useState<SizebookDraft>(initializeDraft(initialSizebook))
    const [original, setOriginal] = useState<SizebookDraft>(initializeDraft(initialSizebook))
    const [isSaving, setIsSaving] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    // Derived state: Has changes?
    const hasChanges = JSON.stringify(draft) !== JSON.stringify(original)

    // Derived state: Completeness
    const completeness = calculateCompleteness(draft.measurements)

    // Validation state (simple ranges)
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

    // Update handlers
    const updateBasicInfo = (field: keyof SizebookDraft['basicInfo'], value: any) => {
        setDraft(prev => ({
            ...prev,
            basicInfo: { ...prev.basicInfo, [field]: value }
        }))
        setSaveError(null)
    }

    const updateMeasurement = (field: keyof SizebookDraft['measurements'], value: number | undefined) => {
        setDraft(prev => ({
            ...prev,
            measurements: { ...prev.measurements, [field]: value }
        }))
        setSaveError(null)

        // Clear validation error for this field
        if (validationErrors[field]) {
            setValidationErrors(prev => {
                const next = { ...prev }
                delete next[field]
                return next
            })
        }
    }

    const updateFitPreference = (value: SizebookDraft['fit_preference']) => {
        setDraft(prev => ({ ...prev, fit_preference: value }))
        setSaveError(null)
    }

    // Validate single field
    const validateField = (field: string, value: number | undefined): string | null => {
        if (value === undefined || value === null) return null

        const ranges: Record<string, { min: number, max: number, label: string }> = {
            height_cm: { min: 100, max: 250, label: 'Height' },
            weight_kg: { min: 20, max: 300, label: 'Weight' },
            chest_cm: { min: 70, max: 150, label: 'Chest' },
            bust_cm: { min: 70, max: 150, label: 'Bust' },
            waist_cm: { min: 50, max: 150, label: 'Waist' },
            hip_cm: { min: 70, max: 160, label: 'Hip' },
            shoulder_cm: { min: 30, max: 70, label: 'Shoulder' }
        }

        const range = ranges[field]
        if (!range) return null

        if (value < range.min || value > range.max) {
            return `${range.label} must be between ${range.min} and ${range.max}`
        }

        return null
    }

    // Save handler
    const handleSave = async () => {
        // Validate all fields
        const errors: Record<string, string> = {}

        Object.entries(draft.basicInfo).forEach(([key, value]) => {
            if (typeof value === 'number') {
                const error = validateField(key, value)
                if (error) errors[key] = error
            }
        })

        Object.entries(draft.measurements).forEach(([key, value]) => {
            const error = validateField(key, value)
            if (error) errors[key] = error
        })

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors)
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            const payload = {
                gender: draft.basicInfo.gender,
                height_cm: draft.basicInfo.height_cm || undefined,
                weight_kg: draft.basicInfo.weight_kg || undefined,
                measurements: draft.measurements,
                fit_preference: draft.fit_preference || undefined
            }

            let result
            if (initialSizebook) {
                result = await updateSizebook(payload)
            } else {
                result = await createSizebook(payload)
            }

            if (result.success) {
                setOriginal(draft)
                showSuccess('Size profile updated')
                router.refresh()
            } else {
                setSaveError(result.error || 'Failed to save')
            }
        } catch (error) {
            setSaveError('Couldn\'t save changes. Please try again.')
        } finally {
            setIsSaving(false)
        }
    }

    // Clear measurements only
    const handleClearMeasurements = () => {
        setDraft(prev => ({
            ...prev,
            measurements: {}
        }))
        setValidationErrors({})
        setSaveError(null)
    }

    // Delete profile
    const handleDelete = async () => {
        setIsSaving(true)
        setSaveError(null)

        try {
            const result = await deleteSizebook()
            if (result.success) {
                setShowDeleteModal(false)
                setDraft(initializeDraft(null))
                setOriginal(initializeDraft(null))
                showSuccess('Size profile deleted')
                router.refresh()
            } else {
                setSaveError(result.error || 'Couldn\'t delete profile. Please try again.')
                setShowDeleteModal(false)
            }
        } catch (error) {
            setSaveError('Couldn\'t delete profile. Please try again.')
            setShowDeleteModal(false)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Size Profile</h1>
                <p className="text-sm text-gray-600">
                    Used only to suggest better sizes. Never shared publicly. Never required to shop.
                </p>
            </div>

            {/* Profile Completeness */}
            <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-700">
                    Profile completeness: <strong>{completeness.filled} of {completeness.total}</strong> measurements added
                </p>
            </div>

            {/* Basic Info Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Basic Information <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    Optional. Helps improve fit suggestions for some garments.
                </p>

                <div className="space-y-4">
                    {/* Height */}
                    <div>
                        <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
                            Height
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                id="height"
                                value={draft.basicInfo.height_cm || ''}
                                onChange={(e) => updateBasicInfo('height_cm', e.target.value ? Number(e.target.value) : undefined)}
                                onBlur={(e) => {
                                    const error = validateField('height_cm', e.target.value ? Number(e.target.value) : undefined)
                                    if (error) setValidationErrors(prev => ({ ...prev, height_cm: error }))
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                placeholder="170"
                            />
                            <span className="text-sm text-gray-600">cm</span>
                        </div>
                        {validationErrors.height_cm && (
                            <p className="text-xs text-red-600 mt-1">{validationErrors.height_cm}</p>
                        )}
                    </div>

                    {/* Weight */}
                    <div>
                        <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                            Weight
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                id="weight"
                                value={draft.basicInfo.weight_kg || ''}
                                onChange={(e) => updateBasicInfo('weight_kg', e.target.value ? Number(e.target.value) : undefined)}
                                onBlur={(e) => {
                                    const error = validateField('weight_kg', e.target.value ? Number(e.target.value) : undefined)
                                    if (error) setValidationErrors(prev => ({ ...prev, weight_kg: error }))
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                placeholder="70"
                            />
                            <span className="text-sm text-gray-600">kg</span>
                        </div>
                        {validationErrors.weight_kg && (
                            <p className="text-xs text-red-600 mt-1">{validationErrors.weight_kg}</p>
                        )}
                    </div>

                    {/* Gender */}
                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                            Gender
                        </label>
                        <select
                            id="gender"
                            value={draft.basicInfo.gender || ''}
                            onChange={(e) => updateBasicInfo('gender', e.target.value || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                            <option value="">Select (optional)</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="unisex">Unisex</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Body Measurements Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Body Measurements</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Add what you know. Even one or two measurements can help.
                </p>

                <div className="space-y-4">
                    {/* Measurement rows */}
                    {[
                        { field: 'chest_cm' as const, label: 'Chest' },
                        { field: 'bust_cm' as const, label: 'Bust' },
                        { field: 'waist_cm' as const, label: 'Waist' },
                        { field: 'hip_cm' as const, label: 'Hip' },
                        { field: 'shoulder_cm' as const, label: 'Shoulder' }
                    ].map(({ field, label }) => (
                        <div key={field}>
                            <label htmlFor={field} className="block text-sm font-medium text-gray-700 mb-1">
                                {label}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    id={field}
                                    value={draft.measurements[field] || ''}
                                    onChange={(e) => updateMeasurement(field, e.target.value ? Number(e.target.value) : undefined)}
                                    onBlur={(e) => {
                                        const error = validateField(field, e.target.value ? Number(e.target.value) : undefined)
                                        if (error) setValidationErrors(prev => ({ ...prev, [field]: error }))
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                    placeholder="e.g. 98"
                                />
                                <span className="text-sm text-gray-600">cm</span>
                            </div>
                            {validationErrors[field] && (
                                <p className="text-xs text-red-600 mt-1">{validationErrors[field]}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Fit Preference Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    Fit Preference <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                    Tells us how you usually like clothes to fit.
                </p>

                <div className="space-y-2">
                    {['slim', 'regular', 'loose'].map((pref) => (
                        <label key={pref} className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="fit_preference"
                                value={pref}
                                checked={draft.fit_preference === pref}
                                onChange={(e) => updateFitPreference(e.target.value as any)}
                                className="w-4 h-4 text-gray-900 focus:ring-gray-900"
                            />
                            <span className="text-sm text-gray-700 capitalize">{pref}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-gray-200 pt-6 space-y-3">
                {saveError && (
                    <p className="text-sm text-red-600">{saveError}</p>
                )}

                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving || Object.keys(validationErrors).length > 0}
                    className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>

                <button
                    onClick={handleClearMeasurements}
                    disabled={isSaving}
                    className="w-full bg-gray-100 text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                    Clear All Measurements
                </button>

                {initialSizebook && (
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isSaving}
                        className="w-full bg-white border border-red-600 text-red-600 font-semibold py-3 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                        Delete Size Profile
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModal(false)} />
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete size profile?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                This will permanently remove your size profile. You can still shop normally without it.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-900 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// Helper functions
function initializeDraft(sizebook: UserSizebook | null): SizebookDraft {
    if (!sizebook) {
        return {
            basicInfo: {},
            measurements: {},
            fit_preference: undefined
        }
    }

    return {
        basicInfo: {
            height_cm: sizebook.height_cm || undefined,
            weight_kg: sizebook.weight_kg || undefined,
            gender: sizebook.gender || undefined
        },
        measurements: sizebook.measurements || {},
        fit_preference: sizebook.fit_preference || undefined
    }
}

function calculateCompleteness(measurements: SizebookDraft['measurements']): { filled: number, total: number } {
    const coreFields = ['chest_cm', 'waist_cm', 'hip_cm', 'shoulder_cm'] as const
    const filled = coreFields.filter(field => measurements[field] !== undefined && measurements[field] !== null).length

    return { filled, total: coreFields.length }
}
