'use server'

// ============================================
// SIZE CHARTS - ADMIN SERVER ACTIONS
// ============================================
// Admin-only CRUD operations
// No customer-facing logic
// No recommendation engine
// ============================================

import { supabaseServer } from '@/lib/supabase/server'
import { 
  CreateSizeChartPayload,
  UpdateSizeChartPayload,
  AssignSizeChartToProductPayload,
  SizeChart,
  ProductSizeChartWithDetails,
  SizeChartActionResult 
} from './types'
import { 
  validateSizeChartMeasurements,
  validateCategory,
  validateSizeChartName 
} from './validation'

/**
 * Verify admin access
 */
async function requireAdmin() {
  const supabase = await supabaseServer
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_uid', user.id)
    .single()

  if (!userRole || userRole.role !== 'admin') {
    throw new Error('Admin access required')
  }

  return { user, supabase }
}

// ============================================
// SIZE CHART CRUD
// ============================================

/**
 * Create a new size chart
 */
export async function createSizeChart(
  payload: CreateSizeChartPayload
): Promise<SizeChartActionResult<SizeChart>> {
  try {
    const { supabase } = await requireAdmin()

    // Validate name
    const nameError = validateSizeChartName(payload.name)
    if (nameError) {
      return { success: false, error: nameError.message }
    }

    // Validate category (non-empty check only, non-authoritative)
    if (!validateCategory(payload.category)) {
      return { success: false, error: 'Category cannot be empty' }
    }

    // Validate measurements structure
    const validation = validateSizeChartMeasurements(payload.measurements)
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      return { success: false, error: `Invalid measurements: ${errorMessages}` }
    }

    // Insert size chart
    const { data, error } = await supabase
      .from('size_charts')
      .insert({
        name: payload.name,
        category: payload.category,
        measurements: payload.measurements as any, // JSONB type
        fit_type: payload.fit_type || null,
        notes: payload.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating size chart:', error)
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: 'A size chart with this name and category already exists' }
      }
      
      return { success: false, error: error.message }
    }

    return { success: true, data: data as SizeChart }
  } catch (error) {
    console.error('Create size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create size chart' 
    }
  }
}

/**
 * Update an existing size chart
 */
export async function updateSizeChart(
  payload: UpdateSizeChartPayload
): Promise<SizeChartActionResult<SizeChart>> {
  try {
    const { supabase } = await requireAdmin()

    // Build update object
    const updates: Record<string, any> = {}

    if (payload.name !== undefined) {
      const nameError = validateSizeChartName(payload.name)
      if (nameError) {
        return { success: false, error: nameError.message }
      }
      updates.name = payload.name
    }

    if (payload.category !== undefined) {
      if (!validateCategory(payload.category)) {
        return { success: false, error: 'Category cannot be empty' }
      }
      updates.category = payload.category
    }

    if (payload.measurements !== undefined) {
      const validation = validateSizeChartMeasurements(payload.measurements)
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
        return { success: false, error: `Invalid measurements: ${errorMessages}` }
      }
      updates.measurements = payload.measurements
    }

    if (payload.fit_type !== undefined) {
      updates.fit_type = payload.fit_type
    }

    if (payload.notes !== undefined) {
      updates.notes = payload.notes
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await supabase
      .from('size_charts')
      .update(updates)
      .eq('id', payload.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating size chart:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Size chart not found' }
    }

    return { success: true, data: data as SizeChart }
  } catch (error) {
    console.error('Update size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update size chart' 
    }
  }
}

/**
 * Delete a size chart
 */
export async function deleteSizeChart(id: string): Promise<SizeChartActionResult> {
  try {
    const { supabase } = await requireAdmin()

    // Check if chart is in use (due to ON DELETE RESTRICT)
    const { data: productsUsing, error: checkError } = await supabase
      .from('product_size_charts')
      .select('product_id')
      .eq('size_chart_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking size chart usage:', checkError)
      return { success: false, error: 'Failed to verify size chart usage' }
    }

    if (productsUsing && productsUsing.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete size chart: it is assigned to one or more products. Remove assignments first.' 
      }
    }

    const { error } = await supabase
      .from('size_charts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting size chart:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete size chart' 
    }
  }
}

/**
 * List all size charts (optionally filtered by category)
 */
export async function listSizeCharts(
  category?: string
): Promise<SizeChartActionResult<SizeChart[]>> {
  try {
    const { supabase } = await requireAdmin()

    let query = supabase
      .from('size_charts')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error listing size charts:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: (data || []) as SizeChart[] }
  } catch (error) {
    console.error('List size charts error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to list size charts' 
    }
  }
}

/**
 * Get a single size chart by ID
 */
export async function getSizeChart(id: string): Promise<SizeChartActionResult<SizeChart>> {
  try {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase
      .from('size_charts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching size chart:', error)
      return { success: false, error: error.message }
    }

    if (!data) {
      return { success: false, error: 'Size chart not found' }
    }

    return { success: true, data: data as SizeChart }
  } catch (error) {
    console.error('Get size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch size chart' 
    }
  }
}

// ============================================
// PRODUCT-SIZE CHART ASSIGNMENT (1:1)
// ============================================

/**
 * Assign a size chart to a product
 * Enforces 1:1 relationship (product_id is PRIMARY KEY)
 */
export async function assignSizeChartToProduct(
  payload: AssignSizeChartToProductPayload
): Promise<SizeChartActionResult> {
  try {
    const { supabase } = await requireAdmin()

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', payload.product_id)
      .single()

    if (productError || !product) {
      return { success: false, error: 'Product not found' }
    }

    // Verify size chart exists
    const { data: sizeChart, error: chartError } = await supabase
      .from('size_charts')
      .select('id')
      .eq('id', payload.size_chart_id)
      .single()

    if (chartError || !sizeChart) {
      return { success: false, error: 'Size chart not found' }
    }

    // Upsert (replaces existing if any, due to PRIMARY KEY on product_id)
    const { error } = await supabase
      .from('product_size_charts')
      .upsert({
        product_id: payload.product_id,
        size_chart_id: payload.size_chart_id,
      })

    if (error) {
      console.error('Error assigning size chart:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Assign size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to assign size chart' 
    }
  }
}

/**
 * Remove size chart assignment from a product
 */
export async function removeSizeChartFromProduct(
  productId: string
): Promise<SizeChartActionResult> {
  try {
    const { supabase } = await requireAdmin()

    const { error } = await supabase
      .from('product_size_charts')
      .delete()
      .eq('product_id', productId)

    if (error) {
      console.error('Error removing size chart:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Remove size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove size chart' 
    }
  }
}

/**
 * Get size chart for a product
 */
export async function getProductSizeChart(
  productId: string
): Promise<SizeChartActionResult<ProductSizeChartWithDetails | null>> {
  try {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase
      .from('product_size_charts')
      .select(`
        product_id,
        size_chart_id,
        created_at,
        updated_at,
        size_chart:size_charts(*)
      `)
      .eq('product_id', productId)
      .single()

    if (error) {
      // Not found is not an error (product simply has no size chart)
      if (error.code === 'PGRST116') {
        return { success: true, data: null }
      }
      console.error('Error fetching product size chart:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as unknown as ProductSizeChartWithDetails }
  } catch (error) {
    console.error('Get product size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch product size chart' 
    }
  }
}

/**
 * List all products using a specific size chart
 */
export async function getProductsUsingSizeChart(
  sizeChartId: string
): Promise<SizeChartActionResult<string[]>> {
  try {
    const { supabase } = await requireAdmin()

    const { data, error } = await supabase
      .from('product_size_charts')
      .select('product_id')
      .eq('size_chart_id', sizeChartId)

    if (error) {
      console.error('Error fetching products using size chart:', error)
      return { success: false, error: error.message }
    }

    const productIds = (data || []).map(row => row.product_id)
    return { success: true, data: productIds }
  } catch (error) {
    console.error('Get products using size chart error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch products' 
    }
  }
}
