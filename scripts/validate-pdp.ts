/**
 * Validation Runner - Execute PDP validation suite
 * 
 * Run with: npx tsx scripts/validate-pdp.ts [product-slug]
 */

import { runAllValidations } from '../src/lib/products/validatePDP'

const testSlug = process.argv[2] || 'test-product-slug'

console.log(`Testing product slug: ${testSlug}\n`)

runAllValidations(testSlug)
  .then(() => {
    console.log('\n✅ Validation complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  })
