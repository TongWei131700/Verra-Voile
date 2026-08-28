import { useMemo, useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { navFromList } from '../utils/navigateFromList'
import BackButton from '../components/common/BackButton'
import FallbackImage from '../components/common/FallbackImage'
import Seo from '../components/Seo'
import coverTravelPhoto from '../assets/maxime-gilbert-B-dgq-DrmbU-unsplash.jpg'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 景点数据结构（与 API 返回字段对应，camelCase）
interface Attraction {
  slug: string
  name: string
  nameEn: string
  country: string
  countryEn: string
  location: string
  locationEn: string
  cover: string
  tagline: string
  tags: string[]
  price: number
}

// 将 API snake_case 数据转为前端格式
function mapApiItem(row: any): Attraction {
  let tags = row.tags || []
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags) } catch { tags = [] }
  }
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    country: row.country || '',
    countryEn: row.country_en || '',
    location: row.location || '',
    locationEn: row.location_en || '',
    cover: row.cover_image || '',
    tagline: row.tagline || '',
    tags,
    price: row.price || 0,
  }
}

// 国家 → URL slug 映射（31 个欧洲国家）
const COUNTRY_SLUG_MAP: Record<string, string> = {
  '法国': 'france', '意大利': 'italy', '西班牙': 'spain', '英国': 'united-kingdom',
  '德国': 'germany', '希腊': 'greece', '瑞士': 'switzerland', '葡萄牙': 'portugal',
  '奥地利': 'austria', '挪威': 'norway', '荷兰': 'netherlands', '冰岛': 'iceland',
  '爱尔兰': 'ireland', '瑞典': 'sweden', '丹麦': 'denmark', '比利时': 'belgium',
  '匈牙利': 'hungary', '克罗地亚': 'croatia', '芬兰': 'finland', '捷克': 'czech',
  '波兰': 'poland', '斯洛文尼亚': 'slovenia', '爱沙尼亚': 'estonia', '拉脱维亚': 'latvia',
  '立陶宛': 'lithuania', '斯洛伐克': 'slovakia', '卢森堡': 'luxembourg', '马耳他': 'malta',
  '列支敦士登': 'liechtenstein', '梵蒂冈': 'vatican', '摩纳哥': 'monaco',
}
const SLUG_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_SLUG_MAP).map(([k, v]) => [v, k])
)

// URL 国家参数是否已消费（防止从详情页返回时重复读取 URL）
let _urlCountryUsed = false

const MAX_VISIBLE_FILTERS = 6
const INITIAL_PER_COUNTRY_BASE = (() => {
  if (typeof window === 'undefined') return 6
  const w = window.innerWidth
  if (w < 640) return 6
  if (w < 1000) return 8
  if (w < 1400) return 9
  return 10
})()
const LOAD_MORE_STEP = 20

// 模块级缓存，返回列表页时保留状态
let _cachedCountryLimits: Record<string, number> | null = null

export default function TravelPhoto() {
  const location = useLocation()
  const navigate = useNavigate()
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchSubmitted, setSearchSubmitted] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // URL 国家参数优先（SEO 落地页），否则从缓存恢复
  const initialCountries = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    const urlSlug = pathParts.length > 1 && pathParts[0] === 'travel-photo' ? pathParts[1] : null
    if (urlSlug && SLUG_TO_COUNTRY[urlSlug] && !_urlCountryUsed) {
      _urlCountryUsed = true
      return new Set([SLUG_TO_COUNTRY[urlSlug]])
    }
    return new Set<string>()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => initialCountries)
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [openGroups, setOpenGroups] = useState({ country: true, tag: true })
  const [expandedFilters, setExpandedFilters] = useState({ country: false, tag: false })
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [bottomSheet, setBottomSheet] = useState<'country' | 'tag' | 'filter' | null>(null)
  const [countryLimits, setCountryLimits] = useState<Record<string, number>>(_cachedCountryLimits ?? {})

  // 从 API 获取数据
  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-travel-attractions`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAllAttractions(res.data.map(mapApiItem))
        }
      })
      .catch(err => console.error('加载旅拍景点列表失败:', err))
      .finally(() => setDataLoading(false))
  }, [])

  // 从数据中提取国家列表
  const allCountries = useMemo(() => {
    const set = new Set<string>()
    allAttractions.forEach(a => set.add(a.country))
    return Array.from(set)
  }, [allAttractions])

  // 从数据中提取所有标签
  const allTags = useMemo(() => {
    const set = new Set<string>()
    allAttractions.forEach(a => a.tags.forEach(t => set.add(t)))
    return Array.from(set)
  }, [allAttractions])

  // 搜索推荐
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const items: { type: 'country' | 'location' | 'attraction'; label: string; sub?: string; slug?: string }[] = []
    allCountries.forEach(c => {
      if (c.toLowerCase().includes(q)) items.push({ type: 'country', label: c })
    })
    allAttractions.forEach(a => {
      if (a.location.toLowerCase().includes(q) || a.locationEn.toLowerCase().includes(q)) {
        items.push({ type: 'location', label: a.location, sub: a.country })
      }
    })
    allAttractions.forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q)) {
        items.push({ type: 'attraction', label: a.name, sub: `${a.country} · ${a.location}`, slug: a.slug })
      }
    })
    // 去重
    const seen = new Set<string>()
    return items.filter(i => { const k = `${i.type}-${i.label}`; if (seen.has(k)) return false; seen.add(k); return true })
  }, [searchQuery, allCountries, allAttractions])

  // 筛选逻辑
  const filteredList = useMemo(() => {
    let list = allAttractions
    if (selectedCountries.size > 0) {
      list = list.filter(a => selectedCountries.has(a.country))
    }
    if (selectedTags.size > 0) {
      list = list.filter(a => a.tags.some(t => selectedTags.has(t)))
    }
    if (appliedSearchQuery.trim()) {
      const q = appliedSearchQuery.trim().toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.countryEn.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.locationEn.toLowerCase().includes(q)
      )
    }
    return list
  }, [allAttractions, selectedCountries, selectedTags, appliedSearchQuery])

  // 按国家分组
  const groupedByCountry = useMemo(() => {
    const groups: { country: string; countryEn: string; items: Attraction[] }[] = []
    const map = new Map<string, { country: string; countryEn: string; items: Attraction[] }>()
    filteredList.forEach(a => {
      if (!map.has(a.country)) {
        const group = { country: a.country, countryEn: a.countryEn, items: [] as Attraction[] }
        map.set(a.country, group)
        groups.push(group)
      }
      map.get(a.country)!.items.push(a)
    })
    return groups
  }, [filteredList])

  // 每组展开控制
  const groupsWithExpansion = useMemo(() => {
    return groupedByCountry.map(group => {
      const limit = countryLimits[group.country] ?? INITIAL_PER_COUNTRY_BASE
      return {
        ...group,
        visibleItems: group.items.slice(0, limit),
        hasMore: group.items.length > limit,
        hiddenCount: group.items.length - limit,
      }
    })
  }, [groupedByCountry, countryLimits])

  const loadMoreCountry = (country: string) => {
    setCountryLimits(prev => {
      const next = { ...prev, [country]: (prev[country] ?? INITIAL_PER_COUNTRY_BASE) + LOAD_MORE_STEP }
      _cachedCountryLimits = next
      return next
    })
  }

  const totalFilters = selectedCountries.size + selectedTags.size + (appliedSearchQuery.trim() ? 1 : 0)

  const toggleCountry = (c: string) => {
    setSelectedCountries(prev => {
      const next = new Set(prev)
      next.has(c) ? next.delete(c) : next.add(c)
      return next
    })
  }

  const toggleTag = (t: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const clearAllFilters = () => {
    setSelectedCountries(new Set())
    setSelectedTags(new Set())
    setSearchQuery('')
    setAppliedSearchQuery('')
  }

  const toggleGroup = (key: 'country' | 'tag') => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandFilter = (key: 'country' | 'tag') => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSuggestionClick = (item: { type: 'country' | 'location' | 'attraction'; label: string; slug?: string }) => {
    if (item.type === 'country') {
      setSelectedCountries(prev => { const n = new Set(prev); n.add(item.label); return n })
      setSearchQuery('')
      setAppliedSearchQuery('')
      setSearchSubmitted(false)
    } else if (item.type === 'location') {
      // 点击城市：用城市名作为搜索词过滤
      setSearchQuery(item.label)
      setAppliedSearchQuery(item.label)
      setSearchSubmitted(false)
      searchInputRef.current?.blur()
    } else if (item.type === 'attraction' && item.slug) {
      // 点击景点：直接跳转详情页
      setSearchQuery('')
      setAppliedSearchQuery('')
      setSearchSubmitted(false)
      navFromList('/travel-photo', `/travel-photo/${item.slug}`, navigate)
    }
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

  // 筛选变化时重置分页并滚回顶部（跳过首次挂载）
  const isFirstMount = useRef(true)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setCountryLimits({})
    _cachedCountryLimits = null
    window.scrollTo(0, 0)
  }, [selectedCountries, selectedTags, appliedSearchQuery])

  // 国家筛选变化时同步写入 URL（路径式 /travel-photo/france）
  const _isInitialMount = useRef(true)
  useEffect(() => {
    if (_isInitialMount.current) { _isInitialMount.current = false; return }
    if (selectedCountries.size === 1) {
      const country = Array.from(selectedCountries)[0]
      const slug = COUNTRY_SLUG_MAP[country]
      if (slug && location.pathname !== `/travel-photo/${slug}`) {
        navigate(`/travel-photo/${slug}`, { replace: true })
      }
    } else if (location.pathname !== '/travel-photo') {
      navigate('/travel-photo', { replace: true })
    }
  }, [selectedCountries]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Seo
        title={selectedCountries.size === 1
          ? `${Array.from(selectedCountries)[0]}旅拍 · 热门景点婚礼拍摄`
          : '欧洲旅拍 · 热门景点婚礼拍摄'}
        description={(() => {
          if (selectedCountries.size === 1) {
            const country = Array.from(selectedCountries)[0]
            const count = allAttractions.filter(a => a.country === country).length
            return `精选${country}${count}处旅拍景点，提供专业婚礼拍摄、旅拍摄影服务。EuropeWedding 在${country}热门城市为您安排资深摄影师，留下最美的旅拍回忆。`
          }
          const countries = Array.from(new Set(allAttractions.map(a => a.country).filter(Boolean)))
          const countryList = countries.join('、')
          return `EuropeWedding 欧洲旅拍服务，覆盖${countryList || '欧洲多国'}等热门目的地，在${allAttractions.length}处著名景点提供专业婚礼拍摄、旅拍摄影服务，留下最美的欧洲旅拍回忆。`
        })()}
        keywords={(() => {
          if (selectedCountries.size === 1) {
            const country = Array.from(selectedCountries)[0]
            return `${country}旅拍, ${country}婚礼拍摄, ${country}旅拍摄影, ${country}婚礼跟拍, 欧洲旅拍, 海外旅拍`
          }
          const base = ['欧洲旅拍', '婚礼拍摄', '旅拍摄影', '海外旅拍', '欧洲婚礼摄影']
          const countries = Array.from(new Set(allAttractions.map(a => a.country).filter(Boolean)))
          countries.forEach(c => {
            base.push(`${c}旅拍`, `${c}婚礼拍摄`, `${c}旅拍摄影`)
          })
          return base.join(', ')
        })()}
        structuredData={allAttractions.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": selectedCountries.size === 1 ? `${Array.from(selectedCountries)[0]}旅拍景点` : "欧洲旅拍景点",
          "numberOfItems": filteredList.length,
          "itemListElement": filteredList.slice(0, 20).map((a, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
              "@type": "TouristAttraction",
              "name": a.name,
              "url": `https://europewedding.cn/travel-photo/${a.slug}`,
              "image": a.cover ? `https://europewedding.cn${a.cover}` : undefined,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": a.location,
                "addressRegion": a.country
              },
              "offers": {
                "@type": "Offer",
                "price": a.price || 0,
                "priceCurrency": "EUR",
                "availability": "https://schema.org/InStock"
              }
            }
          }))
        } : undefined}
      />

      {/* Hero */}
      <section className="cd-list-hero">
        <div
          className="cd-list-hero__bg"
          style={{
            backgroundImage: `url(${coverTravelPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
          }}
        />
        <div className="cd-list-hero__overlay" />
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Travel Photography</p>
          <h1 className="cd-list-hero__title">欧洲旅拍</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {dataLoading ? '加载中…' :
              filteredList.length > 0
                ? (totalFilters > 0 ? `找到 ${filteredList.length} 处景点` : `共收录 ${allAttractions.length} 处热门景点`)
                : '在最美的地方，留下最美的回忆'}
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
            placeholder="搜索景点、国家、城市…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => { setSearchQuery(''); setAppliedSearchQuery(''); setSearchSubmitted(false) }}>✕</button>
          )}
        </div>
        {searchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
          <div className="cd-search-dropdown">
            {searchSuggestions.map((item, i) => (
              <div key={`${item.type}-${i}`} className="cd-search-dropdown__item" onClick={() => handleSuggestionClick(item)}>
                <span className={`cd-search-dropdown__icon cd-search-dropdown__icon--${item.type}`}>
                  {item.type === 'country' ? '🌍' : item.type === 'location' ? '📍' : ''}
                </span>
                <div className="cd-search-dropdown__text">
                  <span className="cd-search-dropdown__label">{item.label}</span>
                  {item.sub && <span className="cd-search-dropdown__sub">{item.sub}</span>}
                </div>
                <span className="cd-search-dropdown__tag">
                  {item.type === 'country' ? '国家' : item.type === 'location' ? '城市' : '景点'}
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
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('country')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span>国家</span>
          {selectedCountries.size > 0 && <span className="dest-bottom-bar__badge">{selectedCountries.size}</span>}
        </button>
        <button type="button" className="dest-bottom-bar__btn" onClick={() => setBottomSheet('tag')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          <span>标签</span>
          {selectedTags.size > 0 && <span className="dest-bottom-bar__badge">{selectedTags.size}</span>}
        </button>
      </div>

      {/* 国家 ActionSheet */}
      {bottomSheet === 'country' && (
        <div className="dest-sheet-overlay" onClick={() => setBottomSheet(null)}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择国家</h4>
              <button type="button" className="dest-sheet__close" onClick={() => setBottomSheet(null)}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {allCountries.map(c => {
                const count = allAttractions.filter(a => a.country === c).length
                const active = selectedCountries.has(c)
                return (
                  <button
                    key={c}
                    type="button"
                    className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`}
                    onClick={() => toggleCountry(c)}
                  >
                    <span>{c} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>
                查看 {filteredList.length} 处景点
              </button>
            </div>
          </div>
        </div>
      )}

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
                  const active = selectedCountries.has(c)
                  return (
                    <button key={c} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleCountry(c)}>
                      {c} <em>({allAttractions.filter(a => a.country === c).length})</em>
                    </button>
                  )
                })}
              </div>
              <div className="dest-sheet__section-title" style={{ marginTop: 16 }}>标签 <span>Tags</span></div>
              <div className="dest-sheet__chips">
                {allTags.map(t => {
                  const active = selectedTags.has(t)
                  return (
                    <button key={t} type="button" className={`dest-sheet__chip${active ? ' dest-sheet__chip--active' : ''}`} onClick={() => toggleTag(t)}>
                      {t} <em>({allAttractions.filter(a => a.tags.includes(t)).length})</em>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="dest-sheet__footer">
              {totalFilters > 0 && (
                <button type="button" className="dest-sheet__clear" onClick={clearAllFilters}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>清除全部</button>
              )}
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>
                查看 {filteredList.length} 处景点
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标签 ActionSheet */}
      {bottomSheet === 'tag' && (
        <div className="dest-sheet-overlay" onClick={() => setBottomSheet(null)}>
          <div className="dest-sheet dest-sheet--tall" onClick={e => e.stopPropagation()}>
            <div className="dest-sheet__header">
              <h4>选择标签</h4>
              <button type="button" className="dest-sheet__close" onClick={() => setBottomSheet(null)}>✕</button>
            </div>
            <div className="dest-sheet__body">
              {allTags.map(t => {
                const count = allAttractions.filter(a => a.tags.includes(t)).length
                const active = selectedTags.has(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className={`dest-sheet__option${active ? ' dest-sheet__option--active' : ''}`}
                    onClick={() => toggleTag(t)}
                  >
                    <span>{t} <em>({count})</em></span>
                    <span className="dest-sheet__check">{active ? '✓' : ''}</span>
                  </button>
                )
              })}
            </div>
            <div className="dest-sheet__footer">
              <button type="button" className="dest-sheet__confirm" onClick={() => setBottomSheet(null)}>
                查看 {filteredList.length} 处景点
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
                      const count = allAttractions.filter(a => a.country === c).length
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
              {/* 标签筛选组 */}
              <div className="ph-filter-group">
                <button
                  type="button"
                  className="ph-filter-group__header"
                  onClick={() => toggleGroup('tag')}
                >
                  <span className="ph-filter-group__label">标签</span>
                  <span className="ph-filter-group__en">Tags</span>
                  {selectedTags.size > 0 && (
                    <span className="ph-filter-group__badge">{selectedTags.size}</span>
                  )}
                  <span className={`ph-filter-group__arrow${openGroups.tag ? ' ph-filter-group__arrow--open' : ''}`}>▾</span>
                </button>
                {openGroups.tag && (
                  <ul className="ph-filter-group__list">
                    {allTags.length > 0 ? (expandedFilters.tag ? allTags : allTags.slice(0, MAX_VISIBLE_FILTERS)).map(t => {
                      const count = allAttractions.filter(a => a.tags.includes(t)).length
                      return (
                        <li
                          key={t}
                          className={`ph-filter-group__item${selectedTags.has(t) ? ' ph-filter-group__item--checked' : ''}`}
                          onClick={() => toggleTag(t)}
                        >
                          <span className="ph-filter-group__checkbox">
                            {selectedTags.has(t) ? '☑' : '☐'}
                          </span>
                          <span className="ph-filter-group__name">{t}</span>
                          <span className="ph-filter-group__count">{count}</span>
                        </li>
                      )
                    }) : (
                      <li className="ph-filter-group__item ph-filter-group__item--empty">暂无数据</li>
                    )}
                    {allTags.length > MAX_VISIBLE_FILTERS && (
                      <li className="ph-filter-group__item ph-filter-group__item--more" onClick={() => toggleExpandFilter('tag')}>
                        {expandedFilters.tag ? '收起' : `更多 (${allTags.length - MAX_VISIBLE_FILTERS})`}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            {totalFilters > 0 && (
              <button className="ph-filter__clear" onClick={clearAllFilters}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>清除全部筛选</button>
            )}
          </div>
        </aside>

        {/* 右侧卡片区 */}
        <div className="cd-list tp-list">
          {dataLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, gi) => (
                <Fragment key={`sk-g-${gi}`}>
                  <div className="cd-section-label" style={{ opacity: 0.5 }}>
                    <span className="cd-section-label__icon">✦</span>
                    <span className="tp-skel__line tp-skel__line--country" />
                  </div>
                  {Array.from({ length: gi === 0 ? 6 : gi === 1 ? 4 : 2 }).map((_, ci) => (
                    <div key={`sk-${gi}-${ci}`} className="cd-card tp-skel-card">
                      <div className="cd-card__img-wrap">
                        <div className="tp-skel__img skeleton-pulse" />
                      </div>
                      <div className="cd-card__body">
                        <div className="tp-skel__line tp-skel__line--title skeleton-pulse" />
                        <div className="tp-skel__line tp-skel__line--tags skeleton-pulse" />
                        <div className="tp-skel__line tp-skel__line--footer skeleton-pulse" />
                      </div>
                    </div>
                  ))}
                </Fragment>
              ))}
            </>
          ) : filteredList.length === 0 ? (
            <div className="tp-empty" style={{ gridColumn: '1 / -1' }}>
              <p>没有找到匹配的景点</p>
              <button className="tp-empty__btn" onClick={clearAllFilters}>清除筛选</button>
            </div>
          ) : (
            groupsWithExpansion.map((group) => (
              <Fragment key={group.countryEn}>
                <div className="cd-section-label">
                  <span className="cd-section-label__icon">✦</span>
                  <span>{group.country}</span>
                  <span className="cd-section-label__en" style={{ marginLeft: 8, opacity: 0.6, fontSize: 13 }}>{group.countryEn}</span>
                  <span className="cd-section-label__count">{group.items.length} 处景点</span>
                </div>
                {group.visibleItems.map((item) => (
                  <div key={item.slug} className="cd-card" onClick={() => navFromList('/travel-photo', `/travel-photo/${item.slug}`, navigate)}>
                    <div className="cd-card__img-wrap">
                      <FallbackImage src={item.cover} alt={item.name} className="cd-card__img" />
                      <div className="cd-card__img-overlay" />
                    </div>
                    <div className="cd-card__body">
                      <h3 className="cd-card__name">{item.name}</h3>
                      {item.tags.length > 0 && (
                        <div className="cd-card__styles">
                          {item.tags.slice(0, 3).map(t => <span key={t} className="cd-card__style-tag">{t}</span>)}
                        </div>
                      )}
                      <div className="cd-card__footer">
                        <span className="cd-card__price">€{item.price || 0}起</span>
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
        </div>
      </div>
    </>
  )
}
