import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import TermsPolicies from '../components/TermsPolicies.jsx'
import { MAX_QUANTITY, useBasket } from '../context/BasketContext.jsx'
import { DEFAULT_TERMS, parseTerms } from '../data/defaultTerms.js'
import { useCategories } from '../hooks/useCategories.js'
import { fetchProduct } from '../services/products.js'
import { DEFAULT_DELIVERY_FEE, fetchDeliveryFee, fetchTerms } from '../services/settings.js'
import { formatPrice } from '../utils/format.js'
import { buildOrderMessage, buildWhatsAppUrl } from '../utils/whatsapp.js'
import '../styles/shop.css'
import './Basket.css'

// Remember the customer's details on this device so repeat orders are quicker.
const CUSTOMER_KEY = 'basees-customer'
const emptyCustomer = { name: '', phone: '', address: '', note: '' }

function loadCustomer() {
  try {
    return { ...emptyCustomer, ...JSON.parse(localStorage.getItem(CUSTOMER_KEY)) }
  } catch {
    return emptyCustomer
  }
}

function validate(customer) {
  const errors = {}
  if (!customer.name.trim()) errors.name = 'Please enter your full name.'
  const digits = customer.phone.replace(/\D/g, '')
  if (!digits) errors.phone = 'Please enter your phone number.'
  else if (!/^\+?[\d\s\-()]+$/.test(customer.phone.trim()) || digits.length < 7)
    errors.phone = 'Please enter a valid phone number.'
  if (!customer.address.trim()) errors.address = 'Please enter your delivery address or area.'
  return errors
}

export default function Basket() {
  const { items, subtotal, setQuantity, syncItems, removeItem, clear } = useBasket()
  const { status: categoriesStatus, categories } = useCategories()
  const [customer, setCustomer] = useState(loadCustomer)
  const [errors, setErrors] = useState({})
  const [agreed, setAgreed] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(null) // null while loading
  const [policies, setPolicies] = useState(null) // null while loading

  // Delivery fee and Terms & Policies are set by the owner in the admin.
  useEffect(() => {
    let cancelled = false
    fetchDeliveryFee()
      .catch((error) => {
        console.error(error)
        return DEFAULT_DELIVERY_FEE
      })
      .then((fee) => !cancelled && setDeliveryFee(fee))
    fetchTerms()
      .catch((error) => {
        console.error(error)
        return ''
      })
      .then((text) => !cancelled && setPolicies(parseTerms(text.trim() || DEFAULT_TERMS)))
    return () => {
      cancelled = true
    }
  }, [])

  // Re-check prices and availability once when the basket opens (not on every change).
  const [checking, setChecking] = useState(items.length > 0)
  useEffect(() => {
    const ids = items.map((item) => item.id)
    if (ids.length === 0) return
    let cancelled = false
    Promise.all(ids.map((id) => fetchProduct(id).then((p) => [id, p])))
      .then((entries) => !cancelled && syncItems(Object.fromEntries(entries)))
      .catch((error) => console.error(error)) // offline: keep the saved snapshot
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [])

  const unavailableItems = items.filter((item) => item.unavailable)
  // Wait for prices, the delivery fee and category names (used for labels in the message).
  const loading = checking || deliveryFee === null || categoriesStatus === 'loading'

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer))
    } catch {
      // Not critical — the form still works.
    }
  }, [customer])

  const update = (field) => (event) => {
    setCustomer((c) => ({ ...c, [field]: event.target.value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const clearBasket = () => {
    if (window.confirm('Remove everything from your basket?')) clear()
  }

  const placeOrder = (event) => {
    event.preventDefault()
    if (loading || !agreed || unavailableItems.length > 0) return
    const found = validate(customer)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = event.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`)
      first?.focus()
      return
    }

    const trimmed = Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v.trim()]))
    const url = buildWhatsAppUrl(buildOrderMessage({ customer: trimmed, items, subtotal, deliveryFee, categories }))
    // New tab on desktop; if a popup blocker stops it, open in this tab instead.
    // The basket is intentionally kept so the customer can come back to it.
    const opened = window.open(url, '_blank')
    if (opened) opened.opener = null
    else window.location.href = url
  }

  return (
    <div className="bg-page">
      <Header backTo="/shop" backLabel="Shop" />
      <main className="shop basket">
        <h1 className="shop__title">Your basket</h1>

        {items.length === 0 ? (
          <div className="empty">
            <p className="basket__empty-text">Your basket is empty</p>
            <Link to="/shop" className="btn">
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <section className="panel" aria-label="Basket items">
              <ul className="basket__list">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={`basket-item${item.unavailable ? ' basket-item--unavailable' : ''}`}
                  >
                    <Link to={`/product/${item.id}`} className="basket-item__img">
                      {item.thumbnail && <img src={item.thumbnail} alt="" />}
                    </Link>
                    <div className="basket-item__info">
                      <Link to={`/product/${item.id}`} className="basket-item__name">
                        {item.name}
                      </Link>
                      <p className="basket-item__unit">
                        {item.unavailable ? 'No longer available' : `${formatPrice(item.price)} each`}
                      </p>
                      <div className="basket-item__controls">
                        <div className="stepper stepper--small" role="group" aria-label={`Quantity of ${item.name}`}>
                          <button
                            type="button"
                            className="stepper__btn"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || item.unavailable}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <output className="stepper__value" aria-live="polite">
                            {item.quantity}
                          </output>
                          <button
                            type="button"
                            className="stepper__btn"
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= MAX_QUANTITY || item.unavailable}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="basket-item__remove"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="basket-item__line">{formatPrice(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>

              <dl className="basket__summary">
                <div className="basket__summary-row">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="basket__summary-row">
                  <dt>Delivery</dt>
                  <dd>{deliveryFee === null ? '…' : formatPrice(deliveryFee)}</dd>
                </div>
                <div className="basket__summary-row basket__total">
                  <dt>Total</dt>
                  <dd>{deliveryFee === null ? '…' : formatPrice(subtotal + deliveryFee)}</dd>
                </div>
              </dl>

              <button type="button" className="btn btn--ghost basket__clear" onClick={clearBasket}>
                Clear basket
              </button>
            </section>

            <form className="panel order-form" onSubmit={placeOrder} noValidate>
              <h2 className="order-form__title">Your details</h2>
              <p className="order-form__hint">
                We’ll send your order to Basees on WhatsApp — no online payment needed.
              </p>

              <Field label="Full name" error={errors.name}>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={customer.name}
                  onChange={update('name')}
                />
              </Field>

              <Field label="Phone number" error={errors.phone}>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 03 123 456"
                  value={customer.phone}
                  onChange={update('phone')}
                />
              </Field>

              <Field label="Delivery address / area" error={errors.address}>
                <textarea
                  name="address"
                  rows={2}
                  autoComplete="street-address"
                  value={customer.address}
                  onChange={update('address')}
                />
              </Field>

              <Field label="Note (optional)">
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Gift wrapping, preferred colours, delivery time…"
                  value={customer.note}
                  onChange={update('note')}
                />
              </Field>

              <TermsPolicies policies={policies} />

              <label className="agree">
                <input
                  type="checkbox"
                  name="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  required
                />
                <span>I have read and agree to the Basees Terms &amp; Policies</span>
              </label>

              {unavailableItems.length > 0 && (
                <p className="order-form__blocked" role="alert">
                  Some pieces in your basket are no longer available. Please remove them to continue.
                </p>
              )}
              <button
                type="submit"
                className="btn order-form__submit"
                disabled={loading || !agreed || unavailableItems.length > 0}
              >
                {loading ? 'Checking prices…' : 'Order now on WhatsApp'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <label className={`field${error ? ' field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error && <span className="field__error">{error}</span>}
    </label>
  )
}
