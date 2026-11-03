import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories.js'
import {
  countProducts,
  createCategory,
  deleteCategory,
  findCategory,
  uniqueId,
  updateCategory,
} from '../../services/categories.js'
import { focusOf, objectPosition } from '../../utils/focus.js'
import { compressThumbnailImage, formatBytes } from '../../utils/imageCompression.js'
import FocusPicker from './FocusPicker.jsx'

const productsLabel = (n) => `${n} ${n === 1 ? 'product' : 'products'}`
const productsAre = (n) => `${productsLabel(n)} ${n === 1 ? 'is' : 'are'}`

export default function AdminCategoryForm() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const fileInput = useRef(null)
  const { status, categories } = useCategories()
  const original = findCategory(categories, id)

  const [name, setName] = useState('')
  const [cover, setCover] = useState(null) // base64 or null
  const [coverFocus, setCoverFocus] = useState(() => focusOf(null)) // { focusX, focusY }
  const [focusing, setFocusing] = useState(false) // focus picker open
  const [coverInfo, setCoverInfo] = useState(null) // { bytes, type } of a newly picked cover
  const [coverStatus, setCoverStatus] = useState('') // '' | 'processing' | error message
  const [subs, setSubs] = useState([]) // [{ id, name }]
  const [newSub, setNewSub] = useState('')
  const [subMessage, setSubMessage] = useState({}) // subId → blocking message
  const [checkingSub, setCheckingSub] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('') // save/delete error
  const [blockedCount, setBlockedCount] = useState(0) // products preventing deletion
  const [loaded, setLoaded] = useState(isNew)

  // Fill the form once the category has loaded.
  useEffect(() => {
    if (isNew || loaded || !original) return
    setName(original.name)
    setCover(original.coverImage ?? null)
    setCoverFocus(focusOf(original))
    setSubs(original.subcategories ?? [])
    setLoaded(true)
  }, [isNew, loaded, original])

  const pickCover = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setCoverStatus('processing')
    try {
      const result = await compressThumbnailImage(file)
      setCover(result.dataUrl)
      setCoverFocus(focusOf(null)) // a new photo starts centred
      setCoverInfo({ bytes: result.bytes, type: result.type })
      setCoverStatus('')
    } catch (e) {
      console.error(e)
      setCoverStatus(e.message || 'Couldn’t read this photo. Please try another one.')
    }
  }

  // ---------- subcategories ----------

  const renameSub = (subId, value) => {
    setSubs((list) => list.map((s) => (s.id === subId ? { ...s, name: value } : s)))
    setErrors((e) => ({ ...e, subs: undefined }))
  }

  const moveSub = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= subs.length) return
    const next = [...subs]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSubs(next)
  }

  const addSub = () => {
    const subName = newSub.trim()
    if (!subName) return
    const taken = [...subs, ...(original?.subcategories ?? [])].map((s) => s.id)
    setSubs((list) => [...list, { id: uniqueId(subName, taken, 'sub'), name: subName }])
    setNewSub('')
  }

  const removeSub = async (sub) => {
    setSubMessage((m) => ({ ...m, [sub.id]: undefined }))
    // Only saved subcategories can have products.
    const saved = original?.subcategories?.some((s) => s.id === sub.id)
    if (saved) {
      setCheckingSub(sub.id)
      try {
        const n = await countProducts(id, sub.id)
        if (n > 0) {
          setSubMessage((m) => ({
            ...m,
            [sub.id]: `Can’t delete: ${productsAre(n)} in “${sub.name}”. Move ${n === 1 ? 'it' : 'them'} to another subcategory or delete ${n === 1 ? 'it' : 'them'} first.`,
          }))
          return
        }
      } catch (e) {
        console.error(e)
        setSubMessage((m) => ({ ...m, [sub.id]: 'Couldn’t check this subcategory. Try again.' }))
        return
      } finally {
        setCheckingSub(null)
      }
    }
    setSubs((list) => list.filter((s) => s.id !== sub.id))
  }

  // ---------- save / delete ----------

  const save = async (event) => {
    event.preventDefault()
    setMessage('')
    const found = {}
    if (!name.trim()) found.name = 'Enter a name.'
    if (subs.some((s) => !s.name.trim())) found.subs = 'Every subcategory needs a name.'
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const cleanSubs = subs.map((s) => ({ id: s.id, name: s.name.trim() }))
    setSaving(true)
    try {
      if (isNew) {
        await createCategory({ name: name.trim(), coverImage: cover, ...coverFocus, subcategories: cleanSubs }, categories)
      } else {
        // Re-check removed subcategories in case products were added meanwhile.
        const removed = (original.subcategories ?? []).filter((s) => !cleanSubs.some((c) => c.id === s.id))
        for (const sub of removed) {
          const n = await countProducts(id, sub.id)
          if (n > 0) {
            setMessage(`“${sub.name}” now has ${productsLabel(n)}, so it can’t be deleted. Nothing was saved.`)
            setSaving(false)
            return
          }
        }
        await updateCategory(id, { name: name.trim(), coverImage: cover, ...coverFocus, subcategories: cleanSubs })
      }
      navigate('/admin/categories', {
        state: { flash: `${isNew ? 'Added' : 'Saved'} “${name.trim()}”` },
      })
    } catch (e) {
      console.error(e)
      setMessage(
        e.code === 'permission-denied'
          ? 'You don’t have permission to save. Check that you’re signed in with an admin account.'
          : 'Couldn’t save. Check your connection and try again.',
      )
      setSaving(false)
    }
  }

  const remove = async () => {
    setMessage('')
    setBlockedCount(0)
    setSaving(true)
    try {
      const n = await countProducts(id)
      if (n > 0) {
        setBlockedCount(n)
        setSaving(false)
        return
      }
      if (!window.confirm(`Delete the category “${original.name}”? This can’t be undone.`)) {
        setSaving(false)
        return
      }
      await deleteCategory(id)
      navigate('/admin/categories', { state: { flash: `Deleted “${original.name}”` } })
    } catch (e) {
      console.error(e)
      setMessage('Couldn’t delete. Please try again.')
      setSaving(false)
    }
  }

  // ---------- render ----------

  if (status !== 'ready' || (!isNew && !loaded)) {
    const missing = status === 'ready' && !original
    return (
      <div className="admin-card admin-center">
        <p className="admin-muted">
          {status === 'error'
            ? 'Couldn’t load categories. Check your connection.'
            : missing
              ? 'This category doesn’t exist anymore.'
              : 'Loading…'}
        </p>
        {(status === 'error' || missing) && (
          <Link to="/admin/categories" className="btn">
            Back to categories
          </Link>
        )}
      </div>
    )
  }

  return (
    <form className="admin-form" onSubmit={save} noValidate>
      <div className="admin-form__head">
        <Link to="/admin/categories" className="admin-link">
          ← Categories
        </Link>
        <h1 className="admin-form__title">{isNew ? 'New category' : 'Edit category'}</h1>
      </div>

      <div className="admin-card">
        <div className={`admin-field${errors.name ? ' admin-field--error' : ''}`}>
          <label className="admin-field__label" htmlFor="field-name">
            Name
          </label>
          <input
            id="field-name"
            type="text"
            maxLength={60}
            dir="auto"
            autoComplete="off"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setErrors((x) => ({ ...x, name: undefined }))
            }}
          />
          {!isNew && (
            <span className="admin-hint">
              Renaming is safe: its products and its link (/shop/{id}) stay the same.
            </span>
          )}
          {errors.name && <span className="admin-field__error">{errors.name}</span>}
        </div>

        <span className="admin-field__label">Cover image (optional)</span>
        <div className="cover-picker">
          <div className="cover-picker__main">
            <button
              type="button"
              className={`photo-picker cover-picker__preview${cover ? ' photo-picker--has-image' : ''}`}
              onClick={() => fileInput.current?.click()}
              disabled={coverStatus === 'processing' || saving}
            >
              {cover ? (
                <img src={cover} alt="Cover preview" style={{ objectPosition: objectPosition(coverFocus) }} />
              ) : (
                <span className="photo-picker__empty">
                  <span className="photo-picker__icon" aria-hidden="true">
                    +
                  </span>
                  Choose a photo
                </span>
              )}
              {coverStatus === 'processing' && (
                <span className="photo-picker__overlay">Preparing photo…</span>
              )}
            </button>
            {cover && (
              <button
                type="button"
                className="photo-tile__focus"
                onClick={() => setFocusing(true)}
                disabled={coverStatus === 'processing' || saving}
              >
                Set focus
              </button>
            )}
          </div>
          {cover && (
            <div className="cover-picker__actions">
              <button type="button" className="admin-item__btn" onClick={() => fileInput.current?.click()}>
                Change
              </button>
              <button
                type="button"
                className="admin-item__btn admin-item__btn--danger"
                onClick={() => {
                  setCover(null)
                  setCoverFocus(focusOf(null))
                  setCoverInfo(null)
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          onChange={pickCover}
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
        {coverInfo && (
          <p className="admin-hint">
            Ready to upload · {formatBytes(coverInfo.bytes)}
            {coverInfo.type === 'image/jpeg' && ' (JPEG — this browser can’t make WebP)'}
          </p>
        )}
        {coverStatus && coverStatus !== 'processing' && <p className="admin-error">{coverStatus}</p>}
        {focusing && cover && (
          <FocusPicker
            variant="category"
            image={cover}
            initial={coverFocus}
            title="cover image"
            cardName={name.trim()}
            onSave={(focus) => {
              setCoverFocus(focus)
              setFocusing(false)
            }}
            onCancel={() => setFocusing(false)}
          />
        )}
      </div>

      <div className="admin-card">
        <h2 className="admin-section-title">Subcategories</h2>
        <p className="admin-hint admin-hint--top">
          Optional. When a category has subcategories, the shop shows them as filter chips.
        </p>

        {subs.length > 0 && (
          <ol className="sub-list">
            {subs.map((sub, index) => (
              <li key={sub.id} className="sub-list__item">
                <div className="sub-list__row">
                  <input
                    type="text"
                    maxLength={60}
                    dir="auto"
                    aria-label={`Subcategory ${index + 1} name`}
                    value={sub.name}
                    onChange={(e) => renameSub(sub.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-order__btn"
                    onClick={() => moveSub(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${sub.name} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-order__btn"
                    onClick={() => moveSub(index, 1)}
                    disabled={index === subs.length - 1}
                    aria-label={`Move ${sub.name} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="admin-order__btn admin-order__btn--danger"
                    onClick={() => removeSub(sub)}
                    disabled={checkingSub === sub.id}
                    aria-label={`Delete ${sub.name}`}
                  >
                    {checkingSub === sub.id ? '…' : '✕'}
                  </button>
                </div>
                {subMessage[sub.id] && (
                  <p className="admin-error admin-error--small" role="alert">
                    {subMessage[sub.id]}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
        {errors.subs && <p className="admin-field__error">{errors.subs}</p>}

        <div className="sub-add">
          <input
            type="text"
            maxLength={60}
            dir="auto"
            placeholder="New subcategory name"
            aria-label="New subcategory name"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSub()
              }
            }}
          />
          <button type="button" className="admin-item__btn" onClick={addSub} disabled={!newSub.trim()}>
            Add
          </button>
        </div>
      </div>

      {message && (
        <p className="admin-error" role="alert">
          {message}
        </p>
      )}
      {blockedCount > 0 && (
        <p className="admin-error" role="alert">
          Can’t delete: {productsAre(blockedCount)} still in “{original.name}”. Move{' '}
          {blockedCount === 1 ? 'it' : 'them'} to another category or delete{' '}
          {blockedCount === 1 ? 'it' : 'them'} first.{' '}
          <Link to={`/admin?category=${id}`} className="admin-inline-link">
            See its products →
          </Link>
        </p>
      )}

      <div className="admin-form__actions">
        <button
          type="submit"
          className="btn admin-form__save"
          disabled={saving || coverStatus === 'processing'}
        >
          {saving ? 'Saving…' : isNew ? 'Add category' : 'Save changes'}
        </button>
        {!isNew && (
          <button type="button" className="admin-form__delete" onClick={remove} disabled={saving}>
            Delete category
          </button>
        )}
      </div>
    </form>
  )
}
