# Cloudinary Media Data Model (Products & Variants)

This document defines Cloudinary-backed media tables and usage for both admin and storefront. It assumes products and variants are already modeled; no UI or upload logic is included.

## Tables & Relationships

- product_media
  - Owner: product (FK `product_id`)
  - Fields: cloudinary_public_id, resource_type (image|video), width, height, aspect_ratio, alt_text, position, is_primary, is_active
  - Constraints: one primary per product (partial unique index), position >= 0
  - Indexes: `(product_id, position)`, `cloudinary_public_id`

- variant_media
  - Owner: variant (FK `variant_id`)
  - Fields: same as product_media
  - Constraints: one primary per variant (partial unique index)
  - Indexes: `(variant_id, position)`, `cloudinary_public_id`

- media_collections (optional)
  - Purpose: grouping sets like 360 spins or curated video/image sets
  - Owner XOR: product OR variant
  - Fields: collection_type (gallery|spin360|video_set), label
  - `collection_id` on media rows links items into a set

See SQL in supabase/migrations/20251216_cloudinary_media.sql.

## Ownership Rules

- Product soft-deleted
  - Do not delete media rows. Admin retains full visibility.
  - Storefront must exclude media for soft-deleted products by joining through products.

- Variant disabled
  - Do not delete media rows. Storefront must not render variant_media for disabled variants.
  - Fallback to product_media when a selected variant is disabled or lacks media.

- Primary image
  - Enforced as a single `is_primary=true` row per owner (product/variant) via partial unique indexes.

## Storefront Usage Rules

- LCP primary
  - Prefer variant primary if a valid, enabled variant is selected; else product primary.
  - Query pattern (conceptual):
    - Variant path: `SELECT * FROM variant_media WHERE variant_id = $vid AND is_primary = true AND is_active = true`.
    - Fallback: `SELECT * FROM product_media WHERE product_id = $pid AND is_primary = true AND is_active = true`.

- Hover image
  - Pick the next-by-position after the primary among `is_active=true` items.
  - If variant has none, use product-level sequence.

- Gallery images
  - All `is_active=true` ordered by `position ASC`, excluding the primary when you need non-duplicate thumbnails.

- Responsive sizing
  - Use stored `width`, `height`, and `aspect_ratio` to compute `sizes/srcset` and placeholders.
  - Build Cloudinary URLs from `cloudinary_public_id` and `resource_type` (no transformations in this phase).

## Admin Usage Rules

- Editing
  - Admin can reorder (`position`), set one `is_primary`, toggle `is_active`, and edit `alt_text`.
  - Admin can attach items to optional `media_collections` for 360 sets or curated sequences.

- Safety
  - Keep at most one primary per owner (DB enforces via partial unique index).
  - Prefer keeping media rows when products are soft-deleted or variants disabled; do not hard-delete.

## Performance Notes

- LCP strategy
  - Server-render the primary image URL first (variant-primary preferred); ensure width/height known to avoid layout shifts.

- Hover image
  - Preload or lazy-load the next-by-position image for quick transition on hover-capable devices.

- Gallery
  - Paginate or lazy-load if large. Order by `position` for deterministic rendering.

- Mobile vs Desktop
  - Use aspect ratio to generate appropriate `sizes` (e.g., 100vw on mobile, constrained grid widths on desktop).
  - Provide smaller defaults on mobile to reduce transfer size.

## Future-Ready Support

- Video
  - Supported via `resource_type = 'video'`; store a poster frame as an image row if needed.

- Zoom / High-res
  - Store original high-res with Cloudinary; front-end can request higher DPR/zoom variants later.

- 360 Sets
  - Use `media_collections` with `collection_type = 'spin360'` and attach ordered frames by `position`.
  - Front-end viewer can iterate the collection for interactive spins.
