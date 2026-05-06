'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon, X } from 'lucide-react'
import MediaSelector from './MediaSelector'
import ConfirmationDialog from './ConfirmationDialog'

interface VariantImageSlotProps {
    variantLabel: string
    currentImageUrl: string | null
    productImages: { id: string; url: string }[]
    onAssignImage: (imageUrl: string) => void
    onRemoveFromVariant: () => void
    onRemoveFromProduct: () => void
}

/**
 * VARIANT IMAGE SLOT
 * 
 * Core behavior:
 * - NO upload button (variants don't own images)
 * - Click slot → Opens MediaSelector
 * - Shows thumbnail if assigned
 * - Delete → Confirmation with granular options
 */
export default function VariantImageSlot({
    variantLabel,
    currentImageUrl,
    productImages,
    onAssignImage,
    onRemoveFromVariant,
    onRemoveFromProduct
}: VariantImageSlotProps) {
    const [showMediaSelector, setShowMediaSelector] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowDeleteConfirm(true)
    }

    return (
        <>
            {/* Image Slot */}
            <div
                onClick={() => setShowMediaSelector(true)}
                className="group relative w-20 h-20 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden bg-gray-50 cursor-pointer"
                title={currentImageUrl ? "Change image" : "Assign image from product media"}
            >
                {currentImageUrl ? (
                    <>
                        <Image
                            src={currentImageUrl}
                            alt={variantLabel}
                            fill
                            sizes="80px"
                            className="object-cover"
                        />
                        {/* Remove button (shows on hover) */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                type="button"
                                onClick={handleRemoveClick}
                                className="p-1.5 bg-white rounded-full hover:bg-red-50 transition-colors"
                                title="Remove image"
                            >
                                <X className="w-4 h-4 text-red-600" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-medium">Assign</span>
                    </div>
                )}
            </div>

            {/* Media Selector Modal */}
            <MediaSelector
                isOpen={showMediaSelector}
                productImages={productImages}
                currentSelection={currentImageUrl}
                onSelect={onAssignImage}
                onClose={() => setShowMediaSelector(false)}
            />

            {/* Delete Confirmation */}
            <ConfirmationDialog
                isOpen={showDeleteConfirm}
                title="Remove image from variant?"
                message="This image is part of the product's media. What would you like to do?"
                variant="warning"
                options={[
                    {
                        label: 'Remove from this variant only',
                        action: onRemoveFromVariant,
                        variant: 'primary'
                    },
                    {
                        label: 'Remove from product media (affects all variants)',
                        action: onRemoveFromProduct,
                        variant: 'danger'
                    },
                    {
                        label: 'Cancel',
                        action: () => { },
                        variant: 'secondary'
                    }
                ]}
                onClose={() => setShowDeleteConfirm(false)}
            />
        </>
    )
}
