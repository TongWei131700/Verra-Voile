import { useState, useMemo, useEffect } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { cities } from '../data/cities'
import { parisVenues, croatiaVenues } from '../data/venues'
import type { Venue } from '../data/venues'
import {
  getSelectedProducts,
  setSelectedItem,
  removeSelectedProduct,
} from '../utils/selectedProducts'
import type { SelectedItem } from '../utils/selectedProducts'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'
import ConfirmSummary from '../components/ConfirmSummary'

const DEST_CATEGORY = 'destination'
export default function ListingDetail() {
  const navigate = useNavigate()
  const { cityId } = useParams<{ cityId: string }>()
  const city = cities.find(c => c.id === Number(cityId))
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set())
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  // 存储全部已选商品状态
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => getSelectedProducts())

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

  // 当前目的地已选场地 ID 集合
  const bookedVenueIds = useMemo(
    () => new Set(selectedItems.filter(i => i.categoryId === DEST_CATEGORY).map(i => i.productId)),
    [selectedItems]
  )

  if (!city) return <Navigate to="/listing/destination" replace />

  const venues = city.id === 1 ? parisVenues : city.id === 13 ? croatiaVenues : []

  const toggleCategory = (id: string) => {
    setCheckedCategories(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBook = (venue: Venue) => {
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
  }

  const handleCancel = (venue: Venue) => {
    const updated = removeSelectedProduct(DEST_CATEGORY, venue.id)
    setSelectedItems(updated)
    setSelectedVenue(null)
  }

  // 确认选择：跳回
  const handleConfirm = () => {
    navigate('/listing')
  }

  // 没有勾选则显示全部
  const filteredVenues = checkedCategories.size === 0
    ? venues
    : venues.filter(cat => checkedCategories.has(cat.id))

  return (
    <div className="customize-page">
      {/* City Hero Banner */}
      <header className="detail-hero">
        <div className="detail-hero__bg" style={{ backgroundImage: `url(${city.img})` }} />
        <div className="detail-hero__overlay" />
        <Link to="/listing/destination" className="cust-back detail-back">← 更换目的地</Link>
        <div className="detail-hero__content">
          <span className="detail-hero__crest">{city.crest}</span>
          <p className="detail-hero__country">{city.country}</p>
          <h1 className="detail-hero__city">{city.name}</h1>
          <p className="detail-hero__style">{city.style}</p>
          <div className="divider"></div>
          <p className="detail-hero__desc">{city.desc}</p>
        </div>
      </header>

      {/* Venue Section */}
      {venues.length > 0 && (
        <section className="cust-section">
          <div className="cust-section__head">
            <p className="cust-section__script">Venues</p>
            <h2>{city.name} · 场地选择</h2>
            <p className="cust-section__sub">勾选左侧分类筛选场地</p>
          </div>

          <div className="venue-layout">
            {/* Left: Checkbox Filters */}
            <aside className="venue-filter">
              <h4 className="venue-filter__title">场地类型</h4>
              {venues.map(cat => (
                <label key={cat.id} className="venue-filter__item">
                  <input
                    type="checkbox"
                    checked={checkedCategories.has(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="venue-filter__checkbox"
                  />
                  <span className="venue-filter__label">{cat.label}</span>
                  <span className="venue-filter__count">{cat.venues.length}</span>
                </label>
              ))}
            </aside>

            {/* Right: Cards */}
            <div className="venue-content">
              {filteredVenues.map(cat => (
                <div key={cat.id} className="venue-category venue-category--visible">
                  <div className="venue-category__header">
                    <span className="venue-category__icon">{cat.icon}</span>
                    <h3 className="venue-category__title">{cat.label}</h3>
                    <span className="venue-category__en">{cat.labelEn}</span>
                    <span className="venue-category__count">{cat.venues.length} 处场地</span>
                  </div>
                  <div className="cust-grid cust-grid--venue">
                    {cat.venues.map(venue => (
                      <div key={venue.id} onClick={() => setSelectedVenue(venue)}>
                        <QuoteCard venue={venue} booked={bookedVenueIds.has(venue.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Fallback */}
      {venues.length === 0 && (
        <section className="cust-section">
          <div className="cust-section__head">
            <p className="cust-section__script">Coming Soon</p>
            <h2>{city.name} · 场地即将上线</h2>
            <p className="cust-section__sub">我们正在为这座城市精选最佳婚礼场地</p>
          </div>
        </section>
      )}
      {/* Venue Detail Panel */}
      <VenuePanel
        venue={selectedVenue}
        onClose={() => setSelectedVenue(null)}
        onBook={handleBook}
        booked={selectedVenue ? bookedVenueIds.has(selectedVenue.id) : false}
        onCancel={handleCancel}
      />

      {/* 底部确认栏 */}
      {venues.length > 0 && (
        <>
          <ConfirmSummary items={selectedItems} show={showSummary} onClose={() => setShowSummary(false)} onRemove={(catId, prodId) => { const updated = removeSelectedProduct(catId, prodId); setSelectedItems(updated); }} />
          <div className="confirm-bar">
            <span className="confirm-bar__info" onClick={() => setShowSummary(v => !v)}>已选 <span className="confirm-bar__num">{selectedItems.length}</span> 项</span>
            <button type="button" className="confirm-bar__btn" onClick={handleConfirm}>确认选择</button>
          </div>
        </>
      )}
    </div>
  )
}
