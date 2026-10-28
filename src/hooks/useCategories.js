import { useCallback, useEffect, useState } from 'react'
import { fetchCategories } from '../services/categories.js'

// { status: 'loading' | 'ready' | 'error', categories, retry, reload }
// `reload` refetches after an admin change (the service cache is already cleared by writes).
export function useCategories() {
  const [state, setState] = useState({ status: 'loading', categories: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchCategories()
      .then((categories) => !cancelled && setState({ status: 'ready', categories }))
      .catch((error) => {
        console.error(error)
        if (!cancelled) setState((s) => ({ ...s, status: 'error' }))
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, status: 'loading' }))
    setAttempt((a) => a + 1)
  }, [])

  return { ...state, retry, reload: () => setAttempt((a) => a + 1) }
}
