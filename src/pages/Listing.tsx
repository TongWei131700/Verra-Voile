import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const products = [
  { id: 'destination', name: '地点', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop', desc: '全球浪漫目的地' },
  { id: 'team', name: '婚礼团队', img: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=800&fit=crop', desc: '一站式婚礼现场服务' },
  { id: 'floral', name: '花卉', img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=800&fit=crop', desc: '浪漫花艺设计' },
  { id: 'wine', name: '酒水', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop', desc: '精选婚宴佳酿' },
  { id: 'dress', name: '礼服', img: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=600&h=800&fit=crop', desc: '梦想中的嫁衣' },
  { id: 'catering', name: '宴席', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=800&fit=crop', desc: '米其林级飨宴' },
  { id: 'other', name: '其他', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&h=800&fit=crop', desc: '包车及其他服务' },
]

export default function Listing() {
  const navigate = useNavigate()
  const [showCart, setShowCart] = useState(false)
  const [barVisible, setBarVisible] = useState(true)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 滚动时隐藏，停止滚动后再显示
  useEffect(() => {
    const handleScroll = () => {
      setBarVisible(false)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setBarVisible(true), 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  // 模块 ID 到中文名映射
  const moduleNames: Record<string, string> = {
    destination: '地点', team: '婚礼团队', floral: '花卉',
    wine: '酒水', other: '其他',
  }
  const moduleKeys = ['destination', 'team', 'floral', 'wine', 'other']

  // 读取所有已预定的模块
  const bookedMap: Record<string, { venueId?: string; venueName: string; price: number; unit: string }[]> = {}
  for (const key of moduleKeys) {
    const raw = localStorage.getItem(`booked_${key}`)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        bookedMap[key] = Array.isArray(parsed) ? parsed : [parsed]
      } catch { /* ignore */ }
    }
  }

  // 汇总已选商品列表
  const cartItems: { module: string; name: string; price: number; unit: string }[] = []
  for (const key of moduleKeys) {
    const items = bookedMap[key]
    if (items) {
      for (const item of items) {
        cartItems.push({ module: moduleNames[key] || key, name: item.venueName, price: item.price || 0, unit: item.unit || '' })
      }
    }
  }

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0)
  const hasItems = cartItems.length > 0

  // pad打开时锁定滚动
  useEffect(() => {
    document.body.style.overflow = showCart ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCart])

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/" className="cust-back">← 返回首页</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">Wedding Customization</p>
          <h1>定制你的婚礼</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">每一个细节，都值得被认真对待</p>
        </div>
      </header>

      <section className="cust-section">
        <div className="product-grid">
          {products.map((item) => {
            const booked = bookedMap[item.id]
            const isBooked = !!booked && booked.length > 0
            const bookedSummary = isBooked
              ? `✓ 已选 ${booked.length} 项：${booked.map(b => b.venueName).join('、')}`
              : null
            return (
              <div
                key={item.id}
                className={`product-card${isBooked ? ' product-card--booked' : ''}`}
                onClick={() => {
                  if (item.id === 'destination') {
                    navigate('/listing/destination')
                  } else {
                    navigate(`/listing/${item.id}`)
                  }
                }}
              >
                <div className="product-card__img">
                  <img src={item.img} alt={item.name} />
                  <span className="product-card__explore">探索</span>
                </div>
                <div className="product-card__info">
                  <h3 className="product-card__name">{item.name}</h3>
                  <p className="product-card__desc">
                    {bookedSummary || item.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 底部订单栏 */}
      {hasItems && (
        <div className={`order-bar${barVisible ? '' : ' order-bar--hidden'}`}>
          <div className="order-bar__price">
            <span className="order-bar__price-label">合计</span>
            <span className="order-bar__price-num">€{totalPrice.toLocaleString()}</span>
          </div>
          <button type="button" className="order-bar__cart" onClick={() => setShowCart(true)}>
            📋
            <span className="order-bar__cart-count">{cartItems.length}</span>
          </button>
          <button type="button" className="order-bar__btn">咨询此订单</button>
        </div>
      )}

      {/* 商品清单 Pad */}
      {showCart && (
        <>
          <div className="cart-pad-backdrop" onClick={() => setShowCart(false)} />
          <div className="cart-pad">
            <button type="button" className="cart-pad__close" onClick={() => setShowCart(false)}>✕</button>
            <h3 className="cart-pad__title">已选商品清单</h3>
            <div className="cart-pad__list">
              {cartItems.map((item, i) => (
                <div key={i} className="cart-pad__item">
                  <span className="cart-pad__item-module">{item.module}</span>
                  <span className="cart-pad__item-name">{item.name}</span>
                  <span className="cart-pad__item-price">€{item.price.toLocaleString()}{item.unit}</span>
                </div>
              ))}
            </div>
            <div className="cart-pad__total">
              <span>合计</span>
              <span>€{totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
