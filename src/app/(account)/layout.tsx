import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAccountMetrics } from '@/lib/account/metrics'
import { getStoreSettings } from '@/lib/store-settings'
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";
import AccountHeader from './account/AccountHeader'
import AccountSidebar from './account/AccountSidebar'

/**
 * Account Layout
 * 
 * - Shared layout for protected account pages (/account/*)
 * - Server component: performs authentication check at layout level
 * - Redirects to home with auth modal if not authenticated
 * - Integrates the centralized Store Header and the responsive Sidebar
 */

export const revalidate = 0 // Disable caching to ensure fresh auth check

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: verify user is authenticated at layout level
  const user = await getCurrentUser()

  if (!user) {
    // Redirect to login with redirect parameter to return after auth
    redirect('/?openAuth=1&redirect=/account')
  }

  const [metrics, storeSettings] = await Promise.all([
    getAccountMetrics(user.uid),
    getStoreSettings(),
  ])

  return (
    <>
      <AccountHeader
        logoUrl={storeSettings.logo_url}
        storeName={storeSettings.store_name}
      />
      
      <div className="bg-[#fafafa] min-h-screen pb-20">
        <div className="mx-auto max-w-[1400px] w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Main Account Grid: Sidebar + Content */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            
            {/* Sidebar Column (Handles its own mobile toggle visibility inside) */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <AccountSidebar metrics={metrics} />
            </div>

            {/* Main Content Column */}
            <main className="flex-1 min-w-0 w-full animate-fade-in">
              {children}
            </main>
            
          </div>
        </div>
      </div>
      
      <Footer />
      <Toaster />
    </>
  );
}
