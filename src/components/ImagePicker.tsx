'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader } from 'lucide-react'
import Image from 'next/image'

interface ImagePickerProps {
  value?: string
  onChange: (url: string) => void
  folder?: string
  height?: string
}

export default function ImagePicker({ value, onChange, folder = 'carousel', height = 'h-48' }: ImagePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      
      // Validate that we got a proper Cloudinary URL
      if (!data.secure_url) {
        throw new Error('No secure URL returned from upload')
      }
      
      onChange(data.secure_url)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMsg)
      console.error('Image upload error:', err)
    } finally {
      setLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {value && (
        <div className="relative group">
          <div className={`relative ${height} w-full rounded-lg overflow-hidden bg-gray-100 border border-gray-200`}>
            <Image
              src={value}
              alt="Selected"
              fill
              sizes="100%"
              className="object-cover"
              onError={() => setError('Failed to load image preview')}
            />
          </div>
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">Click to upload image</p>
            <p className="text-xs text-gray-500">or drag and drop</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
