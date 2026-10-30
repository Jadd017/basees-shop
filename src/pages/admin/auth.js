import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore/lite'
import { app, db } from '../../firebase.js'

const auth = getAuth(app)

// A user is an admin when admins/{uid} exists (added by hand in the Firebase console).
// firestore.rules does the same check, so this only decides what the page shows.
// undefined while checking, then true/false.
export function useIsAdmin(user) {
  const [result, setResult] = useState({ uid: null, isAdmin: undefined })
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getDoc(doc(db, 'admins', user.uid))
      .then((snap) => snap.exists())
      .catch(() => false) // permission denied = not an admin
      .then((isAdmin) => !cancelled && setResult({ uid: user.uid, isAdmin }))
    return () => {
      cancelled = true
    }
  }, [user])
  if (!user) return false
  return result.uid === user.uid ? result.isAdmin : undefined
}

// undefined while Firebase restores the session, then a User or null.
export function useUser() {
  const [user, setUser] = useState(auth.currentUser ?? undefined)
  useEffect(() => onAuthStateChanged(auth, setUser), [])
  return user
}

export async function signIn() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    if (error.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider)
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request')
      return
    throw error
  }
}

export function signOut() {
  return firebaseSignOut(auth)
}
