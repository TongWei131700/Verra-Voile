import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { proxyImage } from '../utils/imageProxy'
import ewLogo from '../assets/europewedding-logo.png'
import Seo from '../components/Seo'
import {
  setSelectedItem,
  updateSelectedItem,
  removeSelectedProduct,
  isProductSelected,
  onLoginSuccess,
} from '../utils/selectedProducts'

const API_BASE = import.meta.env.VITE_API_URL || ''
const CATEGORY_ID = 'destination'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

interface VenueDetail {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  region: string
  city: string
  cityEn: string
  address: string
  postalCode: string
  latitude: number | null
  longitude: number | null
  tagline: string
  description: string
  coverImage: string
  galleryImages: string[]
  venueTypes: string[]
  amenities: { titleCn: string; title: string; items: { labelCn: string; label: string }[] }[]
  capacity: string
  builtYear: string
  landSize: string
  phone: string
  website: string
  sourceUrl: string
  sourceName: string
  price?: number
  priceUnit: string
}

function mapApiDetail(row: any): VenueDetail {
  let galleryImages: string[] = []
  let rawVenueTypes: any[] = []
  let amenities: { titleCn: string; title: string; items: { labelCn: string; label: string }[] }[] = []

  try { galleryImages = typeof row.gallery_images === 'string' ? JSON.parse(row.gallery_images) : (row.gallery_images || []) } catch { /* ignore */ }
  try { rawVenueTypes = typeof row.venue_types === 'string' ? JSON.parse(row.venue_types) : (row.venue_types || []) } catch { /* ignore */ }
  const venueTypes = rawVenueTypes.map((t: any) => typeof t === 'string' ? t : (t.name_cn || t.name || String(t)))
  try {
      const rawAmenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || [])
      amenities = rawAmenities.map((g: any) => ({
        titleCn: g.titleCn || g.title_cn || g.title || '',
        title: g.title || '',
        items: (g.items || []).map((item: any) =>
          typeof item === 'string' ? { labelCn: item, label: item } : item
        ),
      }))
    } catch { /* ignore */ }

  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    country: row.country_cn || row.country || '',
    countryEn: row.country || '',
    region: row.region || '',
    city: row.city_cn || row.city || '',
    cityEn: row.city || '',
    address: row.address || '',
    postalCode: row.postal_code || '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    tagline: row.tagline_cn || row.tagline || '',
    description: row.description_cn || row.description || '',
    coverImage: row.cover_image || '',
    galleryImages,
    venueTypes,
    amenities,
    capacity: row.capacity || '',
    builtYear: row.built_year || '',
    landSize: row.land_size || '',
    phone: row.phone || '',
    website: row.website || '',
    sourceUrl: row.source_url || '',
    sourceName: row.source_name || '',
    price: row.price ?? undefined,
    priceUnit: row.price_unit || '€',
  }
}

export default function DestinationsDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [heroIndex, setHeroIndex] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [booked, setBooked] = useState(false)
  const [galleryCols, setGalleryCols] = useState(3)
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const aboutRef = useRef<HTMLElement>(null)

  // 获取详情数据
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`${API_BASE}/api/products/crawled-venues/${slug}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setVenue(mapApiDetail(res.data))
          setBooked(isProductSelected(CATEGORY_ID, slug))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  // 修正已选目的地商品的价格（历史数据可能存了 price=0）
  useEffect(() => {
    if (!venue || !booked) return
    updateSelectedItem({
      categoryId: CATEGORY_ID,
      productId: venue.slug,
      name: venue.name,
      nameEn: venue.nameEn,
      price: venue.price || 0,
      unit: venue.priceUnit || '',
      image: venue.coverImage,
    })
  }, [venue, booked])

  // 加入意向单后设置列表页锚点
  useEffect(() => {
    if (booked && venue) sessionStorage.setItem('scroll_anchor_destinations', venue.slug)
  }, [booked, venue])

  // Scroll 追踪
  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

  // IntersectionObserver：about 区域可见时显示底部预定栏
  useEffect(() => {
    if (!aboutRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) setShowBar(true)
        else setShowBar(false)
      },
      { threshold: 0 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [venue])

  // Hero 轮播自动切换
  useEffect(() => {
    if (!venue || heroPaused) return
    const total = Math.min(venue.galleryImages.length, 3)
    if (total < 2) return
    const timer = setInterval(() => {
      setHeroIndex(prev => {
        setHeroPrev(prev)
        setTimeout(() => setHeroPrev(null), 650)
        return (prev + 1) % total
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [venue, heroPaused])

  const pauseHeroCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

  // 响应列数：宽屏 3 列，窄屏 2 列，手机 1 列
  useEffect(() => {
    const update = () => setGalleryCols(window.innerWidth >= 1100 ? 3 : window.innerWidth >= 500 ? 2 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const goHeroSlide = useCallback((idx: number) => {
    if (idx === heroIndex) return
    setHeroPrev(heroIndex)
    setHeroIndex(idx)
    pauseHeroCarousel()
    setTimeout(() => setHeroPrev(null), 650)
  }, [heroIndex, pauseHeroCarousel])

  useEffect(() => {
    return () => { if (heroTimerRef.current) clearTimeout(heroTimerRef.current) }
  }, [])


  // 图集滚动加载：窗口滚动到底部附近时追加一批图片
  useEffect(() => {
    if (!venue) return
    const totalGallery = venue.galleryImages.slice(3).length
    const perPage = window.innerWidth <= 900 ? 6 : 12
    const maxPage = Math.ceil(totalGallery / perPage)
    const onScroll = () => {
      if (galleryLoading || galleryPage >= maxPage) return
      const scrollBottom = window.innerHeight + window.scrollY
      const docHeight = document.documentElement.scrollHeight
      if (scrollBottom >= docHeight - 300) {
        setGalleryLoading(true)
        setTimeout(() => {
          setGalleryPage(prev => prev + 1)
          setGalleryLoading(false)
        }, 400)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [venue, galleryLoading, galleryPage])

  const handleBook = useCallback(() => {
    if (!venue) return
    if (booked) {
      setIsCanceling(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        removeSelectedProduct(CATEGORY_ID, venue.slug)
        setBooked(false)
        setIsCanceling(false)
      }, 1200)
    } else {
      setIsBooking(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        setSelectedItem({
          categoryId: CATEGORY_ID,
          productId: venue.slug,
          name: venue.name,
          nameEn: venue.nameEn,
          price: venue.price || 0,
          unit: venue.priceUnit || '',
          image: venue.coverImage,
        })
        setBooked(true)
        setIsBooking(false)
      }, 1500)
    }
  }, [venue, booked])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    if (venue) {
      setSelectedItem({
        categoryId: CATEGORY_ID,
        productId: venue.slug,
        name: venue.name,
        nameEn: venue.nameEn,
        price: venue.price || 0,
        unit: venue.priceUnit,
        image: venue.coverImage,
      })
    }
    navigate('/order')
  }, [venue, navigate])

  if (loading) {
    return (
      <div className="dest-detail dest-detail--loading">
        <div className="dest-detail__skeleton">
          <div className="dest-detail__skeleton-hero shimmer" />
          <div className="dest-detail__skeleton-body">
            <div className="shimmer" style={{ height: 32, width: '50%', marginBottom: 16 }} />
            <div className="shimmer" style={{ height: 16, width: '30%', marginBottom: 24 }} />
            <div className="shimmer" style={{ height: 100, width: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="dest-detail dest-detail--empty">
        <p>场地不存在</p>
        <button onClick={() => navigate('/destinations')}>返回列表</button>
      </div>
    )
  }

  const heroImages = venue.galleryImages.slice(0, 3).length > 0
    ? venue.galleryImages.slice(0, 3)
    : [venue.coverImage]

  return (
    <div className="cd-page">
      <Seo
        title={venue ? `${venue.name} - ${venue.city}${venue.country}` : '目的地婚礼场地'}
        description={venue?.description?.slice(0, 150) || `探索${venue?.name || ''}，位于${venue?.city || ''}${venue?.country || ''}的精选目的地婚礼场地。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。`}
        keywords={`目的地婚礼场地, ${venue?.country || ''}婚礼, ${venue?.city || ''}婚礼, 海外婚礼`}
        ogImage={venue?.coverImage}
      />
      {/* ===== 1. Hero 区域：全屏图片 + 居中信息 ===== */}
      <section className="wt-hero" ref={heroRef}>
        {/* 全屏背景轮播 */}
        <div className="wt-hero__bg">
          {heroImages.map((img, i) => (
            <div
              key={i}
              className={`wt-hero__slide${i === heroIndex ? ' wt-hero__slide--active' : ''}${i === heroPrev ? ' wt-hero__slide--prev' : ''}`}
            >
              <FallbackImage src={proxyImage(img)} alt={`${venue.nameEn} ${i + 1}`} className="wt-hero__img" />
            </div>
          ))}
          {/* 渐变遮罩 */}
          <div className="wt-hero__overlay" />

          {/* 已加入意向单标记 */}
          {booked && (
            <div className="photo-booked-badge">
              <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M14 50 C10 46, 9 40, 12 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M66 50 C70 46, 71 40, 68 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                <ellipse cx="11" cy="44" rx="3" ry="1.5" transform="rotate(-30 11 44)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="69" cy="44" rx="3" ry="1.5" transform="rotate(30 69 44)" fill="currentColor" opacity="0.15"/>
                <circle cx="40" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
              </svg>
              <div className="photo-booked-badge__check">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="photo-booked-badge__text">已加入意向单</span>
            </div>
          )}
        </div>

        {/* 返回按钮 */}
        <BackButton to="/destinations" />

        {/* 居中信息面板 */}
        <div className={`wt-hero__info${booked ? ' wt-hero__info--booked' : ''}`}>
          <div className="wt-hero__headshot">
            <FallbackImage src={proxyImage(venue.galleryImages[2] || venue.galleryImages[1] || venue.coverImage)} alt={venue.nameEn} className="wt-hero__headshot-img" />
          </div>
          <div className="wt-hero__meta">
            <span className="wt-hero__badge">
              {venue.country}{venue.city ? ` · ${venue.city}` : ''}
            </span>
            <h1 className="wt-hero__name">{venue.name}</h1>
            <p className="wt-hero__name-en">{venue.nameEn}</p>
            <div className="wt-hero__divider" />
            <p className="wt-hero__tagline">{venue.tagline}</p>
            {venue.website && (
              <a href={venue.website} target="_blank" rel="noreferrer" className="wt-hero__website">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                </svg>
                访问官网
              </a>
            )}
          </div>
        </div>

        {/* 向下引导线 */}
        <div className="wt-hero__scroll-hint">
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">向下滚动</span>
        </div>

        {/* 预定/取消加载动画 */}
        {(isBooking || isCanceling) && (
          <div className="photo-booking-overlay">
            <div className="photo-booking-gift">
              <div className="photo-booking-gift__lid" />
              <div className="photo-booking-gift__box">
                <img src={ewLogo} alt="" className="photo-booking-gift__logo" />
              </div>
              <div className="photo-booking-gift__sparkles">
                <span /><span /><span /><span /><span /><span />
              </div>
            </div>
            <p className="photo-booking-text">{isCanceling ? '正在移出意向单…' : '正在加入意向单…'}</p>
          </div>
        )}
      </section>

      <div className="cd-content">
      {/* 关于我们 */}
      <section className="cd-about photo-about" ref={aboutRef}>
        <h2 className="cd-about__title">关于我们</h2>
        <div className="cd-about__divider" />
        <p className="photo-about__text">{venue.description}</p>
      </section>

      {/* 场地特色 */}
      {venue.amenities.length > 0 && (
        <section className="wt-services">
          <h2 className="cd-block__title">场地特色</h2>
          <div className="wt-services__wrapper">
            <div className="wt-services__grid">
              {venue.amenities.map((group, gi) => (
                <div key={gi} className="wt-services__group">
                  <h3 className="wt-services__group-title">{group.titleCn}</h3>
                  <p className="wt-services__group-en">{group.title}</p>
                  <ul className="wt-services__list">
                    {group.items.map((item, ii) => (
                      <li key={ii} className="wt-services__item">
                        <svg className="wt-services__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="wt-services__content">
                          <span className="wt-services__label">{item.labelCn}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 地点 */}
      <section className="dest-detail__location cd-block">
        <h2 className="cd-block__title">地点</h2>
        <div className="dest-detail__location-content">
          <div className="dest-detail__location-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p className="dest-detail__location-address">{venue.address}</p>
              <p className="dest-detail__location-city">
                {venue.city}{venue.region ? `, ${venue.region}` : ''} {venue.postalCode}
                {venue.country ? `, ${venue.country}` : ''}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 图集 */}
      {(() => {
        const galleryImages = venue.galleryImages.slice(3) // 跳过 Hero 前 3 张
        if (galleryImages.length === 0) return null
        const perPage = window.innerWidth <= 900 ? 6 : 12
        const visibleCount = Math.min(galleryPage * perPage, galleryImages.length)
        const hasMore = visibleCount < galleryImages.length
        const visibleImages = galleryImages.slice(0, visibleCount)

        return (
          <section className="dest-detail__gallery cd-block">
            <h2 className="cd-block__title">图集</h2>
            <div className="wt-portfolio__wrapper">
              <div className="wt-portfolio__columns">
                {Array.from({ length: galleryCols }).map((_, colIdx) => (
                  <div key={colIdx} className="wt-portfolio__col">
                    {visibleImages.filter((_: string, i: number) => i % galleryCols === colIdx).map((img: string, idx: number) => {
                      const origIdx = idx * galleryCols + colIdx
                      return (
                        <div key={origIdx} className="wt-portfolio__item" onClick={() => setLightboxIdx(origIdx)} style={{ cursor: 'zoom-in' }}>
                          <FallbackImage src={proxyImage(img)} alt={`${venue.nameEn} ${origIdx + 4}`} className="wt-portfolio__img" />
                        </div>
                      )
                    })}
                    {galleryLoading && Array.from({ length: 3 }).map((_, i) => (
                      <div key={`s-${colIdx}-${i}`} className="wt-portfolio__skeleton"><div className="wt-portfolio__skeleton-inner" /></div>
                    ))}
                  </div>
                ))}
              </div>
              {!hasMore && !galleryLoading && galleryImages.length > perPage && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '12px 0', color: '#b8a9a0', fontSize: 13 }}>
                  — 已展示全部 {galleryImages.length} 张图片 —
                </div>
              )}
            </div>
          </section>
        )
      })()}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (() => {
        const galleryImages = venue.galleryImages.slice(3)
        const total = galleryImages.length
        const currentIdx = lightboxIdx
        const goPrev = () => setLightboxIdx((currentIdx - 1 + total) % total)
        const goNext = () => setLightboxIdx((currentIdx + 1) % total)
        return (
          <div className="photo-hero__lightbox" onClick={() => setLightboxIdx(null)}>
            <button className="photo-hero__lightbox-close" onClick={() => setLightboxIdx(null)}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--left" onClick={e => { e.stopPropagation(); goPrev() }}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <img
              src={proxyImage(galleryImages[currentIdx])}
              alt=""
              className="photo-hero__lightbox-img"
              onClick={e => e.stopPropagation()}
            />
            <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--right" onClick={e => { e.stopPropagation(); goNext() }}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <div className="photo-hero__lightbox-counter" onClick={e => e.stopPropagation()}>
              {currentIdx + 1} / {total}
            </div>
          </div>
        )
      })()}

      {/* ===== 底部预定栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">起步价</span>
            {venue.price ? (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">{venue.priceUnit}{venue.price.toLocaleString()}起</span>
            ) : (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold">需咨询</span>
            )}
          </div>
          <div className="cd-book-bar__actions">
            <button className="cd-book-bar__consult" onClick={handleConsult}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              咨询
            </button>
            <button className={`cd-book-bar__book${booked ? ' cd-book-bar__book--cancel' : ''}`} onClick={handleBook}>
              {booked ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>移出意向单</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>加入意向单</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" onClick={() => setShowLoginModal(false)} />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => setShowLoginModal(false)}>✕</button>
            <h3 className="login-modal__title">登录</h3>
            <p className="login-modal__desc">登录后即可咨询订单</p>
            <LoginForm onSuccess={() => { setShowLoginModal(false); handleConsult() }} />
          </div>
        </>
      )}
    </div>
  )
}

// 登录/注册表单子组件
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSendEmailCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('请输入有效的邮箱地址'); return }
    setError(''); setEmailSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-email-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailCountdown(60)
        const timer = setInterval(() => setEmailCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 }), 1000)
      } else { setError(data.message || '发送失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setEmailSending(false) }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login-by-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: emailCode }) })
      const data = await res.json()
      if (res.ok && data.success) { onLoginSuccess(data.data.token, { email: data.data.email }); onSuccess() }
      else { setError(data.message || '登录失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      if (loginMode === 'register' && password !== confirmPassword) { setError('两次密码不一致'); setSubmitting(false); return }
      const url = loginMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = loginMode === 'login' ? { phone, password } : { phone, password, name: phone }
      const res = await fetch(`${API_BASE}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok && data.success) {
        onLoginSuccess(data.data.token, { phone: data.data.phone }); onSuccess()
      } else {
        if (data.code === 'NOT_REGISTERED') { setError('该手机号未注册，请注册'); setLoginMode('register') }
        else if (data.code === 'ALREADY_EXISTS') { setError('该手机号已注册，请登录'); setLoginMode('login') }
        else { setError(data.message || (loginMode === 'login' ? '登录失败' : '注册失败')) }
      }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const switchMode = () => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setError(''); setAuthMethod('phone') }

  return (
    <>
      <div className="login-modal__tabs">
        <button type="button" className={`login-modal__tab ${loginMode === 'login' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('login'); setError('') }}>登录</button>
        <button type="button" className={`login-modal__tab ${loginMode === 'register' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('register'); setAuthMethod('phone'); setError('') }}>注册</button>
      </div>
      {loginMode === 'login' && (
        <div className="login-modal__method-tabs">
          <button type="button" className={`login-modal__method-tab ${authMethod === 'email' ? 'active' : ''}`} onClick={() => { setAuthMethod('email'); setError('') }}>邮箱</button>
          <button type="button" className={`login-modal__method-tab ${authMethod === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMethod('phone'); setError('') }}>手机号</button>
        </div>
      )}
      {authMethod === 'phone' ? (
        <form className="login-modal__form" onSubmit={handleModalSubmit}>
          <div className="login-modal__field">
            <input type="tel" placeholder="请输入手机号码" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={11} />
          </div>
          <div className="login-modal__field">
            <input type="password" placeholder="请输入密码" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {loginMode === 'register' && (
            <div className="login-modal__field">
              <input type="password" placeholder="请确认密码" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          )}
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>
            {submitting ? (loginMode === 'login' ? '登录中...' : '注册中...') : (loginMode === 'login' ? '登 录' : '注 册')}
          </button>
        </form>
      ) : (
        <form className="login-modal__form" onSubmit={handleEmailLogin}>
          <div className="login-modal__field">
            <input type="email" placeholder="请输入邮箱地址" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="login-modal__field login-modal__field--code">
            <input type="text" placeholder="请输入6位验证码" required maxLength={6} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className="login-modal__send-btn" disabled={emailCountdown > 0 || emailSending} onClick={handleSendEmailCode}>
              {emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
            </button>
          </div>
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>{submitting ? '登录中...' : '登 录'}</button>
        </form>
      )}
      <p className="login-modal__tip">
        {loginMode === 'login' ? '还没有账号？' : '已有账号？'}
        <button type="button" className="login-modal__switch" onClick={switchMode}>
          {loginMode === 'login' ? '立即注册' : '去登录'}
        </button>
      </p>
    </>
  )
}
