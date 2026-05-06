'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Upload, X, HelpCircle, GripVertical, Trash2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/useToast'
import { uploadProductImage } from '@/lib/cloudinary/actions'
import { upsertProduct } from '@/app/(admin)/admin/products/actions'
import VariantImageSlot from './VariantImageSlot'
import ConfirmationDialog from './ConfirmationDialog'
import RichTextEditor from './RichTextEditor'
import ColorDefinitionManager from './ColorDefinitionManager'
import { APPAREL_SIZES, ColorDefinition } from '@/constants/productOptions'

// Browser-safe ID generator
const generateId = () => {
    if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
        return window.crypto.randomUUID()
    }
    // Fallback for older browsers
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

const normalizeSeason = (value?: string | null): string | null => {
    if (!value) return null
    const normalized = value.trim().toLowerCase().replace(/\s+/g, '-').replace('_', '-')
    const aliases: Record<string, string> = {
        'allseason': 'all-season',
        'all-seasons': 'all-season'
    }
    const canonical = aliases[normalized] || normalized
    const allowed = new Set(['summer', 'winter', 'monsoon', 'all-season'])
    return allowed.has(canonical) ? canonical : null
}

const normalizeUsage = (value?: string | null): string | null => {
    if (!value) return null
    const normalized = value.trim().toLowerCase()
    const allowed = new Set(['casual', 'formal', 'sports', 'daily', 'party', 'work'])
    return allowed.has(normalized) ? normalized : null
}


type ProductOptions = {
    id: string
    name: string
    values: string[]
}

type ProductVariant = {
    id: string
    title: string
    price: number
    stock: number
    sku: string
    options: Record<string, string>
    imageUrl?: string | null  // Single image reference (Shopify pattern)
    variantImages?: Array<{
        id?: string
        image_url: string
        position: number
        is_primary: boolean
        alt_text?: string
    }>  // Multiple images with metadata
}

type ProductImage = {
    id: string
    url: string
    isPrimary?: boolean
}

type AssistantAiContent = {
    ai_title: string
    ai_description: string
    short_description: string
    long_description: string
    bullet_points: string[]
    ai_tags: string[]
    season?: string | null
    usage?: string | null
    fabric?: string[] | null
    style?: string[] | null
    weather?: string | null
    style_keywords?: string[] | null
    gender?: string | null
    fit?: string | null
    target_audience?: string | null
    seo: { meta_title: string; meta_description: string; slug: string }
}

type AssistantScores = {
    seo: number
    conversion: number
    brand: number
    overall: number
}

interface ProductFormProps {
    initialData?: {
        title?: string
        name?: string
        slug?: string
        category?: string
        base_price?: number
        description?: string
        short_description?: string
        bullet_points?: string[]
        tags?: string[]
        gender?: string | null
        fit?: string | null
        target_audience?: string | null
        ai_title?: string
        ai_description?: string
        ai_tags?: string[]
        season?: string | null
        fabric?: string[] | null
        usage?: string | null
        style?: string[] | string | null
        weather?: string | null
        style_keywords?: string[] | null
        images?: unknown[]
        options?: Array<{ name: string; values: string[] }>
        variants?: unknown[]
        [key: string]: unknown
    }
    onSuccess?: () => void
    isEditing?: boolean
}

export default function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [hasVariants, setHasVariants] = useState(isEditing ? ((initialData?.variants?.length ?? 0) > 0) : false)

    // Form State
    const [title, setTitle] = useState(initialData?.title || '')
    const [description, setDescription] = useState(initialData?.description || '')
    const [shortDescription, setShortDescription] = useState(initialData?.short_description || '')
    const [bulletPoints, setBulletPoints] = useState((initialData?.bullet_points || []).join('\n'))
    const [category, setCategory] = useState(initialData?.category || '')
    const [categoryId, setCategoryId] = useState<string>((initialData?.category_id as string) || '')
    const [parentCategoryId, setParentCategoryId] = useState<string>('')
    const [sizeChartId, setSizeChartId] = useState<string>((initialData?.size_chart_id as string) || '')
    const [tags, setTags] = useState((initialData?.tags || []).join(', '))
    const [aiTitle, setAiTitle] = useState(initialData?.ai_title || '')
    const [aiDescription, setAiDescription] = useState(initialData?.ai_description || '')
    const [aiTags, setAiTags] = useState((initialData?.ai_tags || []).join(', '))
    const [season, setSeason] = useState(normalizeSeason(initialData?.season as string | null) || '')
    const [fabric, setFabric] = useState((initialData?.fabric || []).join(', '))
    const [usage, setUsage] = useState(normalizeUsage(initialData?.usage as string | null) || '')
    const [style, setStyle] = useState(Array.isArray(initialData?.style) ? (initialData?.style as string[]).join(', ') : (initialData?.style as string || ''))
    const [weather, setWeather] = useState(initialData?.weather || '')
    const [styleKeywords, setStyleKeywords] = useState((initialData?.style_keywords || []).join(', '))
    const [gender, setGender] = useState(initialData?.gender || '')
    const [fit, setFit] = useState(initialData?.fit || '')
    const [targetAudience, setTargetAudience] = useState(initialData?.target_audience || '')
    const [priceRange, setPriceRange] = useState('')

    const [aiGenerating, setAiGenerating] = useState(false)
    const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
    const [aiAssistantContent, setAiAssistantContent] = useState<AssistantAiContent | null>(null)
    const [aiAssistantScores, setAiAssistantScores] = useState<AssistantScores | null>(null)
    const [price, setPrice] = useState(String(initialData?.price || ''))
    const [compareAtPrice, setCompareAtPrice] = useState(String(initialData?.compareAtPrice || ''))
    const [costPerItem, setCostPerItem] = useState(String(initialData?.costPerItem || ''))
    const [sku, setSku] = useState(String(initialData?.sku || ''))
    const [barcode, setBarcode] = useState(String(initialData?.barcode || ''))

    // SEO State
    const [metaTitle, setMetaTitle] = useState<string>(initialData?.meta_title as string || '')
    const [metaDescription, setMetaDescription] = useState<string>(initialData?.meta_description as string || '')
    const [metaKeywords, setMetaKeywords] = useState<string>(initialData?.meta_keywords as string || '')
    const [seoSlug, setSeoSlug] = useState<string>(initialData?.seo_slug as string || '')

    // Color Definitions State
    const [colorDefinitions, setColorDefinitions] = useState<ColorDefinition[]>(
        (initialData?.color_definitions as ColorDefinition[]) || []
    )

    // Images State
    const [images, setImages] = useState<ProductImage[]>((initialData?.images as ProductImage[]) || [])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const seoSectionRef = useRef<HTMLDivElement>(null)
    const metaTitleRef = useRef<HTMLInputElement>(null)

    // Variants State
    // Variants State
    // Force Size and Color to exist
    const defaultOptions = [
        { id: generateId(), name: 'Size', values: [] },
        {
            id: generateId(), name: 'Color', values: []
        }
    ]

    const mergedOptions = initialData?.options && initialData.options.length > 0
        ? [
            // Find existing or use default
            { id: generateId(), ...(initialData.options.find((o: { name: string }) => o.name === 'Size') || defaultOptions[0]) },
            { id: generateId(), ...(initialData.options.find((o: { name: string }) => o.name === 'Color') || defaultOptions[1]) }
        ]
        : defaultOptions

    const [options, setOptions] = useState<ProductOptions[]>(mergedOptions)
    const [variants, setVariants] = useState<ProductVariant[]>((initialData?.variants as ProductVariant[]) || [])

    // Delete confirmation state
    const [deleteConfirmation, setDeleteConfirmation] = useState({
        show: false,
        imageId: null as string | null,
        usageCount: 0,
        onConfirm: () => { }
    })

    // Categories and Size Guides State
    type Category = {
        id: string
        name: string
        slug: string
        parent_id: string | null
    }
    type SizeGuide = {
        id: string
        name: string
        category: string
    }
    const [categories, setCategories] = useState<Category[]>([])
    const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([])

    // Helper: Calculate how many variants use each product image
    const getImageUsageCount = (imageUrl: string): number => {
        return variants.filter(v => v.imageUrl === imageUrl).length
    }

    // Fetch categories and size guides on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [categoriesRes, sizeGuidesRes] = await Promise.all([
                    fetch('/api/admin/categories'),
                    fetch('/api/admin/size-guides')
                ])

                if (categoriesRes.ok) {
                    const { categories: cats } = await categoriesRes.json()
                    setCategories(cats || [])
                    
                    // If editing and has category_id, determine parent
                    if (isEditing && initialData?.category_id) {
                        const currentCategory = cats?.find((c: Category) => c.id === initialData.category_id)
                        if (currentCategory?.parent_id) {
                            setParentCategoryId(currentCategory.parent_id)
                        }
                    }
                }

                if (sizeGuidesRes.ok) {
                    const { sizeGuides: guides } = await sizeGuidesRes.json()
                    setSizeGuides(guides || [])
                }
            } catch (error) {
                console.error('Error fetching categories/size guides:', error)
            }
        }
        fetchData()
    }, [isEditing, initialData?.category_id])

    // Sync form state when initialData changes (handles case where component mounts before data loads)
    useEffect(() => {
        if (!initialData) return

        setTitle(initialData.title || '')
        setDescription(initialData.description || '')
        setShortDescription(initialData.short_description || '')
        setBulletPoints((initialData.bullet_points || []).join('\n'))
        setCategory(initialData.category || '')
        setCategoryId((initialData.category_id as string) || '')
        setSizeChartId((initialData.size_chart_id as string) || '')
        setTags((initialData.tags || []).join(', '))
        setAiTitle(initialData.ai_title || '')
        setAiDescription(initialData.ai_description || '')
        setAiTags((initialData.ai_tags || []).join(', '))
        setSeason(normalizeSeason(initialData.season as string | null) || '')
        setFabric((initialData.fabric || []).join(', '))
        setUsage(normalizeUsage(initialData.usage as string | null) || '')
        setStyle(Array.isArray(initialData.style) ? (initialData.style as string[]).join(', ') : (initialData.style as string || ''))
        setWeather(initialData.weather || '')
        setStyleKeywords((initialData.style_keywords || []).join(', '))
        setGender(initialData.gender || '')
        setFit(initialData.fit || '')
        setTargetAudience(initialData.target_audience || '')
        
        // Pricing fields
        setPrice(String(initialData.price || ''))
        setCompareAtPrice(String(initialData.compareAtPrice || ''))
        setCostPerItem(String(initialData.costPerItem || ''))
        setSku(String(initialData.sku || ''))
        setBarcode(String(initialData.barcode || ''))
        
        // SEO fields
        setMetaTitle(initialData.meta_title as string || '')
        setMetaDescription(initialData.meta_description as string || '')
        setMetaKeywords(initialData.meta_keywords as string || '')
        setSeoSlug(initialData.seo_slug as string || '')
        
        // Images
        setImages((initialData.images as ProductImage[]) || [])
        
        // Color definitions
        setColorDefinitions((initialData.color_definitions as ColorDefinition[]) || [])
        
        // Options and variants
        if (initialData.options && initialData.options.length > 0) {
            const updatedOptions = [
                { id: generateId(), ...(initialData.options.find((o: { name: string }) => o.name === 'Size') || defaultOptions[0]) },
                { id: generateId(), ...(initialData.options.find((o: { name: string }) => o.name === 'Color') || defaultOptions[1]) }
            ]
            setOptions(updatedOptions)
        }
        setVariants((initialData.variants as ProductVariant[]) || [])
        
        // If editing and has category_id, set parent
        if (isEditing && initialData.category_id && categories.length > 0) {
            const currentCategory = categories.find((c: Category) => c.id === initialData.category_id)
            if (currentCategory?.parent_id) {
                setParentCategoryId(currentCategory.parent_id)
            }
        }
    }, [initialData, isEditing])



    // --- Image Handling Logic ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newImages: ProductImage[] = Array.from(e.target.files).map(file => ({
                id: generateId(),
                url: URL.createObjectURL(file), // Create local preview URL
                isPrimary: false
            }))

            // If it's the first image being added, make it primary
            if (images.length === 0 && newImages.length > 0) {
                newImages[0].isPrimary = true
            }

            setImages([...images, ...newImages])
        }
    }

    const removeImage = (id: string) => {
        const newImages = images.filter(img => img.id !== id)
        // Reassign primary if the primary image was deleted
        if (images.find(img => img.id === id)?.isPrimary && newImages.length > 0) {
            newImages[0].isPrimary = true
        }
        setImages(newImages)
    }

    const handleAddImageFromUrl = () => {
        if (typeof window === 'undefined') return
        const urlInput = window.prompt('Paste an image URL')
        if (!urlInput) return
        let parsedUrl: URL
        try {
            parsedUrl = new URL(urlInput)
        } catch {
            showError('Please enter a valid URL.')
            return
        }
        const url = parsedUrl.toString()
        const newImage: ProductImage = {
            id: generateId(),
            url,
            isPrimary: images.length === 0
        }
        setImages(prev => [...prev, newImage])
    }

    // Product Media deletion with confirmation (Shopify pattern)
    const removeImageWithConfirmation = (imageId: string) => {
        const imageToDelete = images.find(img => img.id === imageId)
        if (!imageToDelete) return

        const usageCount = getImageUsageCount(imageToDelete.url)

        if (usageCount === 0) {
            // Delete immediately - not used by any variants
            removeImage(imageId)
        } else {
            // Show confirmation - used by variants
            setDeleteConfirmation({
                show: true,
                imageId,
                usageCount,
                onConfirm: () => {
                    // Delete from product images
                    setImages(images.filter(img => img.id !== imageId))
                    // Clear from all variants using it
                    setVariants(variants.map(v =>
                        v.imageUrl === imageToDelete.url
                            ? { ...v, imageUrl: null }
                            : v
                    ))
                    setDeleteConfirmation({ show: false, imageId: null, usageCount: 0, onConfirm: () => { } })
                }
            })
        }
    }

    // Variant image assignment (from MediaSelector)
    const handleVariantImageAssign = (variantId: string, imageUrl: string) => {
        setVariants(variants.map(v => {
            if (v.id !== variantId) return v
            
            // Get existing variant images or initialize array
            const existingImages = v.variantImages || []
            const isPrimary = existingImages.length === 0  // First image is primary
            
            // Check if this image already exists
            const imageExists = existingImages.some(img => img.image_url === imageUrl)
            if (imageExists) return v
            
            // Add new image to variantImages array
            const newVariantImage = {
                image_url: imageUrl,
                position: existingImages.length,
                is_primary: isPrimary,
                alt_text: undefined
            }
            
            return {
                ...v,
                imageUrl: isPrimary ? imageUrl : v.imageUrl,  // Update imageUrl if it's primary
                variantImages: [...existingImages, newVariantImage]
            }
        }))
    }

    // Variant image removal with two options (Shopify pattern)
    const handleVariantImageRemove = (variantId: string, removeFromProduct: boolean) => {
        const variant = variants.find(v => v.id === variantId)
        if (!variant?.imageUrl) {
            return
        }

        if (removeFromProduct) {
            const imageToDelete = images.find(img => img.url === variant.imageUrl)
            if (imageToDelete) {
                // Remove from product media and ALL variants
                setImages(images.filter(img => img.id !== imageToDelete.id))
                setVariants(variants.map(v =>
                    v.imageUrl === variant.imageUrl
                        ? { ...v, imageUrl: null }
                        : v
                ))
            }
        } else {
            // Remove from this variant only
            setVariants(variants.map(v =>
                v.id === variantId ? { ...v, imageUrl: null } : v
            ))
        }
    }

    const removeVariant = (variantId: string) => {
        setVariants(prev => prev.filter(v => v.id !== variantId))
    }

    const handleEditSeo = () => {
        seoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTimeout(() => metaTitleRef.current?.focus(), 250)
    }

    const setPrimaryImage = (id: string) => {
        setImages(images.map(img => ({
            ...img,
            isPrimary: img.id === id
        })))
    }

    // --- Variants Logic ---
    useEffect(() => {
        if (!hasVariants) return

        const generateVariants = () => {
            const validOptions = options.filter(opt => opt.name && opt.values.length > 0)
            if (validOptions.length === 0) return []

            const cartesian = (sets: string[][]) => {
                return sets.reduce<string[][]>((acc, set) => {
                    return acc.flatMap(x => set.map(y => [...x, y]))
                }, [[]])
            }

            const combinations = cartesian(validOptions.map(opt => opt.values))

            return combinations.map(combo => {
                const variantOptions: Record<string, string> = {}
                validOptions.forEach((opt, idx) => {
                    variantOptions[opt.name] = combo[idx]
                })

                // Create a unique key for this combination to check for existing data
                const comboKey = combo.join(' / ')  // Match database format: "L / white"
                const existing = variants.find(v => v.title === comboKey)

                // Auto-generate SKU if not exists: PRODUCTSLUG-SIZE-COLOR
                const autoSku = existing?.sku ||
                    `${title.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${combo.join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '')}`

                return {
                    id: existing?.id || generateId(),
                    title: comboKey,
                    price: existing?.price || Number(price) || 0,
                    stock: existing?.stock || 0,
                    sku: autoSku,
                    options: variantOptions,
                    imageUrl: existing?.imageUrl || null  // Preserve imageUrl when regenerating
                }
            })
        }

        const newVariants = generateVariants()
        if (JSON.stringify(newVariants?.map(v => v.title)) !== JSON.stringify(variants.map(v => v.title))) {
            setVariants(newVariants || [])
        }
    }, [options, hasVariants, price])

    const addOption = () => setOptions([...options, {
        id: generateId(), name: '', values: []
    }])
    const removeOption = (id: string) => setOptions(options.filter(opt => opt.id !== id))

    const updateOptionName = (id: string, name: string) => {
        setOptions(options.map(opt => opt.id === id ? { ...opt, name } : opt))
    }

    const addOptionValue = (id: string, value: string) => {
        if (!value.trim()) return
        setOptions(options.map(opt => {
            if (opt.id === id && !opt.values.includes(value.trim())) {
                return { ...opt, values: [...opt.values, value.trim()] }
            }
            return opt
        }))
    }

    const removeOptionValue = (id: string, valueToRemove: string) => {
        setOptions(options.map(opt => {
            if (opt.id === id) {
                return { ...opt, values: opt.values.filter(v => v !== valueToRemove) }
            }
            return opt
        }))
    }

    const updateVariant = (id: string, field: keyof ProductVariant, value: unknown) => {
        setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v))
    }

    const splitCsv = (value: string) => value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)

    const { showSuccess, showError, showLoading } = useToast()
    const router = useRouter()

    // Close AI Assistant when navigating away from this page
    useEffect(() => {
        return () => {
            setAiAssistantOpen(false)
        }
    }, [])

    useEffect(() => {
        const cacheKey = `ai_generation_${initialData?.id || 'new'}`
        const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null
        if (cached) {
            try {
                const parsed = JSON.parse(cached)
                if (parsed?.ai_title) {
                    applyAiContent(parsed)
                }
            } catch {
                // ignore cache parse errors
            }
        }
    }, [initialData?.id])

    useEffect(() => {
        if (!priceRange && price) {
            setPriceRange(`₹${Number(price).toLocaleString('en-IN')}`)
        }
    }, [price, priceRange])

    const applyAiContent = (data: {
        ai_title: string
        short_description: string
        long_description: string
        bullet_points: string[]
        ai_tags: string[]
        ai_description?: string
        seo: { meta_title: string; meta_description: string; slug: string }
        season?: string | null
        usage?: string | null
        fabric?: string[] | string | null
        style?: string[] | string | null
        weather?: string | null
        style_keywords?: string[] | string | null
        gender?: string | null
        fit?: string | null
        target_audience?: string | null
    }) => {
        setAiTitle(data.ai_title)
        setShortDescription(data.short_description)
        setBulletPoints(data.bullet_points.join('\n'))
        setAiTags(data.ai_tags.join(', '))
        setMetaTitle(data.seo.meta_title)
        setMetaDescription(data.seo.meta_description)
        setSeoSlug(data.seo.slug)

        if (data.ai_description) {
            setAiDescription(data.ai_description)
        }
        if (data.season) setSeason(normalizeSeason(data.season) || '')
        if (data.usage) setUsage(normalizeUsage(data.usage) || '')
        if (data.fabric) {
            const fabricValue = Array.isArray(data.fabric) ? data.fabric.join(', ') : data.fabric
            setFabric(fabricValue || '')
        }
        if (data.style) {
            const styleValue = Array.isArray(data.style) ? data.style.join(', ') : data.style
            setStyle(styleValue || '')
        }
        if (data.weather) setWeather(data.weather)
        if (data.style_keywords) {
            const styleKeywordsValue = Array.isArray(data.style_keywords) ? data.style_keywords.join(', ') : data.style_keywords
            setStyleKeywords(styleKeywordsValue || '')
        }
        if (data.gender) setGender(data.gender)
        if (data.fit) setFit(data.fit)
        if (data.target_audience) setTargetAudience(data.target_audience)

        const bulletBlock = data.bullet_points.length > 0
            ? `\n\nKey Features:\n${data.bullet_points.map(p => `• ${p}`).join('\n')}`
            : ''

        setDescription(`${data.long_description}${bulletBlock}`.trim())
        setAiDescription(data.ai_description || data.long_description)
    }

    const generateAssistantContent = async () => {
        const missing: string[] = []
        if (!title.trim()) missing.push('Product name')
        if (!category.trim()) missing.push('Category')

        const resolvedPriceRange = priceRange.trim() || (price ? `₹${Number(price).toLocaleString('en-IN')}` : '')

        if (missing.length > 0) {
            showError(`Add required fields: ${missing.join(', ')}`)
            return null
        }

        setAiGenerating(true)
        try {
            const response = await fetch('/api/admin/products/ai-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: title,
                    category,
                    description: description || undefined,
                    shortDescription: shortDescription || undefined,
                    bulletPoints: bulletPoints || undefined,
                    fabric: fabric.trim() || undefined,
                    season: season.trim() || undefined,
                    gender: gender.trim() || undefined,
                    style: style.trim() || undefined,
                    fit: fit.trim() || undefined,
                    usage: usage.trim() || undefined,
                    weather: weather.trim() || undefined,
                    styleKeywords: styleKeywords.trim() || undefined,
                    priceRange: resolvedPriceRange || undefined,
                    targetAudience: targetAudience.trim() || undefined
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'Failed to generate AI content')
            }

            setAiAssistantContent(data.content)
            setAiAssistantScores(data.scores)

            return data.content as AssistantAiContent
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to generate content'
            showError(message)
            return null
        } finally {
            setAiGenerating(false)
        }
    }

    const handleGenerateWithAI = async () => {
        setAiAssistantOpen(true)
        const content = await generateAssistantContent()
        if (!content) return

        const cacheKey = `ai_generation_${initialData?.id || 'new'}`
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(cacheKey, JSON.stringify(content))
        }

        showSuccess('AI content generated. Review and apply from AI Assistant.')
    }

    const applyAssistantToForm = () => {
        if (!aiAssistantContent) {
            showError('Generate AI content first')
            return
        }

        applyAiContent(aiAssistantContent)

        const cacheKey = `ai_generation_${initialData?.id || 'new'}`
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(cacheKey, JSON.stringify(aiAssistantContent))
        }

        showSuccess('AI assistant content applied to product form')
    }

    const handleRegenerate = async () => {
        const cacheKey = `ai_generation_${initialData?.id || 'new'}`
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(cacheKey)
        }
        setAiAssistantOpen(true)
        await generateAssistantContent()
    }

    const handleSave = async () => {
        if (!title) {
            showError('Please enter a product title')
            return
        }

        setIsLoading(true)
        const toastId = showLoading('Saving product...')

        try {
            // 1. Upload new images
            const uploadedImages = await Promise.all(images.map(async (img) => {
                if (img.url.startsWith('blob:')) {
                    const file = await fetch(img.url).then(r => r.blob())
                    const formData = new FormData()
                    formData.append('file', file)

                    // Use Server Action for upload
                    const data = await uploadProductImage(formData)

                    if (!data || !data.secure_url) {
                        throw new Error('Failed to upload image')
                    }

                    return { ...img, url: data.secure_url }
                }
                return img
            }))

            // 2. Prepare Product Data
            const slug = seoSlug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            const normalizedBulletPoints = bulletPoints
                ? splitCsv(bulletPoints.replace(/\n/g, ','))
                : null

            // Helper to safely sanitize array fields - remove undefined, null, empty strings
            const sanitizeArray = (arr: any[]): string[] => {
                if (!Array.isArray(arr)) return []
                return arr
                    .filter(item => item !== null && item !== undefined && item !== '')
                    .map(item => String(item).trim())
                    .filter(item => item.length > 0)
            }

            const productData = {
                name: title,
                slug,
                description,
                short_description: shortDescription || null,
                ...(normalizedBulletPoints && normalizedBulletPoints.length > 0
                    ? { bullet_points: sanitizeArray(normalizedBulletPoints) }
                    : {}),
                base_price: Number(price),
                category: category || null, // Keep for backwards compatibility
                category_id: categoryId || null, // New structured category
                tags: tags ? sanitizeArray(splitCsv(tags)) : [],
                gender: gender || null,
                fit: fit || null,
                target_audience: targetAudience || null,
                ai_title: aiTitle || null,
                ai_description: aiDescription || null,
                ai_tags: aiTags ? sanitizeArray(splitCsv(aiTags)) : [],
                season: normalizeSeason(season),
                fabric: fabric ? sanitizeArray(splitCsv(fabric)) : [],
                usage: normalizeUsage(usage),
                style: style ? sanitizeArray(splitCsv(style)) : [],
                weather: weather || null,
                style_keywords: styleKeywords ? sanitizeArray(splitCsv(styleKeywords)) : [],
                // compare_at_price: compareAtPrice ? Number(compareAtPrice) : null,
                // cost_per_item: costPerItem ? Number(costPerItem) : null,
                // sku, 
                is_active: true,
                images: uploadedImages, // JSONB array
                image_url: uploadedImages.find(i => i.isPrimary)?.url || uploadedImages[0]?.url || null,
                // SEO fields
                meta_title: metaTitle || null,
                meta_description: metaDescription || null,
                meta_keywords: metaKeywords || null,
                seo_slug: seoSlug || null,
                // Color definitions - sanitize to ensure valid JSON
                color_definitions: Array.isArray(colorDefinitions) ? colorDefinitions : []
            }

            const optionalKeys = new Set([
                'short_description',
                'bullet_points',
                'category',
                'category_id',
                'tags',
                'gender',
                'fit',
                'target_audience',
                'ai_title',
                'ai_description',
                'ai_tags',
                'season',
                'fabric',
                'usage',
                'style',
                'weather',
                'style_keywords',
                'meta_title',
                'meta_description',
                'meta_keywords',
                'seo_slug',
                'color_definitions'
            ])

            const productPayload = Object.fromEntries(
                Object.entries(productData).filter(([key, value]) => {
                    if (!optionalKeys.has(key)) return true
                    if (value === null || value === undefined) return false
                    if (typeof value === 'string' && value.trim() === '') return false
                    if (Array.isArray(value) && value.length === 0) return false
                    return true
                })
            )

            // 3. Call Server Action
            // Map variants to match actions.ts interface
            // Extract size and color from options for proper matching in server action
            const mappedVariants = variants.map(v => {
                const options = v.options || {}
                const sizeKey = Object.keys(options).find(k => k.toLowerCase() === 'size')
                const colorKey = Object.keys(options).find(k => k.toLowerCase() === 'color')
                const size = sizeKey ? options[sizeKey] : ''
                const color = colorKey ? options[colorKey] : ''
                
                return {
                    ...v,
                    size,
                    color,
                    stock_quantity: v.stock,
                    sku: v.sku,
                    images: v.imageUrl ? [v.imageUrl] : []  // Map single imageUrl to array for backend
                }
            })
            let payload = { ...productPayload }
            let result = await upsertProduct(payload, mappedVariants, isEditing, initialData?.id as string | undefined)
            let skippedColumns: string[] = []

            if (!result.success) {
                const missingColumnRegex = /Could not find the '(.+?)' column of 'products'/i
                const maxRetries = 8
                for (let attempt = 0; attempt < maxRetries && !result.success; attempt += 1) {
                    const match = result.error?.match(missingColumnRegex)
                    const missingColumn = match?.[1]
                    if (!missingColumn) break
                    if (missingColumn in payload) {
                        delete (payload as Record<string, unknown>)[missingColumn]
                        skippedColumns.push(missingColumn)
                    } else {
                        break
                    }
                    result = await upsertProduct(payload, mappedVariants, isEditing, initialData?.id as string | undefined)
                }
            }

            if (!result.success) {
                throw new Error(result.error)
            }

            // 4. Handle Size Guide Linking (if selected)
            if (result.productId && sizeChartId) {
                try {
                    const { error: linkError } = await supabase
                        .from('product_size_charts')
                        .upsert({
                            product_id: result.productId,
                            size_chart_id: sizeChartId
                        })
                    
                    if (linkError) {
                        console.error('Error linking size guide:', linkError)
                        showError('Product saved but size guide linking failed')
                    }
                } catch (linkErr) {
                    console.error('Size guide link exception:', linkErr)
                }
            }

            showSuccess(skippedColumns.length > 0
                ? `Product saved (skipped missing columns: ${skippedColumns.join(', ')}).`
                : 'Product saved successfully'
            )
            router.push('/admin/products')
            router.refresh()
        } catch (error: unknown) {
            console.error('Error saving product:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to save product'
            showError(errorMessage)
        } finally {
            setIsLoading(false)
            // toast.dismiss(toastId) // useToast dismiss might be needed if showLoading doesn't auto-dismiss
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            < div className="flex items-center justify-between sticky top-20 z-20 bg-gray-50/80 backdrop-blur-sm p-4 -mx-4 rounded-xl border border-gray-200/50 shadow-sm transition-all">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/products"
                        onClick={() => setAiAssistantOpen(false)}
                        className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Edit Product' : 'Add Product'}
                    </h1 >
                </div >
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin/products" 
                        onClick={() => setAiAssistantOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition-colors border border-transparent hover:border-gray-300">
                        Discard
                    </Link >
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}
                    >
                        {isLoading ? 'Saving...' : 'Save'}
                    </button >
                </div >
            </div >

            <div className="grid grid-cols-1 lg: grid-cols-3 gap-8">
                {/* Left Column-Main Info */}
                < div className="lg: col-span-2 space-y-6">
                    {/* Basic Info */}
                    < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Short Sleeve T-Shirt" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                        </div >
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Description</label>
                            <RichTextEditor
                                content={description}
                                onChange={setDescription}
                                placeholder="Describe your product... Use the toolbar to format text."
                            />
                        </div>
                    </div>

                    {/* AI Search Fields */}
                    <div ref={seoSectionRef} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900">AI Content Generator</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setAiAssistantOpen(true)}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Open AI Assistant
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGenerateWithAI}
                                    disabled={aiGenerating}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-60"
                                >
                                    {aiGenerating ? 'Generating...' : '✨ Generate with AI'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRegenerate}
                                    disabled={aiGenerating}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60"
                                >
                                    Regenerate
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">AI-generated content. Please review before publishing.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">AI Title</label>
                                <input
                                    type="text"
                                    value={aiTitle}
                                    onChange={(e) => setAiTitle(e.target.value)}
                                    placeholder="Lightweight summer cotton shirt"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">AI Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={aiTags}
                                    onChange={(e) => setAiTags(e.target.value)}
                                    placeholder="cotton, breathable, summer"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">AI Description</label>
                                <textarea
                                    rows={3}
                                    value={aiDescription}
                                    onChange={(e) => setAiDescription(e.target.value)}
                                    placeholder="Concise semantic description used for AI search."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Short Description</label>
                                <textarea
                                    rows={2}
                                    value={shortDescription}
                                    onChange={(e) => setShortDescription(e.target.value)}
                                    placeholder="Short summary for listings"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Bullet Points (one per line)</label>
                                <textarea
                                    rows={4}
                                    value={bulletPoints}
                                    onChange={(e) => setBulletPoints(e.target.value)}
                                    placeholder="Breathable cotton fabric\nRelaxed fit for all-day comfort"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Season</label>
                                <select
                                    value={season}
                                    onChange={(e) => setSeason(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">Select season</option>
                                    <option value="summer">Summer</option>
                                    <option value="winter">Winter</option>
                                    <option value="monsoon">Monsoon</option>
                                    <option value="all-season">All season</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Usage</label>
                                <select
                                    value={usage}
                                    onChange={(e) => setUsage(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">Select usage</option>
                                    <option value="casual">Casual</option>
                                    <option value="formal">Formal</option>
                                    <option value="sports">Sports</option>
                                    <option value="daily">Daily</option>
                                    <option value="party">Party</option>
                                    <option value="work">Work</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Fabric (comma separated)</label>
                                <input
                                    type="text"
                                    value={fabric}
                                    onChange={(e) => setFabric(e.target.value)}
                                    placeholder="cotton, linen"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Style (comma separated)</label>
                                <input
                                    type="text"
                                    value={style}
                                    onChange={(e) => setStyle(e.target.value)}
                                    placeholder="minimal, relaxed"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Weather</label>
                                <input
                                    type="text"
                                    value={weather}
                                    onChange={(e) => setWeather(e.target.value)}
                                    placeholder="hot, humid"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Style Keywords (comma separated)</label>
                                <input
                                    type="text"
                                    value={styleKeywords}
                                    onChange={(e) => setStyleKeywords(e.target.value)}
                                    placeholder="breathable, soft, lightweight"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Gender</label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">Select gender</option>
                                    <option value="men">Men</option>
                                    <option value="women">Women</option>
                                    <option value="unisex">Unisex</option>
                                    <option value="kids">Kids</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Fit</label>
                                <select
                                    value={fit}
                                    onChange={(e) => setFit(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    <option value="">Select fit</option>
                                    <option value="slim">Slim</option>
                                    <option value="regular">Regular</option>
                                    <option value="relaxed">Relaxed</option>
                                    <option value="oversized">Oversized</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Target Audience</label>
                                <input
                                    type="text"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    placeholder="e.g. office professionals"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Price Range</label>
                                <input
                                    type="text"
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(e.target.value)}
                                    placeholder="e.g. ₹1,499–₹1,999"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* SEO */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <h3 className="text-sm font-bold text-gray-900">Search Engine Listing</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Meta Title</label>
                                <input
                                    ref={metaTitleRef}
                                    type="text"
                                    value={metaTitle}
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    placeholder={title || 'Product title'}
                                    maxLength={60}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                                />
                                <p className="text-xs text-gray-500">{metaTitle.length}/60 characters</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Meta Description</label>
                                <textarea
                                    rows={3}
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    placeholder="Brief description for search engines"
                                    maxLength={160}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                                />
                                <p className="text-xs text-gray-500">{metaDescription.length}/160 characters</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">URL Slug</label>
                                <input
                                    type="text"
                                    value={seoSlug}
                                    onChange={(e) => setSeoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    placeholder={title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product-slug'}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-mono"
                                />
                                <p className="text-xs text-gray-500">yoursite.com/product/{seoSlug || 'product-slug'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Color Definitions */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <ColorDefinitionManager
                            colors={colorDefinitions}
                            onChange={setColorDefinitions}
                        />
                    </div>

                    {/* Media Handling */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700">Media</label>
                            <button
                                type="button"
                                onClick={handleAddImageFromUrl}
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Add from URL
                            </button>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {images.length === 0 ? (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 rounded-xl p-8 hover:bg-gray-50 transition-colors cursor-pointer group text-center"
                            >
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-5 h-5 text-gray-500" />
                                </div>
                                <p className="text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                                <p className="text-xs text-gray-500 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img) => (
                                    <div key={img.id} className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                        {/* Image Preview */}
                                        <img src={img.url} alt="Product media" className="w-full h-full object-cover" />

                                        {/* Primary Badge */}
                                        {img.isPrimary && (
                                            <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                                                Primary
                                            </div>
                                        )}

                                        {/* Usage Badge (Shopify pattern) */}
                                        {getImageUsageCount(img.url) > 0 && (
                                            <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                                                Used by {getImageUsageCount(img.url)}
                                            </div>
                                        )}

                                        {/* Hover Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            {!img.isPrimary && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPrimaryImage(img.id)}
                                                    className="px-3 py-1 bg-white text-xs font-bold rounded-full hover:bg-gray-100"
                                                >
                                                    Set as Primary
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeImageWithConfirmation(img.id)}
                                                className="p-1.5 bg-white text-red-600 rounded-full hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add More Button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                                    <span className="text-xs font-semibold text-gray-500">Add</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <label className="text-sm font-bold text-gray-700 mb-4 block">Pricing</label>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Price</label >
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2-translate-y-1/2 text-gray-500 font-serif">₹</span >
                                    <input
                                        type="number" value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                                </div >
                            </div >
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Compare-at price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-serif">₹</span>
                                    <input
                                        type="number"
                                        value={compareAtPrice}
                                        onChange={(e) => setCompareAtPrice(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Cost per item</label >
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2-translate-y-1/2 text-gray-500 font-serif">₹</span >
                                    <input
                                        type="number" value={costPerItem}
                                        onChange={(e) => setCostPerItem(e.target.value)}
                                        placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                                </div >
                                <p className="text-xs text-gray-400"> Customers won't see this</p >
                            </div >
                        </div >
                    </div >

                    {/* Inventory */}
                    < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <label className="text-sm font-bold text-gray-700"> Inventory</label >
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU (Stock Keeping Unit)</label>
                                <input
                                    type="text"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Barcode(ISBN, UPC, GTIN)</label >
                                <input
                                    type="text" value={barcode}
                                    onChange={(e) => setBarcode(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                            </div >
                        </div >
                    </div >

                    {/* Variants */}
                    < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700"> Variants</label >
                            {!hasVariants && (
                                <button
                                    onClick={() => setHasVariants(true)}
                                    className="text-xs font-semibold text-primary hover:underline">
                                    + Add options like size or color
                                </button >
                            )}
                        </div >

                        <div className="space-y-4">
                            {!hasVariants ? (
                                <p className="text-sm text-gray-500">
                                    This product currently has no variants. Add options to create variants.
                                </p>
                            ) : (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Options Management */}
                                    < div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-gray-800"> Options</h3 >
                                        </div >

                                        {
                                            options.map((option, idx) => (
                                                <div key={option.id} className="bg- white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Option Name</label >
                                                    </div >
                                                    <input
                                                        type="text" value={option.name}
                                                        readOnly
                                                        className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium cursor-not-allowed" />
                                                    < div className="space-y-2">
                                                        < label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Option Values</label >
                                                        <div className="flex flex-wrap gap-2">
                                                            {
                                                                option.values.map(val => (
                                                                    <span key={val} className="inline- flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700 group">
                                                                        {val}
                                                                        < button onClick={() => removeOptionValue(option.id, val)} className="text-gray-400 hover:text-gray-600">
                                                                            <X className="w-3 h-3" />
                                                                        </button >
                                                                    </span >
                                                                ))}
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault()
                                                                    const input = e.currentTarget.elements.namedItem('valInput') as HTMLInputElement
                                                                    if (input.value) {
                                                                        addOptionValue(option.id, input.value)
                                                                        input.value = ''
                                                                    }
                                                                }}
                                                                className="inline-flex">
                                                                <input
                                                                    name="valInput" type="text" placeholder={`Add ${option.name}...`}
                                                                    className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-w-[100px]" onBlur={(e) => {
                                                                        if (e.target.value) {
                                                                            addOptionValue(option.id, e.target.value)
                                                                            e.target.value = ''
                                                                        }
                                                                    }}
                                                                />
                                                            </form >
                                                        </div >
                                                    </div >
                                                </div >
                                            ))}
                                    </div >

                                    {/* Variants Table Preview */}
                                    {
                                        variants.length > 0 && (
                                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                                    <h3 className="text-sm font-bold text-gray-800"> Preview Variants({variants.length})</h3 >
                                                </div >
                                                <div className="overflow-x-auto max-w-full">
                                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                            <tr>
                                                                <th className="px-4 py-3 min-w-[150px]">Variant</th>
                                                                <th className="px-4 py-3 w-[200px]"> Images</th >
                                                                <th className="px-4 py-3 w-[150px]"> Price</th >
                                                                <th className="px-4 py-3 w-[120px]"> Quantity</th >
                                                                <th className="px-4 py-3 min-w-[150px]"> SKU</th >
                                                                <th className="px-4 py-3 text-right w-[80px]"> Actions</th >
                                                            </tr >
                                                        </thead >
                                                        <tbody className="divide-y divide-gray-100">
                                                            {
                                                                variants.map((variant) => (
                                                                    <tr key={variant.id} className="bg- white hover:bg-gray-50 group transition-colors">
                                                                        <td className="px-4 py-3 font-medium text-gray-900"> {variant.title}</td >
                                                                        <td className="px-4 py-3">

                                                                            <VariantImageSlot
                                                                                variantLabel={variant.title}
                                                                                currentImageUrl={variant.imageUrl || null}
                                                                                productImages={images}
                                                                                onAssignImage={(url) => handleVariantImageAssign(variant.id, url)}
                                                                                onRemoveFromVariant={() => handleVariantImageRemove(variant.id, false)}
                                                                                onRemoveFromProduct={() => handleVariantImageRemove(variant.id, true)}
                                                                            />
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="relative">
                                                                                <span className="absolute left-3 top-1/2-translate-y-1/2 text-gray-400 text-xs">₹</span >
                                                                                <input
                                                                                    type="number" value={variant.price}
                                                                                    onChange={(e) => updateVariant(variant.id, 'price', Number(e.target.value))}
                                                                                    className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                                                                            </div >
                                                                        </td >
                                                                        <td className="px-4 py-3">
                                                                            <input
                                                                                type="number" value={variant.stock}
                                                                                onChange={(e) => updateVariant(variant.id, 'stock', Number(e.target.value))}
                                                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                                                                        </td >
                                                                        <td className="px-4 py-3">
                                                                            <input
                                                                                type="text" value={variant.sku}
                                                                                onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                                                                placeholder="SKU"
                                                                                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none" />
                                                                        </td >
                                                                        <td className="px-4 py-3 text-right">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (window.confirm('Remove this variant?')) {
                                                                                        removeVariant(variant.id)
                                                                                    }
                                                                                }}
                                                                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                                                                                aria-label="Remove variant"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button >
                                                                        </td >
                                                                    </tr >
                                                                ))}
                                                        </tbody >
                                                    </table >
                                                </div >
                                            </div >
                                        )}
                                </div >
                            )}
                        </div >
                    </div >

                    {/* Search Engine Listing */}
                    < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700"> Search engine listing</label >
                            <button
                                type="button"
                                onClick={handleEditSeo}
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Edit
                            </button >
                        </div >
                        <p className="text-xs text-gray-500">
                            Add a title and description to see how this product might appear in a search engine listing.
                        </p >
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h4 className="text-blue-600 text-sm font-medium hover:underline cursor-pointer truncate">
                                {title || 'Short Sleeve T-Shirt'}
                            </h4 >
                            <p className="text-green-700 text-xs mt-0.5 truncate">
                                https://crownandcrest.com/products/{title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'short-sleeve-t-shirt'}
                            </p >
                            <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                                {description || 'Describe your product...'}
                            </p >
                        </div >
                    </div >
                </div >

                {/* Right Column-Organization */}
                < div className="space-y-6">
                    {/* Status */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                        <label className="text-sm font-bold text-gray-700"> Status</label >
                        <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium appearance-none">
                            <option value="active"> Active</option >
                            <option value="draft"> Draft</option >
                        </select >
                        <p className="text-xs text-gray-500">
                            This product will be hidden from all sales channels.
                        </p >
                    </div >

                    {/* Organization */}
                    < div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                        <label className="text-sm font-bold text-gray-700"> Product Organization</label >

                        {/* Parent Category Dropdown */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                            <select
                                value={parentCategoryId}
                                onChange={(e) => {
                                    const parentId = e.target.value
                                    setParentCategoryId(parentId)
                                    // Reset subcategory when parent changes
                                    setCategoryId('')
                                    
                                    // If parent has no children, set it as the categoryId directly
                                    const hasSubcategories = categories.some(c => c.parent_id === parentId)
                                    if (parentId && !hasSubcategories) {
                                        setCategoryId(parentId)
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                            >
                                <option value="">Select a category</option>
                                {categories
                                    .filter(c => c.parent_id === null)
                                    .map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                            </select>
                        </div>

                        {/* Subcategory Dropdown (conditionally shown) */}
                        {parentCategoryId && categories.some(c => c.parent_id === parentCategoryId) && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategory</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                                >
                                    <option value="">Select a subcategory</option>
                                    {categories
                                        .filter(c => c.parent_id === parentCategoryId)
                                        .map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Size Guide Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Size Guide</label>
                            <select
                                value={sizeChartId}
                                onChange={(e) => setSizeChartId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                            >
                                <option value="">No size guide</option>
                                {sizeGuides.map(guide => (
                                    <option key={guide.id} value={guide.id}>
                                        {guide.name} ({guide.category})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">
                                Assign a size guide to help customers find their size
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Product Type</label >
                            <input
                                type="text" placeholder="e.g.T-Shirt" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                        </div >

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</label>
                            <input
                                type="text"
                                placeholder="e.g. Nike"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider"> Collections</label >
                            <input
                                type="text" placeholder="Search collections..."
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium" />
                        </div >

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="Vintage, Cotton, Summer"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {aiAssistantOpen && (
                <div className="fixed inset-0 z-[65] flex justify-end bg-black/20">
                    <aside className="h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-200 flex flex-col relative">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-gray-900">AI Assistant</h3>
                                <p className="text-xs text-gray-500 mt-1">SEO, conversion, and brand scoring</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiAssistantOpen(false)}
                                className="ml-3 flex-shrink-0 p-2 rounded-md hover:bg-gray-100 transition-colors"
                                aria-label="Close assistant"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={generateAssistantContent}
                                    disabled={aiGenerating}
                                    className="px-3 py-2 text-xs font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-60"
                                >
                                    {aiGenerating ? 'Generating...' : 'Generate'}
                                </button>
                                <button
                                    type="button"
                                    onClick={applyAssistantToForm}
                                    disabled={!aiAssistantContent}
                                    className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-60"
                                >
                                    Apply to Form
                                </button>
                            </div>

                            {aiAssistantScores && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs text-gray-500">SEO</p>
                                        <p className="text-xl font-bold text-gray-900">{aiAssistantScores.seo}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs text-gray-500">Conversion</p>
                                        <p className="text-xl font-bold text-gray-900">{aiAssistantScores.conversion}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs text-gray-500">Brand</p>
                                        <p className="text-xl font-bold text-gray-900">{aiAssistantScores.brand}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-3">
                                        <p className="text-xs text-gray-500">Overall</p>
                                        <p className="text-xl font-bold text-gray-900">{aiAssistantScores.overall}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Title</p>
                                    <p className="text-sm text-gray-900 mt-1">{aiAssistantContent?.ai_title || 'Generate to view suggestion'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Meta Title</p>
                                    <p className="text-sm text-gray-900 mt-1">{aiAssistantContent?.seo?.meta_title || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Meta Description</p>
                                    <p className="text-sm text-gray-700 mt-1">{aiAssistantContent?.seo?.meta_description || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Suggested Bullet Points</p>
                                    <ul className="text-sm text-gray-700 mt-1 space-y-1 list-disc list-inside">
                                        {(aiAssistantContent?.bullet_points || []).map((point, index) => (
                                            <li key={`${point}-${index}`}>{point}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* Product Media Delete Confirmation Dialog */}
            {deleteConfirmation.show && (
                <ConfirmationDialog
                    isOpen={deleteConfirmation.show}
                    title="Delete image from product media?"
                    message={`This image is used by ${deleteConfirmation.usageCount} variant${deleteConfirmation.usageCount > 1 ? 's' : ''}. Deleting it will remove it from all of them.`}
                    variant="danger"
                    options={[
                        {
                            label: 'Delete everywhere',
                            action: deleteConfirmation.onConfirm,
                            variant: 'danger'
                        },
                        {
                            label: 'Cancel',
                            action: () => setDeleteConfirmation({ show: false, imageId: null, usageCount: 0, onConfirm: () => { } }),
                            variant: 'secondary'
                        }
                    ]}
                    onClose={() => setDeleteConfirmation({ show: false, imageId: null, usageCount: 0, onConfirm: () => { } })}
                />
            )}
        </div>
    )
}
