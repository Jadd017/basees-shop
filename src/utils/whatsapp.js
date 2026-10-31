import { findCategory, findSubcategory } from '../services/categories.js'
import { formatPrice, productCode } from './format.js'

export const WHATSAPP_NUMBER = '9613560523'

// "Dessert candles – Strawberry Cake Candle" when the item has a subcategory, otherwise the name.
function itemLabel(item, categories) {
  const sub = findSubcategory(findCategory(categories, item.category), item.subcategory)
  return sub ? `${sub.name} – ${item.name}` : item.name
}

// `categories` (from Firestore) is only used for subcategory labels; it may be empty.
export function buildOrderMessage({ customer, items, subtotal, deliveryFee, categories = [] }) {
  const lines = [
    'New order from Basees website 🛍️',
    '',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}`,
    '',
    // The code lets the owner look the item up in the admin and check the price.
    ...items.map(
      (item) =>
        `• ${item.quantity} × ${itemLabel(item, categories)} [#${productCode(item.id)}] (${formatPrice(
          item.price,
        )} each) = ${formatPrice(item.price * item.quantity)}`,
    ),
    '',
    `Subtotal: ${formatPrice(subtotal)}`,
    `Delivery: ${formatPrice(deliveryFee)}`,
    `Total: ${formatPrice(subtotal + deliveryFee)}`,
  ]
  if (customer.note) lines.push(`Note: ${customer.note}`)
  lines.push('', '✅ Customer agreed to the Terms & Policies')
  return lines.join('\n')
}

export function buildWhatsAppUrl(message) {
  // encodeURIComponent keeps Arabic text, emojis and line breaks intact.
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
