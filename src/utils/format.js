const whole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// $12 for whole prices, $12.50 otherwise.
export function formatPrice(value) {
  return Number.isInteger(value) ? whole.format(value) : cents.format(value)
}
