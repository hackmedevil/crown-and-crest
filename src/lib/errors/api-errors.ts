/**
 * API Error Handling Utilities
 * Provides standardized error codes, responses, and PII masking
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * Standard error codes for API responses
 */
export enum ErrorCode {
  // Authentication & Authorization (401, 403)
  ERR_UNAUTHORIZED = 'ERR_UNAUTHORIZED',
  ERR_FORBIDDEN = 'ERR_FORBIDDEN',
  ERR_INVALID_SESSION = 'ERR_INVALID_SESSION',
  ERR_ADMIN_REQUIRED = 'ERR_ADMIN_REQUIRED',

  // CSRF Protection (403)
  ERR_CSRF_TOKEN_MISSING = 'ERR_CSRF_TOKEN_MISSING',
  ERR_CSRF_TOKEN_INVALID = 'ERR_CSRF_TOKEN_INVALID',
  ERR_CSRF_TOKEN_MISMATCH = 'ERR_CSRF_TOKEN_MISMATCH',

  // Rate Limiting (429)
  ERR_RATE_LIMIT_EXCEEDED = 'ERR_RATE_LIMIT_EXCEEDED',

  // Validation (400)
  ERR_INVALID_INPUT = 'ERR_INVALID_INPUT',
  ERR_MISSING_FIELD = 'ERR_MISSING_FIELD',
  ERR_INVALID_FORMAT = 'ERR_INVALID_FORMAT',
  ERR_DUPLICATE_ENTRY = 'ERR_DUPLICATE_ENTRY',

  // Resources (404)
  ERR_NOT_FOUND = 'ERR_NOT_FOUND',
  ERR_PRODUCT_NOT_FOUND = 'ERR_PRODUCT_NOT_FOUND',
  ERR_VARIANT_NOT_FOUND = 'ERR_VARIANT_NOT_FOUND',

  // Business Logic (400, 409)
  ERR_INSUFFICIENT_STOCK = 'ERR_INSUFFICIENT_STOCK',
  ERR_DUPLICATE_SKU = 'ERR_DUPLICATE_SKU',
  ERR_DUPLICATE_SLUG = 'ERR_DUPLICATE_SLUG',
  ERR_DUPLICATE_BARCODE = 'ERR_DUPLICATE_BARCODE',
  ERR_INVALID_PRICE = 'ERR_INVALID_PRICE',
  ERR_INVALID_QUANTITY = 'ERR_INVALID_QUANTITY',

  // Server Errors (500)
  ERR_INTERNAL_SERVER = 'ERR_INTERNAL_SERVER',
  ERR_DATABASE_ERROR = 'ERR_DATABASE_ERROR',
  ERR_EXTERNAL_SERVICE = 'ERR_EXTERNAL_SERVICE',
}

/**
 * API Error Response Interface
 */
export interface APIErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    request_id: string;
    timestamp: string;
  };
}

/**
 * API Success Response Interface
 */
export interface APISuccessResponse<T = unknown> {
  data: T;
  request_id: string;
  timestamp: string;
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create standardized error response
 * @param code Error code
 * @param message User-friendly error message
 * @param status HTTP status code
 * @param details Optional additional details (for debugging)
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse<APIErrorResponse> {
  const requestId = generateRequestId();

  const errorResponse: APIErrorResponse = {
    error: {
      code,
      message,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  };

  // Include details in development or if explicitly provided
  if (details && process.env.NODE_ENV === 'development') {
    errorResponse.error.details = details;
  }

  // Log error server-side (masked for PII)
  const maskedMessage = maskPII(message);
  const maskedDetails = details ? maskPII(JSON.stringify(details)) : undefined;
  console.error(
    `[${requestId}] ${code}: ${maskedMessage}`,
    maskedDetails ? `\nDetails: ${maskedDetails}` : ''
  );

  return NextResponse.json(errorResponse, { status });
}

/**
 * Create standardized success response
 * @param data Response data
 * @param status HTTP status code (default 200)
 * @returns NextResponse with success JSON
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<APISuccessResponse<T>> {
  const requestId = generateRequestId();

  return NextResponse.json(
    {
      data,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Mask PII (Personally Identifiable Information) in text
 * Replaces phone numbers and email addresses with [REDACTED]
 * @param text Text potentially containing PII
 * @returns Text with PII masked
 */
export function maskPII(text: string): string {
  let masked = text;

  // Mask phone numbers (various formats)
  // +91 1234567890, +1 (123) 456-7890, 123-456-7890, etc.
  masked = masked.replace(
    /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g,
    '[PHONE_REDACTED]'
  );

  // Mask email addresses
  masked = masked.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL_REDACTED]'
  );

  // Mask Indian Aadhaar numbers (12 digits)
  masked = masked.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[AADHAAR_REDACTED]');

  return masked;
}

/**
 * Map common error messages to error codes
 */
export function mapErrorToCode(errorMessage: string): {
  code: ErrorCode;
  status: number;
} {
  const message = errorMessage.toLowerCase();

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('not authenticated')) {
    return { code: ErrorCode.ERR_UNAUTHORIZED, status: 401 };
  }
  if (message.includes('forbidden') || message.includes('admin required')) {
    return { code: ErrorCode.ERR_ADMIN_REQUIRED, status: 403 };
  }

  // CSRF errors
  if (message.includes('csrf')) {
    return { code: ErrorCode.ERR_CSRF_TOKEN_INVALID, status: 403 };
  }

  // Rate limiting
  if (message.includes('rate limit')) {
    return { code: ErrorCode.ERR_RATE_LIMIT_EXCEEDED, status: 429 };
  }

  // Resource not found
  if (message.includes('not found')) {
    return { code: ErrorCode.ERR_NOT_FOUND, status: 404 };
  }

  // Duplicate entries
  if (message.includes('already exists') || message.includes('duplicate')) {
    return { code: ErrorCode.ERR_DUPLICATE_ENTRY, status: 409 };
  }

  // Stock errors
  if (message.includes('insufficient stock')) {
    return { code: ErrorCode.ERR_INSUFFICIENT_STOCK, status: 400 };
  }

  // Default to internal server error
  return { code: ErrorCode.ERR_INTERNAL_SERVER, status: 500 };
}

/**
 * Handle API error and return formatted response
 * Convenience function for try-catch blocks
 * @param error Caught error object
 * @returns Formatted error response
 */
export function handleAPIError(error: unknown): NextResponse<APIErrorResponse> {
  // If it's an Error object
  if (error instanceof Error) {
    const { code, status } = mapErrorToCode(error.message);
    return createErrorResponse(code, error.message, status, { error: error.stack });
  }

  // If it's a string
  if (typeof error === 'string') {
    const { code, status } = mapErrorToCode(error);
    return createErrorResponse(code, error, status);
  }

  // Unknown error type
  return createErrorResponse(
    ErrorCode.ERR_INTERNAL_SERVER,
    'An unexpected error occurred',
    500,
    { error }
  );
}
