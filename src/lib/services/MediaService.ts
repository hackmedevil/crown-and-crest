/**
 * Media Service
 * Handles Cloudinary image upload, deletion, and product image management
 */

import { supabaseServer } from '@/lib/supabase/server';
import { CacheService } from './CacheService';
import type { Database } from '@/types/supabase';

type ProductImage = Database['public']['Tables']['product_images']['Row'];
type ProductImageInsert = Database['public']['Tables']['product_images']['Insert'];

interface UploadImageData {
  product_id: string;
  cloudinary_public_id: string;
  cloudinary_version?: string;
  position?: number;
  alt_text?: string;
  is_primary?: boolean;
  width?: number;
  height?: number;
  format?: string;
}

interface UpdateImageData {
  position?: number;
  alt_text?: string;
  is_primary?: boolean;
}

export class MediaService {
  /**
   * Add image to product
   * Automatically assigns position if not provided
   */
  static async addImage(data: UploadImageData): Promise<ProductImage> {
    const supabase = supabaseServer;

    // Get next position if not provided
    let position = data.position;
    if (position === undefined) {
      const { data: images } = await supabase
        .from('product_images')
        .select('position')
        .eq('product_id', data.product_id)
        .order('position', { ascending: false })
        .limit(1);

      position = images && images.length > 0 ? images[0].position + 1 : 0;
    }

    // If this is marked as primary, unset other primary images
    if (data.is_primary) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', data.product_id);
    }

    // Insert image
    const { data: image, error } = await supabase
      .from('product_images')
      .insert({
        product_id: data.product_id,
        cloudinary_public_id: data.cloudinary_public_id,
        cloudinary_version: data.cloudinary_version,
        position,
        alt_text: data.alt_text,
        is_primary: data.is_primary || false,
        width: data.width,
        height: data.height,
        format: data.format,
      } as ProductImageInsert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add image: ${error.message}`);
    }

    // Invalidate caches
    CacheService.invalidateProductImages(data.product_id);
    CacheService.invalidateProduct(data.product_id);

    return image;
  }

  /**
   * Get all images for a product, ordered by position
   */
  static async listByProduct(productId: string): Promise<ProductImage[]> {
    const supabase = supabaseServer;

    const { data: images, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (error) {
      throw new Error(`Failed to list images: ${error.message}`);
    }

    return images || [];
  }

  /**
   * Get primary image for a product
   */
  static async getPrimaryImage(productId: string): Promise<ProductImage | null> {
    const supabase = supabaseServer;

    const { data: image, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No primary image
      }
      throw new Error(`Failed to get primary image: ${error.message}`);
    }

    return image;
  }

  /**
   * Update image metadata
   */
  static async updateImage(id: string, data: UpdateImageData): Promise<ProductImage> {
    const supabase = supabaseServer;

    // Get existing image to check product_id
    const { data: existingImage } = await supabase
      .from('product_images')
      .select('product_id, is_primary')
      .eq('id', id)
      .single();

    if (!existingImage) {
      throw new Error('Image not found');
    }

    // If setting as primary, unset other primary images
    if (data.is_primary && !existingImage.is_primary) {
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', existingImage.product_id);
    }

    // Update image
    const { data: image, error } = await supabase
      .from('product_images')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update image: ${error.message}`);
    }

    // Invalidate caches
    CacheService.invalidateProductImages(existingImage.product_id);
    CacheService.invalidateProduct(existingImage.product_id);

    return image;
  }

  /**
   * Delete image
   * Note: Does not delete from Cloudinary - handle separately
   */
  static async deleteImage(id: string): Promise<void> {
    const supabase = supabaseServer;

    // Get image to know product_id for cache invalidation
    const { data: image } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('id', id)
      .single();

    if (!image) {
      throw new Error('Image not found');
    }

    const { error } = await supabase.from('product_images').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }

    // Invalidate caches
    CacheService.invalidateProductImages(image.product_id);
    CacheService.invalidateProduct(image.product_id);
  }

  /**
   * Reorder images for a product
   * @param imageIds Array of image IDs in desired order
   */
  static async reorderImages(productId: string, imageIds: string[]): Promise<void> {
    const supabase = supabaseServer;

    // Update position for each image
    const updates = imageIds.map((imageId, index) =>
      supabase
        .from('product_images')
        .update({ position: index })
        .eq('id', imageId)
        .eq('product_id', productId)
    );

    await Promise.all(updates);

    // Invalidate caches
    CacheService.invalidateProductImages(productId);
    CacheService.invalidateProduct(productId);
  }

  /**
   * Set primary image for a product
   * Unsets all other images as non-primary
   */
  static async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    const supabase = supabaseServer;

    // Unset all primary images for this product
    await supabase
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', productId);

    // Set the specified image as primary
    const { error } = await supabase
      .from('product_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to set primary image: ${error.message}`);
    }

    // Invalidate caches
    CacheService.invalidateProductImages(productId);
    CacheService.invalidateProduct(productId);
  }

  /**
   * Generate Cloudinary URL for an image
   * @param publicId Cloudinary public ID
   * @param transformations Optional Cloudinary transformations
   */
  static generateCloudinaryUrl(
    publicId: string,
    transformations?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
    }
  ): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      throw new Error('Cloudinary cloud name not configured');
    }

    let transformStr = '';
    if (transformations) {
      const parts: string[] = [];
      if (transformations.width) parts.push(`w_${transformations.width}`);
      if (transformations.height) parts.push(`h_${transformations.height}`);
      if (transformations.crop) parts.push(`c_${transformations.crop}`);
      if (transformations.quality) parts.push(`q_${transformations.quality}`);
      if (transformations.format) parts.push(`f_${transformations.format}`);
      transformStr = parts.join(',') + '/';
    }

    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`;
  }
}
