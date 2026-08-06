import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import { isProductSelected } from '../utils/selectedProducts'

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
  uk:      { code: 'United Kingdom', label: '英国', en: 'UK', sub: 'UK Destination Wedding' },
  'test-uk': { code: '测试英国', label: '测试英国', en: 'Test UK', sub: 'Test UK Destination Wedding' },
  'test-france': { code: '测试法国', label: '测试法国', en: 'Test France', sub: 'Test France Destination Wedding' },
'test-greece': { code: '测试希腊', label: '测试希腊', en: 'Test Greece', sub: 'Test Greece Destination Wedding' },
'test-italy': { code: '测试意大利', label: '测试意大利', en: 'Test Italy', sub: 'Test Italy Destination Wedding' },
'test-spain': { code: '测试西班牙', label: '测试西班牙', en: 'Test Spain', sub: 'Test Spain Destination Wedding' },
'test-austria': { code: '测试奥地利', label: '测试奥地利', en: 'Test Austria', sub: 'Test Austria Destination Wedding' },
'test-peachperfectweddings': { code: '测试peachperfectweddings', label: '测试peachperfectweddings', en: 'Test PPW', sub: 'Peach Perfect Weddings Destinations' },
'real-italy': { code: '意大利', label: '意大利', en: 'Italy', sub: 'Italy Destination Wedding' },
}

interface CrawledDestination {
  id: number; slug: string; name: string; name_cn: string
  country: string; country_cn: string; source_url: string; tagline: string
  description_preview: string; cover_image: string; features: string[]
  venue_types: { name: string; name_cn?: string }[]
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
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(6)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set())
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 按当前国家筛选
  const list = useMemo(() => {
    return allData.filter(d => d.country === currentCountry.code || d.country_cn === currentCountry.code)
  }, [allData, currentCountry.code])

  // 汇总所有场地类型（去重）
  const allVenueTypes = useMemo(() => {
    const map = new Map<string, string>()
    for (const dest of list) {
      for (const vt of dest.venue_types || []) {
        if (!map.has(vt.name)) map.set(vt.name, vt.name_cn || vt.name)
      }
    }
    return Array.from(map.entries()).map(([name, nameCn]) => ({ name, nameCn }))
  }, [list])

  // 搜索 + 筛选后的列表
  const filteredList = useMemo(() => {
    let result = list
    if (selectedVenueTypes.size > 0) {
      result = result.filter(dest =>
        dest.venue_types?.some(vt => selectedVenueTypes.has(vt.name))
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(dest =>
        dest.name_cn?.toLowerCase().includes(q) ||
        dest.name?.toLowerCase().includes(q) ||
        dest.tagline?.toLowerCase().includes(q) ||
        dest.description_preview?.toLowerCase().includes(q) ||
        dest.venue_types?.some(vt =>
          vt.name.toLowerCase().includes(q) || vt.name_cn?.toLowerCase().includes(q)
        )
      )
    }
    return result
  }, [list, selectedVenueTypes, searchQuery])

  // 将已预定场地排在最前
  const sortedList = useMemo(() => {
    const selected = filteredList.filter(d => selectedSet.has(d.slug))
    const rest = filteredList.filter(d => !selectedSet.has(d.slug))
    return [...selected, ...rest]
  }, [filteredList, selectedSet])

  // 实际渲染的列表（分页）
  const displayList = useMemo(() => {
    return sortedList.slice(0, visibleCount)
  }, [sortedList, visibleCount])

  const hasMore = visibleCount < sortedList.length

  // 已预定场地数量（不受分页影响）
  const selectedInFilter = useMemo(() => {
    return filteredList.filter(d => selectedSet.has(d.slug))
  }, [filteredList, selectedSet])

  // 切换国家 / 筛选 / 搜索时重置分页
  useEffect(() => {
    setVisibleCount(6)
  }, [currentKey, selectedVenueTypes, searchQuery])

  // 滚动到底部加载更多
  const handleLoadMore = useCallback(() => {
    if (loadingMore) return
    setLoadingMore(true)
    // 模拟加载延迟，让用户看到加载过程
    setTimeout(() => {
      setVisibleCount(prev => prev + 6)
      setLoadingMore(false)
    }, 300)
  }, [loadingMore])

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
    setSearchQuery('')
    window.scrollTo(0, 0)
  }, [currentKey])

  // 监听选中态变化（从 venue 详情页返回时刷新）
  useEffect(() => {
    const update = () => {
      const slugs = new Set<string>()
      allData.forEach(d => {
        if (isProductSelected('destination', d.slug)) slugs.add(d.slug)
      })
      setSelectedSet(slugs)
    }
    update()
    window.addEventListener('storage', update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener('storage', update)
      window.removeEventListener('focus', update)
    }
  }, [allData])

  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-destinations`)
      .then(r => r.json())
      .then(res => { if (res.success) setAllData(res.data) })
      .finally(() => setLoading(false))
  }, [])

  // IntersectionObserver 监听哨兵元素
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore()
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, handleLoadMore, loadingMore])

  if (loading) {
    return (
      <div className="cd-page">
        {/* 首屏骨架 */}
        <section className="cd-list-hero">
          <div className="cd-list-hero__bg cd-skeleton__img" />
          <div className="cd-list-hero__overlay" />
          <div className="cd-list-hero__content">
            <div className="cd-skeleton__line" style={{ width: 120, height: 12, margin: '0 auto 16px', opacity: 0.3 }} />
            <div className="cd-skeleton__line" style={{ width: 200, height: 40, margin: '0 auto 20px', opacity: 0.3 }} />
            <div className="cd-skeleton__line" style={{ width: 60, height: 1, margin: '0 auto 20px', opacity: 0.3 }} />
            <div className="cd-skeleton__line" style={{ width: 160, height: 12, margin: '0 auto', opacity: 0.3 }} />
          </div>
        </section>
        {/* 搜索框骨架 */}
        <div className="cd-search-bar">
          <div className="cd-search-bar__inner">
            <div className="cd-skeleton__line" style={{ width: 18, height: 18, borderRadius: '50%', marginBottom: 0 }} />
            <div className="cd-skeleton__line" style={{ flex: 1, height: 18, marginBottom: 0 }} />
          </div>
        </div>
        {/* 卡片列表骨架 */}
        <div className="cd-filter-layout">
          <aside className="cd-filter">
            <div className="cd-skeleton__line" style={{ width: '60%', height: 14, marginBottom: 8 }} />
            <div className="cd-skeleton__line" style={{ width: '40%', height: 10, marginBottom: 16 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="cd-skeleton__line" style={{ width: `${70 + Math.random() * 30}%`, height: 12, marginBottom: 12 }} />
            ))}
          </aside>
          <div className="cd-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="cd-card cd-card--skeleton">
                <div className="cd-card__img-wrap cd-skeleton__img" />
                <div className="cd-card__body">
                  <div className="cd-skeleton__line cd-skeleton__title" />
                  <div className="cd-skeleton__line cd-skeleton__tagline" />
                  <div className="cd-skeleton__line cd-skeleton__text" />
                  <div className="cd-skeleton__line cd-skeleton__text cd-skeleton__text--short" />
                  <div className="cd-card__footer">
                    <div className="cd-skeleton__line cd-skeleton__stat" />
                    <div className="cd-skeleton__line cd-skeleton__price" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      {/* 搜索框 */}
      <div className="cd-search-bar">
        <div className="cd-search-bar__inner">
          <svg className="cd-search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="cd-search-bar__input"
            type="text"
            placeholder="搜索场地名称、类型…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

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
                <span className="cd-filter__name">{vt.nameCn || vt.name}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* 右侧卡片列表 */}
        <div className="cd-list">
          {displayList.length > 0 ? (
            <>
              {/* 已预定分区标题 */}
              {selectedInFilter.length > 0 && (
                <div className="cd-section-label">
                  <span className="cd-section-label__icon">♥</span>
                  <span>已预定场地</span>
                  <span className="cd-section-label__count">{selectedInFilter.length}</span>
                </div>
              )}
              {displayList.map((item, idx) => {
                const isSelected = selectedSet.has(item.slug)
                // 检测是否是「未预定」分区的第一个（即前一个是已预定，当前不是）
                const showDivider = !isSelected && idx > 0 && selectedSet.has(displayList[idx - 1].slug)
                return (
                <Fragment key={item.id}>
                  {showDivider && (
                    <div className="cd-section-label cd-section-label--rest">
                      <span>全部场地</span>
                      <span className="cd-section-label__count">{filteredList.length - selectedInFilter.length}</span>
                    </div>
                  )}
                  <div className={`cd-card${isSelected ? ' cd-card--selected' : ''}`} onClick={() => navigate(`/venue/${item.slug}`)}>
                    <div className="cd-card__img-wrap">
                      <FallbackImage src={imgUrl(item.cover_image)} alt={item.name} className="cd-card__img" />
                      <div className="cd-card__img-overlay" />
                      <span className="cd-card__country">{item.country_cn}</span>
                      {isSelected && (
                        <span className="cd-card__selected-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          已预定
                        </span>
                      )}
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
                </Fragment>
                )
              })}
              {hasMore && (
                <>
                  {loadingMore ? (
                    // 骨架屏卡片（3行 × 2列 = 6张）
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="cd-card cd-card--skeleton">
                        <div className="cd-card__img-wrap cd-skeleton__img" />
                        <div className="cd-card__body">
                          <div className="cd-skeleton__line cd-skeleton__title" />
                          <div className="cd-skeleton__line cd-skeleton__tagline" />
                          <div className="cd-skeleton__line cd-skeleton__text" />
                          <div className="cd-skeleton__line cd-skeleton__text cd-skeleton__text--short" />
                          <div className="cd-card__footer">
                            <div className="cd-skeleton__line cd-skeleton__stat" />
                            <div className="cd-skeleton__line cd-skeleton__price" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div ref={sentinelRef} className="cd-load-sentinel" />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="cd-filter__empty">
              <span className="cd-filter__empty-icon">✦</span>
              <p>当前筛选条件下无目的地</p>
            </div>
          )}
          {!hasMore && displayList.length > 0 && (
            <div className="cd-load-end">
              <span>— 已展示全部 {filteredList.length} 个目的地 —</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
