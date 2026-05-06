'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'
import { enqueueProductEmbedding } from '@/lib/ai/embedding-queue'

interface ProductVariant {
  id?: string
  size?: string | null
  color?: string | null
  sku: string
  price_override?: number | null
  stock_quantity: number
  low_stock_threshold?: number
  enabled?: boolean
  position?: number
  options?: Record<string, string>
  price?: number
  stock?: number
  images?: string[]
}

export async function upsertProduct(
  productdata: Record<string, unknown>, 
  variants: ProductVariant[], 
  isEditing: boolean, 
  productId?: string
) {
    try {
        // CRITICAL: Verify admin authorization before any operation
        await requireAdmin()
        
        console.log('upsertProduct started:', { isEditing, productId })

        // 1. Upsert Product
        const { data: savedProduct, error: productError } = await supabaseAdmin
            .from('products')
            .upsert({
                ...(isEditing && productId ? { id: productId } : {}),
                ...productdata,
                // updated_at: new Date().toISOString() // Column does not exist
            })
            .select()
            .single()

        if (productError) {
            console.error('Error saving product:', productError)
            throw new Error(`Product Save Failed: ${productError.message}`)
        }

        if (!savedProduct) throw new Error('Product saved but no data returned')

        const finalProductId = savedProduct.id

        // CRITICAL: Enqueue embedding job (non-blocking, fire-and-forget)
        // This MUST NOT throw errors - product save is already complete
        try {
            await enqueueProductEmbedding(finalProductId)
        } catch (embeddingError) {
            // Log only, never throw - embeddings are async background work
            console.warn('[Product Save] Failed to enqueue embedding job for product', finalProductId, embeddingError)
        }

        // 2. Handle Variants
        // For simplicity in Admin, we can delete existing and re-insert, or upsert.
        // Re-insert is safer for sync if we want to remove deleted variants.
        
        if (variants && variants.length > 0) {
            // Transform variants for DB
            const variantsToInsert = variants.map(v => {
                // Use explicit size/color if provided, otherwise extract from options
                let size = v.size || null
                let color = v.color || null
                
                if (!size || !color) {
                    const options = v.options || {}
                    const sizeKey = Object.keys(options).find(k => k.toLowerCase() === 'size')
                    const colorKey = Object.keys(options).find(k => k.toLowerCase() === 'color')

                    if (!size) size = sizeKey ? options[sizeKey] : null
                    if (!color) color = colorKey ? options[colorKey] : null
                }

                // Auto-generate SKU if missing
                let sku = v.sku
                if (!sku || sku.trim() === '') {
                    const parts = [savedProduct.slug]
                    if (size) parts.push(size)
                    if (color) parts.push(color)
                    
                    // Fallback randomness if no options to distinguish
                    if (!size && !color) {
                        parts.push(Math.random().toString(36).substring(2, 6))
                    }
                    
                    sku = parts.join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '')
                }

                const mappedVariant = {
                    product_id: finalProductId,
                    size,
                    color,
                    stock_quantity: v.stock_quantity ?? v.stock ?? 0,
                    price_override: v.price === savedProduct.base_price ? null : (v.price || v.price_override),
                    sku,
                    enabled: true,
                    images: v.images || [], // Variant images from form
                }
                return mappedVariant
            })

            // Deduplicate variants to avoid unique constraint violations
            const uniqueVariants = new Map();
            for (const v of variantsToInsert) {
                const key = `${v.size || '__null__'}-${v.color || '__null__'}`;
                if (!uniqueVariants.has(key)) {
                    uniqueVariants.set(key, v);
                }
            }
            const finalVariantsToInsert = Array.from(uniqueVariants.values());

            // UPSERT variants to preserve IDs and avoid unique constraint violations
            // We match using the unique index on (product_id, size, COALESCE(color, ''))
            // Note: Supabase upsert doesn't support complex expressions, so we'll use a different approach
            
            // First, fetch existing variants for this product
            const { data: existingVariants } = await supabaseAdmin
                .from('variants')
                .select('id, product_id, size, color')
                .eq('product_id', finalProductId)

            const existingMap = new Map();
            if (existingVariants) {
                for (const v of existingVariants) {
                    const key = `${v.size || '__null__'}-${v.color || '__null__'}`;
                    existingMap.set(key, v.id);
                }
            }

            // Add IDs to matching variants for update, leave new ones without ID for insert
            const variantsToUpsert = finalVariantsToInsert.map(v => {
                const key = `${v.size || '__null__'}-${v.color || '__null__'}`;
                const existingId = existingMap.get(key);
                if (existingId) {
                    return { ...v, id: existingId }; // Update existing
                }
                return v; // Insert new
            });

            // Split into updates and inserts
            const variantsToUpdate = variantsToUpsert.filter(v => v.id)
            const newVariants = variantsToUpsert.filter(v => !v.id)

            // Update existing variants
            if (variantsToUpdate.length > 0) {
                const { error: updateError } = await supabaseAdmin
                    .from('variants')
                    .upsert(variantsToUpdate)

                if (updateError) {
                    console.error('Error updating variants:', updateError)
                    throw new Error(`Variant Update Failed: ${updateError.message}`)
                }
            }

            // Insert new variants
            if (newVariants.length > 0) {
                const { error: insertError } = await supabaseAdmin
                    .from('variants')
                    .insert(newVariants)

                if (insertError) {
                    console.error('Error inserting variants:', insertError)
                    throw new Error(`Variant Insert Failed: ${insertError.message}`)
                }
            }

            // --- Handle Variant Images ---
            // Now we need to fetch all variants for this product (to get their IDs)
            // and insert/update their images in the variant_images table
            const { data: allVariants } = await supabaseAdmin
                .from('variants')
                .select('id, size, color')
                .eq('product_id', finalProductId)

            if (allVariants && allVariants.length > 0) {
                // Build a map of variant keys to IDs
                const variantIdMap = new Map();
                for (const v of allVariants) {
                    const key = `${v.size || '__null__'}-${v.color || '__null__'}`;
                    variantIdMap.set(key, v.id);
                }

                // Collect all variant images to insert
                const variantImagesToInsert = [];
                for (const v of variants) {
                    // Get the variant key and ID
                    let size = v.size || null;
                    let color = v.color || null;
                    
                    if (!size || !color) {
                        const options = v.options || {};
                        const sizeKey = Object.keys(options).find(k => k.toLowerCase() === 'size');
                        const colorKey = Object.keys(options).find(k => k.toLowerCase() === 'color');
                        if (!size) size = sizeKey ? options[sizeKey] : null;
                        if (!color) color = colorKey ? options[colorKey] : null;
                    }
                    
                    const key = `${size || '__null__'}-${color || '__null__'}`;
                    const variantId = variantIdMap.get(key);
                    
                    if (!variantId) continue; // Variant not found (shouldn't happen)

                    // Get variantImages from the form variant (cast to any for flexibility)
                    const variantData = v as any;
                    const variantImages = variantData.variantImages || [];
                    
                    // If no variantImages but imageUrl exists, create from imageUrl
                    if (variantImages.length === 0 && variantData.imageUrl) {
                        variantImagesToInsert.push({
                            variant_id: variantId,
                            image_url: variantData.imageUrl,
                            position: 0,
                            is_primary: true
                        });
                    } else {
                        // Use variantImages array
                        for (const img of variantImages) {
                            variantImagesToInsert.push({
                                variant_id: variantId,
                                image_url: img.image_url,
                                position: img.position,
                                is_primary: img.is_primary || false,
                                alt_text: img.alt_text || null
                            });
                        }
                    }
                }

                // Delete existing variant images and insert new ones
                if (variantImagesToInsert.length > 0) {
                    try {
                        // Delete old images for these variants
                        const variantIds = Array.from(new Set(variantImagesToInsert.map(img => img.variant_id)));
                        await supabaseAdmin
                            .from('variant_images')
                            .delete()
                            .in('variant_id', variantIds);

                        // Insert new images
                        const { error: imageError } = await supabaseAdmin
                            .from('variant_images')
                            .insert(variantImagesToInsert);

                        if (imageError) {
                            // Log warning instead of throwing - variant_images table may not exist yet
                            console.warn('WARNING: Could not save variant images (table may not exist yet):', imageError.message);
                        }
                    } catch (error) {
                        // Silently continue - variant_images table may not exist yet or other non-critical error
                        console.warn('WARNING: Failed to save variant images:', error instanceof Error ? error.message : 'Unknown error');
                    }
                }
            }
        }

        revalidatePath('/admin/products')
        revalidatePath(`/admin/products/${finalProductId}`)
        revalidatePath('/shop')
        
        return { success: true, productId: finalProductId }
    } catch (error: unknown) {
        console.error('upsertProduct exception:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
    }
}

// Delete one or more products
export async function deleteProducts(productIds: string[]) {
    try {
        await requireAdmin()

        // Step 1: Get all variant IDs for these products
        const { data: variants } = await supabaseAdmin
            .from('variants')
            .select('id')
            .in('product_id', productIds)

        const variantIds = variants?.map(v => v.id) || []

        // Step 2: Clean up stock_reservations first (if any variants exist)
        if (variantIds.length > 0) {
            const { error: reservationError } = await supabaseAdmin
                .from('stock_reservations')
                .delete()
                .in('variant_id', variantIds)

            if (reservationError) {
                console.error('Error deleting stock reservations:', reservationError)
                // Continue anyway - reservations might have been cleaned up by expiry
            }
        }

        // Step 3: Delete variants (variants CASCADE to cart_items, media, etc.)
        const { error: variantError } = await supabaseAdmin
            .from('variants')
            .delete()
            .in('product_id', productIds)

        if (variantError) {
            console.error('Error deleting variants:', variantError)
            throw new Error(`Failed to delete product variants: ${variantError.message}`)
        }

        // Step 4: Delete products (will CASCADE to collections_products, homepage_products, etc.)
        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .in('id', productIds)

        if (error) {
            console.error('Error deleting products:', error)
            
            // Provide user-friendly error messages
            if (error.code === '23503') { // Foreign key violation
                throw new Error('Cannot delete products that have existing orders. Please archive them instead.')
            }
            throw new Error(`Delete failed: ${error.message}`)
        }

        revalidatePath('/admin/products')
        revalidatePath('/shop')
        
        return { success: true }
    } catch (error: unknown) {
        console.error('deleteProducts exception:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
    }
}

// Update product status (active/draft)
export async function updateProductStatus(productIds: string[], isActive: boolean) {
    try {
        await requireAdmin()

        const { error } = await supabaseAdmin
            .from('products')
            .update({ is_active: isActive })
            .in('id', productIds)

        if (error) {
            console.error('Error updating product status:', error)
            throw new Error(`Status update failed: ${error.message}`)
        }

        revalidatePath('/admin/products')
        revalidatePath('/shop')
        
        return { success: true }
    } catch (error: unknown) {
        console.error('updateProductStatus exception:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return { success: false, error: errorMessage }
    }
}
