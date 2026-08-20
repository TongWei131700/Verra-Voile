import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import coverDest from '../assets/destinations-cover.jpg'

const API_BASE = import.meta.env.VITE_API_URL || ''

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
  const [searchFilter, setSearchFilter] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState({ country: true, venueType: true })
  const [expandedFilters, setExpandedFilters] = useState({ country: false, venueType: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const ITEMS_PER_PAGE = 6
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [listLoading, setListLoading] = useState(false)

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
    return list
  }, [selectedCountries, selectedVenueTypes, searchFilter, allVenues])

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

  const bookedList = useMemo(() => filteredList.filter(c => bookedSlugs.has(c.slug)), [filteredList, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(c => !bookedSlugs.has(c.slug)), [filteredList, bookedSlugs])
  const visibleOtherList = useMemo(() => otherList.slice(0, visibleCount), [otherList, visibleCount])
  const hasMoreItems = visibleCount < otherList.length

  // 按国家分组（保持首次出现顺序）
  const visibleGroupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: VenueItem[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: VenueItem[] }>()
    visibleOtherList.forEach(item => {
      if (!map.has(item.country)) {
        const group = { country: item.country, countryEn: item.countryEn, items: [] }
        map.set(item.country, group)
        groups.push(group)
      }
      map.get(item.country)!.items.push(item)
    })
    return groups
  }, [visibleOtherList])

  // 每个国家分组默认显示两行，超出显示"查看更多"
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set())
  const colsPerRow = useMemo(() => {
    if (typeof window === 'undefined') return 3
    const w = window.innerWidth
    if (w < 640) return 1
    if (w < 1000) return 2
    if (w < 1400) return 3
    return 4
  }, [])
  const MAX_COUNTRY_ITEMS = colsPerRow * 2
  const groupedWithVisibility = useMemo(() => {
    return visibleGroupedByCountry.map(group => ({
      ...group,
      visibleItems: expandedCountries.has(group.country)
        ? group.items
        : group.items.slice(0, MAX_COUNTRY_ITEMS),
      hasMore: group.items.length > MAX_COUNTRY_ITEMS && !expandedCountries.has(group.country),
      hiddenCount: group.items.length - MAX_COUNTRY_ITEMS,
    }))
  }, [visibleGroupedByCountry, expandedCountries, MAX_COUNTRY_ITEMS])

  const toggleCountryExpand = (country: string) => {
    setExpandedCountries(prev => {
      const next = new Set(prev)
      next.has(country) ? next.delete(country) : next.add(country)
      return next
    })
  }

  // 筛选变化时重置分页
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
    setExpandedCountries(new Set())
  }, [selectedCountries, selectedVenueTypes, searchFilter])

  const totalFilters = selectedCountries.size + selectedVenueTypes.size + (searchFilter ? 1 : 0)

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
      navigate(`/destinations/${item.slug}`)
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

  // 无限滚动
  useEffect(() => {
    const onScroll = () => {
      if (listLoading || !hasMoreItems) return
      const scrollBottom = window.innerHeight + window.scrollY
      const docHeight = document.documentElement.scrollHeight
      if (scrollBottom >= docHeight - 400) {
        setListLoading(true)
        setTimeout(() => {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE)
          setListLoading(false)
        }, 400)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hasMoreItems, listLoading])

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
            {allVenues.length > 0 ? `共收录 ${allVenues.length} 处精选婚礼场地` : '精选全球婚礼场地，为您打造梦想中的目的地婚礼'}
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
                    <div className="cd-skeleton__line cd-skeleton__tagline" />
                    <div className="cd-skeleton__line cd-skeleton__text--short" />
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
              {bookedList.length > 0 ? (
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
                      onClick={() => { window.__saveScrollPos?.('/destinations'); navigate(`/destinations/${item.slug}`) }}
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
                        <p className="cd-card__desc">{item.desc}</p>
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
                      {groupedWithVisibility.map((group, gi) => (
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
                              onClick={() => { window.__saveScrollPos?.('/destinations'); navigate(`/destinations/${item.slug}`) }}
                            >
                              <div className="cd-card__img-wrap">
                                <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                                <div className="cd-card__img-overlay" />
                              </div>
                              <div className="cd-card__body">
                                <h3 className="cd-card__name">{item.name}</h3>
                                <p className="cd-card__tagline">{item.tagline}</p>
                                <p className="cd-card__desc">{item.desc}</p>
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
                              <button className="cd-section-more__btn" onClick={() => toggleCountryExpand(group.country)}>
                                查看更多 ({group.hiddenCount})
                              </button>
                            </div>
                          )}
                          {listLoading && gi === visibleGroupedByCountry.length - 1 && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                            <div key={`skel-${i}`} className="cd-card cd-card--skeleton">
                              <div className="cd-card__img-wrap"><div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} /></div>
                              <div className="cd-card__body">
                                <div className="cd-skeleton__line cd-skeleton__title" />
                                <div className="cd-skeleton__line cd-skeleton__tagline" />
                                <div className="cd-skeleton__line cd-skeleton__text--short" />
                                <div className="cd-skeleton__line cd-skeleton__price" />
                              </div>
                            </div>
                          ))}
                        </Fragment>
                      ))}
                    </>
                  )}
                </>
              ) : (
                groupedWithVisibility.map((group, gi) => (
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
                        onClick={() => { window.__saveScrollPos?.('/destinations'); navigate(`/destinations/${item.slug}`) }}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                          <div className="cd-card__img-overlay" />
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.tagline}</p>
                          <p className="cd-card__desc">{item.desc}</p>
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
                        <button className="cd-section-more__btn" onClick={() => toggleCountryExpand(group.country)}>
                          查看更多 ({group.hiddenCount})
                        </button>
                      </div>
                    )}
                    {listLoading && gi === visibleGroupedByCountry.length - 1 && Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                      <div key={`skel-${i}`} className="cd-card cd-card--skeleton">
                        <div className="cd-card__img-wrap"><div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} /></div>
                        <div className="cd-card__body">
                          <div className="cd-skeleton__line cd-skeleton__title" />
                          <div className="cd-skeleton__line cd-skeleton__tagline" />
                          <div className="cd-skeleton__line cd-skeleton__text--short" />
                          <div className="cd-skeleton__line cd-skeleton__price" />
                        </div>
                      </div>
                    ))}
                  </Fragment>
                ))
              )}

              {!hasMoreItems && !listLoading && (
                <div className="cd-load-end">
                  <span>— 已展示全部 {filteredList.length} 处婚礼场地 —</span>
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
