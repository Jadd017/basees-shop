import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { MAX_QUANTITY, useBasket } from '../context/BasketContext.jsx'
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
  const { items, total, setQuantity, removeItem, clear } = useBasket()
  const [customer, setCustomer] = useState(loadCustomer)
  const [errors, setErrors] = useState({})

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
    const found = validate(customer)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = event.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`)
      first?.focus()
      return
    }

    const trimmed = Object.fromEntries(Object.entries(customer).map(([k, v]) => [k, v.trim()]))
    const url = buildWhatsAppUrl(buildOrderMessage({ customer: trimmed, items, total }))
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
                  <li key={item.id} className="basket-item">
                    <Link to={`/product/${item.id}`} className="basket-item__img">
                      <img src={item.imageUrl} alt="" />
                    </Link>
                    <div className="basket-item__info">
                      <Link to={`/product/${item.id}`} className="basket-item__name">
                        {item.name}
                      </Link>
                      <p className="basket-item__unit">{formatPrice(item.price)} each</p>
                      <div className="basket-item__controls">
                        <div className="stepper stepper--small" role="group" aria-label={`Quantity of ${item.name}`}>
                          <button
                            type="button"
                            className="stepper__btn"
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
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
                            disabled={item.quantity >= MAX_QUANTITY}
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

              <div className="basket__total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

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

              <button type="submit" className="btn order-form__submit">
                Order now on WhatsApp
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
