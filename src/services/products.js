import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// products/{id}:   name, price, shortDescription, fullDescription, thumbnail (base64, made from
//                  the FIRST photo), category, subcategory (or null), available, createdAt
// productImages/{productId}/photos/{photoId}:   image (base64, full size), order (0 = main photo)
// Photos live outside the product doc so category listings only download thumbnails.
export const MAX_PHOTOS = 6

const products = collection(db, 'products')
const photosCol = (productId) => collection(db, 'productImages', productId, 'photos')
const legacyImageDoc = (productId) => doc(db, 'productImages', productId) // pre-gallery single image

const fromSnapshot = (snap) => ({ id: snap.id, ...snap.data() })
const newestFirst = (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)

// Session cache so going back and forth between pages doesn't re-download images.
const cache = { byCategory: new Map(), byId: new Map(), photos: new Map() }

function clearCache() {
  cache.byCategory.clear()
  cache.byId.clear()
  cache.photos.clear()
}

export function getCachedProduct(id) {
  return cache.byId.get(id)
}

// Ids can be generated offline; used so a retried save never duplicates photos.
export const newProductId = () => doc(products).id
export const newPhotoId = (productId) => doc(photosCol(productId)).id

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

// All photos of a product, main photo first: [{ id, image, order }].
export async function fetchProductPhotos(productId, { fresh = false } = {}) {
  if (!fresh && cache.photos.has(productId)) return cache.photos.get(productId)
  const snap = await getDocs(photosCol(productId))
  const photos = snap.docs.map(fromSnapshot).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  cache.photos.set(productId, photos)
  return photos
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

// Creates or updates a product with its photos.
//   photos:          final list in display order — [{ id, image, isNew }]
//   removedPhotoIds: saved photos the admin deleted
//   thumbnail:       base64, or null to keep the current one (main photo unchanged)
//   onProgress:      called with a short status message
// New photos are uploaded one at a time (so progress can be shown), then the product doc is
// written last — so the shop never shows a product whose photos aren't there yet. Photo ids are
// chosen beforehand, so retrying after a failure overwrites instead of duplicating.
export async function saveProduct({ productId, isNew, fields, thumbnail, photos, removedPhotoIds = [], onProgress }) {
  const newPhotos = photos.filter((p) => p.isNew)
  for (const [i, photo] of newPhotos.entries()) {
    onProgress?.(`Uploading photo ${i + 1} of ${newPhotos.length}…`)
    await setDoc(doc(photosCol(productId), photo.id), { image: photo.image, order: photos.indexOf(photo) })
  }

  onProgress?.('Saving product…')
  const batch = writeBatch(db)
  photos.forEach((photo, order) => {
    if (!photo.isNew) batch.update(doc(photosCol(productId), photo.id), { order })
  })
  removedPhotoIds.forEach((photoId) => batch.delete(doc(photosCol(productId), photoId)))
  const productRef = doc(products, productId)
  if (isNew) batch.set(productRef, { ...fields, thumbnail, createdAt: serverTimestamp() })
  else batch.update(productRef, thumbnail ? { ...fields, thumbnail } : fields)
  await batch.commit()
  clearCache()
}

export async function setProductAvailable(id, available) {
  await updateDoc(doc(products, id), { available })
  clearCache()
}

// Deletes the product and every one of its photos.
export async function deleteProduct(id) {
  const photos = await getDocs(photosCol(id))
  const batch = writeBatch(db)
  photos.docs.forEach((photo) => batch.delete(photo.ref))
  batch.delete(legacyImageDoc(id))
  batch.delete(doc(products, id))
  await batch.commit()
  clearCache()
}
