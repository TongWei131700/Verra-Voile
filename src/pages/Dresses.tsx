import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { type DressProduct } from '../data/wonaDresses'
import { dressCategoryList } from '../data/wonaDresses'

import heroImg from '../assets/dresses-hero-bg.jpg'
import Seo from '../components/Seo'

const HERO_IMG = heroImg
const API_BASE = import.meta.env.VITE_API_URL || ''

// 模块级缓存：从详情返回列表页时复用
let _cachedDresses: DressProduct[] | null = null
// 筛选/排序缓存
let _cachedSelectedSeries: string[] | null = null
let _cachedSelectedStyles: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null

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
  const [searchFilter, setSearchFilter] = useState(() => _cachedSearchFilter ?? '')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(() => new Set(_cachedSelectedSeries ?? []))
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(() => new Set(_cachedSelectedStyles ?? []))
  const [openGroups, setOpenGroups] = useState({ series: true, style: true })
    const [sortOpen, setSortOpen] = useState(false)
  const [expandedFilters, setExpandedFilters] = useState({ series: false, style: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'series' | 'filter' | null>(null)
  const [pendingSeries, setPendingSeries] = useState<Set<string> | null>(null)

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

  // 列表展示规则：宽屏10 / 窄屏3+追加10 / sessionStorage 持久化
  const WIDE_LIMIT = 10
  const NARROW_LIMIT = 3
  const NARROW_MORE = 10
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 900)
  useEffect(() => {
    const fn = () => setIsNarrow(window.innerWidth <= 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // 页式"查看更多"：从 sessionStorage 恢复
  const [seriesPages, setSeriesPages] = useState<Record<string, number>>(() => {
    try { return JSON.parse(sessionStorage.getItem('dress_series_pages') || '{}') } catch { return {} }
  })

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

  const sortOptions = [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格低→高' },
    { value: 'price-desc', label: '价格高→低' },
    { value: 'name', label: '名称 A→Z' },
  ]

  // 筛选逻辑
  const filteredList = useMemo(() => {
    let list = allProducts
    if (selectedSeries.size > 0) list = list.filter(p => selectedSeries.has(p.categoryCn))
    if (selectedStyles.size > 0) list = list.filter(p => p.highlights.some(h => selectedStyles.has(h)))
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.categoryCn.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q))
    }
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => ((a.price ?? 5000)) - ((b.price ?? 5000)))
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => ((b.price ?? 5000)) - ((a.price ?? 5000)))
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
    }
    return list
  }, [allProducts, selectedSeries, selectedStyles, searchFilter, sortMode])

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

  const bookedList = useMemo(() => allProducts.filter(p => bookedSlugs.has(p.slug)), [allProducts, bookedSlugs])
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
      const limit = isNarrow
        ? (pages === 1 ? NARROW_LIMIT : NARROW_LIMIT + (pages - 1) * NARROW_MORE)
        : pages * WIDE_LIMIT
      const visibleItems = group.items.slice(0, limit)
      return { ...group, visibleItems, hasMore: group.items.length > limit, hiddenCount: Math.max(0, group.items.length - limit) }
    })
  }, [visibleGroupedBySeries, seriesPages, isNarrow])

  const loadMoreSeries = (series: string) => {
    setSeriesPages(prev => {
      const next = { ...prev, [series]: (prev[series] || 1) + 1 }
      sessionStorage.setItem('dress_series_pages', JSON.stringify(next))
      return next
    })
  }

  // 筛选/排序变化时重置（跳过首次挂载）并滚回顶部
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setSeriesPages({})
    sessionStorage.removeItem('dress_series_pages')
    // 滚回顶部
    document.documentElement.scrollTop = 0
  }, [selectedSeries, selectedStyles, searchFilter, sortMode])

  // 筛选/排序状态同步到模块级缓存
  useEffect(() => { _cachedSelectedSeries = Array.from(selectedSeries) }, [selectedSeries])
  useEffect(() => { _cachedSelectedStyles = Array.from(selectedStyles) }, [selectedStyles])
  useEffect(() => { _cachedSearchFilter = searchFilter }, [searchFilter])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

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
    <>
      {/* 排序（可折叠） */}
      <div className="ph-filter-sort">
        <button type="button" className="ph-filter-sort__header" onClick={() => setSortOpen(!sortOpen)}>
          <span>排序</span>
          <span className="ph-filter-sort__en">Sort</span>
          <span className={`ph-filter-sort__arrow${sortOpen ? ' ph-filter-sort__arrow--open' : ''}`}>▾</span>
        </button>
        {sortOpen && (
          <ul className="ph-filter-sort__list">
            {sortOptions.map(opt => (
              <li key={opt.value} className={`ph-filter-sort__item${sortMode === opt.value ? ' ph-filter-sort__item--active' : ''}`} onClick={() => setSortMode(opt.value)}>
                <span className="ph-filter-sort__radio">{sortMode === opt.value ? '●' : '○'}</span>
                <span>{opt.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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
    </>
  )

  // ===== 卡片渲染 =====
  const renderCard = (item: DressProduct, isBooked = false) => (
    <div key={item.slug} className={`cd-card${isBooked ? ' cd-card--booked' : ''}`} data-scroll-id={item.slug} onClick={() => navFromList('/dresses', `/dresses/${item.slug}`, navigate)}>
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
      <Seo
        title="婚纱礼服"
        description="精选欧洲顶级婚纱品牌高定礼服，为新娘打造完美婚纱。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式目的地婚礼服务。"
        keywords="婚纱礼服, 欧洲婚纱, 高定礼服, 目的地婚礼婚纱, 新娘礼服"
        structuredData={allProducts.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "婚纱礼服",
          "numberOfItems": allProducts.length,
          "itemListElement": allProducts.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.nameEn || p.name,
            "url": `https://europewedding.cn/dresses/${p.slug}`,
            "image": p.cover || undefined
          }))
        } : undefined}
      />
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }} />
        <div className="cd-list-hero__overlay" />
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Wedding Dresses</p>
          <h1 className="cd-list-hero__title">礼服</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">{allProducts.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 件礼服作品`
                : `共收录 ${allProducts.length} 件礼服作品`
              : '现代廓形 · 考究面料 · 属于你的那一件'}</p>
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

      {/* 窄屏底部操作栏 */}
      <div className="dest-bottom-bar">
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('filter')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
          <span>筛选</span>
          {totalFilters > 0 && <span className="dest-bottom-bar__badge">{totalFilters}</span>}
        </button>
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('sort')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M6 12h12M9 18h6"/>
          </svg>
          <span>{sortOptions.find(o => o.value === sortMode)?.label ?? '排序'}</span>
          {sortMode !== 'default' && <span className="dest-bottom-bar__badge">1</span>}
        </button>
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('series')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>系列</span>
          {selectedSeries.size > 0 && <span className="dest-bottom-bar__badge">{selectedSeries.size}</span>}
        </button>
      </div>

      {/* 排序 ActionSheet */}
      {bottomSheet === 'sort' && (
        <div className="dest-sheet-overlay" onClick={() => setBottomSheet(null)}>
          <div className="dest-sheet" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>排序方式</h4>
              <button type="button" className="dest-sheet__close" onClick={() => setBottomSheet(null)}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {sortOptions.map(opt => (
                <button key={opt.value} type="button" className={`dest-sheet__option${sortMode === opt.value ? ' dest-sheet__option--active' : ''}`} onClick={() => { setSortMode(opt.value); setBottomSheet(null) }}>
                  <span>{opt.label}</span>{sortMode === opt.value && <span className="dest-sheet__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 系列快选 ActionSheet */}
      {bottomSheet === 'series' && (() => {
        const current = pendingSeries ?? selectedSeries
        return (
        <div className="dest-sheet-overlay" onClick={() => { setBottomSheet(null); setPendingSeries(null) }}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择系列</h4>
              <button type="button" className="dest-sheet__close" onClick={() => { setBottomSheet(null); setPendingSeries(null) }}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {allSeries.map(s => {
                const count = allProducts.filter(p => p.categoryCn === s).length
                const active = current.has(s)
                return (
                  <button key={s} type="button" className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`} onClick={() => {
                    const base = pendingSeries ?? selectedSeries
                    const next = new Set(base)
                    next.has(s) ? next.delete(s) : next.add(s)
                    setPendingSeries(next)
                  }}>
                    <span>{s} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => {
                if (pendingSeries) setSelectedSeries(pendingSeries)
                setPendingSeries(null)
                setBottomSheet(null)
              }}>
                查看 {(() => {
                  let list = allProducts
                  if (current.size > 0) list = list.filter(p => current.has(p.categoryCn))
                  if (selectedStyles.size > 0) list = list.filter(p => p.highlights.some(h => selectedStyles.has(h)))
                  return list.length
                })()} 件礼服
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* 筛选 ActionSheet */}
      {bottomSheet === 'filter' && (
        <div className="dest-sheet-overlay" onClick={() => setBottomSheet(null)}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>筛选条件</h4>
              <button type="button" className="dest-sheet__close" onClick={() => setBottomSheet(null)}>✕</button>
            </div>
            <div className="dest-sheet__body">
              <div className="dest-sheet__section-title">系列 <span>Collection</span></div>
              <div className="dest-sheet__chips">
                {allSeries.map(s => {
                  const count = allProducts.filter(p => p.categoryCn === s).length
                  const active = selectedSeries.has(s)
                  return <button key={s} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleSeries(s)}>{s} <em>({count})</em></button>
                })}
              </div>
              <div className="dest-sheet__section-title">廓形风格 <span>Style</span></div>
              <div className="dest-sheet__chips">
                {allStyles.map(s => {
                  const count = allProducts.filter(p => p.highlights.includes(s)).length
                  const active = selectedStyles.has(s)
                  return <button key={s} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleStyle(s)}>{s} <em>({count})</em></button>
                })}
              </div>
            </div>
            <div className="dest-sheet__footer">
              {totalFilters > 0 && <button type="button" className="dest-sheet__clear" onClick={clearAllFilters}>清除全部</button>}
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>查看 {filteredList.length} 件礼服</button>
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
          {(filteredList.length > 0 || bookedList.length > 0) ? (
            <>
              {sortMode !== 'default' ? (
                /* 排序模式：扁平列表 */
                <>
                  {bookedList.length > 0 && (
                    <>
                      <div className="cd-section-label"><span className="cd-section-label__icon">✦</span><span>意向单</span><span className="cd-section-label__count">{bookedList.length}</span></div>
                      {bookedList.map(item => renderCard(item, true))}
                    </>
                  )}
                  {otherList.length > 0 && bookedList.length > 0 && (
                    <div className="cd-section-label cd-section-label--rest"><span className="cd-section-label__icon">✦</span><span>其他</span><span className="cd-section-label__count">{otherList.length}</span></div>
                  )}
                  {otherList.map(item => renderCard(item))}
                </>
              ) : (
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
              )}
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
