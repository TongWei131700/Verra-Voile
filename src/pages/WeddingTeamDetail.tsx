import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import LoginModal from '../components/LoginModal'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import ewLogo from '../assets/europewedding-logo.png'
import defaultHeadshot from '../assets/default-headshot.jpg'
import Seo from '../components/Seo'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

// API 返回的详情数据
interface ApiTeamDetail {
  slug: string
  name: string
  name_cn: string
  source_url: string
  country: string
  country_cn: string
  city: string
  city_cn: string
  tagline: string
  description: string
  story: string
  founded_year: number | null
  team_members: any[] | string
  services: any[] | string
  service_areas: any[] | string
  specialties: string[] | string
  testimonials: any[] | string
  faq: any[] | string
  partners: any[] | string
  images: string[] | string
  cover_image: string
  headshot: string
  website: string
  price: number | null
}

// 前端组件使用的格式
interface TeamDetail {
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
  images: string[]
  website: string
  source: { name: string; url: string }
  specialties: string[]
  teamMembers: { name: string; nameCn: string; role: string; roleCn: string; description: string; descriptionCn: string; image: string; link?: string }[]
  services: { title: string; titleCn: string; items: { label: string; labelCn: string; desc?: string; descCn?: string }[] }[]
  serviceAreas: { name: string; nameCn: string }[]
  testimonials: { couple: string; text: string; textCn: string }[]
  partners: { name: string; role: string }[]
  faq: { q: string; a: string }[]
  price?: number
}

function getCurrencySymbol(country: string) {
  return country === 'United Kingdom' ? '£' : '€'
}

function parseJsonField<T>(field: T | string | null): T {
  if (!field) return [] as any
  if (typeof field === 'string') {
    try { return JSON.parse(field) } catch { return [] as any }
  }
  return field as T
}

function mapApiDetail(item: ApiTeamDetail): TeamDetail {
  const teamMembers = parseJsonField<any[]>(item.team_members).map((m: any) => ({
    name: m.name || '',
    nameCn: m.name_cn || '',
    role: m.role || '',
    roleCn: m.role_cn || '',
    description: m.description || '',
    descriptionCn: m.description_cn || '',
    image: m.image || '',
    link: m.link || '',
  }))
  const services = parseJsonField<any[]>(item.services).map((g: any) => ({
    title: g.title || '',
    titleCn: g.title_cn || '',
    items: (g.items || []).map((it: any) => ({
      label: it.label || '',
      labelCn: it.label_cn || '',
      desc: it.desc || '',
      descCn: it.desc_cn || '',
    })),
  }))
  const serviceAreas = parseJsonField<any[]>(item.service_areas).map((a: any) => ({
    name: a.name || '',
    nameCn: a.name_cn || '',
  }))
  const testimonials = parseJsonField<any[]>(item.testimonials).map((t: any) => ({
    couple: t.couple || '',
    text: t.text || '',
    textCn: t.text_cn || '',
  }))
  const faq = parseJsonField<any[]>(item.faq).map((f: any) => ({
    q: f.q_cn || f.q || '',
    a: f.a_cn || f.a || '',
  }))
  const partners = parseJsonField<any[]>(item.partners)
  const images = parseJsonField<string[]>(item.images)
  const specialties = parseJsonField<string[]>(item.specialties)

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
    images,
    website: item.website || '',
    source: {
      name: item.source_url ? item.source_url.replace(/https?:\/\/([^/]+).*/, '$1') : '',
      url: item.source_url || '',
    },
    specialties,
    teamMembers,
    services,
    serviceAreas,
    testimonials,
    partners,
    faq,
    price: item.price ?? undefined,
  }
}

export default function WeddingTeamDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<TeamDetail | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)
  const [galleryCols, setGalleryCols] = useState(3)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set())
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [showAllServices, setShowAllServices] = useState(false)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const aboutRef = useRef<HTMLElement>(null)
  const heroRef = useRef<HTMLElement>(null)


  // 从 API 获取详情数据
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-wedding-teams/${slug}`)
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
        console.error('获取婚礼团队详情失败:', err)
        if (!cancelled) setDetail(null)
      })
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  // 检查是否已预定
  useEffect(() => {
    if (detail) setIsBooked(isProductSelected('wedding-team', detail.slug))
  }, [detail])

  // 响应列数：宽屏 3 列，窄屏 2 列，手机 1 列
  useEffect(() => {
    const update = () => setGalleryCols(window.innerWidth >= 1100 ? 3 : window.innerWidth >= 500 ? 2 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 作品集滚动加载：窗口滚动到底部附近时追加一批图片
  useEffect(() => {
    if (!detail) return
    const totalGallery = detail.images.slice(3).length
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
  }, [detail, galleryLoading, galleryPage])

  // 预定/取消预定
  const handleBook = useCallback(() => {
    if (!detail) return
    if (isBooked) {
      setIsCanceling(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        removeSelectedProduct('wedding-team', detail.slug)
        setIsBooked(false)
        setIsCanceling(false)
      }, 1200)
    } else {
      setIsBooking(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        setSelectedItem({
          categoryId: 'wedding-team',
          productId: detail.slug,
          name: detail.name,
          nameEn: detail.nameEn,
          price: detail.price || 0,
          unit: getCurrencySymbol(detail.country),
          image: detail.cover,
        })
        setIsBooked(true)
        setIsBooking(false)
      }, 1500)
    }
  }, [detail, isBooked])

  // 加入意向单后设置列表页锚点
  useEffect(() => {
    if (isBooked && detail) sessionStorage.setItem('scroll_anchor_wedding-team', detail.slug)
  }, [isBooked, detail])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (detail) {
      sessionStorage.setItem('consult_context', JSON.stringify({
        name: detail.name, nameEn: detail.nameEn, image: detail.cover,
        price: detail.price, unit: getCurrencySymbol(detail.country), type: '婚礼团队',
        slug: detail.slug, route: `/wedding-team/${detail.slug}`,
      }))
    }
    navigate('/consult')
  }, [detail, navigate])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

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

  const pauseHeroCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

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
        <section className="wt-hero">
          <div className="wt-hero__bg">
            <div className="wt-hero__shimmer" />
            <div className="wt-hero__overlay" />
          </div>
          <BackButton to="/wedding-team" />
          <div className="wt-hero__info">
            <div className="wt-hero__headshot">
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="wt-hero__meta">
              <div style={{ height: 14, width: '35%', borderRadius: 4, marginBottom: 12, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 22, width: '50%', borderRadius: 4, marginBottom: 8, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 14, width: '30%', borderRadius: 4, marginBottom: 14, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 1, width: '40%', background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
              <div style={{ height: 14, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/wedding-team')}>← 返回列表</button>
        <div className="cd-loading"><p>未找到该婚礼策划公司</p></div>
      </div>
    )
  }

  return (
    <div className="cd-page">
      <Seo
        title={detail ? `${detail.name} - 婚礼策划团队` : '婚礼团队'}
        description={detail?.desc?.slice(0, 150) || `欧洲专业婚礼策划团队，提供目的地婚礼一站式服务。EuropeWedding 涵盖场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块。`}
        keywords={(() => {
          const country = detail?.country || ''
          const baseKeywords = ['婚礼团队', '婚礼策划', '目的地婚礼策划', '欧洲婚礼']
          if (detail?.nameEn) {
            baseKeywords.push(detail.nameEn)
          }
          if (country) {
            baseKeywords.push(`${country}婚礼`, `${country}旅拍`, `${country}婚礼策划`)
          }
          return baseKeywords.join(', ')
        })()}
        ogImage={detail?.cover}
        structuredData={detail ? [
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": detail.nameEn || detail.name,
            "alternateName": detail.name,
            "description": detail.desc?.slice(0, 200),
            "url": detail.website || `https://europewedding.cn/wedding-team/${detail.slug}`,
            "image": detail.cover,
            "logo": detail.headshot || undefined,
            "foundingDate": detail.foundedYear ? String(detail.foundedYear) : undefined,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": detail.cityEn || detail.city,
              "addressCountry": detail.countryEn || detail.country
            },
            "priceRange": detail.price ? `€${detail.price}起` : undefined,
            "areaServed": detail.country ? { "@type": "Country", "name": detail.countryEn || detail.country } : undefined
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://europewedding.cn/" },
              { "@type": "ListItem", "position": 2, "name": "婚礼团队", "item": "https://europewedding.cn/wedding-team" },
              { "@type": "ListItem", "position": 3, "name": detail.name }
            ]
          }
        ] : undefined}
      />
      {/* ===== 1. Hero 区域：全屏图片 + 居中信息 ===== */}
      <section className="wt-hero" ref={heroRef}>
        {/* 全屏背景轮播 */}
        <div className="wt-hero__bg">
          {detail.images.slice(0, 3).map((img, i) => (
            <div
              key={i}
              className={`wt-hero__slide${i === heroSlide ? ' wt-hero__slide--active' : ''}${i === heroPrev ? ' wt-hero__slide--prev' : ''}`}
            >
              <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${i + 1}`} className="wt-hero__img" />
            </div>
          ))}
          {/* 渐变遮罩 */}
          <div className="wt-hero__overlay" />

          {/* 已加入意向单标记 */}
          {isBooked && (
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
        <BackButton to="/wedding-team" />

        {/* 居中信息面板 */}
        <div className={`wt-hero__info${isBooked ? ' wt-hero__info--booked' : ''}`}>
          <div className="wt-hero__headshot">
            <FallbackImage src={proxyImage(detail.headshot || detail.cover)} alt={detail.nameEn} className="wt-hero__headshot-img" />
          </div>
          <div className="wt-hero__meta">
            <span className="wt-hero__badge">
              {detail.country}{detail.city ? ` · ${detail.city}` : ''}
              {detail.foundedYear ? ` · 成立于${detail.foundedYear}` : ''}
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

        {/* 向下引导线 */}
        <div className="wt-hero__scroll-hint">
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">Scroll</span>
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

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* 2. 关于我们 */}
        <section className="cd-about photo-about" ref={aboutRef}>
          <h2 className="cd-about__title">关于我们</h2>
          <div className="cd-about__divider" />
          <p className="photo-about__text">{detail.desc}</p>
        </section>

        {/* 4. 团队成员 */}
        {detail.teamMembers?.length > 0 && (() => {
          const isNarrow = window.innerWidth <= 900
          const visible = isNarrow && !showAllMembers ? detail.teamMembers.slice(0, 6) : detail.teamMembers
          const hasMore = isNarrow && detail.teamMembers.length > 6
          return (
          <section className="cd-block wt-team-section">
            <h2 className="cd-block__title">团队成员</h2>
            <div className="wt-team-wrapper">
              <div className="wt-team-grid">
                {visible.map((m, i) => {
                  const memberLink = m.link || detail.source.url || '#'
                  return (
                    <div key={i} className="wt-team-card">
                      <a href={memberLink} target="_blank" rel="noopener noreferrer" className="wt-team-card__avatar-link">
                        <div className="wt-team-card__avatar">
                          <FallbackImage src={m.image ? proxyImage(m.image) : defaultHeadshot} alt={m.nameCn || m.name} className="wt-team-card__photo" />
                        </div>
                      </a>
                      <h3 className="wt-team-card__name">{m.nameCn || m.name}</h3>
                      <p className="wt-team-card__role">{m.roleCn || m.role}</p>
                      <p className="wt-team-card__desc">{m.descriptionCn || m.description}</p>
                      <a className="wt-team-card__link" href={memberLink} target="_blank" rel="noopener noreferrer">
                        查看主页
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    </div>
                  )
                })}
              </div>
              {hasMore && !showAllMembers && (
                <>
                  <div className="photo-gallery__fade" />
                  <button className="wt-team-card__more" onClick={() => setShowAllMembers(true)}>查看更多</button>
                </>
              )}
            </div>
          </section>
          )
        })()}

        {/* 5. 服务项目 */}
        {detail.services?.length > 0 && (() => {
          const isNarrow = window.innerWidth <= 900
          const visibleServices = isNarrow && !showAllServices ? detail.services.slice(0, 2) : detail.services
          const hasMoreServices = isNarrow && detail.services.length > 2
          return (
          <section className="wt-services">
            <h2 className="cd-block__title">服务项目</h2>
            <div className="wt-services__wrapper">
              <div className="wt-services__grid">
                {visibleServices.map((group, gi) => (
                  <div key={gi} className="wt-services__group">
                    <h3 className="wt-services__group-title">{group.titleCn}</h3>
                    <p className="wt-services__group-en">{group.title}</p>
                    <ul className="wt-services__list">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="wt-services__item">
                          <svg className="wt-services__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          <span className="wt-services__content">
                            <span className="wt-services__label">{item.labelCn}</span>
                            {item.desc && <span className="wt-services__desc">{item.descCn || item.desc}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {hasMoreServices && !showAllServices && (
                <>
                  <div className="photo-gallery__fade" />
                  <button className="wt-team-card__more" onClick={() => setShowAllServices(true)}>查看更多</button>
                </>
              )}
            </div>
          </section>
          )
        })()}

        {/* 7. 作品集 */}
        {(() => {
          const galleryImages = detail.images.slice(3) // 跳过 Hero 前3张
          if (galleryImages.length === 0) return null
          const perPage = window.innerWidth <= 900 ? 6 : 12
          const visibleCount = Math.min(galleryPage * perPage, galleryImages.length)
          const hasMore = visibleCount < galleryImages.length
          const visibleImages = galleryImages.slice(0, visibleCount)

          return (
            <section className="wt-portfolio">
              <h2 className="cd-block__title">作品集</h2>
              <div className="wt-portfolio__wrapper">
                <div className="wt-portfolio__columns">
                  {Array.from({ length: galleryCols }).map((_, colIdx) => (
                    <div key={colIdx} className="wt-portfolio__col">
                      {visibleImages.filter((_: string, i: number) => i % galleryCols === colIdx).map((img: string, idx: number) => {
                        const origIdx = idx * galleryCols + colIdx
                        return (
                          <div key={origIdx} className="wt-portfolio__item" onClick={() => setGalleryLightbox(origIdx)} style={{ cursor: 'zoom-in' }}>
                            <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${origIdx + 4}`} className="wt-portfolio__img" />
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

        {/* 作品集 Lightbox */}
        {galleryLightbox !== null && (() => {
          const galleryImages = detail.images.slice(3)
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
      {(detail?.price !== undefined) && <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">起步价</span>
            {(detail!.price ?? 0) > 0 ? (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">{getCurrencySymbol(detail!.country)}{(detail!.price ?? 0).toLocaleString()}起</span>
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
      </div>}

      {/* 登录弹窗 */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onSuccess={() => { setShowLoginModal(false); handleConsult() }} desc="登录后即可咨询订单" />
      )}

    </div>
  )
}
