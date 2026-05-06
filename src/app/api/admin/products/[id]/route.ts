/**
 * Admin Product Detail API
 * GET /api/admin/products/[id] - Get product
 * PATCH /api/admin/products/[id] - Update product
 * DELETE /api/admin/products/[id] - Delete product
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
import { ProductUpdateSchema, ProductIdSchema } from '@/lib/validators';
import { ProductService, EmbeddingService } from '@/lib/services';

/**
 * GET /api/admin/products/[id]
 * Retrieve a single product with all details
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

    // Fetch product via service
    const product = await ProductService.getById(id);

    if (!product) {
      return createErrorResponse(
        ErrorCode.ERR_PRODUCT_NOT_FOUND,
        'Product not found',
        404
      );
    }

    return createSuccessResponse({ product }, 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('No matching product')) {
        return createErrorResponse(
          ErrorCode.ERR_PRODUCT_NOT_FOUND,
          'Product not found',
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
    }

    return handleAPIError(error);
  }
}

/**
 * PATCH /api/admin/products/[id]
 * Update an existing product
 * Security: Admin auth + CSRF + Rate limit + Validation
 */
export async function PATCH(
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
    const rateLimitKey = `admin-product-update:${adminUid}`;
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
    const validation = ProductUpdateSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid product data',
        400,
        { errors: validation.error.flatten() }
      );
    }

    // Update product via service
    const product = await ProductService.update(id, validation.data);

    // Re-enqueue for embedding if name or description changed
    if (
      (validation.data.name || validation.data.description) &&
      product.is_searchable &&
      product.status === 'active'
    ) {
      await EmbeddingService.enqueueProduct(product.id);
    }

    return createSuccessResponse({ product }, 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(
          ErrorCode.ERR_PRODUCT_NOT_FOUND,
          'Product not found',
          404
        );
      }
      if (error.message.includes('already exists')) {
        return createErrorResponse(
          ErrorCode.ERR_DUPLICATE_SLUG,
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
 * DELETE /api/admin/products/[id]
 * Delete a product (hard delete with CASCADE)
 * Security: Admin auth + CSRF + Rate limit
 */
export async function DELETE(
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
    const rateLimitKey = `admin-product-delete:${adminUid}`;
    const rateLimitResult = await rateLimit(rateLimitKey, RATE_LIMITS.ADMIN_MUTATION);
    
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        429,
        { resetAt: rateLimitResult.resetAt }
      );
    }

    // Delete product via service
    await ProductService.delete(id);

    return createSuccessResponse({ message: 'Product deleted successfully' }, 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createErrorResponse(
          ErrorCode.ERR_PRODUCT_NOT_FOUND,
          'Product not found',
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
