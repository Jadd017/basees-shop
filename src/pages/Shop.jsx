import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { categories } from '../data/categories.js'
import '../styles/shop.css'

export default function Shop() {
  return (
    <>
      <Header backTo="/" backLabel="Home" />
      <main className="shop">
        <h1 className="shop__title">Shop</h1>
        <p className="shop__subtitle">Handmade pieces, made with love</p>

        <ul className="category-grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Link to={`/shop/${category.id}`} className="category-card">
                <span className="category-card__name">{category.name}</span>
                <span className="category-card__cta">
                  Explore <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
