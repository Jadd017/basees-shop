import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// settings/story:    { text, updatedAt } — Our Story; paragraphs separated by blank lines.
// settings/delivery: { fee, updatedAt }  — delivery charge in USD added to every order.
// settings/terms:    { text, updatedAt } — Terms & Policies shown in the basket.
const storyDoc = doc(db, 'settings', 'story')
const deliveryDoc = doc(db, 'settings', 'delivery')
const termsDoc = doc(db, 'settings', 'terms')

export const DEFAULT_DELIVERY_FEE = 5

export async function fetchStory() {
  const snap = await getDoc(storyDoc)
  return snap.exists() ? snap.data().text ?? '' : ''
}

export async function saveStory(text) {
  await setDoc(storyDoc, { text, updatedAt: serverTimestamp() })
}

export async function fetchDeliveryFee() {
  const snap = await getDoc(deliveryDoc)
  const fee = snap.exists() ? snap.data().fee : undefined
  return typeof fee === 'number' && fee >= 0 ? fee : DEFAULT_DELIVERY_FEE
}

export async function saveDeliveryFee(fee) {
  await setDoc(deliveryDoc, { fee, updatedAt: serverTimestamp() })
}

export async function fetchTerms() {
  const snap = await getDoc(termsDoc)
  return snap.exists() ? snap.data().text ?? '' : ''
}

export async function saveTerms(text) {
  await setDoc(termsDoc, { text, updatedAt: serverTimestamp() })
}
