import { Link } from 'react-router-dom'

// Placeholder — categories come in a later phase.
export default function Shop() {
  return (
    <main className="page">
      <div className="page__inner">
        <Link to="/" className="btn btn--ghost">
          <span aria-hidden="true">←</span> Home
        </Link>
        <h1 className="page__title">Shop</h1>
        <p className="page__subtitle">Our handmade collection is coming soon.</p>
      </div>
    </main>
  )
}
