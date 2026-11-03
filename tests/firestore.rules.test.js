// Tests for firestore.rules, run against the Firestore emulator:  npm run test:rules
//
// Roles: anonymous visitor, signed-in customer (any Google user who isn't an admin — the shop
// has no customer accounts, but anyone can sign in on /admin), and admin (admins/{uid} exists).
// The shop stores no bookings, orders or customer data (orders go to WhatsApp), so the
// "bookings" tests seed a fake booking owned by another customer and check that the
// default deny blocks it — they'll catch a future collection added without rules.
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, it } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const ADMIN = 'admin-uid'
const CUSTOMER = 'customer-a'
const OTHER_CUSTOMER = 'customer-b'

const image = 'data:image/webp;base64,' + 'A'.repeat(2000)
const product = (fields = {}) => ({
  name: 'Strawberry Cake Candle',
  price: 10,
  category: 'candles',
  subcategory: 'dessert',
  shortDescription: 'Smells like cake',
  fullDescription: 'Hand-poured soy candle.',
  thumbnail: image,
  available: true,
  ...fields,
})

let env
const anon = () => env.unauthenticatedContext().firestore()
const customer = () => env.authenticatedContext(CUSTOMER).firestore()
const admin = () => env.authenticatedContext(ADMIN).firestore()

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-basees',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  })
})

after(() => env?.cleanup())

// Fresh data for every test, written with rules disabled (like the Firebase console).
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    const created = Timestamp.fromMillis(Date.UTC(2026, 0, 1))
    await setDoc(doc(db, 'admins', ADMIN), {})
    await setDoc(doc(db, 'products/visible'), product({ createdAt: created }))
    await setDoc(doc(db, 'products/hidden'), product({ available: false, createdAt: created }))
    await setDoc(doc(db, 'productImages/visible/photos/p1'), { image, order: 0 })
    await setDoc(doc(db, 'productImages/hidden/photos/h1'), { image, order: 0 })
    await setDoc(doc(db, 'productImages/legacy'), { image })
    await setDoc(doc(db, 'categories/candles'), {
      name: 'Candles',
      order: 0,
      coverImage: null,
      subcategories: [{ id: 'dessert', name: 'Dessert' }],
    })
    await setDoc(doc(db, 'settings/story'), { text: 'Our story', updatedAt: created })
    await setDoc(doc(db, 'settings/delivery'), { fee: 5, updatedAt: created })
    await setDoc(doc(db, 'settings/terms'), { text: 'Terms', updatedAt: created })
    await setDoc(doc(db, 'settings/private'), { secret: true })
    await setDoc(doc(db, 'bookings/booking-b'), { customer: OTHER_CUSTOMER, date: '2026-12-01', status: 'confirmed' })
  })
})

// ---------------------------------------------------------------------------------------
describe('SHOULD SUCCEED: shop reads (anonymous and signed-in)', () => {
  for (const [who, db] of [['anonymous', anon], ['customer', customer]]) {
    it(`${who} reads an available product`, () => assertSucceeds(getDoc(doc(db(), 'products/visible'))))
    it(`${who} runs the shop query (category + available == true)`, () =>
      assertSucceeds(getDocs(query(collection(db(), 'products'), where('category', '==', 'candles'), where('available', '==', true)))))
    it(`${who} reads photos of an available product`, () => assertSucceeds(getDocs(collection(db(), 'productImages/visible/photos'))))
    it(`${who} reads categories`, () => assertSucceeds(getDocs(collection(db(), 'categories'))))
    for (const name of ['story', 'delivery', 'terms'])
      it(`${who} reads settings/${name}`, () => assertSucceeds(getDoc(doc(db(), 'settings', name))))
  }
  it('customer reads their own admins entry (to learn they are not an admin)', () =>
    assertSucceeds(getDoc(doc(customer(), 'admins', CUSTOMER))))
})

// ---------------------------------------------------------------------------------------
describe('SHOULD FAIL: anonymous user writing', () => {
  it('create a product', () => assertFails(setDoc(doc(anon(), 'products/new'), product({ createdAt: serverTimestamp() }))))
  it('change a price', () => assertFails(updateDoc(doc(anon(), 'products/visible'), { price: 1 })))
  it('hide a product', () => assertFails(updateDoc(doc(anon(), 'products/visible'), { available: false })))
  it('delete a product', () => assertFails(deleteDoc(doc(anon(), 'products/visible'))))
  it('add a product photo', () => assertFails(setDoc(doc(anon(), 'productImages/visible/photos/x'), { image, order: 1 })))
  it('replace a product photo', () => assertFails(setDoc(doc(anon(), 'productImages/visible/photos/p1'), { image, order: 0 })))
  it('delete a product photo', () => assertFails(deleteDoc(doc(anon(), 'productImages/visible/photos/p1'))))
  it('write the legacy image doc', () => assertFails(setDoc(doc(anon(), 'productImages/legacy'), { image })))
  it('rename a category', () => assertFails(updateDoc(doc(anon(), 'categories/candles'), { name: 'Hacked' })))
  it('create a category', () => assertFails(setDoc(doc(anon(), 'categories/x'), { name: 'X', order: 9, coverImage: null, subcategories: [] })))
  it('delete a category', () => assertFails(deleteDoc(doc(anon(), 'categories/candles'))))
  it('set the delivery fee to 0', () => assertFails(setDoc(doc(anon(), 'settings/delivery'), { fee: 0, updatedAt: serverTimestamp() })))
  it('rewrite the terms', () => assertFails(setDoc(doc(anon(), 'settings/terms'), { text: 'No refunds ever', updatedAt: serverTimestamp() })))
  it('rewrite Our Story', () => assertFails(setDoc(doc(anon(), 'settings/story'), { text: 'x', updatedAt: serverTimestamp() })))
  it('create an admins entry', () => assertFails(setDoc(doc(anon(), 'admins/anyone'), {})))
  it('create a booking', () => assertFails(setDoc(doc(anon(), 'bookings/new'), { customer: 'x', date: '2026-12-02' })))
  it('write to any other collection', () => assertFails(setDoc(doc(anon(), 'orders/o1'), { total: 1 })))
})

// ---------------------------------------------------------------------------------------
describe("SHOULD FAIL: customer reading or editing another customer's booking", () => {
  const booking = () => doc(customer(), 'bookings/booking-b') // owned by OTHER_CUSTOMER
  it("read another customer's booking", () => assertFails(getDoc(booking())))
  it("list all bookings", () => assertFails(getDocs(collection(customer(), 'bookings'))))
  it("edit another customer's booking date", () => assertFails(updateDoc(booking(), { date: '2026-12-25' })))
  it("take over another customer's booking", () => assertFails(updateDoc(booking(), { customer: CUSTOMER })))
  it("cancel another customer's booking", () => assertFails(updateDoc(booking(), { status: 'cancelled' })))
  it("delete another customer's booking", () => assertFails(deleteDoc(booking())))
  it('create a booking in another customer\'s name', () =>
    assertFails(setDoc(doc(customer(), 'bookings/fake'), { customer: OTHER_CUSTOMER, date: '2026-12-03' })))
  it('create a booking for themselves (no bookings feature exists)', () =>
    assertFails(setDoc(doc(customer(), 'bookings/mine'), { customer: CUSTOMER, date: '2026-12-04' })))
})

// ---------------------------------------------------------------------------------------
describe('SHOULD FAIL: customer setting price or status fields', () => {
  const p = () => doc(customer(), 'products/visible')
  it('set price to 1', () => assertFails(updateDoc(p(), { price: 1 })))
  it('set price to 0', () => assertFails(updateDoc(p(), { price: 0 })))
  it('set a negative price', () => assertFails(updateDoc(p(), { price: -10 })))
  it('add a status field', () => assertFails(updateDoc(p(), { status: 'sold' })))
  it('change availability (the shop\'s status field)', () => assertFails(updateDoc(p(), { available: false })))
  it('un-hide a hidden product', () => assertFails(updateDoc(doc(customer(), 'products/hidden'), { available: true })))
  it('overwrite the whole product with a new price', () => assertFails(setDoc(p(), product({ price: 1, createdAt: serverTimestamp() }))))
  it('set the delivery fee to 0', () => assertFails(setDoc(doc(customer(), 'settings/delivery'), { fee: 0, updatedAt: serverTimestamp() })))
})

// ---------------------------------------------------------------------------------------
describe('SHOULD FAIL: non-admin (signed-in) editing products and shop data', () => {
  it('create a product', () => assertFails(setDoc(doc(customer(), 'products/new'), product({ createdAt: serverTimestamp() }))))
  it('rename a product', () => assertFails(updateDoc(doc(customer(), 'products/visible'), { name: 'Hacked' })))
  it('change a description', () => assertFails(updateDoc(doc(customer(), 'products/visible'), { fullDescription: 'spam' })))
  it('move a product to another category', () => assertFails(updateDoc(doc(customer(), 'products/visible'), { category: 'bookmarks' })))
  it('delete a product', () => assertFails(deleteDoc(doc(customer(), 'products/visible'))))
  it('add a product photo', () => assertFails(setDoc(doc(customer(), 'productImages/visible/photos/x'), { image, order: 1 })))
  it('reorder product photos', () => assertFails(updateDoc(doc(customer(), 'productImages/visible/photos/p1'), { order: 3 })))
  it('delete a product photo', () => assertFails(deleteDoc(doc(customer(), 'productImages/visible/photos/p1'))))
  it('delete the legacy image doc', () => assertFails(deleteDoc(doc(customer(), 'productImages/legacy'))))
  it('rename a category', () => assertFails(updateDoc(doc(customer(), 'categories/candles'), { name: 'Hacked' })))
  it('delete a category', () => assertFails(deleteDoc(doc(customer(), 'categories/candles'))))
  it('rewrite the terms', () => assertFails(setDoc(doc(customer(), 'settings/terms'), { text: 'x', updatedAt: serverTimestamp() })))
  it('make themselves an admin', () => assertFails(setDoc(doc(customer(), 'admins', CUSTOMER), {})))
  it('make another user an admin', () => assertFails(setDoc(doc(customer(), 'admins', OTHER_CUSTOMER), {})))
  it('a batch that changes a price and a photo together', () => {
    const db = customer()
    const batch = writeBatch(db)
    batch.update(doc(db, 'products/visible'), { price: 1 })
    batch.update(doc(db, 'productImages/visible/photos/p1'), { order: 1 })
    return assertFails(batch.commit())
  })
})

// ---------------------------------------------------------------------------------------
describe('SHOULD FAIL: reading what the shop hides (anonymous and signed-in)', () => {
  for (const [who, db] of [['anonymous', anon], ['customer', customer]]) {
    it(`${who} reads a hidden product`, () => assertFails(getDoc(doc(db(), 'products/hidden'))))
    it(`${who} lists all products (no available filter)`, () => assertFails(getDocs(collection(db(), 'products'))))
    it(`${who} queries available == false`, () =>
      assertFails(getDocs(query(collection(db(), 'products'), where('available', '==', false)))))
    it(`${who} reads photos of a hidden product`, () => assertFails(getDocs(collection(db(), 'productImages/hidden/photos'))))
    it(`${who} reads photos of a product that doesn't exist`, () => assertFails(getDocs(collection(db(), 'productImages/nope/photos'))))
    it(`${who} reads the legacy image doc`, () => assertFails(getDoc(doc(db(), 'productImages/legacy'))))
    it(`${who} reads an unlisted settings doc`, () => assertFails(getDoc(doc(db(), 'settings/private'))))
    it(`${who} reads the admin list`, () => assertFails(getDocs(collection(db(), 'admins'))))
    it(`${who} reads the admin's entry`, () => assertFails(getDoc(doc(db(), 'admins', ADMIN))))
  }
})

// ---------------------------------------------------------------------------------------
// These mirror the writes the admin pages make (src/services/*.js).
describe('SHOULD SUCCEED: admin', () => {
  it('reads hidden products and lists all products', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'products/hidden')))
    await assertSucceeds(getDocs(collection(admin(), 'products')))
  })
  it('reads photos of a hidden product', () => assertSucceeds(getDocs(collection(admin(), 'productImages/hidden/photos'))))
  it('adds a product like saveProduct (photos first, then the product)', async () => {
    const db = admin()
    await assertSucceeds(setDoc(doc(db, 'productImages/new/photos/a'), { image, order: 0 }))
    await assertSucceeds(setDoc(doc(db, 'productImages/new/photos/b'), { image, order: 5 }))
    await assertSucceeds(setDoc(doc(db, 'products/new'), product({ subcategory: null, createdAt: serverTimestamp() })))
  })
  it('edits a product like saveProduct (batch: reorder, delete photo, update)', () => {
    const db = admin()
    const batch = writeBatch(db)
    batch.update(doc(db, 'productImages/visible/photos/p1'), { order: 1 })
    batch.delete(doc(db, 'productImages/visible/photos/p1'))
    batch.update(doc(db, 'products/visible'), { price: 12.5, name: 'New name', thumbnail: image })
    return assertSucceeds(batch.commit())
  })
  it('hides and shows a product', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'products/visible'), { available: false }))
    await assertSucceeds(updateDoc(doc(admin(), 'products/visible'), { available: true }))
  })
  it('deletes a product with its photos and legacy doc', () => {
    const db = admin()
    const batch = writeBatch(db)
    batch.delete(doc(db, 'productImages/visible/photos/p1'))
    batch.delete(doc(db, 'productImages/legacy'))
    batch.delete(doc(db, 'products/visible'))
    return assertSucceeds(batch.commit())
  })
  it('creates a category like createCategory (transaction)', () => {
    const db = admin()
    const ref = doc(db, 'categories/new')
    return assertSucceeds(
      runTransaction(db, async (tx) => {
        await tx.get(ref)
        tx.set(ref, { name: 'New', order: 8, coverImage: image, subcategories: [{ id: 'a', name: 'A' }] })
      }),
    )
  })
  it('renames a category and reorders categories', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'categories/candles'), { name: 'Candles ✨', subcategories: [] }))
    await assertSucceeds(updateDoc(doc(admin(), 'categories/candles'), { order: 3 }))
  })
  it('deletes a category', () => assertSucceeds(deleteDoc(doc(admin(), 'categories/candles'))))
  it('saves Our Story, terms and delivery fee (0 and 3.50)', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'settings/story'), { text: 'Hello', updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(admin(), 'settings/terms'), { text: 'Refunds\nWithin 7 days', updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(admin(), 'settings/delivery'), { fee: 0, updatedAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(admin(), 'settings/delivery'), { fee: 3.5, updatedAt: serverTimestamp() }))
  })
})

// ---------------------------------------------------------------------------------------
// shortDescription is optional: missing or empty is fine; if present it must be text ≤ 120.
describe('Optional short description', () => {
  // eslint-disable-next-line no-unused-vars
  const withoutShort = ({ shortDescription, ...rest }) => rest

  describe('SHOULD SUCCEED: admin', () => {
    it('new product with no shortDescription field', () =>
      assertSucceeds(setDoc(doc(admin(), 'products/new'), withoutShort(product({ createdAt: serverTimestamp() })))))
    it('new product with an empty shortDescription', () =>
      assertSucceeds(setDoc(doc(admin(), 'products/new'), product({ shortDescription: '', createdAt: serverTimestamp() }))))
    it('clearing it on an existing product (what the form saves)', () =>
      assertSucceeds(updateDoc(doc(admin(), 'products/visible'), { shortDescription: '' })))
    it('removing the field from an existing product', () =>
      assertSucceeds(updateDoc(doc(admin(), 'products/visible'), { shortDescription: deleteField() })))
    it('still accepts normal text, up to 120 characters', () =>
      assertSucceeds(updateDoc(doc(admin(), 'products/visible'), { shortDescription: 'x'.repeat(120) })))
    it('shop can still read a product without one', async () => {
      await env.withSecurityRulesDisabled((ctx) =>
        setDoc(doc(ctx.firestore(), 'products/noShort'), withoutShort(product({ createdAt: Timestamp.now() }))),
      )
      await assertSucceeds(getDoc(doc(anon(), 'products/noShort')))
    })
  })

  describe('SHOULD FAIL: not text, or too long', () => {
    const bad = [
      ['a number', 5],
      ['null', null],
      ['a boolean', true],
      ['a list', ['cute']],
      ['a map', { text: 'cute' }],
    ]
    for (const [label, value] of bad) {
      it(`new product with shortDescription as ${label}`, () =>
        assertFails(setDoc(doc(admin(), 'products/new'), product({ shortDescription: value, createdAt: serverTimestamp() }))))
      it(`existing product updated to ${label}`, () =>
        assertFails(updateDoc(doc(admin(), 'products/visible'), { shortDescription: value })))
    }
    it('121 characters (one over the limit)', () =>
      assertFails(updateDoc(doc(admin(), 'products/visible'), { shortDescription: 'x'.repeat(121) })))
    it('customer clearing it', () =>
      assertFails(updateDoc(doc(customer(), 'products/visible'), { shortDescription: '' })))
  })
})

// ---------------------------------------------------------------------------------------
// Focus points (focusX/focusY, percent 0–100) on photos and on the product (main photo's focus).
describe('Photo focus points', () => {
  const photo = (db, id = 'p1') => doc(db, 'productImages/visible/photos', id)
  const p = (db) => doc(db, 'products/visible')

  describe('SHOULD SUCCEED: admin, valid values', () => {
    it('new photo with a focus point (like saveProduct)', () =>
      assertSucceeds(setDoc(photo(admin(), 'new'), { image, order: 1, focusX: 30, focusY: 70 })))
    it('new photo without a focus point (older app versions; shop uses 50/50)', () =>
      assertSucceeds(setDoc(photo(admin(), 'new'), { image, order: 1 })))
    it('update order + focus of an existing photo', () =>
      assertSucceeds(updateDoc(photo(admin()), { order: 0, focusX: 12.5, focusY: 87.5 })))
    it('edges: 0 and 100', async () => {
      await assertSucceeds(updateDoc(photo(admin()), { focusX: 0, focusY: 100 }))
      await assertSucceeds(updateDoc(p(admin()), { focusX: 100, focusY: 0 }))
    })
    it('product: main photo focus saved with the other fields', () =>
      assertSucceeds(updateDoc(p(admin()), { price: 12, focusX: 40, focusY: 25.5 })))
    it('new product with a focus point', () =>
      assertSucceeds(setDoc(doc(admin(), 'products/new'), product({ createdAt: serverTimestamp(), focusX: 50, focusY: 50 }))))
  })

  describe('SHOULD FAIL: admin, invalid values', () => {
    const bad = [
      ['text', '50'],
      ['negative', -1],
      ['over 100', 100.5],
      ['way over 100', 250],
      ['null', null],
      ['boolean', true],
      ['a list', [50, 50]],
    ]
    for (const [label, value] of bad) {
      it(`photo focusX ${label} (${JSON.stringify(value)})`, () =>
        assertFails(updateDoc(photo(admin()), { focusX: value })))
      it(`photo focusY ${label} (${JSON.stringify(value)})`, () =>
        assertFails(setDoc(photo(admin(), 'new'), { image, order: 1, focusX: 50, focusY: value })))
      it(`product focusX ${label} (${JSON.stringify(value)})`, () =>
        assertFails(updateDoc(p(admin()), { focusX: value })))
      it(`product focusY ${label} (${JSON.stringify(value)})`, () =>
        assertFails(updateDoc(p(admin()), { focusY: value })))
    }
    it('a differently named field (focus) is still refused', () =>
      assertFails(updateDoc(photo(admin()), { focus: { x: 50, y: 50 } })))
  })

  describe('SHOULD FAIL: non-admins setting a focus point', () => {
    it('anonymous, on a photo', () => assertFails(updateDoc(photo(anon()), { focusX: 10 })))
    it('customer, on a photo', () => assertFails(updateDoc(photo(customer()), { focusX: 10, focusY: 10 })))
    it('customer, on a product', () => assertFails(updateDoc(p(customer()), { focusX: 10, focusY: 10 })))
  })
})

// Focus point (focusX/focusY, percent 0–100) of a category's cover image.
describe('Category cover focus points', () => {
  const c = (db) => doc(db, 'categories/candles')

  describe('SHOULD SUCCEED: admin', () => {
    it('saves a focus point with the other fields (like the category form)', () =>
      assertSucceeds(updateDoc(c(admin()), { name: 'Candles', coverImage: image, focusX: 30, focusY: 70, subcategories: [] })))
    it('the limits 0 and 100, and decimals', async () => {
      await assertSucceeds(updateDoc(c(admin()), { focusX: 0, focusY: 100 }))
      await assertSucceeds(updateDoc(c(admin()), { focusX: 100, focusY: 0 }))
      await assertSucceeds(updateDoc(c(admin()), { focusX: 12.5, focusY: 87.5 }))
    })
    it('new category with a focus point (like createCategory)', () =>
      assertSucceeds(setDoc(doc(admin(), 'categories/new'), { name: 'New', order: 8, coverImage: image, focusX: 50, focusY: 50, subcategories: [] })))
    it('category without a focus point (shop uses 50/50)', () =>
      assertSucceeds(setDoc(doc(admin(), 'categories/new'), { name: 'New', order: 8, coverImage: image, subcategories: [] })))
    it('reordering a category that has a focus point', async () => {
      await assertSucceeds(updateDoc(c(admin()), { focusX: 10, focusY: 20 }))
      await assertSucceeds(updateDoc(c(admin()), { order: 4 }))
    })
  })

  describe('SHOULD FAIL: admin, invalid values', () => {
    const bad = [
      ['text', '50'],
      ['negative', -1],
      ['over 100', 100.5],
      ['way over 100', 250],
      ['null', null],
      ['boolean', true],
      ['a list', [50, 50]],
    ]
    for (const [label, value] of bad) {
      it(`focusX ${label} (${JSON.stringify(value)})`, () =>
        assertFails(updateDoc(c(admin()), { focusX: value })))
      it(`focusY ${label} (${JSON.stringify(value)})`, () =>
        assertFails(updateDoc(c(admin()), { focusY: value })))
    }
    it('valid focusX does not excuse a bad focusY', () =>
      assertFails(updateDoc(c(admin()), { focusX: 50, focusY: 101 })))
    it('new category with a bad focus point', () =>
      assertFails(setDoc(doc(admin(), 'categories/new'), { name: 'New', order: 8, coverImage: null, focusX: '50', subcategories: [] })))
    it('a differently named field (focus) is still refused', () =>
      assertFails(updateDoc(c(admin()), { focus: { x: 50, y: 50 } })))
  })

  describe('SHOULD FAIL: non-admins setting a focus point', () => {
    it('anonymous', () => assertFails(updateDoc(c(anon()), { focusX: 10, focusY: 10 })))
    it('customer', () => assertFails(updateDoc(c(customer()), { focusX: 10, focusY: 10 })))
    it('customer, creating a category with one', () =>
      assertFails(setDoc(doc(customer(), 'categories/x'), { name: 'X', order: 9, coverImage: null, focusX: 10, focusY: 10, subcategories: [] })))
  })
})

// ---------------------------------------------------------------------------------------
describe('SHOULD FAIL: admin mistakes the rules catch', () => {
  const p = () => doc(admin(), 'products/visible')
  it('price saved as text', () => assertFails(updateDoc(p(), { price: '10' })))
  it('price 0', () => assertFails(updateDoc(p(), { price: 0 })))
  it('a status field (not part of a product)', () => assertFails(updateDoc(p(), { status: 'sold' })))
  it('any other unknown field', () => assertFails(updateDoc(p(), { featured: true })))
  it('changing createdAt', () => assertFails(updateDoc(p(), { createdAt: Timestamp.fromMillis(0) })))
  it('creating with a client-side createdAt', () =>
    assertFails(setDoc(doc(admin(), 'products/x'), product({ createdAt: Timestamp.fromMillis(0) }))))
  it('creating without createdAt', () => assertFails(setDoc(doc(admin(), 'products/x'), product())))
  it('creating with missing fields', () => assertFails(setDoc(doc(admin(), 'products/x'), { name: 'x', price: 1, createdAt: serverTimestamp() })))
  it('empty name', () => assertFails(updateDoc(p(), { name: '' })))
  it('name over 150 characters', () => assertFails(updateDoc(p(), { name: 'x'.repeat(151) })))
  it('short description over 120 characters', () => assertFails(updateDoc(p(), { shortDescription: 'x'.repeat(121) })))
  it('thumbnail over 700 KB', () => assertFails(updateDoc(p(), { thumbnail: 'x'.repeat(700_001) })))
  it('photo over 700 KB', () => assertFails(setDoc(doc(admin(), 'productImages/visible/photos/big'), { image: 'x'.repeat(700_001), order: 1 })))
  it('photo order 6 (max 6 photos: 0–5)', () => assertFails(setDoc(doc(admin(), 'productImages/visible/photos/o'), { image, order: 6 })))
  it('photo with an extra field', () => assertFails(setDoc(doc(admin(), 'productImages/visible/photos/o'), { image, order: 1, x: 1 })))
  it('category with an extra field', () => assertFails(updateDoc(doc(admin(), 'categories/candles'), { x: 1 })))
  it('category order 1.5', () => assertFails(updateDoc(doc(admin(), 'categories/candles'), { order: 1.5 })))
  it('negative delivery fee', () => assertFails(setDoc(doc(admin(), 'settings/delivery'), { fee: -1, updatedAt: serverTimestamp() })))
  it('delivery fee as text', () => assertFails(setDoc(doc(admin(), 'settings/delivery'), { fee: '5', updatedAt: serverTimestamp() })))
  it('delivery fee over 1000', () => assertFails(setDoc(doc(admin(), 'settings/delivery'), { fee: 1001, updatedAt: serverTimestamp() })))
  it('settings without updatedAt', () => assertFails(setDoc(doc(admin(), 'settings/delivery'), { fee: 5 })))
  it('story with an extra field', () => assertFails(setDoc(doc(admin(), 'settings/story'), { text: 'x', updatedAt: serverTimestamp(), y: 1 })))
  it('an unlisted settings doc', () => assertFails(setDoc(doc(admin(), 'settings/other'), { text: 'x', updatedAt: serverTimestamp() })))
  it('adding another admin (console only)', () => assertFails(setDoc(doc(admin(), 'admins/someone'), {})))
  it('writing a booking (no such feature)', () => assertFails(setDoc(doc(admin(), 'bookings/x'), { customer: 'x' })))
})
