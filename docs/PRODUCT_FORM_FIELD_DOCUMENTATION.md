# Product Form Field Documentation

This document describes every field and tab used by the admin Product form (`ProductFormV2`) and explains what each field does, where it is used, and how it is saved.

## 1. Product Form Overview

Primary component:
- `src/components/admin/products/ProductFormV2.tsx`

Tabs in the form:
1. Basic Info
2. Media
3. Variants
4. SEO
5. AI Assistant

Create flow:
- New product page uses `ProductFormV2` with no `productId`.
- On save, it calls `POST /api/admin/products`.

Edit flow:
- Edit product page loads existing product data and passes it to `ProductFormV2`.
- On save, it calls `PATCH /api/admin/products/:productId`.

Important tab behavior:
- `Media` tab and `Variants` tab require `productId` (product must be created first).
- If product is not saved yet, those tabs show a "Save product first" message.

## 2. Save Payload Behavior (Important)

When `ProductFormV2` saves, it builds a payload manually.

Notable mappings:
- `brand_id` (form) -> `brand` (payload key)
- `meta_keywords` (form) -> `seo_keywords` (payload key)

Normalization during save:
- Empty optional text is converted to `null`.
- Optional numbers are converted to `null` when invalid/empty.
- `country_of_origin` is uppercased.
- Arrays (`collection_ids`, `tags`, `meta_keywords`) are normalized to clean string arrays.

## 3. Basic Info Tab Fields

Source:
- `src/components/admin/products/tabs/BasicInfoTab.tsx`

### 3.1 Core Product Info

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `name` | Product Name | string | Yes | Main product title shown across storefront/admin. |
| `slug` | URL Slug | string | Yes | Product URL path part (example: `/product/<slug>`). Auto-generated from name, editable. |
| `description` | Description | rich text/html string | Yes | Full product description. Used on PDP and AI context. |
| `short_description` | Short Description | string | No | Short summary for cards/listings and compact contexts. |

### 3.2 Pricing Engine

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `base_price` | Base Price | number | Yes | Base product price used for internal pricing logic. |
| `cost_price` | Cost Price | number \| null | No | Internal cost tracking. |
| `mrp` | MRP | number \| null | No | List/strike-through reference price for discount display. |
| `discount_engine_enabled` | Enable discount engine | boolean | No | Enables discount configuration logic for the product. |
| `discount_type` | Discount Type | enum(`percentage`,`fixed`) | No | Controls interpretation of `discount_value`. |
| `discount_value` | Discount Value | number \| null | No | Discount amount or percentage based on `discount_type`. |
| `selling_price` | Selling Price | number \| null | No | Explicit final sell price override if applicable. |

Pricing notes from UI:
- Base and cost prices are treated as internal/admin values.
- Discount visual behavior is intended around MRP presentation.

### 3.3 Shipping Charge

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `shipping_charge` | Shipping Charge | number | No (defaults to 0) | Shipping fee amount tied to this product. |
| `shipping_included_in_price` | Include shipping charge in selling price | boolean | No | Indicates whether shipping is absorbed into sell price. |

### 3.4 Product Attributes

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `fabric` | Fabric | string \| null | No | Material/fabric info (example: cotton). |
| `gsm` | GSM | number \| null | No | Fabric density (grams per square meter). |
| `fit_type` | Fit Type | string \| null | No | Product fit style (slim, regular, oversized, etc). |
| `print_type` | Print/Decoration Type | string \| null | No | Print/embroidery/decoration method. |

### 3.5 Organization / Catalog Linking

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `brand_id` | Brand | string \| null | No | Links product to selected brand. Saved as `brand` in payload. |
| `category_id` | Category | string \| null | No | Links product to a category. |
| `size_chart_id` | Size Chart | string \| null | No | Assigns size chart for sizing assistance. |
| `wash_instruction_id` | Wash Instruction | string \| null | No | Assigns wash/care instruction profile. |
| `collection_ids` | Collections | string[] | No | Multi-select merchandising collections. |

### 3.6 SKU and Status

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `sku` | SKU | string | No | UI has manual + generate SKU control. |
| `status` | Status | enum(`draft`,`active`,`archived`) | No (defaults to `draft`) | Publication lifecycle state. |

Important note about `sku`:
- The field is shown in Basic tab.
- In current `ProductFormV2` save payload, top-level `sku` is not included.
- Variant-level SKU is actively used in Variants tab (see section 5).

### 3.7 Search & Discovery

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `is_searchable` | Make this product searchable | boolean | No | Controls search visibility intent for product. |
| `tags` | Tags | string[] | No | Discovery/merchandising tags. |

### 3.8 Logistics

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `hs_code` | HS Code | string \| null | No | Harmonized code for customs/logistics documentation. |
| `country_of_origin` | Country of Origin | string \| null | No | 2-letter country code (normalized uppercase). |

## 4. Media Tab (Images)

Source:
- `src/components/admin/products/tabs/MediaTab.tsx`

This tab is not a simple text field tab; it is media operations for product images.

### 4.1 Image Operations

- Upload local files (`image/*`, max 5MB each)
- Drag and drop image upload
- Add image from media library dialog
- Set image as primary
- Delete image

### 4.2 Media Data Model (used in tab)

| Field/Property | Meaning |
|---|---|
| `cloudinary_public_id` | Cloudinary asset identifier |
| `cloudinary_url` | Full image URL used for display |
| `display_order` | Ordering index |
| `alt_text` | Optional image alt text |
| `is_primary` | Marks primary product image |

Related endpoints called by tab:
- `GET/POST/PATCH/DELETE /api/admin/products/:productId/images`
- `POST /api/admin/upload`

## 5. Variants Tab

Source:
- `src/components/admin/products/tabs/VariantsTab.tsx`

This tab manages variant generation and editing (color/size based).

### 5.1 Variant Settings

| Field Key | UI Label | Type | What It Does |
|---|---|---|---|
| `enable_variant_image_switching` | Enable Variant Image Switching | boolean | Controls whether storefront gallery switches images by selected variant. |

### 5.2 Profile-Based Variant Builder Inputs

| Field Key | UI Label | Type | What It Does |
|---|---|---|---|
| `selectedColorProfileId` | Color Profile | string | Selects available colors source. |
| `selectedSizeProfileId` | Size Profile | string | Selects available sizes source. |
| `selectedColors` | Available Colors selection | string[] | Colors chosen for combination generation. |
| `selectedSizes` | Available Sizes selection | string[] | Sizes chosen for combination generation. |
| `defaultStock` | Default Stock | number | Default stock for generated variants. |
| `defaultPriceAdjustment` | Default Price Adjustment | number | Default adjustment added to base price per variant. |
| `defaultEnabled` | Default Active | boolean | Default active flag for generated variants. |

### 5.3 Generated/Manual Variant Fields

| Field Key | Meaning |
|---|---|
| `sku` | Variant SKU |
| `stock_quantity` | Inventory quantity |
| `price_override` / `price_adjustment` | Price delta per variant |
| `enabled` | Active/inactive variant flag |
| `attributes.Color` | Variant color attribute |
| `attributes.Size` | Variant size attribute |
| `images` | Variant images (managed as color-group shared images) |

### 5.4 Color Group Behavior

- Variants are grouped by color in UI.
- All sizes under a color group can share the same image set.
- Editing group images updates images for all variants in that group.

## 6. SEO Tab Fields

Source:
- `src/components/admin/products/tabs/SEOTab.tsx`

| Field Key | UI Label | Type | Required | What It Does |
|---|---|---|---|---|
| `meta_title` | Meta Title | string \| null | No | SEO title for search result display. |
| `meta_description` | Meta Description | string \| null | No | SEO snippet text for search results. |
| `meta_keywords` | Meta Keywords | string[] | No | Keyword list for SEO strategy and internal usage. |

SEO tab includes live search preview and character guidance:
- Title recommendation: 30-60 chars
- Description recommendation: 120-160 chars

## 7. AI Assistant Tab (Generation Actions)

Source:
- `src/components/admin/products/tabs/AIAssistantTab.tsx`

This tab triggers generation and writes into existing form fields.

### 7.1 AI Inputs used

| Input Source Field | Used For |
|---|---|
| `name` | Required context for all generation |
| `category_id` | Sent as category context |
| `description` | Extra context for generation requests |

### 7.2 AI Actions and Outputs

| Action | Updates Fields |
|---|---|
| Generate Description | `description` |
| Generate Meta Title | `meta_title` |
| Generate Meta Description | `meta_description` |
| Generate Keywords | `meta_keywords`, and also updates `tags` (first 5) |

Endpoint used:
- `POST /api/admin/products/ai-assistant`

## 8. Validation and Constraints (Form-Level)

Product form zod schema is defined locally in:
- `src/components/admin/products/ProductFormV2.tsx`

Key constraints:
- `name`, `slug`, `description` are required.
- Prices are numeric and must be non-negative in the form schema.
- `status` must be one of `draft | active | archived`.
- `country_of_origin` is exactly 2 characters (nullable).
- `meta_title` max 255, `meta_description` max 500.

## 9. Practical Field Usage by Tab (Quick Summary)

- Basic Info: core product identity, pricing engine, shipping, attributes, org linking, discoverability, logistics.
- Media: image upload/selection, primary image control, image library integration.
- Variants: color-size variant generation/editing, stock and SKU management, variant image behavior.
- SEO: search metadata and keyword curation.
- AI Assistant: auto-generates description and SEO content, then writes it into form fields.

## 10. Notes and Caveats

1. Media and Variants are product-id dependent.
- You must create/save product first.

2. Field mapping differences.
- `brand_id` in form becomes `brand` in save payload.
- `meta_keywords` in form becomes `seo_keywords` in payload.

3. Basic tab `sku` vs variant `sku`.
- Basic tab has a SKU input and generator.
- Current `ProductFormV2` save payload does not include a top-level `sku` key.
- Variant SKU in Variants tab is actively persisted and used.

4. Country code normalization.
- `country_of_origin` is normalized to uppercase on save.

---

If needed, this can be extended with an API contract table (`request key`, `db column`, `endpoint`) for each field.
