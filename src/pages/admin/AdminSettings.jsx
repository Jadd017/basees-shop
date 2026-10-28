import { useEffect, useState } from 'react'
import { DEFAULT_TERMS, parseTerms } from '../../data/defaultTerms.js'
import {
  fetchDeliveryFee,
  fetchTerms,
  saveDeliveryFee,
  saveTerms,
} from '../../services/settings.js'
import { formatPrice } from '../../utils/format.js'

const saveErrorMessage = (e) =>
  e.code === 'permission-denied'
    ? 'You don’t have permission to save. Check that you’re signed in with an admin account.'
    : 'Couldn’t save. Check your connection and try again.'

export default function AdminSettings() {
  return (
    <div className="admin-form">
      <div className="admin-form__head">
        <h1 className="admin-form__title">Settings</h1>
      </div>
      <DeliverySettings />
      <TermsSettings />
    </div>
  )
}

function DeliverySettings() {
  const [value, setValue] = useState(null) // input text; null while loading
  const [saved, setSaved] = useState(null) // number as saved
  const [status, setStatus] = useState('') // '' | 'saving' | 'saved' | error message

  useEffect(() => {
    fetchDeliveryFee()
      .then((fee) => {
        setValue(String(fee))
        setSaved(fee)
      })
      .catch((e) => {
        console.error(e)
        setStatus('Couldn’t load the delivery fee. Check your connection and refresh.')
        setValue('')
      })
  }, [])

  const fee = Number(String(value ?? '').replace(',', '.'))
  const valid = value !== null && value.trim() !== '' && Number.isFinite(fee) && fee >= 0
  const rounded = Math.round(fee * 100) / 100
  const changed = valid && rounded !== saved

  const save = async (event) => {
    event.preventDefault()
    if (!changed) return
    setStatus('saving')
    try {
      await saveDeliveryFee(rounded)
      setSaved(rounded)
      setValue(String(rounded))
      setStatus('saved')
    } catch (e) {
      console.error(e)
      setStatus(saveErrorMessage(e))
    }
  }

  return (
    <form className="admin-card" onSubmit={save} noValidate>
      <h2 className="admin-section-title">Delivery fee</h2>
      <p className="admin-hint admin-hint--top">
        Added to every order in the basket and in the WhatsApp message.
      </p>
      {value === null ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <>
          <div className={`admin-field${value && !valid ? ' admin-field--error' : ''}`}>
            <label className="admin-field__label" htmlFor="field-delivery">
              Delivery (USD)
            </label>
            <div className="admin-price">
              <span aria-hidden="true">$</span>
              <input
                id="field-delivery"
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (status === 'saved') setStatus('')
                }}
              />
            </div>
            {value && !valid && (
              <span className="admin-field__error">Enter an amount, e.g. 5 or 3.50 (0 for free).</span>
            )}
          </div>
          {status && status !== 'saving' && status !== 'saved' && (
            <p className="admin-error" role="alert">
              {status}
            </p>
          )}
          {status === 'saved' && !changed && (
            <p className="admin-flash" role="status">
              ✓ Saved — delivery is now {formatPrice(saved)}
            </p>
          )}
          <button type="submit" className="btn admin-settings__save" disabled={!changed || status === 'saving'}>
            {status === 'saving' ? 'Saving…' : changed ? 'Save delivery fee' : 'No changes'}
          </button>
        </>
      )}
    </form>
  )
}

function TermsSettings() {
  const [text, setText] = useState(null) // null while loading
  const [saved, setSaved] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetchTerms()
      .then((terms) => {
        // Nothing saved yet → start from the text the basket currently shows.
        setText(terms || DEFAULT_TERMS)
        setSaved(terms)
      })
      .catch((e) => {
        console.error(e)
        setStatus('Couldn’t load the terms. Check your connection and refresh.')
        setText('')
      })
  }, [])

  const save = async (event) => {
    event.preventDefault()
    setStatus('saving')
    try {
      await saveTerms(text.trim())
      setSaved(text.trim())
      setStatus('saved')
    } catch (e) {
      console.error(e)
      setStatus(saveErrorMessage(e))
    }
  }

  const changed = text !== null && text.trim() !== saved
  const count = text ? parseTerms(text).length : 0

  return (
    <form className="admin-card" onSubmit={save}>
      <h2 className="admin-section-title">Terms &amp; Policies</h2>
      <p className="admin-hint admin-hint--top">
        Shown in the basket. Put each policy’s title on its own line with its text underneath, and
        leave an empty line between policies.
      </p>
      {text === null ? (
        <p className="admin-muted">Loading…</p>
      ) : (
        <>
          <label className="visually-hidden" htmlFor="terms-text">
            Terms text
          </label>
          <textarea
            id="terms-text"
            className="admin-story admin-terms"
            dir="auto"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (status === 'saved') setStatus('')
            }}
          />
          <p className="admin-hint">
            {count} {count === 1 ? 'policy' : 'policies'}
          </p>
          {status && status !== 'saving' && status !== 'saved' && (
            <p className="admin-error" role="alert">
              {status}
            </p>
          )}
          {status === 'saved' && !changed && (
            <p className="admin-flash" role="status">
              ✓ Saved — it’s live in the basket
            </p>
          )}
          <button
            type="submit"
            className="btn admin-settings__save"
            disabled={status === 'saving' || !changed || !text.trim()}
          >
            {status === 'saving' ? 'Saving…' : changed ? 'Save terms' : 'No changes'}
          </button>
        </>
      )}
    </form>
  )
}
