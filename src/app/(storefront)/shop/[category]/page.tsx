import { supabaseServer } from '@/lib/supabase/server'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ShopPage from '@/components/shop/ShopPage'

interface Props {
    params: Promise<{ category: string }>
    searchParams: Promise<{
        sort?: string
        minPrice?: string
        maxPrice?: string
        size?: string
    }>
}

interface Category {
    id: string
    name: string
    slug: string
    description: string | null
    meta_title: string | null
    meta_description: string | null
}

async function getCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabaseServer
        .from('categories')
        .select('id, name, slug, description, meta_title, meta_description')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (error || !data) {
        console.error('Category not found:', slug, error)
        return null
    }

    return data as Category
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { category: categorySlug } = await params
    const category = await getCategoryBySlug(categorySlug)

    if (!category) {
        return {
            title: 'Category Not Found | Crown & Crest'
        }
    }

    return {
        title: category.meta_title || `${category.name} | Crown & Crest`,
        description: category.meta_description || `Shop our ${category.name} collection at Crown & Crest`,
    }
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { category: categorySlug } = await params
    await searchParams

    const category = await getCategoryBySlug(categorySlug)

    if (!category) {
        notFound()
    }

    return (
        <div>
            {/* Category Hero Section */}
            <div className="bg-gray-50 py-12 px-4 md:px-8 mb-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl md:text-5xl font-display text-gray-900 mb-4">
                        {category.name}
                    </h1>
                    {category.description && (
                        <p className="text-lg text-gray-600 max-w-2xl">
                            {category.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Products Grid */}
            <ShopPage initialCategory={category.slug} />
        </div>
    )
}

// Generate static params for known categories (optional, for SSG)
export async function generateStaticParams() {
    const { data: categories } = await supabaseServer
        .from('categories')
        .select('slug')
        .eq('is_active', true)
        .limit(20)

    if (!categories) return []

    return categories.map((cat: { slug: string }) => ({
        category: cat.slug
    }))
}

export const revalidate = 1800 // 30 minutes ISR
