import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Login from './pages/Login'
import Register from './pages/Register'
import OrderDetail from './pages/OrderDetail'
import CrawledCountries from './pages/CrawledCountries'
import CrawledVenueDetail from './pages/CrawledVenueDetail'
import Destinations from './pages/Destinations'
import WeddingTeam from './pages/WeddingTeam'
import WeddingTeamDetail from './pages/WeddingTeamDetail'
import Flowers from './pages/Flowers'
import FlowersDetail from './pages/FlowersDetail'
import Dresses from './pages/Dresses'
import DressesDetail from './pages/DressesDetail'
import Photography from './pages/Photography'
import PhotographyDetail from './pages/PhotographyDetail'
import NewHome from './pages/NewHome'
import Wine from './pages/Wine'
import WineDetail from './pages/WineDetail'

const scrollCache: Record<string, number> = {}

// 暴露到 window 供 BackButton 等组件调用
if (typeof window !== 'undefined') {
  (window as any).__scrollCache = scrollCache
  ;(window as any).__saveScrollPos = (path: string) => {
    const nhIntro = document.querySelector('.nh-intro')
    if (nhIntro) {
      scrollCache[path] = nhIntro.scrollTop
    } else {
      scrollCache[path] = window.scrollY
    }
  }
}

// 获取当前页面的实际滚动容器
function getScrollContainer(): Element | Window {
  const main = document.querySelector('.nh-intro')
  if (main) return main
  return window
}

function getScrollTop(el: Element | Window): number {
  return el instanceof Window ? el.scrollY : el.scrollTop
}

function setScrollTop(el: Element | Window, value: number) {
  if (el instanceof Window) el.scrollTo(0, value)
  else el.scrollTop = value
}

function ScrollRestoration() {
  const { pathname } = useLocation()

  // 路由切换时恢复滚动位置
  useEffect(() => {
    // photography / wedding-team 详情页每次进入都回到顶部，不恢复滚动位置
    if (pathname.startsWith('/photography/') || pathname.startsWith('/wedding-team/')) {
      let attempts = 0
      const resetTop = () => {
        const nhIntro = document.querySelector('.nh-intro')
        const container: Element | Window = nhIntro || window
        setScrollTop(container, 0)
        attempts++
        if (attempts < 5) setTimeout(resetTop, 60)
      }
      const timer = setTimeout(resetTop, 60)
      delete scrollCache[pathname]
      return () => clearTimeout(timer)
    }
    const savedPos = scrollCache[pathname]
    if (savedPos !== undefined && savedPos > 0) {
      let attempts = 0
      const tryRestore = () => {
        const nhIntro = document.querySelector('.nh-intro')
        const container: Element | Window = nhIntro || window
        setScrollTop(container, savedPos)
        attempts++
        if (attempts < 5) setTimeout(tryRestore, 60)
      }
      const timer = setTimeout(tryRestore, 60)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <ScrollRestoration />
      <Routes>
        <Route path="/" element={<NewHome />} />
        <Route path="/new-home" element={<NewHome />} />
        <Route path="/old-home" element={<Home />} />
        {/* Listing 页面已下线，统一重定向到首页 */}
        <Route path="/listing" element={<Navigate to="/" replace />} />
        <Route path="/listing/destination" element={<Navigate to="/" replace />} />
        <Route path="/listing/destination/:cityId" element={<Navigate to="/" replace />} />
        <Route path="/listing/:moduleId" element={<Navigate to="/" replace />} />
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
        <Route path="/flowers" element={<Flowers />} />
        <Route path="/flowers/:slug" element={<FlowersDetail />} />
        <Route path="/dresses" element={<Dresses />} />
        <Route path="/dresses/:slug" element={<DressesDetail />} />
        <Route path="/photography" element={<Photography />} />
        <Route path="/photography/:slug" element={<PhotographyDetail />} />
        <Route path="/wine" element={<Wine />} />
        <Route path="/wine/:productId" element={<WineDetail />} />
        <Route path="/wedding-team" element={<WeddingTeam />} />
        <Route path="/wedding-team/:slug" element={<WeddingTeamDetail />} />
      </Routes>
    </>
  )
}
