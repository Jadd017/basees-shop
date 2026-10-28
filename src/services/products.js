import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// products/{id}:        name, price, shortDescription, fullDescription, thumbnail (base64),
//                       category, subcategory (candles only, else null), available, createdAt
// productImages/{id}:   image (base64, full size) — kept separate so listings stay light.
const products = collection(db, 'products')
const imageDoc = (id) => doc(db, 'productImages', id)

const fromSnapshot = (snap) => ({ id: snap.id, ...snap.data() })
const newestFirst = (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)

// Session cache so going back and forth between pages doesn't re-download thumbnails.
const cache = { byCategory: new Map(), byId: new Map(), images: new Map() }

function clearCache() {
  cache.byCategory.clear()
  cache.byId.clear()
  cache.images.clear()
}

export function getCachedProduct(id) {
  return cache.byId.get(id)
}

// ---------- Public (shop) ----------

export async function fetchProductsByCategory(categoryId) {
  if (cache.byCategory.has(categoryId)) return cache.byCategory.get(categoryId)
  const snap = await getDocs(
    query(products, where('category', '==', categoryId), where('available', '==', true)),
  )
  const list = snap.docs.map(fromSnapshot).sort(newestFirst)
  list.forEach((p) => cache.byId.set(p.id, p))
  cache.byCategory.set(categoryId, list)
  return list
}

// Returns null when the product doesn't exist or isn't available (hidden by the owner).
export async function fetchProduct(id) {
  try {
    const snap = await getDoc(doc(products, id))
    if (!snap.exists() || snap.data().available !== true) return null
    const product = fromSnapshot(snap)
    cache.byId.set(id, product)
    return product
  } catch (error) {
    if (error.code === 'permission-denied') return null
    throw error
  }
}

export async function fetchProductImage(id) {
  if (cache.images.has(id)) return cache.images.get(id)
  const snap = await getDoc(imageDoc(id))
  const image = snap.exists() ? snap.data().image : null
  if (image) cache.images.set(id, image)
  return image
}

// ---------- Admin ----------

export async function fetchAllProducts() {
  const snap = await getDocs(query(products, orderBy('createdAt', 'desc')))
  return snap.docs.map(fromSnapshot)
}

export async function fetchProductForAdmin(id) {
  const snap = await getDoc(doc(products, id))
  return snap.exists() ? fromSnapshot(snap) : null
}

// `images` = { thumbnail, image } base64 data URLs (required when creating).
export async function createProduct(fields, images) {
  const ref = doc(products)
  const batch = writeBatch(db)
  batch.set(ref, { ...fields, thumbnail: images.thumbnail, createdAt: serverTimestamp() })
  batch.set(imageDoc(ref.id), { image: images.image })
  await batch.commit()
  clearCache()
  return ref.id
}

// `images` is optional — only passed when the image was replaced.
export async function updateProduct(id, fields, images) {
  const batch = writeBatch(db)
  batch.update(doc(products, id), images ? { ...fields, thumbnail: images.thumbnail } : fields)
  if (images) batch.set(imageDoc(id), { image: images.image })
  await batch.commit()
  clearCache()
}

export async function setProductAvailable(id, available) {
  await updateDoc(doc(products, id), { available })
  clearCache()
}

export async function deleteProduct(id) {
  const batch = writeBatch(db)
  batch.delete(doc(products, id))
  batch.delete(imageDoc(id))
  await batch.commit()
  clearCache()
}
