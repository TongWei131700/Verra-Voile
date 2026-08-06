import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'

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
  sourceUrl?: string
}

const HERO_IMG = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1600&h=900&fit=crop'

export default function Wine() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<WineProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return products
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      (p.tagline || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    )
  }, [products, searchQuery])

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
        <button className="cd-list-hero__back" onClick={() => navigate('/listing')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>返回</span>
        </button>
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

      {/* 商品卡片列表 */}
      <div className="cd-filter-layout" style={{ display: 'block' }}>
        <div className="cd-list">
          {loading ? (
            <div className="cd-loading"><p>正在加载宴席服务…</p></div>
          ) : filteredList.length > 0 ? (
            <>
              {filteredList.map(item => (
                <div key={item.productId} className="cd-card" onClick={() => navigate(`/wine/${item.productId}`)}>
                  <div className="cd-card__img-wrap">
                    <FallbackImage src={item.image} alt={item.name} className="cd-card__img" />
                    <div className="cd-card__img-overlay" />
                    {item.highlight && <span className="cd-card__country">{item.highlight}</span>}
                  </div>
                  <div className="cd-card__body">
                    <h3 className="cd-card__name">{item.name}</h3>
                    <p className="cd-card__tagline">{item.tagline || item.nameEn}</p>
                    <p className="cd-card__preview">{item.description}</p>
                    <div className="cd-card__footer">
                      <span className="cd-card__stat">✦ {item.capacity || item.nameEn}</span>
                      <span className="cd-card__arrow">{item.price > 0 ? `€${item.price.toLocaleString()}${item.unit !== '€' ? item.unit : ''} →` : '查看详情 →'}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="cd-load-end">
                <span>— 已展示全部 {filteredList.length} 项服务 —</span>
              </div>
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{searchQuery ? '当前搜索条件下无宴席服务' : '暂无宴席服务'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
