import { Link } from 'react-router-dom'
import './Header.css'

// Small header shown on every page except Home.
// `backTo` is the logical parent page, so "back" works even when opened from a shared link.
export default function Header({ backTo = '/', backLabel = 'Home' }) {
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
      <span className="header__spacer" />
    </header>
  )
}
