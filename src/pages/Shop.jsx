import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { useCategories } from '../hooks/useCategories.js'
import '../styles/shop.css'

export default function Shop() {
  const { status, categories, retry } = useCategories()

  return (
    <>
      <Header backTo="/" backLabel="Home" />
      <main className="shop">
        <h1 className="shop__title">Shop</h1>
        <p className="shop__subtitle">Handmade pieces, made with love</p>

        {status === 'loading' ? (
          <ul className="category-grid" aria-busy="true" aria-label="Loading categories">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <div className="category-card category-card--skeleton" aria-hidden="true">
                  <span className="category-card__media" />
                  <span className="category-card__body">
                    <span className="skeleton-line" />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : status === 'error' ? (
          <div className="empty">
            <p className="empty__text">We couldn’t load the shop. Please check your connection.</p>
            <button type="button" className="btn" onClick={retry}>
              Try again
            </button>
          </div>
        ) : categories.length === 0 ? (
          <p className="empty">New pieces coming soon</p>
        ) : (
          <ul className="category-grid">
            {categories.map((category) => (
              <li key={category.id}>
                <Link to={`/shop/${category.id}`} className="category-card">
                  <span className="category-card__media">
                    {category.coverImage && <img src={category.coverImage} alt="" loading="lazy" />}
                  </span>
                  <span className="category-card__body">
                    <span className="category-card__name" dir="auto">
                      {category.name}
                    </span>
                    <span className="category-card__cta">
                      Explore <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
