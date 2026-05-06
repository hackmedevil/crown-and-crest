/**
 * Admin Products API Tests
 * Tests security layers, validation, and business logic
 */

import { POST, GET } from '@/app/api/admin/products/route';
import { PATCH, DELETE } from '@/app/api/admin/products/[id]/route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { requireCSRFToken } from '@/lib/security/csrf';
import { rateLimit } from '@/lib/rate-limit';
import { ProductService } from '@/lib/services';

// Get mocked functions
const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>;
const mockRequireCSRFToken = requireCSRFToken as jest.MockedFunction<typeof requireCSRFToken>;
const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

jest.mock('@/lib/services', () => ({
  ProductService: {
    create: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  EmbeddingService: {
    enqueueProduct: jest.fn(),
  },
}));

describe('POST /api/admin/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject request without admin authorization', async () => {
    // Mock unauthorized admin
    mockRequireAdmin.mockRejectedValueOnce(new Error('Admin access required'));

    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Product', slug: 'test-product', base_price: 100 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('ERR_ADMIN_REQUIRED');
  });

  it('should reject request without CSRF token', async () => {
    // Mock CSRF failure
    mockRequireCSRFToken.mockRejectedValueOnce(new Error('CSRF token not found'));

    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Product', slug: 'test-product', base_price: 100 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('ERR_CSRF_TOKEN_INVALID');
  });

  it('should reject request when rate limit exceeded', async () => {
    // Mock rate limit exceeded
    mockRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
    });

    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({ name: 'Test Product', slug: 'test-product', base_price: 100 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error.code).toBe('ERR_RATE_LIMIT_EXCEEDED');
  });

  it('should reject request with invalid product data', async () => {
    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({
        name: '', // Empty name (invalid)
        slug: 'test-product',
        base_price: -100, // Negative price (invalid)
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('ERR_INVALID_INPUT');
    expect(data.error.details).toBeDefined();
  });

  it('should create product successfully with valid data', async () => {
    // Mock successful product creation
    const mockProduct = {
      id: 'test-product-id',
      name: 'Test Product',
      slug: 'test-product',
      base_price: 100,
      status: 'draft',
      is_searchable: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (ProductService.create as jest.Mock).mockResolvedValueOnce(mockProduct);

    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.product).toEqual(mockProduct);
    expect(ProductService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
      })
    );
  });

  it('should reject duplicate slug', async () => {
    // Mock duplicate slug error
    (ProductService.create as jest.Mock).mockRejectedValueOnce(
      new Error("Product with slug 'test-product' already exists")
    );

    const request = new NextRequest('http://localhost/api/admin/products', {
      method: 'POST',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe('ERR_DUPLICATE_SLUG');
  });
});

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require admin authorization', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('Admin access required'));

    const request = new NextRequest('http://localhost/api/admin/products');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('ERR_ADMIN_REQUIRED');
  });

  it('should list products successfully', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Product 1',
        slug: 'product-1',
        base_price: 100,
        status: 'active',
      },
      {
        id: '2',
        name: 'Product 2',
        slug: 'product-2',
        base_price: 200,
        status: 'draft',
      },
    ];

    (ProductService.list as jest.Mock).mockResolvedValueOnce({
      products: mockProducts,
      total: 2,
    });

    const request = new NextRequest('http://localhost/api/admin/products?limit=20&offset=0');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.products).toEqual(mockProducts);
    expect(data.data.total).toBe(2);
  });

  it('should handle query parameters correctly', async () => {
    (ProductService.list as jest.Mock).mockResolvedValueOnce({
      products: [],
      total: 0,
    });

    const request = new NextRequest(
      'http://localhost/api/admin/products?status=active&brand=TestBrand&limit=10'
    );

    await GET(request);

    expect(ProductService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        brand: 'TestBrand',
        limit: 10,
      })
    );
  });
});

describe('PATCH /api/admin/products/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update product successfully', async () => {
    const mockProduct = {
      id: 'test-id',
      name: 'Updated Product',
      slug: 'updated-product',
      base_price: 150,
      status: 'active',
    };

    (ProductService.update as jest.Mock).mockResolvedValueOnce(mockProduct);

    const request = new NextRequest('http://localhost/api/admin/products/test-id', {
      method: 'PATCH',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({
        name: 'Updated Product',
        base_price: 150,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'test-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.product).toEqual(mockProduct);
  });

  it('should return 404 for non-existent product', async () => {
    (ProductService.update as jest.Mock).mockRejectedValueOnce(new Error('Product not found'));

    const request = new NextRequest('http://localhost/api/admin/products/non-existent', {
      method: 'PATCH',
      headers: {
        'x-csrf-token': 'mock-token',
      },
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('ERR_PRODUCT_NOT_FOUND');
  });
});

describe('DELETE /api/admin/products/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete product successfully', async () => {
    (ProductService.delete as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost/api/admin/products/test-id', {
      method: 'DELETE',
      headers: {
        'x-csrf-token': 'mock-token',
      },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'test-id' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.message).toBe('Product deleted successfully');
    expect(ProductService.delete).toHaveBeenCalledWith('test-id');
  });
});
