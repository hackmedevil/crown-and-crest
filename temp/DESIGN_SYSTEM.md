# Crown & Crest Design System
**Visual System Lock - Minimal Luxury**

## Table of Contents
1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Design Tokens](#design-tokens)
4. [Component Library](#component-library)
5. [Usage Guidelines](#usage-guidelines)
6. [Enforcement Rules](#enforcement-rules)
7. [Adding New UI](#adding-new-ui)

---

## Overview

The Crown & Crest design system enforces a **minimal luxury** aesthetic across all touch points. This system prioritizes:

- **Visual Consistency**: All UI inherits from a single source of truth
- **Premium Feel**: Restrained palette, generous spacing, refined typography
- **Scalability**: Components are reusable and composable
- **Performance**: Semantic HTML, optimized for accessibility and speed

**Non-Negotiable**: No ad-hoc styling. All visual decisions flow from design tokens.

---

## Design Principles

### 1. Minimal Luxury
- Less is more - avoid visual noise
- Quality over quantity in every design decision
- Generous whitespace communicates premium positioning
- Typography does the heavy lifting

### 2. Calm & Focused
- Soft transitions, never jarring
- Muted color palette (not loud)
- Clear visual hierarchy guides the eye
- One primary action per screen

### 3. Brand-Forward
- Black & white foundation (near-black, not pure)
- Single accent color for CTAs
- Consistent brand voice through design
- Photography > illustrations

### 4. User-Centric
- Accessibility first (WCAG AA minimum)
- Mobile-responsive by default
- Fast page loads, optimized images
- Clear feedback for all interactions

---

## Design Tokens

**Location**: `src/lib/design/tokens.ts`

All design values are centralized in design tokens. **Never use arbitrary values** - always reference tokens.

### Typography

```typescript
// Font Families
fonts.primary   // Inter (body, UI)
fonts.secondary // Georgia (optional elegant headings)

// Size Scale
sizes.hero      // 56px - Hero sections only
sizes.h1        // 48px
sizes.h2        // 36px
sizes.h3        // 30px
sizes.h4        // 24px
sizes.body      // 18px
sizes.base      // 16px
sizes.small     // 14px
sizes.tiny      // 12px

// Weights
weights.light     // 300
weights.normal    // 400
weights.medium    // 500
weights.semibold  // 600
weights.bold      // 700

// Line Heights
lineHeights.tight   // 1.2  - Headings
lineHeights.normal  // 1.6  - Body
lineHeights.relaxed // 1.75 - Long-form
```

### Colors

```typescript
// Brand
colors.brand.black      // #0A0A0A (primary)
colors.brand.darkGray   // #1A1A1A

// Neutrals (gray scale)
colors.neutral[50-900]  // 50=lightest, 900=darkest

// Accent (single, restrained)
colors.accent.primary   // Black for CTAs
colors.accent.hover     // Lighter on hover

// Status (muted, not loud)
colors.status.success       // #059669
colors.status.successBg     // #ECFDF5
colors.status.warning       // #D97706
colors.status.warningBg     // #FFFBEB
colors.status.error         // #DC2626
colors.status.errorBg       // #FEF2F2

// Sizebook (brand feature)
colors.sizebook.primary  // #7C3AED (purple)
colors.sizebook.bg       // #F5F3FF
```

### Spacing

**ONLY these values allowed** (4px base grid):

```typescript
spacing.xs    // 4px
spacing.sm    // 8px
spacing.md    // 12px
spacing.lg    // 16px
spacing.xl    // 24px
spacing.2xl   // 32px
spacing.3xl   // 48px
spacing.4xl   // 64px
spacing.5xl   // 96px
spacing.6xl   // 128px
```

### Surfaces

```typescript
// Border Radius
surfaces.radius.sm   // 6px
surfaces.radius.md   // 12px (default cards)
surfaces.radius.lg   // 16px
surfaces.radius.xl   // 24px

// Shadows (subtle elevation)
surfaces.shadows.sm  // Minimal depth
surfaces.shadows.md  // Default cards
surfaces.shadows.lg  // Modals, elevated elements

// Borders
surfaces.borders.width  // 1px
surfaces.borders.color  // neutral-200
```

### Transitions

```typescript
transitions.duration.fast  // 150ms
transitions.duration.base  // 200ms (default)
transitions.duration.slow  // 300ms
```

---

## Component Library

**Location**: `src/components/ui/`

All UI components follow canonical patterns. **Never create custom variants** - extend the library if needed.

### Button

```tsx
import { Button } from '@/components/ui'

// Variants
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="ghost">Tertiary Action</Button>
<Button variant="danger">Delete Action</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// Props
<Button fullWidth>Full Width</Button>
<Button loading>Processing...</Button>
<Button disabled>Disabled</Button>
```

**Rules**:
- One primary button per screen
- Use secondary for less important actions
- Ghost for tertiary actions only
- Danger requires confirmation

### Card

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui'

// Basic Card
<Card padding="md">
  <CardHeader title="Card Title" description="Optional description" />
  <CardContent>{/* Content */}</CardContent>
  <CardFooter>{/* Actions */}</CardFooter>
</Card>

// Product Card
<Card variant="product" hover>
  {/* Product content */}
</Card>

// Admin Card
<Card variant="admin" padding="lg">
  {/* Admin content */}
</Card>
```

**Rules**:
- Always use rounded-xl (12px)
- Border: neutral-200 (1px)
- Padding: sm (4), md (6), lg (8)

### Input Components

```tsx
import { Input, Textarea, Select } from '@/components/ui'

// Input
<Input
  label="Email"
  placeholder="you@example.com"
  error="Invalid email"
  required
/>

// Textarea
<Textarea
  label="Message"
  rows={4}
  helperText="Optional helper text"
/>

// Select
<Select
  label="Country"
  options={[
    { value: 'in', label: 'India' },
    { value: 'us', label: 'United States' },
  ]}
/>
```

**Rules**:
- Height: 44px (11 Tailwind units)
- Padding: 12px 16px
- Border: neutral-200, focus: brand-black (2px ring)
- Error state: status-error color

### Badge

```tsx
import { Badge, StatusBadge, StockBadge } from '@/components/ui'

// Generic Badge
<Badge variant="default">New</Badge>
<Badge variant="sizebook">Sizebook Available</Badge>
<Badge variant="success">Success</Badge>

// Status Badge (Admin)
<StatusBadge status="PAID" />
<StatusBadge status="SHIPPED" />

// Stock Badge
<StockBadge stock={50} />
<StockBadge stock={5} threshold={10} /> // Low stock warning
```

**Rules**:
- Small text (14px)
- Rounded-full
- Muted backgrounds (not loud)
- Use semantic variants

### Table (Admin)

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Product Name</TableCell>
      <TableCell><StatusBadge status="PUBLISHED" /></TableCell>
    </TableRow>
    <TableEmpty message="No data" />
  </TableBody>
</Table>
```

**Rules**:
- Padding: 24px (6 Tailwind units)
- Hover: bg-neutral-50
- Border: neutral-200
- Rounded container

### Modal

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui'

<Modal isOpen={isOpen} onClose={onClose} size="md">
  <ModalHeader title="Modal Title" onClose={onClose} />
  <ModalBody>
    {/* Modal content */}
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </ModalFooter>
</Modal>
```

**Rules**:
- Backdrop: black/50 with blur
- Max-height: 90vh
- Close on Escape key
- Lock body scroll when open

---

## Usage Guidelines

### Layout Patterns

#### Container
```tsx
<div className="container">
  {/* Max-width: 1280px, padding: 24px */}
</div>
```

#### Section
```tsx
<section className="section">
  {/* Vertical padding: 96px desktop, 48px mobile */}
</section>
```

#### Grid (PLP)
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
  {/* Responsive product grid */}
</div>
```

### Typography Hierarchy

```tsx
// Hero (Homepage only)
<h1 className="text-6xl font-semibold text-brand-black">
  Hero Headline
</h1>

// Page Title
<h1 className="text-5xl font-semibold text-brand-black">
  Page Title
</h1>

// Section Title
<h2 className="text-4xl font-semibold text-brand-black">
  Section Title
</h2>

// Card Title
<h3 className="text-xl font-semibold text-brand-black">
  Card Title
</h3>

// Body Text
<p className="text-lg text-neutral-600">
  Body paragraph text
</p>

// Muted Text
<p className="text-sm text-neutral-500">
  Secondary information
</p>
```

### Color Usage

**Primary Text**: `text-brand-black` (#0A0A0A)  
**Secondary Text**: `text-neutral-600`  
**Muted Text**: `text-neutral-500`  
**Borders**: `border-neutral-200`  
**Backgrounds**: `bg-white` or `bg-neutral-50`

### Spacing Patterns

```tsx
// Section Spacing
<section className="py-24">  {/* 96px */}

// Card Padding
<div className="p-6">  {/* 24px */}

// Stack (Vertical)
<div className="space-y-4">  {/* 16px gap */}

// Grid Gap
<div className="gap-6 md:gap-8">  {/* 24px/32px */}
```

---

## Enforcement Rules

### ❌ NEVER DO THIS

```tsx
// ❌ Arbitrary spacing
<div className="p-[13px] mt-[25px]">

// ❌ Inline styles
<div style={{ padding: '20px' }}>

// ❌ Random colors
<div className="bg-blue-500 text-red-600">

// ❌ Custom font sizes
<h1 className="text-[42px]">

// ❌ Per-page components
// src/app/shop/components/CustomButton.tsx

// ❌ Multiple shadows
<div className="shadow-2xl drop-shadow-lg">
```

### ✅ ALWAYS DO THIS

```tsx
// ✅ Token-based spacing
<div className="p-6 mt-8">

// ✅ Utility classes only
<div className="bg-neutral-50 text-brand-black">

// ✅ Design token colors
<div className="bg-brand-black text-white">

// ✅ Typography scale
<h1 className="text-5xl font-semibold">

// ✅ Canonical components
import { Button } from '@/components/ui'

// ✅ Single subtle shadow
<div className="shadow-md">
```

---

## Adding New UI

### Process

1. **Check if component exists**
   - Review `src/components/ui/`
   - Can you use existing component?

2. **Extend canonical component**
   ```tsx
   // ✅ Extend Button
   <Button className="custom-class" {...props} />
   
   // ❌ Create new button variant
   ```

3. **Use design tokens**
   ```tsx
   import { tokens } from '@/lib/design/tokens'
   
   // Use tokens in custom logic
   const padding = tokens.spacing.xl
   ```

4. **Follow naming conventions**
   - Components: PascalCase (`ProductCard`)
   - Files: PascalCase (`ProductCard.tsx`)
   - Utilities: camelCase (`buildUrl`)

5. **Document if reusable**
   - Add to component library
   - Update this guide
   - Add TypeScript types

### Component Checklist

Before creating a new component:

- [ ] Does it follow design tokens?
- [ ] Is it reusable across pages?
- [ ] Does it have proper TypeScript types?
- [ ] Is it accessible (WCAG AA)?
- [ ] Does it handle loading/error states?
- [ ] Is it mobile-responsive?
- [ ] Does it follow naming conventions?

### Example: Creating a New Component

```tsx
// src/components/ui/NewComponent.tsx
import { tokens } from '@/lib/design/tokens'
import { HTMLAttributes } from 'react'

interface NewComponentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'featured'
  size?: 'sm' | 'md' | 'lg'
}

export function NewComponent({
  variant = 'default',
  size = 'md',
  className = '',
  children,
  ...props
}: NewComponentProps) {
  const baseStyles = 'bg-white border border-neutral-200 rounded-xl'
  
  const variantStyles = {
    default: 'text-brand-black',
    featured: 'bg-neutral-50',
  }
  
  const sizeStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  )
}
```

---

## Quick Reference

### Color Classes
```
bg-brand-black         text-brand-black
bg-neutral-50          text-neutral-600
bg-white               text-neutral-500
border-neutral-200     text-status-success
```

### Spacing Classes
```
p-4 (16px)    gap-4 (16px)
p-6 (24px)    gap-6 (24px)
p-8 (32px)    gap-8 (32px)
py-24 (96px)  space-y-4 (16px)
```

### Typography Classes
```
text-6xl (60px)   font-semibold (600)
text-5xl (48px)   font-medium (500)
text-4xl (36px)   font-normal (400)
text-xl (20px)    font-light (300)
text-lg (18px)
text-base (16px)
text-sm (14px)
```

### Border & Shadow
```
rounded-lg (8px)    shadow-sm
rounded-xl (12px)   shadow-md
rounded-full        shadow-lg
border              hover:-translate-y-1
```

---

## Support

**Questions?** Review this guide first.

**Need a new component?** Check if you can extend existing ones.

**Breaking the rules?** There should be a compelling reason. Document it.

**Design system updates**: All changes must go through design review.

---

**Last Updated**: December 18, 2025  
**Version**: 1.0.0  
**Status**: ✅ Locked & Enforced
