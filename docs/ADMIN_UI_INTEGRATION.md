# Admin UI Integration Guide

This guide shows how to integrate CSRF protection and autosave functionality into the existing Admin Product Form.

## Overview

The enhanced admin UI includes:
1. **CSRF Token Management** - Fetches token on mount and includes in requests
2. **Autosave** - Saves draft to localStorage every 2 seconds
3. **Draft Restoration** - Restores unsaved changes when returning to form
4. **Type Safety** - Full TypeScript support with Zod validation

## Integration Steps

### Step 1: Import Required Hooks and Utilities

```typescript
// At the top of ProductForm.tsx or similar component
import { useCSRFToken } from '@/hooks/useCSRFToken';
import { useAutosave } from '@/hooks/useAutosave';
import { api } from '@/lib/utils/api-client';
```

### Step 2: Add CSRF Token State

```typescript
function ProductForm() {
  // Fetch CSRF token
  const { csrfToken, loading: csrfLoading, error: csrfError } = useCSRFToken();

  // Show loading state while fetching token
  if (csrfLoading) {
    return <div>Loading...</div>;
  }

  if (csrfError) {
    return <div>Error loading form: {csrfError.message}</div>;
  }

  // Rest of component...
}
```

### Step 3: Add Autosave Functionality

```typescript
function ProductForm() {
  const { csrfToken } = useCSRFToken();
  
  // Your form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    base_price: 0,
    status: 'draft',
    // ... other fields
  });

  // Autosave with localStorage
  const { clearDraft, hasDraft, lastSaved } = useAutosave({
    key: 'admin-product-form-draft', // Unique key for this form
    data: formData,
    debounceMs: 2000, // Save 2 seconds after last change
    onSave: (data) => {
      console.log('Draft saved:', data);
    },
    onRestore: (data) => {
      // Restore draft when component mounts
      setFormData(data);
      // Show user notification
      toast.success('Restored unsaved changes');
    },
  });

  // Rest of component...
}
```

### Step 4: Show Draft Indicator

```tsx
{hasDraft && (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <CheckCircleIcon className="w-4 h-4 text-green-500" />
    Draft saved {lastSaved ? `at ${lastSaved.toLocaleTimeString()}` : ''}
    <button
      onClick={clearDraft}
      className="text-blue-600 hover:underline"
    >
      Clear draft
    </button>
  </div>
)}
```

### Step 5: Update Form Submission

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!csrfToken) {
    alert('CSRF token not available');
    return;
  }

  try {
    setSubmitting(true);

    // Use API client with CSRF token
    const response = await api.post(
      '/api/admin/products',
      formData,
      { csrfToken }
    );

    if (response.data) {
      // Clear draft after successful submission
      clearDraft();
      
      toast.success('Product created successfully');
      router.push('/admin/products');
    }
  } catch (error) {
    if (error instanceof api.APIError) {
      // Handle structured API errors
      if (error.code === 'ERR_CSRF_TOKEN_INVALID') {
        toast.error('Security token expired. Please refresh and try again.');
      } else if (error.code === 'ERR_DUPLICATE_SLUG') {
        toast.error('A product with this slug already exists');
      } else if (error.code === 'ERR_RATE_LIMIT_EXCEEDED') {
        toast.error('Too many requests. Please wait a moment.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.error('Failed to create product');
    }
  } finally {
    setSubmitting(false);
  }
}
```

### Step 6: Handle Updates Similarly

```typescript
async function handleUpdate(productId: string) {
  if (!csrfToken) {
    alert('CSRF token not available');
    return;
  }

  try {
    setSubmitting(true);

    const response = await api.patch(
      `/api/admin/products/${productId}`,
      formData,
      { csrfToken }
    );

    if (response.data) {
      clearDraft();
      toast.success('Product updated successfully');
    }
  } catch (error) {
    // Same error handling as create
  } finally {
    setSubmitting(false);
  }
}
```

## Complete Example Component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCSRFToken } from '@/hooks/useCSRFToken';
import { useAutosave } from '@/hooks/useAutosave';
import { api } from '@/lib/utils/api-client';

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  base_price: number;
  status: 'draft' | 'active' | 'archived';
  brand?: string;
  tags: string[];
}

export function AdminProductForm() {
  const router = useRouter();
  const { csrfToken, loading: csrfLoading } = useCSRFToken();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    base_price: 0,
    status: 'draft',
    tags: [],
  });

  const { clearDraft, hasDraft, lastSaved } = useAutosave({
    key: 'admin-product-form-draft',
    data: formData,
    onRestore: (data) => {
      setFormData(data);
      console.log('Restored draft');
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csrfToken) return;

    try {
      setSubmitting(true);
      const response = await api.post('/api/admin/products', formData, {
        csrfToken,
      });

      clearDraft();
      router.push('/admin/products');
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setSubmitting(false);
    }
  }

  if (csrfLoading) {
    return <div>Loading form...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Draft indicator */}
      {hasDraft && (
        <div className="text-sm text-green-600">
          Draft saved {lastSaved?.toLocaleTimeString()}
          <button onClick={clearDraft} className="ml-2 text-blue-600">
            Clear
          </button>
        </div>
      )}

      {/* Form fields */}
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Product name"
      />

      {/* More fields... */}

      <button type="submit" disabled={submitting || !csrfToken}>
        {submitting ? 'Creating...' : 'Create Product'}
      </button>
    </form>
  );
}
```

## Key Benefits

1. **Security**: CSRF protection prevents cross-site request forgery
2. **UX**: Autosave prevents data loss from accidental navigation
3. **Type Safety**: Full TypeScript support with proper error handling
4. **Standardization**: Consistent API error structures across all endpoints

## Next Steps

1. Apply this pattern to all admin forms (products, collections, categories)
2. Add toast notifications for better user feedback
3. Implement optimistic UI updates where appropriate
4. Add loading states and error boundaries
