import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// settings/story: { text, updatedAt }. Paragraphs are separated by blank lines.
const storyDoc = doc(db, 'settings', 'story')

export async function fetchStory() {
  const snap = await getDoc(storyDoc)
  return snap.exists() ? snap.data().text ?? '' : ''
}

export async function saveStory(text) {
  await setDoc(storyDoc, { text, updatedAt: serverTimestamp() })
}
