import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import OurStory from './pages/OurStory.jsx'
import Shop from './pages/Shop.jsx'
import Category from './pages/Category.jsx'
import Product from './pages/Product.jsx'

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/our-story" element={<OurStory />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:category" element={<Category />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
