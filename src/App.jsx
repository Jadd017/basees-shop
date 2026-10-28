import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import OurStory from './pages/OurStory.jsx'
import Shop from './pages/Shop.jsx'
import Category from './pages/Category.jsx'
import Product from './pages/Product.jsx'
import Basket from './pages/Basket.jsx'

// Admin is loaded only when visited, so shoppers don't download it (or Firebase Auth).
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm.jsx'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories.jsx'))
const AdminCategoryForm = lazy(() => import('./pages/admin/AdminCategoryForm.jsx'))
const AdminStory = lazy(() => import('./pages/admin/AdminStory.jsx'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/our-story" element={<OurStory />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="categories/new" element={<AdminCategoryForm />} />
            <Route path="categories/:id" element={<AdminCategoryForm />} />
            <Route path="story" element={<AdminStory />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}
