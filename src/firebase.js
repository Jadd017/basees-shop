import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
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

// App Check: proves requests come from this website (reCAPTCHA Enterprise / Fraud Defense,
// score-based key), so scripts can't freely drain the free Firestore quota.
// Must run before Firestore is used.
//
// The SDK waits forever for reCAPTCHA if its scripts are blocked (ad/privacy blockers) or
// never finish loading, and Firestore waits for App Check — so the shop would show nothing.
// This provider gives up instead: App Check then sends its "no valid token" marker and the
// request goes ahead (counted as unverified; refused only once enforcement is on).
const TOKEN_TIMEOUT_MS = 10_000
const recaptchaBlocked = new Promise((_, reject) => {
  // Resource load errors don't bubble, so listen in the capture phase.
  window.addEventListener(
    'error',
    (event) => {
      if (event.target instanceof HTMLScriptElement && event.target.src.includes('/recaptcha/'))
        reject(new Error('reCAPTCHA could not be loaded'))
    },
    true,
  )
})
recaptchaBlocked.catch(() => {}) // handled where it's raced below

class TimeLimitedRecaptchaProvider extends ReCaptchaEnterpriseProvider {
  timedOut = false // after one timeout, don't make every request wait again

  getToken(...args) {
    const token = super.getToken(...args)
    token.then(() => (this.timedOut = false), () => {})
    const limit = new Promise((_, reject) =>
      setTimeout(() => {
        this.timedOut = true
        reject(new Error('reCAPTCHA timed out'))
      }, this.timedOut ? 0 : TOKEN_TIMEOUT_MS),
    )
    return Promise.race([token, recaptchaBlocked, limit])
  }
}

// On `npm run dev` a debug token (registered in Firebase console → App Check) replaces
// reCAPTCHA. It comes from APPCHECK_DEBUG_TOKEN in .env via vite.config.js, which leaves
// it empty in production builds, so it never ships to the live site.
if (__APPCHECK_DEBUG_TOKEN__) {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = __APPCHECK_DEBUG_TOKEN__
}
if (env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new TimeLimitedRecaptchaProvider(env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  })
} else {
  console.warn('App Check is off: set VITE_RECAPTCHA_SITE_KEY in .env (see .env.example).')
}

// Firestore Lite: one-off reads/writes only (no live listeners) — a much smaller download for phones.
export const db = getFirestore(app)
