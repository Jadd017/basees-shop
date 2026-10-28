import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { MAX_QUANTITY, useBasket } from '../context/BasketContext.jsx'
import { getCategory } from '../data/categories.js'
import { getProductById } from '../data/sampleProducts.js'
import { formatPrice } from '../utils/format.js'
import '../styles/shop.css'

export default function Product() {
  const { id } = useParams()
  const location = useLocation()
  const product = getProductById(id)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(null) // { quantity } of the last add, for the confirmation
  const { addItem } = useBasket()

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(null), 3500)
    return () => clearTimeout(timer)
  }, [added])

  if (!product) {
    return (
      <div className="bg-page">
        <Header backTo="/shop" backLabel="Shop" />
        <main className="shop">
          <h1 className="shop__title">Product not found</h1>
          <p className="empty">
            <Link to="/shop" className="btn">
              Back to the shop
            </Link>
          </p>
        </main>
      </div>
    )
  }

  const category = getCategory(product.category)
  const subcategory = category?.subcategories?.find((s) => s.id === product.subcategory)
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
          <img src={product.imageUrl} alt={product.name} />
          {!product.available && <span className="badge">Sold out</span>}
        </div>

        <div className="product__info">
          {subcategory && <p className="product__kicker">{subcategory.name}</p>}
          <h1 className="product__name">{product.name}</h1>
          <p className="product__price">{formatPrice(product.price)}</p>
          <p className="product__desc">{product.fullDescription}</p>

          {product.available ? (
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
          ) : (
            <p className="product__soldout">
              This piece is sold out for now — check back soon!
            </p>
          )}
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
