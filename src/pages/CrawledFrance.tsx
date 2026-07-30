import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import GalleryCarousel from '../components/common/GalleryCarousel'

const API_BASE = import.meta.env.VITE_API_URL || ''

const imgUrl = (src: string) => {
  if (!src) return ''
  if (src.startsWith('/uploads/') || src.startsWith('/uploads')) return `${API_BASE}${src}`
  return src
}

interface CrawledDestination {
  id: number; slug: string; name: string; name_cn: string
  country: string; country_cn: string; source_url: string; tagline: string
  description_preview: string; cover_image: string; features: string[]
  venue_types: { name: string; name_en: string }[]
  towns: { name: string; name_cn: string }[]
  budget_ranges: { label: string; min: number; max: number | null }[]
  guest_capacities: string[]; sort_order: number
}
interface DestinationDetail extends CrawledDestination {
  description: string; images: string[]
}

export default function CrawledFrance() {
  const navigate = useNavigate()
  const [list, setList] = useState<CrawledDestination[]>([])
  const [detail, setDetail] = useState<DestinationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<string>>(new Set())

  // 汇总所有场地类型（去重）
  const allVenueTypes = useMemo(() => {
    const map = new Map<string, string>()
    for (const dest of list) {
      for (const vt of dest.venue_types || []) {
        if (!map.has(vt.name)) map.set(vt.name, vt.name_en || vt.name)
      }
    }
    return Array.from(map.entries()).map(([name, nameEn]) => ({ name, nameEn }))
  }, [list])

  // 筛选后的列表
  const filteredList = useMemo(() => {
    if (selectedVenueTypes.size === 0) return list
    return list.filter(dest =>
      dest.venue_types?.some(vt => selectedVenueTypes.has(vt.name))
    )
  }, [list, selectedVenueTypes])

  const toggleVenueType = (name: string) => {
    setSelectedVenueTypes(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-destinations`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          // 只保留法国目的地
          setList(res.data.filter((d: CrawledDestination) => d.country === 'France'))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  const openDetail = (slug: string) => {
    window.scrollTo(0, 0)
    fetch(`${API_BASE}/api/products/crawled-destinations/${slug}`)
      .then(r => r.json())
      .then(res => { if (res.success) { setDetail(res.data) } })
  }

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading">
          <div className="cd-spinner" />
          <p>加载目的地数据…</p>
        </div>
      </div>
    )
  }

  /* ========== 详情视图 ========== */
  if (detail) {
    const imgs = detail.images || []
    return (
      <div className="cd-page">
        {/* 全屏首图 */}
        <section className="cd-hero">
          <div className="cd-hero__parallax" style={{ transform: `translateY(${scrollY * 0.35}px)` }}>
            <img src={imgUrl(detail.cover_image)} alt={detail.name_cn} className="cd-hero__img" />
          </div>
          <div className="cd-hero__overlay" />
          <div className="cd-hero__content">
            <span className="cd-hero__badge">{detail.country_cn}</span>
            <h1 className="cd-hero__title">{detail.name_cn || detail.name}</h1>
            <div className="cd-hero__divider" />
            <p className="cd-hero__tagline">{detail.tagline}</p>
          </div>
          <div className="cd-hero__scroll" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
            <span>向下探索</span>
            <svg width="20" height="12" viewBox="0 0 20 12"><path d="M1 1l9 9 9-9" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>
          </div>
        </section>

        {/* 返回按钮 */}
        <button className="cd-back" onClick={() => { setDetail(null); window.scrollTo(0, 0) }}>← 返回</button>

        {/* 图片画廊 — 轮播 */}
        <GalleryCarousel images={imgs.map(imgUrl)} />

        {/* 内容区 */}
        <div className="cd-content">
          {/* 介绍 */}
          <section className="cd-block">
            <h2 className="cd-block__title">关于这里</h2>
            <div className="cd-block__body">
              {detail.description.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>

          {/* 亮点 + 场地 并排 */}
          <section className="cd-duo">
            <div className="cd-duo__col">
              <h2 className="cd-block__title">特色亮点</h2>
              <ul className="cd-highlights">
                {detail.features.map((f, i) => (
                  <li key={i} className="cd-highlights__item">
                    <span className="cd-highlights__dot" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cd-duo__col">
              <h2 className="cd-block__title">场地类型</h2>
              <div className="cd-chips">
                {detail.venue_types.map((v, i) => (
                  <span key={i} className="cd-chip">{v.name}</span>
                ))}
              </div>
              <h2 className="cd-block__title" style={{ marginTop: 28 }}>推荐城镇</h2>
              <div className="cd-chips">
                {detail.towns.map((t, i) => (
                  <span key={i} className="cd-chip cd-chip--alt">{t.name_cn}</span>
                ))}
              </div>
            </div>
          </section>

          {/* 预算 + 宾客 */}
          <section className="cd-block cd-block--alt">
            <h2 className="cd-block__title">预算参考</h2>
            <div className="cd-budgets">
              {detail.budget_ranges.map((b, i) => (
                <div key={i} className="cd-budget-item">
                  <span className="cd-budget-item__label">{b.label}</span>
                </div>
              ))}
            </div>
            <h2 className="cd-block__title" style={{ marginTop: 28 }}>宾客规模</h2>
            <div className="cd-chips">
              {detail.guest_capacities.map((g, i) => (
                <span key={i} className="cd-chip">{g}</span>
              ))}
            </div>
          </section>

          {/* 来源 */}
          <section className="cd-source">
            <p>数据来源：<a href={detail.source_url} target="_blank" rel="noreferrer">{detail.source_url}</a></p>
          </section>
        </div>
      </div>
    )
  }

  /* ========== 列表视图 ========== */
  return (
    <div className="cd-page">
      {/* 首屏 */}
      {list.length > 0 && (
        <section className="cd-list-hero">
          <img src={imgUrl(list[0].cover_image)} alt="" className="cd-list-hero__bg" />
          <div className="cd-list-hero__overlay" />
          <button className="cd-list-hero__back" onClick={() => navigate('/listing')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>返回</span>
          </button>
          <div className="cd-list-hero__content">
            <p className="cd-list-hero__sub">France Destination Wedding</p>
            <h1 className="cd-list-hero__title">法国</h1>
            <div className="cd-list-hero__divider" />
            <p className="cd-list-hero__count">共收录 {list.length} 个浪漫目的地</p>
          </div>
        </section>
      )}

      {/* 筛选 + 卡片布局 */}
      <div className="cd-filter-layout">
        {/* 左侧筛选栏 */}
        <aside className="cd-filter">
          <h4 className="cd-filter__title">场地类型</h4>
          <p className="cd-filter__en">Venue Types</p>
          {selectedVenueTypes.size > 0 && (
            <button className="cd-filter__clear" onClick={() => setSelectedVenueTypes(new Set())}>
              清除筛选
            </button>
          )}
          <ul className="cd-filter__list">
            {allVenueTypes.map(vt => (
              <li
                key={vt.name}
                className={`cd-filter__item${selectedVenueTypes.has(vt.name) ? ' cd-filter__item--checked' : ''}`}
                onClick={() => toggleVenueType(vt.name)}
              >
                <span className="cd-filter__check-icon">
                  {selectedVenueTypes.has(vt.name) ? '☑' : '☐'}
                </span>
                <span className="cd-filter__name">{vt.name}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* 右侧卡片列表 */}
        <div className="cd-list">
          {filteredList.length > 0 ? (
            filteredList.map(item => (
              <div key={item.id} className="cd-card" onClick={() => openDetail(item.slug)}>
                <div className="cd-card__img-wrap">
                  <img src={imgUrl(item.cover_image)} alt={item.name} className="cd-card__img" />
                  <div className="cd-card__img-overlay" />
                  <span className="cd-card__country">{item.country_cn}</span>
                </div>
                <div className="cd-card__body">
                  <h3 className="cd-card__name">{item.name_cn || item.name}</h3>
                  <p className="cd-card__tagline">{item.tagline}</p>
                  <p className="cd-card__preview">{item.description_preview}…</p>
                  <div className="cd-card__footer">
                    <span className="cd-card__stat">✦ {item.features?.length || 0} 个亮点</span>
                    <span className="cd-card__stat">🖼 {item.budget_ranges?.length || 0} 档预算</span>
                    <span className="cd-card__arrow">查看详情 →</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="cd-filter__empty">
              <span className="cd-filter__empty-icon">✦</span>
              <p>当前筛选条件下无目的地</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
