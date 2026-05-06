/**
 * useCSRFToken Hook
 * Fetches and manages CSRF token for admin forms
 */

'use client';

import { useEffect, useState } from 'react';

interface UseCSRFTokenResult {
  csrfToken: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useCSRFToken(): UseCSRFTokenResult {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCSRFToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error?.message ||
          errorData?.error ||
          response.statusText ||
          `HTTP ${response.status}`;
        throw new Error(`Failed to fetch CSRF token: ${errorMessage}`);
      }

      const data = await response.json();
      setCSRFToken(data?.data?.csrfToken ?? data?.csrfToken ?? null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch CSRF token');
      setError(error);
      console.error('CSRF token fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  return {
    csrfToken,
    loading,
    error,
    refetch: fetchCSRFToken,
  };
}
