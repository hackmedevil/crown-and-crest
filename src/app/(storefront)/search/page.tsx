import { Suspense } from 'react'
import SearchClient from './SearchClient'

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-white">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
                </div>
            }
        >
            <SearchClient />
        </Suspense>
    )
}
