'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MEASUREMENT_OPTIONS = [
  { key: 'chest_cm', label: 'Chest', category: 'tops' },
  { key: 'bust_cm', label: 'Bust', category: 'tops' },
  { key: 'waist_cm', label: 'Waist', category: 'both' },
  { key: 'shoulder_cm', label: 'Shoulder', category: 'tops' },
  { key: 'length_cm', label: 'Length', category: 'tops' },
  { key: 'hip_cm', label: 'Hip', category: 'bottoms' },
  { key: 'inseam_cm', label: 'Inseam', category: 'bottoms' },
  { key: 'rise_cm', label: 'Rise', category: 'bottoms' },
  { key: 'thigh_cm', label: 'Thigh', category: 'bottoms' },
]

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL']

const FIT_TYPES = ['standard', 'slim', 'oversized', 'relaxed', 'fitted', 'loose']

const SIZE_CATEGORIES = [
  'men_top',
  'men_bottom',
  'women_top',
  'women_bottom',
  'women_dress',
  'kids_top',
  'kids_bottom',
  'unisex_top',
]

interface SizeMeasurement {
  [key: string]: number
}

interface SizeVariant {
  size: string
  measurements: SizeMeasurement
}

interface SizeGuide {
  id: string
  name: string
  category: string
  sizes: SizeVariant[]
  fit_type: string
  measurement_unit: 'cm' | 'inches'
  created_at: string
}

interface SizeGuideFormProps {
  onSuccess: () => void
  onCancel: () => void
  editingId?: string | null
  initialData?: SizeGuide
}

export default function SizeGuideForm({
  onSuccess,
  onCancel,
  editingId,
  initialData,
}: SizeGuideFormProps) {
  const [step, setStep] = useState<'guide' | 'sizes'>('guide')
  const [guideName, setGuideName] = useState('')
  const [category, setCategory] = useState('men_top')
  const [fitType, setFitType] = useState('standard')
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'inches'>('cm')
  const [loading, setLoading] = useState(false)

  const [sizes, setSizes] = useState<SizeVariant[]>([])
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([])
  const [currentSizeIndex, setCurrentSizeIndex] = useState<number | null>(null)

  useEffect(() => {
    if (initialData) {
      setGuideName(initialData.name)
      setCategory(initialData.category)
      setFitType(initialData.fit_type)
      setMeasurementUnit(initialData.measurement_unit)
      setSizes(initialData.sizes || [])
    }
  }, [initialData])

  const addSize = (sizeName: string) => {
    if (sizes.some(s => s.size === sizeName)) {
      toast.error(`${sizeName} already added`)
      return
    }
    setSizes([...sizes, { size: sizeName, measurements: {} }])
    setCurrentSizeIndex(sizes.length)
    setSelectedMeasurements([])
  }

  const removeSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index))
    if (currentSizeIndex === index) setCurrentSizeIndex(null)
  }

  const updateSizeMeasurement = (index: number, key: string, value: string) => {
    const newSizes = [...sizes]
    newSizes[index].measurements[key] = value ? parseFloat(value) : 0
    setSizes(newSizes)
  }

  const toggleMeasurement = (index: number, key: string) => {
    if (selectedMeasurements.includes(key)) {
      setSelectedMeasurements(selectedMeasurements.filter(m => m !== key))
      const newSizes = [...sizes]
      delete newSizes[index].measurements[key]
      setSizes(newSizes)
    } else {
      setSelectedMeasurements([...selectedMeasurements, key])
      const newSizes = [...sizes]
      newSizes[index].measurements[key] = 0
      setSizes(newSizes)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!guideName.trim()) {
      toast.error('Guide name is required')
      return
    }

    if (sizes.length === 0) {
      toast.error('Add at least one size')
      return
    }

    setLoading(true)

    try {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId
        ? `/api/admin/size-guides?id=${editingId}`
        : '/api/admin/size-guides'

      const payload = {
        name: guideName,
        category,
        fit_type: fitType,
        measurement_unit: measurementUnit,
        sizes,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save size guide')
      }

      toast.success(editingId ? 'Size guide updated' : 'Size guide created')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save size guide')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {editingId ? 'Edit Size Guide' : 'New Size Guide'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setStep('guide')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            step === 'guide'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          1. Guide Details
        </button>
        <button
          type="button"
          onClick={() => setStep('sizes')}
          disabled={!guideName.trim()}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            step === 'sizes'
              ? 'bg-primary text-white'
              : !guideName.trim()
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          2. Add Sizes
        </button>
      </div>

      {/* Step 1: Guide Details */}
      {step === 'guide' && (
        <div className="space-y-4">
          {/* Guide Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guide Name (e.g., Men's T-Shirts) *
            </label>
            <input
              type="text"
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
              placeholder="Enter size guide name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {SIZE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Fit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fit Type
            </label>
            <select
              value={fitType}
              onChange={(e) => setFitType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {FIT_TYPES.map(fit => (
                <option key={fit} value={fit}>
                  {fit.charAt(0).toUpperCase() + fit.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Measurement Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Measurement Unit
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="measurement_unit"
                  value="cm"
                  checked={measurementUnit === 'cm'}
                  onChange={(e) => setMeasurementUnit(e.target.value as 'cm' | 'inches')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Centimeters (cm)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="measurement_unit"
                  value="inches"
                  checked={measurementUnit === 'inches'}
                  onChange={(e) => setMeasurementUnit(e.target.value as 'cm' | 'inches')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Inches (in)</span>
              </label>
            </div>
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => setStep('sizes')}
            className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Next: Add Sizes →
          </button>
        </div>
      )}

      {/* Step 2: Add Sizes */}
      {step === 'sizes' && (
        <div className="space-y-4">
          {/* Size Presets */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick Add:</p>
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => addSize(size)}
                  disabled={sizes.some(s => s.size === size)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    sizes.some(s => s.size === size)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Added Sizes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Sizes ({sizes.length})</p>
            {sizes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">Add sizes above to get started</p>
            ) : (
              <div className="space-y-3">
                {sizes.map((sizeVariant, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border transition-colors ${
                      currentSizeIndex === idx
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => setCurrentSizeIndex(currentSizeIndex === idx ? null : idx)}
                        className="text-sm font-bold text-gray-900 hover:text-primary"
                      >
                        Size: {sizeVariant.size}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSize(idx)}
                        className="p-1 hover:bg-red-100 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Measurements for this size */}
                    {currentSizeIndex === idx && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                        {MEASUREMENT_OPTIONS.map(opt => (
                          <div key={opt.key} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id={`${idx}-${opt.key}`}
                              checked={Object.keys(sizeVariant.measurements).includes(opt.key)}
                              onChange={() => toggleMeasurement(idx, opt.key)}
                              className="w-4 h-4 mt-1 rounded border-gray-300"
                            />
                            <label htmlFor={`${idx}-${opt.key}`} className="flex-1 cursor-pointer">
                              <div className="text-sm font-medium text-gray-700">
                                {opt.label} ({measurementUnit === 'cm' ? 'cm' : 'in'})
                              </div>
                              {Object.keys(sizeVariant.measurements).includes(opt.key) && (
                                <input
                                  type="number"
                                  placeholder="0"
                                  step="0.1"
                                  value={sizeVariant.measurements[opt.key] || ''}
                                  onChange={(e) => updateSizeMeasurement(idx, opt.key, e.target.value)}
                                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep('guide')}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading || sizes.length === 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : editingId ? 'Update Guide' : 'Create Guide'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
