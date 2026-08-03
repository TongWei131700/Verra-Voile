import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
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
import CrawledCountries from './pages/CrawledCountries'
import CrawledVenueDetail from './pages/CrawledVenueDetail'
import Destinations from './pages/Destinations'
import WeddingTeam from './pages/WeddingTeam'

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
        <Route path="/europe/:country" element={<CrawledCountries />} />
        <Route path="/venue/:slug" element={<CrawledVenueDetail />} />
        <Route path="/europe" element={<Navigate to="/europe/italy" replace />} />
        {/* 旧路由兼容重定向 */}
        <Route path="/crawled-destinations" element={<Navigate to="/europe/italy" replace />} />
        <Route path="/crawled-france" element={<Navigate to="/europe/france" replace />} />
        <Route path="/crawled-greece" element={<Navigate to="/europe/greece" replace />} />
        <Route path="/crawled-portugal" element={<Navigate to="/europe/portugal" replace />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/wedding-team" element={<WeddingTeam />} />
      </Routes>
    </>
  )
}
