import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { cities } from '../data/cities'
import { flowers } from '../data/flowers'
import { wines } from '../data/wines'

export default function ListingDetail() {
  const { cityId } = useParams<{ cityId: string }>()
  const city = cities.find(c => c.id === Number(cityId))

  const [selectedFlower, setSelectedFlower] = useState<number | null>(null)
  const [selectedWine, setSelectedWine] = useState<number | null>(null)

  if (!city) return <Navigate to="/listing" replace />

  return (
    <div className="customize-page">
      {/* City Hero Banner */}
      <header className="detail-hero">
        <div className="detail-hero__bg" style={{ backgroundImage: `url(${city.img})` }} />
        <div className="detail-hero__overlay" />
        <Link to="/listing" className="cust-back detail-back">← 更换目的地</Link>
        <div className="detail-hero__content">
          <span className="detail-hero__crest">{city.crest}</span>
          <p className="detail-hero__country">{city.country}</p>
          <h1 className="detail-hero__city">{city.name}</h1>
          <p className="detail-hero__style">{city.style}</p>
          <div className="divider"></div>
          <p className="detail-hero__desc">{city.desc}</p>
        </div>
      </header>

      {/* Services */}
      <section className="cust-section">
        <div className="cust-step">
          <span className="cust-step__num">01</span>
          <span className="cust-step__line" />
        </div>
        <div className="cust-section__head">
          <p className="cust-section__script">Flowers</p>
          <h2>{city.name} · 花艺风格</h2>
        </div>
        <div className="cust-grid cust-grid--flower">
          {flowers.map(flower => (
            <div
              key={flower.id}
              className={`cust-card cust-card--flower ${selectedFlower === flower.id ? 'selected' : ''}`}
              onClick={() => setSelectedFlower(flower.id)}
            >
              <div className="cust-card__img" style={{ backgroundImage: `url(${flower.img})` }} />
              <div className="cust-card__overlay" />
              {selectedFlower === flower.id && <span className="cust-card__check">✓</span>}
              <div className="cust-card__info">
                <span className="cust-card__country">{flower.nameEn}</span>
                <h3 className="cust-card__name">{flower.name}</h3>
                <span className="cust-card__style">{flower.style}</span>
                <p className="cust-card__desc">{flower.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cust-section">
        <div className="cust-step">
          <span className="cust-step__num">02</span>
          <span className="cust-step__line" />
        </div>
        <div className="cust-section__head">
          <p className="cust-section__script">Wine & Drinks</p>
          <h2>{city.name} · 宴会酒饮</h2>
        </div>
        <div className="cust-grid cust-grid--wine">
          {wines.map(wine => (
            <div
              key={wine.id}
              className={`cust-card cust-card--wine ${selectedWine === wine.id ? 'selected' : ''}`}
              onClick={() => setSelectedWine(wine.id)}
            >
              <div className="cust-card__img" style={{ backgroundImage: `url(${wine.img})` }} />
              <div className="cust-card__overlay" />
              {selectedWine === wine.id && <span className="cust-card__check">✓</span>}
              <div className="cust-card__info">
                <span className="cust-card__icon">{wine.icon}</span>
                <h3 className="cust-card__name">{wine.name}</h3>
                <span className="cust-card__style">{wine.category}</span>
                <p className="cust-card__desc">{wine.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Submit */}
      <div className="cust-submit">
        <p className="cust-submit__summary">
          {selectedFlower && selectedWine
            ? `${city.name} · ${flowers.find(f => f.id === selectedFlower)?.name} · ${wines.find(w => w.id === selectedWine)?.name}`
            : '请选择花艺与酒饮完成定制'}
        </p>
        <button
          type="button"
          className="cust-submit__btn"
          disabled={!selectedFlower || !selectedWine}
        >
          提交定制方案
        </button>
      </div>
    </div>
  )
}
