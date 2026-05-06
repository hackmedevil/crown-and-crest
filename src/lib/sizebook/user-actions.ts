'use server'

// ============================================
// SIZEBOOK - USER SERVER ACTIONS
// ============================================
// User-owned CRUD only
// Privacy-first RLS enforcement
// No admin access
// Architecture: One user = one body = one profile
// ============================================

import { supabaseServer } from '@/lib/supabase/server'
import { 
  CreateSizebookPayload,
  UpdateSizebookPayload,
  UserSizebook,
  SizebookCompleteness,
  SizebookActionResult 
} from './types'
import { 
  validateUserMeasurements,
  validateHeight,
  validateWeight,
  validateGender,
  validateFitPreference 
} from './validation'

/**
 * Get authenticated user
 */
async function getAuthenticatedUser() {
  const supabase = await supabaseServer
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return { user, supabase }
}

// ============================================
// SIZEBOOK CRUD (USER-OWNED)
// Principle: User has ONE body, not one per category
// ============================================

/**
 * Create user's Sizebook profile
 * One profile per user (not per category)
 */
export async function createSizebook(
  payload: CreateSizebookPayload
): Promise<SizebookActionResult<UserSizebook>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    // Check if user already has a profile
    const { data: existing } = await supabase
      .from('user_sizebook')
      .select('id')
      .eq('user_uid', user.id)
      .single()

    if (existing) {
      return { 
        success: false, 
        error: 'Sizebook profile already exists. Use update instead.' 
      }
    }

    // Validate measurements if provided
    if (payload.measurements) {
      const validation = validateUserMeasurements(payload.measurements)
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
        return { success: false, error: `Invalid measurements: ${errorMessages}` }
      }
    }

    // Validate height if provided
    if (payload.height_cm !== undefined) {
      const heightError = validateHeight(payload.height_cm)
      if (heightError) {
        return { success: false, error: heightError.message }
      }
    }

    // Validate weight if provided
    if (payload.weight_kg !== undefined) {
      const weightError = validateWeight(payload.weight_kg)
      if (weightError) {
        return { success: false, error: weightError.message }
      }
    }

    // Validate gender if provided
    if (payload.gender && !validateGender(payload.gender)) {
      return { success: false, error: 'Invalid gender value' }
    }

    // Validate fit preference if provided
    if (payload.fit_preference && !validateFitPreference(payload.fit_preference)) {
      return { success: false, error: 'Invalid fit preference value' }
    }

    // Insert sizebook
    const { data, error } = await supabase
      .from('user_sizebook')
      .insert({
        user_uid: user.id,
        gender: payload.gender || null,
        height_cm: payload.height_cm || null,
        weight_kg: payload.weight_kg || null,
        measurements: payload.measurements || {},
        fit_preference: payload.fit_preference || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating sizebook:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as UserSizebook }
  } catch (error) {
    console.error('Create sizebook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create sizebook' 
    }
  }
}

/**
 * Update user's Sizebook profile
 * Supports partial updates (progressive completion)
 */
export async function updateSizebook(
  payload: UpdateSizebookPayload
): Promise<SizebookActionResult<UserSizebook>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    // Build update object
    const updates: Record<string, any> = {}

    if (payload.gender !== undefined) {
      if (payload.gender !== null && !validateGender(payload.gender)) {
        return { success: false, error: 'Invalid gender value' }
      }
      updates.gender = payload.gender
    }

    if (payload.height_cm !== undefined) {
      const heightError = validateHeight(payload.height_cm)
      if (heightError) {
        return { success: false, error: heightError.message }
      }
      updates.height_cm = payload.height_cm
    }

    if (payload.weight_kg !== undefined) {
      const weightError = validateWeight(payload.weight_kg)
      if (weightError) {
        return { success: false, error: weightError.message }
      }
      updates.weight_kg = payload.weight_kg
    }

    if (payload.measurements !== undefined) {
      const validation = validateUserMeasurements(payload.measurements)
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
        return { success: false, error: `Invalid measurements: ${errorMessages}` }
      }
      updates.measurements = payload.measurements
    }

    if (payload.fit_preference !== undefined) {
      if (payload.fit_preference !== null && !validateFitPreference(payload.fit_preference)) {
        return { success: false, error: 'Invalid fit preference value' }
      }
      updates.fit_preference = payload.fit_preference
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    // Update sizebook (RLS ensures user can only update their own)
    const { data, error } = await supabase
      .from('user_sizebook')
      .update(updates)
      .eq('user_uid', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating sizebook:', error)
      
      // No profile exists
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Sizebook profile not found. Create one first.' }
      }
      
      return { success: false, error: error.message }
    }

    return { success: true, data: data as UserSizebook }
  } catch (error) {
    console.error('Update sizebook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update sizebook' 
    }
  }
}

/**
 * Get current user's Sizebook profile
 */
export async function getSizebook(): Promise<SizebookActionResult<UserSizebook | null>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('user_sizebook')
      .select('*')
      .eq('user_uid', user.id)
      .single()

    if (error) {
      // Not found is not an error (user simply hasn't created profile yet)
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      console.error('Error fetching sizebook:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as UserSizebook }
  } catch (error) {
    console.error('Get sizebook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch sizebook' 
    }
  }
}

/**
 * Delete current user's Sizebook profile
 */
export async function deleteSizebook(): Promise<SizebookActionResult> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    const { error } = await supabase
      .from('user_sizebook')
      .delete()
      .eq('user_uid', user.id)

    if (error) {
      console.error('Error deleting sizebook:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete sizebook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete sizebook' 
    }
  }
}

/**
 * Check if current user has a Sizebook profile
 */
export async function hasSizebook(): Promise<SizebookActionResult<boolean>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('user_sizebook')
      .select('id')
      .eq('user_uid', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: false }
      }
      console.error('Error checking sizebook:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: !!data }
  } catch (error) {
    console.error('Has sizebook error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check sizebook' 
    }
  }
}

/**
 * Get Sizebook completeness stats
 */
export async function getSizebookCompleteness(): Promise<SizebookActionResult<SizebookCompleteness>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .rpc('get_sizebook_completeness', { p_user_uid: user.id })
      .single()

    if (error) {
      console.error('Error fetching completeness:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SizebookCompleteness }
  } catch (error) {
    console.error('Get completeness error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch completeness' 
    }
  }
}

// ============================================
// PROGRESSIVE UPDATE HELPERS
// ============================================

/**
 * Update specific measurement (progressive completion)
 */
export async function updateMeasurement(
  field: string,
  value: number
): Promise<SizebookActionResult<UserSizebook>> {
  try {
    const { user, supabase } = await getAuthenticatedUser()

    // Get current measurements
    const { data: current } = await supabase
      .from('user_sizebook')
      .select('measurements')
      .eq('user_uid', user.id)
      .single()

    const currentMeasurements = (current?.measurements as Record<string, number>) || {}
    const updatedMeasurements = { ...currentMeasurements, [field]: value }

    // Validate updated measurements
    const validation = validateUserMeasurements(updatedMeasurements)
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ')
      return { success: false, error: errorMessages }
    }

    // Update
    return updateSizebook({ measurements: updatedMeasurements })
  } catch (error) {
    console.error('Update measurement error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update measurement' 
    }
  }
}
