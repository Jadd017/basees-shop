import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories.js'
import { findCategory } from '../../services/categories.js'
import {
  MAX_PHOTOS,
  deleteProduct,
  fetchProductForAdmin,
  fetchProductPhotos,
  newPhotoId,
  newProductId,
  saveProduct,
} from '../../services/products.js'
import {
  compressProductImage,
  formatBytes,
  thumbnailFromDataUrl,
} from '../../utils/imageCompression.js'
import { focusOf, objectPosition } from '../../utils/focus.js'
import { formatPrice } from '../../utils/format.js'
import FocusPicker from './FocusPicker.jsx'

// Text limits — firestore.rules enforces the same ones.
const NAME_MAX = 150
const SHORT_MAX = 120
const FULL_MAX = 5000

const emptyForm = {
  name: '',
  price: '',
  category: '',
  subcategory: '',
  shortDescription: '',
  fullDescription: '',
  available: true,
}

function validate(form, photoCount, category) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter a name.'
  const price = Number(String(form.price).replace(',', '.'))
  if (form.price === '' || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price, e.g. 12 or 12.50.'
  if (!form.category) errors.category = 'Choose a category.'
  else if (category?.subcategories?.length && !form.subcategory)
    errors.subcategory = 'Choose a subcategory.'
  if (!form.shortDescription.trim()) errors.shortDescription = 'Enter a short description.'
  if (!form.fullDescription.trim()) errors.fullDescription = 'Enter a full description.'
  if (photoCount === 0) errors.image = 'Add at least one photo.'
  return errors
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const fileInput = useRef(null)
  const { status: categoriesStatus, categories } = useCategories()

  // A new product gets its id up front, so its photos can be uploaded under it and a retried
  // save reuses the same ids instead of duplicating.
  const [productId] = useState(() => id ?? newProductId())
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    category: location.state?.category ?? '',
  }))
  const [loadState, setLoadState] = useState(isNew ? 'ready' : 'loading') // loading | ready | missing | error
  // Photos in display order (first = main photo):
  // { id, image, isNew, focusX, focusY, thumbnail?, bytes?, type? } — the last three only for
  // newly picked photos
  const [photos, setPhotos] = useState([])
  const [focusingId, setFocusingId] = useState(null) // photo whose focus picker is open
  const [savedPhotos, setSavedPhotos] = useState([]) // as loaded, to work out deletions
  const [processing, setProcessing] = useState(0) // picked photos still being compressed
  const [photoMessage, setPhotoMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (isNew) return
    Promise.all([fetchProductForAdmin(id), fetchProductPhotos(id, { fresh: true })])
      .then(([product, loadedPhotos]) => {
        if (!product) return setLoadState('missing')
        setForm({
          name: product.name ?? '',
          price: String(product.price ?? ''),
          category: product.category ?? '',
          subcategory: product.subcategory ?? '',
          shortDescription: product.shortDescription ?? '',
          fullDescription: product.fullDescription ?? '',
          available: product.available !== false,
        })
        const list = loadedPhotos.map((p) => ({ id: p.id, image: p.image, isNew: false, ...focusOf(p) }))
        setPhotos(list)
        setSavedPhotos(list)
        setLoadState('ready')
      })
      .catch((e) => {
        console.error(e)
        setLoadState('error')
      })
  }, [id, isNew])

  const category = findCategory(categories, form.category)

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({
      ...f,
      [field]: value,
      // Changing category clears a subcategory that no longer applies.
      ...(field === 'category' ? { subcategory: '' } : {}),
    }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  // ---------- photos ----------

  const pickPhotos = async (event) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = '' // allow picking the same files again
    if (files.length === 0) return
    setErrors((e) => ({ ...e, image: undefined }))

    const room = Math.max(0, MAX_PHOTOS - photos.length - processing)
    const accepted = files.slice(0, room)
    setPhotoMessage(
      files.length > accepted.length
        ? `A product can have up to ${MAX_PHOTOS} photos, so ${accepted.length} of the ${files.length} you chose ${accepted.length === 1 ? 'was' : 'were'} added.`
        : '',
    )

    // One at a time keeps memory low on phones; each photo appears as soon as it's ready.
    setProcessing((n) => n + accepted.length)
    for (const file of accepted) {
      try {
        const result = await compressProductImage(file)
        setPhotos((list) => [
          ...list,
          {
            id: newPhotoId(productId),
            image: result.image.dataUrl,
            thumbnail: result.thumbnail.dataUrl,
            bytes: result.image.bytes,
            type: result.image.type,
            isNew: true,
            ...focusOf(null), // centre until the admin sets a focus
          },
        ])
      } catch (e) {
        console.error(e)
        setPhotoMessage(e.message || 'Couldn’t read one of the photos. Please try another one.')
      } finally {
        setProcessing((n) => n - 1)
      }
    }
  }

  const movePhoto = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= photos.length) return
    const next = [...photos]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPhotos(next)
  }

  const removePhoto = (photoId) => {
    setPhotos((list) => list.filter((p) => p.id !== photoId))
    setPhotoMessage('')
  }

  const setPhotoFocus = (photoId, focus) => {
    setPhotos((list) => list.map((p) => (p.id === photoId ? { ...p, ...focus } : p)))
    setFocusingId(null)
  }

  // ---------- save / delete ----------

  const save = async (event) => {
    event.preventDefault()
    setSaveError('')
    const found = validate(form, photos.length, category)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0]
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const fields = {
      name: form.name.trim(),
      price: Math.round(Number(String(form.price).replace(',', '.')) * 100) / 100,
      category: form.category,
      subcategory: category?.subcategories?.length ? form.subcategory : null,
      shortDescription: form.shortDescription.trim(),
      fullDescription: form.fullDescription.trim(),
      available: form.available,
    }

    setSaving(true)
    try {
      // The thumbnail always comes from the first photo; rebuild it only when that changed.
      const main = photos[0]
      let thumbnail = null
      if (main.id !== savedPhotos[0]?.id) {
        setProgress('Preparing thumbnail…')
        thumbnail = main.thumbnail ?? (await thumbnailFromDataUrl(main.image)).dataUrl
      }
      await saveProduct({
        productId,
        isNew,
        fields,
        thumbnail,
        photos,
        removedPhotoIds: savedPhotos.filter((s) => !photos.some((p) => p.id === s.id)).map((s) => s.id),
        onProgress: setProgress,
      })
      navigate(`/admin${form.category ? `?category=${form.category}` : ''}`, {
        state: { flash: `${isNew ? 'Added' : 'Saved'} “${fields.name}”` },
      })
    } catch (e) {
      console.error(e)
      setSaveError(
        e.code === 'permission-denied'
          ? 'You don’t have permission to save. Check that you’re signed in with the shop account.'
          : 'Couldn’t save. Check your connection and try again — nothing will be duplicated.',
      )
      setSaving(false)
      setProgress('')
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete “${form.name}” and all its photos? This can’t be undone.`)) return
    setSaving(true)
    setProgress('Deleting…')
    try {
      await deleteProduct(id)
      navigate('/admin', { state: { flash: `Deleted “${form.name}”` } })
    } catch (e) {
      console.error(e)
      setSaveError('Couldn’t delete. Please try again.')
      setSaving(false)
      setProgress('')
    }
  }

  if (loadState !== 'ready') {
    return (
      <div className="admin-card admin-center">
        <p className="admin-muted">
          {loadState === 'loading'
            ? 'Loading…'
            : loadState === 'missing'
              ? 'This product doesn’t exist anymore.'
              : 'Couldn’t load this product. Check your connection.'}
        </p>
        {loadState !== 'loading' && (
          <Link to="/admin" className="btn">
            Back to products
          </Link>
        )}
      </div>
    )
  }

  const canAdd = photos.length + processing < MAX_PHOTOS
  const newBytes = photos.filter((p) => p.isNew).reduce((sum, p) => sum + p.bytes, 0)
  const focusingIndex = photos.findIndex((p) => p.id === focusingId)
  const focusingPhoto = photos[focusingIndex]
  const typedPrice = Number(String(form.price).replace(',', '.'))
  const previewPrice = form.price !== '' && Number.isFinite(typedPrice) && typedPrice > 0 ? formatPrice(typedPrice) : ''

  return (
    <form className="admin-form" onSubmit={save} noValidate>
      <div className="admin-form__head">
        <Link to="/admin" className="admin-link">
          ← Products
        </Link>
        <h1 className="admin-form__title">{isNew ? 'New product' : 'Edit product'}</h1>
      </div>

      {/* Photos */}
      <div className="admin-card" id="field-image">
        <span className="admin-field__label">
          Photos{' '}
          <span className="admin-photo-count">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </span>
        <p className="admin-hint admin-hint--top">
          The first photo is the main one — it’s used for the thumbnail in the shop. “Set focus”
          chooses what stays in view when a photo is cropped to a square; it’s saved with the
          product.
        </p>

        <ol className={`photo-strip${errors.image ? ' photo-strip--error' : ''}`}>
          {photos.map((photo, index) => (
            <li key={photo.id} className="photo-tile">
              <div className="photo-tile__img">
                <img
                  src={photo.image}
                  alt={`Photo ${index + 1}`}
                  style={{ objectPosition: objectPosition(photo) }}
                />
                {index === 0 && <span className="photo-tile__main">Main photo</span>}
                <button
                  type="button"
                  className="photo-tile__remove"
                  onClick={() => removePhoto(photo.id)}
                  disabled={saving}
                  aria-label={`Delete photo ${index + 1}`}
                >
                  ×
                </button>
              </div>
              <div className="photo-tile__move">
                <button
                  type="button"
                  className="admin-order__btn"
                  onClick={() => movePhoto(index, -1)}
                  disabled={saving || index === 0}
                  aria-label={`Move photo ${index + 1} left`}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="admin-order__btn"
                  onClick={() => movePhoto(index, 1)}
                  disabled={saving || index === photos.length - 1}
                  aria-label={`Move photo ${index + 1} right`}
                >
                  →
                </button>
              </div>
              <button
                type="button"
                className="photo-tile__focus"
                onClick={() => setFocusingId(photo.id)}
                disabled={saving}
                aria-label={`Set focus for photo ${index + 1}`}
              >
                Set focus
              </button>
            </li>
          ))}
          {Array.from({ length: processing }, (_, i) => (
            <li key={`processing-${i}`} className="photo-tile">
              <div className="photo-tile__img photo-tile__img--busy">Preparing…</div>
            </li>
          ))}
          {canAdd && (
            <li className="photo-tile">
              <button
                type="button"
                className="photo-tile__img photo-tile__add"
                onClick={() => fileInput.current?.click()}
                disabled={saving}
              >
                <span className="photo-picker__icon" aria-hidden="true">
                  +
                </span>
                {photos.length === 0 ? 'Add photos' : 'Add more'}
              </button>
            </li>
          )}
        </ol>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={pickPhotos}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        {newBytes > 0 && (
          <p className="admin-hint">
            New photos ready to upload · {formatBytes(newBytes)} in total
            {photos.some((p) => p.type === 'image/jpeg') && ' (JPEG — this browser can’t make WebP)'}
          </p>
        )}
        {photoMessage && <p className="admin-error admin-error--small">{photoMessage}</p>}
        {errors.image && <p className="admin-field__error">{errors.image}</p>}
        {focusingPhoto && (
          <FocusPicker
            image={focusingPhoto.image}
            initial={focusingPhoto}
            title={focusingIndex === 0 ? 'main photo' : `photo ${focusingIndex + 1}`}
            cardName={form.name.trim()}
            cardPrice={previewPrice}
            onSave={(focus) => setPhotoFocus(focusingPhoto.id, focus)}
            onCancel={() => setFocusingId(null)}
          />
        )}
      </div>

      {/* Details */}
      <div className="admin-card">
        <Field id="name" label="Name" error={errors.name}>
          <input
            id="field-name"
            type="text"
            maxLength={NAME_MAX}
            value={form.name}
            onChange={set('name')}
            autoComplete="off"
          />
        </Field>

        <Field id="price" label="Price (USD)" error={errors.price}>
          <div className="admin-price">
            <span aria-hidden="true">$</span>
            <input
              id="field-price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={form.price}
              onChange={set('price')}
            />
          </div>
        </Field>

        <Field id="category" label="Category" error={errors.category}>
          <select
            id="field-category"
            value={form.category}
            onChange={set('category')}
            disabled={categoriesStatus !== 'ready'}
          >
            <option value="" disabled>
              {categoriesStatus === 'loading'
                ? 'Loading categories…'
                : categoriesStatus === 'error'
                  ? 'Couldn’t load categories — refresh'
                  : 'Choose…'}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {category?.subcategories?.length > 0 && (
          <Field id="subcategory" label="Subcategory" error={errors.subcategory}>
            <select id="field-subcategory" value={form.subcategory} onChange={set('subcategory')}>
              <option value="" disabled>
                Choose…
              </option>
              {category.subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field
          id="shortDescription"
          label="Short description"
          hint={`Shown on the product cards · ${form.shortDescription.length}/${SHORT_MAX}`}
          error={errors.shortDescription}
        >
          <textarea
            id="field-shortDescription"
            rows={2}
            maxLength={SHORT_MAX}
            dir="auto"
            value={form.shortDescription}
            onChange={set('shortDescription')}
          />
        </Field>

        <Field
          id="fullDescription"
          label="Full description"
          hint="Shown on the product page"
          error={errors.fullDescription}
        >
          <textarea
            id="field-fullDescription"
            rows={5}
            dir="auto"
            maxLength={FULL_MAX}
            value={form.fullDescription}
            onChange={set('fullDescription')}
          />
        </Field>

        <label className="switch switch--large">
          <input type="checkbox" checked={form.available} onChange={set('available')} />
          <span className="switch__track" aria-hidden="true" />
          <span className="switch__label">
            {form.available ? 'Available — shown in the shop' : 'Hidden — not shown in the shop'}
          </span>
        </label>
      </div>

      {saveError && (
        <p className="admin-error" role="alert">
          {saveError}
        </p>
      )}

      <div className="admin-form__actions">
        <button type="submit" className="btn admin-form__save" disabled={saving || processing > 0}>
          {saving
            ? progress || 'Saving…'
            : processing > 0
              ? 'Preparing photos…'
              : isNew
                ? 'Add product'
                : 'Save changes'}
        </button>
        {!isNew && (
          <button type="button" className="admin-form__delete" onClick={remove} disabled={saving}>
            Delete product
          </button>
        )}
      </div>
    </form>
  )
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className={`admin-field${error ? ' admin-field--error' : ''}`}>
      <label className="admin-field__label" htmlFor={`field-${id}`}>
        {label}
      </label>
      {children}
      {hint && <span className="admin-hint">{hint}</span>}
      {error && <span className="admin-field__error">{error}</span>}
    </div>
  )
}
