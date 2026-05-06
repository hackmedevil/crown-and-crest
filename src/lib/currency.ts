/**
 * Format integer paise into human-friendly INR string, e.g., 123456 -> "₹1,234.56".
 * Keeps two decimals, uses Indian numbering locale defaults.
 */
export function formatCurrency(amountInPaise: number): string {
  const rupees = amountInPaise / 100
  return rupees.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
