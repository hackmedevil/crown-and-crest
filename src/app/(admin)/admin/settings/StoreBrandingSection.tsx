'use client'

import { useState, useEffect } from 'react'
import { Store, Upload, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { getStoreSettingsAction, updateStoreSettingsAction } from './actions'
import type { StoreSettings } from '@/types/store'
import Image from 'next/image'

export default function StoreBrandingSection() {
    const [settings, setSettings] = useState<StoreSettings | null>(null)
    const [storeName, setStoreName] = useState('')
    const [logoUrl, setLogoUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Load settings on mount
    useEffect(() => {
        loadSettings()
    }, [])

    async function loadSettings() {
        setLoading(true)
        const { data, error } = await getStoreSettingsAction()
        if (data) {
            setSettings(data)
            setStoreName(data.store_name)
            setLogoUrl(data.logo_url)
        }
        setLoading(false)
    }

    async function handleSave() {
        if (!storeName.trim()) {
            setMessage({ type: 'error', text: 'Store name cannot be empty' })
            return
        }

        setSaving(true)
        setMessage(null)

        const { success, error } = await updateStoreSettingsAction({
            store_name: storeName.trim(),
            logo_url: logoUrl,
        })

        if (success) {
            setMessage({ type: 'success', text: 'Store branding updated successfully!' })
            await loadSettings() // Reload to get updated data
        } else {
            setMessage({ type: 'error', text: error || 'Failed to update settings' })
        }

        setSaving(false)

        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000)
    }

    function handleLogoUpload() {
        setUploading(true)

        // Open Cloudinary upload widget
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET

        if (!cloudName || !uploadPreset) {
            setMessage({ type: 'error', text: 'Cloudinary not configured' })
            setUploading(false)
            return
        }

        // @ts-ignore - Cloudinary widget is loaded via script tag
        if (typeof window.cloudinary === 'undefined') {
            setMessage({ type: 'error', text: 'Cloudinary widget not loaded. Please refresh the page.' })
            setUploading(false)
            return
        }

        // @ts-ignore
        const widget = window.cloudinary.createUploadWidget(
            {
                cloudName,
                uploadPreset,
                sources: ['local', 'url', 'camera'],
                multiple: false,
                clientAllowedFormats: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
                maxFileSize: 5000000, // 5MB
                cropping: true,
                croppingAspectRatio: 1,
                croppingShowDimensions: true,
                folder: 'store-branding',
            },
            (error: unknown, result: { event: string; info: { secure_url: string } }) => {
                if (error) {
                    console.error('Upload error:', error)
                    setMessage({ type: 'error', text: 'Failed to upload image' })
                    setUploading(false)
                    return
                }

                // Handle different events
                if (result.event === 'success') {
                    setLogoUrl(result.info.secure_url)
                    setMessage({ type: 'success', text: 'Logo uploaded! Click "Save Changes" to apply.' })
                    setUploading(false)
                } else if (result.event === 'close') {
                    // User closed the widget without uploading
                    setUploading(false)
                } else if (result.event === 'abort') {
                    // Upload was aborted
                    setUploading(false)
                }
            }
        )

        widget.open()
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-50 rounded-lg">
                    <Store className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Store Branding</h2>
                    <p className="text-xs text-gray-500">Configure your store name and logo</p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Store Name */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Store Name
                    </label>
                    <input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Crown & Crest"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        This name will appear in the header across your entire store
                    </p>
                </div>

                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Store Logo
                    </label>

                    {/* Logo Preview */}
                    {logoUrl ? (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                                    <Image
                                        src={logoUrl}
                                        alt="Store logo preview"
                                        fill
                                        className="object-contain p-2"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Current Logo</p>
                                    <p className="text-xs text-gray-500 mt-0.5 break-all">{logoUrl}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLogoUrl(null)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">No logo uploaded</p>
                            <p className="text-xs text-gray-500 mt-1">Using default logo</p>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        type="button"
                        onClick={handleLogoUpload}
                        disabled={uploading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        {uploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Upload New Logo
                            </>
                        )}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                        Recommended: Square image, at least 512x512px, PNG or SVG format
                    </p>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !storeName.trim()}
                        className="w-full px-6 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
