# Media Manager Dialog

The Media Manager Dialog is a comprehensive Cloudinary media management solution that allows you to browse, upload, rename, delete, and crop images from anywhere in your application.

## Features

- 🖼️ **Browse Cloudinary Media**: View all images stored in Cloudinary with pagination
- ⬆️ **Upload Images**: Drag-and-drop or browse to upload new images
- ✏️ **Rename Images**: Rename images directly in Cloudinary
- 🗑️ **Delete Images**: Remove images from Cloudinary with confirmation
- ✂️ **Crop Images**: Crop images and upload the cropped version
- 🔍 **Search**: Filter images by filename
- 📱 **Responsive**: Works on desktop and mobile devices

## Usage

### Option 1: Using the Hook (Recommended)

```tsx
import { useMediaManager } from '@/hooks/useMediaManager'
import MediaManagerDialog from '@/components/admin/MediaManagerDialog'

export default function MyComponent() {
  const [imageUrl, setImageUrl] = useState('')
  
  const mediaManager = useMediaManager({
    onSelect: (imageUrl, publicId) => {
      setImageUrl(imageUrl)
      console.log('Selected image:', publicId)
    },
    folder: 'product-images', // Optional: default is 'product-images'
    title: 'Select Product Image' // Optional: custom title
  })

  return (
    <div>
      <button onClick={mediaManager.open}>
        Select Image from Library
      </button>
      
      {imageUrl && <img src={imageUrl} alt="Selected" />}
      
      {/* Include the dialog component */}
      <MediaManagerDialog {...mediaManager.dialogProps} />
    </div>
  )
}
```

### Option 2: Direct Component Usage

```tsx
import { useState } from 'react'
import MediaManagerDialog from '@/components/admin/MediaManagerDialog'

export default function MyComponent() {
  const [showDialog, setShowDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const handleSelect = (url: string, publicId: string) => {
    setImageUrl(url)
    console.log('Selected:', publicId)
  }

  return (
    <div>
      <button onClick={() => setShowDialog(true)}>
        Browse Media
      </button>

      <MediaManagerDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSelect={handleSelect}
        folder="product-images"
        title="Select Image"
      />
    </div>
  )
}
```

## Props

### MediaManagerDialog Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls dialog visibility |
| `onClose` | `() => void` | required | Callback when dialog is closed |
| `onSelect` | `(url: string, publicId: string) => void` | required | Callback when image is selected |
| `folder` | `string` | `'product-images'` | Cloudinary folder to browse |
| `allowMultiple` | `boolean` | `false` | Allow selecting multiple images (future feature) |
| `title` | `string` | `'Media Manager'` | Dialog title |

### useMediaManager Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onSelect` | `(url: string, publicId: string) => void` | required | Callback when image is selected |
| `folder` | `string` | `'product-images'` | Cloudinary folder to browse |
| `allowMultiple` | `boolean` | `false` | Allow selecting multiple images |
| `title` | `string` | `'Media Manager'` | Dialog title |

**Returns:**
```typescript
{
  open: () => void
  close: () => void
  isOpen: boolean
  dialogProps: {
    isOpen: boolean
    onClose: () => void
    onSelect: (url: string, publicId: string) => void
    folder: string
    allowMultiple: boolean
    title: string
  }
}
```

## API Endpoints

The Media Manager uses the following API endpoints:

### GET `/api/cloudinary/media`
List Cloudinary assets with pagination

**Query Parameters:**
- `folder` - Cloudinary folder to browse (default: 'product-images')
- `max_results` - Number of results per page (default: 50)
- `next_cursor` - Pagination cursor for next page

### POST `/api/cloudinary/media`
Upload a new image to Cloudinary

**Body (FormData):**
- `file` - Image file to upload
- `folder` - Target Cloudinary folder
- `tags` - Comma-separated tags (optional)
- `context` - Metadata context (optional)

### DELETE `/api/cloudinary/media`
Delete an image from Cloudinary

**Body (JSON):**
```json
{
  "public_id": "product-images/my-image"
}
```

### PATCH `/api/cloudinary/media`
Rename or update metadata for an image

**Body (JSON):**
```json
{
  "public_id": "product-images/old-name",
  "new_public_id": "product-images/new-name",
  "context": "alt=My Image",
  "tags": ["product", "featured"]
}
```

## Examples

### Example 1: Product Image Selection

```tsx
import { useMediaManager } from '@/hooks/useMediaManager'
import MediaManagerDialog from '@/components/admin/MediaManagerDialog'

export default function ProductForm() {
  const [productImage, setProductImage] = useState('')
  
  const mediaManager = useMediaManager({
    onSelect: (imageUrl) => setProductImage(imageUrl)
  })

  return (
    <div>
      <label>Product Image</label>
      <button onClick={mediaManager.open}>Select Image</button>
      
      {productImage && (
        <img src={productImage} alt="Product" width={200} />
      )}
      
      <MediaManagerDialog {...mediaManager.dialogProps} />
    </div>
  )
}
```

### Example 2: Avatar Upload

```tsx
import MediaManagerDialog from '@/components/admin/MediaManagerDialog'

export default function UserProfile() {
  const [avatarUrl, setAvatarUrl] = useState('')
  
  const mediaManager = useMediaManager({
    onSelect: (imageUrl) => setAvatarUrl(imageUrl),
    folder: 'avatars',
    title: 'Select Profile Picture'
  })

  return (
    <div>
      <div onClick={mediaManager.open} className="cursor-pointer">
        {avatarUrl ? (
          <img src={avatarUrl} className="rounded-full w-20 h-20" />
        ) : (
          <div className="rounded-full w-20 h-20 bg-gray-200" />
        )}
      </div>
      
      <MediaManagerDialog {...mediaManager.dialogProps}
      <MediaManagerComponent />
    </div>
  )
}
```

### Example 3: Blog Post Featured Image

```tsx
import MediaManagerDialog from '@/components/admin/MediaManagerDialog'

export default function BlogPostEditor() {
  const [featuredImage, setFeaturedImage] = useState('')
  const [featuredImageId, setFeaturedImageId] = useState('')
  
  const mediaManager = useMediaManager({
    onSelect: (imageUrl, publicId) => {
      setFeaturedImage(imageUrl)
      setFeaturedImageId(publicId)
    },
    folder: 'blog-images'
  })

  const handleSave = () => {
    // Save blog post with featuredImage and featuredImageId
    console.log({ featuredImage, featuredImageId })
  }

  return (
    <div>
      <h2>Featured Image</h2>
      <button onClick={mediaManager.open}>
        {featuredImage ? 'Change Image' : 'Select Image'}
      </button>
      
      {featuredImage && (
        <img src={featuredImage} alt="Featured" />
      )}
      
      <button onClick={handleSave}>Save Post</button>
      
      <MediaManagerDialog {...mediaManager.dialogProps}
      <MediaManagerComponent />
    </div>
  )
}
```

## Features in Detail

### Image Upload
- Drag-and-drop support
- Multiple file upload
- Automatic Cloudinary upload
- Progress indicator
- Format validation

### Image Browsing
- Grid view with thumbnails
- Pagination support
- Image metadata display (dimensions, file size)
- Visual selection feedback

### Image Cropping
- Interactive crop tool
- Real-time preview
- Custom aspect ratios
- Uploads cropped version as new image

### Image Rename
- In-place renaming
- Preserves folder structure
- Instant feedback

### Image Deletion
- Confirmation dialog
- Removes from Cloudinary
- Updates UI immediately

### Search & Filter
- Real-time search by filename
- Case-insensitive matching
- Instant results

## Dependencies

- `react-image-crop` - Image cropping functionality
- `lucide-react` - Icons
- `next/image` - Optimized image rendering

## Notes

- Images are stored in Cloudinary folders (default: `product-images`)
- All operations are performed server-side through secure API endpoints
- The dialog is responsive and works on mobile devices
- Upload size limit is configured in Cloudinary settings
- Deleted images are permanently removed from Cloudinary

## Troubleshooting

### Images not loading
- Check Cloudinary credentials in `.env.local`
- Verify API endpoints are accessible
- Check browser console for errors

### Upload failing
- Verify file size is within limits
- Check Cloudinary upload preset configuration
- Ensure file format is supported

### Crop not working
- Ensure `react-image-crop` is installed
- Check that image loads before cropping
- Verify browser supports Canvas API
