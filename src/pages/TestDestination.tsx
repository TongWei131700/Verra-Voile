import { Link, useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import RevealGroup from '../components/RevealGroup'
import { cities } from '../data/cities'

// 取前12个欧洲城市
const europeanCities = cities.filter(c =>
  ['法国', '意大利', '奥地利', '希腊', '捷克', '西班牙', '荷兰', '英国', '葡萄牙', '苏格兰', '克罗地亚', '瑞士', '爱尔兰']
    .includes(c.country)
).slice(0, 12)

// 国家 → 爬取页面路由映射
const countryRouteMap: Record<string, string> = {
  '法国': '/crawled-france',
  '希腊': '/crawled-greece',
  '葡萄牙': '/crawled-portugal',
  '意大利': '/crawled-destinations',
}

export default function TestDestination() {
  const navigate = useNavigate()

  return (
    <div className="test-dest-page">
      {/* 顶部导航 */}
      <header className="test-dest-header">
        <Link to="/" className="cust-back">← 返回首页</Link>
        <div className="test-dest-header__content">
          <p className="script test-dest-header__script">European Destinations</p>
          <h1 className="test-dest-header__title">欧洲十二城</h1>
          <div className="divider" />
          <p className="test-dest-header__sub">从爱琴海到高地，每一座城市都是一封写给爱情的情书</p>
        </div>
      </header>

      {/* 城市列表 */}
      <section className="test-dest-section">
        <RevealGroup stagger={150} perRow={1} className="test-dest-list">
          {europeanCities.map((city, index) => (
            <div
              key={city.id}
              className={`test-dest-card ${index % 2 === 1 ? 'test-dest-card--reverse' : ''}`}
              onClick={() => navigate(countryRouteMap[city.country] || `/listing/destination/${city.id}`)}
            >
              <div className="test-dest-card__image">
                <FallbackImage src={city.img} alt={city.name} />
                <div className="test-dest-card__overlay">
                  <span className="test-dest-card__number">{city.number}</span>
                </div>
              </div>
              <div className="test-dest-card__content">
                <div className="test-dest-card__badge">
                  <span className="test-dest-card__crest">{city.crest}</span>
                  <span className="test-dest-card__country">{city.country}</span>
                </div>
                <h2 className="test-dest-card__name">{city.name}</h2>
                <p className="test-dest-card__style">{city.style}</p>
                <p className="test-dest-card__desc">{city.desc}</p>
                <p className="test-dest-card__intro">{city.intro}</p>
                <div className="test-dest-card__cta">
                  <span>探索此目的地</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </RevealGroup>
      </section>

      {/* 底部留白 */}
      <footer className="test-dest-footer">
        <div className="divider" />
        <p className="script">Your Dream Wedding Awaits</p>
        <p>每一场目的地婚礼，都是一次独一无二的旅程</p>
      </footer>
    </div>
  )
}
