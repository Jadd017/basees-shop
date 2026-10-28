import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCategories } from '../../hooks/useCategories.js'
import { countProducts, saveCategoryOrder } from '../../services/categories.js'

export default function AdminCategories() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, categories, retry } = useCategories()

  const [list, setList] = useState([]) // local copy so reordering feels instant
  const [counts, setCounts] = useState({}) // categoryId → number of products
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(location.state?.flash ?? '')

  useEffect(() => {
    if (location.state?.flash) navigate(location.pathname, { replace: true })
  }, [location, navigate])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(''), 4000)
    return () => clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    if (status !== 'ready') return
    setList(categories)
    let cancelled = false
    Promise.all(categories.map((c) => countProducts(c.id).then((n) => [c.id, n])))
      .then((entries) => !cancelled && setCounts(Object.fromEntries(entries)))
      .catch((e) => console.error(e))
    return () => {
      cancelled = true
    }
  }, [status, categories])

  const move = async (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= list.length) return
    const previous = list
    const next = [...list]
    ;[next[index], next[target]] = [next[target], next[index]]
    setList(next)
    setSaving(true)
    setError('')
    try {
      await saveCategoryOrder(next.map((c) => c.id))
    } catch (e) {
      console.error(e)
      setList(previous)
      setError('Couldn’t save the new order. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') return <p className="admin-muted admin-center">Loading categories…</p>
  if (status === 'error') {
    return (
      <div className="admin-card admin-center">
        <p className="admin-muted">Couldn’t load categories. Check your connection.</p>
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="admin-toolbar">
        <p className="admin-toolbar__text">Use ↑ ↓ to change the order in the shop.</p>
        <Link to="/admin/categories/new" className="btn admin-toolbar__add">
          + Add category
        </Link>
      </div>

      {flash && (
        <p className="admin-flash" role="status">
          ✓ {flash}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {list.length === 0 ? (
        <div className="admin-card admin-center">
          <p className="admin-muted">No categories yet.</p>
        </div>
      ) : (
        <ol className="admin-list">
          {list.map((category, index) => {
            const count = counts[category.id]
            const subs = category.subcategories?.length ?? 0
            return (
              <li key={category.id} className="admin-card admin-item admin-item--row">
                <Link to={`/admin/categories/${category.id}`} className="admin-item__main">
                  <span className="admin-item__img">
                    {category.coverImage && <img src={category.coverImage} alt="" />}
                  </span>
                  <span className="admin-item__text">
                    <span className="admin-item__name" dir="auto">
                      {category.name}
                    </span>
                    <span className="admin-item__meta">
                      {count === undefined ? '…' : `${count} ${count === 1 ? 'product' : 'products'}`}
                      {subs > 0 && ` · ${subs} ${subs === 1 ? 'subcategory' : 'subcategories'}`}
                    </span>
                  </span>
                </Link>
                <div className="admin-order">
                  <button
                    type="button"
                    className="admin-order__btn"
                    onClick={() => move(index, -1)}
                    disabled={saving || index === 0}
                    aria-label={`Move ${category.name} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-order__btn"
                    onClick={() => move(index, 1)}
                    disabled={saving || index === list.length - 1}
                    aria-label={`Move ${category.name} down`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
