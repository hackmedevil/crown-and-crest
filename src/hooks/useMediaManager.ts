/**
 * useMediaManager Hook
 * 
 * Reusable hook that provides an easy way to integrate the MediaManagerDialog
 * anywhere in your application.
 * 
 * Usage Example:
 * ```tsx
 * import MediaManagerDialog from '@/components/admin/MediaManagerDialog'
 * 
 * const mediaManagerProps = useMediaManager({
 *   onSelect: (imageUrl, publicId) => {
 *     console.log('Selected:', imageUrl, publicId)
 *     setMyImageUrl(imageUrl)
 *   }
 * })
 * 
 * return (
 *   <div>
 *     <button onClick={mediaManagerProps.open}>Select Image</button>
 *     <MediaManagerDialog {...mediaManagerProps.dialogProps} />
 *   </div>
 * )
 * ```
 */

'use client'

import { useState } from 'react'

interface UseMediaManagerOptions {
  onSelect: (imageUrl: string, publicId: string) => void
  folder?: string
  allowMultiple?: boolean
  title?: string
}

export function useMediaManager({
  onSelect,
  folder = 'product-images',
  allowMultiple = false,
  title = 'Media Manager'
}: UseMediaManagerOptions) {
  const [isOpen, setIsOpen] = useState(false)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  const handleSelect = (imageUrl: string, publicId: string) => {
    onSelect(imageUrl, publicId)
    close()
  }

  return {
    open,
    close,
    isOpen,
    dialogProps: {
      isOpen,
      onClose: close,
      onSelect: handleSelect,
      folder,
      allowMultiple,
      title
    }
  }
}
