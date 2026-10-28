// Shown in the basket until the owner saves their own text from /admin (settings/terms).
// Format: each policy is a title line followed by its text; policies are separated by a blank line.
export const DEFAULT_TERMS = `1. Custom Orders
If you're ordering a custom design, we may need some time to review your request and confirm whether we're able to create the desired design. We'll get back to you as soon as possible with a confirmation.

2. Production Queue
To ensure the best quality and avoid overloading our production schedule, we'll let you know when we're able to start your order and keep you updated throughout the process.

3. Processing Time
As each item is handmade especially for you, processing times may vary depending on order volume and the complexity of your order. In most cases, orders take 1-2 weeks to complete before shipping.

4. Order Changes
Once your order has entered production, no changes or cancellations can be made. Please double-check all order details before confirming your purchase.

5. Colors
The colors of our products may appear slightly different in person due to lighting, photography, and screen settings. Before we begin your order, we'll always provide raw photos to confirm your color.

6. Returns & Exchanges
We do not accept returns or exchanges unless your order arrives damaged or you receive the wrong item. If this happens, please contact us as soon as possible after receiving your order.`

// "Title\ntext…\n\nTitle\ntext…" → [{ title, body }]
export function parseTerms(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title, ...rest] = block.split('\n')
      return { title: title.trim(), body: rest.join('\n').trim() }
    })
}
