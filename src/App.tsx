import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { loadSelectedProductsFromServer, getSelectedProducts } from './utils/selectedProducts'
import Footer from './components/Footer'
import AppHeader from './components/common/AppHeader'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Upload from './pages/Upload'
import Login from './pages/Login'
import Register from './pages/Register'
import OrderDetail from './pages/OrderDetail'
import Consult from './pages/Consult'

import Destinations from './pages/Destinations'
import DestinationsDetail from './pages/DestinationsDetail'
import WeddingTeam from './pages/WeddingTeam'
import WeddingTeamDetail from './pages/WeddingTeamDetail'
import Flowers from './pages/Flowers'
import FlowersDetail from './pages/FlowersDetail'
import Dresses from './pages/Dresses'
import DressesDetail from './pages/DressesDetail'
import Photography from './pages/Photography'
import PhotographyDetail from './pages/PhotographyDetail'
import Wine from './pages/Wine'
import WineDetail from './pages/WineDetail'
import FlowerProductDetail from './pages/FlowerProductDetail'
import TravelPhoto from './pages/TravelPhoto'
import TravelPhotoDetail from './pages/TravelPhotoDetail'

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

  // 路由切换时处理滚动位置
  useEffect(() => {
    // 详情页和订单页每次进入都回到顶部
    const isDetailPage = /^\/(destinations|flowers|dresses|photography|wedding-team|wine)\/[^/]+/.test(pathname)
    const isOrderPage = pathname === '/order'
    if (isDetailPage || isOrderPage) {
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

    // 列表页：恢复之前保存的滚动位置（由 navFromList 在导航前保存）
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

  // 锚点滚动：返回列表页时自动滚动到之前加入意向单的卡片
  useEffect(() => {
    const isDetailPage = /^\/(destinations|flowers|dresses|photography|wedding-team|wine)\/[^/]+/.test(pathname)
    if (isDetailPage || pathname === '/order') return

    const categories = ['wine', 'photography', 'destinations', 'wedding-team', 'flowers', 'dresses']
    let anchorKey: string | null = null
    let anchorId: string | null = null
    for (const cat of categories) {
      const val = sessionStorage.getItem(`scroll_anchor_${cat}`)
      if (val) { anchorKey = `scroll_anchor_${cat}`; anchorId = val; break }
    }
    if (!anchorKey || !anchorId) return
    sessionStorage.removeItem(anchorKey)

    let attempts = 0
    const tryScroll = () => {
      const el = document.querySelector(`[data-scroll-id="${anchorId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (attempts < 10) {
        attempts++
        setTimeout(tryScroll, 100)
      }
    }
    const timer = setTimeout(tryScroll, 400)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}

export default function App() {
  const { pathname } = useLocation()

  // 全局兼容旧浏览器：JS 动态设置 --vh 变量（解决 100vh 在某些浏览器不准确的问题）
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
    }
    setVh()
    window.addEventListener('resize', setVh)
    return () => window.removeEventListener('resize', setVh)
  }, [])

  // 应用启动时，若用户已登录则从服务器恢复购物车
  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadSelectedProductsFromServer()
    }
  }, [])

  // 进入订单页时标记意向单已查看（清除未读提示）
  useEffect(() => {
    if (pathname === '/order') {
      sessionStorage.setItem('wishlist_seen_count', String(getSelectedProducts().length))
    }
  }, [pathname])

  return (
    <>
      <ScrollRestoration />
      <Routes>
        <Route path="/" element={<Home />} />
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
        <Route path="/consult" element={<Consult />} />

        <Route path="/destinations" element={<Destinations />} />
        <Route path="/destinations/france" element={<Destinations />} />
        <Route path="/destinations/italy" element={<Destinations />} />
        <Route path="/destinations/greece" element={<Destinations />} />
        <Route path="/destinations/spain" element={<Destinations />} />
        <Route path="/destinations/portugal" element={<Destinations />} />
        <Route path="/destinations/:slug" element={<DestinationsDetail />} />
        <Route path="/flowers" element={<Flowers />} />
        <Route path="/flowers/product/:slug" element={<FlowerProductDetail />} />
        <Route path="/flowers/:slug" element={<FlowersDetail />} />
        <Route path="/dresses" element={<Dresses />} />
        <Route path="/dresses/:slug" element={<DressesDetail />} />
        <Route path="/photography" element={<Photography />} />
        <Route path="/photography/france" element={<Photography />} />
        <Route path="/photography/italy" element={<Photography />} />
        <Route path="/photography/spain" element={<Photography />} />
        <Route path="/photography/united-kingdom" element={<Photography />} />
        <Route path="/photography/germany" element={<Photography />} />
        <Route path="/photography/greece" element={<Photography />} />
        <Route path="/photography/portugal" element={<Photography />} />
        <Route path="/photography/austria" element={<Photography />} />
        <Route path="/photography/norway" element={<Photography />} />
        <Route path="/photography/iceland" element={<Photography />} />
        <Route path="/photography/ireland" element={<Photography />} />
        <Route path="/photography/croatia" element={<Photography />} />
        <Route path="/photography/hungary" element={<Photography />} />
        <Route path="/photography/switzerland" element={<Photography />} />
        <Route path="/photography/belgium" element={<Photography />} />
        <Route path="/photography/netherlands" element={<Photography />} />
        <Route path="/photography/sweden" element={<Photography />} />
        <Route path="/photography/denmark" element={<Photography />} />
        <Route path="/photography/finland" element={<Photography />} />
        <Route path="/photography/czech" element={<Photography />} />
        <Route path="/photography/poland" element={<Photography />} />
        <Route path="/photography/slovenia" element={<Photography />} />
        <Route path="/photography/:slug" element={<PhotographyDetail />} />
        <Route path="/wine" element={<Wine />} />
        <Route path="/wine/:productId" element={<WineDetail />} />
        <Route path="/wedding-team" element={<WeddingTeam />} />
        <Route path="/wedding-team/france" element={<WeddingTeam />} />
        <Route path="/wedding-team/italy" element={<WeddingTeam />} />
        <Route path="/wedding-team/spain" element={<WeddingTeam />} />
        <Route path="/wedding-team/united-kingdom" element={<WeddingTeam />} />
        <Route path="/wedding-team/germany" element={<WeddingTeam />} />
        <Route path="/wedding-team/greece" element={<WeddingTeam />} />
        <Route path="/wedding-team/portugal" element={<WeddingTeam />} />
        <Route path="/wedding-team/austria" element={<WeddingTeam />} />
        <Route path="/wedding-team/norway" element={<WeddingTeam />} />
        <Route path="/wedding-team/iceland" element={<WeddingTeam />} />
        <Route path="/wedding-team/croatia" element={<WeddingTeam />} />
        <Route path="/wedding-team/hungary" element={<WeddingTeam />} />
        <Route path="/wedding-team/switzerland" element={<WeddingTeam />} />
        <Route path="/wedding-team/belgium" element={<WeddingTeam />} />
        <Route path="/wedding-team/netherlands" element={<WeddingTeam />} />
        <Route path="/wedding-team/sweden" element={<WeddingTeam />} />
        <Route path="/wedding-team/denmark" element={<WeddingTeam />} />
        <Route path="/wedding-team/finland" element={<WeddingTeam />} />
        <Route path="/wedding-team/czech" element={<WeddingTeam />} />
        <Route path="/wedding-team/poland" element={<WeddingTeam />} />
        <Route path="/wedding-team/slovenia" element={<WeddingTeam />} />
        <Route path="/wedding-team/:slug" element={<WeddingTeamDetail />} />
        <Route path="/travel-photo" element={<TravelPhoto />} />
        <Route path="/travel-photo/france" element={<TravelPhoto />} />
        <Route path="/travel-photo/italy" element={<TravelPhoto />} />
        <Route path="/travel-photo/spain" element={<TravelPhoto />} />
        <Route path="/travel-photo/united-kingdom" element={<TravelPhoto />} />
        <Route path="/travel-photo/germany" element={<TravelPhoto />} />
        <Route path="/travel-photo/greece" element={<TravelPhoto />} />
        <Route path="/travel-photo/switzerland" element={<TravelPhoto />} />
        <Route path="/travel-photo/portugal" element={<TravelPhoto />} />
        <Route path="/travel-photo/austria" element={<TravelPhoto />} />
        <Route path="/travel-photo/norway" element={<TravelPhoto />} />
        <Route path="/travel-photo/netherlands" element={<TravelPhoto />} />
        <Route path="/travel-photo/iceland" element={<TravelPhoto />} />
        <Route path="/travel-photo/ireland" element={<TravelPhoto />} />
        <Route path="/travel-photo/sweden" element={<TravelPhoto />} />
        <Route path="/travel-photo/denmark" element={<TravelPhoto />} />
        <Route path="/travel-photo/belgium" element={<TravelPhoto />} />
        <Route path="/travel-photo/hungary" element={<TravelPhoto />} />
        <Route path="/travel-photo/croatia" element={<TravelPhoto />} />
        <Route path="/travel-photo/finland" element={<TravelPhoto />} />
        <Route path="/travel-photo/czech" element={<TravelPhoto />} />
        <Route path="/travel-photo/poland" element={<TravelPhoto />} />
        <Route path="/travel-photo/slovenia" element={<TravelPhoto />} />
        <Route path="/travel-photo/estonia" element={<TravelPhoto />} />
        <Route path="/travel-photo/latvia" element={<TravelPhoto />} />
        <Route path="/travel-photo/lithuania" element={<TravelPhoto />} />
        <Route path="/travel-photo/slovakia" element={<TravelPhoto />} />
        <Route path="/travel-photo/luxembourg" element={<TravelPhoto />} />
        <Route path="/travel-photo/malta" element={<TravelPhoto />} />
        <Route path="/travel-photo/liechtenstein" element={<TravelPhoto />} />
        <Route path="/travel-photo/vatican" element={<TravelPhoto />} />
        <Route path="/travel-photo/monaco" element={<TravelPhoto />} />
        <Route path="/travel-photo/:slug" element={<TravelPhotoDetail />} />
      </Routes>
      {/* 公共精简头部：仅在业务模块页面显示（首页/订单/管理页除外） */}
      {!['/', '/order', '/consult', '/admin', '/upload', '/login', '/register'].includes(pathname) && <AppHeader />}
      {pathname !== '/order' && pathname !== '/consult' && <Footer />}
    </>
  )
}
