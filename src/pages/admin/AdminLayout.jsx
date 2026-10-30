import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { signIn, signOut, useIsAdmin, useUser } from './auth.js'
import './admin.css'

export default function AdminLayout() {
  const user = useUser()
  const isAdmin = useIsAdmin(user)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setError('')
    try {
      await signIn()
    } catch (e) {
      console.error(e)
      setError(
        e.code === 'auth/unauthorized-domain'
          ? 'This address isn’t allowed to sign in yet. Add it under Firebase → Authentication → Settings → Authorized domains.'
          : 'Sign-in failed. Please try again.',
      )
    }
  }

  if (user === undefined || (user && isAdmin === undefined)) {
    return (
      <div className="admin-gate">
        <p className="admin-muted">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="admin-gate">
        <div className="admin-card admin-gate__card">
          <p className="admin-gate__logo">Basees</p>
          <h1 className="admin-gate__title">Admin</h1>
          <p className="admin-muted">Sign in with the shop’s Google account.</p>
          <button type="button" className="btn admin-gate__btn" onClick={handleSignIn}>
            Sign in with Google
          </button>
          {error && <p className="admin-error">{error}</p>}
          <Link to="/" className="admin-link">
            ← Back to the shop
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="admin-gate">
        <div className="admin-card admin-gate__card">
          <h1 className="admin-gate__title">Not authorized</h1>
          <p className="admin-muted">
            {user.email} doesn’t have access to the Basees admin.
          </p>
          <button type="button" className="btn btn--ghost admin-gate__btn" onClick={signOut}>
            Sign out
          </button>
          <Link to="/" className="admin-link">
            ← Back to the shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <Link to="/" className="admin-bar__logo">
          Basees <span>admin</span>
        </Link>
        <button type="button" className="admin-bar__signout" onClick={signOut}>
          Sign out
        </button>
      </header>
      <nav className="admin-tabs">
        <NavLink to="/admin" end className="admin-tabs__tab">
          Products
        </NavLink>
        <NavLink to="/admin/categories" className="admin-tabs__tab">
          Categories
        </NavLink>
        <NavLink to="/admin/story" className="admin-tabs__tab">
          Our Story
        </NavLink>
        <NavLink to="/admin/settings" className="admin-tabs__tab">
          Settings
        </NavLink>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
