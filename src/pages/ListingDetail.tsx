import { useState } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { cities } from '../data/cities'
import { parisVenues, croatiaVenues } from '../data/venues'
import type { Venue } from '../data/venues'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'

export default function ListingDetail() {
  const navigate = useNavigate()
  const { cityId } = useParams<{ cityId: string }>()
  const city = cities.find(c => c.id === Number(cityId))
  const [checkedCategories, setCheckedCategories] = useState<Set<string>>(new Set())
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)
  const [bookedVenueIds, setBookedVenueIds] = useState<Set<string>>(new Set())

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
    setBookedVenueIds(prev => new Set(prev).add(venue.id))
    setSelectedVenue(null)
  }

  // 确认选择：将所有已选场地存入 localStorage 并跳回
  const handleConfirm = () => {
    const allVenues = venues.flatMap(cat => cat.venues)
    const booked = allVenues
      .filter(v => bookedVenueIds.has(v.id))
      .map(v => ({ venueId: v.id, venueName: v.name, price: v.price, unit: v.unit, cityName: city!.name }))
    if (booked.length > 0) {
      localStorage.setItem('booked_destination', JSON.stringify(booked))
    }
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
      <VenuePanel venue={selectedVenue} onClose={() => setSelectedVenue(null)} onBook={handleBook} />

      {/* 底部确认栏 */}
      {venues.length > 0 && (
        <div className="confirm-bar">
          <span className="confirm-bar__info">已选 {bookedVenueIds.size} 项</span>
          <button type="button" className="confirm-bar__btn" onClick={handleConfirm}>确认选择</button>
        </div>
      )}
    </div>
  )
}
