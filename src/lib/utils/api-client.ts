/**
 * API Utility with CSRF Support
 * Helper functions for making authenticated API requests with CSRF tokens
 */

interface APIRequestOptions extends RequestInit {
  csrfToken?: string;
}

interface APIResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    request_id: string;
    timestamp: string;
  };
  request_id: string;
  timestamp: string;
}

/**
 * Make an authenticated API request with CSRF token
 * @param url API endpoint
 * @param options Request options including csrfToken
 * @returns Parsed JSON response
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: APIRequestOptions = {}
): Promise<APIResponse<T>> {
  const { csrfToken, headers, ...restOptions } = options;

  const requestHeaders = new Headers(headers);

  // Add CSRF token header if provided
  if (csrfToken) {
    requestHeaders.set('x-csrf-token', csrfToken);
  }

  // Set Content-Type for JSON requests
  if (
    options.method &&
    ['POST', 'PATCH', 'PUT'].includes(options.method.toUpperCase()) &&
    !requestHeaders.has('Content-Type')
  ) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include', // Include cookies
  });

  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      data.error?.code || 'ERR_UNKNOWN',
      data.error?.message || 'An error occurred',
      response.status,
      data.error?.details
    );
  }

  return data;
}

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Type-safe API request methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(url: string, options?: APIRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(url: string, body: unknown, options?: APIRequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /**
   * PATCH request
   */
  patch: <T>(url: string, body: unknown, options?: APIRequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /**
   * PUT request
   */
  put: <T>(url: string, body: unknown, options?: APIRequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  /**
   * DELETE request
   */
  delete: <T>(url: string, options?: APIRequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};
