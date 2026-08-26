import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import heroImg from '../assets/wedding-team-hero-bg.jpg'
import Seo from '../components/Seo'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 列表项（与 API 返回字段对应）
interface WeddingTeamCompany {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  city: string
  cityEn: string
  tagline: string
  desc: string
  foundedYear: number
  cover: string
  headshot?: string
  images: string[]
  website: string
  source: { name: string; url: string }
  specialties: string[]
  teamMembers: any[]
  services: any[]
  serviceAreas: { name: string; nameCn: string }[]
  testimonials: any[]
  partners: any[]
  faq: any[]
  price?: number
}

function getCurrencySymbol(country: string) {
  return country === 'United Kingdom' ? '£' : '€'
}

// 模块级缓存：从详情返回列表页时复用，避免重复请求
let _cachedCompanies: WeddingTeamCompany[] | null = null
// 筛选/排序缓存：返回列表页时恢复用户之前的筛选状态
let _cachedSelectedCountries: string[] | null = null
let _cachedSelectedSpecialties: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null

// 将 API 返回的 snake_case 数据转为前端 camelCase
function mapApiItem(row: any): WeddingTeamCompany {
  let specialties: string[] = []
  let serviceAreas: any[] = []
  try { specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : (row.specialties || []) } catch { /* ignore */ }
  try { serviceAreas = typeof row.service_areas === 'string' ? JSON.parse(row.service_areas) : (row.service_areas || []) } catch { /* ignore */ }
  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    country: row.country_cn || row.country || '',
    countryEn: row.country || '',
    city: row.city_cn || row.city || '',
    cityEn: row.city || '',
    tagline: row.tagline || '',
    desc: row.description_preview || '',
    foundedYear: row.founded_year || 0,
    cover: row.cover_image || '',
    headshot: row.headshot || '',
    images: [],
    website: row.website || '',
    source: { name: row.source_url || '', url: row.source_url || '' },
    specialties,
    teamMembers: [],
    services: [],
    serviceAreas: serviceAreas.map((a: any) => ({ name: a.name, nameCn: a.name_cn })),
    testimonials: [],
    partners: [],
    faq: [],
    price: row.price ?? undefined,
  }
}

const HERO_IMG = heroImg

// 从数据中动态提取去重后的选项列表
function extractUnique<T>(companies: WeddingTeamCompany[], getter: (c: WeddingTeamCompany) => T | T[]): T[] {
  const set = new Set<T>()
  companies.forEach(c => {
    const val = getter(c)
    if (Array.isArray(val)) val.forEach(v => set.add(v))
    else if (val !== undefined && val !== '') set.add(val)
  })
  return Array.from(set).sort()
}

export default function WeddingTeam() {
  const navigate = useNavigate()
  const [allCompanies, setAllCompanies] = useState<WeddingTeamCompany[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [searchFilter, setSearchFilter] = useState(() => _cachedSearchFilter ?? '')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => new Set(_cachedSelectedCountries ?? []))
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(() => new Set(_cachedSelectedSpecialties ?? []))
  const [openGroups, setOpenGroups] = useState({ country: true, specialty: true })
  const [expandedFilters, setExpandedFilters] = useState({ country: false, specialty: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'country' | 'filter' | null>(null)
  const [pendingCountries, setPendingCountries] = useState<Set<string> | null>(null)
  const GROUPS_PER_PAGE = 5
  const [visibleGroupCount, setVisibleGroupCount] = useState(GROUPS_PER_PAGE)

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
  const [countryPages, setCountryPages] = useState<Record<string, number>>(() => {
    try { return JSON.parse(sessionStorage.getItem('team_country_pages') || '{}') } catch { return {} }
  })

  // 从 API 加载数据（有缓存则复用）
  useEffect(() => {
    if (_cachedCompanies) {
      setAllCompanies(_cachedCompanies)
      setDataLoading(false)
      return
    }
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-wedding-teams`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const items = res.data.map(mapApiItem)
          _cachedCompanies = items
          setAllCompanies(items)
        }
      })
      .catch(err => console.error('加载婚礼团队列表失败:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // 刷新已预定状态
  const refreshBooked = useCallback(() => {
    const items = getSelectedProducts().filter(i => i.categoryId === 'wedding-team')
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
  const allCountries = useMemo(() => extractUnique(allCompanies, c => c.country), [allCompanies])
  const allSpecialties = useMemo(() => extractUnique(allCompanies, c => c.specialties), [allCompanies])

  const sortOptions = [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格低→高' },
    { value: 'price-desc', label: '价格高→低' },
    { value: 'name', label: '名称 A→Z' },
  ]

  const filteredList = useMemo(() => {
    let list = allCompanies
    if (selectedCountries.size > 0) {
      list = list.filter(c => selectedCountries.has(c.country))
    }
    if (selectedSpecialties.size > 0) {
      list = list.filter(c => c.specialties.some(s => selectedSpecialties.has(s)))
    }
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.nameEn.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.countryEn.toLowerCase().includes(q) ||
        c.specialties.some(s => s.toLowerCase().includes(q)) ||
        c.tagline.toLowerCase().includes(q)
      )
    }
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => ((a.price ?? 2000)) - ((b.price ?? 2000)))
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => ((b.price ?? 2000)) - ((a.price ?? 2000)))
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
    }
    return list
  }, [selectedCountries, selectedSpecialties, searchFilter, sortMode, allCompanies])

  // 搜索推荐条目
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const items: { type: 'country' | 'specialty' | 'company'; label: string; sub?: string; slug?: string }[] = []
    allCountries.forEach(c => {
      if (c.toLowerCase().includes(q)) items.push({ type: 'country', label: c })
    })
    allSpecialties.forEach(s => {
      if (s.toLowerCase().includes(q)) items.push({ type: 'specialty', label: s })
    })
    allCompanies.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q)) {
        items.push({ type: 'company', label: c.nameEn, sub: c.country, slug: c.slug })
      }
    })
    return items.slice(0, 10)
  }, [searchQuery, allCountries, allSpecialties])

  const bookedList = useMemo(() => allCompanies.filter(c => bookedSlugs.has(c.slug)), [allCompanies, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(c => !bookedSlugs.has(c.slug)), [filteredList, bookedSlugs])

  // 按国家分组（保持首次出现顺序）
  const visibleGroupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: WeddingTeamCompany[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: WeddingTeamCompany[] }>()
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

  // 页式"查看更多"
  const groupedWithExpansion = useMemo(() => {
    return visibleGroupedByCountry.map(group => {
      const pages = countryPages[group.country] || 1
      const limit = isNarrow
        ? (pages === 1 ? NARROW_LIMIT : NARROW_LIMIT + (pages - 1) * NARROW_MORE)
        : pages * WIDE_LIMIT
      const visibleItems = group.items.slice(0, limit)
      return { ...group, visibleItems, hasMore: group.items.length > limit, hiddenCount: Math.max(0, group.items.length - limit) }
    })
  }, [visibleGroupedByCountry, countryPages, isNarrow])

  const visibleGroups = useMemo(() => {
    return groupedWithExpansion.slice(0, visibleGroupCount)
  }, [groupedWithExpansion, visibleGroupCount])

  const hasMoreGroups = visibleGroupCount < groupedWithExpansion.length

  const loadMoreCountry = (country: string) => {
    setCountryPages(prev => {
      const next = { ...prev, [country]: (prev[country] || 1) + 1 }
      sessionStorage.setItem('team_country_pages', JSON.stringify(next))
      return next
    })
  }

  // 筛选/排序变化时重置（跳过首次挂载）并滚回顶部
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setCountryPages({})
    sessionStorage.removeItem('team_country_pages')
    setVisibleGroupCount(GROUPS_PER_PAGE)
    // 滚回顶部
    document.documentElement.scrollTop = 0
  }, [selectedCountries, selectedSpecialties, searchFilter, sortMode])

  // 筛选/排序状态变化时同步写入模块级缓存
  useEffect(() => { _cachedSelectedCountries = Array.from(selectedCountries) }, [selectedCountries])
  useEffect(() => { _cachedSelectedSpecialties = Array.from(selectedSpecialties) }, [selectedSpecialties])
  useEffect(() => { _cachedSearchFilter = searchFilter }, [searchFilter])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

  const totalFilters = selectedCountries.size + selectedSpecialties.size + (searchFilter ? 1 : 0)

  const toggleCountry = (c: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties(prev => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  const clearAllFilters = () => {
    setSelectedCountries(new Set())
    setSelectedSpecialties(new Set())
    setSearchQuery('')
    setSearchFilter('')
  }

  const toggleGroup = (key: 'country' | 'specialty') => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandFilter = (key: 'country' | 'specialty') => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // 点击搜索推荐项
  const handleSuggestionClick = (item: { type: 'country' | 'specialty' | 'company'; label: string; slug?: string }) => {
    if (item.type === 'country') {
      setSelectedCountries(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'specialty') {
      setSelectedSpecialties(prev => { const n = new Set(prev); n.add(item.label); return n })
    } else if (item.type === 'company' && item.slug) {
      navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)
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
    setVisibleGroupCount(prev => prev + GROUPS_PER_PAGE)
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
      allSpecialties.forEach(s => {
        if (s.toLowerCase().includes(q)) {
          setSelectedSpecialties(prev => { const n = new Set(prev); n.add(s); return n })
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

  return (
    <div className="cd-page">
      <Seo
        title="婚礼团队"
        description="欧洲专业婚礼策划团队，提供一站式目的地婚礼服务，从场地甄选到全程执行。EuropeWedding 涵盖场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块。"
        keywords="婚礼团队, 婚礼策划, 欧洲婚礼策划, 目的地婚礼团队, 婚礼统筹"
        structuredData={allCompanies.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "婚礼策划团队",
          "numberOfItems": allCompanies.length,
          "itemListElement": allCompanies.slice(0, 20).map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": c.nameEn || c.name,
            "url": `https://europewedding.cn/wedding-team/${c.slug}`,
            "image": c.cover || undefined
          }))
        } : undefined}
      />
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
          <p className="cd-list-hero__sub">Wedding Planner Companies</p>
          <h1 className="cd-list-hero__title">婚礼团队</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allCompanies.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 家策划公司`
                : `共收录 ${allCompanies.length} 家专业婚礼策划公司`
              : '专业婚礼策划公司，为您打造完美婚礼'}
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
            placeholder="搜索公司名称、国家、服务特色…"
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
                  {item.type === 'country' ? '🌍' : item.type === 'specialty' ? '✨' : '💒'}
                </span>
                <div className="cd-search-dropdown__text">
                  <span className="cd-search-dropdown__label">{item.label}</span>
                  {item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}
                </div>
                <span className="cd-search-dropdown__tag">
                  {item.type === 'country' ? '国家' : item.type === 'specialty' ? '特色' : '公司'}
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
                const count = allCompanies.filter(co => co.country === c).length
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
                  let list = allCompanies
                  if (current.size > 0) list = list.filter(c => current.has(c.country))
                  if (selectedSpecialties.size > 0) list = list.filter(c => c.specialties.some(s => selectedSpecialties.has(s)))
                  return list.length
                })()} 家策划公司
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
              <div className="dest-sheet__section-title">国家 <span>Country</span></div>
              <div className="dest-sheet__chips">
                {allCountries.map(c => {
                  const count = allCompanies.filter(co => co.country === c).length
                  const active = selectedCountries.has(c)
                  return (
                    <button key={c} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleCountry(c)}>
                      {c} <em>({count})</em>
                    </button>
                  )
                })}
              </div>
              <div className="dest-sheet__section-title">服务特色 <span>Specialty</span></div>
              <div className="dest-sheet__chips">
                {allSpecialties.map(s => {
                  const count = allCompanies.filter(co => co.specialties.includes(s)).length
                  const active = selectedSpecialties.has(s)
                  return (
                    <button key={s} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleSpecialty(s)}>
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
                查看 {filteredList.length} 家策划公司
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
                      const count = allCompanies.filter(co => co.country === c).length
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
              {/* 服务特色 */}
              <div className="ph-filter-group">
                <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup('specialty')}>
                  <span className="ph-filter-group__label">服务特色</span>
                  <span className="ph-filter-group__en">Specialty</span>
                  {selectedSpecialties.size > 0 && <span className="ph-filter-group__badge">{selectedSpecialties.size}</span>}
                  <span className={`ph-filter-group__arrow${openGroups.specialty ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                </button>
                {openGroups.specialty && (
                  <ul className="ph-filter-group__list">
                    {allSpecialties.length > 0 ? (expandedFilters.specialty ? allSpecialties : allSpecialties.slice(0, MAX_VISIBLE_FILTERS)).map(s => {
                      const count = allCompanies.filter(co => co.specialties.includes(s)).length
                      return (
                        <li key={s} className={`ph-filter-group__item${selectedSpecialties.has(s) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggleSpecialty(s)}>
                          <span className="ph-filter-group__checkbox">{selectedSpecialties.has(s) ? '☑' : '☐'}</span>
                          <span className="ph-filter-group__name">{s}</span>
                          <span className="ph-filter-group__count">{count}</span>
                        </li>
                      )
                    }) : (
                      <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>
                    )}
                    {allSpecialties.length > MAX_VISIBLE_FILTERS && (
                      <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('specialty')}>
                        {expandedFilters.specialty ? '收起' : `更多 (${allSpecialties.length - MAX_VISIBLE_FILTERS})`}
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
          {(filteredList.length > 0 || bookedList.length > 0) ? (
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
                        <div key={item.slug} className="cd-card cd-card--booked" data-scroll-id={item.slug} onClick={() => navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)}>
                          <div className="cd-card__img-wrap">
                            <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                            <div className="cd-card__img-overlay" />
                            <span className="cd-card__booked-badge">
                              <svg className="cd-card__booked-wreath" viewBox="0 0 80 80" width="36" height="36"><path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><polyline points="30 42 38 50 52 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          </div>
                          <div className="cd-card__body">
                            <h3 className="cd-card__name">{item.name}</h3>
                            <p className="cd-card__tagline">{item.tagline}</p>
                            <div className="cd-card__styles">{item.specialties.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                            <div className="cd-card__footer">
                              <span className="cd-card__price">{item.price ? `${getCurrencySymbol(item.country)}${item.price.toLocaleString()}起` : '需咨询'}</span>
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
                    <div key={item.slug} className="cd-card" data-scroll-id={item.slug} onClick={() => navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)}>
                      <div className="cd-card__img-wrap">
                        <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                        <div className="cd-card__img-overlay" />
                      </div>
                      <div className="cd-card__body">
                        <h3 className="cd-card__name">{item.name}</h3>
                        <p className="cd-card__tagline">{item.tagline}</p>
                        <div className="cd-card__styles">{item.specialties.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                        <div className="cd-card__footer">
                          <span className="cd-card__price">{item.price ? `${getCurrencySymbol(item.country)}${item.price.toLocaleString()}起` : '需咨询'}</span>
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
                      onClick={() => navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)}
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
                          {item.specialties.slice(0, 3).map(s => (
                            <span key={s} className="cd-card__style-tag">{s}</span>
                          ))}
                        </div>
                        <div className="cd-card__footer">
                          <span className="cd-card__price">{item.price ? `${getCurrencySymbol(item.country)}${item.price.toLocaleString()}起` : '需咨询'}</span>
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
                            <span className="cd-country-header__count">{group.items.length} 家团队</span>
                          </div>
                          {group.visibleItems.map(item => (
                            <div
                              key={item.slug}
                              className="cd-card"
                              data-scroll-id={item.slug}
                              onClick={() => navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)}
                            >
                              <div className="cd-card__img-wrap">
                                <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                                <div className="cd-card__img-overlay" />
                              </div>
                              <div className="cd-card__body">
                                <h3 className="cd-card__name">{item.name}</h3>
                                <p className="cd-card__tagline">{item.tagline}</p>
                                <div className="cd-card__styles">
                                  {item.specialties.slice(0, 3).map(s => (
                                    <span key={s} className="cd-card__style-tag">{s}</span>
                                  ))}
                                </div>
                                <div className="cd-card__footer">
                                  <span className="cd-card__price">{item.price ? `${getCurrencySymbol(item.country)}${item.price.toLocaleString()}起` : '需咨询'}</span>
                                  <span className="cd-card__arrow">查看详情 →</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {group.hasMore && (
                            <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                              <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>
                                查看更多 ({group.hiddenCount})
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
                      <span className="cd-country-header__count">{group.items.length} 家团队</span>
                    </div>
                    {group.visibleItems.map(item => (
                      <div
                        key={item.slug}
                        className="cd-card"
                        onClick={() => navFromList('/wedding-team', `/wedding-team/${item.slug}`, navigate)}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                          <div className="cd-card__img-overlay" />
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.tagline}</p>
                          <div className="cd-card__styles">
                            {item.specialties.slice(0, 3).map(s => (
                              <span key={s} className="cd-card__style-tag">{s}</span>
                            ))}
                          </div>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">{item.price ? `${getCurrencySymbol(item.country)}${item.price.toLocaleString()}起` : '需咨询'}</span>
                            <span className="cd-card__arrow">查看详情 →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.hasMore && (
                      <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                        <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>
                          查看更多 ({group.hiddenCount})
                        </button>
                      </div>
                    )}

                  </Fragment>
                ))
              )}

              {hasMoreGroups && sortMode === 'default' && (
                <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                  <button className="cd-section-more__btn" onClick={handleLoadMoreGroups}>
                    加载更多策划公司…
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{totalFilters > 0 || searchFilter ? '当前筛选条件下无策划公司，请调整筛选' : '暂无婚礼策划公司数据'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
