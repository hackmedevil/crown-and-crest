// Predefined apparel sizes
export const APPAREL_SIZES = [
    'XS',
    'S',
    'M',
    'L',
    'XL',
    '2XL',
    '3XL',
    '4XL',
    '5XL',
    'Free Size'
] as const

export type ApparelSize = typeof APPAREL_SIZES[number]

// Color definition type
export interface ColorDefinition {
    id: string
    name: string
    hex: string
}

// Helper to generate color ID
export const generateColorId = () => `color_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
