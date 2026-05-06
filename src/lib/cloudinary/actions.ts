'use server'

import { generateCloudinarySignature, getCloudinaryAdmin } from './server'
import { Readable } from 'stream'

export async function getCloudinarySignature() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY

  if (!cloudName || !apiKey) {
    throw new Error('Missing Cloudinary configuration: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_API_KEY')
  }

  const timestamp = Math.round(new Date().getTime() / 1000)
  const folder = 'product-images'

  const params = {
    timestamp,
    folder,
  }

  const signature = generateCloudinarySignature(params)

  return {
    signature,
    timestamp,
    folder,
    cloudName,
    apiKey
  }
}

export async function uploadProductImage(formData: FormData) {
  try {
    console.log('Starting uploadProductImage...')
    const file = formData.get('file') as File
    if (!file) {
        console.error('No file provided in formData')
        throw new Error('No file provided')
    }
    console.log('File received:', file.name, file.size, file.type)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('Buffer created, size:', buffer.length)

    return new Promise<any>((resolve, reject) => {
        const uploadStream = getCloudinaryAdmin().uploader.upload_stream(
        { folder: 'product-images' },
        (error, result) => {
            if (error) {
                console.error('Cloudinary upload_stream error:', error)
                reject(new Error(`Cloudinary upload failed: ${error.message}`))
            } else {
                console.log('Cloudinary upload success:', result?.secure_url)
                resolve(result)
            }
        }
        )
        
        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)
        stream.pipe(uploadStream)
    })
  } catch (error: unknown) {
    console.error('uploadProductImage exception:', error)
    throw new Error(error instanceof Error ? error.message : 'Upload action failed')
  }
}
