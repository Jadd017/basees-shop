import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import TermsPolicies from '../components/TermsPolicies.jsx'
import { MAX_QUANTITY, useBasket } from '../context/BasketContext.jsx'
import { DEFAULT_TERMS, parseTerms } from '../data/defaultTerms.js'
import { useCategories } from '../hooks/useCategories.js'
import { fetchProduct } from '../services/products.js'
import { fetchDeliveryFee, fetchTerms } from '../services/settings.js'
import { formatPrice } from '../utils/format.js'
import { buildOrderMessage, buildWhatsAppUrl } from '../utils/whatsapp.js'
import '../styles/shop.css'
import './Basket.css'

// Only when the customer ticks "Remember my details", their name, phone and address are kept on
// this device: { remember: true, name, phone, address }. The note is never saved.
// Older saves without `remember` (made before customers could choose) are ignored and removed.
const CUSTOMER_KEY = 'basees-customer'
const emptyCustomer = { name: '', phone: '', address: '', note: '' }

function loadSavedCustomer() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY))
    if (saved?.remember !== true) return null
    const { name = '', phone = '', address = '' } = saved
    return { ...emptyCustomer, name, phone, address }
  } catch {
    return null
  }
}

// After "Order now" the order waits for the customer to confirm it was sent in WhatsApp:
// { url, key }. Kept for this tab, so it's still there if WhatsApp opened in the same tab.
const SENT_KEY = 'basees-order-sent'

function loadSentOrder() {
  try {
    return JSON.parse(sessionStorage.getItem(SENT_KEY))
  } catch {
    return null
  }
}

function saveSentOrder(order) {
  try {
    if (order) sessionStorage.setItem(SENT_KEY, JSON.stringify(order))
    else sessionStorage.removeItem(SENT_KEY)
  } catch {
    // Storage blocked — the confirmation just won't survive leaving the page.
  }
}

// What was ordered; if the basket changes afterwards, that order no longer applies.
const orderKey = (items) => items.map((item) => `${item.id}:${item.quantity}`).join('|')

function openWhatsApp(url) {
  // New tab on desktop; if a popup blocker stops it, open in this tab instead.
  const opened = window.open(url, '_blank')
  if (opened) opened.opener = null
  else window.location.href = url
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
  const [savedCustomer] = useState(loadSavedCustomer)
  const [customer, setCustomer] = useState(savedCustomer ?? emptyCustomer)
  const [remember, setRemember] = useState(savedCustomer !== null) // unticked unless chosen before
  const [errors, setErrors] = useState({})
  const [agreed, setAgreed] = useState(false)
  const [deliveryFee, setDeliveryFee] = useState(null) // null while loading
  const [policies, setPolicies] = useState(null) // null while loading
  const [checking, setChecking] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Before an order can be sent, the current prices, delivery fee and Terms & Policies must come
  // from the shop — offline we'd otherwise send old prices, a guessed fee and terms the customer
  // never saw. Prices are re-checked once per visit (or "Try again"), not on every basket change.
  useEffect(() => {
    let cancelled = false
    setChecking(true)
    setLoadFailed(false)
    const ids = items.map((item) => item.id)
    Promise.all([
      fetchDeliveryFee().then((fee) => !cancelled && setDeliveryFee(fee)),
      fetchTerms().then((text) => !cancelled && setPolicies(parseTerms(text.trim() || DEFAULT_TERMS))),
      Promise.all(ids.map((id) => fetchProduct(id).then((p) => [id, p]))).then(
        (entries) => !cancelled && syncItems(Object.fromEntries(entries)),
      ),
    ])
      .catch((error) => {
        console.error(error)
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [attempt])

  const unavailableItems = items.filter((item) => item.unavailable)
  // Wait for prices, the delivery fee and category names (used for labels in the message).
  const loading = checking || categoriesStatus === 'loading'
  const canOrder = !loading && !loadFailed && agreed && unavailableItems.length === 0

  const { name, phone, address } = customer
  useEffect(() => {
    try {
      if (remember) localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ remember, name, phone, address }))
      else localStorage.removeItem(CUSTOMER_KEY)
    } catch {
      // Not critical — the form still works.
    }
  }, [remember, name, phone, address])

  const update = (field) => (event) => {
    setCustomer((c) => ({ ...c, [field]: event.target.value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const clearBasket = () => {
    if (window.confirm('Remove everything from your basket?')) clear()
  }

  const [sentOrder, setSentOrder] = useState(loadSentOrder)
  const [thanked, setThanked] = useState(false)
  const lastOrderAt = useRef(0)
  const itemsKey = orderKey(items)

  // The basket changed after ordering: that order is out of date, so show the form again.
  useEffect(() => {
    if (sentOrder && sentOrder.key !== itemsKey) {
      saveSentOrder(null)
      setSentOrder(null)
    }
  }, [sentOrder, itemsKey])

  const confirmSent = () => {
    saveSentOrder(null)
    setSentOrder(null)
    setThanked(true)
    clear()
  }

  const changeOrder = () => {
    saveSentOrder(null)
    setSentOrder(null)
  }

  const placeOrder = (event) => {
    event.preventDefault()
    // A quick second tap would open WhatsApp twice.
    if (!canOrder || Date.now() - lastOrderAt.current < 2000) return
    const found = validate(customer)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = event.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`)
      first?.focus()
      return
    }

    const trimmed = Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v.trim()]))
    const url = buildWhatsAppUrl(buildOrderMessage({ customer: trimmed, items, subtotal, deliveryFee, categories }))
    lastOrderAt.current = Date.now()
    // The basket is kept until the customer confirms the message was sent.
    const order = { url, key: itemsKey }
    saveSentOrder(order) // before opening: WhatsApp may replace this page
    setSentOrder(order)
    openWhatsApp(url)
  }

  return (
    <div className="bg-page">
      <Header backTo="/shop" backLabel="Shop" />
      <main className="shop basket">
        <h1 className="shop__title">Your basket</h1>

        {thanked && items.length === 0 ? (
          <div className="empty" role="status">
            <p className="basket__empty-text">Thank you for your order!</p>
            <p className="order-sent__thanks">We’ll reply on WhatsApp to confirm it.</p>
            <Link to="/shop" className="btn">
              Back to the shop
            </Link>
          </div>
        ) : items.length === 0 ? (
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

            {sentOrder ? (
              <section className="panel order-sent" aria-labelledby="order-sent-title">
                <h2 id="order-sent-title" className="order-form__title">
                  Almost done!
                </h2>
                <p className="order-form__hint">
                  WhatsApp should have opened with your order. Tap <strong>Send</strong> there to
                  place it.
                </p>
                <p className="order-sent__question">Did your order send?</p>
                <button type="button" className="btn order-form__submit" onClick={confirmSent}>
                  Yes, my order is sent
                </button>
                <button
                  type="button"
                  className="btn btn--ghost order-sent__again"
                  onClick={() => openWhatsApp(sentOrder.url)}
                >
                  No, open WhatsApp again
                </button>
                <button type="button" className="order-sent__change" onClick={changeOrder}>
                  Change my order or details
                </button>
              </section>
            ) : (
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

                <label className="agree remember">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember my details on this device</span>
                </label>

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
                {loadFailed && (
                  <div className="order-form__blocked order-form__failed" role="alert">
                    <p>
                      We couldn’t check the latest prices and delivery fee. Please check your connection
                      and try again.
                    </p>
                    <button type="button" className="btn btn--ghost" onClick={() => setAttempt((a) => a + 1)}>
                      Try again
                    </button>
                  </div>
                )}
                <button type="submit" className="btn order-form__submit" disabled={!canOrder}>
                  {loading ? 'Checking prices…' : 'Order now on WhatsApp'}
                </button>
              </form>
            )}
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
