/**
 * Inventory Service
 * Handles atomic stock reservation and release operations
 * Uses PostgreSQL RPC functions for concurrency safety
 */

import { supabaseServer } from '@/lib/supabase/server';
import { CacheService } from './CacheService';

interface ReservationResult {
  success: boolean;
  error?: string;
  message?: string;
  variant_id?: string;
  sku?: string;
  reserved?: number;
  remaining?: number;
  available?: number;
  requested?: number;
}

interface ReleaseResult {
  success: boolean;
  error?: string;
  message?: string;
  variant_id?: string;
  sku?: string;
  released?: number;
  new_stock?: number;
}

export class InventoryService {
  /**
   * Reserve stock for a variant atomically
   * Uses row-level locking to prevent race conditions
   * @returns Reservation result with success status
   */
  static async reserve(variantId: string, quantity: number): Promise<ReservationResult> {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'INVALID_QUANTITY',
        message: 'Quantity must be positive',
      };
    }

    const supabase = supabaseServer;

    // Call the atomic reservation RPC function
    const { data, error } = await supabase.rpc('reserve_variant_stock_atomic', {
      p_variant_id: variantId,
      p_quantity: quantity,
    });

    if (error) {
      throw new Error(`Failed to reserve stock: ${error.message}`);
    }

    const result = data as ReservationResult;

    // Invalidate variant cache if successful
    if (result.success) {
      // Get product_id for cache invalidation
      const { data: variant } = await supabase
        .from('variants')
        .select('product_id')
        .eq('id', variantId)
        .single();

      if (variant) {
        CacheService.invalidateVariants(variant.product_id);
      }
    }

    return result;
  }

  /**
   * Release previously reserved stock back to inventory
   * Used when cart items are removed or orders are cancelled
   * @returns Release result with success status
   */
  static async release(variantId: string, quantity: number): Promise<ReleaseResult> {
    if (quantity <= 0) {
      return {
        success: false,
        error: 'INVALID_QUANTITY',
        message: 'Quantity must be positive',
      };
    }

    const supabase = supabaseServer;

    // Call the atomic release RPC function
    const { data, error } = await supabase.rpc('release_variant_stock_atomic', {
      p_variant_id: variantId,
      p_quantity: quantity,
    });

    if (error) {
      throw new Error(`Failed to release stock: ${error.message}`);
    }

    const result = data as ReleaseResult;

    // Invalidate variant cache if successful
    if (result.success) {
      // Get product_id for cache invalidation
      const { data: variant } = await supabase
        .from('variants')
        .select('product_id')
        .eq('id', variantId)
        .single();

      if (variant) {
        CacheService.invalidateVariants(variant.product_id);
      }
    }

    return result;
  }

  /**
   * Check if sufficient stock is available without reserving
   * @returns True if requested quantity is available
   */
  static async checkAvailability(variantId: string, quantity: number): Promise<boolean> {
    const supabase = supabaseServer;

    const { data: variant, error } = await supabase
      .from('variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .single();

    if (error || !variant) {
      return false;
    }

    return variant.stock_quantity >= quantity;
  }

  /**
   * Get current stock quantity for a variant
   * @returns Stock quantity or null if variant not found
   */
  static async getStock(variantId: string): Promise<number | null> {
    const supabase = supabaseServer;

    const { data: variant, error } = await supabase
      .from('variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Variant not found
      }
      throw new Error(`Failed to fetch stock: ${error.message}`);
    }

    return variant.stock_quantity;
  }

  /**
   * Batch reserve stock for multiple variants
   * All-or-nothing: either all reservations succeed or all fail
   * @returns Array of reservation results
   */
  static async batchReserve(
    items: Array<{ variantId: string; quantity: number }>
  ): Promise<{
    success: boolean;
    results: ReservationResult[];
    failedItems?: Array<{ variantId: string; error: string }>;
  }> {
    const results: ReservationResult[] = [];
    const failedItems: Array<{ variantId: string; error: string }> = [];

    // Attempt to reserve all items
    for (const item of items) {
      const result = await this.reserve(item.variantId, item.quantity);
      results.push(result);

      if (!result.success) {
        failedItems.push({
          variantId: item.variantId,
          error: result.error || 'Unknown error',
        });
      }
    }

    // If any failed, rollback all successful reservations
    if (failedItems.length > 0) {
      for (let i = 0; i < results.length; i++) {
        if (results[i].success) {
          await this.release(items[i].variantId, items[i].quantity);
        }
      }

      return {
        success: false,
        results,
        failedItems,
      };
    }

    return {
      success: true,
      results,
    };
  }

  /**
   * Batch release stock for multiple variants
   * @returns Array of release results
   */
  static async batchRelease(
    items: Array<{ variantId: string; quantity: number }>
  ): Promise<ReleaseResult[]> {
    const results: ReleaseResult[] = [];

    for (const item of items) {
      const result = await this.release(item.variantId, item.quantity);
      results.push(result);
    }

    return results;
  }
}
