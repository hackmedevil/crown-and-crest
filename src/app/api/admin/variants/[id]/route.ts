/**
 * Admin Variant Detail API
 * PATCH /api/admin/variants/[id] - Update variant
 * DELETE /api/admin/variants/[id] - Delete variant
 */

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { requireCSRFToken } from '@/lib/security/csrf';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import {
  createErrorResponse,
  createSuccessResponse,
  handleAPIError,
  ErrorCode,
} from '@/lib/errors/api-errors';
import { VariantUpdateSchema, VariantIdSchema } from '@/lib/validators';
import { VariantService } from '@/lib/services';

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/variants/[id]
 * Update an existing variant
 * Security: Admin auth + CSRF + Rate limit + Validation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin authorization
    const adminUid = await requireAdmin();

    // Validate variant ID
    const { id } = await params;
    const idValidation = VariantIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid variant ID',
        400
      );
    }

    // CSRF protection
    await requireCSRFToken(request.headers);

    // Rate limiting
    const rateLimitKey = `admin-variant-update:${adminUid}`;
    const rateLimitResult = await rateLimit(rateLimitKey, RATE_LIMITS.ADMIN_MUTATION);
    
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        429,
        { resetAt: rateLimitResult.resetAt }
      );
    }

    // Input validation
    const body = await request.json();
    const validation = VariantUpdateSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid variant data',
        400,
        { errors: validation.error.flatten() }
      );
    }

    // Update variant via service
    const variant = await VariantService.update(id, validation.data);

    return createSuccessResponse({ variant }, 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(
          ErrorCode.ERR_VARIANT_NOT_FOUND,
          'Variant not found',
          404
        );
      }
      if (error.message.includes('already exists')) {
        const isDuplicateSKU = error.message.includes('SKU');
        const isDuplicateBarcode = error.message.includes('barcode');
        return createErrorResponse(
          isDuplicateSKU ? ErrorCode.ERR_DUPLICATE_SKU : ErrorCode.ERR_DUPLICATE_BARCODE,
          error.message,
          409
        );
      }
      if (error.message.includes('Admin access required')) {
        return createErrorResponse(
          ErrorCode.ERR_ADMIN_REQUIRED,
          'Admin access required',
          403
        );
      }
      if (error.message.includes('CSRF')) {
        return createErrorResponse(
          ErrorCode.ERR_CSRF_TOKEN_INVALID,
          'CSRF token validation failed',
          403
        );
      }
    }

    return handleAPIError(error);
  }
}

/**
 * DELETE /api/admin/variants/[id]
 * Delete a variant
 * Security: Admin auth + CSRF + Rate limit
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin authorization
    const adminUid = await requireAdmin();

    // Validate variant ID
    const { id } = await params;
    const idValidation = VariantIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid variant ID',
        400
      );
    }

    // CSRF protection
    await requireCSRFToken(request.headers);

    // Rate limiting
    const rateLimitKey = `admin-variant-delete:${adminUid}`;
    const rateLimitResult = await rateLimit(rateLimitKey, RATE_LIMITS.ADMIN_MUTATION);
    
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        429,
        { resetAt: rateLimitResult.resetAt }
      );
    }

    // Delete variant via service
    await VariantService.delete(id);

    return createSuccessResponse({ message: 'Variant deleted successfully' }, 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(
          ErrorCode.ERR_VARIANT_NOT_FOUND,
          'Variant not found',
          404
        );
      }
      if (error.message.includes('Admin access required')) {
        return createErrorResponse(
          ErrorCode.ERR_ADMIN_REQUIRED,
          'Admin access required',
          403
        );
      }
      if (error.message.includes('CSRF')) {
        return createErrorResponse(
          ErrorCode.ERR_CSRF_TOKEN_INVALID,
          'CSRF token validation failed',
          403
        );
      }
    }

    return handleAPIError(error);
  }
}
