# Crown & Crest Design System

## Visual Foundation

Mobile-first, premium e-commerce experience inspired by Lumière with Crown & Crest's monochrome aesthetic.

## Color Palette

### Primary Brand Colors

- **Black** (`#111111`): Primary CTA buttons, headings, icons
- **White** (`#FFFFFF`): Backgrounds, inverted text
- **Copper** (`#d19672`): Accent color (minimal use - badges, highlights)

### Neutral Grays

- `neutral-50`: `#FAFAFA` - Card backgrounds
- `neutral-100`: `#F5F5F5` - Subtle surfaces
- `neutral-200`: `#E5E5E5` - Borders, dividers
- `neutral-600`: `#6B7280` - Secondary text
- `neutral-900`: `#171717` - Dark text alternative

### Status Colors

- **Success**: `#059669` - Delivery badges, stock indicators
- **Error**: `#d32f2f` - Out of stock, validation errors
- **Warning**: `#D97706` - Low stock alerts
- **Info**: `#2563EB` - Informational badges

---

## Typography

### Font Family

- **Primary**: `Inter` - All text
- **System Fallback**: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Type Scale (Mobile → Desktop)

- **H1**: `1.75rem → 3rem` (28px → 48px)
- **H2**: `1.5rem → 2.25rem` (24px → 36px)
- **H3**: `1.25rem → 1.875rem` (20px → 30px)
- **Body**: `1rem → 1.125rem` (16px → 18px)
- **Small**: `0.875rem` (14px)

### Font Weights

- Light: `300`
- Regular: `400`
- Medium: `500`
- Semibold: `600`
- Bold: `700`

---

## Spacing

Using `rem` units (1rem = 16px):

- `xs`: `0.25rem` (4px)
- `sm`: `0.5rem` (8px)
- `md`: `0.75rem` (12px)
- `lg`: `1rem` (16px)
- `xl`: `1.5rem` (24px)
- `2xl`: `2rem` (32px)
- `3xl`: `3rem` (48px)
- `4xl`: `4rem` (64px)

---

## Border Radius

- **sm**: `0.375rem` (6px) - Buttons, tags
- **md**: `0.75rem` (12px) - Input fields
- **lg**: `1rem` (16px) - Cards
- **xl**: `1.5rem` (24px) - Feature sections
- **full**: `9999px` - Pills, badges

---

## Shadows

Soft, diffused shadows:

- **sm**: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- **base**: `0 1px 3px 0 rgb(0 0 0 / 0.1)`
- **md**: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- **card**: `0 4px 20px -2px rgba(0, 0, 0, 0.05)` _(custom)_

---

## Transitions

- **Fast**: `120ms` - Hover states, small UI changes
- **Base**: `200ms` - Default animations
- **Slow**: `300ms` - Page transitions, modals

---

## Component Patterns

### Product Cards

- Aspect ratio: `3:4`
- Hover effect: Scale up slightly + shadow
- Quick action: Circular add-to-cart button

### Buttons

- **Primary**: Black background, white text
- **Secondary**: White background, black border, black text
- **Ghost**: Transparent, black text, hover underline

### Badges

- Rounded corners (`sm`)
- Uppercase text (`tracking-wider`)
- Small font size (`0.75rem`)

### Input Fields

- Border: `neutral-200`
- Focus: 1px ring in black
- Padding: `0.75rem` vertical, `1rem` horizontal

---

## Mobile-First Breakpoints

- `sm`: `640px` - Large phones
- `md`: `768px` - Tablets
- `lg`: `1024px` - Laptops
- `xl`: `1280px` - Desktops
- `2xl`: `1536px` - Large screens
