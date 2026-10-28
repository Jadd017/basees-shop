import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore/lite'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase is not configured: fill in .env (see .env.example) and restart `npm run dev`.')
}

export const app = initializeApp(firebaseConfig)
// Firestore Lite: one-off reads/writes only (no live listeners) — a much smaller download for phones.
export const db = getFirestore(app)

// Only these accounts can use /admin (comma-separated in .env). The real protection is
// firestore.rules. (Auth itself lives in src/pages/admin/auth.js so shoppers don't download it.)
export const ADMIN_EMAILS = (env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
