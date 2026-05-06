/**
 * Crown & Crest Design Tokens
 * Single source of truth for all visual design values
 * 
 * RULES:
 * - Never use arbitrary values in components
 * - Always reference tokens from this file
 * - No inline style exceptions
 */

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fonts: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    secondary: 'Georgia, "Times New Roman", serif',
  },
  
  // MOBILE-FIRST Typography Scale
  sizes: {
    // Mobile base sizes
    hero: '2rem',        // 32px mobile
    h1: '1.75rem',       // 28px mobile
    h2: '1.5rem',        // 24px mobile
    h3: '1.25rem',       // 20px mobile
    h4: '1.125rem',      // 18px mobile
    body: '1rem',        // 16px mobile
    base: '0.938rem',    // 15px mobile
    small: '0.875rem',   // 14px
    tiny: '0.75rem',     // 12px
    
    // Desktop sizes (use with md: lg: breakpoints)
    heroDesktop: '3.5rem',   // 56px desktop
    h1Desktop: '3rem',       // 48px desktop
    h2Desktop: '2.25rem',    // 36px desktop
    h3Desktop: '1.875rem',   // 30px desktop
    h4Desktop: '1.5rem',     // 24px desktop
    bodyDesktop: '1.125rem', // 18px desktop
  },
  
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeights: {
    tight: '1.2',
    snug: '1.4',
    normal: '1.6',
    relaxed: '1.75',
    loose: '2',
  },
  
  letterSpacing: {
    tighter: '-0.02em',
    tight: '-0.01em',
    normal: '0',
    wide: '0.01em',
    wider: '0.05em',
  },
} as const

// ============================================
// COLORS
// ============================================

export const colors = {
  // Brand
  brand: {
    black: '#0A0A0A',        // Near-black (not pure black)
    darkGray: '#1A1A1A',
  },
  
  // Neutrals
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Accent (single, restrained)
  accent: {
    primary: '#0A0A0A',      // Black for primary CTA
    hover: '#262626',
  },
  
  // Status (muted, not loud)
  status: {
    success: '#059669',      // Muted green
    successBg: '#ECFDF5',
    warning: '#D97706',      // Muted amber
    warningBg: '#FFFBEB',
    error: '#DC2626',        // Muted red
    errorBg: '#FEF2F2',
    info: '#2563EB',         // Muted blue
    infoBg: '#EFF6FF',
  },
  
  // Special
  sizebook: {
    primary: '#7C3AED',      // Purple for Sizebook badge
    bg: '#F5F3FF',
  },
} as const

// ============================================
// SPACING (MOBILE-FIRST)
// ============================================

export const spacing = {
  // Mobile base (tighter but breathable)
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '0.75rem',    // 12px
  lg: '1rem',       // 16px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '2rem',    // 32px
  '4xl': '3rem',    // 48px
  '5xl': '4rem',    // 64px
  '6xl': '6rem',    // 96px
  
  // Desktop enhancement (use with md: lg: breakpoints)
  xlDesktop: '1.5rem',   // 24px
  '2xlDesktop': '2rem',  // 32px
  '3xlDesktop': '3rem',  // 48px
  '4xlDesktop': '4rem',  // 64px
  '5xlDesktop': '6rem',  // 96px
} as const

// ============================================
// SURFACES
// ============================================

export const surfaces = {
  radius: {
    none: '0',
    sm: '0.375rem',   // 6px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.5rem',     // 24px
    full: '9999px',
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },
  
  borders: {
    width: '1px',
    color: colors.neutral[200],
    radius: '0.75rem', // Default card radius
  },
} as const

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
  },
  
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const

// ============================================
// COMPONENT TOKENS
// ============================================

export const components = {
  button: {
    // Mobile: full-width, large tap targets
    height: {
      sm: '2.5rem',    // 40px mobile
      md: '2.75rem',   // 44px mobile (min tap target)
      lg: '3.5rem',    // 56px
    },
    padding: {
      sm: `${spacing.sm} ${spacing.lg}`,
      md: `${spacing.md} ${spacing.xl}`,
      lg: `${spacing.lg} ${spacing['2xl']}`,
    },
  },
  
  card: {
    // Mobile: tighter padding
    padding: {
      sm: spacing.lg,      // 16px mobile
      md: spacing.xl,      // 20px mobile
      lg: spacing['2xl'],  // 24px mobile
    },
    gap: spacing.lg,
  },
  
  input: {
    height: '2.75rem',  // 44px (min tap target)
    padding: `${spacing.md} ${spacing.lg}`,
  },
  
  badge: {
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: typography.sizes.small,
  },
  
  modal: {
    maxWidth: {
      sm: '24rem',     // 384px
      md: '32rem',     // 512px
      lg: '48rem',     // 768px
      xl: '64rem',     // 1024px
    },
  },
} as const

// ============================================
// LAYOUT TOKENS (MOBILE-FIRST)
// ============================================

export const layout = {
  container: {
    maxWidth: '1280px',
    padding: spacing.lg,        // 16px mobile
    paddingDesktop: spacing.xl, // 24px desktop
  },
  
  section: {
    padding: {
      mobile: spacing['2xl'],    // 24px mobile
      desktop: spacing['4xlDesktop'], // 64px desktop
    },
  },
  
  grid: {
    gap: {
      sm: spacing.lg,      // 16px mobile
      md: spacing.xl,      // 20px mobile
      lg: spacing['2xl'],  // 24px mobile
      lgDesktop: spacing['3xlDesktop'], // 48px desktop
    },
    
    columns: {
      plp: {
        mobile: 2,
        tablet: 3,
        desktop: 4,
      },
    },
  },
} as const

// ============================================
// EXPORT TYPE-SAFE TOKEN ACCESS
// ============================================

export type Typography = typeof typography
export type Colors = typeof colors
export type Spacing = typeof spacing
export type Surfaces = typeof surfaces
export type Breakpoints = typeof breakpoints
export type Transitions = typeof transitions
export type Components = typeof components
export type Layout = typeof layout

export const tokens = {
  typography,
  colors,
  spacing,
  surfaces,
  breakpoints,
  transitions,
  components,
  layout,
} as const

export default tokens
