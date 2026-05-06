/**
 * Variant Service
 * Handles variant CRUD with flexible attributes support
 * Manages variant-specific operations including stock tracking
 */

import { supabaseServer } from '@/lib/supabase/server';
import { CacheService } from './CacheService';
import type { Database } from '@/types/supabase';

type Variant = Database['public']['Tables']['variants']['Row'];
type VariantInsert = Database['public']['Tables']['variants']['Insert'];
type VariantUpdate = Database['public']['Tables']['variants']['Update'];
type VariantAttribute = Database['public']['Tables']['variant_attributes']['Row'];
type VariantImage = Database['public']['Tables']['variant_images']['Row'];

interface CreateVariantData {
  product_id: string;
  sku?: string;
  price_override?: number | null;
  stock_quantity: number;
  enabled?: boolean;
  barcode?: string | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  attributes?: Record<string, string>; // e.g., { size: 'L', color: 'Red' }
  images?: string[];
}

interface UpdateVariantData {
  sku?: string;
  price_override?: number | null;
  stock_quantity?: number;
  enabled?: boolean;
  barcode?: string | null;
  cost_price?: number | null;
  weight_grams?: number | null;
  attributes?: Record<string, string>;
  images?: string[];
}

interface VariantWithAttributes {
  id: string;
  product_id: string;
  sku: string;
  price_override: number | null;
  stock_quantity: number;
  enabled: boolean;
  barcode: string | null;
  cost_price: number | null;
  weight_grams: number | null;
  created_at: string;
  updated_at: string;
  attributes: VariantAttribute[];
  variant_images: VariantImage[];
}

export class VariantService {
  private static extractSizeAndColor(
    attributes: Record<string, string>
  ): { size: string | null; color: string | null } {
    const entries = Object.entries(attributes)
    const sizeEntry = entries.find(([key]) => key.toLowerCase() === 'size')
    const colorEntry = entries.find(([key]) => key.toLowerCase() === 'color')

    const sizeValue = sizeEntry?.[1]?.trim() || null
    const colorValue = colorEntry?.[1]?.trim() || null

    return {
      size: sizeValue,
      color: colorValue,
    }
  }

  private static normalizePriceOverride(
    priceOverride: number | null | undefined
  ): number | null | undefined {
    if (priceOverride === undefined) return undefined;
    if (priceOverride === null) return null;

    // Current DB constraint allows only positive values; treat 0 or negative as no override.
    return priceOverride > 0 ? priceOverride : null;
  }

  /**
   * Create a new variant with attributes
   * @throws Error if SKU already exists or validation fails
   */
  static async create(data: CreateVariantData): Promise<VariantWithAttributes> {
    const supabase = supabaseServer;
    const normalizedAttributes = this.normalizeAttributes(data.attributes || {});
    const { size, color } = this.extractSizeAndColor(normalizedAttributes)

    await this.ensureUniqueAttributeCombination(data.product_id, normalizedAttributes);

    // Generate SKU if not provided
    const sku = data.sku || await this.generateSKU(data.product_id);

    // Check for duplicate SKU
    const { data: existingVariant } = await supabase
      .from('variants')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingVariant) {
      throw new Error(`Variant with SKU '${sku}' already exists`);
    }

    // Check for duplicate barcode if provided
    if (data.barcode) {
      const { data: existingBarcodeVariant } = await supabase
        .from('variants')
        .select('id')
        .eq('barcode', data.barcode)
        .single();

      if (existingBarcodeVariant) {
        throw new Error(`Variant with barcode '${data.barcode}' already exists`);
      }
    }

    // Insert variant
    const { data: variant, error: variantError } = await supabase
      .from('variants')
      .insert({
        product_id: data.product_id,
        sku,
        size,
        color,
        price_override: this.normalizePriceOverride(data.price_override),
        stock_quantity: data.stock_quantity,
        enabled: data.enabled ?? true,
        barcode: data.barcode,
        cost_price: data.cost_price,
        weight_grams: data.weight_grams,
      } as VariantInsert)
      .select()
      .single();

    if (variantError) {
      throw new Error(`Failed to create variant: ${variantError.message}`);
    }

    // Insert attributes if provided
    let attributes: VariantAttribute[] = [];
    if (Object.keys(normalizedAttributes).length > 0) {
      attributes = await this.setAttributes(variant.id, normalizedAttributes);
    }

    const variant_images = await this.setVariantImages(variant.id, data.images || []);

    // Invalidate caches
    CacheService.invalidateVariants(data.product_id);
    CacheService.invalidateProduct(data.product_id);
    CacheService.invalidateProductsList();

    return {
      ...variant,
      attributes,
      variant_images,
    };
  }

  /**
   * Get variant by ID with attributes
   */
  static async getById(id: string): Promise<VariantWithAttributes | null> {
    const supabase = supabaseServer;

    const { data: variant, error } = await supabase
      .from('variants')
      .select('*, attributes:variant_attributes(*), variant_images(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch variant: ${error.message}`);
    }

    return variant as unknown as VariantWithAttributes;
  }

  /**
   * Get variant by SKU with attributes
   */
  static async getBySKU(sku: string): Promise<VariantWithAttributes | null> {
    const supabase = supabaseServer;

    const { data: variant, error } = await supabase
      .from('variants')
      .select('*, attributes:variant_attributes(*), variant_images(*)')
      .eq('sku', sku)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch variant: ${error.message}`);
    }

    return variant as unknown as VariantWithAttributes;
  }

  /**
   * List variants for a product with attributes
   */
  static async listByProduct(productId: string): Promise<VariantWithAttributes[]> {
    const supabase = supabaseServer;

    const { data: variants, error } = await supabase
      .from('variants')
      .select('*, attributes:variant_attributes(*), variant_images(*)')
      .eq('product_id', productId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to list variants: ${error.message}`);
    }

    return (variants || []) as unknown as VariantWithAttributes[];
  }

  /**
   * Update variant and optionally its attributes
   */
  static async update(id: string, data: UpdateVariantData): Promise<VariantWithAttributes> {
    const supabase = supabaseServer;
    // Get existing variant to check product_id
    const existingVariant = await this.getById(id);
    if (!existingVariant) {
      throw new Error('Variant not found');
    }

    const normalizedAttributes =
      data.attributes !== undefined ? this.normalizeAttributes(data.attributes) : undefined;

    const normalizedSizeAndColor =
      normalizedAttributes !== undefined
        ? this.extractSizeAndColor(normalizedAttributes)
        : null

    if (normalizedAttributes) {
      await this.ensureUniqueAttributeCombination(existingVariant.product_id, normalizedAttributes, id);
    }

    // Check for duplicate SKU if changing
    if (data.sku) {
      const { data: duplicateSKU } = await supabase
        .from('variants')
        .select('id')
        .eq('sku', data.sku)
        .neq('id', id)
        .single();

      if (duplicateSKU) {
        throw new Error(`Variant with SKU '${data.sku}' already exists`);
      }
    }

    // Check for duplicate barcode if changing
    if (data.barcode) {
      const { data: duplicateBarcode } = await supabase
        .from('variants')
        .select('id')
        .eq('barcode', data.barcode)
        .neq('id', id)
        .single();

      if (duplicateBarcode) {
        throw new Error(`Variant with barcode '${data.barcode}' already exists`);
      }
    }

    // Update variant
    const updateData: VariantUpdate = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.price_override !== undefined) {
      updateData.price_override = this.normalizePriceOverride(data.price_override);
    }
    if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.cost_price !== undefined) updateData.cost_price = data.cost_price;
    if (data.weight_grams !== undefined) updateData.weight_grams = data.weight_grams;
    if (normalizedSizeAndColor) {
      updateData.size = normalizedSizeAndColor.size
      updateData.color = normalizedSizeAndColor.color
    }

    let variant: Variant | null = null;

    // Only hit the variants table when actual variant fields changed.
    // Image-only/attribute-only updates should not execute an empty UPDATE ... RETURNING single row.
    if (Object.keys(updateData).length > 0) {
      const { data: updatedVariant, error } = await supabase
        .from('variants')
        .update(updateData)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update variant: ${error.message}`);
      }

      variant = updatedVariant;
    }

    // Update attributes if provided
    let attributes = existingVariant.attributes;
    if (normalizedAttributes !== undefined) {
      attributes = await this.setAttributes(id, normalizedAttributes);
    }

    const variant_images =
      data.images !== undefined
        ? await this.setVariantImages(id, data.images)
        : existingVariant.variant_images || [];

    // Invalidate caches
    CacheService.invalidateVariants(existingVariant.product_id);
    CacheService.invalidateProduct(existingVariant.product_id);

    return {
      ...(variant ?? (existingVariant as unknown as Variant)),
      attributes,
      variant_images,
    };
  }

  /**
   * Delete variant
   */
  static async delete(id: string): Promise<void> {
    const supabase = supabaseServer;

    // Get variant to know product_id for cache invalidation
    const variant = await this.getById(id);
    if (!variant) {
      throw new Error('Variant not found');
    }

    const { error } = await supabase.from('variants').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete variant: ${error.message}`);
    }

    // Invalidate caches
    CacheService.invalidateVariants(variant.product_id);
    CacheService.invalidateProduct(variant.product_id);
  }

  /**
   * Set variant attributes (replaces all existing attributes)
   */
  static async setAttributes(
    variantId: string,
    attributes: Record<string, string>
  ): Promise<VariantAttribute[]> {
    const supabase = supabaseServer;

    // Delete existing attributes
    await supabase.from('variant_attributes').delete().eq('variant_id', variantId);

    // Insert new attributes
    if (Object.keys(attributes).length === 0) {
      return [];
    }

    const attributesData = Object.entries(attributes).map(([name, value], index) => ({
      variant_id: variantId,
      attribute_name: name,
      attribute_value: value,
      display_order: index,
    }));

    const { data: newAttributes, error } = await supabase
      .from('variant_attributes')
      .insert(attributesData)
      .select();

    if (error) {
      throw new Error(`Failed to set variant attributes: ${error.message}`);
    }

    return newAttributes || [];
  }

  static async setVariantImages(variantId: string, images: string[]): Promise<VariantImage[]> {
    const supabase = supabaseServer;

    await supabase.from('variant_images').delete().eq('variant_id', variantId);

    const cleaned = images.map((url) => url.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      return [];
    }

    const rows = cleaned.map((imageUrl, index) => ({
      variant_id: variantId,
      image_url: imageUrl,
      position: index,
      is_primary: index === 0,
    }));

    const { data, error } = await supabase
      .from('variant_images')
      .insert(rows)
      .select();

    if (error) {
      throw new Error(`Failed to set variant images: ${error.message}`);
    }

    return data || [];
  }

  private static normalizeAttributes(attributes: Record<string, string>): Record<string, string> {
    const entries = Object.entries(attributes)
      .map(([name, value]) => [name.trim(), value.trim()] as const)
      .filter(([name, value]) => name.length > 0 && value.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));

    const normalized: Record<string, string> = {};
    for (const [name, value] of entries) {
      normalized[name] = value;
    }
    return normalized;
  }

  private static areAttributesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (a[key] !== b[key]) {
        return false;
      }
    }

    return true;
  }

  private static async ensureUniqueAttributeCombination(
    productId: string,
    attributes: Record<string, string>,
    excludeVariantId?: string
  ): Promise<void> {
    const existing = await this.listByProduct(productId);

    const duplicate = existing.find((variant) => {
      if (excludeVariantId && variant.id === excludeVariantId) {
        return false;
      }

      const variantAttributes = (variant.attributes || []).reduce<Record<string, string>>((acc, attr) => {
        acc[attr.attribute_name] = attr.attribute_value;
        return acc;
      }, {});

      return this.areAttributesEqual(variantAttributes, attributes);
    });

    if (duplicate) {
      throw new Error('Variant with the same attribute combination already exists');
    }
  }

  /**
   * Generate SKU for a variant
   * Format: PRODUCT_ID_FIRST_8_CHARS-TIMESTAMP
   */
  private static async generateSKU(productId: string): Promise<string> {
    const productPrefix = productId.substring(0, 8).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${productPrefix}-${timestamp}`;
  }
}
