import { buildAvailabilityMatrix, findMatchingVariant } from '../src/lib/products/buildAvailabilityMatrix'
import type { PDPVariant, PDPColorGroup } from '../src/types/pdp'

type Selection = {
  colorId: string | null
  size: string | null
}

function assertCondition(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(`FAIL: ${label}`)
  }
  console.log(`PASS: ${label}`)
}

function firstSizeForColor(matrix: ReturnType<typeof buildAvailabilityMatrix>, colorId: string | null): string | null {
  if (!colorId) return null
  const sizes = matrix.color_to_sizes[colorId] || []
  return sizes[0] || null
}

function applyColorSelectionFlow(
  matrix: ReturnType<typeof buildAvailabilityMatrix>,
  variants: PDPVariant[],
  selection: Selection,
  nextColorId: string
): Selection {
  // Equivalent to handleColorChange + color-size sync effect + safety fallback semantics.
  let next: Selection = { colorId: nextColorId, size: selection.size }

  const sizesForColor = matrix.color_to_sizes[nextColorId] || []
  if (!next.size || !sizesForColor.includes(next.size)) {
    next = { ...next, size: sizesForColor[0] || null }
  }

  const selectedVariant = findMatchingVariant(variants, next.colorId, next.size)
  if (!selectedVariant) {
    const sameColor = variants.find(v => v.enabled && !v.is_out_of_stock && v.color_group_id === next.colorId)
    if (sameColor?.size) {
      next = { ...next, size: sameColor.size }
    }
  }

  return next
}

function applySizeSelectionFlow(
  matrix: ReturnType<typeof buildAvailabilityMatrix>,
  selection: Selection,
  nextSize: string
): { selection: Selection; allowed: boolean } {
  const isDisabled =
    selection.colorId !== null &&
    !(matrix.color_to_sizes[selection.colorId]?.includes(nextSize) ?? false)

  if (isDisabled) {
    return { selection, allowed: false }
  }

  return { selection: { ...selection, size: nextSize }, allowed: true }
}

function colorDisabled(
  matrix: ReturnType<typeof buildAvailabilityMatrix>,
  colorGroups: PDPColorGroup[],
  selection: Selection,
  colorId: string
): boolean {
  if (!selection.size) return false

  const availableColorIds = matrix.size_to_colors[selection.size] || []
  // Mirrors VariantSelector logic
  const hasAnyColor = colorGroups.some(cg => cg.id === colorId)
  if (!hasAnyColor) return true

  return !availableColorIds.includes(colorId)
}

function resolveGalleryUrls(
  selection: Selection,
  variants: PDPVariant[],
  colorGroups: PDPColorGroup[],
  fallbackGallery: string[]
): Set<string> {
  const selectedVariant = findMatchingVariant(variants, selection.colorId, selection.size)
  if (selectedVariant?.images?.length) {
    return new Set(selectedVariant.images.map(i => i.url))
  }

  if (selection.colorId) {
    const cg = colorGroups.find(c => c.id === selection.colorId)
    if (cg?.images?.length) {
      return new Set(cg.images.map(i => i.url))
    }
  }

  return new Set(fallbackGallery)
}

function run() {
  // Mock PDP set: Color A has S/L, Color B has M/L (single-size scenario in Color C)
  const variants = [
    { id: 'a-s', sku: 'A-S', enabled: true, size: 'S', color: 'A', color_group_id: 'A', price_override: null, final_price: 1000, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'a-s-1.jpg', position: 0 }] },
    { id: 'a-l', sku: 'A-L', enabled: true, size: 'L', color: 'A', color_group_id: 'A', price_override: null, final_price: 1000, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'a-l-1.jpg', position: 0 }] },
    { id: 'b-m', sku: 'B-M', enabled: true, size: 'M', color: 'B', color_group_id: 'B', price_override: null, final_price: 1000, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'b-m-1.jpg', position: 0 }] },
    { id: 'b-l', sku: 'B-L', enabled: true, size: 'L', color: 'B', color_group_id: 'B', price_override: null, final_price: 1000, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'b-l-1.jpg', position: 0 }] },
    { id: 'c-xl', sku: 'C-XL', enabled: true, size: 'XL', color: 'C', color_group_id: 'C', price_override: null, final_price: 1000, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'c-xl-1.jpg', position: 0 }] },
    { id: 'b-s-oos', sku: 'B-S', enabled: true, size: 'S', color: 'B', color_group_id: 'B', price_override: null, final_price: 1000, stock_quantity: 0, available_to_sell: 0, is_out_of_stock: true, options: {}, images: [{ url: 'b-s-1.jpg', position: 0 }] },
  ] as unknown as PDPVariant[]

  const colorGroups: PDPColorGroup[] = [
    { id: 'A', name: 'Color A', primary_color_id: 'ca', primary_hex: '#111111', variant_ids: ['a-s', 'a-l'], images: [{ url: 'a-cg-1.jpg', position: 0 }], available_sizes: ['S', 'L'] },
    { id: 'B', name: 'Color B', primary_color_id: 'cb', primary_hex: '#222222', variant_ids: ['b-m', 'b-l'], images: [{ url: 'b-cg-1.jpg', position: 0 }], available_sizes: ['M', 'L'] },
    { id: 'C', name: 'Color C', primary_color_id: 'cc', primary_hex: '#333333', variant_ids: ['c-xl'], images: [{ url: 'c-cg-1.jpg', position: 0 }], available_sizes: ['XL'] },
  ]

  const matrix = buildAvailabilityMatrix(variants)

  console.log('\n=== Focused Variant Interaction Validation ===')
  console.log('Type A - Color + Size product')

  // 1) Color A -> Size S -> Color B (S unavailable)
  let selection: Selection = { colorId: 'A', size: 'S' }
  selection = applyColorSelectionFlow(matrix, variants, selection, 'B')
  assertCondition(selection.colorId === 'B', 'Scenario 1: color switches to B')
  assertCondition(selection.size === firstSizeForColor(matrix, 'B'), 'Scenario 1: size auto-switches to first valid size for B')

  // 2) Color A -> Size L -> Color B (L available)
  selection = { colorId: 'A', size: 'L' }
  selection = applyColorSelectionFlow(matrix, variants, selection, 'B')
  assertCondition(selection.colorId === 'B', 'Scenario 2: color switches to B')
  assertCondition(selection.size === 'L', 'Scenario 2: shared size L is preserved')
  assertCondition(!!findMatchingVariant(variants, selection.colorId, selection.size), 'Scenario 2: variant resolves for B/L')

  // 3) Size first -> then Color (valid combo)
  selection = { colorId: null, size: 'L' }
  selection = applyColorSelectionFlow(matrix, variants, selection, 'A')
  assertCondition(selection.size === 'L', 'Scenario 3: size-first path preserves valid size after color change')

  // 4) Color with one size
  selection = { colorId: 'A', size: 'S' }
  selection = applyColorSelectionFlow(matrix, variants, selection, 'C')
  assertCondition(selection.colorId === 'C', 'Scenario 4: color switches to single-size color')
  assertCondition(selection.size === 'XL', 'Scenario 4: only available size auto-selected')

  // 5) Disabled combination cannot be selected
  selection = { colorId: 'A', size: 'S' }
  const sizeTry = applySizeSelectionFlow(matrix, selection, 'M')
  assertCondition(!sizeTry.allowed, 'Scenario 5: disabled size combination is blocked')
  const colorIsDisabled = colorDisabled(matrix, colorGroups, { colorId: 'A', size: 'S' }, 'B')
  assertCondition(colorIsDisabled, 'Scenario 5: disabled color for selected size is correctly detected')

  // Variant resolution integrity
  selection = { colorId: 'B', size: 'M' }
  assertCondition(!!findMatchingVariant(variants, selection.colorId, selection.size), 'Variant resolution: valid selection resolves')
  selection = { colorId: 'B', size: 'S' }
  assertCondition(!findMatchingVariant(variants, selection.colorId, selection.size), 'Variant resolution: out-of-stock combination does not resolve')

  // Availability matrix validation
  assertCondition(!((matrix.color_to_sizes['B'] || []).includes('S')), 'Matrix: out-of-stock size excluded from color_to_sizes')
  assertCondition(!((matrix.size_to_colors['S'] || []).includes('B')), 'Matrix: out-of-stock color excluded from size_to_colors')
  assertCondition(matrix.out_of_stock_variants.includes('b-s-oos'), 'Matrix: out-of-stock variant tracked separately')

  // Image switching checks
  const fallbackGallery = ['fallback-1.jpg']
  const galleryA = resolveGalleryUrls({ colorId: 'A', size: 'S' }, variants, colorGroups, fallbackGallery)
  const galleryB = resolveGalleryUrls({ colorId: 'B', size: 'M' }, variants, colorGroups, fallbackGallery)
  assertCondition(galleryA.has('a-s-1.jpg'), 'Gallery: updates on color/size change to A/S')
  assertCondition(galleryB.has('b-m-1.jpg'), 'Gallery: updates on color/size change to B/M')

  const galleryWithinColor = resolveGalleryUrls({ colorId: 'A', size: 'L' }, variants, colorGroups, fallbackGallery)
  assertCondition(galleryWithinColor.has('a-l-1.jpg'), 'Gallery: updates when size changes within same color')

  // Type B - Color-only product
  console.log('\nType B - Color-only product')

  const colorOnlyVariants = [
    { id: 'co-a', sku: 'CO-A', enabled: true, size: null, color: 'A', color_group_id: 'A', price_override: null, final_price: 900, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'co-a-1.jpg', position: 0 }] },
    { id: 'co-b', sku: 'CO-B', enabled: true, size: null, color: 'B', color_group_id: 'B', price_override: null, final_price: 900, stock_quantity: 10, available_to_sell: 10, is_out_of_stock: false, options: {}, images: [{ url: 'co-b-1.jpg', position: 0 }] },
    { id: 'co-c-oos', sku: 'CO-C', enabled: true, size: null, color: 'C', color_group_id: 'C', price_override: null, final_price: 900, stock_quantity: 0, available_to_sell: 0, is_out_of_stock: true, options: {}, images: [{ url: 'co-c-1.jpg', position: 0 }] },
  ] as unknown as PDPVariant[]

  const colorOnlyGroups: PDPColorGroup[] = [
    { id: 'A', name: 'Color A', primary_color_id: 'ca', primary_hex: '#111111', variant_ids: ['co-a'], images: [{ url: 'co-a-cg.jpg', position: 0 }], available_sizes: [] },
    { id: 'B', name: 'Color B', primary_color_id: 'cb', primary_hex: '#222222', variant_ids: ['co-b'], images: [{ url: 'co-b-cg.jpg', position: 0 }], available_sizes: [] },
    { id: 'C', name: 'Color C', primary_color_id: 'cc', primary_hex: '#333333', variant_ids: ['co-c-oos'], images: [{ url: 'co-c-cg.jpg', position: 0 }], available_sizes: [] },
  ]

  const colorOnlyHasSizeVariants = colorOnlyVariants.some(v => v.size !== null)
  assertCondition(!colorOnlyHasSizeVariants, 'Type B: hasSizeVariants is false')

  const colorOnlySelectionA = { colorId: 'A', size: null }
  const colorOnlyVariantA = colorOnlyVariants.find(
    v => v.enabled && !v.is_out_of_stock && v.color_group_id === colorOnlySelectionA.colorId
  )
  assertCondition(!!colorOnlyVariantA, 'Type B: color change resolves variant by color only')

  const colorOnlySelectionB = { colorId: 'B', size: null }
  const colorOnlyVariantB = colorOnlyVariants.find(
    v => v.enabled && !v.is_out_of_stock && v.color_group_id === colorOnlySelectionB.colorId
  )
  assertCondition(!!colorOnlyVariantB, 'Type B: switching color updates variant without size')

  const colorOnlyAvailableIds = colorOnlyGroups
    .filter(cg => colorOnlyVariants.some(v => v.enabled && !v.is_out_of_stock && v.color_group_id === cg.id))
    .map(cg => cg.id)
  assertCondition(colorOnlyAvailableIds.includes('A') && colorOnlyAvailableIds.includes('B'), 'Type B: available colors include in-stock variants')
  assertCondition(!colorOnlyAvailableIds.includes('C'), 'Type B: out-of-stock-only colors are not selectable')

  const colorOnlyGalleryB = resolveGalleryUrls(colorOnlySelectionB, colorOnlyVariants, colorOnlyGroups, fallbackGallery)
  assertCondition(colorOnlyGalleryB.has('co-b-1.jpg'), 'Type B: gallery updates on color change')

  console.log('\nAll focused variant interaction checks passed for Type A and Type B.')
}

run()
