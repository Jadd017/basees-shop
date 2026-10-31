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

// Short product code shown in WhatsApp orders and the admin list: the first 6 characters of the id.
export function productCode(id) {
  return id.slice(0, 6)
}
