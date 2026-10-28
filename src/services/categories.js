import {
  collection,
  deleteDoc,
  doc,
  getCount,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore/lite'
import { db } from '../firebase.js'

// categories/{id}: name, order (number), coverImage (base64 or null),
//                  subcategories: [{ id, name }]
// The document id (and each subcategory id) is permanent: it's what products store in
// `category` / `subcategory` and what appears in the URL, so renaming never breaks anything.
const categoriesCol = collection(db, 'categories')
const productsCol = collection(db, 'products')

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)

// One shared request per session; admin writes reset it.
let cached = null

export function fetchCategories() {
  if (!cached) {
    cached = getDocs(categoriesCol)
      .then((snap) =>
        snap.docs
          .map((d) => ({ id: d.id, subcategories: [], coverImage: null, ...d.data() }))
          .sort(byOrder),
      )
      .catch((error) => {
        cached = null // allow a retry
        throw error
      })
  }
  return cached
}

export function clearCategoriesCache() {
  cached = null
}

export function findCategory(categories, id) {
  return categories?.find((c) => c.id === id)
}

export function findSubcategory(category, subId) {
  return category?.subcategories?.find((s) => s.id === subId)
}

// ---------- ids ----------

// "Keychains & bag charms" → "keychains-bag-charms". Arabic-only names produce "" here,
// so a random suffix keeps them unique.
export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function uniqueId(name, takenIds, fallback = 'item') {
  const base = slugify(name) || fallback
  if (!takenIds.includes(base)) return base
  let id
  do id = `${base}-${Math.random().toString(36).slice(2, 6)}`
  while (takenIds.includes(id))
  return id
}

// ---------- product counts (used to block deleting non-empty categories) ----------

export async function countProducts(categoryId, subcategoryId) {
  const q = subcategoryId
    ? query(productsCol, where('category', '==', categoryId), where('subcategory', '==', subcategoryId))
    : query(productsCol, where('category', '==', categoryId))
  const snap = await getCount(q)
  return snap.data().count
}

// ---------- admin writes ----------

export async function createCategory({ name, coverImage = null, subcategories = [] }, existing) {
  const id = uniqueId(name, existing.map((c) => c.id), 'category')
  const order = existing.reduce((max, c) => Math.max(max, c.order ?? 0), -1) + 1
  const ref = doc(categoriesCol, id)
  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) throw new Error('A category with this id already exists.')
    tx.set(ref, { name, order, coverImage, subcategories })
  })
  clearCategoriesCache()
  return id
}

// `fields` may contain name, coverImage, subcategories.
export async function updateCategory(id, fields) {
  await updateDoc(doc(categoriesCol, id), fields)
  clearCategoriesCache()
}

export async function deleteCategory(id) {
  if ((await countProducts(id)) > 0) throw new Error('not-empty')
  await deleteDoc(doc(categoriesCol, id))
  clearCategoriesCache()
}

// Rewrites `order` as 0, 1, 2… following the given list of ids.
export async function saveCategoryOrder(ids) {
  const batch = writeBatch(db)
  ids.forEach((id, index) => batch.update(doc(categoriesCol, id), { order: index }))
  await batch.commit()
  clearCategoriesCache()
}
