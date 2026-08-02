import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SectionTitle from './SectionTitle'
import RevealGroup from './RevealGroup'
import { cities, type City } from '../data/cities'

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
    // 测试阶段：所有卡片统一跳转到波尔多场地详情页
    // 后续可根据 city 映射到不同的 venue slug
    navigate('/venue/bordeaux')
  }

  return (
    <div className="city-card" ref={cardRef} onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="city-img" style={{ backgroundImage: `url('${city.img}')` }}></div>
      <div className="overlay"></div>
      <div className="city-number">{city.number}</div>
      <div className="crest-mark"><span>{city.crest}</span></div>
      <div className="heart-pop">♥</div>
      <div className="city-info">
        <div className="country">{city.country}</div>
        <div className="city-name">{city.name}</div>
        <div className="city-style">{city.style}</div>
        <div className="city-desc">{city.desc}</div>
      </div>
    </div>
  )
}

/** 首页“欧陆十二城”仅展示前 12 个城市（id 1-12），与 listing 目的地页的完整城市列表分开 */
const HOME_CITIES = cities.filter(c => c.id <= 12)

export default function Destinations() {
  return (
    <section id="destinations" className="destinations">
      <SectionTitle sub="Destinations of Love" title="欧陆十二城" />
      <p className="destinations-intro">
        " 从塞纳河的浪漫到爱琴海的湛蓝，从泰晤士河畔的庄重到亚得里亚海的诗意 —— 选一座城，许一生约定。"
      </p>
      <RevealGroup stagger={120} perRow={4} className="cities-grid">
        {HOME_CITIES.map((city) => (
          <CityCard key={city.id} city={city} />
        ))}
      </RevealGroup>
    </section>
  )
}
