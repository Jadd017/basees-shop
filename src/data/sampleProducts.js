// Temporary sample data until products come from Firestore.
// Each object has exactly the fields a Firestore product document will have;
// `id` stands in for the Firestore document id.
//
//   name             string
//   price            number (USD)
//   shortDescription string  — shown on product cards
//   fullDescription  string  — shown on the product page
//   imageUrl         string  — Cloudinary URL later; placeholders for now
//   category         string  — a category id from categories.js
//   subcategory      string | null — candles only
//   available        boolean — false shows "Sold out"

const placeholder = (label) =>
  `https://placehold.co/600x600/C9CEB2/744929/png?font=lora&text=${encodeURIComponent(label)}`

export const sampleProducts = [
  {
    id: 'sample-jewellery-box-1',
    name: 'Rosewood Trinket Box',
    price: 18,
    shortDescription: 'A small hand-painted box for rings and earrings.',
    fullDescription:
      'A little keepsake box, hand-painted in soft florals and sealed with a gentle varnish. Lined inside so your rings, earrings and tiny treasures stay safe. Every box is painted by hand, so yours will be one of a kind.',
    imageUrl: placeholder('Trinket Box'),
    category: 'jewellery-boxes',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-jewellery-box-2',
    name: 'Mushroom Ring Dish Box',
    price: 22,
    shortDescription: 'A whimsical mushroom box with a lift-off lid.',
    fullDescription:
      'Shaped like a tiny forest mushroom, this box has a lift-off cap that hides a compartment for rings and studs. Made from durable resin and finished by hand.',
    imageUrl: placeholder('Mushroom Box'),
    category: 'jewellery-boxes',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-keychain-1',
    name: 'Pressed Flower Keychain',
    price: 7,
    shortDescription: 'Real pressed flowers set in clear resin.',
    fullDescription:
      'Real dried flowers carefully arranged and set in crystal-clear resin, finished with a gold-tone ring. A little piece of a garden to carry with you.',
    imageUrl: placeholder('Flower Keychain'),
    category: 'keychains-bag-charms',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-keychain-2',
    name: 'Little Black Cat Bag Charm',
    price: 9,
    shortDescription: 'A tiny black cat to hang on your bag.',
    fullDescription:
      'Our little black cat, wrapped in a cosy scarf, made to hang from your bag, pencil case or keys. Lightweight and sturdy, with a lobster clasp.',
    imageUrl: placeholder('Cat Charm'),
    category: 'keychains-bag-charms',
    subcategory: null,
    available: false,
  },
  {
    id: 'sample-bookmark-1',
    name: 'Autumn Leaves Bookmark',
    price: 5,
    shortDescription: 'Resin bookmark with real autumn leaves.',
    fullDescription:
      'A slim resin bookmark holding real autumn leaves, finished with a soft tassel. Perfect for slow evenings and long novels.',
    imageUrl: placeholder('Leaves Bookmark'),
    category: 'bookmarks',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-bookmark-2',
    name: 'Starry Night Bookmark',
    price: 6,
    shortDescription: 'Shimmering bookmark with gold star flakes.',
    fullDescription:
      'Deep tones swirled with gold flakes and tiny stars, finished with a ribbon tassel. A small gift for every book lover.',
    imageUrl: placeholder('Starry Bookmark'),
    category: 'bookmarks',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-candle-1',
    name: 'Vanilla Everyday Candle',
    price: 12,
    shortDescription: 'Soy candle with a warm vanilla scent.',
    fullDescription:
      'Hand-poured soy wax with a warm vanilla scent and a cotton wick, in a reusable glass jar. Around 30 hours of calm, cosy light.',
    imageUrl: placeholder('Vanilla Candle'),
    category: 'candles',
    subcategory: 'everyday',
    available: true,
  },
  {
    id: 'sample-candle-2',
    name: 'Strawberry Cake Candle',
    price: 15,
    shortDescription: 'A dessert candle that looks good enough to eat.',
    fullDescription:
      'A sweet little cake slice made entirely of wax, topped with a strawberry and whipped "cream". Smells like a bakery — just please don’t eat it!',
    imageUrl: placeholder('Cake Candle'),
    category: 'candles',
    subcategory: 'dessert',
    available: true,
  },
  {
    id: 'sample-holder-1',
    name: 'Gypsum Wave Candle Holder',
    price: 10,
    shortDescription: 'Sculpted holder for taper candles.',
    fullDescription:
      'A sculpted gypsum holder with soft wave edges, hand-finished and sealed. Fits standard taper candles.',
    imageUrl: placeholder('Wave Holder'),
    category: 'candle-holders',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-holder-2',
    name: 'Terrazzo Tealight Holder',
    price: 8,
    shortDescription: 'Speckled tealight holder in earthy tones.',
    fullDescription:
      'A speckled terrazzo-style tealight holder in earthy tones of sage and olive. Each one has its own unique pattern.',
    imageUrl: placeholder('Tealight Holder'),
    category: 'candle-holders',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-burner-1',
    name: 'Ceramic Oil Burner',
    price: 20,
    shortDescription: 'A hand-glazed burner for oils and wax melts.',
    fullDescription:
      'A hand-glazed ceramic burner for essential oils and wax melts. Place a tealight underneath and let the scent fill the room.',
    imageUrl: placeholder('Oil Burner'),
    category: 'burners',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-burner-2',
    name: 'Little House Burner',
    price: 24,
    shortDescription: 'A cottage-shaped burner that glows from inside.',
    fullDescription:
      'A tiny cottage whose windows glow warmly when the tealight inside is lit. A cosy centrepiece for any shelf.',
    imageUrl: placeholder('House Burner'),
    category: 'burners',
    subcategory: null,
    available: false,
  },
  {
    id: 'sample-bakhour-1',
    name: 'Oud & Rose Bakhour',
    price: 14,
    shortDescription: 'Rich oud with a soft touch of rose.',
    fullDescription:
      'Traditional bakhour blended with rich oud and a soft touch of rose, packed in a small glass jar. Burn a few pieces on charcoal or an electric burner.',
    imageUrl: placeholder('Oud Bakhour'),
    category: 'bakhour',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-bakhour-2',
    name: 'Amber Musk Bakhour',
    price: 13,
    shortDescription: 'Warm amber and white musk.',
    fullDescription:
      'A warm, comforting blend of amber and white musk that lingers gently in the home and on fabrics.',
    imageUrl: placeholder('Amber Bakhour'),
    category: 'bakhour',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-crochet-1',
    name: 'Crochet Sunflower Pot',
    price: 16,
    shortDescription: 'A sunflower that never needs watering.',
    fullDescription:
      'A cheerful crochet sunflower in a little pot, made stitch by stitch in soft cotton yarn. Brightens any desk or bedside table.',
    imageUrl: placeholder('Crochet Sunflower'),
    category: 'crochet',
    subcategory: null,
    available: true,
  },
  {
    id: 'sample-crochet-2',
    name: 'Crochet Coaster Set',
    price: 12,
    shortDescription: 'Set of 4 round coasters in sage and cream.',
    fullDescription:
      'A set of four round crochet coasters in sage and cream cotton. Washable, soft, and lovely under a warm cup of tea.',
    imageUrl: placeholder('Coaster Set'),
    category: 'crochet',
    subcategory: null,
    available: true,
  },
]

export function getProductsByCategory(categoryId) {
  return sampleProducts.filter((p) => p.category === categoryId)
}

export function getProductById(id) {
  return sampleProducts.find((p) => p.id === id)
}
