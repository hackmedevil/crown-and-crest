/**
 * CSRF Token Endpoint
 * GET /api/auth/csrf
 * Returns a new CSRF token for client-side forms
 */

import { NextResponse } from 'next/server';
import { issueCSRFToken } from '@/lib/security/csrf';
import { createSuccessResponse, handleAPIError } from '@/lib/errors/api-errors';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Generate and set CSRF token
    const csrfToken = await issueCSRFToken();

    // Return token to client
    return createSuccessResponse({ csrfToken }, 200);
  } catch (error) {
    return handleAPIError(error);
  }
}
