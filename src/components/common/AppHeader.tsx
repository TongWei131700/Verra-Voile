import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getSelectedProducts } from '../../utils/selectedProducts'
import LoginForm from '../LoginForm'

/** 判断当前页面是否显示返回按钮（首页不显示） */
function shouldShowBack(pathname: string): boolean {
  return !['/', '/new-home', '/old-home'].includes(pathname)
}

/** 判断当前是否为列表页（单段路径） */
function isListPage(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length === 1
}

const SEEN_KEY = 'wishlist_seen_count'

// 模块导航配置
const MODULES = [
  { name: '目的地婚礼', route: '/destinations' },
  { name: '婚礼团队', route: '/wedding-team' },
  { name: '花卉', route: '/flowers' },
  { name: '酒水宴席', route: '/wine' },
  { name: '礼服', route: '/dresses' },
  { name: '摄影', route: '/photography' },
]

export default function AppHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [, forceUpdate] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const showBack = shouldShowBack(pathname)
  const showMenu = true
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    const refresh = () => forceUpdate(n => n + 1)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  // 路由变化时触发重渲染 & 关闭菜单
  useEffect(() => {
    forceUpdate(n => n + 1)
    setMenuOpen(false)
  }, [pathname])

  // 抽屉打开时禁止背景滚动（包拈 iOS）
  useEffect(() => {
    if (menuOpen) {
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      // 清除菜单图标未读提示
      sessionStorage.setItem(SEEN_KEY, String(getSelectedProducts().length))
    } else {
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1)
      }
    }
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [menuOpen])

  // 登录弹窗关闭后刷新登录状态
  useEffect(() => {
    if (!showLoginModal) {
      setIsLoggedIn(!!localStorage.getItem('token'))
    }
  }, [showLoginModal])

  // 意向单总数
  const totalCount = getSelectedProducts().length
  // 未读新增数（菜单图标 badge）
  const unseenCount = Math.max(0, totalCount - parseInt(sessionStorage.getItem(SEEN_KEY) || '0', 10))

  const handleBack = () => {
    // 列表页直接回首页，避免 navigate(-1) 需要点击两次
    if (isListPage(pathname)) {
      navigate('/')
      return
    }
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <>
      <header className={`app-header${scrolled ? ' app-header--scrolled' : ''}`}>
        <div className="app-header__left">
          {showBack && (
            <button className="app-header__back" onClick={handleBack} aria-label="返回">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
        </div>

        <a className="app-header__logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          Europe Wedding
        </a>

        <div className="app-header__right">
          {showMenu && (
            <button
              className={`app-header__menu-btn${menuOpen ? ' app-header__menu-btn--open' : ''}`}
              onClick={() => setMenuOpen(v => !v)}
              aria-label="菜单"
            >
              <i>
                <span></span>
                <span></span>
                <span></span>
              </i>
              {unseenCount > 0 && <span className="app-header__menu-badge">{unseenCount}</span>}
            </button>
          )}
        </div>
      </header>

      {/* 抽屉始终渲染（SEO 友好），CSS 控制显隐 */}
      {menuOpen && <div className="app-header__drawer-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`app-header__drawer${menuOpen ? '' : ' app-header__drawer--hidden'}`}>
        <button type="button" className="app-header__drawer-close" onClick={() => setMenuOpen(false)}>✕</button>

        {/* 首页 */}
        <a href="/" className="app-header__drawer-home" onClick={(e) => { e.preventDefault(); navigate('/'); setMenuOpen(false); window.scrollTo(0, 0) }}>
          首页
        </a>

        <div className="app-header__drawer-sep" />

        {/* 模块导航 */}
        <div className="app-header__drawer-modules">
          {MODULES.map(mod => (
            <a
              key={mod.route}
              href={mod.route}
              className={`app-header__drawer-link${pathname === mod.route ? ' app-header__drawer-link--active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(mod.route); setMenuOpen(false); window.scrollTo(0, 0) }}
            >
              {mod.name}
            </a>
          ))}
        </div>

        <div className="app-header__drawer-sep" />

        {/* 账户 */}
        <div className="app-header__drawer-account">
          <a href="/order" className="app-header__drawer-link" onClick={(e) => { e.preventDefault(); navigate('/order'); setMenuOpen(false); window.scrollTo(0, 0) }}>
            意向单
            {totalCount > 0 && <span className="app-header__drawer-badge">{totalCount}</span>}
          </a>
          {isLoggedIn ? (
            <button type="button" className="app-header__drawer-link" onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('userPhone')
              localStorage.removeItem('userEmail')
              setIsLoggedIn(false)
              setMenuOpen(false)
            }}>
              退出登录
            </button>
          ) : (
            <button type="button" className="app-header__drawer-link" onClick={() => { setMenuOpen(false); setShowLoginModal(true) }}>
              登录 / 注册
            </button>
          )}
        </div>
      </aside>
      {/* 登录弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" onClick={() => setShowLoginModal(false)} />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => setShowLoginModal(false)}>✕</button>
            <h3 className="login-modal__title">登录</h3>
            <p className="login-modal__desc">登录后即可查看订单</p>
            <LoginForm onSuccess={() => setShowLoginModal(false)} />
          </div>
        </>
      )}
    </>
  )
}
