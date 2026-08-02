import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RevealGroup from './RevealGroup'
import { cities, type City } from '../data/cities'

// 国家 → europe 页面路由映射
const countryRouteMap: Record<string, string> = {
  '法国': '/europe/france',
  '希腊': '/europe/greece',
  '葡萄牙': '/europe/portugal',
  '意大利': '/europe/italy',
  '英国': '/europe/uk',
}

function CityCard({ city }: { city: City }) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    // 3D tilt on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `perspective(1000px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`
    }
    const handleMouseLeave = () => {
      card.style.transform = ''
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const handleClick = () => {
    // 根据国家跳转到对应的 europe 页面
    const route = countryRouteMap[city.country]
    if (route) {
      navigate(route)
    } else {
      navigate('/destinations')
    }
  }

  return (
    <div className="city-card" ref={cardRef} onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="city-img" style={{ backgroundImage: `url('${city.img}')` }}></div>
      <div className="overlay"></div>
      <div className="city-number">{city.number}</div>
      <div className="crest-mark"><span>{city.crest}</span></div>
      <div className="heart-pop">♥</div>
      <div className="city-info">
        <div className="city-name">{city.country}</div>
        <div className="city-style">{city.style}</div>
      </div>
    </div>
  )
}

/** 首页“欧陆十二城”展示前 12 个国家（去重），每个国家一张卡片 */
const seen = new Set<string>()
const HOME_CITIES = cities.filter(c => {
  if (c.id > 12 || seen.has(c.country)) return false
  seen.add(c.country)
  return true
})

export default function Destinations() {
  return (
    <section id="destinations" className="destinations">
      {/* 仿 europe 页面风格的全屏 hero 背景 */}
      <div className="dest-hero">
        <div
          className="dest-hero__bg"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80')` }}
        />
        <div className="dest-hero__overlay" />
        <div className="dest-hero__content">
          <p className="dest-hero__sub">Destinations of Love</p>
          <h1 className="dest-hero__title">欧洲目的地</h1>
          <div className="dest-hero__divider" />
          <p className="dest-hero__desc">从塞纳河的浪漫到爱琴海的湛蓝，选一座城，许一生约定</p>
        </div>
      </div>

      <div className="dest-body">
        <RevealGroup stagger={120} perRow={4} className="cities-grid">
          {HOME_CITIES.map((city) => (
            <CityCard key={city.id} city={city} />
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}
