import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories.js'
import { findCategory } from '../../services/categories.js'
import {
  createProduct,
  deleteProduct,
  fetchProductForAdmin,
  updateProduct,
} from '../../services/products.js'
import { compressProductImage, formatBytes } from '../../utils/imageCompression.js'

const SHORT_MAX = 120

const emptyForm = {
  name: '',
  price: '',
  category: '',
  subcategory: '',
  shortDescription: '',
  fullDescription: '',
  available: true,
}

function validate(form, hasImage, category) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Enter a name.'
  const price = Number(String(form.price).replace(',', '.'))
  if (form.price === '' || !Number.isFinite(price) || price <= 0) errors.price = 'Enter a price, e.g. 12 or 12.50.'
  if (!form.category) errors.category = 'Choose a category.'
  else if (category?.subcategories?.length && !form.subcategory)
    errors.subcategory = 'Choose a subcategory.'
  if (!form.shortDescription.trim()) errors.shortDescription = 'Enter a short description.'
  if (!form.fullDescription.trim()) errors.fullDescription = 'Enter a full description.'
  if (!hasImage) errors.image = 'Add a photo.'
  return errors
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const location = useLocation()
  const fileInput = useRef(null)
  const { status: categoriesStatus, categories } = useCategories()

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    category: location.state?.category ?? '',
  }))
  const [loadState, setLoadState] = useState(isNew ? 'ready' : 'loading') // loading | ready | missing | error
  const [currentThumb, setCurrentThumb] = useState(null) // existing image when editing
  const [images, setImages] = useState(null) // newly picked & compressed { thumbnail, image }
  const [imageStatus, setImageStatus] = useState('') // '' | 'processing' | error message
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (isNew) return
    fetchProductForAdmin(id)
      .then((product) => {
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
        setCurrentThumb(product.thumbnail ?? null)
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
      // Changing category clears a candle type that no longer applies.
      ...(field === 'category' ? { subcategory: '' } : {}),
    }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const pickImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow picking the same file again
    if (!file) return
    setImageStatus('processing')
    setErrors((e) => ({ ...e, image: undefined }))
    try {
      const result = await compressProductImage(file)
      setImages({ thumbnail: result.thumbnail, image: result.image })
      setImageStatus('')
    } catch (e) {
      console.error(e)
      setImageStatus(e.message || 'Couldn’t read this photo. Please try another one.')
    }
  }

  const save = async (event) => {
    event.preventDefault()
    setSaveError('')
    const found = validate(form, Boolean(images || currentThumb), category)
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
    const imageData = images
      ? { thumbnail: images.thumbnail.dataUrl, image: images.image.dataUrl }
      : null

    setSaving(true)
    try {
      if (isNew) await createProduct(fields, imageData)
      else await updateProduct(id, fields, imageData)
      navigate(`/admin${form.category ? `?category=${form.category}` : ''}`, {
        state: { flash: `${isNew ? 'Added' : 'Saved'} “${fields.name}”` },
      })
    } catch (e) {
      console.error(e)
      setSaveError(
        e.code === 'permission-denied'
          ? 'You don’t have permission to save. Check that you’re signed in with the shop account.'
          : 'Couldn’t save. Check your connection and try again.',
      )
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete “${form.name}”? This can’t be undone.`)) return
    setSaving(true)
    try {
      await deleteProduct(id)
      navigate('/admin', { state: { flash: `Deleted “${form.name}”` } })
    } catch (e) {
      console.error(e)
      setSaveError('Couldn’t delete. Please try again.')
      setSaving(false)
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

  const preview = images?.image.dataUrl ?? currentThumb

  return (
    <form className="admin-form" onSubmit={save} noValidate>
      <div className="admin-form__head">
        <Link to="/admin" className="admin-link">
          ← Products
        </Link>
        <h1 className="admin-form__title">{isNew ? 'New product' : 'Edit product'}</h1>
      </div>

      {/* Photo */}
      <div className="admin-card" id="field-image">
        <span className="admin-field__label">Photo</span>
        <button
          type="button"
          className={`photo-picker${preview ? ' photo-picker--has-image' : ''}${errors.image ? ' photo-picker--error' : ''}`}
          onClick={() => fileInput.current?.click()}
          disabled={imageStatus === 'processing' || saving}
        >
          {preview ? (
            <img src={preview} alt="Product preview" />
          ) : (
            <span className="photo-picker__empty">
              <span className="photo-picker__icon" aria-hidden="true">
                +
              </span>
              Choose a photo
            </span>
          )}
          {imageStatus === 'processing' && (
            <span className="photo-picker__overlay">Preparing photo…</span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={pickImage}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        {preview && imageStatus !== 'processing' && (
          <button type="button" className="admin-item__btn photo-picker__replace" onClick={() => fileInput.current?.click()}>
            {isNew && !currentThumb ? 'Choose a different photo' : 'Replace photo'}
          </button>
        )}
        {images && (
          <p className="admin-hint">
            Ready to upload · thumbnail {formatBytes(images.thumbnail.bytes)} · full photo{' '}
            {formatBytes(images.image.bytes)}
            {images.image.type === 'image/jpeg' && ' (JPEG — this browser can’t make WebP)'}
          </p>
        )}
        {imageStatus && imageStatus !== 'processing' && <p className="admin-error">{imageStatus}</p>}
        {errors.image && <p className="admin-field__error">{errors.image}</p>}
      </div>

      {/* Details */}
      <div className="admin-card">
        <Field id="name" label="Name" error={errors.name}>
          <input id="field-name" type="text" value={form.name} onChange={set('name')} autoComplete="off" />
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
        <button type="submit" className="btn admin-form__save" disabled={saving || imageStatus === 'processing'}>
          {saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}
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
