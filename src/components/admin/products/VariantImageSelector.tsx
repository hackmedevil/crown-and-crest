'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, X, Upload, ArrowLeft, ArrowRight } from 'lucide-react'

interface VariantImageSelectorProps {
    variantId: string
    variantLabel: string // e.g., "M / Blue"
    currentImages: string[]
    availableImages: string[] // All product images
    onUpdate: (images: string[]) => void
}

export default function VariantImageSelector({
    variantId,
    variantLabel,
    currentImages = [],
    availableImages = [],
    onUpdate
}: VariantImageSelectorProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedImages, setSelectedImages] = useState<string[]>(currentImages)
    const [isUploading, setIsUploading] = useState(false)

    const handleOpenModal = () => {
        setSelectedImages(currentImages)
        setIsModalOpen(true)
    }

    const handleSave = () => {
        onUpdate(selectedImages)
        setIsModalOpen(false)
    }

    const handleCancel = () => {
        setSelectedImages(currentImages)
        setIsModalOpen(false)
    }

    const toggleImageSelection = (imageUrl: string) => {
        setSelectedImages(prev =>
            prev.includes(imageUrl)
                ? prev.filter(img => img !== imageUrl)
                : [...prev, imageUrl]
        )
    }

    const moveImage = (index: number, direction: 'left' | 'right') => {
        setSelectedImages(prev => {
            const targetIndex = direction === 'left' ? index - 1 : index + 1
            if (targetIndex < 0 || targetIndex >= prev.length) return prev

            const next = [...prev]
            const temp = next[index]
            next[index] = next[targetIndex]
            next[targetIndex] = temp
            return next
        })
    }

    const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(true)

        try {
            // Upload each file using the Cloudinary action
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData()
                formData.append('file', file)

                // Use the uploadProductImage server action
                const { uploadProductImage } = await import('@/lib/cloudinary/actions')
                const result = await uploadProductImage(formData)

                // Result is Cloudinary response with secure_url
                if (!result || !result.secure_url) {
                    throw new Error('Upload failed - no URL returned')
                }

                return result.secure_url
            })

            const urls = await Promise.all(uploadPromises)
            console.log('[VariantImageSelector] Uploaded URLs:', urls)

            // Add newly uploaded images to selection
            setSelectedImages(prev => {
                const updated = [...prev, ...urls]
                console.log('[VariantImageSelector] Updated selectedImages:', updated)
                return updated
            })
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload images. Please try again.')
        } finally {
            setIsUploading(false)
        }
    }

    const firstImage = currentImages[0]
    const imageCount = currentImages.length

    return (
        <>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleOpenModal}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
                {firstImage ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100">
                        <Image
                            src={firstImage}
                            alt="Variant"
                            fill
                            sizes="40px"
                            className="object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
                <span className="text-sm text-gray-600">
                    {imageCount > 0 ? `${imageCount} image${imageCount > 1 ? 's' : ''}` : 'Add images'}
                </span>
            </button>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">
                                Select Images for: {variantLabel}
                            </h3>
                            <button
                                onClick={handleCancel}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Selected Images Preview */}
                            {selectedImages.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                                        Selected for this Variant ({selectedImages.length})
                                    </h4>
                                    <div className="grid grid-cols-4 gap-3">
                                        {selectedImages.map((imageUrl, idx) => (
                                            <div
                                                key={idx}
                                                className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 ring-2 ring-green-200"
                                            >
                                                <Image
                                                    src={imageUrl}
                                                    alt={`Selected ${idx + 1}`}
                                                    fill
                                                    sizes="(max-width: 768px) 25vw, 150px"
                                                    className="object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => toggleImageSelection(imageUrl)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                    title="Remove image"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="absolute left-1 right-1 bottom-1 flex items-center justify-between gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveImage(idx, 'left')}
                                                        disabled={idx === 0}
                                                        className="p-1 bg-white/90 rounded hover:bg-white disabled:opacity-40"
                                                        title="Move earlier"
                                                        aria-label="Move image earlier"
                                                    >
                                                        <ArrowLeft className="w-3 h-3 text-gray-700" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveImage(idx, 'right')}
                                                        disabled={idx === selectedImages.length - 1}
                                                        className="p-1 bg-white/90 rounded hover:bg-white disabled:opacity-40"
                                                        title="Move later"
                                                        aria-label="Move image later"
                                                    >
                                                        <ArrowRight className="w-3 h-3 text-gray-700" />
                                                    </button>
                                                </div>
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                                                    {idx + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Use arrows to set display order. Image 1 is shown first on storefront.
                                    </p>
                                </div>
                            )}

                            {/* Available Images Grid */}
                            {availableImages.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                                        Product Images (click to add/remove)
                                    </h4>
                                    <div className="grid grid-cols-4 gap-3">
                                        {availableImages.map((imageUrl, idx) => {
                                            const isSelected = selectedImages.includes(imageUrl)
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => toggleImageSelection(imageUrl)}
                                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected
                                                        ? 'border-blue-500 ring-2 ring-blue-200'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <Image
                                                        src={imageUrl}
                                                        alt={`Image ${idx + 1}`}
                                                        fill
                                                        sizes="(max-width: 768px) 25vw, 150px"
                                                        className="object-cover"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Upload New Images */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-3">
                                    Upload New Images
                                </h4>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleUploadImages}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-500">
                                        {isUploading ? 'Uploading...' : 'Click to upload images'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                            <span className="text-sm text-gray-600">
                                {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
