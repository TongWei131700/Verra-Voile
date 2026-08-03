import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import { cities } from '../data/cities'
import { getSelectedProducts } from '../utils/selectedProducts'

const API_BASE = import.meta.env.VITE_API_URL || ''

// 取前 12 个欧洲国家（去重）
const seen = new Set<string>()
const europeanCities = cities.filter(c =>
  ['法国', '意大利', '奥地利', '希腊', '捷克', '西班牙', '荷兰', '英国', '葡萄牙', '苏格兰', '克罗地亚', '瑞士', '爱尔兰']
    .includes(c.country)
).filter(c => {
  if (seen.has(c.country)) return false
  seen.add(c.country)
  return true
}).slice(0, 12)

// 国家 → 英文名映射
const countryEnMap: Record<string, string> = {
  '法国': 'France', '意大利': 'Italy', '奥地利': 'Austria', '希腊': 'Greece',
  '捷克': 'Czech Republic', '西班牙': 'Spain', '荷兰': 'Netherlands',
  '英国': 'United Kingdom', '葡萄牙': 'Portugal', '苏格兰': 'Scotland',
  '克罗地亚': 'Croatia', '瑞士': 'Switzerland', '爱尔兰': 'Ireland',
}

// 国家 → 爬取页面路由映射
const countryRouteMap: Record<string, string> = {
  '法国': '/europe/france',
  '希腊': '/europe/greece',
  '葡萄牙': '/europe/portugal',
  '意大利': '/europe/italy',
  '英国': '/europe/uk',
}

export default function Destinations() {
  const navigate = useNavigate()
  const [venueCounts, setVenueCounts] = useState<Record<string, number>>({})
  const [selectedCount, setSelectedCount] = useState(0)
  const [selectedByCountry, setSelectedByCountry] = useState<Record<string, number>>({})
  const [allDestinations, setAllDestinations] = useState<any[]>([])

  // 获取场地数据
  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-destinations`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const counts: Record<string, number> = {}
          const destList: any[] = []
          res.data.forEach((d: any) => {
            const country = d.country_cn || d.country
            counts[country] = (counts[country] || 0) + 1
            destList.push(d)
          })
          setVenueCounts(counts)
          setAllDestinations(destList)
        }
      })
      .catch(() => {})
  }, [])

  // 获取已选目的地数量和按国家分布
  useEffect(() => {
    const items = getSelectedProducts()
    const destItems = items.filter(i => i.categoryId === 'destination')
    setSelectedCount(destItems.length)
    
    // 按国家统计已选数量
    const byCountry: Record<string, number> = {}
    destItems.forEach(item => {
      // 查找该场地属于哪个国家
      const dest = allDestinations.find(d => d.slug === item.productId)
      if (dest) {
        const country = dest.country_cn || dest.country
        byCountry[country] = (byCountry[country] || 0) + 1
      }
    })
    setSelectedByCountry(byCountry)
  }, [allDestinations])

  return (
    <div className="test-dest-page">
      {/* 顶部导航 */}
      <header className="test-dest-header">
        <Link to="/listing" className="cust-back">← 返回</Link>
        <div className="test-dest-header__content">
          <p className="script test-dest-header__script">European Destinations</p>
          <h1 className="test-dest-header__title">欧洲目的地</h1>
          {selectedCount > 0 && (
            <span className="test-dest-header__selected">已选 {selectedCount} 个目的地</span>
          )}
          <div className="divider" />
          <p className="test-dest-header__sub">从爱琴海到高地，每一座城市都是一封写给爱情的情书</p>
        </div>
      </header>

      {/* 城市列表 */}
      <section className="test-dest-section">
        <div className="test-dest-list">
          {europeanCities.map((city, index) => {
            const countrySelectedCount = selectedByCountry[city.country] || 0
            const hasSelected = countrySelectedCount > 0
            return (
            <div
              key={city.id}
              className={`test-dest-card${hasSelected ? ' test-dest-card--selected' : ''} ${index % 2 === 1 ? 'test-dest-card--reverse' : ''}`}
              onClick={() => navigate(countryRouteMap[city.country] || `/listing/destination/${city.id}`)}
            >
              {hasSelected && (
                <span className="test-dest-card__selected-badge">{countrySelectedCount}</span>
              )}
              <div className="test-dest-card__image">
                <FallbackImage src={city.img} alt={city.name} />
                <div className="test-dest-card__overlay">
                  <span className="test-dest-card__number">{city.number}</span>
                </div>
              </div>
              <div className="test-dest-card__content">
                <div className="test-dest-card__badge">
                  <span className="test-dest-card__crest">{city.crest}</span>
                  <span className="test-dest-card__country">{countryEnMap[city.country] || city.country}</span>
                  {venueCounts[city.country] !== undefined && (
                    <span className="test-dest-card__count">{venueCounts[city.country]} 个场地</span>
                  )}
                </div>
                <h2 className="test-dest-card__name">{city.country}</h2>
                <p className="test-dest-card__style">{city.style}</p>
                <p className="test-dest-card__intro">{city.intro}</p>
                <div className="test-dest-card__cta">
                  <span>探索此目的地</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            )
          })}
          {/* 测试英国商品卡片 */}
          <div className="test-dest-card test-dest-card--reverse" onClick={() => navigate('/europe/test-uk')}>
            <div className="test-dest-card__image">
              <FallbackImage src="https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=80" alt="测试英国" />
              <div className="test-dest-card__overlay">
                <span className="test-dest-card__number">T</span>
              </div>
            </div>
            <div className="test-dest-card__content">
              <div className="test-dest-card__badge">
                <span className="test-dest-card__crest">♖</span>
                <span className="test-dest-card__country">United Kingdom</span>
                {venueCounts['测试英国'] !== undefined && (
                  <span className="test-dest-card__count">{venueCounts['测试英国']} 个场地</span>
                )}
              </div>
              <h2 className="test-dest-card__name">测试英国</h2>
              <p className="test-dest-card__style">试验商品</p>
              <p className="test-dest-card__intro">这是一个测试用的英国目的地商品。</p>
              <div className="test-dest-card__cta">
                <span>探索此目的地</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
          {/* 测试法国商品卡片 */}
          <div className="test-dest-card" onClick={() => navigate('/europe/test-france')}>
            <div className="test-dest-card__image">
              <FallbackImage src="https://images.unsplash.com/photo-1502630859100-b2c8d64c0e09?w=900&q=80" alt="测试法国" />
              <div className="test-dest-card__overlay">
                <span className="test-dest-card__number">T</span>
              </div>
            </div>
            <div className="test-dest-card__content">
              <div className="test-dest-card__badge">
                <span className="test-dest-card__crest">♖</span>
                <span className="test-dest-card__country">France</span>
                {venueCounts['测试法国'] !== undefined && (
                  <span className="test-dest-card__count">{venueCounts['测试法国']} 个场地</span>
                )}
              </div>
              <h2 className="test-dest-card__name">测试法国</h2>
              <p className="test-dest-card__style">试验商品</p>
              <p className="test-dest-card__intro">这是一个测试用的法国目的地商品。</p>
              <div className="test-dest-card__cta">
                <span>探索此目的地</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
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
