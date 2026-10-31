# Basees (بَصيص) — handmade gifts e-shop

An online shop for **Basees**, a small Lebanese brand of handmade gifts: candles, jewellery boxes, crochet, bakhour, bookmarks and more. Customers browse the catalogue on their phones, fill a basket and send the order straight to the shop's WhatsApp. The owner manages products, photos, categories and texts from a mobile-friendly admin panel.

**Live site:** https://basees-shop.web.app

## Features

### For customers
- **Mobile-first design**: most visitors come from their phones, so every page is built for small screens first.
- **Home page** with a portrait welcome video, plus an **Our Story** page.
- **Shop by category**, including subcategories (e.g. Candles → Everyday, Sculpted gypsum, Dessert, Burner).
- **Product pages** with a swipeable photo gallery (up to 6 photos) and a full-screen viewer.
- **Basket** saved on the device, with subtotal, delivery fee and total.
- **Terms & Policies** that the customer must accept before ordering.
- **Order through WhatsApp**: one tap opens WhatsApp with the full order already written out (items, totals, note).

### For the shop owner (`/admin`)
- **Google sign-in**, open only to approved admin accounts.
- **Products**: add, edit, hide or delete; upload up to 6 photos from the phone's camera or gallery, reorder them and pick the main photo. Shows upload progress.
- **Categories**: create, rename, reorder and delete categories and subcategories, with cover images. A category can't be deleted while products still use it.
- **Texts and settings**: edit the Our Story text, the delivery fee and the Terms & Policies without touching code.
- Built to work well on a phone, because that's where products get added.

## Tech stack

- **React 19** + **Vite**, **React Router**
- **Firebase** (free Spark plan):
  - **Firestore** (Lite SDK) for products, photos, categories and settings
  - **Authentication** with Google sign-in for the admin
  - **Hosting** for the site
- Plain CSS with CSS variables (four-colour brand palette)
- No backend server and no paid services

## Technical challenges and how I solved them

### 1. Cloudinary isn't available in Lebanon, so images live in Firestore
The usual route for product photos (Cloudinary, or Firebase Storage, which needs the paid Blaze plan) wasn't an option. Instead, photos are **compressed in the browser** with a `<canvas>` before upload and stored in Firestore as base64 strings:
- each photo is resized to max 1200px wide and encoded as **WebP** (~200 KB), with a JPEG fallback for Safari versions that can't encode WebP;
- a small **thumbnail** (400px, ~40 KB) is made from the main photo and saved on the product itself.

Category pages load only the thumbnails, so they stay fast on mobile data. The product page shows the thumbnail right away and loads the full photos in the background.

### 2. Firestore's 1 MB document limit: one document per photo
A Firestore document can't be bigger than 1 MB, so several photos can't all fit inside the product. Each photo is saved as **its own document** in `productImages/{productId}/photos/{photoId}`, with an `order` field (0 = main photo). Any photo still over 700 KB after compression is compressed again at a lower quality.

Photos upload one at a time with a progress bar, and the product document is written last. Photo ids are generated on the device, so retrying a failed save never creates duplicate photos. Deleting a product deletes all of its photos too.

### 3. Security with Firestore rules (no backend)
With no server, the database itself enforces who can do what ([`firestore.rules`](firestore.rules)):
- anyone can **read** categories, the three settings documents, and products that are available (with their photos). Hidden products are visible only to admins;
- only **admins** can create, update or delete. An admin is a user whose uid has a document in an `admins` collection. That collection is managed only from the Firebase console, so no admin email addresses appear in the code;
- writes are validated: only known fields, a price must be a positive number, text and image sizes are limited, timestamps must come from the server, and so on;
- everything else is denied.

The rules are covered by 116 automated tests ([`tests/firestore.rules.test.js`](tests/firestore.rules.test.js)) that run against the Firestore emulator. They check what should work and what must be refused, for example anonymous writes, customers changing prices, and non-admins editing products.

The Firebase web config in `.env` only identifies the project and isn't a secret. Access is controlled by the rules.

### 4. Ordering through WhatsApp
Small shops in Lebanon take orders on WhatsApp, and online payment isn't practical. The basket builds a `wa.me` link containing the order as text: each item with quantity and price, subtotal, delivery and total, the customer's note, and confirmation that they agreed to the Terms & Policies. The customer just taps **Send** in WhatsApp.

## Run it locally

You need **Node.js 20+** and a Firebase project with Firestore and Google sign-in turned on.

```bash
git clone https://github.com/Jadd017/basees-shop.git
cd basees-shop
npm install
cp .env.example .env   # then fill in your Firebase web app config
npm run dev
```

To use the admin panel, sign in once at `/admin`. Then, in the Firebase console, open **Firestore → Start collection `admins`** and create a document whose **id is your user UID** (shown under **Authentication → Users**).

Test the Firestore security rules (needs the [Firebase CLI](https://firebase.google.com/docs/cli) and **Java 11+** for the emulator; uses a local demo project, never the real database):

```bash
npm run test:rules
```

Deploy (with the Firebase CLI):

```bash
npm run build
firebase deploy          # hosting + Firestore rules
```

## Project structure

```
src/
  pages/            Home, Our Story, Shop, Category, Product, Basket
  pages/admin/      Admin panel (lazy-loaded, so shoppers never download it)
  components/       Header, product card, photo gallery, terms
  services/         Firestore access (products, categories, settings)
  utils/            Image compression, WhatsApp message, formatting
firestore.rules     Security rules
```
