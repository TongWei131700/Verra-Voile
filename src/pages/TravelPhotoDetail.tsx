import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/common/BackButton'
import FallbackImage from '../components/common/FallbackImage'
import Seo from '../components/Seo'
import { proxyImage } from '../utils/imageProxy'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 推荐摄影师接口
interface RecPhotographer {
  slug: string
  name: string
  nameCn: string
  headshot: string
  coverImage: string
  tagline: string
  photoStyles: string[]
  price: number
}

// 详情数据接口
interface AttractionDetail {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  location: string
  locationEn: string
  cover: string
  tagline: string
  description: string
  descriptionEn: string
  highlights: { icon: string; title: string; desc: string }[]
  photoTips: string
  price: number
}

// 将 API snake_case 数据转为前端格式
function mapApiDetail(row: any): AttractionDetail {
  let highlights = row.highlights || []
  if (typeof highlights === 'string') {
    try { highlights = JSON.parse(highlights) } catch { highlights = [] }
  }
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    country: row.country || '',
    countryEn: row.country_en || '',
    location: row.location || '',
    locationEn: row.location_en || '',
    cover: row.cover_image || '',
    tagline: row.tagline || '',
    description: row.description || '',
    descriptionEn: row.description_en || '',
    highlights,
    photoTips: row.photo_tips || '',
    price: row.price || 0,
  }
}

export default function TravelPhotoDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AttractionDetail | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [showBar, setShowBar] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [photographers, setPhotographers] = useState<RecPhotographer[]>([])

  // 从 API 获取详情
  useEffect(() => {
    if (!slug) return
    fetch(`${API_BASE}/api/products/crawled-travel-attractions/${slug}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setDetail(mapApiDetail(res.data))
        }
      })
      .catch(err => console.error('加载旅拍景点详情失败:', err))
      .finally(() => setDataLoading(false))

    // 获取推荐摄影师
    fetch(`${API_BASE}/api/products/crawled-travel-attractions/${slug}/photographers`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setPhotographers(res.data.map((p: any) => ({
            slug: p.slug,
            name: p.name,
            nameCn: p.name_cn || '',
            headshot: p.headshot || '',
            coverImage: p.cover_image || '',
            tagline: p.tagline || '',
            photoStyles: typeof p.photo_styles === 'string' ? JSON.parse(p.photo_styles) : (p.photo_styles || []),
            price: p.price ?? 0,
          })))
        }
      })
      .catch(() => {}) // 摄影师推荐失败不影响页面
  }, [slug])

  // 进入页面时滚到顶部
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // 滚动监听：滑动后显示底部栏 + 更新 scrollY
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrollY(y)
      setShowBar(y > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleConsult = useCallback(() => {
    if (!detail) return
    sessionStorage.setItem('consult_context', JSON.stringify({
      name: detail.name,
      nameEn: detail.nameEn,
      image: detail.cover,
      price: detail.price || 0,
      unit: '€',
      type: '旅拍',
      slug: slug,
      route: `/travel-photo/${slug}`,
    }))
    navigate('/consult')
  }, [slug, detail, navigate])

  // 图片 URL 处理
  const coverUrl = detail?.cover?.startsWith('/') ? `${API_BASE}${detail.cover}` : (detail?.cover || '')

  // 加载中 / 数据为空
  if (dataLoading) return null
  if (!detail) return <div style={{ textAlign: 'center', padding: '120px 20px', color: '#999' }}>景点不存在</div>

  return (
    <>
      <Seo
        title={`${detail.location}旅拍 · ${detail.name}婚礼拍摄`}
        description={`${detail.location}${detail.country}旅拍服务，在${detail.name}（${detail.nameEn}）留下最美回忆。提供专业婚礼拍摄、旅拍摄影，覆盖${detail.country}等欧洲热门目的地。`}
        keywords={(() => {
          const base = [`${detail.location}旅拍`, `${detail.location}婚礼拍摄`, `${detail.location}旅拍摄影`, `${detail.country}旅拍`, `${detail.country}婚礼拍摄`, '欧洲旅拍', '海外旅拍']
          return base.join(', ')
        })()}
        ogImage={coverUrl || undefined}
        structuredData={detail ? [
          // 1. TouristAttraction Schema（增强版：含拍摄建议、价格、摄影师推荐）
          {
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            "name": detail.name,
            "alternateName": detail.nameEn || undefined,
            "description": detail.description?.slice(0, 300),
            "address": {
              "@type": "PostalAddress",
              "addressLocality": detail.location,
              "addressRegion": detail.country,
              "addressCountry": "欧洲"
            },
            "image": coverUrl ? [coverUrl] : undefined,
            "url": `https://europewedding.cn/travel-photo/${detail.slug}`,
            // 价格/服务报价
            "offers": {
              "@type": "Offer",
              "price": detail.price > 0 ? detail.price : 0,
              "priceCurrency": "EUR",
              "availability": "https://schema.org/InStock",
              "description": detail.price > 0
                ? `${detail.name}旅拍服务`
                : `联系咨询${detail.location}旅拍价格`
            },
            // 拍摄建议
            "tourBookingInfo": detail.photoTips || undefined,
            // 推荐摄影师（作为关联服务提供者）
            "provider": photographers.length > 0 ? photographers.map(p => ({
              "@type": "ProfessionalService",
              "name": p.nameCn || p.name,
              "url": `https://europewedding.cn/photography/${p.slug}`,
              "image": p.headshot || p.coverImage || undefined,
              "priceRange": p.price > 0 ? `€${p.price}起` : undefined
            })) : undefined
          },
          // 2. BreadcrumbList Schema
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "首页",
                "item": "https://europewedding.cn/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "欧洲旅拍",
                "item": "https://europewedding.cn/travel-photo"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": detail.name
              }
            ]
          }
        ] : undefined}
      />

      {/* ===== Hero 区域 ===== */}
      <section className="tpd-hero">
        <div
          className="tpd-hero__bg"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        <div className="tpd-hero__overlay" />
        <div className="tpd-hero__content">
          <BackButton />
          <p className="tpd-hero__sub">{detail.locationEn} · {detail.countryEn}</p>
          <h1 className="tpd-hero__title">{detail.name}</h1>
          <p className="tpd-hero__title-en">{detail.nameEn}</p>
          <div className="tpd-hero__divider" />
          <p className="tpd-hero__tagline">{detail.tagline}</p>
        </div>
        <div className="wt-hero__scroll-hint" style={{ opacity: scrollY > 50 ? 0 : 1 }}>
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">向下滚动</span>
        </div>
      </section>

      {/* ===== 景点介绍 ===== */}
      <section className="cd-about photo-about">
        <h2 className="cd-about__title">景点介绍</h2>
        <div className="cd-about__divider" />
        {detail.description.split('\n\n').map((p, i) => (
          <p key={i} className={i === 0 ? 'photo-about__text photo-about__text--lead' : 'photo-about__text photo-about__text--sub'}>{p}</p>
        ))}
      </section>

      {/* ===== 拍摄建议 ===== */}
      {detail.photoTips && (
        <section className="tpd-tips">
          <div className="tpd-tips__header">
            <svg className="tpd-tips__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <h2 className="tpd-tips__title">拍摄建议</h2>
          </div>
          <p className="tpd-tips__text">{detail.photoTips}</p>
        </section>
      )}

      {/* ===== 推荐摄影师 ===== */}
      <section className="tpd-rec">
        <div className="tpd-rec__header">
          <h2 className="tpd-rec__title">推荐摄影师</h2>
          <div className="tpd-rec__divider" />
          <p className="tpd-rec__subtitle">在{detail.countryEn}拍摄的优秀摄影师</p>
        </div>
        {photographers.length > 0 ? (
          <>
            <div className="tpd-rec__grid">
              {photographers.map(p => (
                <div
                  key={p.slug}
                  className="tpd-rec__card"
                  onClick={() => navigate(`/photography/${p.slug}`, { state: { from: '/travel-photo' } })}
                >
                  <div className="tpd-rec__card-img">
                    <FallbackImage
                      src={proxyImage(p.headshot || p.coverImage)}
                      alt={p.nameCn || p.name}
                      className="tpd-rec__card-photo"
                    />
                  </div>
                  <div className="tpd-rec__card-body">
                    <h3 className="tpd-rec__card-name">{p.nameCn || p.name}</h3>
                    <p className="tpd-rec__card-tagline">{p.tagline}</p>
                    {p.photoStyles.length > 0 && (
                      <div className="tpd-rec__card-tags">
                        {p.photoStyles.slice(0, 2).map(s => <span key={s} className="tpd-rec__card-tag">{s}</span>)}
                      </div>
                    )}
                    <span className="tpd-rec__card-link">查看作品 →</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="tpd-rec__more">
              <button
                className="tpd-rec__more-btn"
                onClick={() => navigate(`/photography?country=${encodeURIComponent(detail.countryEn)}`)}
              >
                查看更多{detail.country}摄影师
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="tpd-rec__empty">
            <button className="tpd-rec__empty-btn" onClick={handleConsult}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              联系客服咨询摄影师
            </button>
          </div>
        )}
      </section>

      {/* ===== 拍摄事项 ===== */}
      <section className="tpd-notice">
        <div className="tpd-notice__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="tpd-notice__body">
          <h3 className="tpd-notice__title">拍摄事项</h3>
          <p className="tpd-notice__text">部分欧洲景点对商业拍摄有严格限制，包括但不限于卢浮宫、威尼斯圣马可广场等知名地标。此类景点通常仅允许外景拍摄，无法进入室内取景。具体拍摄政策可能随时调整，我们的摄影师团队将提前确认最新规定，并为您规划最佳拍摄方案，确保在允许的范围内呈现最完美的画面。</p>
        </div>
      </section>

      {/* ===== 底部价格栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">起步价</span>
            <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">€{detail.price || 0}起</span>
          </div>
          <div className="cd-book-bar__actions">
            <button className="cd-book-bar__consult" onClick={handleConsult}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              咨询
            </button>
            <button className="cd-book-bar__book" onClick={handleConsult}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              加入意向单
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
