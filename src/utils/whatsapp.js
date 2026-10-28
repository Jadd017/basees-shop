import { getCategory } from '../data/categories.js'
import { formatPrice } from './format.js'

export const WHATSAPP_NUMBER = '9613560523'

// "Dessert candles – Strawberry Cake Candle" for candles, otherwise just the name.
function itemLabel(item) {
  const sub = getCategory(item.category)?.subcategories?.find((s) => s.id === item.subcategory)
  return sub ? `${sub.name} – ${item.name}` : item.name
}

export function buildOrderMessage({ customer, items, total }) {
  const lines = [
    'New order from Basees website 🛍️',
    '',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}`,
    '',
    ...items.map(
      (item) =>
        `• ${item.quantity} × ${itemLabel(item)} (${formatPrice(item.price)} each) = ${formatPrice(
          item.price * item.quantity,
        )}`,
    ),
    '',
    `Total: ${formatPrice(total)}`,
  ]
  if (customer.note) lines.push(`Note: ${customer.note}`)
  return lines.join('\n')
}

export function buildWhatsAppUrl(message) {
  // encodeURIComponent keeps Arabic text, emojis and line breaks intact.
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
