// The fixed category list. `id` is the URL slug (/shop/:category) and the value
// stored in each product's `category` field.
export const categories = [
  { id: 'jewellery-boxes', name: 'Jewellery boxes' },
  { id: 'keychains-bag-charms', name: 'Keychains & bag charms' },
  { id: 'bookmarks', name: 'Bookmarks' },
  {
    id: 'candles',
    name: 'Candles',
    // `id` is the value stored in a product's `subcategory` field.
    subcategories: [
      { id: 'everyday', name: 'Everyday candles' },
      { id: 'sculpted-gypsum', name: 'Sculpted gypsum candles' },
      { id: 'dessert', name: 'Dessert candles' },
      { id: 'burner', name: 'Burner candles' },
    ],
  },
  { id: 'candle-holders', name: 'Candle holders' },
  { id: 'burners', name: 'Burners' },
  { id: 'bakhour', name: 'Bakhour' },
  { id: 'crochet', name: 'Crochet' },
]

export function getCategory(id) {
  return categories.find((c) => c.id === id)
}
