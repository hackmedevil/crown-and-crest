import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic'

interface ProductImage {
  id: number;
  cloudinary_public_id: string;
  cloudinary_url: string;
  display_order: number;
  alt_text: string | null;
  is_primary: boolean;
}

/**
 * GET /api/admin/products/[id]/images
 * Fetch all images for a product from product.images JSONB column
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: productId } = await params;

    // Fetch product with images
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, images, image_url')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Convert product.images array to the expected response format
    // Product images are stored as: Array<{ url: string; alt?: string | null }>
    const images: ProductImage[] = (product.images || []).map(
      (img: any, idx: number) => ({
        id: idx,
        cloudinary_public_id: '',
        cloudinary_url: typeof img === 'string' ? img : img.url || '',
        display_order: idx,
        alt_text: typeof img === 'object' ? img.alt || null : null,
        is_primary: (typeof img === 'string' ? img : img.url) === product.image_url,
      })
    );

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Failed to fetch product images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/products/[id]/images
 * Add an image to a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: productId } = await params;
    const body = await request.json();
    const { cloudinary_url, alt_text = null } = body;

    if (!cloudinary_url) {
      return NextResponse.json(
        { error: 'cloudinary_url is required' },
        { status: 400 }
      );
    }

    // Fetch current product
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, images, image_url')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Add new image to images array
    const currentImages = product.images || [];
    const newImage = {
      url: cloudinary_url,
      alt: alt_text,
    };

    const updatedImages = [...currentImages, newImage];

    // If this is the first image, set it as primary
    const newImageUrl = currentImages.length === 0 ? cloudinary_url : product.image_url;

    // Update product
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        images: updatedImages,
        image_url: newImageUrl,
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || 'Failed to update product');
    }

    return NextResponse.json(
      {
        image: {
          id: currentImages.length,
          cloudinary_url,
          alt_text,
          is_primary: currentImages.length === 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to add image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add image' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/products/[id]/images/[imageId]
 * Update an image (set as primary or update alt text)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: productId } = await params;
    const body = await request.json();
    const { imageId, is_primary, alt_text } = body;

    if (imageId === undefined) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      );
    }

    // Fetch current product
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, images, image_url')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const currentImages = product.images || [];

    if (imageId < 0 || imageId >= currentImages.length) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Update image data
    const updatedImages = [...currentImages];
    const targetImage = updatedImages[imageId];
    const imageUrl = typeof targetImage === 'string' ? targetImage : targetImage.url;

    updatedImages[imageId] = {
      url: imageUrl,
      alt: alt_text !== undefined ? alt_text : (typeof targetImage === 'object' ? targetImage.alt : null),
    };

    // Update primary image if needed
    let newImageUrl = product.image_url;
    if (is_primary) {
      newImageUrl = imageUrl;
    }

    // Update product
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        images: updatedImages,
        image_url: newImageUrl,
      })
      .eq('id', productId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || 'Failed to update product');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update image' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/products/[id]/images/[imageId]
 * Delete an image from a product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: productId } = await params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (imageId === null) {
      return NextResponse.json(
        { error: 'imageId is required' },
        { status: 400 }
      );
    }

    const idx = parseInt(imageId, 10);

    // Fetch current product
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, images, image_url')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const currentImages = product.images || [];

    if (idx < 0 || idx >= currentImages.length) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    // Remove image from array
    const updatedImages = currentImages.filter((_: any, i: number) => i !== idx);
    const deletedImageUrl = typeof currentImages[idx] === 'string' 
      ? currentImages[idx] 
      : currentImages[idx].url;

    // If deleted image was primary, set new primary
    let newImageUrl = product.image_url;
    if (product.image_url === deletedImageUrl && updatedImages.length > 0) {
      newImageUrl = typeof updatedImages[0] === 'string' 
        ? updatedImages[0] 
        : updatedImages[0].url;
    } else if (updatedImages.length === 0) {
      newImageUrl = null;
    }

    // Update product
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({
        images: updatedImages,
        image_url: newImageUrl,
      })
      .eq('id', productId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    );
  }
}
