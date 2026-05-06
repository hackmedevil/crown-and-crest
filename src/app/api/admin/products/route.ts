/**
 * Admin Products API
 * POST /api/admin/products - Create product
 * GET /api/admin/products - List products
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
import { ProductCreateSchema, ProductQuerySchema } from '@/lib/validators';
import { ProductService } from '@/lib/services';
import { EmbeddingService } from '@/lib/services';

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/products
 * Create a new product
 * Security: Admin auth + CSRF + Rate limit + Validation
 */
export async function POST(request: NextRequest) {
  try {
    // Layer 1: Admin authorization
    const adminUid = await requireAdmin();

    // Layer 2: CSRF protection
    await requireCSRFToken(request.headers);

    // Layer 3: Rate limiting
    const rateLimitKey = `admin-product-create:${adminUid}`;
    const rateLimitResult = await rateLimit(rateLimitKey, RATE_LIMITS.ADMIN_MUTATION);
    
    if (!rateLimitResult.success) {
      return createErrorResponse(
        ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
        'Too many requests. Please try again later.',
        429,
        { resetAt: rateLimitResult.resetAt }
      );
    }

    // Layer 4: Input validation
    const body = await request.json();
    const validation = ProductCreateSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid product data',
        400,
        { errors: validation.error.flatten() }
      );
    }

    // Layer 5: Business logic via service
    const product = await ProductService.create(validation.data);

    // Enqueue for embedding generation if searchable
    if (product.is_searchable && product.status === 'active') {
      await EmbeddingService.enqueueProduct(product.id);
    }

    return createSuccessResponse({ product }, 201);
  } catch (error) {
    // Handle known errors
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return createErrorResponse(
          ErrorCode.ERR_DUPLICATE_SLUG,
          error.message,
          409
        );
      }
      if (error.message.includes('Unauthorized') || error.message.includes('Admin access required')) {
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
 * GET /api/admin/products
 * List products with filters
 * Security: Admin auth + Rate limit
 */
export async function GET(request: NextRequest) {
  try {
    // Admin authorization
    await requireAdmin();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validation = ProductQuerySchema.safeParse(queryParams);
    
    if (!validation.success) {
      return createErrorResponse(
        ErrorCode.ERR_INVALID_INPUT,
        'Invalid query parameters',
        400,
        { errors: validation.error.flatten() }
      );
    }

    // Fetch products via service
    const { products, total } = await ProductService.list({
      status: validation.data.status,
      category_id: validation.data.category_id,
      brand: validation.data.brand,
      is_searchable: validation.data.is_searchable,
      limit: validation.data.limit,
      offset: validation.data.offset,
      order_by: validation.data.order_by,
      order_direction: validation.data.order_direction,
    });

    return createSuccessResponse(
      {
        products,
        total,
        limit: validation.data.limit,
        offset: validation.data.offset,
      },
      200
    );
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
