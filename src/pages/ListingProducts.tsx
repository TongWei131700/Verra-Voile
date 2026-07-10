import { useState, useCallback } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { moduleProducts } from '../data/products'
import type { Product } from '../data/products'
import type { Venue } from '../data/venues'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'
import CustomSelect from '../components/CustomSelect'

// Product 与 Venue 接口兼容，直接复用
function toVenue(p: Product): Venue {
  return { id: p.id, name: p.name, nameEn: p.nameEn, desc: p.desc, img: p.img, price: p.price, unit: p.unit, capacity: p.capacity, highlight: p.highlight }
}

// 模块路由映射
const moduleRouteMap: Record<string, string> = {
  team: '婚礼团队',
  floral: '花卉',
  wine: '酒水',
  other: '其他',
}

export default function ListingProducts() {
  const navigate = useNavigate()
  const { moduleId } = useParams<{ moduleId: string }>()
  const mod = moduleId ? moduleProducts[moduleId] : undefined

  const [selectedProduct, setSelectedProduct] = useState<Venue | null>(null)
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set())
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set())

  if (!mod) return <Navigate to="/listing" replace />

  const toggleProduct = useCallback((pid: string) => {
    setCheckedProducts(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }, [])

  const filteredProducts = checkedProducts.size === 0
    ? mod.products
    : mod.products.filter(p => checkedProducts.has(p.id))

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

  // 当前模块在 select 中的默认值
  const selectValue = moduleRouteMap[moduleId || ''] || mod.name
  const selectOptions = ['目的地婚礼', '婚礼团队', '花卉', '酒水', '其他']

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
        <div className="dest-module-select">
          <p className="dest-module-select__label">类别</p>
          <CustomSelect
            options={selectOptions}
            placeholder={selectValue}
            value={selectValue}
            onChange={(val) => {
              const map: Record<string, string> = {
                '目的地婚礼': 'destination',
                '婚礼团队': 'team',
                '花卉': 'floral',
                '酒水': 'wine',
                '其他': 'other',
              }
              const route = map[val]
              if (route) {
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
            <h4 className="dest-filter__title">服务项目</h4>
            <p className="dest-filter__en">Services</p>
            {checkedProducts.size > 0 && (
              <button
                className="dest-filter__clear"
                onClick={() => setCheckedProducts(new Set())}
              >
                清除筛选
              </button>
            )}
            <ul className="dest-filter__list">
              {mod.products.map(product => (
                <li
                  key={product.id}
                  className={`dest-filter__item dest-filter__item--check${checkedProducts.has(product.id) ? ' dest-filter__item--checked' : ''}`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <span className="dest-filter__check-icon">
                    {checkedProducts.has(product.id) ? '☑' : '☐'}
                  </span>
                  <span className="dest-filter__name">{product.name}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* 右侧内容区 */}
          <div className="dest-content">
            <div className="dest-city-section">
              <div className="dest-city-header">
                <div className="dest-city-header__left">
                  <div>
                    <p className="dest-city-header__country">{mod.nameEn}</p>
                    <h3 className="dest-city-header__name">{mod.name}</h3>
                    <p className="dest-city-header__style">{mod.products.length} 项服务可选</p>
                  </div>
                </div>
                <p className="dest-city-header__desc">为您精选的{mod.name}服务，每一项都经过严格筛选与品质把控</p>
              </div>

              {filteredProducts.length > 0 ? (
                <div className="dest-city-venues">
                  {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(toVenue(product))}>
                      <QuoteCard venue={toVenue(product)} booked={bookedIds.has(product.id)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dest-city-empty">
                  <span className="dest-city-empty__icon">✦</span>
                  <p>当前筛选条件下无服务</p>
                </div>
              )}
            </div>
          </div>
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
