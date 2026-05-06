'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { ColorDefinition, generateColorId } from '@/constants/productOptions'

interface ColorDefinitionManagerProps {
    colors: ColorDefinition[]
    onChange: (colors: ColorDefinition[]) => void
}

export default function ColorDefinitionManager({ colors, onChange }: ColorDefinitionManagerProps) {
    const [newColor, setNewColor] = useState({ name: '', hex: '#000000' })

    const handleAddColor = () => {
        if (!newColor.name.trim()) {
            alert('Please enter a color name')
            return
        }

        const colorDef: ColorDefinition = {
            id: generateColorId(),
            name: newColor.name.trim(),
            hex: newColor.hex
        }

        onChange([...colors, colorDef])
        setNewColor({ name: '', hex: '#000000' })
    }

    const handleRemoveColor = (id: string) => {
        onChange(colors.filter(c => c.id !== id))
    }

    const handleUpdateColor = (id: string, updates: Partial<ColorDefinition>) => {
        onChange(colors.map(c => c.id === id ? { ...c, ...updates } : c))
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Define Product Colors
                </label>
                <p className="text-xs text-gray-500 mb-3">
                    Add custom colors with names and hex codes. These will appear as color circles in the variant selector.
                </p>
            </div>

            {/* Existing Colors */}
            {colors.length > 0 && (
                <div className="space-y-2">
                    {colors.map((color) => (
                        <div key={color.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div
                                className="w-10 h-10 rounded-full border-2 border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: color.hex }}
                                title={color.hex}
                            />
                            <input
                                type="text"
                                value={color.name}
                                onChange={(e) => handleUpdateColor(color.id, { name: e.target.value })}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                placeholder="Color name"
                            />
                            <input
                                type="color"
                                value={color.hex}
                                onChange={(e) => handleUpdateColor(color.id, { hex: e.target.value })}
                                className="w-16 h-10 rounded border border-gray-200 cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemoveColor(color.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Remove color"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Color */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div
                    className="w-10 h-10 rounded-full border-2 border-blue-300 flex-shrink-0"
                    style={{ backgroundColor: newColor.hex }}
                />
                <input
                    type="text"
                    value={newColor.name}
                    onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColor()}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Color name (e.g., Navy Blue)"
                />
                <input
                    type="color"
                    value={newColor.hex}
                    onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                    className="w-16 h-10 rounded border border-gray-200 cursor-pointer"
                />
                <button
                    type="button"
                    onClick={handleAddColor}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            </div>
        </div>
    )
}
