'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Check } from 'lucide-react'

interface MediaSelectorProps {
    isOpen: boolean
    productImages: { id: string; url: string }[]
    currentSelection: string | null
    onSelect: (imageUrl: string) => void
    onClose: () => void
}

/**
 * MEDIA SELECTOR (SHARED COMPONENT)
 * 
 * Core behavior:
 * - Shows only existing product media (no upload)
 * - Allows selecting exactly ONE image
 * - Variant points to media, no duplication
 */
export default function MediaSelector({
    isOpen,
    productImages,
    currentSelection,
    onSelect,
    onClose
}: MediaSelectorProps) {
    const [selected, setSelected] = useState<string | null>(currentSelection)

    if (!isOpen) return null

    const handleSelect = () => {
        if (selected) {
            onSelect(selected)
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">Select Image from Product Media</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {productImages.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-2">No product media available</p>
                            <p className="text-sm text-gray-400">Upload images in the Product Media section first</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {productImages.map((img) => {
                                const isSelected = selected === img.url
                                return (
                                    <button
                                        key={img.id}
                                        type="button"
                                        onClick={() => setSelected(img.url)}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected
                                                ? 'border-blue-500 ring-2 ring-blue-200 scale-95'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Image
                                            src={img.url}
                                            alt="Product media"
                                            fill
                                            sizes="200px"
                                            className="object-cover"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                    <span className="text-sm text-gray-600">
                        {selected ? 'Image selected' : 'Select an image'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSelect}
                            disabled={!selected}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Assign Image
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
