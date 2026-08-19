import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { setSelectedItem, removeSelectedProduct } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import ewLogo from '../assets/europewedding-logo.png'
import defaultHeadshot from '../assets/default-headshot.jpg'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

// 前端组件使用的格式
interface FloristDetail {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  city: string
  cityEn: string
  tagline: string
  desc: string
  foundedYear: number
  cover: string
  headshot?: string
  website: string
  phone: string
  email: string
  address: string
  source: { name: string; url: string }
  specialties: string[]
  teamMembers: { name: string; nameCn: string; role: string; roleCn: string; description: string; image: string }[]
  services: { title: string; titleCn: string; items: { label: string; labelCn: string; desc?: string }[] }[]
  designProcess: { step: number; title: string; titleCn: string; desc: string }[]
  pricingComparison: { service: string; traditional: string; amarante: string }[]
  weddingVenues: { name: string; nameCn: string; image: string }[]
  weddingStories: { venue: string; venueCn: string; tagline: string; taglineCn: string; image: string }[]
  infinityRoseProducts: { slug: string; name: string; nameCn: string; price: number; image: string; desc: string; descCn: string }[]
  testimonials: { couple: string; text: string; textCn: string }[]
  faq: { q: string; a: string }[]
  portfolioImages: string[]
  rating: { score: number; count: number; source: string } | null
  mediaFeatures: string[]
  price?: number
}

function parseJsonField<T>(field: T | string | null): T {
  if (!field) return [] as any
  if (typeof field === 'string') {
    try { return JSON.parse(field) } catch { return [] as any }
  }
  return field as T
}

function mapApiDetail(item: any): FloristDetail {
  const teamMembers = parseJsonField<any[]>(item.team_members).map((m: any) => ({
    name: m.name || '', nameCn: m.name_cn || '',
    role: m.role || '', roleCn: m.role_cn || '',
    description: m.description || '', image: m.image || '',
  }))
  const services = parseJsonField<any[]>(item.services).map((g: any) => ({
    title: g.title || '', titleCn: g.title_cn || '',
    items: (g.items || []).map((it: any) => ({
      label: it.label || '', labelCn: it.label_cn || '', desc: it.desc || '',
    })),
  }))
  const designProcess = parseJsonField<any[]>(item.design_process).map((d: any) => ({
    step: d.step || 0, title: d.title || '', titleCn: d.title_cn || '', desc: d.desc || '',
  }))
  const pricingComparison = parseJsonField<any[]>(item.pricing_comparison)
  const weddingVenues = parseJsonField<any[]>(item.wedding_venues).map((v: any) => ({
    name: v.name || '', nameCn: v.name_cn || '', image: v.image || '',
  }))
  const weddingStories = parseJsonField<any[]>(item.wededing_stories || item.wedding_stories).map((s: any) => ({
    venue: s.venue || '', venueCn: s.venue_cn || '',
    tagline: s.tagline || '', taglineCn: s.tagline_cn || '', image: s.image || '',
  }))
  const infinityRoseProducts = parseJsonField<any[]>(item.infinity_rose_products).map((p: any) => ({
    slug: p.slug || '', name: p.name || '', nameCn: p.name_cn || '', price: p.price || 0,
    image: p.image || '', desc: p.desc || '', descCn: p.desc_cn || '',
  }))
  const testimonials = parseJsonField<any[]>(item.testimonials).map((t: any) => ({
    couple: t.couple || '', text: t.text || '', textCn: t.text_cn || '',
  }))
  const faq = parseJsonField<any[]>(item.faq).map((f: any) => ({
    q: f.q_cn || f.q || '', a: f.a_cn || f.a || '',
  }))
  const portfolioImages = parseJsonField<string[]>(item.portfolio_images)
  const specialties = parseJsonField<string[]>(item.specialties)
  const rating = item.rating ? (typeof item.rating === 'string' ? JSON.parse(item.rating) : item.rating) : null
  const mediaFeatures = parseJsonField<string[]>(item.media_features)

  return {
    slug: item.slug,
    name: item.name_cn || item.name,
    nameEn: item.name,
    country: item.country_cn || item.country,
    countryEn: item.country,
    city: item.city_cn || item.city,
    cityEn: item.city,
    tagline: item.tagline || '',
    desc: item.description || '',
    foundedYear: item.founded_year || 0,
    cover: item.cover_image || '',
    headshot: item.headshot || '',
    website: item.website || '',
    phone: item.phone || '',
    email: item.email || '',
    address: item.address || '',
    source: {
      name: item.source_url ? item.source_url.replace(/https?:\/\/([^/]+).*/, '$1') : '',
      url: item.source_url || '',
    },
    specialties,
    teamMembers,
    services,
    designProcess,
    pricingComparison,
    weddingVenues,
    weddingStories,
    infinityRoseProducts,
    testimonials,
    faq,
    portfolioImages,
    rating,
    mediaFeatures,
    price: item.price ?? undefined,
  }
}

export default function FlowersDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<FloristDetail | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(() => {
    return sessionStorage.getItem(`flower_wishlist_${slug}`) !== null
  })
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [gallerySuppressUntil, setGallerySuppressUntil] = useState(0)
  const [galleryTick, setGalleryTick] = useState(0)
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)
  const [galleryCols, setGalleryCols] = useState(3)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set())
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [showAllServices, setShowAllServices] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [modalProduct, setModalProduct] = useState<{ nameCn: string; name: string; price: number; priceFrom?: boolean; image: string; desc: string; descCn: string; category?: string } | null>(null)
  const [modalQty, setModalQty] = useState(1)
  const [selectedFlowers, setSelectedFlowers] = useState<{ nameCn: string; name: string; price: number; qty: number; image: string }[]>(() => {
    try {
      const raw = sessionStorage.getItem(`selected_flowers_${slug}`)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [showFlowerList, setShowFlowerList] = useState(false)
  const [zoomImage, setZoomImage] = useState<string | null>(null)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 已选花朵变化时持久化到 sessionStorage
  useEffect(() => {
    if (slug) {
      sessionStorage.setItem(`selected_flowers_${slug}`, JSON.stringify(selectedFlowers))
    }
  }, [selectedFlowers, slug])

  // 弹窗打开时锁定背景滚动
  useEffect(() => {
    if (modalProduct) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [modalProduct])
  const aboutRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)

  // 从 API 获取详情数据
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-florists/${slug}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return
        if (json.success && json.data) {
          setDetail(mapApiDetail(json.data))
        } else {
          setDetail(null)
        }
      })
      .catch(err => {
        console.error('获取花店详情失败:', err)
        if (!cancelled) setDetail(null)
      })
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  // 检查是否已预定（从 sessionStorage 意向单读取）
  useEffect(() => {
    if (detail && slug) {
      setIsBooked(sessionStorage.getItem(`flower_wishlist_${slug}`) !== null)
    }
  }, [detail, slug])

  // 响应列数
  useEffect(() => {
    const update = () => setGalleryCols(window.innerWidth >= 1100 ? 3 : window.innerWidth >= 500 ? 2 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // "查看更多"延迟
  useEffect(() => {
    if (gallerySuppressUntil > 0 && !galleryLoading) {
      const delay = gallerySuppressUntil - Date.now()
      if (delay > 0) {
        const t = setTimeout(() => setGalleryTick(n => n + 1), delay)
        return () => clearTimeout(t)
      }
    }
  }, [gallerySuppressUntil, galleryLoading])

  // 预定/取消预定
  const handleBook = useCallback(() => {
    if (!detail) return
    if (isBooked) {
      setIsCanceling(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        removeSelectedProduct('floral', detail.slug)
        setSelectedFlowers([])
        if (detail.slug) {
          sessionStorage.removeItem(`selected_flowers_${detail.slug}`)
          sessionStorage.removeItem(`flower_wishlist_${detail.slug}`)
        }
        setIsBooked(false)
        setIsCanceling(false)
      }, 1200)
    } else {
      setIsBooking(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        setSelectedItem({
          categoryId: 'floral',
          productId: detail.slug,
          name: detail.name,
          nameEn: detail.nameEn,
          price: detail.price || 0,
          unit: '£',
          image: detail.cover,
        })
        // 存储到统一意向单格式
        if (detail.slug) {
          const wishlistItem = {
            slug: detail.slug,
            name: detail.nameEn,
            nameCn: detail.name,
            image: detail.cover,
            type: 'service' as const,
            price: detail.price || 0,
            addedAt: Date.now()
          }
          sessionStorage.setItem(`flower_wishlist_${detail.slug}`, JSON.stringify(wishlistItem))
        }
        setIsBooked(true)
        setIsBooking(false)
      }, 1500)
    }
  }, [detail, isBooked])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) { setShowLoginModal(true); return }
    if (detail) {
      setSelectedItem({
        categoryId: 'floral', productId: detail.slug,
        name: detail.name, nameEn: detail.nameEn,
        price: detail.price || 0, unit: '£', image: detail.cover,
      })
    }
    navigate('/order')
  }, [detail, navigate])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

  // Hero 轮播
  useEffect(() => {
    if (!detail || heroPaused) return
    const total = Math.min(detail.portfolioImages.length, 3)
    if (total === 0) return
    const timer = setInterval(() => {
      setHeroSlide(prev => {
        setHeroPrev(prev)
        setTimeout(() => setHeroPrev(null), 650)
        return (prev + 1) % total
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [detail, heroPaused])

  const pauseHeroCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

  const goHeroSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return
    setHeroPrev(heroSlide); setHeroSlide(idx)
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

  const toggleFaq = (idx: number) => {
    setOpenFaq(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx); else next.add(idx)
      return next
    })
  }

  if (dataLoading) {
    return (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/flowers')}>← 返回列表</button>
        <div className="cd-loading"><p>加载中…</p></div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/flowers')}>← 返回列表</button>
        <div className="cd-loading"><p>未找到该花艺工作室</p></div>
      </div>
    )
  }

  const heroImages = detail.portfolioImages.slice(0, 3)

  return (
    <div className="cd-page">
      {/* ===== 1. Hero 区域 ===== */}
      <section className="wt-hero" ref={heroRef}>
        <div className="wt-hero__bg">
          {heroImages.map((img, i) => (
            <div
              key={i}
              className={`wt-hero__slide${i === heroSlide ? ' wt-hero__slide--active' : ''}${i === heroPrev ? ' wt-hero__slide--prev' : ''}`}
            >
              <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${i + 1}`} className="wt-hero__img" />
            </div>
          ))}
          <div className="wt-hero__overlay" />
          {isBooked && (
            <div className="photo-booked-badge">
              <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
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

        <BackButton to="/flowers" />

        <div className={`wt-hero__info${isBooked ? ' wt-hero__info--booked' : ''}`}>
          <div className="wt-hero__headshot">
            <FallbackImage src={proxyImage(detail.headshot || detail.cover)} alt={detail.nameEn} className="wt-hero__headshot-img" />
          </div>
          <div className="wt-hero__meta">
            <span className="wt-hero__badge">
              {detail.country}{detail.city ? ` · ${detail.city}` : ''}
              {detail.rating ? ` · ★ ${detail.rating.score}` : ''}
            </span>
            <h1 className="wt-hero__name">{detail.name}</h1>
            <p className="wt-hero__name-en">{detail.nameEn}</p>
            <div className="wt-hero__divider" />
            <p className="wt-hero__tagline">{detail.tagline}</p>

            {detail.website && (
              <a href={detail.website} target="_blank" rel="noreferrer" className="wt-hero__website">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                </svg>
                Visit Website
              </a>
            )}
          </div>
        </div>

        <div className="wt-hero__scroll-hint">
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">Scroll</span>
        </div>

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

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* 2. 关于我们 */}
        <section className="cd-about photo-about" ref={aboutRef}>
          <h2 className="cd-about__title">关于我们</h2>
          <div className="cd-about__divider" />
          <p className="photo-about__text">{detail.desc}</p>

        </section>



        {/* 4. 婚礼花艺服务 */}
        {(() => {
          const isNarrow = window.innerWidth <= 900
          // 将所有服务组合并（服务组 + 服务流程），窄屏最多显示 2 组
          const allGroups: { titleCn: string; title: string; items: { labelCn: string; desc?: string }[] }[] = [
            ...(detail.services || []),
            ...(detail.designProcess?.length > 0 ? [{
              titleCn: '服务流程', title: 'Design Process',
              items: detail.designProcess.map(d => ({ labelCn: d.titleCn, desc: d.desc })),
            }] : []),
          ]
          const visibleGroups = isNarrow && !showAllServices ? allGroups.slice(0, 2) : allGroups
          const hasMore = isNarrow && allGroups.length > 2
          return (
          <section className="wt-services">
            <h2 className="cd-block__title">婚礼花艺服务</h2>
            <div className="wt-services__wrapper">
              <div className="wt-services__grid">
                {visibleGroups.map((group, gi) => (
                  <div key={gi} className="wt-services__group">
                    <h3 className="wt-services__group-title">{group.titleCn}</h3>
                    <p className="wt-services__group-en">{group.title}</p>
                    <ul className="wt-services__list">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="wt-services__item">
                          <svg className="wt-services__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          <span className="wt-services__content">
                            <span className="wt-services__label">{item.labelCn}</span>
                            {item.desc && <span className="wt-services__desc">{item.desc}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {hasMore && !showAllServices && (
                <>
                  <div className="photo-gallery__fade" />
                  <button className="wt-team-card__more" onClick={() => setShowAllServices(true)}>查看更多</button>
                </>
              )}
            </div>
          </section>
          )
        })()}



        {/* 9. 永生玫瑰产品 */}
        {(() => {
          if (!detail.infinityRoseProducts?.length) return null
          const isSelected = (nameCn: string) => selectedFlowers.some(f => f.nameCn === nameCn)
          const sorted = [...detail.infinityRoseProducts].sort((a, b) => {
            const aS = isSelected(a.nameCn) ? 0 : 1
            const bS = isSelected(b.nameCn) ? 0 : 1
            return aS - bS
          })
          return (
          <section className="cd-block" style={{ marginTop: '2rem' }}>
            <h2 className="cd-block__title">永生玫瑰系列</h2>
            <div className="floral-scroll-row">
              {sorted.map((p, i) => {
                const selected = isSelected(p.nameCn)
                const selItem = selectedFlowers.find(f => f.nameCn === p.nameCn)
                return (
                  <div key={i} className={`floral-scroll-card${selected ? ' floral-scroll-card--selected' : ''}`} onClick={() => { setModalProduct(p); setModalQty(selItem?.qty || 1) }}>
                    {selected && (
                      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2, background: '#a07c3a', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 3, boxShadow: '0 2px 8px rgba(160,124,58,0.3)' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        ×{selItem?.qty}
                      </div>
                    )}
                    {p.image && (
                      <div className="floral-scroll-card__img">
                        <img src={p.image} alt={p.nameCn} loading="lazy" />
                      </div>
                    )}
                    <div className="floral-scroll-card__body">
                      <p className="floral-scroll-card__name">{p.nameCn}</p>
                      <p className="floral-scroll-card__name-en">{p.name}</p>
                      <hr className="floral-scroll-card__divider" />
                      <p className="floral-scroll-card__price">
                        {selected && selItem ? (
                          <>£{(p.price * selItem.qty).toLocaleString()}</>
                        ) : (
                          <>£{p.price}</>
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          )
        })()}

        {/* 11. 作品集 */}
        {(() => {
          const galleryImages = detail.portfolioImages.slice(3)
          if (galleryImages.length === 0 && detail.portfolioImages.length === 0) return null
          const allPortfolio = detail.portfolioImages
          const perPage = galleryCols * 3
          const visibleCount = galleryPage * perPage
          const hasMore = visibleCount < allPortfolio.length
          const visibleImages = allPortfolio.slice(0, visibleCount)

          const loadMore = () => {
            setGallerySuppressUntil(Date.now() + 1000)
            setGalleryLoading(true)
            setTimeout(() => {
              setGalleryPage(prev => prev + 1)
              setGalleryLoading(false)
            }, 600)
          }

          return (
            <section className="wt-portfolio">
              <h2 className="cd-block__title">花艺作品集</h2>
              <div className="wt-portfolio__wrapper">
                <div className="wt-portfolio__columns">
                  {Array.from({ length: galleryCols }).map((_, colIdx) => (
                    <div key={colIdx} className="wt-portfolio__col">
                      {visibleImages.filter((_: string, i: number) => i % galleryCols === colIdx).map((img: string, idx: number) => {
                        const origIdx = idx * galleryCols + colIdx
                        return (
                          <div key={origIdx} className="wt-portfolio__item" onClick={() => setGalleryLightbox(origIdx)} style={{ cursor: 'zoom-in' }}>
                            <FallbackImage src={proxyImage(img)} alt={`婚礼作品 ${origIdx + 1}`} className="wt-portfolio__img" />
                          </div>
                        )
                      })}
                      {galleryLoading && Array.from({ length: 3 }).map((_, i) => (
                        <div key={`s-${colIdx}-${i}`} className="wt-portfolio__skeleton"><div className="wt-portfolio__skeleton-inner" /></div>
                      ))}
                    </div>
                  ))}
                </div>
                {hasMore && !galleryLoading && Date.now() >= gallerySuppressUntil && (galleryTick || true) && (
                  <>
                    <div className="photo-gallery__fade" />
                    <button className="photo-gallery__more" onClick={loadMore}>查看更多</button>
                  </>
                )}
              </div>
            </section>
          )
        })()}

        {/* 作品集 Lightbox */}
        {galleryLightbox !== null && (() => {
          const total = detail.portfolioImages.length
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
              <img src={proxyImage(detail.portfolioImages[currentIdx])} alt={`作品 ${currentIdx + 1}`} className="photo-hero__lightbox-img" onClick={e => e.stopPropagation()} />
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
            {selectedFlowers.length > 0 ? (
              <>
                <button onClick={() => setShowFlowerList(!showFlowerList)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, font: 'inherit' }}>
                  <span className="cd-book-bar__price-label">已选 {selectedFlowers.length} 件</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showFlowerList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">£{selectedFlowers.reduce((sum, f) => sum + f.price * f.qty, 0).toLocaleString()}</span>
              </>
            ) : (
              <>
                <span className="cd-book-bar__price-label">起步价</span>
                {(() => {
                  const displayPrice = detail.price ?? 0
                  return displayPrice > 0 ? (
                    <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">£{displayPrice.toLocaleString()}起</span>
                  ) : (
                    <span className="cd-book-bar__price-value cd-book-bar__price-value--gold">需咨询</span>
                  )
                })()}
              </>
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

      {/* 已选花朵列表 */}
      {showFlowerList && selectedFlowers.length > 0 && (
        <>
          <div onClick={() => setShowFlowerList(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.2)' }} />
          <div style={{
            position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, width: '90%', maxWidth: 400, maxHeight: '50vh',
            background: '#fff', borderRadius: 16, boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            animation: 'modalSlideUp 0.25s ease'
          }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#000' }}>已选花朵</span>
              <span style={{ fontSize: '0.8rem', color: '#999' }}>共 {selectedFlowers.reduce((s, f) => s + f.qty, 0)} 件</span>
            </div>
            <div style={{ overflowY: 'auto', padding: '8px 0' }}>
              {selectedFlowers.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
                  {f.image && <img src={f.image} alt={f.nameCn} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nameCn}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#999' }}>×{f.qty}</p>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a07c3a', whiteSpace: 'nowrap' }}>£{(f.price * f.qty).toLocaleString()}</span>
                  <button onClick={() => setSelectedFlowers(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ccc', flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#666' }}>合计</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a07c3a' }}>£{selectedFlowers.reduce((sum, f) => sum + f.price * f.qty, 0).toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
      {zoomImage && (
        <div onClick={() => setZoomImage(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10004,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out', animation: 'fadeIn 0.2s ease'
        }}>
          <img src={zoomImage} alt="" style={{
            maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain',
            borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
          }} />
        </div>
      )}

      {/* 商品详情弹窗 */}
      {modalProduct && (
        <>
          <div className="product-modal-backdrop" onClick={() => setModalProduct(null)} />
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="product-modal__close" onClick={() => setModalProduct(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="product-modal__img-wrap" onClick={() => modalProduct.image && setZoomImage(modalProduct.image)} style={{ cursor: 'zoom-in' }}>
              {modalProduct.image && <img src={modalProduct.image} alt={modalProduct.nameCn} />}
            </div>
            <div className="product-modal__info">
              <h3 className="product-modal__name">{modalProduct.nameCn}</h3>
              <p className="product-modal__name-en">{modalProduct.name}</p>
              {(modalProduct.descCn || modalProduct.desc) && <p className="product-modal__desc">{modalProduct.descCn || modalProduct.desc}</p>}
              <div className="product-modal__price-row">
                <span className="product-modal__price">£{modalProduct.price}</span>
                {modalProduct.priceFrom && <span className="product-modal__price-from">起</span>}
              </div>
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(180,165,145,0.2)', borderRadius: 12, overflow: 'hidden', width: 'fit-content', margin: '0 auto' }}>
                  <button onClick={() => setModalQty(q => Math.max(1, q - 1))} style={{ width: 44, height: 44, border: 'none', background: '#f0ebe4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="5" y1="12" x2="19" y2="12" stroke="#8a7e72" strokeWidth="2.5"/></svg>
                  </button>
                  <span style={{ width: 48, textAlign: 'center', fontSize: '1.05rem', fontWeight: 600, color: '#3a3530', borderLeft: '1px solid rgba(180,165,145,0.15)', borderRight: '1px solid rgba(180,165,145,0.15)', lineHeight: '44px' }}>{modalQty}</span>
                  <button onClick={() => setModalQty(q => q + 1)} style={{ width: 44, height: 44, border: 'none', background: '#f0ebe4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="#8a7e72" strokeWidth="2.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="#8a7e72" strokeWidth="2.5"/></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {selectedFlowers.some(f => f.nameCn === modalProduct.nameCn) ? (
                    <button onClick={() => { setSelectedFlowers(prev => prev.filter(f => f.nameCn !== modalProduct.nameCn)); setModalProduct(null) }} style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid rgba(200,80,80,0.2)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', color: '#b05050', background: 'rgba(200,80,80,0.04)' }}>清空</button>
                  ) : (
                    <button onClick={() => setModalProduct(null)} style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid rgba(180,165,145,0.2)', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', color: '#6b6058', background: 'rgba(0,0,0,0.02)' }}>取消</button>
                  )}
                  <button onClick={() => {
                    if (isBooking || !detail || !modalProduct) return
                    setModalProduct(null)
                    setIsBooking(true)
                    // 添加到已选花朵列表（已存在则替换数量）
                    setSelectedFlowers(prev => {
                      const existing = prev.find(f => f.nameCn === modalProduct.nameCn)
                      if (existing) {
                        return prev.map(f => f.nameCn === modalProduct.nameCn ? { ...f, qty: modalQty } : f)
                      }
                      return [...prev, { nameCn: modalProduct.nameCn, name: modalProduct.name, price: modalProduct.price, qty: modalQty, image: modalProduct.image }]
                    })
                    setTimeout(() => {
                      setSelectedItem({
                        categoryId: 'floral',
                        productId: detail.slug,
                        name: detail.name,
                        nameEn: detail.nameEn,
                        price: detail.price || 0,
                        unit: '£',
                        image: detail.cover,
                      })
                      setIsBooked(true)
                      setIsBooking(false)
                    }, 1500)
                  }} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', color: '#fff', background: 'linear-gradient(135deg, #b8a08a, #a08e76)' }}>
                    加入购物车 · £{modalProduct.price * modalQty}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
