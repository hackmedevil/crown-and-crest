# Admin Media Management (Cloudinary)

Scope: Admin-only media upload and management for products/variants using Cloudinary. No UI, no transformations, no SDK usage required here; this is a flow/contract spec to guide later implementation.

## 1) Upload Flow

Recommended path: Signed client upload + server verification
- Step 1: Admin requests an upload signature
  - Server action (admin-only) returns: `timestamp`, `folder`, optional `public_id` seed, and `signature` computed with `CLOUDINARY_API_SECRET`.
  - Credentials usage: `CLOUDINARY_API_SECRET` stays server-only. `cloud_name` and `api_key` can be exposed to the client.
- Step 2: Admin client uploads directly to Cloudinary
  - Uses `cloud_name`, `api_key`, `timestamp`, `signature`, and `folder`.
  - Receives `public_id`, `resource_type`, `width`, `height` in the upload response.
- Step 3: Admin posts metadata to server
  - Server action (admin-only) persists a media row (`product_media` or `variant_media`) with: `cloudinary_public_id`, `resource_type`, `width`, `height`, `aspect_ratio` (computed), `alt_text`, `is_primary?`, `position?`, `collection_id?`.
  - All DB writes happen in a transaction that enforces the single-primary rule and stable ordering.

Alternatives (when appropriate)
- Unsigned upload preset: Safer only if preset is locked down to restricted folders, formats, and moderation. Still prefer signed uploads for control.
- Server-side proxy upload: Server receives file, then uploads to Cloudinary. Simpler permissions, higher server egress and CPU; use for small files/low concurrency only.

Credentials
- Server-only: `CLOUDINARY_API_SECRET` (signing, deletion). Never expose to clients.
- Client-usable: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`.

## 2) DB Write Rules

Creating rows
- Owner choice is exclusive: either `product_media.product_id` or `variant_media.variant_id`.
- Compute `aspect_ratio = width::numeric / NULLIF(height, 0)` on the server.
- Default `position`: `COALESCE(MAX(position), -1) + 1` among existing active rows for the same owner (computed in transaction).

Single primary enforcement
- DB partial unique indexes already ensure at most one `is_primary=true` per owner.
- On insert/update with `is_primary=true`, update all sibling rows for the same owner to `is_primary=false` in the same transaction before saving the new primary.

Reordering
- Accept a full ordered list of media IDs for an owner and reassign contiguous positions 0..N within a single transaction.
- Do not leave gaps. Minimize writes (skip unchanged positions when possible).

Soft delete / deactivate
- Use `is_active=false` to hide items without dropping rows.
- Optional: Recompact positions after soft delete to maintain contiguous ordering.

## 3) Admin Actions (Signatures Only)

Auth: All actions are admin-only and must call the existing `requireAdmin()` guard.

- Create upload signature (for client direct signed upload)
```ts
export type AdminCreateUploadSignatureInput = {
  owner: { productId?: string; variantId?: string };
  folder?: string; // e.g., "products/${productId}" or "variants/${variantId}"
  publicIdSeed?: string; // optional suggested name; Cloudinary may append unique suffixes
  resourceType?: 'image' | 'video';
};
export type AdminCreateUploadSignatureOutput = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string; // HMAC-SHA1 of params using CLOUDINARY_API_SECRET
};
```

- Persist media after upload
```ts
export type AdminUploadMediaInput = {
  owner: { productId?: string; variantId?: string };
  cloudinaryPublicId: string;
  resourceType: 'image' | 'video';
  width?: number;
  height?: number;
  aspectRatio?: number; // optional; server will compute if absent
  altText?: string;
  isPrimary?: boolean; // default false
  insertAt?: number;   // optional position; default append
  collectionId?: string; // optional, for 360 sets or galleries
};
export type AdminUploadMediaOutput = {
  mediaId: string;
  ownerType: 'product' | 'variant';
  position: number;
  isPrimary: boolean;
};
```

- Set primary media
```ts
export type AdminSetPrimaryMediaInput = { mediaId: string };
export type AdminSetPrimaryMediaOutput = { ok: true };
```

- Reorder media for an owner
```ts
export type AdminReorderMediaInput = {
  owner: { productId?: string; variantId?: string };
  orderedMediaIds: string[]; // complete ordered list for that owner
};
export type AdminReorderMediaOutput = { ok: true };
```

- Toggle media active flag
```ts
export type AdminToggleMediaActiveInput = { mediaId: string; active: boolean };
export type AdminToggleMediaActiveOutput = { ok: true };
```

- Soft delete media (+ optional Cloudinary delete)
```ts
export type AdminDeleteMediaInput = { mediaId: string; deleteOnCloudinary?: boolean };
export type AdminDeleteMediaOutput = { ok: true; cloudinaryDeleted?: boolean };
```

## 4) Safety Rules

- Prevent deleting last active primary
  - If the media is the only active item for its owner, reject delete/deactivate with `LAST_ACTIVE_MEDIA_FOR_OWNER`.
  - If deleting/deactivating a primary and siblings exist, auto-promote the next-by-position item to primary within the same transaction.

- Single primary invariant
  - Any action that sets `is_primary=true` must first clear siblings’ primary flag for the owner. The DB partial unique index is a backstop.

- Reorder integrity
  - Reorders must be atomic and scoped to the owner. Reject if `orderedMediaIds` includes unknown/foreign IDs.

- Cloudinary delete failures
  - If `deleteOnCloudinary=true` and the Cloudinary delete call fails, return `ok: false` with `CLOUDINARY_DELETE_FAILED`. Do not flip `is_active` or remove the row in that case; let the admin retry.
  - Optionally allow a two-step flow: first soft-delete in DB, then attempt Cloudinary delete in background and reconcile outcomes via audit logs.

- Type and bounds validation
  - Enforce `resourceType ∈ {image, video}` and positive width/height if provided. Compute aspect ratio safely.

## 5) Error Cases & Handling (Suggested)

- `OWNER_REQUIRED` — Neither productId nor variantId provided.
- `OWNER_NOT_FOUND` — Provided owner does not exist.
- `MEDIA_NOT_FOUND` — mediaId not found or inactive when required active.
- `LAST_ACTIVE_MEDIA_FOR_OWNER` — Prevents leaving an owner without any active media.
- `PRIMARY_CONFLICT` — Attempt to create two primaries (shouldn’t happen if transaction + index are correct).
- `INVALID_POSITION` — Reorder with mismatched list size or foreign IDs.
- `CLOUDINARY_DELETE_FAILED` — Cloudinary admin API returned an error or timed out.
- `FORBIDDEN` — Admin guard failed.

All DB mutations should be transactional per owner to avoid partial state.

## 6) Notes on Security

- Admin guard: All actions call `requireAdmin()` before accessing DB or secrets.
- Secrets: Only generate signatures and perform deletions on the server using `CLOUDINARY_API_SECRET`.
- Validation: Do not trust client-provided `public_id` blindly. If using signed upload, verify upload result fields and optionally confirm existence via Cloudinary Admin API before persisting.
- Scoping: Constrain `folder` by owner (e.g., `products/:id`, `variants/:id`) to simplify lifecycle management.
- Rate limiting: Apply to signature endpoints to prevent abuse.

## 7) Notes on Performance

- Signed upload offloads bytes to Cloudinary directly from client; server handles only the small metadata write.
- Batch writes: For large reorders, use a single transaction with minimal `UPDATE` statements.
- Background deletes: Prefer async cleanup of Cloudinary assets to keep admin UI responsive; surface status in audit logs.
- Indexes already support fast owner/position queries: `(owner, position)` and partial unique for primary.

## 8) Transaction Sketches (SQL/Pseudo)

- Set primary (product owner shown; variant analogous)
```sql
BEGIN;
  UPDATE product_media SET is_primary = false
  WHERE product_id = $product_id;
  UPDATE product_media SET is_primary = true
  WHERE id = $media_id AND product_id = $product_id;
COMMIT;
```

- Append new item with default position and optional primary
```sql
BEGIN;
  SELECT COALESCE(MAX(position), -1) + 1 INTO position
  FROM product_media WHERE product_id = $product_id AND is_active = true;

  INSERT INTO product_media (product_id, cloudinary_public_id, resource_type,
                             width, height, aspect_ratio, alt_text, position, is_primary, is_active)
  VALUES ($product_id, $public_id, $rtype, $w, $h, $ar, $alt, position, $is_primary, true)
  RETURNING id INTO media_id;

  IF $is_primary THEN
    UPDATE product_media SET is_primary = false
    WHERE product_id = $product_id AND id <> media_id;
  END IF;
COMMIT;
```

- Reorder (gapless assignment)
```sql
BEGIN;
  -- Validate: ordered ids are exactly the owner’s active media ids
  -- Then assign positions sequentially
  UPDATE product_media SET position = v.new_pos
  FROM (VALUES ($id1, 0), ($id2, 1), ...) AS v(id, new_pos)
  WHERE product_media.id = v.id AND product_media.product_id = $product_id;
COMMIT;
```

## 9) Audit (Future-Ready)

- Add `media_audit_events` table to append immutable events:
  - `id`, `actor_admin_id`, `owner_type`, `owner_id`, `media_id`, `action` (upload|set_primary|reorder|toggle_active|delete_attempt|delete_confirmed|delete_failed), `payload jsonb`, `created_at`.
- Consider webhook receipts for Cloudinary delete confirmations; log success/failure for reconciliation.
- Optional: Add `created_by` / `updated_by` columns to media tables if needed; or derive from audit events.
