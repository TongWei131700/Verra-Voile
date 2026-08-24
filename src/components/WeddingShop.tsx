import { useNavigate } from 'react-router-dom'
import SectionTitle from './SectionTitle'
import RevealGroup from './RevealGroup'
import FallbackImage from './common/FallbackImage'
import coverPhotography from '../assets/cover-wedding-photography.jpg'

const products = [
  { id: 'destination', name: '目的地', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop', desc: '全球浪漫目的地' },
  { id: 'team', name: '婚礼团队', img: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&h=800&fit=crop', desc: '一站式婚礼现场服务' },
  { id: 'floral', name: '花卉', img: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600&h=800&fit=crop', desc: '浪漫花艺设计' },
  { id: 'wine', name: '酒水宴席', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop', desc: '精选婚宴佳酿与米其林级飨宴' },
  { id: 'dress', name: '礼服', img: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=600&h=800&fit=crop', desc: '梦想中的嫁衣' },
  { id: 'photography', name: '摄影', img: coverPhotography, desc: '记录每一个珍贵瞬间' },
  { id: 'other', name: '其他', img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&h=800&fit=crop', desc: '包车及其他服务' },
]

export default function WeddingShop() {
  const navigate = useNavigate()

  const goModule = (id: string) => {
    if (id === 'destination') navigate('/destinations')
    else if (id === 'wine') navigate('/wine')
    else if (id === 'photography') navigate('/photography')
    else navigate(`/listing/${id}`)
  }

  return (
    <section className="wedding-shop">
      <SectionTitle sub="Wedding Shop" title="婚礼商城" />
      <p className="wedding-shop__sub">从场地到花艺，从酒水宴席到礼服，一站式定制您的梦想婚礼</p>
      <RevealGroup stagger={120} perRow={3} className="product-grid">
        {products.map((item) => (
          <div
            key={item.id}
            className="product-card shop-card"
            onClick={() => goModule(item.id)}
          >
            <FallbackImage src={item.img} alt={item.name} className="shop-card__bg" />
            <div className="shop-card__overlay" />
            <div className="shop-card__content">
              <h3 className="shop-card__name">{item.name}</h3>
              <p className="shop-card__desc">{item.desc}</p>
              <button className="shop-card__btn" onClick={(e) => { e.stopPropagation(); goModule(item.id) }}>开始定制</button>
            </div>
          </div>
        ))}
      </RevealGroup>
    </section>
  )
}
