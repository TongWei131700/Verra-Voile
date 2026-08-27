import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { loadWishlistFromServer } from '../utils/wishlistSync'
import { proxyImage } from '../utils/imageProxy'
import heroImg from '../assets/flowers-hero-bg.jpg'
import Seo from '../components/Seo'

const API_BASE = import.meta.env.VITE_API_URL || ''

function getCurrencySymbol(country: string) {
  return country === 'United Kingdom' ? '£' : '€'
}

// 列表项（与 API 返回字段对应）
interface FloristCompany {
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
  headshot?: string
  website: string
  specialties: string[]
  price?: number
}

// 将 API 返回的 snake_case 数据转为前端 camelCase
function mapApiItem(row: any): FloristCompany {
  let specialties: string[] = []
  try { specialties = typeof row.specialties === 'string' ? JSON.parse(row.specialties) : (row.specialties || []) } catch { /* ignore */ }
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
    cover: row.cover_image || '',
    headshot: row.headshot || '',
    website: row.website || '',
    specialties,
    price: row.price ?? undefined,
  }
}

const HERO_IMG = heroImg

// 模块级缓存：从详情返回列表页时复用
let _cachedCompanies: FloristCompany[] | null = null
// 筛选/排序缓存
let _cachedSelectedCountries: string[] | null = null
let _cachedSelectedSpecialties: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null
let _cachedCategoryLimits: Record<string, number> | null = null

// 从数据中动态提取去重后的选项列表
function extractUnique<T>(items: FloristCompany[], getter: (c: FloristCompany) => T | T[]): T[] {
  const set = new Set<T>()
  items.forEach(c => {
    const val = getter(c)
    if (Array.isArray(val)) val.forEach(v => set.add(v))
    else if (val !== undefined && val !== '') set.add(val)
  })
  return Array.from(set).sort()
}

export default function Flowers() {
  const navigate = useNavigate()
  const location = useLocation()
  const [allCompanies, setAllCompanies] = useState<FloristCompany[]>([])
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
    const [sortOpen, setSortOpen] = useState(false)
  const [expandedFilters, setExpandedFilters] = useState({ country: false, specialty: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'specialty' | 'filter' | null>(null)
  const [pendingSpecialties, setPendingSpecialties] = useState<Set<string> | null>(null)
  const ITEMS_PER_PAGE = 6
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [listLoading, setListLoading] = useState(false)

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
  const [sectionPages, setSectionPages] = useState<Record<string, number>>(() => {
    try { return JSON.parse(sessionStorage.getItem('flower_section_pages') || '{}') } catch { return {} }
  })

  // 从 API 加载数据
  useEffect(() => {
    setDataLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/products/crawled-florists?type=service`).then(r => r.json()),
      fetch(`${API_BASE}/api/products/crawled-florists?type=product`).then(r => r.json()),
    ]).then(([serviceRes, productRes]) => {
      const serviceCompanies = serviceRes.success && Array.isArray(serviceRes.data) ? serviceRes.data.map(mapApiItem) : []
      const productCompanies = productRes.success && Array.isArray(productRes.data) ? productRes.data.map(mapApiItem) : []
      setAllCompanies([...serviceCompanies, ...productCompanies])
    })
    .catch(err => console.error('加载花店列表失败:', err))
    .finally(() => setDataLoading(false))
  }, [])

  // 刷新已预定状态
  const refreshBooked = useCallback(() => {
    const items = getSelectedProducts().filter(i => i.categoryId === 'floral')
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

  // 按类型分组
  const serviceList = useMemo(() => filteredList.filter(c => !c.slug.includes('florajet')), [filteredList])
  const productList = useMemo(() => filteredList.filter(c => c.slug.includes('florajet')), [filteredList])

  // Florajet 商品列表（从 API 动态获取）
  const [florajetProducts, setFlorajetProducts] = useState<any[]>([])
  // 跟踪已加入意向单的商品
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(() => {
    const booked = new Set<string>()
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('flower_wishlist_')) {
        const slug = key.replace('flower_wishlist_', '')
        booked.add(slug)
      }
    }
    return booked
  })
  // 意向单商品详细数据
  const [wishlistItems, setWishlistItems] = useState<any[]>(() => {
    const items: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('flower_wishlist_')) {
        try {
          items.push(JSON.parse(sessionStorage.getItem(key)!))
        } catch {}
      }
    }
    return items
  })
  
  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-florists/florajet`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const products = res.data.fresh_flower_products || []
          const parsed = typeof products === 'string' ? JSON.parse(products) : products
          setFlorajetProducts(parsed)
        }
      })
      .catch(err => console.error('加载 Florajet 商品失败:', err))
  }, [])

  // 鲜花商品排序列表（不受服务筛选影响，仅受排序影响）
  const sortedFlorajetProducts = useMemo(() => {
    let list = [...florajetProducts]
    if (sortMode === 'price-asc') {
      list.sort((a, b) => ((a.price ?? 2000)) - ((b.price ?? 2000)))
    } else if (sortMode === 'price-desc') {
      list.sort((a, b) => ((b.price ?? 2000)) - ((a.price ?? 2000)))
    } else if (sortMode === 'name') {
      list.sort((a, b) => (a.name_cn || a.name || '').localeCompare(b.name_cn || b.name || ''))
    }
    return list
  }, [florajetProducts, sortMode])

  // 分类分组展示（所有分类一次性展示，每组内按屏幕宽度控制初始显示数量）
  const INITIAL_PER_CATEGORY = useMemo(() => {
    if (typeof window === 'undefined') return 6
    const w = window.innerWidth
    if (w < 640) return 6
    if (w < 1000) return 8
    if (w < 1400) return 9
    return 10
  }, [])
  const LOAD_MORE_STEP = 20
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(_cachedCategoryLimits ?? {})

  const loadMoreCategory = (category: string) => {
    setCategoryLimits(prev => {
      const next = { ...prev, [category]: (prev[category] ?? INITIAL_PER_CATEGORY) + LOAD_MORE_STEP }
      _cachedCategoryLimits = next
      return next
    })
  }

  // 三步 memo（与目的地 groupedWithExpansion / visibleGroups 一致）
  const otherProductList = useMemo(() => sortedFlorajetProducts.filter(p => !bookedProducts.has(p.slug)), [sortedFlorajetProducts, bookedProducts])

  const groupedByCategory = useMemo(() => {
    const groups: { category: string; items: typeof otherProductList }[] = []
    const map = new Map<string, { category: string; items: typeof otherProductList }>()
    otherProductList.forEach(p => {
      const cat = p.category || '其他'
      if (!map.has(cat)) {
        const group = { category: cat, items: [] as typeof otherProductList }
        map.set(cat, group)
        groups.push(group as any)
      }
      map.get(cat)!.items.push(p)
    })
    return groups
  }, [otherProductList])

  const categoryGroupsWithExpansion = useMemo(() => {
    return groupedByCategory.map(group => {
      const limit = categoryLimits[group.category] ?? INITIAL_PER_CATEGORY
      return {
        ...group,
        visibleItems: group.items.slice(0, limit),
        hasMore: group.items.length > limit,
        hiddenCount: group.items.length - limit,
      }
    })
  }, [groupedByCategory, categoryLimits, INITIAL_PER_CATEGORY])

  const visibleCategoryGroups = categoryGroupsWithExpansion

  // 登录状态下从服务端恢复意向单数据到 sessionStorage，再刷新列表状态
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    loadWishlistFromServer().then(() => {
      const booked = new Set<string>()
      const items: any[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('flower_wishlist_')) {
          const slug = key.replace('flower_wishlist_', '')
          booked.add(slug)
          try { items.push(JSON.parse(sessionStorage.getItem(key)!)) } catch {}
        }
      }
      setBookedProducts(booked)
      setWishlistItems(items)
    })
  }, [])

  // 监听页面可见性变化和浏览器返回，从详情页返回时刷新意向单状态
  useEffect(() => {
    const refreshBooked = () => {
      const booked = new Set<string>()
      const items: any[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('flower_wishlist_')) {
          const slug = key.replace('flower_wishlist_', '')
          booked.add(slug)
          try { items.push(JSON.parse(sessionStorage.getItem(key)!)) } catch {}
        }
      }
      setBookedProducts(booked)
      setWishlistItems(items)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshBooked()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('popstate', refreshBooked)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('popstate', refreshBooked)
    }
  }, [])

  // 路由变化时刷新意向单状态（从详情页 navigate 返回时触发）
  useEffect(() => {
    const booked = new Set<string>()
    const items: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('flower_wishlist_')) {
        const slug = key.replace('flower_wishlist_', '')
        booked.add(slug)
        try { items.push(JSON.parse(sessionStorage.getItem(key)!)) } catch {}
      }
    }
    setBookedProducts(booked)
    setWishlistItems(items)
  }, [location.pathname])

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

  // sectionPages 变化时持久化到 sessionStorage
  useEffect(() => {
    sessionStorage.setItem('flower_section_pages', JSON.stringify(sectionPages))
  }, [sectionPages])

  // 筛选/排序变化时重置分页并滚回顶部（跳过首次挂载，保留从详情返回时的缓存状态）
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setSectionPages({})
    sessionStorage.removeItem('flower_section_pages')
    setCategoryLimits({})
    _cachedCategoryLimits = null
    // 滚回顶部
    document.documentElement.scrollTop = 0
  }, [selectedCountries, selectedSpecialties, searchFilter, sortMode])

  // 筛选/排序状态变化时同步写入模块级缓存
  useEffect(() => { _cachedSelectedCountries = Array.from(selectedCountries) }, [selectedCountries])
  useEffect(() => { _cachedSelectedSpecialties = Array.from(selectedSpecialties) }, [selectedSpecialties])
  useEffect(() => { _cachedSearchFilter = searchFilter }, [searchFilter])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

  const loadMoreSection = (key: string) => {
    if (listLoading) return
    setListLoading(true)
    setTimeout(() => {
      setSectionPages(prev => ({ ...prev, [key]: (prev[key] || 1) + 1 }))
      setListLoading(false)
    }, 300)
  }

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
      navFromList('/flowers', `/flowers/${item.slug}`, navigate)
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
        title="婚礼花卉"
        description="欧洲顶级花艺师团队，为目的地婚礼打造精致花卉装饰，从手捧花到宴会花艺设计。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。"
        keywords="婚礼花卉, 婚礼花艺, 欧洲婚礼花束, 目的地婚礼花卉, 手捧花"
        structuredData={allCompanies.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "婚礼花艺工作室",
          "numberOfItems": allCompanies.length,
          "itemListElement": allCompanies.slice(0, 20).map((c, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": c.name,
            "url": `https://europewedding.cn/flowers/${c.slug}`,
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
          <p className="cd-list-hero__sub">Wedding Florals</p>
          <h1 className="cd-list-hero__title">花卉</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allCompanies.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 家花艺工作室`
                : `共收录 ${allCompanies.length} 家花艺工作室`
              : '奢华婚礼花艺设计，让自然主导设计'}
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
            placeholder="搜索花店名称、国家、服务特色…"
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
                  {item.type === 'country' ? '🌍' : item.type === 'specialty' ? '✨' : '💐'}
                </span>
                <div className="cd-search-dropdown__text">
                  <span className="cd-search-dropdown__label">{item.label}</span>
                  {item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}
                </div>
                <span className="cd-search-dropdown__tag">
                  {item.type === 'country' ? '国家' : item.type === 'specialty' ? '特色' : '花店'}
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
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('specialty')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>特色</span>
          {selectedSpecialties.size > 0 && <span className="dest-bottom-bar__badge">{selectedSpecialties.size}</span>}
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

      {/* 特色快选 ActionSheet */}
      {bottomSheet === 'specialty' && (() => {
        const current = pendingSpecialties ?? selectedSpecialties
        return (
        <div className="dest-sheet-overlay" onClick={() => { setBottomSheet(null); setPendingSpecialties(null) }}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择服务特色</h4>
              <button type="button" className="dest-sheet__close" onClick={() => { setBottomSheet(null); setPendingSpecialties(null) }}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {allSpecialties.map(s => {
                const count = allCompanies.filter(co => co.specialties.includes(s)).length
                const active = current.has(s)
                return (
                  <button
                    key={s}
                    type="button"
                    className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`}
                    onClick={() => {
                      const base = pendingSpecialties ?? selectedSpecialties
                      const next = new Set(base)
                      next.has(s) ? next.delete(s) : next.add(s)
                      setPendingSpecialties(next)
                    }}
                  >
                    <span>{s} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => {
                if (pendingSpecialties) setSelectedSpecialties(pendingSpecialties)
                setPendingSpecialties(null)
                setBottomSheet(null)
              }}>
                查看 {(() => {
                  let list = allCompanies
                  if (selectedCountries.size > 0) list = list.filter(c => selectedCountries.has(c.country))
                  if (current.size > 0) list = list.filter(c => c.specialties.some(s => current.has(s)))
                  return list.length
                })()} 家花艺工作室
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
                查看 {filteredList.length} 家花艺工作室
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
          {filteredList.length > 0 ? (
            <>
              {/* 意向单栏目 */}
              {wishlistItems.length > 0 && (
                <>
                  <div className="cd-section-label">
                    <span className="cd-section-label__icon">♡</span>
                    <span>我的意向单</span>
                    <span className="cd-section-label__count">{wishlistItems.length}</span>
                  </div>
                  <div className="cd-wishlist-grid">
                    {wishlistItems.map((item) => (
                      <div
                        key={item.slug}
                        className="cd-card cd-card--booked"
                        data-scroll-id={item.slug}
                        onClick={() => navFromList('/flowers', item.type === 'service' ? `/flowers/${item.slug}` : `/flowers/product/${item.slug}`, navigate)}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage
                            src={item.image?.startsWith('/') ? `${API_BASE}${item.image}` : (item.image?.startsWith('http') ? item.image : `${API_BASE}${item.image}`)}
                            alt={item.nameCn}
                            className="cd-card__img"
                          />
                          <div className="cd-card__img-overlay" />
                          <div className="cd-card__booked-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.nameCn}</h3>
                          <p className="cd-card__tagline">{item.name}</p>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">
                              {item.type === 'service' 
                                ? (item.price ? `£${item.price.toLocaleString()}起` : '需咨询')
                                : `€${(item.totalPrice || 0).toFixed(2)}`
                              }
                            </span>
                            <span className="cd-card__arrow">查看 →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Section 1: 鲜花商品（排序时切换扁平列表，与目的地一致） */}
              {sortMode !== 'default' ? (
                /* 排序模式：扁平列表，无分类分组 */
                otherProductList.map((product, idx) => (
                  <div
                    key={product.slug}
                    className="cd-card"
                    data-scroll-id={product.slug}
                    onClick={() => navFromList('/flowers', `/flowers/product/${product.slug}`, navigate)}
                  >
                    <div className="cd-card__img-wrap">
                      <FallbackImage
                        src={product.image?.startsWith('/') ? `${API_BASE}${product.image}` : (product.image || '')}
                        alt={product.name_cn || product.name}
                        className="cd-card__img"
                      />
                      <div className="cd-card__img-overlay" />
                      <span className="cd-card__country">法国</span>
                    </div>
                    <div className="cd-card__body">
                      <h3 className="cd-card__name">{product.name_cn || product.name}</h3>
                      <p className="cd-card__tagline">{product.name}</p>
                      <div className="cd-card__footer">
                        <span className="cd-card__price">€{product.price}{product.price_from ? '起' : ''}</span>
                        <span className="cd-card__arrow">查看详情 →</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* 默认模式：按分类分组展示 */
                <>
                  {visibleCategoryGroups.map(group => (
                    <div key={group.category} style={{ display: 'contents' }}>
                      <div className="cd-section-label" key={`label-${group.category}`}>
                        <span className="cd-section-label__icon">✦</span>
                        <span>{group.category}</span>
                        <span className="cd-section-label__count">{group.items.length}</span>
                      </div>
                      {group.visibleItems.map((product, idx) => (
                        <div
                          key={`${group.category}-${idx}`}
                          className="cd-card"
                          data-scroll-id={product.slug}
                          onClick={() => navFromList('/flowers', `/flowers/product/${product.slug}`, navigate)}
                        >
                          <div className="cd-card__img-wrap">
                            <FallbackImage
                              src={product.image?.startsWith('/') ? `${API_BASE}${product.image}` : (product.image || '')}
                              alt={product.name_cn || product.name}
                              className="cd-card__img"
                            />
                            <div className="cd-card__img-overlay" />
                            <span className="cd-card__country">法国</span>
                          </div>
                          <div className="cd-card__body">
                            <h3 className="cd-card__name">{product.name_cn || product.name}</h3>
                            <p className="cd-card__tagline">{product.name}</p>
                            <div className="cd-card__footer">
                              <span className="cd-card__price">€{product.price}{product.price_from ? '起' : ''}</span>
                              <span className="cd-card__arrow">查看详情 →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {group.hasMore && (
                        <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                          <button className="cd-section-more__btn" onClick={() => loadMoreCategory(group.category)}>
                            加载更多 ({group.hiddenCount})
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                </>
              )}

              {/* Section 2: 花艺服务团队 - 过滤已加入意向单的商品 */}
              {(() => {
                const allServices = serviceList.filter(item => !bookedProducts.has(item.slug))
                const pages = sectionPages['service'] || 1
                const limit = isNarrow
                  ? (pages === 1 ? NARROW_LIMIT : NARROW_LIMIT + (pages - 1) * NARROW_MORE)
                  : pages * WIDE_LIMIT
                const visibleServices = allServices.slice(0, limit)
                const hiddenCount = Math.max(0, allServices.length - limit)
                const hasMore = allServices.length > limit
                return visibleServices.length > 0 ? (
                <>
                  <div className="cd-section-label">
                    <span className="cd-section-label__icon">✦</span>
                    <span>花艺服务团队</span>
                    <span className="cd-section-label__count">{allServices.length}</span>
                  </div>
                  {visibleServices.map(item => (
                    <div
                      key={item.slug}
                      className="cd-card"
                      data-scroll-id={item.slug}
                      onClick={() => navFromList('/flowers', `/flowers/${item.slug}`, navigate)}
                    >
                      <div className="cd-card__img-wrap">
                        <FallbackImage src={proxyImage(item.cover)} alt={item.nameEn} className="cd-card__img" />
                        <div className="cd-card__img-overlay" />
                        <span className="cd-card__country">{item.country}</span>
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
                  {hasMore && (
                    <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                      <button className="cd-section-more__btn" onClick={() => loadMoreSection('service')}>查看更多 ({hiddenCount})</button>
                    </div>
                  )}
                </>
                ) : null
              })()}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{totalFilters > 0 || searchFilter ? '当前筛选条件下无花艺工作室，请调整筛选' : '暂无花艺工作室数据'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
