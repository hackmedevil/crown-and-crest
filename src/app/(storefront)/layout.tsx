import { Toaster } from 'react-hot-toast'
import NavbarWrapper from '@/components/navigation/NavbarWrapper'
import Footer from '@/components/Footer'

/**
 * Storefront Layout
 * 
 * Shared layout for customer-facing pages (shop, product, cart, checkout)
 * 
 * PERFORMANCE: Preconnects to Supabase API for faster data fetching
 */
import type { BreadcrumbItem } from '@/components/product/Breadcrumb'


interface StorefrontLayoutProps {
    children: React.ReactNode | ((props: { breadcrumbItems?: BreadcrumbItem[] }) => React.ReactNode)
    breadcrumbItems?: BreadcrumbItem[]
}

type LayoutRenderResult = {
    breadcrumbItems?: BreadcrumbItem[]
    children?: React.ReactNode
}

function isLayoutRenderResult(value: unknown): value is LayoutRenderResult {
    return value !== null && typeof value === 'object' && 'breadcrumbItems' in value
}

export default function StorefrontLayout({ children, breadcrumbItems }: StorefrontLayoutProps) {

    // Get Supabase URL for preconnect
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseDomain = supabaseUrl ? new URL(supabaseUrl).origin : null

    // Support render prop pattern for children
    let actualBreadcrumbItems = breadcrumbItems
    let actualChildren = children
    if (typeof children === 'function') {
        const result = children({ breadcrumbItems })
        // If the child layout returns its own breadcrumbItems, use them
        if (isLayoutRenderResult(result)) {
            actualBreadcrumbItems = result.breadcrumbItems
            actualChildren = result.children
        } else {
            actualChildren = result
        }
    }

    return (
        <>
            <NavbarWrapper breadcrumbItems={actualBreadcrumbItems} />
            {actualChildren}
            <Footer />
            <Toaster position="bottom-center" />
        </>
    );
}
