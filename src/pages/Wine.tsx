import { useEffect, useMemo, useState, useCallback, Fragment, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { navFromList } from '../utils/navigateFromList'

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

const MAX_VISIBLE_FILTERS = 5
const WIDE_LIMIT = 10   // 宽屏每个模块最多展示
const NARROW_LIMIT = 3  // 窄屏每个模块最多展示
const NARROW_MORE = 10  // 窄屏点击更多后追加

export default function Wine() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<WineProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth <= 900)

  // 每个分组的展开页数（从 sessionStorage 恢复）
  const [typePages, setTypePages] = useState<Record<string, number>>(() => {
    try { return JSON.parse(sessionStorage.getItem('wine_type_pages') || '{}') } catch { return {} }
  })

  // 监听窗口宽度变化
  useEffect(() => {
    const fn = () => setIsNarrow(window.innerWidth <= 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  // typePages 变化时持久化到 sessionStorage
  useEffect(() => {
    sessionStorage.setItem('wine_type_pages', JSON.stringify(typePages))
  }, [typePages])

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
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedVintages, setSelectedVintages] = useState<Set<string>>(new Set())

  // 筛选组展开状态
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ region: true, type: true, vintage: true })
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({})
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

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

  const totalFilters = selectedRegions.size + selectedTypes.size + selectedVintages.size

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
    return products.filter(p => {
      if (q && !(
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.tagline || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )) return false
      if (selectedRegions.size > 0 && !selectedRegions.has(p.tags?.region || '')) return false
      if (selectedTypes.size > 0 && !selectedTypes.has(p.tags?.type || '')) return false
      if (selectedVintages.size > 0 && !selectedVintages.has(p.tags?.vintage || '')) return false
      return true
    })
  }, [products, searchQuery, selectedRegions, selectedTypes, selectedVintages])

  // 按类型分组（过滤已加入意向单的商品）+ 可见性控制
  const groupedByType = useMemo(() => {
    const groups: { type: string; items: WineProduct[]; visibleItems: WineProduct[]; hasMore: boolean; hiddenCount: number }[] = []
    const map = new Map<string, WineProduct[]>()
    filteredList.forEach(p => {
      if (bookedProducts.has(p.productId)) return
      const t = p.tags?.type || '其他'
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(p)
    })
    map.forEach((items, type) => {
      const pages = typePages[type] || 1
      const limit = isNarrow
        ? (pages === 1 ? NARROW_LIMIT : NARROW_LIMIT + (pages - 1) * NARROW_MORE)
        : pages * WIDE_LIMIT
      const visibleItems = items.slice(0, limit)
      const hasMore = items.length > limit
      const hiddenCount = Math.max(0, items.length - limit)
      groups.push({ type, items, visibleItems, hasMore, hiddenCount })
    })
    return groups
  }, [filteredList, bookedProducts, typePages, isNarrow])

  const loadMoreType = (type: string) => {
    setTypePages(prev => ({ ...prev, [type]: (prev[type] || 1) + 1 }))
  }

  // 筛选变化时重置展开状态（跳过首次挂载，避免覆盖 sessionStorage 恢复值）
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setTypePages({})
    sessionStorage.removeItem('wine_type_pages')
  }, [searchQuery, selectedRegions, selectedTypes, selectedVintages])

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
            {products.length > 0 ? `共收录 ${products.length} 项宴席服务` : '精选婚宴佳酿与米其林级飨宴'}
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

      {/* 移动端筛选栏 */}
      <div className="ph-mobile-filter-bar">
        <span className="ph-mobile-filter-bar__count">
          共 <strong>{filteredList.length}</strong> 项宴席服务
        </span>
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
                {renderFilterGroup('region', '产地', 'Region', filterOptions.regions, selectedRegions, toggleRegion)}
                {renderFilterGroup('type', '类型', 'Type', filterOptions.types, selectedTypes, toggleType)}
                {renderFilterGroup('vintage', '年份', 'Vintage', filterOptions.vintages, selectedVintages, toggleVintage)}
              </div>
            </div>
            <div className="ph-drawer__footer">
              {totalFilters > 0 && (
                <button className="ph-drawer__clear" onClick={clearAllFilters}>清除全部</button>
              )}
              <button className="ph-drawer__confirm" onClick={() => setFilterDrawerOpen(false)}>
                查看 {filteredList.length} 项宴席服务
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选 + 卡片布局 */}
      <div className="cd-filter-layout">
        {/* 左侧筛选栏 */}
        <aside className="ph-filter">
          <div className="ph-filter__body">
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
                          {item.options && (
                            <p className="cd-card__desc" style={{ fontSize: '0.78rem', color: '#888' }}>
                              {Object.values(item.options).map((o: any) => `${o.name} ×${o.qty}`).join('、')}
                            </p>
                          )}
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

              {groupedByType.map(group => (
                <Fragment key={group.type}>
                  <div className="cd-section-label">
                    <span className="cd-section-label__icon">✦</span>
                    <span>{group.type}</span>
                    <span className="cd-section-label__count">{group.items.length}</span>
                  </div>
                  {group.visibleItems.map(item => (
                    <div key={item.productId} className="cd-card" onClick={() => navFromList('/wine', `/wine/${item.productId}`, navigate)}>
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
