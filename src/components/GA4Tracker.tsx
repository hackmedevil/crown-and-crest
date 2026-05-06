/**
 * GA4 Page View Tracker
 * Client component that fires pageview events on route changes
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageview } from "@/lib/gtag";

export function GA4Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) {
      pageview(pathname);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
