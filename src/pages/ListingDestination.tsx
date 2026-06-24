import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cities } from '../data/cities'

type Phase = 'bars-enter' | 'expand' | 'content'

export default function ListingDestination() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('bars-enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('expand'), 900)
    const t2 = setTimeout(() => setPhase('content'), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/listing" className="cust-back">← 返回定制</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">Destination</p>
          <h1>选择婚礼目的地</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">每一座城市都有属于你们的浪漫故事，选择梦想中的仪式之地</p>
        </div>
      </header>

      <section className="cust-section">
        <div className="city-list">
          {cities.map((city, i) => {
            const barIndex = i < 5 ? i : null
            const hasBar = barIndex !== null

            return (
              <div
                key={city.id}
                className={[
                  'city-row',
                  hasBar && phase === 'bars-enter' ? `city-row--bar city-row--slide ${barIndex % 2 === 0 ? 'city-row--from-left' : 'city-row--from-right'}` : '',
                  hasBar && phase === 'expand' ? 'city-row--grow' : '',
                  phase === 'content' ? 'city-row--show' : '',
                  !hasBar && phase !== 'content' ? 'city-row--hidden' : '',
                ].join(' ')}
                style={{
                  animationDelay: hasBar && phase === 'bars-enter' ? `${barIndex * 120}ms` : undefined,
                  transitionDelay: phase === 'expand' && hasBar ? `${barIndex * 100}ms`
                    : phase === 'content' ? `${i * 80}ms` : undefined,
                }}
                onClick={() => navigate(`/listing/destination/${city.id}`)}
              >
                <div className="city-row__img">
                  <img src={city.img} alt={city.name} />
                  <span className="city-row__number">{city.number}</span>
                </div>
                <div className="city-row__body">
                  <div className="city-row__meta">
                    <span className="city-row__crest">{city.crest}</span>
                    <span className="city-row__country">{city.country}</span>
                  </div>
                  <h3 className="city-row__name">{city.name}</h3>
                  <span className="city-row__style">{city.style}</span>
                  <p className="city-row__intro">{city.intro}</p>
                  <span className="city-row__cta">定制这座城市婚礼 →</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
