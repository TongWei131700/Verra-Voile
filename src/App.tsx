import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Listing from './pages/Listing'
import ListingDetail from './pages/ListingDetail'
import Admin from './pages/Admin'
import Upload from './pages/Upload'

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
        <Route path="/listing" element={<Listing />} />
        <Route path="/listing/:cityId" element={<ListingDetail />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </>
  )
}
