/**
 * Admin Product Variants API
 * POST /api/admin/products/[id]/variants - Create variant
 * GET /api/admin/products/[id]/variants - List variants
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
import { VariantCreateSchema, ProductIdSchema } from '@/lib/validators';
import { VariantService } from '@/lib/services';

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/products/[id]/variants
 * Create a new variant for a product
 * Security: Admin auth + CSRF + Rate limit + Validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin authorization
    const adminUid = await requireAdmin();

    // Validate product ID
    const { id } = await params;
    const idValidation = ProductIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid product ID',
        400
      );
    }

    // CSRF protection
    await requireCSRFToken(request.headers);

    // Rate limiting
    const rateLimitKey = `admin-variant-create:${adminUid}`;
    const rateLimitResult = await rateLimit(rateLimitKey, RATE_LIMITS.ADMIN_VARIANT_CREATE);
    
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
    const validation = VariantCreateSchema.safeParse({
      ...body,
      product_id: id,
    });

    if (!validation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid variant data',
        400,
        { errors: validation.error.flatten() }
      );
    }

    // Create variant via service
    const variant = await VariantService.create(validation.data);

    return createSuccessResponse({ variant }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return createErrorResponse(
          ErrorCode.ERR_DUPLICATE_SKU,
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
 * GET /api/admin/products/[id]/variants
 * List all variants for a product
 * Security: Admin auth
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin authorization
    await requireAdmin();

    // Validate product ID
    const { id } = await params;
    const idValidation = ProductIdSchema.safeParse({ id });
    if (!idValidation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid product ID',
        400
      );
    }

    // Fetch variants via service
    const variants = await VariantService.listByProduct(id);

    return createSuccessResponse({ variants }, 200);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return createErrorResponse(
        ErrorCode.ERR_ADMIN_REQUIRED,
        'Admin access required',
        403
      );
    }

    return handleAPIError(error);
  }
}
