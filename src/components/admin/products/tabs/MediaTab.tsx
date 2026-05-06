"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, Star, Loader2, AlertCircle, FolderOpen } from "lucide-react";
import { useCSRFToken } from "@/hooks/useCSRFToken";
import Image from "next/image";
import MediaManagerDialog from "@/components/admin/MediaManagerDialog";

interface ProductImage {
  id: number;
  cloudinary_public_id: string;
  cloudinary_url: string;
  display_order: number;
  alt_text: string | null;
  is_primary: boolean;
}

interface MediaTabProps {
  productId: string;
}

export default function MediaTab({ productId }: MediaTabProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showMediaManager, setShowMediaManager] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { csrfToken } = useCSRFToken();

  // Fetch images
  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/products/${productId}/images`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
  };

  // Upload images
  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image file`);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`${file.name} is too large (max 5MB)`);
        }

        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("product_id", productId.toString());
        formData.append("folder", "product-images");

        // Upload to Cloudinary via our API
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          headers: {
            "X-CSRF-Token": csrfToken || "",
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const uploadedImage = await response.json();
        
        // Add image to product
        const addResponse = await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({
            cloudinary_public_id: uploadedImage.public_id,
            cloudinary_url: uploadedImage.secure_url,
            display_order: images.length + i,
          }),
        });

        if (!addResponse.ok) {
          throw new Error("Failed to add image to product");
        }

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // Refresh images
      await fetchImages();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Set primary image
  const handleSetPrimary = async (imageId: number) => {
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({ imageId, is_primary: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to set primary image");
      }

      // Refresh images
      await fetchImages();
    } catch (err) {
      console.error("Set primary error:", err);
      setError(err instanceof Error ? err.message : "Failed to set primary image");
    }
  };

  // Delete image
  const handleDelete = async (imageId: number) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productId}/images?imageId=${imageId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": csrfToken || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      // Refresh images
      await fetchImages();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  // Handle selection from media manager
  const handleMediaSelect = async (imageUrl: string, publicId: string) => {
    try {
      // Add image to product
      const addResponse = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          cloudinary_public_id: publicId,
          cloudinary_url: imageUrl,
          display_order: images.length,
        }),
      });

      if (!addResponse.ok) {
        throw new Error("Failed to add image to product");
      }

      // Refresh images
      await fetchImages();
    } catch (err) {
      console.error("Add image error:", err);
      setError(err instanceof Error ? err.message : "Failed to add image");
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleUpload(files);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload Images</h2>
          <button
            type="button"
            onClick={() => setShowMediaManager(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <FolderOpen className="w-4 h-4" />
            Browse Media Library
          </button>
        </div>
        
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Uploading...</p>
              <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop images here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-gray-500">
                Maximum file size: 5MB. Supported formats: JPG, PNG, WEBP
              </p>
            </>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Product Images ({images.length})
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
              >
                {/* Image */}
                <img
                  src={image.cloudinary_url}
                  alt={image.alt_text || "Product image"}
                  className="w-full h-full object-cover"
                />

                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 p-2 rounded-lg hover:bg-gray-100"
                      title="Set as primary"
                    >
                      <Star className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-red-600 p-2 rounded-lg hover:bg-red-50"
                    title="Delete image"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No images yet</h3>
          <p className="text-sm text-gray-600">Upload your first product image to get started</p>
        </div>
      )}

      {/* Media Manager Dialog */}
      <MediaManagerDialog
        isOpen={showMediaManager}
        onClose={() => setShowMediaManager(false)}
        onSelect={handleMediaSelect}
        title="Select from Media Library"
      />
    </div>
  );
}
