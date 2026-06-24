import { useState } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { moduleProducts } from '../data/products'
import type { Product } from '../data/products'
import type { Venue } from '../data/venues'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'

// Product 与 Venue 接口兼容，直接复用
function toVenue(p: Product): Venue {
  return { id: p.id, name: p.name, nameEn: p.nameEn, desc: p.desc, img: p.img, price: p.price, unit: p.unit, capacity: p.capacity, highlight: p.highlight }
}

export default function ListingProducts() {
  const navigate = useNavigate()
  const { moduleId } = useParams<{ moduleId: string }>()
  const mod = moduleId ? moduleProducts[moduleId] : undefined

  const [selectedProduct, setSelectedProduct] = useState<Venue | null>(null)
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set())

  if (!mod) return <Navigate to="/listing" replace />

  const handleBook = (venue: Venue) => {
    setBookedIds(prev => new Set(prev).add(venue.id))
    setSelectedProduct(null)
  }

  const handleConfirm = () => {
    const booked = mod.products
      .filter(p => bookedIds.has(p.id))
      .map(p => ({ venueId: p.id, venueName: p.name, price: p.price, unit: p.unit }))
    if (booked.length > 0) {
      localStorage.setItem(`booked_${moduleId}`, JSON.stringify(booked))
    }
    navigate('/listing')
  }

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/listing" className="cust-back">← 返回定制</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">{mod.nameEn}</p>
          <h1>{mod.name}</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">选择您需要的服务</p>
        </div>
      </header>

      <section className="cust-section">
        <div className="cust-grid cust-grid--venue">
          {mod.products.map(product => (
            <div key={product.id} onClick={() => setSelectedProduct(toVenue(product))}>
              <QuoteCard venue={toVenue(product)} booked={bookedIds.has(product.id)} />
            </div>
          ))}
        </div>
      </section>

      <VenuePanel venue={selectedProduct} onClose={() => setSelectedProduct(null)} onBook={handleBook} />

      <div className="confirm-bar">
        <span className="confirm-bar__info">已选 {bookedIds.size} 项</span>
        <button type="button" className="confirm-bar__btn" onClick={handleConfirm}>确认选择</button>
      </div>
    </div>
  )
}
