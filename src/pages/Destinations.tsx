import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import coverDest from '../assets/destinations-cover.jpg'
import Seo from '../components/Seo'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 新上架场地 slug（列表页显示 NEW 角标）
const NEW_VENUE_SLUGS = new Set(['pieve-del-castello', 'villa-porta', 'hotel-vis-a-vis'])

// 列表项（与 API 返回字段对应）
interface VenueItem {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  city: string
  cityEn: string
  tagline: string
  desc: string
  cover: string
  venueTypes: string[]
  price?: number
  priceUnit: string
}

// 将 API 返回的 snake_case 数据转为前端 camelCase
function mapApiItem(row: any): VenueItem {
  let rawTypes: any[] = []
  try { rawTypes = typeof row.venue_types === 'string' ? JSON.parse(row.venue_types) : (row.venue_types || []) } catch { /* ignore */ }
  const venueTypes = rawTypes.map((t: any) => typeof t === 'string' ? t : (t.name_cn || t.name || String(t)))
  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    country: row.country_cn || row.country || '',
    countryEn: row.country || '',
    city: row.city_cn || row.city || '',
    cityEn: row.city || '',
    tagline: row.tagline_cn || row.tagline || '',
    desc: row.description_preview || '',
    cover: row.cover_image || '',
    venueTypes,
    price: row.price ?? undefined,
    priceUnit: row.price_unit || '€',
  }
}

// 模块级缓存：从详情返回列表页时复用，避免重复请求
let _cachedVenues: VenueItem[] | null = null
let _cachedCountryLimits: Record<string, number> | null = null
let _cachedVisibleGroupCount: number | null = null
// 筛选/排序缓存：返回列表页时恢复用户之前的筛选状态
let _cachedSelectedCountries: string[] | null = null
let _cachedSelectedVenueTypes: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null

// 从数据中动态提取去重后的选项列表
function extractUnique<T>(items: VenueItem[], getter: (c: VenueItem) => T | T[]): T[] {
  const set = new Set<T>()
  items.forEach(c => {
    const val = getter(c)
    if (Array.isArray(val)) val.forEach(v => set.add(v))
    else if (val !== undefined && val !== '') set.add(val)
  })
  return Array.from(set).sort()
}

export default function Destinations() {
  const navigate = useNavigate()
  const [allVenues, setAllVenues] = useState<VenueItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set(_cachedSelectedCountries ?? []))
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<string>>(() => new Set(_cachedSelectedVenueTypes ?? []))
  const [openGroups, setOpenGroups] = useState({ country: true, venueType: true })
  const [expandedFilters, setExpandedFilters] = useState({ country: false, venueType: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [searchFilter, setSearchFilter] = useState(() => _cachedSearchFilter ?? '')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'country' | 'filter' | null>(null)
  const [pendingCountries, setPendingCountries] = useState<Set<string> | null>(null)
  const GROUPS_PER_PAGE = 5
  const [visibleGroupCount, setVisibleGroupCount] = useState(_cachedVisibleGroupCount ?? GROUPS_PER_PAGE)

  // 从 API 加载数据（有缓存则复用）
  useEffect(() => {
    if (_cachedVenues) {
      setAllVenues(_cachedVenues)
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-venues`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const items = res.data.map(mapApiItem)
          _cachedVenues = items
          setAllVenues(items)
        }
      })
      .catch(err => console.error('加载场地列表失败:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // 刷新已预定状态
  const refreshBooked = useCallback(() => {
    const items = getSelectedProducts().filter(i => i.categoryId === 'destination')
    setBookedSlugs(new Set(items.map(i => i.productId)))
  }, [])

  useEffect(() => {
    refreshBooked()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshBooked()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refreshBooked])

  // 从数据中动态提取筛选项
  const allCountries = useMemo(() => extractUnique(allVenues, c => c.country), [allVenues])
  const allVenueTypes = useMemo(() => extractUnique(allVenues, c => c.venueTypes), [allVenues])

  const sortOptions = [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格低→高' },
    { value: 'price-desc', label: '价格高→低' },
    { value: 'name', label: '名称 A→Z' },
  ]

  const filteredList = useMemo(() => {
    let list = allVenues
    if (selectedCountries.size > 0) {
      list = list.filter(c => selectedCountries.has(c.country))
    }
    if (selectedVenueTypes.size > 0) {
      list = list.filter(c => c.venueTypes.some(s => selectedVenueTypes.has(s)))
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.countryEn.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.venueTypes.some(s => s.toLowerCase().includes(q)) ||
        c.tagline.toLowerCase().includes(q)
      )
    }
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
    }
    return list
  }, [selectedCountries, selectedVenueTypes, searchFilter, sortMode, allVenues])

  // 搜索推荐条目
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const items: { type: 'country' | 'venueType' | 'venue'; label: string; sub?: string; slug?: string }[] = []
    allCountries.forEach(c => {
      if (c.toLowerCase().includes(q)) items.push({ type: 'country', label: c })
    })
    allVenueTypes.forEach(s => {
      if (s.toLowerCase().includes(q)) items.push({ type: 'venueType', label: s })
    })
    allVenues.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q)) {
        items.push({ type: 'venue', label: c.nameEn, sub: c.country, slug: c.slug })
      }
    })
    return items.slice(0, 10)
  }, [searchQuery, allCountries, allVenueTypes])

  const bookedList = useMemo(() => allVenues.filter(c => bookedSlugs.has(c.slug)), [allVenues, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(c => !bookedSlugs.has(c.slug)), [filteredList, bookedSlugs])

  // 按国家分组（保持首次出现顺序）
  const visibleGroupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: VenueItem[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: VenueItem[] }>()
    otherList.forEach(item => {
      if (!map.has(item.country)) {
        const group = { country: item.country, countryEn: item.countryEn, items: [] }
        map.set(item.country, group)
        groups.push(group)
      }
      map.get(item.country)!.items.push(item)
    })
    return groups
  }, [otherList])

  // 每个国家分组初始显示数量 + 加载更多增量
  const INITIAL_PER_COUNTRY = useMemo(() => {
    if (typeof window === 'undefined') return 6
    const w = window.innerWidth
    if (w < 640) return 6
    if (w < 1000) return 8
    if (w < 1400) return 9
    return 10
  }, [])
  const LOAD_MORE_STEP = 20
  const [countryLimits, setCountryLimits] = useState<Record<string, number>>(_cachedCountryLimits ?? {})

  const loadMoreCountry = (country: string) => {
    setCountryLimits(prev => {
      const next = { ...prev, [country]: (prev[country] ?? INITIAL_PER_COUNTRY) + LOAD_MORE_STEP }
      _cachedCountryLimits = next
      return next
    })
  }

  const groupedWithExpansion = useMemo(() => {
    return visibleGroupedByCountry.map(group => {
      const limit = countryLimits[group.country] ?? INITIAL_PER_COUNTRY
      return {
        ...group,
        visibleItems: group.items.slice(0, limit),
        hasMore: group.items.length > limit,
        hiddenCount: group.items.length - limit,
      }
    })
  }, [visibleGroupedByCountry, countryLimits, INITIAL_PER_COUNTRY])

  const visibleGroups = useMemo(() => {
    return groupedWithExpansion.slice(0, visibleGroupCount)
  }, [groupedWithExpansion, visibleGroupCount])

  const hasMoreGroups = visibleGroupCount < groupedWithExpansion.length

  // 筛选/排序变化时重置分页并滚回顶部（跳过首次挂载，保留从详情返回时的缓存状态）
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    setVisibleGroupCount(GROUPS_PER_PAGE)
    setCountryLimits({})
    _cachedCountryLimits = null
    _cachedVisibleGroupCount = null
    // 滚回顶部
    document.documentElement.scrollTop = 0
  }, [selectedCountries, selectedVenueTypes, searchFilter, sortMode])

  const totalFilters = selectedCountries.size + selectedVenueTypes.size + (searchFilter ? 1 : 0)

  // 筛选/排序状态变化时同步写入模块级缓存，返回列表页时恢复
  useEffect(() => { _cachedSelectedCountries = Array.from(selectedCountries) }, [selectedCountries])
  useEffect(() => { _cachedSelectedVenueTypes = Array.from(selectedVenueTypes) }, [selectedVenueTypes])
  useEffect(() => { _cachedSearchFilter = searchFilter }, [searchFilter])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

  const toggleCountry = (c: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  const toggleVenueType = (s: string) => {
    setSelectedVenueTypes(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const clearAllFilters = () => {
    setSelectedCountries(new Set())
    setSelectedVenueTypes(new Set())
    setSearchQuery('')
    setSearchFilter('')
  }

  const toggleGroup = (key: 'country' | 'venueType') => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandFilter = (key: 'country' | 'venueType') => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 点击搜索推荐项
  const handleSuggestionClick = (item: { type: 'country' | 'venueType' | 'venue'; label: string; slug?: string }) => {
    if (item.type === 'country') {
      setSelectedCountries(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'venueType') {
      setSelectedVenueTypes(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'venue' && item.slug) {
      navFromList('/destinations', `/destinations/${item.slug}`, navigate)
    }
    setSearchQuery('')
    setSearchSubmitted(false)
    setSearchFilter('')
  }

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchSubmitted(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 筛选栏内滚动时不带动页面
  useEffect(() => {
    const el = filterBodyRef.current
    if (!el) return
    const preventScroll = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const atTop = scrollTop === 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0
      if (atTop || atBottom) e.preventDefault()
    }
    el.addEventListener('wheel', preventScroll, { passive: false })
    return () => el.removeEventListener('wheel', preventScroll)
  }, [])

  // 加载更多国家分组
  const handleLoadMoreGroups = () => {
    setVisibleGroupCount(prev => {
      const next = prev + GROUPS_PER_PAGE
      _cachedVisibleGroupCount = next
      return next
    })
  }

  // 回车确认搜索
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      let matched = false
      allCountries.forEach(c => {
        if (c.toLowerCase().includes(q)) {
          setSelectedCountries(prev => { const n = new Set(prev); n.add(c); return n })
          matched = true
        }
      })
      allVenueTypes.forEach(s => {
        if (s.toLowerCase().includes(q)) {
          setSelectedVenueTypes(prev => { const n = new Set(prev); n.add(s); return n })
          matched = true
        }
      })
      if (matched) {
        setSearchQuery('')
        setSearchFilter('')
      } else {
        setSearchFilter(searchQuery.trim())
      }
      setSearchSubmitted(false)
      searchInputRef.current?.blur()
    }
  }

  const formatPrice = (venue: VenueItem) => {
    if (!venue.price) return '需咨询'
    return `${venue.priceUnit}${venue.price.toLocaleString()}起`
  }

  return (
    <div className="cd-page">
      <Seo
        title="目的地婚礼场地"
        description="精选欧洲12国50+城市目的地婚礼场地，涵盖意大利、法国、西班牙、希腊等浪漫婚礼目的地。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。"
        keywords={(() => {
          const baseKeywords = ['目的地婚礼', '欧洲婚礼', '海外婚礼', '目的地婚礼场地']
          // 从 allVenues 中提取所有国家
          const countries = Array.from(new Set(allVenues.map((v: VenueItem) => v.country).filter(Boolean)))
          countries.forEach(country => {
            baseKeywords.push(`${country}婚礼`, `${country}旅拍`, `${country}目的地婚礼`)
          })
          return baseKeywords.join(', ')
        })()}
      />
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{
          backgroundImage: `url(${coverDest})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          width: '100%', height: '100%'
        }} />
        <div className="cd-list-hero__overlay" />
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Destination Venues</p>
          <h1 className="cd-list-hero__title">目的地婚礼</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allVenues.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 处婚礼场地`
                : `共收录 ${allVenues.length} 处精选婚礼场地`
              : '精选全球婚礼场地，为您打造梦想中的目的地婚礼'}
          </p>
        </div>
      </section>

      {/* 骨架屏 */}
      {dataLoading && (
        <div className="wt-skeleton-overlay">
          <div className="wt-skeleton-search">
            <div className="wt-skeleton-search-bar" />
          </div>
          <div className="wt-skeleton-layout">
            <aside className="wt-skeleton-sidebar">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="wt-skeleton-filter-group">
                  <div className="wt-skeleton-filter-header" />
                  <div className="wt-skeleton-filter-items">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="wt-skeleton-filter-item" />
                    ))}
                  </div>
                </div>
              ))}
            </aside>
            <div className="wt-skeleton-cards">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="cd-card cd-card--skeleton">
                  <div className="cd-card__img-wrap"><div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} /></div>
                  <div className="cd-card__body">
                    <div className="cd-skeleton__line cd-skeleton__title" />
                    <div className="cd-skeleton__line cd-skeleton__price" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 搜索框 */}
      <div className="cd-search-bar" ref={searchRef}>
        <div className="cd-search-bar__inner">
          <svg className="cd-search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            className="cd-search-bar__input"
            type="text"
            placeholder="搜索场地名称、国家、场地类型…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => { setSearchQuery(''); setSearchSubmitted(false); setSearchFilter('') }}>✕</button>
          )}
        </div>
        {/* 搜索推荐下拉 */}
        {searchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
          <div className="cd-search-dropdown">
            {searchSuggestions.map((item, i) => (
              <div key={`${item.type}-${i}`} className="cd-search-dropdown__item" onClick={() => handleSuggestionClick(item)}>
                <span className={`cd-search-dropdown__icon cd-search-dropdown__icon--${item.type}`}>
                  {item.type === 'country' ? '🌍' : item.type === 'venueType' ? '💒' : '🏛️'}
                </span>
                <div className="cd-search-dropdown__text">
                  <span className="cd-search-dropdown__label">{item.label}</span>
                  {item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}
                </div>
                <span className="cd-search-dropdown__tag">
                  {item.type === 'country' ? '国家' : item.type === 'venueType' ? '类型' : '场地'}
                </span>
              </div>
            ))}
          </div>
        )}
        {searchFocused && searchQuery.trim() && searchSuggestions.length === 0 && (
          <div className="cd-search-dropdown">
            <div className="cd-search-dropdown__empty">无匹配结果</div>
          </div>
        )}
      </div>

      {/* 移动端筛选栏 */}
      <div className="ph-mobile-filter-bar">
        <span className="ph-mobile-filter-bar__count">
          共 <strong>{filteredList.length}</strong> 处婚礼场地
        </span>
        <button
          type="button"
          className="ph-mobile-filter-btn"
          onClick={() => setFilterDrawerOpen(true)}
        >
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
            <div className="ph-drawer__header">
              <h4 className="ph-drawer__title">筛选</h4>
              <button className="ph-drawer__close" onClick={() => setFilterDrawerOpen(false)}>✕</button>
            </div>
            <div className="ph-drawer__body">
              <div className="ph-filter-section">
                <div className="ph-filter-section__title">
                  <span>筛选</span>
                  <span className="ph-filter-section__en">Filter</span>
                </div>
                {/* 国家 */}
                <div className="ph-filter-group">
                  <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('country')}>
                    <span className="ph-filter-group__label">国家</span>
                    <span className="ph-filter-group__en">Country</span>
                    {selectedCountries.size > 0 && <span className="ph-filter-group__badge">{selectedCountries.size}</span>}
                    <span className={`ph-filter-group__arrow${openGroups.country ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                  </button>
                  {openGroups.country && (
                    <ul className="ph-filter-group__list">
                      {(expandedFilters.country ? allCountries : allCountries.slice(0, MAX_VISIBLE_FILTERS)).map(c => {
                        const count = allVenues.filter(v => v.country === c).length
                        return (
                          <li key={c} className={`ph-filter-group__item${selectedCountries.has(c) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleCountry(c)}>
                            <span className="ph-filter-group__checkbox">{selectedCountries.has(c) ? '☑' : '☐'}</span>
                            <span className="ph-filter-group__name">{c}</span>
                            <span className="ph-filter-group__count">{count}</span>
                          </li>
                        )
                      })}
                      {allCountries.length > MAX_VISIBLE_FILTERS && (
                        <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('country')}>
                          {expandedFilters.country ? '收起' : `更多 (${allCountries.length - MAX_VISIBLE_FILTERS})`}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                {/* 场地类型 */}
                <div className="ph-filter-group">
                  <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('venueType')}>
                    <span className="ph-filter-group__label">场地类型</span>
                    <span className="ph-filter-group__en">Venue Type</span>
                    {selectedVenueTypes.size > 0 && <span className="ph-filter-group__badge">{selectedVenueTypes.size}</span>}
                    <span className={`ph-filter-group__arrow${openGroups.venueType ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                  </button>
                  {openGroups.venueType && (
                    <ul className="ph-filter-group__list">
                      {(expandedFilters.venueType ? allVenueTypes : allVenueTypes.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
                        const count = allVenues.filter(v => v.venueTypes.includes(s)).length
                        return (
                          <li key={s} className={`ph-filter-group__item${selectedVenueTypes.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleVenueType(s)}>
                            <span className="ph-filter-group__checkbox">{selectedVenueTypes.has(s) ? '☑' : '☐'}</span>
                            <span className="ph-filter-group__name">{s}</span>
                            <span className="ph-filter-group__count">{count}</span>
                          </li>
                        )
                      })}
                      {allVenueTypes.length > MAX_VISIBLE_FILTERS && (
                        <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('venueType')}>
                          {expandedFilters.venueType ? '收起' : `更多 (${allVenueTypes.length - MAX_VISIBLE_FILTERS})`}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="ph-drawer__footer">
              {totalFilters > 0 && (
                <button className="ph-drawer__clear" onClick={clearAllFilters}>清除全部</button>
              )}
              <button className="ph-drawer__confirm" onClick={() => setFilterDrawerOpen(false)}>
                查看 {filteredList.length} 处婚礼场地
              </button>
            </div>
          </div>
        </div>
      )}

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
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('country')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>国家</span>
          {selectedCountries.size > 0 && <span className="dest-bottom-bar__badge">{selectedCountries.size}</span>}
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
                <button
                  key={opt.value}
                  type="button"
                  className={`dest-sheet__option${sortMode === opt.value ? ' dest-sheet__option--active' : ''}`}
                  onClick={() => { setSortMode(opt.value); setBottomSheet(null) }}
                >
                  <span>{opt.label}</span>
                  {sortMode === opt.value && <span className="dest-sheet__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 国家快选 ActionSheet */}
      {bottomSheet === 'country' && (() => {
        const current = pendingCountries ?? selectedCountries
        return (
        <div className="dest-sheet-overlay" onClick={() => { setBottomSheet(null); setPendingCountries(null) }}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择国家</h4>
              <button type="button" className="dest-sheet__close" onClick={() => { setBottomSheet(null); setPendingCountries(null) }}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {allCountries.map(c => {
                const count = allVenues.filter(v => v.country === c).length
                const active = current.has(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`}
                    onClick={() => {
                      const base = pendingCountries ?? selectedCountries
                      const next = new Set(base)
                      next.has(c) ? next.delete(c) : next.add(c)
                      setPendingCountries(next)
                    }}
                  >
                    <span>{c} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => {
                if (pendingCountries) setSelectedCountries(pendingCountries)
                setPendingCountries(null)
                setBottomSheet(null)
              }}>
                查看 {(() => {
                  let list = allVenues
                  if (current.size > 0) list = list.filter(c => current.has(c.country))
                  if (selectedVenueTypes.size > 0) list = list.filter(c => c.venueTypes.some(s => selectedVenueTypes.has(s)))
                  return list.length
                })()} 处场地
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
              {/* 国家 */}
              <div className="dest-sheet__section-title">国家 <span>Country</span></div>
              <div className="dest-sheet__chips">
                {allCountries.map(c => {
                  const count = allVenues.filter(v => v.country === c).length
                  const active = selectedCountries.has(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`}
                      onClick={() => toggleCountry(c)}
                    >
                      {c} <em>({count})</em>
                    </button>
                  )
                })}
              </div>
              {/* 场地类型 */}
              <div className="dest-sheet__section-title">场地类型 <span>Venue Type</span></div>
              <div className="dest-sheet__chips">
                {allVenueTypes.map(s => {
                  const count = allVenues.filter(v => v.venueTypes.includes(s)).length
                  const active = selectedVenueTypes.has(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`}
                      onClick={() => toggleVenueType(s)}
                    >
                      {s} <em>({count})</em>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="dest-sheet__footer">
              {totalFilters > 0 && (
                <button type="button" className="dest-sheet__clear" onClick={clearAllFilters}>清除全部</button>
              )}
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>
                查看 {filteredList.length} 处场地
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选 + 卡片布局 */}
      <div className="cd-filter-layout">
        {/* 左侧筛选栏 */}
        <aside className="ph-filter">
          <div className="ph-filter__body" ref={filterBodyRef}>
            <div className="ph-filter-section">
              <div className="ph-filter-section__title">
                <span>筛选</span>
                <span className="ph-filter-section__en">Filter</span>
              </div>
              {/* 国家 */}
              <div className="ph-filter-group">
                <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('country')}>
                  <span className="ph-filter-group__label">国家</span>
                  <span className="ph-filter-group__en">Country</span>
                  {selectedCountries.size > 0 && <span className="ph-filter-group__badge">{selectedCountries.size}</span>}
                  <span className={`ph-filter-group__arrow${openGroups.country ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                </button>
                {openGroups.country && (
                  <ul className="ph-filter-group__list">
                    {allCountries.length > 0 ? (expandedFilters.country ? allCountries : allCountries.slice(0, MAX_VISIBLE_FILTERS)).map(c => {
                      const count = allVenues.filter(v => v.country === c).length
                      return (
                        <li key={c} className={`ph-filter-group__item${selectedCountries.has(c) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleCountry(c)}>
                          <span className="ph-filter-group__checkbox">{selectedCountries.has(c) ? '☑' : '☐'}</span>
                          <span className="ph-filter-group__name">{c}</span>
                          <span className="ph-filter-group__count">{count}</span>
                        </li>
                      )
                    }) : (
                      <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>
                    )}
                    {allCountries.length > MAX_VISIBLE_FILTERS && (
                      <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('country')}>
                        {expandedFilters.country ? '收起' : `更多 (${allCountries.length - MAX_VISIBLE_FILTERS})`}
                      </li>
                    )}
                  </ul>
                )}
              </div>
              {/* 场地类型 */}
              <div className="ph-filter-group">
                <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('venueType')}>
                  <span className="ph-filter-group__label">场地类型</span>
                  <span className="ph-filter-group__en">Venue Type</span>
                  {selectedVenueTypes.size > 0 && <span className="ph-filter-group__badge">{selectedVenueTypes.size}</span>}
                  <span className={`ph-filter-group__arrow${openGroups.venueType ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                </button>
                {openGroups.venueType && (
                  <ul className="ph-filter-group__list">
                    {allVenueTypes.length > 0 ? (expandedFilters.venueType ? allVenueTypes : allVenueTypes.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
                      const count = allVenues.filter(v => v.venueTypes.includes(s)).length
                      return (
                        <li key={s} className={`ph-filter-group__item${selectedVenueTypes.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleVenueType(s)}>
                          <span className="ph-filter-group__checkbox">{selectedVenueTypes.has(s) ? '☑' : '☐'}</span>
                          <span className="ph-filter-group__name">{s}</span>
                          <span className="ph-filter-group__count">{count}</span>
                        </li>
                      )
                    }) : (
                      <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>
                    )}
                    {allVenueTypes.length > MAX_VISIBLE_FILTERS && (
                      <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('venueType')}>
                        {expandedFilters.venueType ? '收起' : `更多 (${allVenueTypes.length - MAX_VISIBLE_FILTERS})`}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧卡片列表 */}
        <div className="cd-list">
          {filteredList.length > 0 ? (
            <>
              {sortMode !== 'default' ? (
                /* 排序模式：扁平列表，无国家分组 */
                <>
                  {bookedList.length > 0 && (
                    <>
                      <div className="cd-section-label">
                        <span className="cd-section-label__icon">✦</span>
                        <span>意向单</span>
                        <span className="cd-section-label__count">{bookedList.length}</span>
                      </div>
                      {bookedList.map(item => (
                        <div
                          key={item.slug}
                          className="cd-card cd-card--booked"
                          data-scroll-id={item.slug}
                          onClick={() => navFromList('/destinations', `/destinations/${item.slug}`, navigate)}
                        >
                          <div className="cd-card__img-wrap">
                            <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                            <div className="cd-card__img-overlay" />
                            <span className="cd-card__booked-badge">
                              <svg className="cd-card__booked-wreath" viewBox="0 0 80 80" width="36" height="36">
                                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                              <svg className="cd-card__booked-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          </div>
                          <div className="cd-card__body">
                            <h3 className="cd-card__name">{item.name}</h3>
                            <p className="cd-card__tagline">{item.tagline}</p>
                            <div className="cd-card__styles">
                              {item.venueTypes.slice(0, 3).map(s => (
                                <span key={s} className="cd-card__style-tag">{s}</span>
                              ))}
                            </div>
                            <div className="cd-card__footer">
                              <span className="cd-card__price">{formatPrice(item)}</span>
                              <span className="cd-card__arrow">查看详情 →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {otherList.length > 0 && bookedList.length > 0 && (
                    <div className="cd-section-label cd-section-label--rest">
                      <span className="cd-section-label__icon">✦</span>
                      <span>其他</span>
                      <span className="cd-section-label__count">{otherList.length}</span>
                    </div>
                  )}
                  {otherList.map(item => (
                  <div
                    key={item.slug}
                    className="cd-card"
                    data-scroll-id={item.slug}
                    onClick={() => navFromList('/destinations', `/destinations/${item.slug}`, navigate)}
                  >
                    <div className="cd-card__img-wrap">
                      <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                      <div className="cd-card__img-overlay" />
                      {NEW_VENUE_SLUGS.has(item.slug) && <span className="cd-card__new-badge">NEW</span>}
                    </div>
                    <div className="cd-card__body">
                      <h3 className="cd-card__name">{item.name}</h3>
                      <p className="cd-card__tagline">{item.tagline}</p>
                      <div className="cd-card__styles">
                        {item.venueTypes.slice(0, 3).map(s => (
                          <span key={s} className="cd-card__style-tag">{s}</span>
                        ))}
                      </div>
                      <div className="cd-card__footer">
                        <span className="cd-card__price">{formatPrice(item)}</span>
                        <span className="cd-card__arrow">查看详情 →</span>
                      </div>
                    </div>
                  </div>
                ))}
                </>
              ) : bookedList.length > 0 ? (
                <>
                  {/* 已预定区域 */}
                  <div className="cd-section-label">
                    <span className="cd-section-label__icon">✦</span>
                    <span>意向单</span>
                    <span className="cd-section-label__count">{bookedList.length}</span>
                  </div>
                  {bookedList.map(item => (
                    <div
                      key={item.slug}
                      className="cd-card cd-card--booked"
                      data-scroll-id={item.slug}
                      onClick={() => navFromList('/destinations', `/destinations/${item.slug}`, navigate)}
                    >
                        <div className="cd-card__img-wrap">
                        <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                        <div className="cd-card__img-overlay" />
                        <span className="cd-card__booked-badge">
                          <svg className="cd-card__booked-wreath" viewBox="0 0 80 80" width="36" height="36">
                            <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <ellipse cx="11" cy="44" rx="3" ry="1.5" transform="rotate(-30 11 44)" fill="currentColor" opacity="0.2"/>
                            <ellipse cx="9" cy="35" rx="2.5" ry="1.3" transform="rotate(-15 9 35)" fill="currentColor" opacity="0.2"/>
                            <ellipse cx="69" cy="44" rx="3" ry="1.5" transform="rotate(30 69 44)" fill="currentColor" opacity="0.2"/>
                            <ellipse cx="71" cy="35" rx="2.5" ry="1.3" transform="rotate(15 71 35)" fill="currentColor" opacity="0.2"/>
                            <circle cx="40" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
                            <polyline points="30 42 38 50 52 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        
                      </div>
                      <div className="cd-card__body">
                        <h3 className="cd-card__name">{item.name}</h3>
                        <p className="cd-card__tagline">{item.tagline}</p>
                        <div className="cd-card__styles">
                          {item.venueTypes.slice(0, 3).map(s => (
                            <span key={s} className="cd-card__style-tag">{s}</span>
                          ))}
                        </div>
                        <div className="cd-card__footer">
                          <span className="cd-card__price">{formatPrice(item)}</span>
                          <span className="cd-card__arrow">查看详情 →</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 其他区域 */}
                  {otherList.length > 0 && (
                    <>
                      <div className="cd-section-label cd-section-label--rest">
                        <span className="cd-section-label__icon">✦</span>
                        <span>其他</span>
                        <span className="cd-section-label__count">{otherList.length}</span>
                      </div>
                      {visibleGroups.map((group, gi) => (
                        <Fragment key={group.country}>
                          <div className="cd-country-header" style={{ gridColumn: '1 / -1' }}>
                            <h2 className="cd-country-header__title">{group.country}</h2>
                            <span className="cd-country-header__en">{group.countryEn}</span>
                            <div className="cd-country-header__line" />
                            <span className="cd-country-header__count">{group.items.length} 处场地</span>
                          </div>
                          {group.visibleItems.map(item => (
                            <div
                              key={item.slug}
                              className="cd-card"
                              data-scroll-id={item.slug}
                              onClick={() => navFromList('/destinations', `/destinations/${item.slug}`, navigate)}
                            >
                              <div className="cd-card__img-wrap">
                                <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                                <div className="cd-card__img-overlay" />
                                {NEW_VENUE_SLUGS.has(item.slug) && <span className="cd-card__new-badge">NEW</span>}
                              </div>
                              <div className="cd-card__body">
                                <h3 className="cd-card__name">{item.name}</h3>
                                <p className="cd-card__tagline">{item.tagline}</p>
                                <div className="cd-card__styles">
                                  {item.venueTypes.slice(0, 3).map(s => (
                                    <span key={s} className="cd-card__style-tag">{s}</span>
                                  ))}
                                </div>
                                <div className="cd-card__footer">
                                  <span className="cd-card__price">{formatPrice(item)}</span>
                                  <span className="cd-card__arrow">查看详情 →</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {group.hasMore && (
                            <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                              <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>
                                加载更多 ({group.hiddenCount})
                              </button>
                            </div>
                          )}
                        </Fragment>
                      ))}
                    </>
                  )}
                </>
              ) : (
                visibleGroups.map((group, gi) => (
                  <Fragment key={group.country}>
                    <div className="cd-country-header" style={{ gridColumn: '1 / -1' }}>
                      <h2 className="cd-country-header__title">{group.country}</h2>
                      <span className="cd-country-header__en">{group.countryEn}</span>
                      <div className="cd-country-header__line" />
                      <span className="cd-country-header__count">{group.items.length} 处场地</span>
                    </div>
                    {group.visibleItems.map(item => (
                      <div
                        key={item.slug}
                        className="cd-card"
                        onClick={() => navFromList('/destinations', `/destinations/${item.slug}`, navigate)}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                          <div className="cd-card__img-overlay" />
                          {NEW_VENUE_SLUGS.has(item.slug) && <span className="cd-card__new-badge">NEW</span>}
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.tagline}</p>
                          <div className="cd-card__styles">
                            {item.venueTypes.slice(0, 3).map(s => (
                              <span key={s} className="cd-card__style-tag">{s}</span>
                            ))}
                          </div>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">{formatPrice(item)}</span>
                            <span className="cd-card__arrow">查看详情 →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.hasMore && (
                      <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                        <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>
                          加载更多 ({group.hiddenCount})
                        </button>
                      </div>
                    )}
                  </Fragment>
                ))
              )}

              {hasMoreGroups && (
                <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                  <button className="cd-section-more__btn" onClick={handleLoadMoreGroups}>
                    加载更多场地…
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{totalFilters > 0 || searchFilter ? '当前筛选条件下无婚礼场地，请调整筛选' : '暂无婚礼场地数据'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
