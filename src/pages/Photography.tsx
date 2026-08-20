import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import heroImg from '../assets/mariah-krafft-ayc1G5wV3aA-unsplash.jpg'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 摄影师列表项（与 API 返回字段对应）
interface PhotographerItem {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  photoStyles: string[]
  tagline: string
  cover: string
  price?: number
}

const HERO_IMG = heroImg

// 模块级缓存：从详情返回列表页时复用，避免重复请求
let _cachedProducts: PhotographerItem[] | null = null

// 从数据中提取去重后的选项列表
function extractUnique<T>(products: PhotographerItem[], getter: (p: PhotographerItem) => T | T[]): T[] {
  const set = new Set<T>()
  products.forEach(p => {
    const val = getter(p)
    if (Array.isArray(val)) val.forEach(v => set.add(v))
    else if (val !== undefined && val !== '') set.add(val)
  })
  return Array.from(set).sort()
}

// 将 API 返回的 snake_case 数据转为前端 camelCase
function mapApiItem(row: any): PhotographerItem {
  let styles: string[] = []
  try { styles = typeof row.photo_styles === 'string' ? JSON.parse(row.photo_styles) : (row.photo_styles || []) } catch { /* ignore */ }
  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    country: row.country,
    countryEn: row.country_en || '',
    photoStyles: styles,
    tagline: row.tagline || '',
    cover: row.cover_image || '',
    price: row.price ?? undefined,
  }
}

export default function Photography() {
  const navigate = useNavigate()
  const [allProducts, setAllProducts] = useState<PhotographerItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set())
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState({ country: true, style: true })
  const [expandedFilters, setExpandedFilters] = useState({ country: false, style: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const ITEMS_PER_PAGE = 6
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [listLoading, setListLoading] = useState(false)

  // 从 API 加载摄影师数据（有缓存则复用）
  useEffect(() => {
    if (_cachedProducts) {
      setAllProducts(_cachedProducts)
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-photographers`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const items = res.data.map(mapApiItem)
          _cachedProducts = items
          setAllProducts(items)
        }
      })
      .catch(err => console.error('加载摄影师列表失败:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // 刷新已预定状态
  const refreshBooked = useCallback(() => {
    const items = getSelectedProducts().filter(i => i.categoryId === 'photography')
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
  const allCountries = useMemo(() => extractUnique(allProducts, (p: PhotographerItem) => p.country), [allProducts])
  const allStyles = useMemo(() => extractUnique(allProducts, (p: PhotographerItem) => p.photoStyles), [allProducts])

  const filteredList = useMemo(() => {
    let list = allProducts
    if (selectedCountries.size > 0) {
      list = list.filter(p => selectedCountries.has(p.country))
    }
    if (selectedStyles.size > 0) {
      list = list.filter(p => p.photoStyles.some(s => selectedStyles.has(s)))
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.countryEn.toLowerCase().includes(q) ||
        p.photoStyles.some(s => s.toLowerCase().includes(q))
      )
    }
    return list
  }, [selectedCountries, selectedStyles, searchFilter, allProducts])

  // 搜索推荐条目
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const items: { type: 'country' | 'style' | 'photographer'; label: string; sub?: string; slug?: string }[] = []
    allCountries.forEach(c => {
      if (c.toLowerCase().includes(q)) items.push({ type: 'country', label: c })
    })
    allStyles.forEach(s => {
      if (s.toLowerCase().includes(q)) items.push({ type: 'style', label: s })
    })
    allProducts.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)) {
        items.push({ type: 'photographer', label: p.nameEn, sub: p.country, slug: p.slug })
      }
    })
    return items.slice(0, 10)
  }, [searchQuery, allCountries, allStyles, allProducts])

  const bookedList = useMemo(() => filteredList.filter(p => bookedSlugs.has(p.slug)), [filteredList, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(p => !bookedSlugs.has(p.slug)), [filteredList, bookedSlugs])
  const visibleOtherList = useMemo(() => otherList.slice(0, visibleCount), [otherList, visibleCount])
  const hasMoreItems = visibleCount < otherList.length

  // 按国家分组（保持首次出现顺序）
  const visibleGroupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: PhotographerItem[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: PhotographerItem[] }>()
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
  }, [selectedCountries, selectedStyles, searchFilter])

  const totalFilters = selectedCountries.size + selectedStyles.size + (searchFilter ? 1 : 0)
  const bookedCount = allProducts.filter((p: PhotographerItem) => bookedSlugs.has(p.slug)).length

  const toggleCountry = (c: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  const toggleStyle = (s: string) => {
    setSelectedStyles(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const clearAllFilters = () => {
    setSelectedCountries(new Set())
    setSelectedStyles(new Set())
    setSearchQuery('')
    setSearchFilter('')
  }

  const toggleGroup = (key: 'country' | 'style') => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandFilter = (key: 'country' | 'style') => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 点击搜索推荐项
  const handleSuggestionClick = (item: { type: 'country' | 'style' | 'photographer'; label: string; slug?: string }) => {
    if (item.type === 'country') {
      setSelectedCountries(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'style') {
      setSelectedStyles(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'photographer' && item.slug) {
      navigate(`/photography/${item.slug}`)
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

  // 无限滚动：监听页面滚动，接近底部时加载更多
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

  // 回车确认搜索：匹配筛选条件则加入左侧筛选，否则按文字过滤
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      let matched = false

      // 匹配国家
      allCountries.forEach(c => {
        if (c.toLowerCase().includes(q)) {
          setSelectedCountries(prev => { const n = new Set(prev); n.add(c); return n })
          matched = true
        }
      })
      // 匹配风格
      allStyles.forEach(s => {
        if (s.toLowerCase().includes(q)) {
          setSelectedStyles(prev => { const n = new Set(prev); n.add(s); return n })
          matched = true
        }
      })

      if (matched) {
        // 匹配到筛选条件 → 加入左侧筛选，清空搜索
        setSearchQuery('')
        setSearchFilter('')
      } else {
        // 未匹配 → 按文字过滤摄影师名称
        setSearchFilter(searchQuery.trim())
      }
      setSearchSubmitted(false)
      searchInputRef.current?.blur()
    }
  }

  return (
    <div className="cd-page">
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          width: '100%', height: '100%'
        }} />
        <div className="cd-list-hero__overlay" />
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Wedding Photography</p>
          <h1 className="cd-list-hero__title">摄影</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allProducts.length > 0 ? `共收录 ${allProducts.length} 位严选摄影师` : '记录每一个珍贵瞬间'}
          </p>
        </div>
      </section>

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
            placeholder="搜索摄影师名称、国家、风格…"
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
        {/* 搜索推荐下拉 — 输入时实时展示，回车后关闭 */}
        {searchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
          <div className="cd-search-dropdown">
            {searchSuggestions.map((item, i) => (
              <div key={`${item.type}-${i}`} className="cd-search-dropdown__item" onClick={() => handleSuggestionClick(item)}>
                <span className={`cd-search-dropdown__icon cd-search-dropdown__icon--${item.type}`}>
                  {item.type === 'country' ? '🌍' : item.type === 'style' ? '🎨' : '📷'}
                </span>
                <div className="cd-search-dropdown__text">
                  <span className="cd-search-dropdown__label">{item.label}</span>
                  {item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}
                </div>
                <span className="cd-search-dropdown__tag">
                  {item.type === 'country' ? '国家' : item.type === 'style' ? '风格' : '摄影师'}
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
          共 <strong>{filteredList.length}</strong> 位摄影师
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
            {/* 头部 */}
            <div className="ph-drawer__header">
              <h4 className="ph-drawer__title">筛选</h4>
              <button className="ph-drawer__close" onClick={() => setFilterDrawerOpen(false)}>✕</button>
            </div>
            {/* 筛选内容 */}
            <div className="ph-drawer__body">
              {/* 筛选分区 */}
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
                      const count = allProducts.filter(p => p.country === c).length
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
              {/* 摄影风格 */}
              <div className="ph-filter-group">
                <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('style')}>
                  <span className="ph-filter-group__label">摄影风格</span>
                  <span className="ph-filter-group__en">Style</span>
                  {selectedStyles.size > 0 && <span className="ph-filter-group__badge">{selectedStyles.size}</span>}
                  <span className={`ph-filter-group__arrow${openGroups.style ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                </button>
                {openGroups.style && (
                  <ul className="ph-filter-group__list">
                    {(expandedFilters.style ? allStyles : allStyles.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
                      const count = allProducts.filter(p => p.photoStyles.includes(s)).length
                      return (
                        <li key={s} className={`ph-filter-group__item${selectedStyles.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleStyle(s)}>
                          <span className="ph-filter-group__checkbox">{selectedStyles.has(s) ? '☑' : '☐'}</span>
                          <span className="ph-filter-group__name">{s}</span>
                          <span className="ph-filter-group__count">{count}</span>
                        </li>
                      )
                    })}
                    {allStyles.length > MAX_VISIBLE_FILTERS && (
                      <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('style')}>
                        {expandedFilters.style ? '收起' : `更多 (${allStyles.length - MAX_VISIBLE_FILTERS})`}
                      </li>
                    )}
                  </ul>
                )}
              </div>
              </div>
            </div>
            {/* 底部 */}
            <div className="ph-drawer__footer">
              {totalFilters > 0 && (
                <button className="ph-drawer__clear" onClick={clearAllFilters}>清除全部</button>
              )}
              <button className="ph-drawer__confirm" onClick={() => setFilterDrawerOpen(false)}>
                查看 {filteredList.length} 位摄影师
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
            {/* 筛选分区 */}
            <div className="ph-filter-section">
              <div className="ph-filter-section__title">
                <span>筛选</span>
                <span className="ph-filter-section__en">Filter</span>
              </div>
              {/* 国家 */}
              <div className="ph-filter-group">
            <button
              type="button"
              className="ph-filter-group__header"
              onClick={() => toggleGroup('country')}
            >
              <span className="ph-filter-group__label">国家</span>
              <span className="ph-filter-group__en">Country</span>
              {selectedCountries.size > 0 && (
                <span className="ph-filter-group__badge">{selectedCountries.size}</span>
              )}
              <span className={`ph-filter-group__arrow${openGroups.country ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
            </button>
            {openGroups.country && (
              <ul className="ph-filter-group__list">
                {allCountries.length > 0 ? (expandedFilters.country ? allCountries : allCountries.slice(0, MAX_VISIBLE_FILTERS)).map(c => {
                  const count = allProducts.filter(p => p.country === c).length
                  return (
                    <li
                      key={c}
                      className={`ph-filter-group__item${selectedCountries.has(c) ? ' ph-filter-group__item--checked' : ''}`}
                      onClick={() => toggleCountry(c)}
                    >
                      <span className="ph-filter-group__checkbox">
                        {selectedCountries.has(c) ? '☑' : '☐'}
                      </span>
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

          {/* 摄影风格 */}
          <div className="ph-filter-group">
            <button
              type="button"
              className="ph-filter-group__header"
              onClick={() => toggleGroup('style')}
            >
              <span className="ph-filter-group__label">摄影风格</span>
              <span className="ph-filter-group__en">Style</span>
              {selectedStyles.size > 0 && (
                <span className="ph-filter-group__badge">{selectedStyles.size}</span>
              )}
              <span className={`ph-filter-group__arrow${openGroups.style ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
            </button>
            {openGroups.style && (
              <ul className="ph-filter-group__list">
                {allStyles.length > 0 ? (expandedFilters.style ? allStyles : allStyles.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
                  const count = allProducts.filter(p => p.photoStyles.includes(s)).length
                  return (
                    <li
                      key={s}
                      className={`ph-filter-group__item${selectedStyles.has(s) ? ' ph-filter-group__item--checked' : ''}`}
                      onClick={() => toggleStyle(s)}
                    >
                      <span className="ph-filter-group__checkbox">
                        {selectedStyles.has(s) ? '☑' : '☐'}
                      </span>
                      <span className="ph-filter-group__name">{s}</span>
                      <span className="ph-filter-group__count">{count}</span>
                    </li>
                  )
                }) : (
                  <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>
                )}
                {allStyles.length > MAX_VISIBLE_FILTERS && (
                  <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('style')}>
                    {expandedFilters.style ? '收起' : `更多 (${allStyles.length - MAX_VISIBLE_FILTERS})`}
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
              {/* 有已预定时分两个区域展示 */}
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
                      onClick={() => { window.__saveScrollPos?.('/photography'); navigate(`/photography/${item.slug}`) }}
                    >
                      <div className="cd-card__img-wrap">
                        <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
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
                          {item.photoStyles.slice(0, 3).map(s => (
                            <span key={s} className="cd-card__style-tag">{s}</span>
                          ))}
                        </div>
                        <div className="cd-card__footer">
                          <span className="cd-card__price">€{item.price ?? 250}起</span>
                          <span className="cd-card__arrow">查看详情 →</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 其他摄影师区域 */}
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
                            <span className="cd-country-header__count">{group.items.length} 位摄影师</span>
                          </div>
                          {group.visibleItems.map(item => (
                            <div
                              key={item.slug}
                              className="cd-card"
                              onClick={() => { window.__saveScrollPos?.('/photography'); navigate(`/photography/${item.slug}`) }}
                            >
                              <div className="cd-card__img-wrap">
                                <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                                <div className="cd-card__img-overlay" />
                              </div>
                              <div className="cd-card__body">
                                <h3 className="cd-card__name">{item.name}</h3>
                                <p className="cd-card__tagline">{item.tagline}</p>
                                <div className="cd-card__styles">
                                  {item.photoStyles.slice(0, 3).map(s => (
                                    <span key={s} className="cd-card__style-tag">{s}</span>
                                  ))}
                                </div>
                                <div className="cd-card__footer">
                                  <span className="cd-card__price">€{item.price ?? 250}起</span>
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
                              <div className="cd-card__img-wrap">
                                <div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} />
                              </div>
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
                /* 无已预定时，按国家分组展示 */
                groupedWithVisibility.map((group, gi) => (
                  <Fragment key={group.country}>
                    <div className="cd-country-header" style={{ gridColumn: '1 / -1' }}>
                      <h2 className="cd-country-header__title">{group.country}</h2>
                      <span className="cd-country-header__en">{group.countryEn}</span>
                      <div className="cd-country-header__line" />
                      <span className="cd-country-header__count">{group.items.length} 位摄影师</span>
                    </div>
                    {group.visibleItems.map(item => (
                      <div
                        key={item.slug}
                        className="cd-card"
                        onClick={() => { window.__saveScrollPos?.('/photography'); navigate(`/photography/${item.slug}`) }}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                          <div className="cd-card__img-overlay" />
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.tagline}</p>
                          <div className="cd-card__styles">
                            {item.photoStyles.slice(0, 3).map(s => (
                              <span key={s} className="cd-card__style-tag">{s}</span>
                            ))}
                          </div>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">€{item.price ?? 250}起</span>
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
                        <div className="cd-card__img-wrap">
                          <div className="cd-skeleton__img" style={{ width: '100%', height: '100%' }} />
                        </div>
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
                  <span>— 已展示全部 {filteredList.length} 位摄影师 —</span>
                </div>
              )}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{totalFilters > 0 || searchFilter ? '当前筛选条件下无摄影师，请调整筛选' : '暂无摄影师数据'}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
