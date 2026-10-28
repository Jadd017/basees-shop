import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// v2: products moved to Firestore (sample-data baskets are dropped).
const STORAGE_KEY = 'basees-basket-v2'
export const MAX_QUANTITY = 20

const BasketContext = createContext(null)

function loadBasket() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((item) => item?.id && item.quantity > 0) : []
  } catch {
    return []
  }
}

// Each item is a snapshot of the product when it was added, plus a quantity:
// { id, name, price, thumbnail, category, subcategory, quantity, unavailable? }
export function BasketProvider({ children }) {
  const [items, setItems] = useState(loadBasket)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage full or blocked (e.g. private mode) — the basket still works for this visit.
    }
  }, [items])

  const value = useMemo(() => {
    const clamp = (q) => Math.max(1, Math.min(MAX_QUANTITY, q))

    const addItem = (product, quantity = 1) => {
      const { id, name, price, thumbnail, category, subcategory } = product
      setItems((current) => {
        const existing = current.find((item) => item.id === id)
        if (existing) {
          return current.map((item) =>
            item.id === id ? { ...item, quantity: clamp(item.quantity + quantity) } : item,
          )
        }
        return [
          ...current,
          { id, name, price, thumbnail, category, subcategory, quantity: clamp(quantity) },
        ]
      })
    }

    const setQuantity = (id, quantity) => {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, quantity: clamp(quantity) } : item)),
      )
    }

    // Bring snapshots up to date with the shop: `latest` maps id → current product, or null
    // when it was deleted or marked unavailable.
    const syncItems = (latest) => {
      setItems((current) =>
        current.map((item) => {
          if (!(item.id in latest)) return item
          const product = latest[item.id]
          if (!product) return { ...item, unavailable: true }
          const { name, price, thumbnail, category, subcategory } = product
          return { ...item, name, price, thumbnail, category, subcategory, unavailable: false }
        }),
      )
    }

    const removeItem = (id) => setItems((current) => current.filter((item) => item.id !== id))
    const clear = () => setItems([])

    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const total = items
      .filter((item) => !item.unavailable)
      .reduce((sum, item) => sum + item.price * item.quantity, 0)

    return { items, count, total, addItem, setQuantity, syncItems, removeItem, clear }
  }, [items])

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function useBasket() {
  const context = useContext(BasketContext)
  if (!context) throw new Error('useBasket must be used inside <BasketProvider>')
  return context
}
