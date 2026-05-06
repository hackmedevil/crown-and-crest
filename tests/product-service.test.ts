/**
 * Product Service Tests
 * Tests business logic and cache invalidation
 */

import { ProductService } from '@/lib/services/ProductService';
import { CacheService } from '@/lib/services/CacheService';
import { supabaseServer } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  supabaseServer: {
    from: jest.fn(),
  },
}));
jest.mock('@/lib/services/CacheService');

const createMockSupabase = () => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: jest.fn(() => mockChain),
    _mockChain: mockChain,
  };
};

describe('ProductService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    (supabaseServer.from as jest.Mock) = mockSupabase.from;
  });

  describe('create', () => {
    it('should create product and invalidate cache', async () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
        status: 'draft',
        is_searchable: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First call: check for duplicate (returns null)
      mockSupabase._mockChain.single
        .mockResolvedValueOnce({ data: null, error: null });

      // Second call: insert product
      mockSupabase._mockChain.single
        .mockResolvedValueOnce({ data: mockProduct, error: null });

      const result = await ProductService.create({
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
      });

      expect(result).toEqual(mockProduct);
      expect(CacheService.invalidateProductsList).toHaveBeenCalled();
    });

    it('should throw error for duplicate slug', async () => {
      mockSupabase._mockChain.single.mockResolvedValueOnce({
        data: { id: 'existing-id' },
        error: null,
      });

      await expect(
        ProductService.create({
          name: 'Test Product',
          slug: 'test-product',
          base_price: 100,
        })
      ).rejects.toThrow("Product with slug 'test-product' already exists");
    });
  });

  describe('getById', () => {
    it('should return product when found', async () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Test Product',
        slug: 'test-product',
        base_price: 100,
      };

      mockSupabase._mockChain.single
        .mockResolvedValueOnce({ data: mockProduct, error: null });

      const result = await ProductService.getById('test-id');

      expect(result).toEqual(mockProduct);
    });

    it('should return null when not found', async () => {
      mockSupabase._mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await ProductService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update product and invalidate caches', async () => {
      const mockProduct = {
        id: 'test-id',
        name: 'Updated Product',
        slug: 'test-product',
        base_price: 150,
      };

      // First call: slug check (no conflict)
      mockSupabase._mockChain.single
        .mockResolvedValueOnce({ data: null, error: null });

      // Second call: update
      mockSupabase._mockChain.single
        .mockResolvedValueOnce({ data: mockProduct, error: null });

      const result = await ProductService.update('test-id', {
        name: 'Updated Product',
        base_price: 150,
      });

      expect(result).toEqual(mockProduct);
      expect(CacheService.invalidateProduct).toHaveBeenCalledWith('test-id');
      expect(CacheService.invalidateProductsList).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete product and invalidate all caches', async () => {
      mockSupabase._mockChain.eq.mockResolvedValueOnce({ error: null });

      await ProductService.delete('test-id');

      expect(CacheService.invalidateAllProductCaches).toHaveBeenCalledWith('test-id');
    });
  });

  describe('list', () => {
    it('should return filtered products', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', status: 'active' },
        { id: '2', name: 'Product 2', status: 'active' },
      ];

      mockSupabase._mockChain.range.mockResolvedValueOnce({
        data: mockProducts,
        count: 2,
        error: null,
      });

      const result = await ProductService.list({
        status: 'active',
        limit: 10,
      });

      expect(result.products).toEqual(mockProducts);
      expect(result.total).toBe(2);
    });
  });
});
