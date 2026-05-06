'use client'

import { Toaster as HotToaster } from 'react-hot-toast'

/**
 * Global toast notification component
 * Uses react-hot-toast with custom styling to match brand
 */
export default function Toaster() {
    return (
        <HotToaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
                // Default options
                duration: 4000,
                style: {
                    background: '#fff',
                    color: '#000',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                },
                // Success toast styling
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: '#10b981',
                        secondary: '#fff',
                    },
                },
                // Error toast styling
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                },
                // Loading toast styling
                loading: {
                    iconTheme: {
                        primary: '#000',
                        secondary: '#fff',
                    },
                },
            }}
        />
    )
}
