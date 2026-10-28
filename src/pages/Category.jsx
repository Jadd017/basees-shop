import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { getCategory } from '../data/categories.js'
import { fetchProductsByCategory } from '../services/products.js'
import '../styles/shop.css'

export default function Category() {
  const { category: categoryId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const category = getCategory(categoryId)

  // { status: 'loading' | 'ready' | 'error', products }
  const [state, setState] = useState({ status: 'loading', products: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!category) return
    let cancelled = false
    setState({ status: 'loading', products: [] })
    fetchProductsByCategory(category.id)
      .then((products) => !cancelled && setState({ status: 'ready', products }))
      .catch((error) => {
        console.error(error)
        if (!cancelled) setState({ status: 'error', products: [] })
      })
    return () => {
      cancelled = true
    }
  }, [category, attempt])

  if (!category) {
    return (
      <div className="bg-page">
        <Header backTo="/shop" backLabel="Shop" />
        <main className="shop">
          <h1 className="shop__title">Category not found</h1>
          <p className="empty">
            <Link to="/shop" className="btn">
              Browse all categories
            </Link>
          </p>
        </main>
      </div>
    )
  }

  // The selected subcategory lives in the URL (?sub=...) so going back from a product keeps it.
  const subcategories = category.subcategories ?? []
  const activeSub = subcategories.some((s) => s.id === searchParams.get('sub'))
    ? searchParams.get('sub')
    : null

  const products = state.products.filter((p) => !activeSub || p.subcategory === activeSub)

  const selectSub = (subId) => {
    setSearchParams(subId ? { sub: subId } : {}, { replace: true })
  }

  return (
    <div className="bg-page">
      <Header backTo="/shop" backLabel="Shop" />
      <main className="shop">
        <h1 className="shop__title">{category.name}</h1>

        {subcategories.length > 0 && (
          <div className="chips" role="group" aria-label="Filter by type">
            <button
              type="button"
              className="chip"
              aria-pressed={!activeSub}
              onClick={() => selectSub(null)}
            >
              All
            </button>
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className="chip"
                aria-pressed={activeSub === sub.id}
                onClick={() => selectSub(sub.id)}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        {state.status === 'loading' ? (
          <ul className="product-grid" aria-busy="true" aria-label="Loading products">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <div className="product-card product-card--skeleton" aria-hidden="true">
                  <div className="product-card__media" />
                  <div className="product-card__body">
                    <span className="skeleton-line" />
                    <span className="skeleton-line skeleton-line--short" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : state.status === 'error' ? (
          <div className="empty">
            <p className="empty__text">We couldn’t load the products. Please check your connection.</p>
            <button type="button" className="btn" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        ) : products.length > 0 ? (
          <ul className="product-grid">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} from={location.pathname + location.search} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">New pieces coming soon</p>
        )}
      </main>
    </div>
  )
}
