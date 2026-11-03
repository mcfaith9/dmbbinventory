/**
 * Philippine Peso (PHP) Currency Formatter Utility
 * Formats numbers into official Philippine Peso format (e.g. ₱1,000.00, ₱540.00, ₱0.00)
 * using the Philippine locale (en-PH) and PHP currency specifications.
 */

export function formatPHP(amount: number | null | undefined): string {
  const numeric = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const formatted = numeric.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `₱${formatted}`
}

export function formatCurrency(amount: number | null | undefined): string {
  return formatPHP(amount)
}

/**
 * Parses user currency input string (e.g., "₱1,250.50" or "1250.50") into a raw number.
 */
export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const clean = value.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(clean)
  return isNaN(parsed) ? 0 : parsed
}
