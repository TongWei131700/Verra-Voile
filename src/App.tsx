import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Listing from './pages/Listing'
import ListingDestination from './pages/ListingDestination'
import ListingDetail from './pages/ListingDetail'
import ListingProducts from './pages/ListingProducts'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Login from './pages/Login'
import Register from './pages/Register'
import OrderDetail from './pages/OrderDetail'
import CrawledDestinations from './pages/CrawledDestinations'
import CrawledFrance from './pages/CrawledFrance'
import CrawledGreece from './pages/CrawledGreece'
import CrawledPortugal from './pages/CrawledPortugal'
import TestDestination from './pages/TestDestination'

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
        <Route path="/listing/destination" element={<ListingDestination />} />
        <Route path="/listing/destination/:cityId" element={<ListingDetail />} />
        <Route path="/listing/:moduleId" element={<ListingProducts />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/order" element={<OrderDetail />} />
        <Route path="/crawled-destinations" element={<CrawledDestinations />} />
        <Route path="/crawled-france" element={<CrawledFrance />} />
        <Route path="/crawled-greece" element={<CrawledGreece />} />
        <Route path="/crawled-portugal" element={<CrawledPortugal />} />
        <Route path="/destinations" element={<TestDestination />} />
      </Routes>
    </>
  )
}
