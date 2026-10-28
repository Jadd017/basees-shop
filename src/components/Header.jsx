import { Link } from 'react-router-dom'
import { useBasket } from '../context/BasketContext.jsx'
import './Header.css'

// Small header shown on every page except Home.
// `backTo` is the logical parent page, so "back" works even when opened from a shared link.
export default function Header({ backTo = '/', backLabel = 'Home' }) {
  const { count } = useBasket()

  return (
    <header className="header">
      <Link to={backTo} className="header__back">
        <span aria-hidden="true">←</span> {backLabel}
      </Link>
      <Link to="/" className="header__logo" aria-label="Basees — home">
        <span className="header__logo-en">Basees</span>
        <span className="header__logo-ar" lang="ar">
          بَصيص
        </span>
      </Link>
      <Link
        to="/basket"
        className="header__basket"
        aria-label={`Basket, ${count} ${count === 1 ? 'item' : 'items'}`}
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M5 9h14l-1.3 9.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5 9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 9V7a3 3 0 0 1 6 0v2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {count > 0 && (
          // Keyed by count so the badge re-mounts and plays its bump animation on every change.
          <span key={count} className="header__count header__count--bump" aria-hidden="true">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </header>
  )
}
