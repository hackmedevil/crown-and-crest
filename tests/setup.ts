/**
 * Jest Test Setup
 * Mocks for Supabase, Next.js cache, and admin auth
 */

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  supabaseServer: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn(),
  })),
}));

// Mock Next.js cache functions
jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => new Headers()),
}));

// Mock admin auth
jest.mock('@/lib/admin/auth', () => ({
  requireAdmin: jest.fn(() => Promise.resolve({ uid: 'test-admin-uid' })),
  isAdmin: jest.fn(() => Promise.resolve(true)),
}));

// Mock CSRF utilities
jest.mock('@/lib/security/csrf', () => ({
  generateCSRFToken: jest.fn(() => ({
    token: 'mock-csrf-token',
    expiresAt: Date.now() + 86400000,
  })),
  verifyCSRFToken: jest.fn(() => true),
  requireCSRFToken: jest.fn(() => Promise.resolve()),
  issueCSRFToken: jest.fn(() => Promise.resolve('mock-csrf-token')),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(() =>
    Promise.resolve({
      success: true,
      remaining: 19,
      resetAt: Date.now() + 60000,
    })
  ),
  RATE_LIMITS: {
    ADMIN_MUTATION: { requests: 20, window: 60 },
  },
}));

// Environment variables for testing
process.env.CSRF_SECRET = 'test-csrf-secret-at-least-32-characters-long';
process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Suppress console errors in tests unless explicitly needed
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
