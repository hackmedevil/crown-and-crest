# Mobile-First Visual Testing Guide

Use this checklist to verify the mobile-first refactor on different viewports.

---

## 🔍 Quick Visual Tests

### 1. Mobile (360px - iPhone SE)

**Open Chrome DevTools → Responsive → 360 x 740**

#### Homepage
- [ ] Hero is 70vh height (not too tall)
- [ ] Hero text: "Redefining Streetwear" is **4xl** size (not 6xl)
- [ ] "Explore Collection" button is **full-width**
- [ ] Category pills scroll horizontally
- [ ] Product grid is **2 columns**
- [ ] Spacing feels tight but breathable

#### Shop (PLP)
- [ ] Header "All Products" is readable (not too large)
- [ ] Product grid is **2 columns**
- [ ] Gap between products is 16px (4 spacing units)
- [ ] "Load More" button is **full-width**

#### Product Detail Page (PDP)
- [ ] Layout is **stacked** (not 2-column):
  1. Gallery first
  2. Name/Price
  3. Sizebook badge
  4. Size selector
  5. Add to Cart button (full-width, 48px height)
- [ ] Gallery is full-width
- [ ] Size buttons are tappable (not too small)
- [ ] "Add to Cart" button is full-width and prominent

#### Cart
- [ ] Layout is **single column** (not split)
- [ ] Product cards have visible borders
- [ ] Order summary at bottom (not right sidebar)
- [ ] "Proceed to Checkout" button is full-width
- [ ] Product images are 80px wide (not huge)

---

### 2. Tablet (768px - iPad)

**Open Chrome DevTools → Responsive → 768 x 1024**

#### Homepage
- [ ] Hero height increases to 85vh
- [ ] Hero text scales up (text-6xl)
- [ ] "Explore Collection" button is **inline** (not full-width)
- [ ] Product grid is **4 columns** (not 2)
- [ ] Spacing expands nicely

#### Shop (PLP)
- [ ] Product grid is **3 columns**
- [ ] Gap between products is 24px (6 spacing units)
- [ ] "Load More" button is inline (centered)

#### Product Detail Page (PDP)
- [ ] Layout is **2-column**: Gallery left | Details right
- [ ] Gallery is sticky (scrolls independently)
- [ ] Details scroll normally
- [ ] "Add to Cart" button scales to h-14

#### Cart
- [ ] Layout is **split**: Items left | Summary right sidebar
- [ ] Product cards lose borders (table-like)
- [ ] Order summary sticky on right (380px width)
- [ ] Product images are 64px wide

---

### 3. Desktop (1280px - Standard Desktop)

**Open Chrome DevTools → Responsive → 1280 x 800**

#### Homepage
- [ ] Hero is massive and impactful
- [ ] Typography at full scale (H1: 48px)
- [ ] Spacing feels luxurious (not cramped)
- [ ] Product grid is **4 columns**
- [ ] All hover states work

#### Shop (PLP)
- [ ] Product grid is **4 columns**
- [ ] Gap is 32px (8 spacing units)
- [ ] "Load More" button inline and elegant

#### Product Detail Page (PDP)
- [ ] Gallery sticky behavior works smoothly
- [ ] When scrolling, gallery stays in view
- [ ] Details section scrolls independently
- [ ] Large images look crisp
- [ ] "Add to Cart" button prominent but not overwhelming

#### Cart
- [ ] Split layout comfortable
- [ ] Summary sidebar doesn't feel cramped
- [ ] Product table feels spacious
- [ ] Hover states responsive

---

## 📏 Tap Target Check (Mobile Only)

### Critical Interactive Elements

On **360px viewport**, verify tap targets are at least **44px**:

- [ ] "Explore Collection" button on homepage
- [ ] Category pills on homepage
- [ ] Size selector buttons on PDP
- [ ] "Add to Cart" button on PDP
- [ ] Quantity buttons on Cart
- [ ] "Remove" buttons on Cart
- [ ] "Proceed to Checkout" button

**Test Method:**
1. Open Chrome DevTools
2. Click "More tools" → "Rendering"
3. Enable "Show paint flashing rectangles"
4. Tap buttons with mouse - should feel easy to hit

---

## 🎨 Typography Scale Check

### Mobile (360px)

```
Body text:     16px (1rem)
Small text:    14px (0.875rem)
H4:            18px (1.125rem)
H3:            20px (1.25rem)
H2:            24px (1.5rem)
H1:            28px (1.75rem)
Hero:          32px (2rem)
```

### Desktop (1280px)

```
Body text:     18px (1.125rem)
Small text:    14px (0.875rem)
H4:            24px (1.5rem)
H3:            30px (1.875rem)
H2:            36px (2.25rem)
H1:            48px (3rem)
Hero:          56px (3.5rem)
```

**Visual Check:**
- [ ] Mobile text is legible (not too small)
- [ ] Desktop text scales up gracefully
- [ ] Line heights are comfortable
- [ ] Letter spacing is appropriate

---

## 🔢 Spacing Scale Check

### Mobile
```
Container padding:   16px (lg)
Section padding:     32px vertical (3xl)
Grid gap (PLP):      16px (lg)
Card gap (homepage): 16px (lg)
```

### Desktop
```
Container padding:   24px (xl)
Section padding:     64px vertical (5xl)
Grid gap (PLP):      32px (2xlDesktop)
Card gap (homepage): 32px (2xlDesktop)
```

**Visual Check:**
- [ ] Mobile doesn't feel cramped
- [ ] Desktop doesn't feel too spread out
- [ ] Consistent rhythm throughout

---

## 🌈 Color Consistency

### Brand Colors (All Viewports)

- [ ] Primary Black: `#0A0A0A` (not pure black)
- [ ] Dark Gray: `#1A1A1A`
- [ ] Neutral backgrounds: `#F5F5F5` (50)
- [ ] Text: Brand black on white backgrounds
- [ ] Buttons: Brand black background, white text
- [ ] Borders: Neutral 200 (`#E5E5E5`)

**Visual Check:**
- [ ] No arbitrary colors outside token system
- [ ] Hover states are subtle (opacity changes)
- [ ] Focus rings are visible (2px black)

---

## 📱 Modal Behavior Check

### Mobile (360px)
- [ ] Modal slides from bottom (bottom sheet)
- [ ] Rounded top corners only (`rounded-t-2xl`)
- [ ] Overlay darkens background
- [ ] Tapping overlay closes modal

### Desktop (1280px)
- [ ] Modal centered on screen
- [ ] Rounded all corners (`rounded-xl`)
- [ ] Max width respected
- [ ] Feels elegant and spacious

---

## 🎯 Component Checklist

### Button Component

**Mobile:**
- [ ] Full-width by default
- [ ] 44px height (md size)
- [ ] Easy to tap
- [ ] Loading spinner visible

**Desktop:**
- [ ] Inline (not full-width) with `md:w-auto`
- [ ] 56px height feels comfortable
- [ ] Hover states smooth

### Product Card

**Mobile:**
- [ ] Image is prominent
- [ ] Text is legible
- [ ] Quick-add button accessible
- [ ] Spacing comfortable

**Desktop:**
- [ ] Hover overlay elegant
- [ ] Image scales nicely
- [ ] Price visible on hover

---

## 🚨 Common Issues to Check

### Mobile Issues
- [ ] Text is not too small (minimum 16px body)
- [ ] Buttons are not too small (minimum 44px)
- [ ] Images load at appropriate size (not full desktop size)
- [ ] Horizontal scroll doesn't appear unexpectedly
- [ ] Modals don't cut off content
- [ ] Forms are easy to fill (input heights 44px+)

### Desktop Issues
- [ ] Text is not too large (maximum 56px hero)
- [ ] Containers don't stretch too wide (max-width: 1280px)
- [ ] Buttons are not too large (reasonable padding)
- [ ] Grid doesn't break (4 columns max)
- [ ] Gallery sticky behavior works
- [ ] Hover states are visible

---

## ✅ Final Verification

After testing all viewports:

### Functionality
- [ ] All links work
- [ ] All buttons clickable
- [ ] Forms submit correctly
- [ ] Cart updates properly
- [ ] Navigation is smooth

### Performance
- [ ] Pages load quickly
- [ ] Images optimize correctly
- [ ] No layout shift (CLS)
- [ ] Smooth scrolling
- [ ] Transitions feel snappy

### Accessibility
- [ ] Focus states visible
- [ ] Tap targets adequate
- [ ] Text contrast sufficient (WCAG AA)
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

---

## 🛠️ How to Test

### Chrome DevTools Method

1. Open Chrome → Right-click → Inspect
2. Click **Device Toolbar** icon (Cmd+Shift+M on Mac)
3. Select preset devices or enter custom dimensions:
   - Mobile: 360 x 740 (iPhone SE)
   - Tablet: 768 x 1024 (iPad)
   - Desktop: 1280 x 800

### Real Device Testing

**Recommended:**
- iPhone SE or 12/13 Mini (smallest modern iPhone)
- iPad (9th gen or Air)
- MacBook Pro 13" or larger

### Browser Testing

Test on multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Safari (WebKit)
- [ ] Firefox (Gecko)

---

**Testing Priority:**
1. **Critical:** Mobile (360-390px) - Most users
2. **Important:** Tablet (768px) - Growing segment
3. **Standard:** Desktop (1280px+) - Power users

**Time Estimate:** 20-30 minutes for complete visual check

---

**Status:** Ready for QA Testing  
**Next:** Deploy to staging environment for team review
