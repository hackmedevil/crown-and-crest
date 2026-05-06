/**
 * Cloudinary Media Management API
 * Endpoints for browsing, uploading, deleting, and managing Cloudinary assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCloudinaryAdmin } from '@/lib/cloudinary/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cloudinary/media
 * List all Cloudinary assets with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode')
    const parent = searchParams.get('parent') || ''
    const folder = searchParams.get('folder') || 'product-images'
    const maxResults = parseInt(searchParams.get('max_results') || '50')
    const nextCursor = searchParams.get('next_cursor') || undefined

    const cloudinary = getCloudinaryAdmin()

    if (mode === 'folders') {
      const [rootResult, subResult] = await Promise.all([
        cloudinary.api.root_folders(),
        parent ? cloudinary.api.sub_folders(parent) : Promise.resolve({ folders: [] }),
      ])

      return NextResponse.json({
        success: true,
        folders: rootResult.folders || [],
        subfolders: subResult.folders || [],
        parent,
      })
    }
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: maxResults,
      next_cursor: nextCursor,
      context: true, // Include metadata/context
      tags: true, // Include tags
    })

    return NextResponse.json({
      success: true,
      resources: result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        bytes: resource.bytes,
        created_at: resource.created_at,
        context: resource.context,
        tags: resource.tags,
        folder: resource.folder,
      })),
      next_cursor: result.next_cursor,
      total_count: result.total_count,
    })
  } catch (error) {
    console.error('Error fetching Cloudinary media:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cloudinary/media
 * Upload a new image to Cloudinary
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string | null
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'product-images'
    const folderPath = formData.get('folder_path') as string || ''
    const tags = formData.get('tags') as string || ''
    const context = formData.get('context') as string || ''

    const cloudinary = getCloudinaryAdmin()

    if (action === 'create_folder') {
      if (!folderPath.trim()) {
        return NextResponse.json(
          { success: false, error: 'folder_path is required' },
          { status: 400 }
        )
      }

      const createdFolder = await cloudinary.api.create_folder(folderPath)
      return NextResponse.json({
        success: true,
        folder: createdFolder,
      })
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Use Promise to handle the upload stream
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          tags: tags ? tags.split(',') : undefined,
          context: context || undefined,
          resource_type: 'auto',
        },
        (error, uploadResult) => {
          if (error) {
            reject(error)
          } else {
            resolve(uploadResult)
          }
        }
      )

      const stream = require('stream')
      const readable = new stream.Readable()
      readable.push(buffer)
      readable.push(null)
      readable.pipe(uploadStream)
    })

    return NextResponse.json({
      success: true,
      resource: {
        public_id: result?.public_id,
        secure_url: result?.secure_url,
        format: result?.format,
        width: result?.width,
        height: result?.height,
        bytes: result?.bytes,
        created_at: result?.created_at,
      },
    })
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cloudinary/media
 * Delete an image from Cloudinary
 */
export async function DELETE(request: NextRequest) {
  try {
    const { public_id, public_ids } = await request.json()

    if (!public_id && (!Array.isArray(public_ids) || public_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'No public_id or public_ids provided' },
        { status: 400 }
      )
    }

    const cloudinary = getCloudinaryAdmin()

    if (Array.isArray(public_ids) && public_ids.length > 0) {
      const result = await cloudinary.api.delete_resources(public_ids)
      return NextResponse.json({
        success: true,
        result,
      })
    }

    const result = await cloudinary.uploader.destroy(public_id)

    return NextResponse.json({
      success: result.result === 'ok',
      result: result.result,
    })
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/cloudinary/media
 * Rename or update metadata for a Cloudinary asset
 */
export async function PATCH(request: NextRequest) {
  try {
    const { public_id, new_public_id, context, tags } = await request.json()

    if (!public_id) {
      return NextResponse.json(
        { success: false, error: 'No public_id provided' },
        { status: 400 }
      )
    }

    const cloudinary = getCloudinaryAdmin()
    
    // Rename if new_public_id provided
    if (new_public_id) {
      await cloudinary.uploader.rename(public_id, new_public_id)
    }

    // Update context/tags
    const updates: any = {}
    if (context) updates.context = context
    if (tags) updates.tags = tags

    if (Object.keys(updates).length > 0) {
      await cloudinary.uploader.explicit(new_public_id || public_id, {
        type: 'upload',
        ...updates,
      })
    }

    return NextResponse.json({
      success: true,
      public_id: new_public_id || public_id,
    })
  } catch (error) {
    console.error('Error updating Cloudinary asset:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update' },
      { status: 500 }
    )
  }
}
