# 📘 HOMEPAGE CONFIGURATION – FULL KEY REFERENCE

Authoritative, complete reference for ALL configuration keys used by the Homepage system in Crown & Crest.
For developer + admin use. Safe for production. Build validation/UI on top of it.

No guesswork. No placeholders. No breaking keys.

---

## Applies To

- `homepage_sections.config` (JSONB)
- Used by: `HeroSection`, `BannerSection`, `CategoryGridSection`, `ProductGridSection`, `ProductSliderSection`

---

## 🔹 GLOBAL (ALL SECTION TYPES)

These keys are safe to use in ANY section.

| Key             | Type                          | Description                         |
| --------------- | ----------------------------- | ----------------------------------- |
| `title`         | string                        | Section heading shown above content |
| `subtitle`      | string                        | Optional smaller text under title   |
| `isCentered`    | boolean                       | Center-align text                   |
| `maxWidth`      | `"full" | "container"`       | Content width (default: container)  |
| `background`    | `"none" | "light" | "dark"` | Section background style            |
| `padding`       | `"sm" | "md" | "lg"`        | Vertical spacing                    |
| `mobilePadding` | `"sm" | "md"`                | Override padding for mobile         |

### Example

```json
{
  "title": "Featured",
  "subtitle": "Hand-picked for you",
  "isCentered": true,
  "maxWidth": "container",
  "padding": "lg"
}
```

---

## 🟣 HERO SECTION (`type = "hero"`)

Used for the top of the homepage.

### Keys

| Key             | Type                       | Description             |
| --------------- | -------------------------- | ----------------------- |
| `heading`       | string                     | Main headline           |
| `subheading`    | string                     | Supporting text         |
| `ctaText`       | string                     | Button label            |
| `ctaLink`       | string                     | Button URL              |
| `imageUrl`      | string                     | Hero image (Cloudinary) |
| `imagePosition` | `"left" | "right"`        | Image alignment         |
| `overlay`       | boolean                    | Dark overlay on image   |
| `textAlign`     | `"left" | "center"`       | Text alignment          |
| `minHeight`     | `"screen" | "lg" | "md"` | Hero height             |

### Example

```json
{
  "heading": "New Arrivals",
  "subheading": "Designed for modern elegance",
  "ctaText": "Shop Now",
  "ctaLink": "/shop",
  "imagePosition": "right",
  "overlay": true,
  "minHeight": "screen"
}
```

---

## 🟠 BANNER SECTION (`type = "banner"`)

Promotional strip or announcement.

### Keys

| Key           | Type                           | Description              |
| ------------- | ------------------------------ | ------------------------ |
| `text`        | string                         | Banner message           |
| `ctaText`     | string                         | Optional button text     |
| `ctaLink`     | string                         | Optional link            |
| `icon`        | string                         | Icon name (future-ready) |
| `dismissible` | boolean                        | Allow close button       |
| `tone`        | `"info" | "promo" | "alert"` | Visual style             |

### Example

```json
{
  "text": "Free shipping on orders above ₹1999",
  "ctaText": "View Offers",
  "ctaLink": "/offers",
  "tone": "promo"
}
```

---

## 🔵 CATEGORY GRID SECTION (`type = "category_grid"`)

Displays categories with images.

### Keys

| Key             | Type                         | Description           |
| --------------- | ---------------------------- | --------------------- |
| `columns`       | number                       | Desktop columns (2–4) |
| `mobileColumns` | number                       | Mobile columns (1–2)  |
| `aspectRatio`   | `"1/1" | "3/4"`             | Image ratio           |
| `showTitle`     | boolean                      | Show category name    |
| `hoverEffect`   | `"zoom" | "lift" | "none"` | Hover animation       |
| `gap`           | `"sm" | "md" | "lg"`       | Grid spacing          |

### Example

```json
{
  "columns": 4,
  "mobileColumns": 2,
  "aspectRatio": "1/1",
  "showTitle": true,
  "hoverEffect": "zoom"
}
```

---

## 🟢 PRODUCT GRID SECTION (`type = "product_grid"`)

Static grid of products from a collection.

### Keys

| Key             | Type                 | Description          |
| --------------- | -------------------- | -------------------- |
| `columns`       | number               | Desktop columns      |
| `mobileColumns` | number               | Mobile columns       |
| `showPrice`     | boolean              | Display price        |
| `showRating`    | boolean              | Display ratings      |
| `showAddToCart` | boolean              | Show CTA             |
| `cardStyle`     | `"clean" | "boxed"` | Card design          |
| `limit`         | number               | Max products to show |

### Example

```json
{
  "title": "Best Sellers",
  "columns": 4,
  "mobileColumns": 2,
  "showPrice": true,
  "showAddToCart": true,
  "limit": 8
}
```

---

## 🟡 PRODUCT SLIDER SECTION (`type = "product_slider"`)

Horizontal scrolling product row.

### Keys

| Key            | Type                   | Description            |
| -------------- | ---------------------- | ---------------------- |
| `itemsPerView` | number                 | Desktop visible items  |
| `mobileItems`  | number                 | Mobile visible items   |
| `autoScroll`   | boolean                | Auto sliding           |
| `interval`     | number                 | Auto-scroll speed (ms) |
| `showArrows`   | boolean                | Prev/Next arrows       |
| `showDots`     | boolean                | Pagination dots        |
| `cardSize`     | `"sm" | "md" | "lg"` | Card size              |

### Example

```json
{
  "title": "Trending Now",
  "itemsPerView": 4,
  "mobileItems": 1.2,
  "showArrows": true,
  "autoScroll": false
}
```

---

## 🧠 SAFE DEFAULT (NEVER BREAKS)

```json
{}
```

---

## 🚫 KEYS THAT DO NOT EXIST (DO NOT USE)

- `layoutStyle`
- `animationType`
- `themeColor`
- `fontSize`

(We intentionally keep styling in components, not JSON.)

---

## 🧩 WHY THIS SYSTEM IS SEO + CONVERSION FRIENDLY

- Server-rendered (no JS dependency)
- Semantic headings per section
- Collection-driven (reusable content)
- Admin-controlled (no deploy to change homepage)
- Mobile-first defaults
- JSON is optional, not mandatory

---

## NEXT STEPS

1. Add admin-side JSON validation UI
2. Add live preview in admin
3. Add drag & drop reordering
4. Add A/B testing support
5. Lock config schema with Zod
