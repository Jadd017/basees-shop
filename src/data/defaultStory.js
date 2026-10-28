// Shown on Our Story until the owner saves their own text from /admin (settings/story).
// Paragraphs are separated by blank lines.
export const DEFAULT_STORY = `Basees began with a simple wish: to make small things that bring a little light into someone’s day. Every piece is shaped by hand, slowly and with care, in a tiny home studio.

From sculpted gypsum candles to crochet keepsakes, each creation carries a bit of imagination, art, and hope — made to be gifted, cherished, and lived with every day.

Thank you for being part of our story. We hope you find something here that feels like it was made just for you.`

export function toParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
