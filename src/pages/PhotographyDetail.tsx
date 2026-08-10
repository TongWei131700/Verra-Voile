import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import ewLogo from '../assets/europewedding-logo.png'
import defaultHeadshot from '../assets/default-photographer-headshot.jpg'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

// 摄影师详情（与前端渲染字段对应）
interface PhotographerDetail {
  slug: string
  name: string
  nameEn: string
  categoryCn: string
  tagline: string
  desc: string
  photoStyles: string[]
  highlights: string[]
  style?: { title: string; items: { label: string; desc?: string }[] }[]
  cover: string
  images: string[]
  headshot?: string
  price?: number
  website?: string
  source: { name: string; url: string }
}

// 将 API 返回的 snake_case 映射为前端 camelCase
function mapApiDetail(row: any): PhotographerDetail {
  const parseJSON = (val: any, fallback: any = []) => {
    if (!val) return fallback
    if (typeof val === 'string') { try { return JSON.parse(val) } catch { return fallback } }
    return val
  }
  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    categoryCn: row.category_cn || '',
    tagline: row.tagline || '',
    desc: row.description || '',
    photoStyles: parseJSON(row.photo_styles),
    highlights: parseJSON(row.highlights),
    style: parseJSON(row.style, undefined),
    cover: row.cover_image || '',
    images: parseJSON(row.images),
    headshot: row.headshot || undefined,
    price: row.price ?? undefined,
    website: row.website || undefined,
    source: { name: row.source_name || '', url: row.source_url || '' },
  }
}

export default function PhotographyDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<PhotographerDetail | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const [heroLightbox, setHeroLightbox] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [gallerySuppressUntil, setGallerySuppressUntil] = useState(0)
  const [galleryTick, setGalleryTick] = useState(0) // 用于 1s 后触发重渲染
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)
  const [galleryScrolledToEnd, setGalleryScrolledToEnd] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aboutRef = useRef<HTMLElement>(null)
  const gallerySentinelRef = useRef<HTMLDivElement>(null)

  // 从 API 加载摄影师详情
  useEffect(() => {
    if (!slug) return
    setDataLoading(true)
    setDetail(null)
    fetch(`${API_BASE}/api/products/crawled-photographers/${slug}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setDetail(mapApiDetail(res.data))
        }
      })
      .catch(err => console.error('加载摄影师详情失败:', err))
      .finally(() => setDataLoading(false))
  }, [slug])


  // 检查是否已预定
  useEffect(() => {
    if (detail) setIsBooked(isProductSelected('photography', detail.slug))
  }, [detail])

  // “查看更多”点击后 1s 再出现
  useEffect(() => {
    if (gallerySuppressUntil > 0 && !galleryLoading) {
      const delay = gallerySuppressUntil - Date.now()
      if (delay > 0) {
        const t = setTimeout(() => setGalleryTick(n => n + 1), delay)
        return () => clearTimeout(t)
      }
    }
  }, [gallerySuppressUntil, galleryLoading])

  // 监听作品区域底部哨兵，滑到底才显示“查看更多”
  useEffect(() => {
    if (!gallerySentinelRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setGalleryScrolledToEnd(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(gallerySentinelRef.current)
    return () => observer.disconnect()
  }, [galleryPage, detail])


  // 预定/取消预定
  const handleBook = useCallback(() => {
    if (!detail) return
    if (isBooked) {
      setIsCanceling(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        removeSelectedProduct('photography', detail.slug)
        setIsBooked(false)
        setIsCanceling(false)
      }, 1200)
    } else {
      setIsBooking(true)
      // 先滚动到顶部，再播放预定动画
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        setSelectedItem({
          categoryId: 'photography',
          productId: detail.slug,
          name: detail.name,
          nameEn: detail.nameEn,
          price: detail.price || 0,
          unit: '€',
          image: detail.cover,
        })
        setIsBooked(true)
        setIsBooking(false)
      }, 1500)
    }
  }, [detail, isBooked])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    if (detail) {
      setSelectedItem({
        categoryId: 'photography',
        productId: detail.slug,
        name: detail.name,
        nameEn: detail.nameEn,
        price: detail.price || 0,
        unit: '€',
        image: detail.cover,
      })
    }
    navigate('/order')
  }, [detail, navigate])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  // 进入页面时滚动到顶部
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // Hero 轮播自动切换
  useEffect(() => {
    if (!detail || heroPaused) return
    const total = Math.min(detail.images.length, 3)
    const timer = setInterval(() => {
      setHeroSlide(prev => {
        setHeroPrev(prev)
        setTimeout(() => setHeroPrev(null), 650)
        return (prev + 1) % total
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [detail, heroPaused])

  // 手动操作后暂停 5 秒
  const pauseHeroCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

  // 切换幻灯片（新图覆盖旧图）
  const goHeroSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return
    setHeroPrev(heroSlide)
    setHeroSlide(idx)
    pauseHeroCarousel()
    setTimeout(() => setHeroPrev(null), 650)
  }, [heroSlide, pauseHeroCarousel])

  useEffect(() => {
    return () => { if (heroTimerRef.current) clearTimeout(heroTimerRef.current) }
  }, [])

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
  }, [detail])

  if (dataLoading) {
    return (
      <div className="cd-page">
        <section className="photo-hero">
          <div className="photo-hero__card">
            {/* 左侧：轮播区占位 */}
            <div className="photo-hero__carousel">
              <div className="photo-hero__slide photo-hero__slide--active">
                <div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
            {/* 右侧：信息面板占位 */}
            <div className="photo-hero__info" style={{ position: 'relative' }}>
              <div className="photo-hero__skeleton" style={{ zIndex: 0 }}>
                <div className="photo-hero__skeleton-shimmer" />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="photo-hero__headshot">
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="photo-hero__meta">
                  <div style={{ height: 18, width: '40%', borderRadius: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ height: 14, width: '70%', borderRadius: 4, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }} />
                  <div style={{ height: 14, width: '45%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/photography')}>← 返回列表</button>
        <div className="cd-loading"><p>未找到该摄影师</p></div>
      </div>
    )
  }

  return (
    <div className="cd-page">
      {/* ===== 1. Hero 区域 ===== */}
      <section className="photo-hero">
        <div className="photo-hero__card">
          <div className="photo-hero__carousel">
            {detail.images.slice(0, 3).map((img, i) => (
              <div
                key={i}
                className={`photo-hero__slide${i === heroSlide ? ' photo-hero__slide--active' : ''}${i === heroPrev ? ' photo-hero__slide--prev' : ''}`}
              >
                <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${i + 1}`} className="photo-hero__img" onClick={() => setHeroLightbox(true)} style={{ cursor: 'zoom-in' }} />
              </div>
            ))}
            <button className="photo-hero__arrow photo-hero__arrow--left" onClick={() => goHeroSlide((heroSlide - 1 + 3) % 3)}>
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
            </button>
            <button className="photo-hero__arrow photo-hero__arrow--right" onClick={() => goHeroSlide((heroSlide + 1) % 3)}>
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
            </button>
            <div className="photo-hero__dots">
              {detail.images.slice(0, 3).map((_, i) => (
                <button
                  key={i}
                  className={`photo-hero__dot${i === heroSlide ? ' photo-hero__dot--active' : ''}`}
                  onClick={() => goHeroSlide(i)}
                />
              ))}
            </div>
          </div>

          {/* Lightbox 放大查看 */}
          {heroLightbox && (
            <div className="photo-hero__lightbox" onClick={() => setHeroLightbox(false)}>
              <button className="photo-hero__lightbox-close" onClick={() => setHeroLightbox(false)}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--left" onClick={e => { e.stopPropagation(); goHeroSlide((heroSlide - 1 + 3) % 3) }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <img src={proxyImage(detail.images[heroSlide])} alt="" className="photo-hero__lightbox-img" onClick={e => e.stopPropagation()} />
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--right" onClick={e => { e.stopPropagation(); goHeroSlide((heroSlide + 1) % 3) }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <div className="photo-hero__lightbox-counter">{heroSlide + 1} / 3</div>
            </div>
          )}

        {/* 右侧：摄影师信息 */}
        <div className={`photo-hero__info${isBooked ? ' photo-hero__info--booked' : ''}`}>
          {/* 已预定徽章 — 右上角 */}
          {isBooked && (
            <div className="photo-booked-badge">
              <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
                {/* 左半花环 */}
                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M14 50 C10 46, 9 40, 12 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                <path d="M10 42 C8 38, 8 32, 11 28" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                {/* 右半花环 */}
                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M66 50 C70 46, 71 40, 68 35" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                <path d="M70 42 C72 38, 72 32, 69 28" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6"/>
                {/* 小叶片装饰 - 左 */}
                <ellipse cx="11" cy="44" rx="3" ry="1.5" transform="rotate(-30 11 44)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="9" cy="35" rx="2.5" ry="1.3" transform="rotate(-15 9 35)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="14" cy="52" rx="3" ry="1.5" transform="rotate(-45 14 52)" fill="currentColor" opacity="0.15"/>
                {/* 小叶片装饰 - 右 */}
                <ellipse cx="69" cy="44" rx="3" ry="1.5" transform="rotate(30 69 44)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="71" cy="35" rx="2.5" ry="1.3" transform="rotate(15 71 35)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="66" cy="52" rx="3" ry="1.5" transform="rotate(45 66 52)" fill="currentColor" opacity="0.15"/>
                {/* 顶部小星点 */}
                <circle cx="40" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
                <circle cx="34" cy="10" r="0.8" fill="currentColor" opacity="0.2"/>
                <circle cx="46" cy="10" r="0.8" fill="currentColor" opacity="0.2"/>
              </svg>
              <div className="photo-booked-badge__check">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="photo-booked-badge__text">已加入意向单</span>
            </div>
          )}
          <BackButton to="/photography" />
          <div className="photo-hero__headshot">
            <FallbackImage src={proxyImage(detail.headshot || defaultHeadshot)} alt={detail.nameEn} className="photo-hero__headshot-img" />
          </div>
          <div className="photo-hero__meta">
            <span className="photo-hero__badge">{detail.categoryCn}</span>
            <h1 className="photo-hero__name">{detail.name}</h1>
            <p className="photo-hero__name-en">{detail.nameEn}</p>
            <div className="photo-hero__divider" />
            <p className="photo-hero__tagline">{detail.tagline}</p>
            {detail.website && (
              <a href={detail.website} target="_blank" rel="noreferrer" className="photo-hero__website">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                </svg>
                Visit Website
              </a>
            )}
          </div>
        </div>
      </div>
      </section>

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* ===== 2. 摄影师介绍 ===== */}
        <section className="cd-about photo-about" ref={aboutRef}>
          <h2 className="cd-about__title">摄影师介绍</h2>
          <div className="cd-about__divider" />
          <p className="photo-about__text">{detail.desc}</p>
        </section>

        {/* ===== 3. 摄影风格 + 作品展 ===== */}
        <section className="photo-style-gallery">
          {/* 摄影风格 */}
          {detail.style && detail.style.length > 0 && (
            <div className="photo-style-gallery__style">
              <h2 className="cd-block__title">摄影风格</h2>
              <div className="photo-style__grid">
                {detail.style.map((group, gi) => (
                  <div key={gi} className="photo-style__group">
                    <h3 className="photo-style__group-title">{group.title}</h3>
                    <ul className="photo-style__list">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="photo-style__item">
                          <svg className="photo-style__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          <span className="photo-style__content">
                            <span className="photo-style__label">{item.label}</span>
                            {item.desc && <span className="photo-style__desc">{item.desc}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 分隔线 */}
          <div className="photo-style-gallery__divider" />

          {/* 作品展 */}
          {(() => {
            const galleryStart = 3
            const galleryImages = detail.images.slice(galleryStart)
            if (galleryImages.length === 0) return null
            const perPage = 6
            const visibleCount = galleryPage * perPage
            const hasMore = visibleCount < galleryImages.length
            const visibleImages = galleryImages.slice(0, visibleCount)

            const loadMore = () => {
              setGalleryScrolledToEnd(false)
              setGallerySuppressUntil(Date.now() + 1000)
              setGalleryLoading(true)
              setTimeout(() => {
                setGalleryPage(prev => prev + 1)
                setGalleryLoading(false)
              }, 600)
            }

            return (
              <div className="photo-style-gallery__gallery">
                <h2 className="cd-block__title">作品展</h2>
                <div className="photo-gallery__wrapper">
                  <div className="photo-gallery__columns">
                    {/* 左列 */}
                    <div className="photo-gallery__col">
                      {visibleImages.filter((_, i) => i % 2 === 0).map((img, idx) => {
                        const origIdx = idx * 2
                        return (
                          <div key={origIdx} className="photo-gallery__item" onClick={() => setGalleryLightbox(origIdx)} style={{ cursor: 'zoom-in' }}>
                            <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${origIdx + 1}`} className="photo-gallery__img" />
                          </div>
                        )
                      })}
                      {galleryLoading && Array.from({ length: 3 }).map((_, i) => (
                        <div key={`s-l-${i}`} className="photo-gallery__skeleton"><div className="photo-gallery__skeleton-inner" /></div>
                      ))}
                    </div>
                    {/* 右列 */}
                    <div className="photo-gallery__col">
                      {visibleImages.filter((_, i) => i % 2 === 1).map((img, idx) => {
                        const origIdx = idx * 2 + 1
                        return (
                          <div key={origIdx} className="photo-gallery__item" onClick={() => setGalleryLightbox(origIdx)} style={{ cursor: 'zoom-in' }}>
                            <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${origIdx + 1}`} className="photo-gallery__img" />
                          </div>
                        )
                      })}
                      {galleryLoading && Array.from({ length: 3 }).map((_, i) => (
                        <div key={`s-r-${i}`} className="photo-gallery__skeleton"><div className="photo-gallery__skeleton-inner" /></div>
                      ))}
                    </div>
                  </div>
                  {/* 哨兵：滑到此处才显示“查看更多” */}
                  {hasMore && <div ref={gallerySentinelRef} style={{ height: 1 }} />}
                  {hasMore && galleryScrolledToEnd && !galleryLoading && (
                    <>
                      <div className="photo-gallery__fade" />
                      <button className="photo-gallery__more" onClick={loadMore}>
                        查看更多
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </section>

        {/* 作品展 Lightbox */}
        {galleryLightbox !== null && (() => {
          const galleryStart = 3
          const galleryImages = detail.images.slice(galleryStart)
          const total = galleryImages.length
          const currentIdx = galleryLightbox
          const goPrev = () => setGalleryLightbox((currentIdx - 1 + total) % total)
          const goNext = () => setGalleryLightbox((currentIdx + 1) % total)

          return (
            <div className="photo-hero__lightbox" onClick={() => setGalleryLightbox(null)}>
              <button className="photo-hero__lightbox-close" onClick={() => setGalleryLightbox(null)}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--left" onClick={e => { e.stopPropagation(); goPrev() }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <img src={proxyImage(galleryImages[currentIdx])} alt={`作品 ${currentIdx + 1}`} className="photo-hero__lightbox-img" onClick={e => e.stopPropagation()} />
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--right" onClick={e => { e.stopPropagation(); goNext() }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <div className="photo-hero__lightbox-counter" onClick={e => e.stopPropagation()}>
                {currentIdx + 1} / {total}
              </div>
            </div>
          )
        })()}

      </div>

      {/* ===== 底部预定栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">价格</span>
            {(detail.price ?? 0) > 0 ? (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold">€{(detail.price ?? 0).toLocaleString()}起</span>
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
            <button className={`cd-book-bar__book${isBooked ? ' cd-book-bar__book--cancel' : ''}`} onClick={handleBook}>
              {isBooked ? (
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
      if (res.ok && data.success) { localStorage.setItem('token', data.data.token); localStorage.setItem('userEmail', data.data.email); onSuccess() }
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
        localStorage.setItem('token', data.data.token); localStorage.setItem('userPhone', data.data.phone); onSuccess()
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
