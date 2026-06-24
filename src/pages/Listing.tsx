import { Link, useNavigate } from 'react-router-dom'

const products = [
  { id: 'destination', name: '地点', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop', desc: '全球浪漫目的地' },
  { id: 'wine', name: '酒水', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop', desc: '精选婚宴佳酿' },
  { id: 'photography', name: '摄影', img: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=800&fit=crop', desc: '记录永恒瞬间' },
  { id: 'floral', name: '花卉', img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=800&fit=crop', desc: '浪漫花艺设计' },
  { id: 'dress', name: '礼服', img: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=600&h=800&fit=crop', desc: '梦想中的嫁衣' },
  { id: 'catering', name: '宴席', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=800&fit=crop', desc: '米其林级飨宴' },
]

export default function Listing() {
  const navigate = useNavigate()

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
          {products.map((item) => (
            <div
              key={item.id}
              className="product-card"
              onClick={() => {
                if (item.id === 'destination') {
                  navigate('/listing/destination')
                }
              }}
            >
              <div className="product-card__img">
                <img src={item.img} alt={item.name} />
                <span className="product-card__explore">探索</span>
              </div>
              <div className="product-card__info">
                <h3 className="product-card__name">{item.name}</h3>
                <p className="product-card__desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
