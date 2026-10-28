import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { categories, getCategory } from '../../data/categories.js'
import { deleteProduct, fetchAllProducts, setProductAvailable } from '../../services/products.js'
import { formatPrice } from '../../utils/format.js'

export function categoryLabel(product) {
  const category = getCategory(product.category)
  const sub = category?.subcategories?.find((s) => s.id === product.subcategory)
  return sub ? `${category.name} · ${sub.name}` : category?.name ?? product.category
}

export default function AdminProducts() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = searchParams.get('category') ?? ''

  const [products, setProducts] = useState(null) // null while loading
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [flash, setFlash] = useState(location.state?.flash ?? '')

  useEffect(() => {
    // Show the message passed from the form once, then drop it from history.
    if (location.state?.flash) navigate(location.pathname + location.search, { replace: true })
    fetchAllProducts()
      .then(setProducts)
      .catch((e) => {
        console.error(e)
        setError('Couldn’t load products. Check your connection and refresh.')
        setProducts([])
      })
  }, [])

  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(''), 4000)
    return () => clearTimeout(timer)
  }, [flash])

  const visible = (products ?? []).filter((p) => !filter || p.category === filter)

  const toggleAvailable = async (product) => {
    setBusyId(product.id)
    try {
      await setProductAvailable(product.id, !product.available)
      setProducts((list) =>
        list.map((p) => (p.id === product.id ? { ...p, available: !p.available } : p)),
      )
    } catch (e) {
      console.error(e)
      setError('Couldn’t update the product. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (product) => {
    if (!window.confirm(`Delete “${product.name}”? This can’t be undone.`)) return
    setBusyId(product.id)
    try {
      await deleteProduct(product.id)
      setProducts((list) => list.filter((p) => p.id !== product.id))
      setFlash(`Deleted “${product.name}”`)
    } catch (e) {
      console.error(e)
      setError('Couldn’t delete the product. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="admin-toolbar">
        <label className="admin-select">
          <span className="visually-hidden">Filter by category</span>
          <select
            value={filter}
            onChange={(e) =>
              setSearchParams(e.target.value ? { category: e.target.value } : {}, { replace: true })
            }
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Link
          to="/admin/products/new"
          state={filter ? { category: filter } : undefined}
          className="btn admin-toolbar__add"
        >
          + Add product
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

      {products === null ? (
        <p className="admin-muted admin-center">Loading products…</p>
      ) : visible.length === 0 ? (
        <div className="admin-card admin-center">
          <p className="admin-muted">
            {filter ? 'No products in this category yet.' : 'No products yet.'}
          </p>
          <Link
            to="/admin/products/new"
            state={filter ? { category: filter } : undefined}
            className="btn"
          >
            + Add your first product
          </Link>
        </div>
      ) : (
        <>
          <p className="admin-count">
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
          </p>
          <ul className="admin-list">
            {visible.map((product) => (
              <li key={product.id} className="admin-card admin-item">
                <Link to={`/admin/products/${product.id}`} className="admin-item__main">
                  <span className="admin-item__img">
                    {product.thumbnail && <img src={product.thumbnail} alt="" />}
                  </span>
                  <span className="admin-item__text">
                    <span className="admin-item__name">{product.name}</span>
                    <span className="admin-item__meta">
                      {formatPrice(product.price)} · {categoryLabel(product)}
                    </span>
                  </span>
                </Link>
                <div className="admin-item__actions">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={product.available}
                      disabled={busyId === product.id}
                      onChange={() => toggleAvailable(product)}
                    />
                    <span className="switch__track" aria-hidden="true" />
                    <span className="switch__label">
                      {product.available ? 'Available' : 'Hidden'}
                    </span>
                  </label>
                  <Link to={`/admin/products/${product.id}`} className="admin-item__btn">
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="admin-item__btn admin-item__btn--danger"
                    disabled={busyId === product.id}
                    onClick={() => remove(product)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
