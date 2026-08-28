import { useMemo, useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { getSelectedProducts } from '../utils/selectedProducts'
import { proxyImage } from '../utils/imageProxy'
import heroImg from '../assets/mariah-krafft-ayc1G5wV3aA-unsplash.jpg'
import Seo from '../components/Seo'

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
// 筛选/排序缓存：返回列表页时恢复用户之前的筛选状态
let _cachedSelectedCountries: string[] | null = null
let _cachedSelectedStyles: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null
let _cachedCountryLimits: Record<string, number> | null = null

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

// 国家英文名 → 中文名映射
const COUNTRY_CN: Record<string, string> = {
  'Italy': '意大利', 'Greece': '希腊', 'France': '法国', 'Spain': '西班牙',
  'United Kingdom': '英国', 'Portugal': '葡萄牙', 'Norway': '挪威',
  'Iceland': '冰岛', 'Austria': '奥地利', 'Germany': '德国',
  'Switzerland': '瑞士', 'Belgium': '比利时', 'Netherlands': '荷兰',
  'Turkey': '土耳其', 'Croatia': '克罗地亚', 'Czech Republic': '捷克',
  'Denmark': '丹麦', 'Sweden': '瑞典', 'Finland': '芬兰', 'Ireland': '爱尔兰',
  'Poland': '波兰', 'Hungary': '匈牙利', 'Romania': '罗马尼亚',
  'Slovenia': '斯洛文尼亚', 'Morocco': '摩洛哥', 'USA': '美国',
}

// 国家 → URL slug 映射（用于 SEO 落地页）
const COUNTRY_SLUG_MAP: Record<string, string> = {
  '法国': 'france', '意大利': 'italy', '西班牙': 'spain', '英国': 'united-kingdom',
  '德国': 'germany', '希腊': 'greece', '葡萄牙': 'portugal', '奥地利': 'austria',
  '挪威': 'norway', '冰岛': 'iceland', '爱尔兰': 'ireland', '克罗地亚': 'croatia',
  '匈牙利': 'hungary', '瑞士': 'switzerland', '比利时': 'belgium', '荷兰': 'netherlands',
  '瑞典': 'sweden', '丹麦': 'denmark', '芬兰': 'finland', '捷克': 'czech',
  '波兰': 'poland', '斯洛文尼亚': 'slovenia',
}
const SLUG_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_SLUG_MAP).map(([k, v]) => [v, k])
)

// URL 国家参数是否已消费（防止从详情页返回时重复读取 URL）
let _urlCountryUsed = false

// 将 API 返回的 snake_case 数据转为前端 camelCase
function mapApiItem(row: any): PhotographerItem {
  let styles: string[] = []
  try { styles = typeof row.photo_styles === 'string' ? JSON.parse(row.photo_styles) : (row.photo_styles || []) } catch { /* ignore */ }
  const rawCountry = row.country || ''
  const country = COUNTRY_CN[rawCountry] || rawCountry
  return {
    slug: row.slug,
    name: row.name_cn || row.name,
    nameEn: row.name,
    country,
    countryEn: row.country_en || rawCountry,
    photoStyles: styles,
    tagline: row.tagline || '',
    cover: row.cover_image || '',
    price: row.price ?? undefined,
  }
}

export default function Photography() {
  const navigate = useNavigate()
  const location = useLocation()
  const [allProducts, setAllProducts] = useState<PhotographerItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const [searchFilter, setSearchFilter] = useState(() => _cachedSearchFilter ?? '')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filterBodyRef = useRef<HTMLDivElement>(null)
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => {
    // URL 路径 /photography/france 优先于缓存
    const pathParts = location.pathname.split('/').filter(Boolean)
    const urlSlug = pathParts.length > 1 && pathParts[0] === 'photography' ? pathParts[1] : null
    if (urlSlug && SLUG_TO_COUNTRY[urlSlug] && !_urlCountryUsed) {
      _urlCountryUsed = true
      return new Set([SLUG_TO_COUNTRY[urlSlug]])
    }
    return new Set(_cachedSelectedCountries ?? [])
  })
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(() => new Set(_cachedSelectedStyles ?? []))
  const [openGroups, setOpenGroups] = useState({ country: true, style: true })
    const [sortOpen, setSortOpen] = useState(false)
  const [expandedFilters, setExpandedFilters] = useState({ country: false, style: false })
  const MAX_VISIBLE_FILTERS = 6
  const [bookedSlugs, setBookedSlugs] = useState<Set<string>>(new Set())
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'country' | 'filter' | null>(null)
  const [pendingCountries, setPendingCountries] = useState<Set<string> | null>(null)
  // 分组展示（所有分组一次性展示，每组内按屏幕宽度控制初始显示数量）
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

  const sortOptions = [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格低→高' },
    { value: 'price-desc', label: '价格高→低' },
    { value: 'name', label: '名称 A→Z' },
  ]

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
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
    }
    return list
  }, [selectedCountries, selectedStyles, searchFilter, sortMode, allProducts])

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

  const bookedList = useMemo(() => allProducts.filter(p => bookedSlugs.has(p.slug)), [allProducts, bookedSlugs])
  const otherList = useMemo(() => filteredList.filter(p => !bookedSlugs.has(p.slug)), [filteredList, bookedSlugs])

  // 按国家分组（保持首次出现顺序）
  const groupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: PhotographerItem[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: PhotographerItem[] }>()
    otherList.forEach(item => {
      if (!map.has(item.country)) {
        const group = { country: item.country, countryEn: item.countryEn, items: [] as PhotographerItem[] }
        map.set(item.country, group)
        groups.push(group)
      }
      map.get(item.country)!.items.push(item)
    })
    return groups
  }, [otherList])

  const groupsWithExpansion = useMemo(() => {
    return groupedByCountry.map(group => {
      const limit = countryLimits[group.country] ?? INITIAL_PER_COUNTRY
      return {
        ...group,
        visibleItems: group.items.slice(0, limit),
        hasMore: group.items.length > limit,
        hiddenCount: group.items.length - limit,
      }
    })
  }, [groupedByCountry, countryLimits, INITIAL_PER_COUNTRY])

  const visibleGroups = groupsWithExpansion

  const loadMoreCountry = (country: string) => {
    setCountryLimits(prev => {
      const next = { ...prev, [country]: (prev[country] ?? INITIAL_PER_COUNTRY) + LOAD_MORE_STEP }
      _cachedCountryLimits = next
      return next
    })
  }

  // 筛选/排序变化时重置分页并滚回顶部（跳过首次挂载）
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setCountryLimits({})
    _cachedCountryLimits = null
    document.documentElement.scrollTop = 0
  }, [selectedCountries, selectedStyles, searchFilter, sortMode])

  // 筛选/排序状态变化时同步写入模块级缓存
  useEffect(() => { _cachedSelectedCountries = Array.from(selectedCountries) }, [selectedCountries])
  useEffect(() => { _cachedSelectedStyles = Array.from(selectedStyles) }, [selectedStyles])
  useEffect(() => { _cachedSearchFilter = searchFilter }, [searchFilter])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

  // 筛选变化时同步写入 URL（路径式 /photography/france）
  const _isInitialMount = useRef(true)
  useEffect(() => {
    if (_isInitialMount.current) { _isInitialMount.current = false; return }
    if (selectedCountries.size === 1) {
      const country = Array.from(selectedCountries)[0]
      const slug = COUNTRY_SLUG_MAP[country]
      if (slug && location.pathname !== `/photography/${slug}`) {
        navigate(`/photography/${slug}`, { replace: true })
      }
    } else if (location.pathname !== '/photography') {
      navigate('/photography', { replace: true })
    }
  }, [selectedCountries]) // eslint-disable-line react-hooks/exhaustive-deps

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
      navFromList('/photography', `/photography/${item.slug}`, navigate)
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
      <Seo
        title={selectedCountries.size === 1
          ? `${Array.from(selectedCountries)[0]}婚礼摄影 · 专业摄影师团队`
          : '婚礼摄影'}
        description={(() => {
          if (selectedCountries.size === 1) {
            const country = Array.from(selectedCountries)[0]
            const count = allProducts.filter(p => p.country === country).length
            return `精选${country}${count}位专业婚礼摄影师，提供婚礼跟拍、航拍、婚纱照等影像服务。EuropeWedding 在${country}为您安排资深摄影师，留下最美的婚礼回忆。`
          }
          return '欧洲专业婚礼摄影师团队，提供婚礼跟拍、航拍、婚纱照等全方位影像服务。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。'
        })()}
        keywords="婚礼摄影, 婚礼跟拍, 欧洲婚礼摄影, 目的地婚礼跟拍, 婚礼航拍"
        structuredData={allProducts.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "婚礼摄影师",
          "numberOfItems": allProducts.length,
          "itemListElement": allProducts.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.nameEn || p.name,
            "url": `https://europewedding.cn/photography/${p.slug}`,
            "image": p.cover || undefined
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
          <p className="cd-list-hero__sub">Wedding Photography</p>
          <h1 className="cd-list-hero__title">摄影</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allProducts.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 位摄影师`
                : `共收录 ${allProducts.length} 位严选摄影师`
              : '记录每一个珍贵瞬间'}
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
                const count = allProducts.filter(p => p.country === c).length
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
                  let list = allProducts
                  if (current.size > 0) list = list.filter(p => current.has(p.country))
                  if (selectedStyles.size > 0) list = list.filter(p => p.photoStyles.some(s => selectedStyles.has(s)))
                  return list.length
                })()} 位摄影师
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
                  const count = allProducts.filter(p => p.country === c).length
                  const active = selectedCountries.has(c)
                  return (
                    <button key={c} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleCountry(c)}>
                      {c} <em>({count})</em>
                    </button>
                  )
                })}
              </div>
              <div className="dest-sheet__section-title">摄影风格 <span>Style</span></div>
              <div className="dest-sheet__chips">
                {allStyles.map(s => {
                  const count = allProducts.filter(p => p.photoStyles.includes(s)).length
                  const active = selectedStyles.has(s)
                  return (
                    <button key={s} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleStyle(s)}>
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
                        <div key={item.slug} className="cd-card cd-card--booked" data-scroll-id={item.slug} onClick={() => navFromList('/photography', `/photography/${item.slug}`, navigate)}>
                          <div className="cd-card__img-wrap">
                            <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                            <div className="cd-card__img-overlay" />
                            <span className="cd-card__booked-badge">
                              <svg className="cd-card__booked-wreath" viewBox="0 0 80 80" width="36" height="36"><path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              <svg className="cd-card__booked-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          </div>
                          <div className="cd-card__body">
                            <h3 className="cd-card__name">{item.name}</h3>
                            <p className="cd-card__tagline">{item.tagline}</p>
                            <div className="cd-card__styles">{item.photoStyles.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                            <div className="cd-card__footer">
                              <span className="cd-card__price">€{item.price ?? 250}起</span>
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
                    <div key={item.slug} className="cd-card" data-scroll-id={item.slug} onClick={() => navFromList('/photography', `/photography/${item.slug}`, navigate)}>
                      <div className="cd-card__img-wrap">
                        <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                        <div className="cd-card__img-overlay" />
                      </div>
                      <div className="cd-card__body">
                        <h3 className="cd-card__name">{item.name}</h3>
                        <p className="cd-card__tagline">{item.tagline}</p>
                        <div className="cd-card__styles">{item.photoStyles.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                        <div className="cd-card__footer">
                          <span className="cd-card__price">€{item.price ?? 250}起</span>
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
                    <div key={item.slug} className="cd-card cd-card--booked" data-scroll-id={item.slug} onClick={() => navFromList('/photography', `/photography/${item.slug}`, navigate)}>
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
                        <div className="cd-card__styles">{item.photoStyles.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
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
                      {visibleGroups.map((group) => (
                        <Fragment key={group.country}>
                                                    <div className="cd-section-label">
                            <span className="cd-section-label__icon">✦</span>
                            <span>{group.country}</span>
                            <span className="cd-section-label__count">{group.items.length}</span>
                          </div>
                          {group.visibleItems.map(item => (
                            <div key={item.slug} className="cd-card" data-scroll-id={item.slug} onClick={() => navFromList('/photography', `/photography/${item.slug}`, navigate)}>
                              <div className="cd-card__img-wrap">
                                <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                                <div className="cd-card__img-overlay" />
                              </div>
                              <div className="cd-card__body">
                                <h3 className="cd-card__name">{item.name}</h3>
                                <p className="cd-card__tagline">{item.tagline}</p>
                                <div className="cd-card__styles">{item.photoStyles.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                                <div className="cd-card__footer">
                                  <span className="cd-card__price">€{item.price ?? 250}起</span>
                                  <span className="cd-card__arrow">查看详情 →</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {group.hasMore && (
                            <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                              <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>查看更多 ({group.hiddenCount})</button>
                            </div>
                          )}
                        </Fragment>
                      ))}
                    </>
                  )}
                </>
              ) : (
                /* 无已预定时，按国家分组展示 */
                visibleGroups.map((group) => (
                  <Fragment key={group.country}>
                                        <div className="cd-section-label">
                      <span className="cd-section-label__icon">✦</span>
                      <span>{group.country}</span>
                      <span className="cd-section-label__count">{group.items.length}</span>
                    </div>
                    {group.visibleItems.map(item => (
                      <div key={item.slug} className="cd-card" data-scroll-id={item.slug} onClick={() => navFromList('/photography', `/photography/${item.slug}`, navigate)}>
                        <div className="cd-card__img-wrap">
                          <FallbackImage src={proxyImage(item.cover)} alt={item.name} className="cd-card__img" />
                          <div className="cd-card__img-overlay" />
                        </div>
                        <div className="cd-card__body">
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.tagline}</p>
                          <div className="cd-card__styles">{item.photoStyles.slice(0, 3).map(s => <span key={s} className="cd-card__style-tag">{s}</span>)}</div>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">€{item.price ?? 250}起</span>
                            <span className="cd-card__arrow">查看详情 →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {group.hasMore && (
                      <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                        <button className="cd-section-more__btn" onClick={() => loadMoreCountry(group.country)}>查看更多 ({group.hiddenCount})</button>
                      </div>
                    )}
                  </Fragment>
                ))
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
