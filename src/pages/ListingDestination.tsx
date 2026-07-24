import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cities } from '../data/cities'
import type { Venue, VenueCategory } from '../data/venues'
import {
  getSelectedProducts,
  setSelectedItem,
  removeSelectedProduct,
} from '../utils/selectedProducts'
import type { SelectedItem } from '../utils/selectedProducts'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'
import CustomSelect from '../components/CustomSelect'
import ConfirmSummary from '../components/ConfirmSummary'
import RevealGroup from '../components/RevealGroup'

const DEST_CATEGORY = 'destination'

// API 返回的城市场地数据结构
interface ApiCityData {
  cityId: number
  categories: VenueCategory[]
}

export default function ListingDestination() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeCityId, setActiveCityId] = useState<number | null>(null)
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set())
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({})
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => getSelectedProducts())

  // 从 API 获取目的地数据
  const [cityDataMap, setCityDataMap] = useState<Record<number, VenueCategory[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products/destination')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.cities) {
          const map: Record<number, VenueCategory[]> = {}
          for (const city of data.data.cities as ApiCityData[]) {
            map[city.cityId] = city.categories
          }
          setCityDataMap(map)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 页面显示时刷新 sessionStorage
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setSelectedItems(getSelectedProducts())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    setSelectedItems(getSelectedProducts())
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // 读取 URL 参数 city，自动锚定到对应城市
  useEffect(() => {
    const cityParam = searchParams.get('city')
    if (cityParam) {
      const cityId = parseInt(cityParam, 10)
      if (cityId && cities.some(c => c.id === cityId)) {
        setActiveCityId(cityId)
        // 延迟等待 DOM 渲染完成后滚动
        setTimeout(() => {
          const el = sectionRefs.current[cityId]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300)
      }
    }
  }, [searchParams])

  // 当前大类下已选商品 ID 集合
  const bookedVenueIds = useMemo(
    () => new Set(selectedItems.filter(i => i.categoryId === DEST_CATEGORY).map(i => i.productId)),
    [selectedItems]
  )

  // 汇总所有城市的场地分类（去重）
  const allCategories = useMemo(() => {
    const map = new Map<string, { label: string; labelEn: string; icon: string }>()
    for (const cats of Object.values(cityDataMap)) {
      for (const cat of cats) {
        if (!map.has(cat.id)) {
          map.set(cat.id, { label: cat.label, labelEn: cat.labelEn, icon: cat.icon })
        }
      }
    }
    return Array.from(map.entries()).map(([id, info]) => ({ id, ...info }))
  }, [cityDataMap])

  const handleCityClick = useCallback((cityId: number) => {
    setActiveCityId(cityId)
    const el = sectionRefs.current[cityId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const toggleCategory = useCallback((catId: string) => {
    setCheckedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  // 统计每个城市的场地总数
  const getCityVenueCount = (cityId: number) => {
    const cats = cityDataMap[cityId]
    if (!cats) return 0
    return cats.reduce((sum, cat) => sum + cat.venues.length, 0)
  }

  // 筛选后的场地列表：按城市分组，按分类过滤
  const getFilteredVenues = (venueCategories: VenueCategory[]): Venue[] => {
    if (checkedCategories.size === 0) {
      return venueCategories.flatMap(cat => cat.venues)
    }
    return venueCategories
      .filter(cat => checkedCategories.has(cat.id))
      .flatMap(cat => cat.venues)
  }

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/listing" className="cust-back">← 返回定制</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">Destination</p>
          <h1>选择婚礼目的地</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">每一座城市都有属于你们的浪漫故事，选择梦想中的仪式之地</p>
        </div>
        <div className="dest-module-select">
          <p className="dest-module-select__label">类别</p>
          <CustomSelect
            options={['目的地婚礼', '婚礼团队', '花卉', '酒水', '其他']}
            placeholder="目的地婚礼"
            value="目的地婚礼"
            onChange={(val) => {
              const map: Record<string, string> = {
                '目的地婚礼': 'destination',
                '婚礼团队': 'team',
                '花卉': 'floral',
                '酒水': 'wine',
                '其他': 'other',
              }
              const route = map[val]
              if (route && route !== 'destination') {
                navigate(`/listing/${route}`)
              }
            }}
          />
        </div>
      </header>

      <section className="cust-section">
        <div className="dest-layout">
          {/* 左侧筛选栏 */}
          <aside className="dest-filter">
            {/* 目的地筛选 */}
            <h4 className="dest-filter__title">目的地</h4>
            <p className="dest-filter__en">Destinations</p>
            <ul className="dest-filter__list">
              {cities.map(city => {
                const count = getCityVenueCount(city.id)
                return (
                  <li
                    key={city.id}
                    className={`dest-filter__item${activeCityId === city.id ? ' dest-filter__item--active' : ''}`}
                    onClick={() => handleCityClick(city.id)}
                  >
                    <span className="dest-filter__crest">{city.crest}</span>
                    <span className="dest-filter__name">{city.name}</span>
                    <span className="dest-filter__country">{city.country}</span>
                    {count > 0 && <span className="dest-filter__count">{count}</span>}
                  </li>
                )
              })}
            </ul>

            {/* 场地类型筛选 */}
            <h4 className="dest-filter__title dest-filter__title--gap">场地类型</h4>
            <p className="dest-filter__en">Venue Types</p>
            {checkedCategories.size > 0 && (
              <button
                className="dest-filter__clear"
                onClick={() => setCheckedCategories(new Set())}
              >
                清除筛选
              </button>
            )}
            <ul className="dest-filter__list">
              {allCategories.map(cat => (
                <li
                  key={cat.id}
                  className={`dest-filter__item dest-filter__item--check${checkedCategories.has(cat.id) ? ' dest-filter__item--checked' : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  <span className="dest-filter__check-icon">
                    {checkedCategories.has(cat.id) ? '☑' : '☐'}
                  </span>
                  <span className="dest-filter__cat-icon">{cat.icon}</span>
                  <span className="dest-filter__name">{cat.label}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* 右侧内容区 */}
          <div className="dest-content">
            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#999' }}>加载场地数据中...</div>
            ) : cities.map(city => {
              const venueCategories = cityDataMap[city.id]
              const hasVenues = !!venueCategories && venueCategories.length > 0
              const filteredVenues = hasVenues ? getFilteredVenues(venueCategories) : []

              return (
                <div
                  key={city.id}
                  className="dest-city-section"
                  ref={el => { sectionRefs.current[city.id] = el }}
                >
                  {/* 城市头部 */}
                  <div className="dest-city-header">
                    <div className="dest-city-header__left">
                      <span className="dest-city-header__crest">{city.crest}</span>
                      <div>
                        <p className="dest-city-header__country">{city.country}</p>
                        <h3 className="dest-city-header__name">{city.name}</h3>
                        <p className="dest-city-header__style">{city.style}</p>
                      </div>
                    </div>
                    <p className="dest-city-header__desc">{city.desc}</p>
                  </div>

                  {/* 场地卡片（扁平展示，不分类别） */}
                  {hasVenues ? (
                    filteredVenues.length > 0 ? (
                      <RevealGroup stagger={120} perRow={4} className="dest-city-venues">
                        {filteredVenues.map(venue => (
                          <div key={venue.id} onClick={() => setSelectedVenue(venue)}>
                            <QuoteCard venue={venue} booked={bookedVenueIds.has(venue.id)} />
                          </div>
                        ))}
                      </RevealGroup>
                    ) : (
                      <div className="dest-city-empty">
                        <span className="dest-city-empty__icon">✦</span>
                        <p>当前筛选条件下无场地</p>
                      </div>
                    )
                  ) : (
                    <div className="dest-city-empty">
                      <span className="dest-city-empty__icon">✦</span>
                      <p>场地精选即将上线</p>
                      <p className="dest-city-empty__sub">我们正在为这座城市寻找最佳婚礼场地</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 场地详情面板 */}
      <VenuePanel
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        onBook={(venue) => {
          const item: SelectedItem = {
            categoryId: DEST_CATEGORY,
            productId: venue.id,
            name: venue.name,
            nameEn: venue.nameEn,
            price: venue.price,
            unit: venue.unit,
          }
          const updated = setSelectedItem(item)
          setSelectedItems(updated)
          setSelectedVenue(null)
        }}
        booked={selectedVenue ? bookedVenueIds.has(selectedVenue.id) : false}
        onCancel={(venue) => {
          const updated = removeSelectedProduct(DEST_CATEGORY, venue.id)
          setSelectedItems(updated)
          setSelectedVenue(null)
        }}
      />

      <ConfirmSummary items={selectedItems} show={showSummary} onClose={() => setShowSummary(false)} onRemove={(catId, prodId) => { const updated = removeSelectedProduct(catId, prodId); setSelectedItems(updated); }} />

      <div className="confirm-bar">
        <span className="confirm-bar__info" onClick={() => setShowSummary(v => !v)}>已选 <span className="confirm-bar__num">{selectedItems.length}</span> 项</span>
        <button type="button" className="confirm-bar__btn" onClick={() => navigate('/listing')}>确认选择</button>
      </div>
    </div>
  )
}
