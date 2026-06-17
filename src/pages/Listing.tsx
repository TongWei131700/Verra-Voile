import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cities } from '../data/cities'
import { flowers } from '../data/flowers'
import { wines } from '../data/wines'

export default function Listing() {
  const [selectedCity, setSelectedCity] = useState<number | null>(null)
  const [selectedFlower, setSelectedFlower] = useState<number | null>(null)
  const [selectedWine, setSelectedWine] = useState<number | null>(null)

  return (
    <div className="customize-page">
      {/* Header */}
      <header className="cust-header">
        <Link to="/" className="cust-back">← 返回首页</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">Design Your Wedding</p>
          <h1>定制你的专属婚礼</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">选择目的地、花艺与美酒，描绘属于你们的浪漫蓝图</p>
        </div>
      </header>

      {/* Step 1: Destination */}
      <section className="cust-section">
        <div className="cust-step">
          <span className="cust-step__num">01</span>
          <span className="cust-step__line" />
        </div>
        <div className="cust-section__head">
          <p className="cust-section__script">Destination</p>
          <h2>选择婚礼目的地</h2>
        </div>
        <div className="cust-grid cust-grid--city">
          {cities.map(city => (
            <div
              key={city.id}
              className={`cust-card cust-card--city ${selectedCity === city.id ? 'selected' : ''}`}
              onClick={() => setSelectedCity(city.id)}
            >
              <div className="cust-card__img" style={{ backgroundImage: `url(${city.img})` }} />
              <div className="cust-card__overlay" />
              {selectedCity === city.id && <span className="cust-card__check">✓</span>}
              <div className="cust-card__info">
                <span className="cust-card__country">{city.country}</span>
                <h3 className="cust-card__name">{city.name}</h3>
                <span className="cust-card__style">{city.style}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: Flowers */}
      <section className="cust-section">
        <div className="cust-step">
          <span className="cust-step__num">02</span>
          <span className="cust-step__line" />
        </div>
        <div className="cust-section__head">
          <p className="cust-section__script">Flowers</p>
          <h2>选择花艺风格</h2>
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

      {/* Step 3: Wine */}
      <section className="cust-section">
        <div className="cust-step">
          <span className="cust-step__num">03</span>
          <span className="cust-step__line" />
        </div>
        <div className="cust-section__head">
          <p className="cust-section__script">Wine & Drinks</p>
          <h2>选择宴会酒饮</h2>
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
          {selectedCity && selectedFlower && selectedWine
            ? `已选择：${cities.find(c => c.id === selectedCity)?.name} · ${flowers.find(f => f.id === selectedFlower)?.name} · ${wines.find(w => w.id === selectedWine)?.name}`
            : '请完成以上三项选择'}
        </p>
        <button
          type="button"
          className="cust-submit__btn"
          disabled={!selectedCity || !selectedFlower || !selectedWine}
        >
          提交定制方案
        </button>
      </div>
    </div>
  )
}
