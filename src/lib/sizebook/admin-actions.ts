// Phase 13: Sizebook Foundation - Admin Server Actions
// Purpose: Admin-only CRUD operations for size profiles and product mappings
// Guards: All actions require admin role

'use server';

import { supabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import type {
  SizeProfile,
  ProductSizeProfile,
  ProductSizeProfileExtended,
  CreateSizeProfilePayload,
  UpdateSizeProfilePayload,
  AssignSizeProfilePayload,
  SizebookActionResult,
} from '@/types/sizebook';

// ==========================================
// Size Profile CRUD
// ==========================================

/**
 * Create a new size profile (admin only)
 * 
 * @example
 * ```ts
 * const result = await createSizeProfile({
 *   name: 'M',
 *   category: 'men_top',
 *   measurements: { chest_cm: 96, waist_cm: 81, shoulder_cm: 45, length_cm: 72 },
 *   fit_rules: { tolerance_cm: 3 }
 * });
 * ```
 */
export async function createSizeProfile(
  payload: CreateSizeProfilePayload
): Promise<SizebookActionResult<SizeProfile>> {
  try {
    // Admin guard
    await requireAdmin();

    // Insert new size profile
    const { data, error } = await supabaseServer
      .from('size_profiles')
      .insert({
        name: payload.name,
        category: payload.category,
        measurements: payload.measurements,
        fit_rules: payload.fit_rules ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('[createSizeProfile] Database error:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: `Size "${payload.name}" already exists for category "${payload.category}"`,
        };
      }
      
      return { success: false, error: 'Failed to create size profile' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[createSizeProfile] Error:', error);
    return { success: false, error: 'Failed to create size profile' };
  }
}

/**
 * Update existing size profile (admin only)
 */
export async function updateSizeProfile(
  payload: UpdateSizeProfilePayload
): Promise<SizebookActionResult<SizeProfile>> {
  try {
    await requireAdmin();

    // Build update object (only include provided fields)
    const updates: any = { updated_at: new Date().toISOString() };
    if (payload.name !== undefined) updates.name = payload.name;
    if (payload.measurements !== undefined) updates.measurements = payload.measurements;
    if (payload.fit_rules !== undefined) updates.fit_rules = payload.fit_rules;

    const { data, error } = await supabaseServer
      .from('size_profiles')
      .update(updates)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) {
      console.error('[updateSizeProfile] Database error:', error);
      return { success: false, error: 'Failed to update size profile' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateSizeProfile] Error:', error);
    return { success: false, error: 'Failed to update size profile' };
  }
}

/**
 * Delete size profile (admin only)
 * Note: This will cascade delete all product_size_profiles mappings
 */
export async function deleteSizeProfile(
  id: string
): Promise<SizebookActionResult> {
  try {
    await requireAdmin();

    const { error } = await supabaseServer
      .from('size_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteSizeProfile] Database error:', error);
      return { success: false, error: 'Failed to delete size profile' };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteSizeProfile] Error:', error);
    return { success: false, error: 'Failed to delete size profile' };
  }
}

/**
 * List all size profiles, optionally filtered by category (admin only)
 */
export async function listSizeProfiles(
  category?: string
): Promise<SizebookActionResult<SizeProfile[]>> {
  try {
    await requireAdmin();

    let query = supabaseServer
      .from('size_profiles')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[listSizeProfiles] Database error:', error);
      return { success: false, error: 'Failed to list size profiles' };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error('[listSizeProfiles] Error:', error);
    return { success: false, error: 'Failed to list size profiles' };
  }
}

// ==========================================
// Product-Size Profile Mappings
// ==========================================

/**
 * Assign size profile to product (admin only)
 * 
 * @example
 * ```ts
 * const result = await assignSizeProfileToProduct({
 *   product_id: 'abc-123',
 *   size_profile_id: 'def-456',
 *   notes: 'This product runs slightly small'
 * });
 * ```
 */
export async function assignSizeProfileToProduct(
  payload: AssignSizeProfilePayload
): Promise<SizebookActionResult<ProductSizeProfile>> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseServer
      .from('product_size_profiles')
      .insert({
        product_id: payload.product_id,
        size_profile_id: payload.size_profile_id,
        notes: payload.notes,
      })
      .select()
      .single();

    if (error) {
      console.error('[assignSizeProfileToProduct] Database error:', error);
      
      // Handle duplicate assignment
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This size profile is already assigned to this product',
        };
      }
      
      return { success: false, error: 'Failed to assign size profile' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[assignSizeProfileToProduct] Error:', error);
    return { success: false, error: 'Failed to assign size profile' };
  }
}

/**
 * Remove size profile from product (admin only)
 */
export async function removeSizeProfileFromProduct(
  product_id: string,
  size_profile_id: string
): Promise<SizebookActionResult> {
  try {
    await requireAdmin();

    const { error } = await supabaseServer
      .from('product_size_profiles')
      .delete()
      .eq('product_id', product_id)
      .eq('size_profile_id', size_profile_id);

    if (error) {
      console.error('[removeSizeProfileFromProduct] Database error:', error);
      return { success: false, error: 'Failed to remove size profile' };
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[removeSizeProfileFromProduct] Error:', error);
    return { success: false, error: 'Failed to remove size profile' };
  }
}

/**
 * Get all size profiles assigned to a product (admin only)
 * Returns full size profile details via join
 */
export async function getProductSizeProfiles(
  product_id: string
): Promise<SizebookActionResult<ProductSizeProfileExtended[]>> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseServer
      .from('product_size_profiles')
      .select(`
        *,
        size_profile:size_profiles(*)
      `)
      .eq('product_id', product_id)
      .order('size_profile.name', { ascending: true });

    if (error) {
      console.error('[getProductSizeProfiles] Database error:', error);
      return { success: false, error: 'Failed to get product size profiles' };
    }

    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error('[getProductSizeProfiles] Error:', error);
    return { success: false, error: 'Failed to get product size profiles' };
  }
}

/**
 * Update notes for product-size mapping (admin only)
 */
export async function updateProductSizeProfileNotes(
  product_id: string,
  size_profile_id: string,
  notes: string
): Promise<SizebookActionResult<ProductSizeProfile>> {
  try {
    await requireAdmin();

    const { data, error } = await supabaseServer
      .from('product_size_profiles')
      .update({ notes })
      .eq('product_id', product_id)
      .eq('size_profile_id', size_profile_id)
      .select()
      .single();

    if (error) {
      console.error('[updateProductSizeProfileNotes] Database error:', error);
      return { success: false, error: 'Failed to update notes' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('[updateProductSizeProfileNotes] Error:', error);
    return { success: false, error: 'Failed to update notes' };
  }
}
