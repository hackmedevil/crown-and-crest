"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowDown, ArrowUp, Eye, LayoutTemplate, ShieldCheck, Sparkles, BadgePercent, Boxes, FileText, Plus, Trash2 } from 'lucide-react'
import RichTextEditor from '@/components/admin/products/RichTextEditor'
import ImagePicker from '@/components/ImagePicker'

const sections = [
    {
        id: 'hero',
        name: 'Hero Carousel',
        description: 'Top rotating hero banners and CTA links',
        status: 'Live',
        icon: LayoutTemplate,
    },
    {
        id: 'flash-sale',
        name: 'Flash Sales Banner',
        description: 'Deal timer, promo code, and featured sale products',
        status: 'Live',
        icon: BadgePercent,
    },
    {
        id: 'products',
        name: 'Product Showcase',
        description: 'New Arrivals, Bestsellers, and Occasion collections',
        status: 'Live',
        icon: Boxes,
    },
    {
        id: 'styling',
        name: 'Styling Content',
        description: 'Fabric, care, and style education blocks',
        status: 'Live',
        icon: FileText,
    },
    {
        id: 'trust',
        name: 'Trust & Features',
        description: 'Quality badges, shipping, returns, and secure checkout',
        status: 'Live',
        icon: ShieldCheck,
    },
    {
        id: 'final-cta',
        name: 'Final CTA',
        description: 'Bottom conversion call-to-action block',
        status: 'Live',
        icon: Sparkles,
    },
 ] as const

type SectionId = (typeof sections)[number]['id']

type SectionContent = {
    heading: string
    bodyHtml: string
    ctaLabel: string
    ctaUrl: string
    visible: boolean
}

type CarouselSlide = {
    id: number
    headline: string
    subheadline: string
    highlight: string
    cta: {
        text: string
        href: string
    }
    bgColor: string
    image?: string
}

const STORAGE_KEY = 'admin_homepage_editor_v1'
const CAROUSEL_STORAGE_KEY = 'admin_carousel_slides'

const defaultCarouselSlides: CarouselSlide[] = [
    {
        id: 1,
        headline: 'Perfect Fit. Every Time.',
        subheadline: 'Premium shirts tailored to your measurements. Save your Size Book once.',
        highlight: 'Blue Collection',
        cta: { text: 'Shop Now', href: '/shop' },
        bgColor: 'from-blue-50 to-blue-100',
    },
    {
        id: 2,
        headline: 'New Arrivals Just Dropped',
        subheadline: 'Explore our latest collection of premium fabrics and timeless designs.',
        highlight: 'Limited Edition',
        cta: { text: 'View New Arrivals', href: '/new' },
        bgColor: 'from-emerald-50 to-emerald-100',
    },
    {
        id: 3,
        headline: 'Flat 30% Off - This Weekend Only',
        subheadline: 'Use code WEEKEND30 on all items. Free shipping included.',
        highlight: 'Flash Sale',
        cta: { text: 'Shop Sale', href: '/sale' },
        bgColor: 'from-amber-50 to-amber-100',
    },
    {
        id: 4,
        headline: 'Build Your Capsule Wardrobe',
        subheadline: 'Curated collections for every occasion. Mix, match, repeat.',
        highlight: 'Collections',
        cta: { text: 'Explore Collections', href: '/collections' },
        bgColor: 'from-purple-50 to-purple-100',
    },
]

const initialSectionContent: Record<SectionId, SectionContent> = {
    hero: {
        heading: 'Dress Better. Fit Better.',
        bodyHtml: '<p>Build your perfect wardrobe with premium shirts tailored for comfort and confidence.</p>',
        ctaLabel: 'Shop Collection',
        ctaUrl: '/shop',
        visible: true,
    },
    'flash-sale': {
        heading: 'Deal of the Day',
        bodyHtml: '<p>Unlock limited-time offers with live countdown pricing and exclusive promo codes.</p>',
        ctaLabel: 'Shop Flash Sale',
        ctaUrl: '/shop?sale=true',
        visible: true,
    },
    products: {
        heading: 'Bestsellers & New Arrivals',
        bodyHtml: '<p>Showcase high-converting products with rich cards, ratings, and conversion-first actions.</p>',
        ctaLabel: 'Explore Products',
        ctaUrl: '/shop',
        visible: true,
    },
    styling: {
        heading: 'Style Guides',
        bodyHtml: '<p>Educate customers on fabrics, care routines, and outfit pairings with editorial content blocks.</p>',
        ctaLabel: 'View Guides',
        ctaUrl: '/size-book',
        visible: true,
    },
    trust: {
        heading: 'Why Customers Trust Us',
        bodyHtml: '<p>Highlight quality, easy returns, secure payments, and guaranteed fit to reduce purchase friction.</p>',
        ctaLabel: 'Learn More',
        ctaUrl: '/about',
        visible: true,
    },
    'final-cta': {
        heading: 'Ready for Perfect Fit?',
        bodyHtml: '<p>Create your Size Book and never guess shirt sizing again.</p>',
        ctaLabel: 'Create Size Book',
        ctaUrl: '/account/size-profile',
        visible: true,
    },
}

export default function HomepageAdminPage() {
    const [tab, setTab] = useState<'sections' | 'carousel'>('sections')
    const [orderedSections, setOrderedSections] = useState([...sections])
    const [selectedSectionId, setSelectedSectionId] = useState<SectionId>('hero')
    const [content, setContent] = useState<Record<SectionId, SectionContent>>(initialSectionContent)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>(defaultCarouselSlides)
    const [selectedSlideId, setSelectedSlideId] = useState<number>(1)
    const [carouselSaveStatus, setCarouselSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    const selectedSection = useMemo(
        () => orderedSections.find((section) => section.id === selectedSectionId) ?? orderedSections[0],
        [selectedSectionId, orderedSections]
    )

    const selectedContent = content[selectedSectionId]

    const updateSelectedContent = (updates: Partial<SectionContent>) => {
        setContent((prev) => ({
            ...prev,
            [selectedSectionId]: {
                ...prev[selectedSectionId],
                ...updates,
            },
        }))
        setHasUnsavedChanges(true)
    }

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return

            const parsed = JSON.parse(raw) as {
                sectionOrder?: SectionId[]
                content?: Partial<Record<SectionId, Partial<SectionContent>>>
                selectedSectionId?: SectionId
            }

            if (parsed.sectionOrder && Array.isArray(parsed.sectionOrder)) {
                const byId = new Map(sections.map((section) => [section.id, section]))
                const reordered = parsed.sectionOrder
                    .map((id) => byId.get(id))
                    .filter((section): section is (typeof sections)[number] => Boolean(section))

                if (reordered.length === sections.length) {
                    setOrderedSections(reordered)
                }
            }

            if (parsed.content) {
                setContent((prev) => {
                    const merged = { ...prev }
                    for (const section of sections) {
                        const maybeContent = parsed.content?.[section.id]
                        if (maybeContent) {
                            merged[section.id] = {
                                ...merged[section.id],
                                ...maybeContent,
                            }
                        }
                    }
                    return merged
                })
            }

            if (parsed.selectedSectionId && sections.some((section) => section.id === parsed.selectedSectionId)) {
                setSelectedSectionId(parsed.selectedSectionId)
            }
        } catch {
            // Ignore malformed local state
        }
    }, [])

    // Load carousel from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CAROUSEL_STORAGE_KEY)
            if (raw) {
                const parsed = JSON.parse(raw) as CarouselSlide[]
                setCarouselSlides(parsed)
                if (parsed.length > 0) {
                    setSelectedSlideId(parsed[0].id)
                }
            }
        } catch {
            // Ignore malformed carousel state
        }
    }, [])

    const moveSection = (sectionId: SectionId, direction: 'up' | 'down') => {
        setOrderedSections((prev) => {
            const index = prev.findIndex((section) => section.id === sectionId)
            if (index === -1) return prev

            const targetIndex = direction === 'up' ? index - 1 : index + 1
            if (targetIndex < 0 || targetIndex >= prev.length) return prev

            const next = [...prev]
            const [moved] = next.splice(index, 1)
            next.splice(targetIndex, 0, moved)
            return next
        })
        setHasUnsavedChanges(true)
    }

    const handleSaveLayout = () => {
        setSaveStatus('saving')
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    sectionOrder: orderedSections.map((section) => section.id),
                    content,
                    selectedSectionId,
                    updatedAt: new Date().toISOString(),
                })
            )

            setHasUnsavedChanges(false)
            setSaveStatus('saved')
            window.setTimeout(() => setSaveStatus('idle'), 1600)
        } catch {
            setSaveStatus('error')
        }
    }

    const selectedSlide = carouselSlides.find((s) => s.id === selectedSlideId) || carouselSlides[0]

    const updateSelectedSlide = (updates: Partial<CarouselSlide>) => {
        setCarouselSlides((prev) =>
            prev.map((slide) =>
                slide.id === selectedSlideId
                    ? { ...slide, ...updates }
                    : slide
            )
        )
    }

    const handleSaveCarousel = () => {
        setCarouselSaveStatus('saving')
        try {
            localStorage.setItem(CAROUSEL_STORAGE_KEY, JSON.stringify(carouselSlides))
            setCarouselSaveStatus('saved')
            window.setTimeout(() => setCarouselSaveStatus('idle'), 1600)
        } catch {
            setCarouselSaveStatus('error')
        }
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Homepage</h1>
                    <p className="text-gray-500 mt-1">Manage storefront homepage content and section visibility.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        target="_blank"
                        className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                    >
                        <Eye className="w-4 h-4" />
                        Preview Homepage
                    </Link>
                    <button
                        type="button"
                        onClick={tab === 'sections' ? handleSaveLayout : handleSaveCarousel}
                        disabled={(tab === 'sections' ? saveStatus : carouselSaveStatus) === 'saving'}
                        className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {tab === 'sections' ? (
                            <>
                                {saveStatus === 'saving' && 'Saving...'}
                                {saveStatus === 'saved' && 'Saved'}
                                {saveStatus === 'error' && 'Retry Save'}
                                {saveStatus === 'idle' && (hasUnsavedChanges ? 'Save Layout *' : 'Save Layout')}
                            </>
                        ) : (
                            <>
                                {carouselSaveStatus === 'saving' && 'Saving...'}
                                {carouselSaveStatus === 'saved' && 'Saved'}
                                {carouselSaveStatus === 'error' && 'Retry Save'}
                                {carouselSaveStatus === 'idle' && 'Save Carousel'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setTab('sections')}
                    className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                        tab === 'sections'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Homepage Sections
                </button>
                <button
                    onClick={() => setTab('carousel')}
                    className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
                        tab === 'carousel'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Carousel Slides
                </button>
            </div>

            {tab === 'sections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Homepage Sections</h2>
                    <p className="text-sm text-gray-500 mb-6">Section-level controls for your current homepage build.</p>

                    <div className="space-y-4">
                        {orderedSections.map((section, index) => (
                            <div key={section.name} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <section.icon className="w-5 h-5 text-gray-700" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{section.name}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                        {section.status}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={content[section.id].visible}
                                            onChange={(event) => {
                                                setContent((prev) => ({
                                                    ...prev,
                                                    [section.id]: {
                                                        ...prev[section.id],
                                                        visible: event.target.checked,
                                                    },
                                                }))
                                                setHasUnsavedChanges(true)
                                            }}
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        Section Visible
                                    </label>
                                    <div className="inline-flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => moveSection(section.id, 'up')}
                                            disabled={index === 0}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                            Up
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveSection(section.id, 'down')}
                                            disabled={index === orderedSections.length - 1}
                                            className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-200 px-2.5 py-1.5 rounded-lg bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                            Down
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSectionId(section.id)}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-gray-700"
                                    >
                                        Configure
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Editor</p>
                            <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedSection.name}</h2>
                            <p className="text-sm text-gray-500 mt-1">{selectedSection.description}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Heading</label>
                            <input
                                type="text"
                                value={selectedContent.heading}
                                onChange={(event) => updateSelectedContent({ heading: event.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Body (WYSIWYG)</label>
                            <RichTextEditor
                                content={selectedContent.bodyHtml}
                                onChange={(html) => updateSelectedContent({ bodyHtml: html })}
                                placeholder="Write section copy with rich formatting..."
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">CTA Label</label>
                                <input
                                    type="text"
                                    value={selectedContent.ctaLabel}
                                    onChange={(event) => updateSelectedContent({ ctaLabel: event.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">CTA URL</label>
                                <input
                                    type="text"
                                    value={selectedContent.ctaUrl}
                                    onChange={(event) => updateSelectedContent({ ctaUrl: event.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-3">Publishing Checklist</h2>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li className="flex items-center justify-between">
                                Hero banners configured
                                <span className="text-emerald-600 font-semibold">Done</span>
                            </li>
                            <li className="flex items-center justify-between">
                                Flash sale timer verified
                                <span className="text-emerald-600 font-semibold">Done</span>
                            </li>
                            <li className="flex items-center justify-between">
                                Product blocks linked
                                <span className="text-emerald-600 font-semibold">Done</span>
                            </li>
                            <li className="flex items-center justify-between">
                                Newsletter section
                                <span className="text-amber-600 font-semibold">Pending</span>
                            </li>
                            <li className="flex items-center justify-between">
                                Footer links validated
                                <span className="text-emerald-600 font-semibold">Done</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-6 text-white">
                        <h3 className="font-bold text-lg">Next Step</h3>
                        <p className="text-sm text-gray-300 mt-2">
                            Connect these controls to persisted settings so marketing can update homepage content without code changes.
                        </p>
                    </div>
                </div>
            </div>
            )}

            {tab === 'carousel' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Carousel Slides</h2>
                    <p className="text-sm text-gray-500 mb-6">Manage hero carousel slides with images and text.</p>

                    <div className="space-y-4">
                        {carouselSlides.map((slide, index) => (
                            <div key={slide.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{slide.headline}</h3>
                                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{slide.subheadline}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSlideId(slide.id)}
                                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-gray-700"
                                    >
                                        Edit Slide
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 sticky top-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Slide Editor</p>
                        <h2 className="text-lg font-bold text-gray-900 mt-1">Slide {selectedSlide ? carouselSlides.indexOf(selectedSlide) + 1 : '-'}</h2>
                    </div>

                    {selectedSlide && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Headline</label>
                                <input
                                    type="text"
                                    value={selectedSlide.headline}
                                    onChange={(e) => updateSelectedSlide({ headline: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Subheadline</label>
                                <textarea
                                    value={selectedSlide.subheadline}
                                    onChange={(e) => updateSelectedSlide({ subheadline: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Image (from Cloudinary)</label>
                                <ImagePicker
                                    value={selectedSlide.image}
                                    onChange={(url) => updateSelectedSlide({ image: url })}
                                    folder="crown-and-crest/carousel"
                                    height="h-32"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">CTA Text</label>
                                    <input
                                        type="text"
                                        value={selectedSlide.cta.text}
                                        onChange={(e) => updateSelectedSlide({ cta: { ...selectedSlide.cta, text: e.target.value } })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">CTA URL</label>
                                    <input
                                        type="text"
                                        value={selectedSlide.cta.href}
                                        onChange={(e) => updateSelectedSlide({ cta: { ...selectedSlide.cta, href: e.target.value } })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Highlight Badge</label>
                                <input
                                    type="text"
                                    value={selectedSlide.highlight}
                                    onChange={(e) => updateSelectedSlide({ highlight: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            )}
        </div>
    )
}
