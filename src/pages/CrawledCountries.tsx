import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'

const API_BASE = import.meta.env.VITE_API_URL || ''

const imgUrl = (src: string) => {
  if (!src) return ''
  if (src.startsWith('/uploads/') || src.startsWith('/uploads')) return `${API_BASE}${src}`
  return src
}

/* ── 国家配置 ── */
const COUNTRIES: Record<string, { code: string; label: string; en: string; sub: string }> = {
  italy:   { code: 'Italy',    label: '意大利', en: 'Italy',   sub: 'Italy Destination Wedding' },
  france:  { code: 'France',   label: '法国',   en: 'France',  sub: 'France Destination Wedding' },
  greece:  { code: 'Greece',   label: '希腊',   en: 'Greece',  sub: 'Greece Destination Wedding' },
  portugal:{ code: 'Portugal', label: '葡萄牙', en: 'Portugal',sub: 'Portugal Destination Wedding' },
  uk:      { code: 'UK',       label: '英国',   en: 'UK',      sub: 'UK Destination Wedding' },
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

export default function CrawledCountries() {
  const { country = 'italy' } = useParams<{ country: string }>()
  const navigate = useNavigate()
  const currentKey = COUNTRIES[country!] ? country! : 'italy'
  const currentCountry = COUNTRIES[currentKey]

  const [allData, setAllData] = useState<CrawledDestination[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<string>>(new Set())

  // 按当前国家筛选
  const list = useMemo(() => {
    return allData.filter(d => d.country === currentCountry.code)
  }, [allData, currentCountry.code])

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

  // 切换国家时重置筛选
  useEffect(() => {
    setSelectedVenueTypes(new Set())
    window.scrollTo(0, 0)
  }, [currentKey])

  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-destinations`)
      .then(r => r.json())
      .then(res => { if (res.success) setAllData(res.data) })
      .finally(() => setLoading(false))
  }, [])

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

  /* ========== 列表视图 ========== */
  return (
    <div className="cd-page">
      {/* 首屏 */}
      {list.length > 0 && (
        <section className="cd-list-hero">
          <FallbackImage src={imgUrl(list[0].cover_image)} alt="" className="cd-list-hero__bg" />
          <div className="cd-list-hero__overlay" />
          <button className="cd-list-hero__back" onClick={() => navigate('/destinations')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>返回</span>
          </button>
          <div className="cd-list-hero__content">
            <p className="cd-list-hero__sub">{currentCountry.sub}</p>
            <h1 className="cd-list-hero__title">{currentCountry.label}</h1>
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
              <div key={item.id} className="cd-card" onClick={() => navigate(`/venue/${item.slug}`)}>
                <div className="cd-card__img-wrap">
                  <FallbackImage src={imgUrl(item.cover_image)} alt={item.name} className="cd-card__img" />
                  <div className="cd-card__img-overlay" />
                  <span className="cd-card__country">{item.country_cn}</span>
                </div>
                <div className="cd-card__body">
                  <h3 className="cd-card__name">{item.name_cn || item.name}</h3>
                  <p className="cd-card__tagline">{item.tagline}</p>
                  <p className="cd-card__preview">{item.description_preview}…</p>
                  <div className="cd-card__footer">
                    <span className="cd-card__stat">✦ {item.features?.length || 0} 个亮点</span>
                    {item.budget_ranges?.length > 0 && (
                      <span className="cd-card__price">€{item.budget_ranges[0].min?.toLocaleString()} 起</span>
                    )}
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
