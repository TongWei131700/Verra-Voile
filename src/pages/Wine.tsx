import { useEffect, useMemo, useState, useCallback, Fragment, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { navFromList } from '../utils/navigateFromList'
import { loadWishlistFromServer } from '../utils/wishlistSync'

export interface WineCharacteristic {
  label: string
  value: string
}

export interface WineReview {
  reviewer: string
  score: string
  text: string
  source?: string
  date?: string
}

export interface WineAboutImage {
  src: string
  label: string
}

export interface WineOverviewAttribute {
  icon: string
  label: string
  value: string
}

export interface WineOverviewItem {
  image: string
  title: string
  text: string
}

export interface WineOverview {
  description: string
  attribution?: string
  attributes: WineOverviewAttribute[]
  aboutItems: WineOverviewItem[]
}

export interface WineTags {
  region?: string
  type?: string
  vintage?: string
}

export interface WineBuyingOption {
  name: string
  spec: string
  price: number
  unit: string
  note?: string
}

export interface WineProduct {
  productId: string
  name: string
  nameEn: string
  description: string
  image: string
  price: number
  unit: string
  capacity: string
  highlight: string
  tagline?: string
  images?: string[]
  highlights?: string[]
  characteristics?: WineCharacteristic[]
  reviews?: WineReview[]
  aboutImages?: WineAboutImage[]
  overview?: WineOverview
  sourceUrl?: string
  tags?: WineTags
  buyingOptions?: WineBuyingOption[]
}

const API_BASE = import.meta.env.VITE_API_URL || ''

const HERO_IMG = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1600&h=900&fit=crop'

import Seo from '../components/Seo'

const MAX_VISIBLE_FILTERS = 5

// 筛选/排序缓存
let _cachedSelectedRegions: string[] | null = null
let _cachedSelectedTypes: string[] | null = null
let _cachedSelectedVintages: string[] | null = null
let _cachedSearchFilter: string | null = null
let _cachedSortMode: string | null = null
let _cachedTypeLimits: Record<string, number> | null = null

export default function Wine() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<WineProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilter, setSearchFilter] = useState(() => _cachedSearchFilter ?? '')

  // 分组展示（所有分组一次性展示，每组内按屏幕宽度控制初始显示数量）
  const INITIAL_PER_TYPE = useMemo(() => {
    if (typeof window === 'undefined') return 6
    const w = window.innerWidth
    if (w < 640) return 6
    if (w < 1000) return 8
    if (w < 1400) return 9
    return 10
  }, [])
  const LOAD_MORE_STEP = 20
  const [typeLimits, setTypeLimits] = useState<Record<string, number>>(_cachedTypeLimits ?? {})

  // 跟踪已加入意向单的商品
  const [bookedProducts, setBookedProducts] = useState<Set<string>>(() => {
    const booked = new Set<string>()
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('wine_wishlist_')) {
        const id = key.replace('wine_wishlist_', '')
        booked.add(id)
      }
    }
    return booked
  })
  // 意向单商品详细数据
  const [wishlistItems, setWishlistItems] = useState<any[]>(() => {
    const items: any[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('wine_wishlist_')) {
        try {
          items.push(JSON.parse(sessionStorage.getItem(key)!))
        } catch {}
      }
    }
    return items
  })

  // 筛选用 Set 支持多选，和其他模块一致
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(() => new Set(_cachedSelectedRegions ?? []))
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => new Set(_cachedSelectedTypes ?? []))
  const [selectedVintages, setSelectedVintages] = useState<Set<string>>(() => new Set(_cachedSelectedVintages ?? []))

  // 筛选组展开状态
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ region: true, type: true, vintage: true })
    const [sortOpen, setSortOpen] = useState(false)
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({})
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [sortMode, setSortMode] = useState<string>(() => _cachedSortMode ?? 'default')
  const [bottomSheet, setBottomSheet] = useState<'sort' | 'region' | 'filter' | null>(null)
  const [pendingRegions, setPendingRegions] = useState<Set<string> | null>(null)

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleExpandFilter = (key: string) => setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleRegion = useCallback((r: string) => {
    setSelectedRegions(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n })
  }, [])
  const toggleType = useCallback((t: string) => {
    setSelectedTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
  }, [])
  const toggleVintage = useCallback((v: string) => {
    setSelectedVintages(prev => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n })
  }, [])

  const totalFilters = selectedRegions.size + selectedTypes.size + selectedVintages.size + (searchFilter ? 1 : 0)

  const sortOptions = [
    { value: 'default', label: '默认排序' },
    { value: 'price-asc', label: '价格低→高' },
    { value: 'price-desc', label: '价格高→低' },
    { value: 'name', label: '名称 A→Z' },
  ]

  const clearAllFilters = () => {
    setSelectedRegions(new Set())
    setSelectedTypes(new Set())
    setSelectedVintages(new Set())
  }

  useEffect(() => {
    fetch('/api/products/wine')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.products) {
          setProducts(data.data.products)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 登录状态下从服务端恢复意向单数据到 sessionStorage，再刷新列表状态
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    loadWishlistFromServer().then(() => {
      const booked = new Set<string>()
      const items: any[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key?.startsWith('wine_wishlist_')) {
          const id = key.replace('wine_wishlist_', '')
          booked.add(id)
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
        if (key?.startsWith('wine_wishlist_')) {
          const id = key.replace('wine_wishlist_', '')
          booked.add(id)
          try { items.push(JSON.parse(sessionStorage.getItem(key)!)) } catch {}
        }
      }
      setBookedProducts(booked)
      setWishlistItems(items)
    }
    document.addEventListener('visibilitychange', refreshBooked)
    window.addEventListener('popstate', refreshBooked)
    return () => {
      document.removeEventListener('visibilitychange', refreshBooked)
      window.removeEventListener('popstate', refreshBooked)
    }
  }, [])

  // 提取所有筛选项
  const filterOptions = useMemo(() => {
    const regions = new Set<string>()
    const types = new Set<string>()
    const vintages = new Set<string>()
    products.forEach(p => {
      if (p.tags?.region) regions.add(p.tags.region)
      if (p.tags?.type) types.add(p.tags.type)
      if (p.tags?.vintage) vintages.add(p.tags.vintage)
    })
    return {
      regions: Array.from(regions).sort(),
      types: Array.from(types).sort(),
      vintages: Array.from(vintages).sort().reverse(),
    }
  }, [products])

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let list = products.filter(p => {
      if (q && !(p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || (p.tagline || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))) return false
      if (selectedRegions.size > 0 && !selectedRegions.has(p.tags?.region || '')) return false
      if (selectedTypes.size > 0 && !selectedTypes.has(p.tags?.type || '')) return false
      if (selectedVintages.size > 0 && !selectedVintages.has(p.tags?.vintage || '')) return false
      return true
    })
    if (sortMode === 'price-asc') {
      list = [...list].sort((a, b) => ((a.price ?? 100)) - ((b.price ?? 100)))
    } else if (sortMode === 'price-desc') {
      list = [...list].sort((a, b) => ((b.price ?? 100)) - ((a.price ?? 100)))
    } else if (sortMode === 'name') {
      list = [...list].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
    }
    return list
  }, [products, searchQuery, selectedRegions, selectedTypes, selectedVintages, sortMode])

  // 按类型分组（过滤已加入意向单的商品）
  const groupedByTypeRaw = useMemo(() => {
    const groups: { type: string; items: WineProduct[] }[] = []
    const map = new Map<string, WineProduct[]>()
    filteredList.forEach(p => {
      if (bookedProducts.has(p.productId)) return
      const t = p.tags?.type || '其他'
      if (!map.has(t)) {
        const arr: WineProduct[] = []
        map.set(t, arr)
        groups.push({ type: t, items: arr })
      }
      map.get(t)!.push(p)
    })
    return groups
  }, [filteredList, bookedProducts])

  const groupedByType = useMemo(() => {
    return groupedByTypeRaw.map(group => {
      const limit = typeLimits[group.type] ?? INITIAL_PER_TYPE
      return {
        ...group,
        visibleItems: group.items.slice(0, limit),
        hasMore: group.items.length > limit,
        hiddenCount: group.items.length - limit,
      }
    })
  }, [groupedByTypeRaw, typeLimits, INITIAL_PER_TYPE])

  const loadMoreType = (type: string) => {
    setTypeLimits(prev => {
      const next = { ...prev, [type]: (prev[type] ?? INITIAL_PER_TYPE) + LOAD_MORE_STEP }
      _cachedTypeLimits = next
      return next
    })
  }

  // 筛选/排序变化时重置展开状态（跳过首次挂载）并滚回顶部
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setTypeLimits({})
    _cachedTypeLimits = null
    document.documentElement.scrollTop = 0
  }, [searchQuery, selectedRegions, selectedTypes, selectedVintages, sortMode])

  // 筛选/排序状态同步到模块级缓存
  useEffect(() => { _cachedSelectedRegions = Array.from(selectedRegions) }, [selectedRegions])
  useEffect(() => { _cachedSelectedTypes = Array.from(selectedTypes) }, [selectedTypes])
  useEffect(() => { _cachedSelectedVintages = Array.from(selectedVintages) }, [selectedVintages])
  useEffect(() => { _cachedSearchFilter = searchQuery }, [searchQuery])
  useEffect(() => { _cachedSortMode = sortMode }, [sortMode])

  // 渲染筛选组（复用 ph-filter-group 样式）
  const renderFilterGroup = (
    key: string, label: string, en: string,
    items: string[], selected: Set<string>, toggle: (v: string) => void
  ) => {
    if (items.length === 0) return null
    const visible = expandedFilters[key] ? items : items.slice(0, MAX_VISIBLE_FILTERS)
    return (
      <div className="ph-filter-group">
        <button type="button" className="ph-filter-group__header" onClick={() => toggleGroup(key)}>
          <span className="ph-filter-group__label">{label}</span>
          <span className="ph-filter-group__en">{en}</span>
          {selected.size > 0 && <span className="ph-filter-group__badge">{selected.size}</span>}
          <span className={`ph-filter-group__arrow${openGroups[key] ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
        </button>
        {openGroups[key] && (
          <ul className="ph-filter-group__list">
            {visible.map(item => {
              const count = products.filter(p => {
                if (key === 'region') return p.tags?.region === item
                if (key === 'type') return p.tags?.type === item
                if (key === 'vintage') return p.tags?.vintage === item
                return false
              }).length
              return (
                <li key={item} className={`ph-filter-group__item${selected.has(item) ? ' ph-filter-group__item--checked' : ''}`} onClick={() => toggle(item)}>
                  <span className="ph-filter-group__checkbox">{selected.has(item) ? '☑' : '☐'}</span>
                  <span className="ph-filter-group__name">{item}</span>
                  <span className="ph-filter-group__count">{count}</span>
                </li>
              )
            })}
            {items.length > MAX_VISIBLE_FILTERS && (
              <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter(key)}>
                {expandedFilters[key] ? '收起' : `更多 (${items.length - MAX_VISIBLE_FILTERS})`}
              </li>
            )}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="cd-page">
      <Seo
        title="酒水宴席"
        description="精选欧洲各产区葡萄酒与香槟，为婚礼宴席提供专业酒水搭配方案。EuropeWedding 提供场地甄选、婚礼团队、花卉布置、礼服定制、摄影摄像、酒水宴席六大模块一站式服务。"
        keywords="婚礼酒水, 婚礼香槟, 欧洲婚礼用酒, 目的地婚礼宴席, 葡萄酒"
        structuredData={products.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "婚礼酒水",
          "numberOfItems": products.length,
          "itemListElement": products.slice(0, 20).map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": p.nameEn || p.name,
            "url": `https://europewedding.cn/wine/${p.productId}`,
            "image": p.image || undefined
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
          <p className="cd-list-hero__sub">Wine & Dining</p>
          <h1 className="cd-list-hero__title">酒水宴席</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {products.length > 0
              ? (totalFilters > 0 || sortMode !== 'default')
                ? `找到 ${filteredList.length} 项宴席服务`
                : `共收录 ${products.length} 项宴席服务`
              : '精选婚宴佳酿与米其林级飨宴'}
          </p>
        </div>
      </section>

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
            placeholder="搜索宴席服务名称、风格…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
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
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('region')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>产地</span>
          {selectedRegions.size > 0 && <span className="dest-bottom-bar__badge">{selectedRegions.size}</span>}
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

      {/* 产地快选 ActionSheet */}
      {bottomSheet === 'region' && (() => {
        const current = pendingRegions ?? selectedRegions
        return (
        <div className="dest-sheet-overlay" onClick={() => { setBottomSheet(null); setPendingRegions(null) }}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择产地</h4>
              <button type="button" className="dest-sheet__close" onClick={() => { setBottomSheet(null); setPendingRegions(null) }}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {filterOptions.regions.map(r => {
                const count = products.filter(p => p.tags?.region === r).length
                const active = current.has(r)
                return (
                  <button key={r} type="button" className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`} onClick={() => {
                    const base = pendingRegions ?? selectedRegions
                    const next = new Set(base)
                    next.has(r) ? next.delete(r) : next.add(r)
                    setPendingRegions(next)
                  }}>
                    <span>{r} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => {
                if (pendingRegions) setSelectedRegions(pendingRegions)
                setPendingRegions(null)
                setBottomSheet(null)
              }}>
                查看 {(() => {
                  let list = products
                  if (current.size > 0) list = list.filter(p => current.has(p.tags?.region || ''))
                  if (selectedTypes.size > 0) list = list.filter(p => selectedTypes.has(p.tags?.type || ''))
                  if (selectedVintages.size > 0) list = list.filter(p => selectedVintages.has(p.tags?.vintage || ''))
                  return list.length
                })()} 项宴席服务
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
              <div className="dest-sheet__section-title">产地 <span>Region</span></div>
              <div className="dest-sheet__chips">
                {filterOptions.regions.map(r => {
                  const count = products.filter(p => p.tags?.region === r).length
                  const active = selectedRegions.has(r)
                  return <button key={r} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleRegion(r)}>{r} <em>({count})</em></button>
                })}
              </div>
              <div className="dest-sheet__section-title">类型 <span>Type</span></div>
              <div className="dest-sheet__chips">
                {filterOptions.types.map(t => {
                  const count = products.filter(p => p.tags?.type === t).length
                  const active = selectedTypes.has(t)
                  return <button key={t} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleType(t)}>{t} <em>({count})</em></button>
                })}
              </div>
              <div className="dest-sheet__section-title">年份 <span>Vintage</span></div>
              <div className="dest-sheet__chips">
                {filterOptions.vintages.map(v => {
                  const count = products.filter(p => p.tags?.vintage === v).length
                  const active = selectedVintages.has(v)
                  return <button key={v} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleVintage(v)}>{v} <em>({count})</em></button>
                })}
              </div>
            </div>
            <div className="dest-sheet__footer">
              {totalFilters > 0 && <button type="button" className="dest-sheet__clear" onClick={clearAllFilters}>清除全部</button>}
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>查看 {filteredList.length} 项宴席服务</button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选 + 卡片布局 */}
      <div className="cd-filter-layout">
        {/* 左侧筛选栏 */}
        <aside className="ph-filter">
          <div className="ph-filter__body">
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
              {/* 产地 */}
              {renderFilterGroup('region', '产地', 'Region', filterOptions.regions, selectedRegions, toggleRegion)}
              {/* 类型 */}
              {renderFilterGroup('type', '类型', 'Type', filterOptions.types, selectedTypes, toggleType)}
              {/* 年份 */}
              {renderFilterGroup('vintage', '年份', 'Vintage', filterOptions.vintages, selectedVintages, toggleVintage)}
            </div>
          </div>
        </aside>

        {/* 右侧卡片列表 */}
        <div className="cd-list">
          {loading ? (
            <div className="cd-loading"><p>正在加载宴席服务…</p></div>
          ) : (
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
                        key={item.productId}
                        className="cd-card cd-card--booked"
                        data-scroll-id={item.productId}
                        onClick={() => navFromList('/wine', `/wine/${item.productId}`, navigate)}
                      >
                        <div className="cd-card__img-wrap">
                          <FallbackImage
                            src={item.image?.startsWith('/') ? `${API_BASE}${item.image}` : (item.image || '')}
                            alt={item.name}
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
                          <h3 className="cd-card__name">{item.name}</h3>
                          <p className="cd-card__tagline">{item.nameEn}</p>
                          <div className="cd-card__footer">
                            <span className="cd-card__price">{item.unit}{(item.totalPrice || item.basePrice || 0).toLocaleString()}</span>
                            <span className="cd-card__arrow">查看 →</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {sortMode !== 'default' ? (
                /* 排序模式：扁平列表 */
                filteredList.filter(p => !bookedProducts.has(p.productId)).map(item => (
                  <div key={item.productId} className="cd-card" data-scroll-id={item.productId} onClick={() => navFromList('/wine', `/wine/${item.productId}`, navigate)}>
                    <div className="cd-card__img-wrap">
                      <FallbackImage src={item.image} alt={item.name} className="cd-card__img" />
                      <div className="cd-card__img-overlay" />
                    </div>
                    <div className="cd-card__body">
                      <h3 className="cd-card__name">{item.name}</h3>
                      <p className="cd-card__tagline">{item.tagline || item.nameEn}</p>
                      {item.highlights && item.highlights.length > 0 && (
                        <div className="cd-card__styles">
                          {item.highlights.slice(0, 3).map(h => <span key={h} className="cd-card__style-tag">{h}</span>)}
                        </div>
                      )}
                      <div className="cd-card__footer">
                        <span className="cd-card__price">{item.price > 0 ? `£${item.price.toLocaleString()}起` : '需咨询'}</span>
                        <span className="cd-card__arrow">查看详情 →</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {groupedByType.map(group => (
                    <Fragment key={group.type}>
                      <div className="cd-section-label">
                        <span className="cd-section-label__icon">✦</span>
                        <span>{group.type}</span>
                        <span className="cd-section-label__count">{group.items.length}</span>
                      </div>
                      {group.visibleItems.map(item => (
                        <div key={item.productId} className="cd-card" data-scroll-id={item.productId} onClick={() => navFromList('/wine', `/wine/${item.productId}`, navigate)}>
                          <div className="cd-card__img-wrap">
                            <FallbackImage src={item.image} alt={item.name} className="cd-card__img" />
                            <div className="cd-card__img-overlay" />
                          </div>
                          <div className="cd-card__body">
                            <h3 className="cd-card__name">{item.name}</h3>
                            <p className="cd-card__tagline">{item.tagline || item.nameEn}</p>
                            {item.highlights && item.highlights.length > 0 && (
                              <div className="cd-card__styles">
                                {item.highlights.slice(0, 3).map(h => <span key={h} className="cd-card__style-tag">{h}</span>)}
                              </div>
                            )}
                            <div className="cd-card__footer">
                              <span className="cd-card__price">{item.price > 0 ? `£${item.price.toLocaleString()}起` : '需咨询'}</span>
                              <span className="cd-card__arrow">查看详情 →</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {group.hasMore && (
                        <div className="cd-section-more" style={{ gridColumn: '1 / -1' }}>
                          <button className="cd-section-more__btn" onClick={() => loadMoreType(group.type)}>
                            查看更多 ({group.hiddenCount})
                          </button>
                        </div>
                      )}
                    </Fragment>
                  ))}
                  <div className="cd-load-end">
                    <span>— 已展示全部 {filteredList.filter(p => !bookedProducts.has(p.productId)).length} 项服务 —</span>
                  </div>
                </>
              )}
              {filteredList.filter(p => !bookedProducts.has(p.productId)).length === 0 && wishlistItems.length === 0 && (
                <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
                  <span className="cd-filter__empty-icon">✦</span>
                  <p>{searchQuery ? '当前搜索条件下无宴席服务' : '暂无宴席服务'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
