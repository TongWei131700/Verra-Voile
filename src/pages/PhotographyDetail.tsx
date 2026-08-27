import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import LoginModal from '../components/LoginModal'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import Seo from '../components/Seo'
import { CardHero } from '../components/DetailHero'

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
    style: (() => {
      const raw = parseJSON(row.style, undefined)
      if (!raw || !Array.isArray(raw)) return undefined
      return raw.map((g: any) => ({
        title: g.title || g.name || '',
        items: Array.isArray(g.items)
          ? g.items
          : Array.isArray(g.values)
            ? g.values.map((v: string) => ({ label: v }))
            : []
      }))
    })(),
    cover: row.cover_image || '',
    images: parseJSON(row.images),
    headshot: row.headshot || undefined,
    price: row.price ?? undefined,
    website: row.website || row.source_url || undefined,
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
  const [galleryPage, setGalleryPage] = useState(1)
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)
  const [galleryCols, setGalleryCols] = useState(3)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const aboutRef = useRef<HTMLElement>(null)

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

  // 响应列数：宽屏 3 列，窄屏 2 列，手机 1 列
  useEffect(() => {
    const update = () => setGalleryCols(window.innerWidth >= 1100 ? 3 : window.innerWidth >= 500 ? 2 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])


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

  // 加入意向单后设置列表页锚点
  useEffect(() => {
    if (isBooked && detail) sessionStorage.setItem('scroll_anchor_photography', detail.slug)
  }, [isBooked, detail])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (detail) {
      sessionStorage.setItem('consult_context', JSON.stringify({
        name: detail.name, nameEn: detail.nameEn, image: detail.cover,
        price: detail.price, unit: '€', type: '摄影',
        slug: detail.slug, route: `/photography/${detail.slug}`,
      }))
    }
    navigate('/consult')
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

  // 作品展滚动加载：窗口滚动到底部附近时追加一批图片
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

  if (dataLoading) {
    return (
      <div className="cd-page">
        <section className="card-hero">
          <div className="card-hero__card">
            <div className="card-hero__carousel">
              <div className="card-hero__slide card-hero__slide--active">
                <div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} />
              </div>
            </div>
            <div className="card-hero__info" style={{ position: 'relative' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', marginBottom: 24 }} />
              <div style={{ height: 14, width: '40%', borderRadius: 4, marginBottom: 14, background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ height: 22, width: '70%', borderRadius: 4, marginBottom: 10, background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ height: 14, width: '45%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
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
      <Seo
        title={detail ? `${detail.name} - ${detail.categoryCn || '婚礼摄影'}` : '婚礼摄影'}
        description={detail?.desc?.slice(0, 150) || `欧洲专业婚礼摄影师，提供目的地婚礼跟拍、航拍、婚纱照服务。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。`}
        keywords={`婚礼摄影, 婚礼跟拍, ${detail?.nameEn || ''}, 目的地婚礼摄影, 婚礼航拍`}
        ogImage={detail?.cover}
        structuredData={detail ? [
          {
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            "name": detail.nameEn || detail.name,
            "alternateName": detail.name,
            "description": detail.desc?.slice(0, 200),
            "image": detail.cover,
            "logo": detail.headshot || undefined,
            "url": detail.website || `https://europewedding.cn/photography/${detail.slug}`,
            "priceRange": detail.price ? `€${detail.price}起` : undefined,
            "serviceType": detail.categoryCn || "婚礼摄影"
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "首页", "item": "https://europewedding.cn/" },
              { "@type": "ListItem", "position": 2, "name": "婚礼摄影", "item": "https://europewedding.cn/photography" },
              { "@type": "ListItem", "position": 3, "name": detail.name }
            ]
          }
        ] : undefined}
      />
      {/* ===== 1. Hero 区域 ===== */}
      <CardHero
        images={detail.images}
        name={detail.name}
        nameEn={detail.nameEn}
        badge={detail.categoryCn}
        tagline={detail.tagline}
        headshot={detail.headshot}
        cover={detail.cover}
        website={detail.website}
        backTo="/photography"
        isBooked={isBooked}
        isBooking={isBooking}
        isCanceling={isCanceling}
        aboutRef={aboutRef}
        onSetShowBar={setShowBar}
      />

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* ===== 2. 摄影师介绍 ===== */}
        <section className="cd-about photo-about" ref={aboutRef}>
          <h2 className="cd-about__title">摄影师介绍</h2>
          <div className="cd-about__divider" />
          <p className="photo-about__text">{detail.desc}</p>
        </section>

        {/* ===== 3. 摄影风格 + 作品集 ===== */}
        {(() => {
          const hasStyle = detail.style && detail.style.length > 0
          const galleryStart = 3
          const galleryImages = detail.images.slice(galleryStart)
          const hasGallery = galleryImages.length > 0
          if (!hasStyle && !hasGallery) return null
          const perPage = window.innerWidth <= 900 ? 6 : 12
          const visibleCount = Math.min(galleryPage * perPage, galleryImages.length)
          const hasMore = visibleCount < galleryImages.length
          const visibleImages = galleryImages.slice(0, visibleCount)

          return (
            <section className="photo-combined-card">
              {hasStyle && (
                <>
                  <h2 className="cd-block__title">摄影风格</h2>
                  <div className="photo-style__grid">
                    {detail.style?.map((group: { title: string; items: { label: string; desc?: string }[] }, gi: number) => (
                      <div key={gi} className="photo-style__group">
                        <h3 className="photo-style__group-title">{group.title}</h3>
                        <ul className="photo-style__list">
                          {group.items.map((item: { label: string; desc?: string }, ii: number) => (
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
                </>
              )}
              {hasGallery && (
                <>
                  {hasStyle && <div className="photo-combined-card__divider" />}
                  <h2 className="cd-block__title">作品展</h2>
                  <div className="photo-gallery__wrapper">
                    <div className="photo-gallery__columns">
                      {Array.from({ length: galleryCols }).map((_, colIdx) => (
                        <div key={colIdx} className="photo-gallery__col">
                          {visibleImages.filter((_: string, i: number) => i % galleryCols === colIdx).map((img: string, idx: number) => {
                            const origIdx = idx * galleryCols + colIdx
                            return (
                              <div key={origIdx} className="photo-gallery__item" onClick={() => setGalleryLightbox(origIdx)} style={{ cursor: 'zoom-in' }}>
                                <FallbackImage src={proxyImage(img)} alt={`${detail.nameEn} 作品 ${origIdx + 1}`} className="photo-gallery__img" />
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
                </>
              )}
            </section>
          )
        })()}

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
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">€{(detail.price ?? 0).toLocaleString()}起</span>
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
        <LoginModal onClose={() => setShowLoginModal(false)} onSuccess={() => { setShowLoginModal(false); handleConsult() }} desc="登录后即可咨询订单" />
      )}

    </div>
  )
}
