'use client'

// ============================================
// SIZE GUIDE MODAL
// ============================================
// Displays garment measurements (brand data only)
// Shows user's body measurements if available
// Always accessible (no auth required)
// Supports toggling between cm and inches
// ============================================

import { useState } from 'react'
import { X } from 'lucide-react'

interface SizeChartMeasurements {
    originalUnit: 'cm' | 'in'
    sizes: Record<string, Record<string, number>>
    sizesCm: Record<string, Record<string, number>>
    sizesIn: Record<string, Record<string, number>>
    tolerance_cm?: number
}

interface UserSizebook {
    id: string
    user_uid: string
    gender: string | null
    height_cm: number | null
    weight_kg: number | null
    measurements: any
    fit_preference: string | null
}

interface Props {
    sizeChart: { measurements: SizeChartMeasurements; name: string; fit_type: string | null } | null
    productName: string
    userSizebook?: UserSizebook | null
    isOpen: boolean
    onClose: () => void
}

export default function SizeGuideModal({ sizeChart, productName, userSizebook, isOpen, onClose }: Props) {
    const [selectedUnit, setSelectedUnit] = useState<'cm' | 'in'>('cm')
    
    if (!isOpen) return null

    const measurements = sizeChart?.measurements
    if (!measurements) {
        return (
            <>
                <div className="fixed inset-0 bg-black/50 z-[100] transition-opacity" onClick={onClose} />
                <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[101]">
                    <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Size Chart</h2>
                            <button onClick={onClose}><X className="w-4 h-4" /></button>
                        </div>
                        <p className="text-gray-600">Size chart profile is not assigned to this product.</p>
                    </div>
                </div>
            </>
        )
    }

    const activeSizes = selectedUnit === 'cm' ? measurements.sizesCm : measurements.sizesIn
    const sizeLabels = Object.keys(activeSizes)
    const measurementFields = sizeLabels.length > 0 ? Object.keys(activeSizes[sizeLabels[0]]) : []

    // Format field names for display
    const formatFieldName = (field: string): string => {
        const labels: Record<string, string> = {
            chest_cm: 'Chest',
            bust_cm: 'Bust',
            waist_cm: 'Waist',
            hip_cm: 'Hip',
            shoulder_cm: 'Shoulder',
            length_cm: 'Length',
            inseam_cm: 'Inseam',
            rise_cm: 'Rise',
            sleeve_cm: 'Sleeve'
        }
        return labels[field] || field.replace('_cm', '').replace('_', ' ')
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-[101]">
                <div className="bg-white rounded-t-2xl md:rounded-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-auto shadow-2xl">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Size Chart</h2>
                                <p className="text-xs text-gray-500">{productName}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Unit Toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedUnit('cm')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                    selectedUnit === 'cm'
                                        ? 'bg-black text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Centimeters (cm)
                            </button>
                            <button
                                onClick={() => setSelectedUnit('in')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                    selectedUnit === 'in'
                                        ? 'bg-black text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Inches (in)
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <>
                            <p className="text-sm font-semibold text-gray-900 mb-3">
                                Garment Measurements ({selectedUnit})
                            </p>

                            {/* Measurements Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="text-left py-2 px-2 font-bold text-gray-900">Size</th>
                                            {measurementFields.map(field => (
                                                <th key={field} className="text-left py-2 px-2 font-bold text-gray-900">
                                                    {formatFieldName(field)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sizeLabels.map((sizeLabel, idx) => (
                                            <tr key={sizeLabel} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                                <td className="py-2 px-2 font-semibold text-gray-900">{sizeLabel}</td>
                                                {measurementFields.map(field => {
                                                    const value = activeSizes[sizeLabel]?.[field]
                                                    return (
                                                        <td key={field} className="py-2 px-2 text-gray-700">
                                                            {value ? Math.round(value * 10) / 10 : '-'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>

                                {/* Disclaimer */}
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-600">
                                        <strong>Note:</strong> These are garment measurements (what the product measures),
                                        not body measurements. For the best fit, compare these with a similar garment you own.
                                    </p>
                                </div>
                            </>

                        {/* User's Measurements (if available) */}
                        {userSizebook?.measurements && (
                            <div className="mt-6 border-t border-gray-200 pt-4">
                                <p className="text-sm font-semibold text-gray-900 mb-3">
                                    Your Body Measurements
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {userSizebook.height_cm && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Height</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.height_cm} cm</p>
                                        </div>
                                    )}
                                    {userSizebook.weight_kg && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Weight</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.weight_kg} kg</p>
                                        </div>
                                    )}
                                    {userSizebook.measurements.chest_cm && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Chest</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.measurements.chest_cm} cm</p>
                                        </div>
                                    )}
                                    {userSizebook.measurements.waist_cm && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Waist</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.measurements.waist_cm} cm</p>
                                        </div>
                                    )}
                                    {userSizebook.measurements.hip_cm && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Hip</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.measurements.hip_cm} cm</p>
                                        </div>
                                    )}
                                    {userSizebook.measurements.shoulder_cm && (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-xs text-gray-600">Shoulder</p>
                                            <p className="text-sm font-semibold text-gray-900">{userSizebook.measurements.shoulder_cm} cm</p>
                                        </div>
                                    )}
                                </div>
                                {userSizebook.fit_preference && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-gray-600">
                                            <strong>Your Fit Preference:</strong> {userSizebook.fit_preference}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
