import { useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { ADMIN_EMAIL, app } from '../../firebase.js'

const auth = getAuth(app)

export function isOwner(user) {
  return Boolean(
    user && ADMIN_EMAIL && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL,
  )
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
