import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/europewedding-logo.png'
import coverDest from '../assets/cover-destination.jpg'
import coverTeam from '../assets/cover-team.jpg'
import coverFloral from '../assets/cover-floral.jpg'
import coverWine from '../assets/cover-wine-dining.jpg'
import coverDress from '../assets/cover-wedding-dress.jpg'
import coverPhoto from '../assets/cover-wedding-photography.jpg'
import LoginModal from '../components/LoginModal'
import Seo from '../components/Seo'
import { getSelectedProducts } from '../utils/selectedProducts'

interface ModuleDef {
  id: string
  title: string
  route: string
}

// 六个固定模块，路由与 Listing 页保持一致
const MODULES: ModuleDef[] = [
  { id: 'destination', title: '欧洲城堡', route: '/destinations' },
  { id: 'team', title: '婚礼团队', route: '/wedding-team' },
  { id: 'floral', title: '花卉', route: '/flowers' },
  { id: 'dress', title: '礼服', route: '/dresses' },
  { id: 'photography', title: '摄影', route: '/photography' },
  { id: 'wine', title: '酒水宴席', route: '/wine' },
]

// 酒水/宴席历史数据归并到 wine 分组
const mergeCategoryId = (id: string) => (id === 'dinner' || id === 'catering' ? 'wine' : id)

// 前三个模块使用本地压缩封面图（直接使用，不再预加载原图）
const COVER_OVERRIDES: Record<string, string> = {
  destination: coverDest,
  team: coverTeam,
  floral: coverFloral,
  wine: coverWine,
  dress: coverDress,
  photography: coverPhoto,
}

export default function NewHome() {
  const navigate = useNavigate()
  const [images, setImages] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userAccount, setUserAccount] = useState('')
  const mainRef = useRef<HTMLElement>(null)

  // 首页滚动位置记忆：持续追踪并保存到 sessionStorage
  useEffect(() => {
    const el = mainRef.current
    if (!el) return

    // 恢复滚动位置
    const saved = sessionStorage.getItem('nh-scroll-top')
    if (saved) {
      const pos = parseInt(saved, 10)
      if (pos > 0) {
        el.style.scrollBehavior = 'auto'
        el.scrollTop = pos
        requestAnimationFrame(() => { el.style.scrollBehavior = '' })
      }
    }

    // 持续追踪滚动位置（rAF + scroll 事件双保险）
    let rafId: number
    const savePos = () => sessionStorage.setItem('nh-scroll-top', String(el.scrollTop))
    const track = () => { savePos(); rafId = requestAnimationFrame(track) }
    rafId = requestAnimationFrame(track)
    el.addEventListener('scroll', savePos, { passive: true })
    return () => {
      cancelAnimationFrame(rafId)
      el.removeEventListener('scroll', savePos)
    }
  }, [loading])

  // 检查登录状态
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token')
    const phone = localStorage.getItem('userPhone')
    const email = localStorage.getItem('userEmail')
    if (token) {
      setIsLoggedIn(true)
      const account = phone || email || ''
      setUserAccount(account.length > 8 ? account.slice(0, 8) + '...' : account)
    } else {
      setIsLoggedIn(false)
      setUserAccount('')
    }
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userPhone')
    localStorage.removeItem('userEmail')
    setIsLoggedIn(false)
    setUserAccount('')
  }

  // 组件挂载时检查登录状态
  useEffect(() => {
    checkLoginStatus()
  }, [])

  // 登录弹窗关闭后重新检查登录状态
  useEffect(() => {
    if (!showLoginModal) {
      checkLoginStatus()
    }
  }, [showLoginModal])

  // 客服：跳转旧首页预约咨询区
  const goService = () => {
    setShowUserMenu(false)
    navigate('/old-home#rsvp')
    setTimeout(() => document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' }), 120)
  }

  // 从 API 获取分类图片（前三个模块固定使用压缩封面图）
  useEffect(() => {
    setImages(COVER_OVERRIDES)

    // 预加载所有封面图，完成后关闭骨架屏
    const urls = Object.values(COVER_OVERRIDES)
    let loaded = 0
    const total = urls.length
    const onLoaded = () => {
      loaded++
      if (loaded >= total) setLoading(false)
    }
    urls.forEach(url => {
      const img = new Image()
      img.onload = onLoaded
      img.onerror = onLoaded
      img.src = url
    })

    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.categories) {
          const map: Record<string, string> = {}
          for (const c of data.data.categories as { id: string; image: string }[]) {
            map[mergeCategoryId(c.id)] = c.image
          }
          setImages(prev => ({ ...prev, ...map, ...COVER_OVERRIDES }))
        }
      })
      .catch(() => {})
  }, [])

  const itemStyle = (id: string) =>
    images[id]
      ? { backgroundImage: `url(${images[id]})` }
      : { backgroundColor: '#2a2723' }

  const handleConsult = () => {
    navigate('/consult')
  }

  // 从首页进入列表页：清除缓存位置，确保列表页从顶部开始
  const navigateFromHome = (path: string) => {
    const cache = (window as any).__scrollCache
    if (cache) delete cache[path]
    navigate(path)
  }

  const renderItemContent = (m: ModuleDef) => (
    <div className="nh-content">
      <h2>{m.title}</h2>
      <div className="nh-wrapper">
        <Link to={m.route} className="nh-cta-link" onClick={() => navigateFromHome(m.route)}>查看</Link>
        <button type="button" onClick={handleConsult}>咨询</button>
      </div>
    </div>
  )

  return (
    <>
      <Seo
        title="欧洲目的地婚礼 | EuropeWedding 全程策划"
        description="EuropeWedding 提供欧洲 12 国 50+ 城市目的地婚礼全程策划服务，涵盖场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。"
        keywords="欧洲婚礼, 目的地婚礼, 海外婚礼, 婚礼策划, 意大利婚礼, 法国婚礼"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "EuropeWedding",
            "alternateName": "欧洲目的地婚礼",
            "url": "https://europewedding.cn",
            "logo": "https://europewedding.cn/logo.png",
            "description": "欧洲 12 国 50+ 城市目的地婚礼全程策划平台，涵盖场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块。",
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "CN"
            },
            "sameAs": [],
            "areaServed": [
              { "@type": "Country", "name": "Italy" },
              { "@type": "Country", "name": "France" },
              { "@type": "Country", "name": "Spain" },
              { "@type": "Country", "name": "Greece" },
              { "@type": "Country", "name": "United Kingdom" }
            ],
            "knowsAbout": ["目的地婚礼", "婚礼策划", "婚礼花卉", "婚纱礼服", "婚礼摄影", "婚礼酒水"]
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "EuropeWedding",
            "url": "https://europewedding.cn",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://europewedding.cn/destinations?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          }
        ]}
      />
      {/* 顶部固定导航（仿 villapiccolomini） */}
      <header className="nh-header">
        <div className="nh-container">
          <nav className="nh-menu-nav">
            <ul className="nh-menu-list">
              <li className="nh-logo">
                <Link to="/" aria-label="首页">
                  <img src={logoUrl} alt="EuropeWedding" />
                </Link>
              </li>
              <li className={`nh-user${isLoggedIn ? ' nh-user--logged' : ''}`}>
                <button type="button" className="nh-user__btn" aria-label="用户菜单" onClick={() => setShowUserMenu(v => !v)}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                  </svg>
                </button>
                {isLoggedIn && userAccount && (
                  <span className="nh-user__account">{userAccount}</span>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* 右侧全高抽屉菜单 */}
      {showUserMenu && (
        <>
          <div className="nh-drawer-backdrop" onClick={() => setShowUserMenu(false)} />
          <aside className="nh-drawer">
            <button type="button" className="nh-drawer__close" onClick={() => setShowUserMenu(false)}>✕</button>
            <nav className="nh-drawer__menu">
              {!isLoggedIn && (
                <button type="button" className="nh-drawer__item" onClick={() => { setShowUserMenu(false); setShowLoginModal(true) }}>登录</button>
              )}
              <Link to="/order" className="nh-drawer__item" onClick={() => setShowUserMenu(false)}>
                订单
                {getSelectedProducts().length > 0 && (
                  <span className="nh-drawer__badge">{getSelectedProducts().length}</span>
                )}
              </Link>
              <Link to="/order" className="nh-drawer__item" onClick={() => setShowUserMenu(false)}>客服</Link>
              {isLoggedIn && (
                <button type="button" className="nh-drawer__item" onClick={() => { setShowUserMenu(false); handleLogout() }}>退出登录</button>
              )}
            </nav>
          </aside>
        </>
      )}

      {/* 骨架屏：复用页面真实结构，文案/logo直接展示，图片区域显示shimmer */}
      {loading && (
        <div className="nh-skeleton-overlay">
          <header className="nh-header">
            <div className="nh-container">
              <nav className="nh-menu-nav">
                <ul className="nh-menu-list">
                  <li className="nh-logo">
                    <button type="button" aria-label="首页">
                      <img src={logoUrl} alt="EuropeWedding" />
                    </button>
                  </li>
                  <li className="nh-user">
                    <button type="button" className="nh-user__btn" aria-label="用户菜单">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                      </svg>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </header>
          <main className="nh-skeleton-intro">
            <section className="nh-desktop-only">
              {MODULES.slice(0, 3).map(m => (
                <div key={m.id} className="nh-item nh-skeleton-item">
                  <div className="nh-skeleton-shimmer" />
                  <div className="nh-content">
                    <h2>{m.title}</h2>
                    <div className="nh-wrapper">
                      <button type="button">查看</button>
                      <button type="button">咨询</button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            <section className="nh-desktop-only">
              {MODULES.slice(3).map(m => (
                <div key={m.id} className="nh-item nh-skeleton-item">
                  <div className="nh-skeleton-shimmer" />
                  <div className="nh-content">
                    <h2>{m.title}</h2>
                    <div className="nh-wrapper">
                      <button type="button">查看</button>
                      <button type="button">咨询</button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            {MODULES.map(m => (
              <section key={m.id} className="nh-mobile-only nh-skeleton-item">
                <div className="nh-skeleton-shimmer" />
                <div className="nh-mobile-container">
                  <h2>{m.title}</h2>
                  <div className="nh-wrapper">
                    <button type="button">查看</button>
                    <button type="button">咨询</button>
                  </div>
                </div>
              </section>
            ))}
          </main>
        </div>
      )}

      {/* 主体：滚动吸附容器 */}
      <main ref={mainRef} className="nh-intro">
        <h1 className="nh-sr-only">欧洲目的地婚礼 — 场地·团队·花卉·礼服·摄影·酒水一站式策划</h1>
        {/* 桌面端：每屏三块面板并排，六模块分两屏 */}
        <section className="nh-desktop-only">
          {MODULES.slice(0, 3).map(m => (
            <div key={m.id} className="nh-item" style={itemStyle(m.id)}>
              {renderItemContent(m)}
            </div>
          ))}
        </section>
        <section className="nh-desktop-only">
          {MODULES.slice(3).map(m => (
            <div key={m.id} className="nh-item" style={itemStyle(m.id)}>
              {renderItemContent(m)}
            </div>
          ))}
        </section>

        {/* 移动端：每个模块独立一屏 */}
        {MODULES.map((m, idx) => (
          <section key={m.id} className="nh-mobile-only" style={itemStyle(m.id)}>
            <div className="nh-mobile-container">
              <h2>{m.title}</h2>
              <div className="nh-wrapper">
                <Link to={m.route} className="nh-cta-link" onClick={() => navigateFromHome(m.route)}>查看</Link>
                <button type="button" onClick={handleConsult}>咨询</button>
              </div>
            </div>
            {idx < MODULES.length - 1 && (
              <div className="nh-scroll-hint">
                <svg className="nh-scroll-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="nh-scroll-text">滑动探索</span>
              </div>
            )}
          </section>
        ))}
      </main>

      {/* 登录/注册弹窗 */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onSuccess={() => { setShowLoginModal(false); setIsLoggedIn(true); setUserAccount(localStorage.getItem('userPhone') || localStorage.getItem('userEmail') || '') }} />
      )}
    </>
  )
}

