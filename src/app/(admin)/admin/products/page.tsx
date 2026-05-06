import { supabaseServer } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Package, CircleCheck, FileText, Sparkles } from 'lucide-react'
import ProductsTable from './ProductsTable'

async function getProducts() {
    const { data } = await supabaseServer
        .from('products')
        .select('id, name, slug, base_price, image_url, category, is_active, created_at, embedding_status')
        .order('created_at', { ascending: false })

    return data || []
}

export default async function ProductsPage() {
    const products = await getProducts()
    const activeCount = products.filter(product => product.is_active).length
    const draftCount = products.length - activeCount
    const pendingEmbeddings = products.filter(product => product.embedding_status === 'pending').length

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Product Catalog</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage listings, visibility, and embedding state from one place.
                    </p>
                </div>
                <Link
                    href="/admin/products/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                >
                    <Plus className="h-4 w-4" />
                    Add Product
                </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Products</p>
                        <Package className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">{products.length}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active</p>
                        <CircleCheck className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">{activeCount}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Draft</p>
                        <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">{draftCount}</p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Embedding Pending</p>
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                    </div>
                    <p className="mt-3 text-2xl font-bold text-gray-900">{pendingEmbeddings}</p>
                </div>
            </div>

            <ProductsTable products={products} />
        </div>
    )
}
