import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { MAX_QUANTITY, useBasket } from '../context/BasketContext.jsx'
import { useCategories } from '../hooks/useCategories.js'
import { findCategory, findSubcategory } from '../services/categories.js'
import { fetchProduct, fetchProductImage, getCachedProduct } from '../services/products.js'
import { formatPrice } from '../utils/format.js'
import '../styles/shop.css'

export default function Product() {
  const { id } = useParams()
  const location = useLocation()
  const { addItem } = useBasket()
  const { categories } = useCategories()

  // Coming from a category page the product is already cached, so it shows instantly.
  const cached = getCachedProduct(id)
  const [state, setState] = useState(
    cached ? { status: 'ready', product: cached } : { status: 'loading', product: null },
  )
  const [attempt, setAttempt] = useState(0)
  const [fullImage, setFullImage] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(null) // { quantity, at } of the last add, for the confirmation

  useEffect(() => {
    let cancelled = false
    const fresh = getCachedProduct(id)
    setState(fresh ? { status: 'ready', product: fresh } : { status: 'loading', product: null })
    setFullImage(null)
    setQuantity(1)

    fetchProduct(id)
      .then((product) => {
        if (cancelled) return
        setState(product ? { status: 'ready', product } : { status: 'missing', product: null })
        if (!product) return
        // Show the thumbnail right away; swap in the full image once it's downloaded and decoded.
        return fetchProductImage(id).then(async (image) => {
          if (!image || cancelled) return
          const img = new Image()
          img.src = image
          await img.decode().catch(() => {})
          if (!cancelled) setFullImage(image)
        })
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled && !fresh) setState({ status: 'error', product: null })
      })
    return () => {
      cancelled = true
    }
  }, [id, attempt])

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(null), 3500)
    return () => clearTimeout(timer)
  }, [added])

  if (state.status !== 'ready') {
    return (
      <div className="bg-page">
        <Header backTo={location.state?.from ?? '/shop'} backLabel="Back" />
        <main className="shop">
          {state.status === 'loading' ? (
            <div className="product" aria-busy="true" aria-label="Loading product">
              <div className="product__media" />
              <div className="product__info">
                <span className="skeleton-line" />
                <span className="skeleton-line skeleton-line--short" />
              </div>
            </div>
          ) : state.status === 'error' ? (
            <div className="empty">
              <p className="empty__text">We couldn’t load this piece. Please check your connection.</p>
              <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
            </div>
          ) : (
            <div className="empty">
              <p className="empty__text">This piece isn’t available anymore.</p>
              <Link to="/shop" className="btn">
                Back to the shop
              </Link>
            </div>
          )}
        </main>
      </div>
    )
  }

  const { product } = state
  const category = findCategory(categories, product.category)
  const subcategory = findSubcategory(category, product.subcategory)
  const backTo = location.state?.from ?? `/shop/${product.category}`

  const addToBasket = () => {
    addItem(product, quantity)
    setAdded({ quantity, at: Date.now() })
    setQuantity(1)
  }

  return (
    <div className="bg-page">
      <Header backTo={backTo} backLabel={category?.name ?? 'Shop'} />
      <main className="shop product">
        <div className="product__media">
          {product.thumbnail && (
            <img src={product.thumbnail} alt={product.name} className="product__thumb" />
          )}
          {fullImage && <img src={fullImage} alt="" aria-hidden="true" className="product__full" />}
        </div>

        <div className="product__info">
          {subcategory && <p className="product__kicker">{subcategory.name}</p>}
          <h1 className="product__name">{product.name}</h1>
          <p className="product__price">{formatPrice(product.price)}</p>
          <p className="product__desc">{product.fullDescription}</p>

          <div className="product__buy">
            <div className="stepper" role="group" aria-label="Quantity">
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <output className="stepper__value" aria-live="polite">
                {quantity}
              </output>
              <button
                type="button"
                className="stepper__btn"
                onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                disabled={quantity >= MAX_QUANTITY}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button type="button" className="btn product__add" onClick={addToBasket}>
              Add to basket
            </button>
          </div>
        </div>
      </main>

      <div className="toast-region" role="status" aria-live="polite">
        {added && (
          <div className="toast" key={added.at}>
            <span>
              <span aria-hidden="true">✓ </span>
              Added {added.quantity} × {product.name}
            </span>
            <Link to="/basket" className="toast__link">
              View basket
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
