'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { 
  X, 
  Upload, 
  Trash2, 
  Edit3, 
  Search, 
  Check, 
  Crop as CropIcon,
  Loader2,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  ChevronUp
} from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface CloudinaryResource {
  public_id: string
  secure_url: string
  format: string
  width: number
  height: number
  bytes: number
  created_at: string
  context?: any
  tags?: string[]
  folder?: string
}

interface MediaManagerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (imageUrl: string, publicId: string) => void
  folder?: string
  allowMultiple?: boolean
  title?: string
}

interface CloudinaryFolder {
  name: string
  path: string
}

export default function MediaManagerDialog({
  isOpen,
  onClose,
  onSelect,
  folder = 'product-images',
  allowMultiple = false,
  title = 'Media Manager'
}: MediaManagerDialogProps) {
  const [currentFolder, setCurrentFolder] = useState(folder)
  const [folders, setFolders] = useState<CloudinaryFolder[]>([])
  const [subfolders, setSubfolders] = useState<CloudinaryFolder[]>([])
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [resources, setResources] = useState<CloudinaryResource[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  
  // Crop state
  const [croppingResource, setCroppingResource] = useState<CloudinaryResource | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parentFolder = currentFolder.includes('/')
    ? currentFolder.split('/').slice(0, -1).join('/')
    : ''

  const loadFolders = useCallback(async (parent = '') => {
    try {
      const params = new URLSearchParams({ mode: 'folders' })
      if (parent) params.set('parent', parent)

      const response = await fetch(`/api/cloudinary/media?${params}`)
      const data = await response.json()

      if (data.success) {
        setFolders(data.folders || [])
        setSubfolders(data.subfolders || [])
      }
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }, [])

  // Load media from Cloudinary
  const loadMedia = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        folder: currentFolder,
        max_results: '50',
      })
      if (!reset && nextCursor) {
        params.set('next_cursor', nextCursor)
      }

      const response = await fetch(`/api/cloudinary/media?${params}`)
      const data = await response.json()

      if (data.success) {
        setResources(prev => reset ? data.resources : [...prev, ...data.resources])
        setNextCursor(data.next_cursor || null)
      }
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setLoading(false)
    }
  }, [currentFolder, nextCursor])

  useEffect(() => {
    if (isOpen) {
      setCurrentFolder(folder)
      setNextCursor(null)
      loadFolders('')
      loadMedia(true)
      setSelectedIds(new Set())
    }
  }, [isOpen, folder, loadFolders, loadMedia])

  useEffect(() => {
    if (isOpen) {
      setNextCursor(null)
      setSelectedIds(new Set())
      loadMedia(true)
      loadFolders(currentFolder)
    }
  }, [currentFolder, isOpen, loadFolders, loadMedia])

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', currentFolder)

        const response = await fetch('/api/cloudinary/media', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()
        if (data.success && data.resource) {
          setResources(prev => [data.resource, ...prev])
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleCreateFolder = async () => {
    const trimmedName = newFolderName.trim()
    if (!trimmedName) return

    const folderPath = currentFolder ? `${currentFolder}/${trimmedName}` : trimmedName

    setCreatingFolder(true)
    try {
      const formData = new FormData()
      formData.append('action', 'create_folder')
      formData.append('folder_path', folderPath)

      const response = await fetch('/api/cloudinary/media', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        setNewFolderName('')
        loadFolders(currentFolder)
      }
    } catch (error) {
      console.error('Create folder failed:', error)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected image${ids.length > 1 ? 's' : ''}?`)) return

    try {
      const response = await fetch('/api/cloudinary/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_ids: ids }),
      })

      const data = await response.json()
      if (data.success) {
        setResources(prev => prev.filter(r => !selectedIds.has(r.public_id)))
        setSelectedIds(new Set())
      }
    } catch (error) {
      console.error('Bulk delete failed:', error)
    }
  }

  // Handle delete
  const handleDelete = async (publicId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const response = await fetch('/api/cloudinary/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId }),
      })

      const data = await response.json()
      if (data.success) {
        setResources(prev => prev.filter(r => r.public_id !== publicId))
        setSelectedIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(publicId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  // Handle rename
  const handleRename = async (publicId: string) => {
    if (!newName.trim()) return

    try {
      const pathParts = publicId.split('/')
      const newPublicId = [...pathParts.slice(0, -1), newName].join('/')

      const response = await fetch('/api/cloudinary/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id: publicId, new_public_id: newPublicId }),
      })

      const data = await response.json()
      if (data.success) {
        loadMedia(true)
        setRenamingId(null)
        setNewName('')
      }
    } catch (error) {
      console.error('Rename failed:', error)
    }
  }

  // Handle selection
  const handleSelectImage = (resource: CloudinaryResource) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resource.public_id)) {
        newSet.delete(resource.public_id)
      } else {
        newSet.add(resource.public_id)
      }
      return newSet
    })
  }

  // Handle crop
  const handleCropComplete = useCallback(async () => {
    if (!croppingResource || !completedCrop || !imgRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height

    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const formData = new FormData()
      formData.append('file', blob, 'cropped.png')
      formData.append('folder', currentFolder)

      try {
        const response = await fetch('/api/cloudinary/media', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()
        if (data.success && data.resource) {
          setResources(prev => [data.resource, ...prev])
          setCroppingResource(null)
          setCrop(undefined)
          setCompletedCrop(undefined)
        }
      } catch (error) {
        console.error('Crop upload failed:', error)
      }
    }, 'image/png')
  }, [croppingResource, completedCrop, currentFolder])

  // Handle final selection
  const handleConfirmSelection = () => {
    const selectedResources = resources.filter(r => selectedIds.has(r.public_id))
    if (selectedResources.length > 0) {
      const resource = selectedResources[0]
      onSelect(resource.secure_url, resource.public_id)
    }
    onClose()
  }

  // Filter resources by search
  const filteredResources = resources.filter(r =>
    r.public_id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalHeader title={title} onClose={onClose} description="Browse, upload, and manage your media assets" />
        
        <ModalBody className="p-0">
          {/* Toolbar */}
          <div className="p-4 border-b space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentFolder(parentFolder || folder)}
                disabled={!parentFolder}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Go to parent folder"
              >
                <ChevronUp className="w-4 h-4" />
                Up
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 min-w-[220px]">
                <Folder className="w-4 h-4 text-gray-500" />
                <span className="truncate" title={currentFolder}>{currentFolder}</span>
              </div>

              <select
                value={currentFolder}
                onChange={(e) => setCurrentFolder(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={currentFolder}>{currentFolder}</option>
                {folders.map((f) => (
                  <option key={f.path} value={f.path}>{f.path}</option>
                ))}
                {subfolders.map((f) => (
                  <option key={f.path} value={f.path}>{f.path}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload</>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(filteredResources.map((r) => r.public_id)))}
                disabled={filteredResources.length === 0}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FolderPlus className="w-4 h-4" />
                  {creatingFolder ? 'Creating...' : 'Create Folder'}
                </button>
              </div>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>

            {/* Selection Info */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                <Check className="w-4 h-4 text-blue-600" />
                {selectedIds.size} image{selectedIds.size > 1 ? 's' : ''} selected. You can delete selected in bulk.
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading && resources.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No images found</p>
                <p className="text-sm text-gray-400">Upload your first image to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredResources.map((resource) => {
                  const isSelected = selectedIds.has(resource.public_id)
                  const fileName = resource.public_id.split('/').pop() || resource.public_id

                  return (
                    <div
                      key={resource.public_id}
                      className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Image */}
                      <button
                        type="button"
                        onClick={() => handleSelectImage(resource)}
                        className="w-full aspect-square relative block"
                      >
                        <Image
                          src={resource.secure_url}
                          alt={fileName}
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

                      {/* Actions Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => setCroppingResource(resource)}
                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition"
                            title="Crop"
                          >
                            <CropIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingId(resource.public_id)
                              setNewName(fileName)
                            }}
                            className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white transition"
                            title="Rename"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(resource.public_id)}
                            className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded text-white transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2 bg-white">
                        <p className="text-xs text-gray-600 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {resource.width} × {resource.height} • {formatBytes(resource.bytes)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Load More */}
            {nextCursor && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => loadMedia(false)}
                  disabled={loading}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSelection}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select Image{selectedIds.size > 1 ? 's' : ''}
          </button>
        </ModalFooter>
      </Modal>

      {/* Rename Modal */}
      {renamingId && (
        <Modal isOpen={true} onClose={() => setRenamingId(null)} size="sm">
          <ModalHeader title="Rename Image" onClose={() => setRenamingId(null)} />
          <ModalBody>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(renamingId)
              }}
            />
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setRenamingId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleRename(renamingId)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Rename
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* Crop Modal */}
      {croppingResource && (
        <Modal isOpen={true} onClose={() => setCroppingResource(null)} size="xl">
          <ModalHeader title="Crop Image" onClose={() => setCroppingResource(null)} />
          <ModalBody>
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
              >
                <img
                  ref={imgRef}
                  src={croppingResource.secure_url}
                  alt="Crop preview"
                  className="max-h-[60vh] object-contain"
                />
              </ReactCrop>
            </div>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              onClick={() => setCroppingResource(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCropComplete}
              disabled={!completedCrop}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Crop & Upload
            </button>
          </ModalFooter>
        </Modal>
      )}
    </>
  )
}
