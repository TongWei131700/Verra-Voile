import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { type DressProduct } from '../data/wonaDresses'
import { dressCategoryList } from '../data/wonaDresses'

import heroImg from '../assets/dresses-hero-bg.jpg'

const HERO_IMG = heroImg
const API_BASE = import.meta.env.VITE_API_URL || ''

// 模块级缓存：从详情返回列表页时复用
let _cachedDresses: DressProduct[] | null = null

// 将 API 返回的 snake_case 数据转为前端格式
function mapApiItem(row: any): DressProduct {
  let highlights: string[] = []
  try { highlights = typeof row.highlights === 'string' ? JSON.parse(row.highlights) : (row.highlights || []) } catch { /* ignore */ }
  let images: string[] = []
  try { images = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []) } catch { /* ignore */ }
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    category: row.category || 'all',
    categoryCn: row.category_cn || '',
    tagline: row.tagline || '',
    desc: row.description_preview || row.description || '',
    highlights,
    cover: row.cover_image || '',
    images,
    video: row.video_url || undefined,
    price: row.price ?? undefined,
    source: row.source_name ? { name: row.source_name, url: row.source_url || '' } : undefined,
  }
}

// 从 highlights 中提取廓形/风格关键词
function extractStyleKeywords(products: DressProduct[]): string[] {
  const set = new Set<string>()
  products.forEach(p => {
    p.highlights.forEach(h => {
      if (h.includes('廓形')) set.add(h)
      if (h.includes('长裙') || h.includes('短裙') || h.includes('Mini') || h.includes('mini')) set.add(h)
    })
  })
  return Array.from(set).sort()
}

export default function Dresses() {
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState<DressProduct[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set())
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState({ series: true, style: true })
  const [expandedFilters, setExpandedFilters] = useState({ series: false, style: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // 从 API 加载数据（有缓存则复用）
  useEffect(() => {
    if (_cachedDresses) {
      setAllProducts(_cachedDresses)
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-dresses`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const items = res.data.map(mapApiItem)
          _cachedDresses = items
          setAllProducts(items)
        }
      })
      .catch(err => console.error('加载礼服列表失败:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // 响应式列数
  const [colsPerRow, setColsPerRow] = useState(() => {
    if (typeof window === 'undefined') return 3
    const w = window.innerWidth
    if (w < 640) return 1
    if (w < 1000) return 2
    if (w < 1400) return 3
    return 4
  })
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 640) setColsPerRow(1)
      else if (w < 1000) setColsPerRow(2)
      else if (w < 1400) setColsPerRow(3)
      else setColsPerRow(4)
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const PAGE_SIZE = colsPerRow * 2

  // 页式"查看更多"：每组默认 1 页（两行），每次点击追加 1 页
  const [seriesPages, setSeriesPages] = useState<Record<string, number>>({})

  // 刷新已预定状态
  const refreshBooked = useCallback(() => {
    const items = getSelectedProducts().filter(i => i.categoryId === 'dress')
    setBookedSlugs(new Set(items.map(i => i.productId)))
  }, [])
  useEffect(() => {
    refreshBooked()
    const fn = () => { if (document.visibilityState === 'visible') refreshBooked() }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [refreshBooked])

  // 筛选项
  const allSeries = useMemo(() =>
    dressCategoryList.filter(c => c.key !== 'all').map(c => c.label).filter(l => allProducts.some(p => p.categoryCn === l))
  , [allProducts])
  const allStyles = useMemo(() => extractStyleKeywords(allProducts), [allProducts])

  // 筛选逻辑
  const filteredList = useMemo(() => {
    let list = allProducts
    if (selectedSeries.size > 0) list = list.filter(p => selectedSeries.has(p.categoryCn))
    if (selectedStyles.size > 0) list = list.filter(p => p.highlights.some(h => selectedStyles.has(h)))
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.categoryCn.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q))
    }
    return list
  }, [allProducts, selectedSeries, selectedStyles, searchFilter])

  // 搜索推荐
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const items: { type: 'series' | 'style' | 'dress'; label: string; sub?: string; slug?: string }[] = []
    allSeries.forEach(s => { if (s.toLowerCase().includes(q)) items.push({ type: 'series', label: s }) })
    allStyles.forEach(s => { if (s.toLowerCase().includes(q)) items.push({ type: 'style', label: s }) })
    allProducts.forEach(p => { if (p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)) items.push({ type: 'dress', label: p.nameEn, sub: p.categoryCn, slug: p.slug }) })
    return items.slice(0, 10)
  }, [searchQuery, allSeries, allStyles, allProducts])

  const bookedList = useMemo(() => filteredList.filter(p => bookedSlugs.has(p.slug)), [filteredList, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(p => !bookedSlugs.has(p.slug)), [filteredList, bookedSlugs])

  // 按系列分组
  const visibleGroupedBySeries = useMemo(() => {
    const groups: { series: string; items: DressProduct[] }[] = []
    const map = new Map<string, DressProduct[]>()
    otherList.forEach(item => {
      if (!map.has(item.categoryCn)) { map.set(item.categoryCn, []); groups.push({ series: item.categoryCn, items: map.get(item.categoryCn)! }) }
      map.get(item.categoryCn)!.push(item)
    })
    return groups
  }, [otherList])

  // 页式"查看更多"
  const groupedWithVisibility = useMemo(() => {
    return visibleGroupedBySeries.map(group => {
      const pages = seriesPages[group.series] || 1
      const visible = pages * PAGE_SIZE
      return { ...group, visibleItems: group.items.slice(0, visible), hasMore: group.items.length > visible, hiddenCount: Math.max(0, group.items.length - visible) }
    })
  }, [visibleGroupedBySeries, seriesPages, PAGE_SIZE])

  const loadMoreSeries = (series: string) => {
    setSeriesPages(prev => ({ ...prev, [series]: (prev[series] || 1) + 1 }))
  }

  // 筛选变化时重置
  useEffect(() => { setSeriesPages({}) }, [selectedSeries, selectedStyles, searchFilter])

  const totalFilters = selectedSeries.size + selectedStyles.size + (searchFilter ? 1 : 0)

  const toggleSeries = (s: string) => { setSelectedSeries(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n }) }
  const toggleStyle = (s: string) => { setSelectedStyles(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n }) }
  const clearAllFilters = () => { setSelectedSeries(new Set()); setSelectedStyles(new Set()); setSearchQuery(''); setSearchFilter('') }
  const toggleGroup = (key: 'series' | 'style') => { setOpenGroups(prev => ({ ...prev, [key]: !prev[key] })) }
  const toggleExpandFilter = (key: 'series' | 'style') => { setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] })) }

  const handleSuggestionClick = (item: { type: 'series' | 'style' | 'dress'; label: string; slug?: string }) => {
    if (item.type === 'series') { setSelectedSeries(prev => { const n = new Set(prev); n.add(item.label); return n }) }
    else if (item.type === 'style') { setSelectedStyles(prev => { const n = new Set(prev); n.add(item.label); return n }) }
    else if (item.type === 'dress' && item.slug) { navFromList('/dresses', `/dresses/${item.slug}`, navigate) }
    setSearchQuery(''); setSearchFilter('')
  }

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    const el = filterBodyRef.current; if (!el) return
    const fn = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      if ((scrollTop === 0 && e.deltaY < 0) || (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0)) e.preventDefault()
    }
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase(); let matched = false
      allSeries.forEach(s => { if (s.toLowerCase().includes(q)) { setSelectedSeries(prev => { const n = new Set(prev); n.add(s); return n }); matched = true } })
      allStyles.forEach(s => { if (s.toLowerCase().includes(q)) { setSelectedStyles(prev => { const n = new Set(prev); n.add(s); return n }); matched = true } })
      if (!matched) setSearchFilter(searchQuery.trim()); else setSearchFilter('')
      setSearchQuery(''); setSearchFocused(false); searchInputRef.current?.blur()
    }
  }

  // ===== 筛选栏渲染（桌面侧栏 & 移动抽屉复用） =====
  const renderFilterGroups = () => (
    <div className="ph-filter-section">
      <div className="ph-filter-section__title"><span>筛选</span><span className="ph-filter-section__en">Filter</span></div>
      {/* 系列 */}
      <div className="ph-filter-group">
        <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('series')}>
          <span className="ph-filter-group__label">系列</span>
          <span className="ph-filter-group__en">Collection</span>
          {selectedSeries.size > 0 && <span className="ph-filter-group__badge">{selectedSeries.size}</span>}
          <span className={`ph-filter-group__arrow${openGroups.series ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
        </button>
        {openGroups.series && (
          <ul className="ph-filter-group__list">
            {allSeries.length > 0 ? (expandedFilters.series ? allSeries : allSeries.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
              const count = allProducts.filter(p => p.categoryCn === s).length
              return (
                <li key={s} className={`ph-filter-group__item${selectedSeries.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleSeries(s)}>
                  <span className="ph-filter-group__checkbox">{selectedSeries.has(s) ? '☑' : '☐'}</span>
                  <span className="ph-filter-group__name">{s}</span>
                  <span className="ph-filter-group__count">{count}</span>
                </li>
              )
            }) : <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>}
            {allSeries.length > MAX_VISIBLE_FILTERS && (
              <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('series')}>
                {expandedFilters.series ? '收起' : `更多 (${allSeries.length - MAX_VISIBLE_FILTERS})`}
              </li>
            )}
          </ul>
        )}
      </div>
      {/* 廓形风格 */}
      <div className="ph-filter-group">
        <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('style')}>
          <span className="ph-filter-group__label">廓形风格</span>
          <span className="ph-filter-group__en">Style</span>
          {selectedStyles.size > 0 && <span className="ph-filter-group__badge">{selectedStyles.size}</span>}
          <span className={`ph-filter-group__arrow${openGroups.style ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
        </button>
        {openGroups.style && (
          <ul className="ph-filter-group__list">
            {allStyles.length > 0 ? (expandedFilters.style ? allStyles : allStyles.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
              const count = allProducts.filter(p => p.highlights.includes(s)).length
              return (
                <li key={s} className={`ph-filter-group__item${selectedStyles.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleStyle(s)}>
                  <span className="ph-filter-group__checkbox">{selectedStyles.has(s) ? '☑' : '☐'}</span>
                  <span className="ph-filter-group__name">{s}</span>
                  <span className="ph-filter-group__count">{count}</span>
                </li>
              )
            }) : <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>}
            {allStyles.length > MAX_VISIBLE_FILTERS && (
              <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('style')}>
                {expandedFilters.style ? '收起' : `更多 (${allStyles.length - MAX_VISIBLE_FILTERS})`}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )

  // ===== 卡片渲染 =====
  const renderCard = (item: DressProduct, isBooked = false) => (
    <div key={item.slug} className={`cd-card${isBooked ? ' cd-card--booked' : ''}`} onClick={() => navFromList('/dresses', `/dresses/${item.slug}`, navigate)}>
      <div className="cd-card__img-wrap">
        <FallbackImage src={item.cover} alt={item.name} className="cd-card__img" loading="lazy" />
        <div className="cd-card__img-overlay" />
        {isBooked && (
          <span className="cd-card__booked-badge">
            <svg className="cd-card__booked-wreath" viewBox="0 0 80 80" width="36" height="36">
              <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <polyline points="30 42 38 50 52 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
      </div>
      <div className="cd-card__body">
        <h3 className="cd-card__name">{item.name}</h3>
        <p className="cd-card__tagline">{item.tagline}</p>
        <div className="cd-card__styles">{item.highlights.slice(0, 3).map(h => <span key={h} className="cd-card__style-tag">{h}</span>)}</div>
        <div className="cd-card__footer">
          {item.price ? <span className="cd-card__price">€{item.price.toFixed(2)} 起</span> : <span className="cd-card__price">需咨询</span>}
          <span className="cd-card__arrow">查看详情 →</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="cd-page">
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }} />
        <div className="cd-list-hero__overlay" />
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Wedding Dresses</p>
          <h1 className="cd-list-hero__title">礼服</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">{allProducts.length > 0 ? `共收录 ${allProducts.length} 件礼服作品` : '现代廓形 · 考究面料 · 属于你的那一件'}</p>
        </div>
      </section>

      {/* 搜索框 */}
      <div className="cd-search-bar" ref={searchRef}>
        <div className="cd-search-bar__inner">
          <svg className="cd-search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input ref={searchInputRef} className="cd-search-bar__input" type="text" placeholder="搜索礼服名称、系列、风格…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 150)} onKeyDown={handleSearchKeyDown} />
          {searchQuery && <button className="cd-search-bar__clear" onClick={() => { setSearchQuery(''); setSearchFilter('') }}>✕</button>}
        </div>
        {searchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
          <div className="cd-search-dropdown">
            {searchSuggestions.map((item, i) => (
              <div key={`${item.type}-${i}`} className="cd-search-dropdown__item" onClick={() => handleSuggestionClick(item)}>
                <span className={`cd-search-dropdown__icon cd-search-dropdown__icon--${item.type}`}>{item.type === 'series' ? '👗' : item.type === 'style' ? '✦' : '🎀'}</span>
                <div className="cd-search-dropdown__text"><span className="cd-search-dropdown__label">{item.label}</span>{item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}</div>
                <span className="cd-search-dropdown__tag">{item.type === 'series' ? '系列' : item.type === 'style' ? '风格' : '礼服'}</span>
              </div>
            ))}
          </div>
        )}
        {searchFocused && searchQuery.trim() && searchSuggestions.length === 0 && (
          <div className="cd-search-dropdown"><div className="cd-search-dropdown__empty">无匹配结果</div></div>
        )}
      </div>

      {/* 移动端筛选栏 */}
      <div className="ph-mobile-filter-bar">
        <span className="ph-mobile-filter-bar__count">共 <strong>{filteredList.length}</strong> 件礼服</span>
        <button type="button" className="ph-mobile-filter-btn" onClick={() => setFilterDrawerOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          <span>筛选</span>
          {totalFilters > 0 && <span className="ph-mobile-filter-btn__badge">{totalFilters}</span>}
        </button>
      </div>

      {/* 移动端筛选抽屉 */}
      {filterDrawerOpen && (
        <div className="ph-drawer-overlay" onClick={() => setFilterDrawerOpen(false)}>
          <div className="ph-drawer" onClick={e => e.stopPropagation()}>
            <div className="ph-drawer__header"><h4 className="ph-drawer__title">筛选</h4><button className="ph-drawer__close" onClick={() => setFilterDrawerOpen(false)}>✕</button></div>
            <div className="ph-drawer__body">{renderFilterGroups()}</div>
            <div className="ph-drawer__footer">
              {totalFilters > 0 && <button className="ph-drawer__clear" onClick={clearAllFilters}>清除全部</button>}
              <button className="ph-drawer__confirm" onClick={() => setFilterDrawerOpen(false)}>查看 {filteredList.length} 件礼服</button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选 + 卡片布局 */}
      <div className="cd-filter-layout">
        {/* 左侧筛选栏 */}
        <aside className="ph-filter"><div className="ph-filter__body" ref={filterBodyRef}>{renderFilterGroups()}</div></aside>

        {/* 右侧卡片列表 */}
        <div className="cd-list">
          {filteredList.length > 0 ? (
            <>
              {bookedList.length > 0 && (
                <>
                  <div className="cd-section-label"><span className="cd-section-label__icon">✦</span><span>意向单</span><span className="cd-section-label__count">{bookedList.length}</span></div>
                  {bookedList.map(item => renderCard(item, true))}
                  {otherList.length > 0 && <div className="cd-section-label cd-section-label--rest"><span className="cd-section-label__icon">✦</span><span>其他</span><span className="cd-section-label__count">{otherList.length}</span></div>}
                </>
              )}
              {groupedWithVisibility.map(group => (
                <Fragment key={group.series}>
                  <div className="cd-country-header" style={{ gridColumn: '1 / -1' }}>
                    <h2 className="cd-country-header__title">{group.series}</h2>
                    <span className="cd-country-header__en">{group.series}</span>
                    <div className="cd-country-header__line" />
                    <span className="cd-country-header__count">{group.items.length} 件礼服</span>
                  </div>
                  {group.visibleItems.map(item => renderCard(item))}
                  {group.hasMore && (
                    <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                      <button className="cd-section-more__btn" onClick={() => loadMoreSeries(group.series)}>查看更多 ({group.hiddenCount})</button>
                    </div>
                  )}
                </Fragment>
              ))}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{totalFilters > 0 || searchFilter ? '当前筛选条件下无礼服作品，请调整筛选' : '暂无礼服数据'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
