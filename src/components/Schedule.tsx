import { useEffect, useRef } from 'react'
import SectionTitle from './SectionTitle'
import { scheduleData, type ScheduleItem } from '../data/schedule'

function TimelineItem({ item }: { item: ScheduleItem }) {
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = itemRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.18 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="lux-item" ref={itemRef}>
      <div className="lux-card">
        <div className="lux-time">{item.time}</div>
        <div className="lux-eyebrow">{item.eyebrow}</div>
        <h3 className="lux-title">{item.title}</h3>
        <p className="lux-subtitle">{item.subtitle}</p>
        <p className="lux-desc">{item.desc}</p>

        {item.menuGrid ? (
          <div className="menu-grid">
            {item.menuGrid.map((col, colIdx) => (
              <ul className="lux-details" key={colIdx}>
                {col.map((d, i) => (
                  <li key={i}><strong>{d.label}：</strong>{d.value}</li>
                ))}
              </ul>
            ))}
          </div>
        ) : item.details ? (
          <ul className="lux-details">
            {item.details.map((d, i) => (
              <li key={i}><strong>{d.label}：</strong>{d.value}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="lux-badge-wrap">
        <div className="lux-badge">{item.badge}</div>
      </div>

      <div className="lux-visual">
        <div
          className="visual-img"
          style={{ backgroundImage: `url('${item.visualImg}')` }}
        ></div>
        <div className="visual-label">{item.visualLabel}</div>
      </div>
    </div>
  )
}

export default function Schedule() {
  return (
    <section id="schedule" className="schedule">
      <SectionTitle sub="Ceremony of a Lifetime" title="婚礼日程" />
      <p className="schedule-intro">
        自正午钟响至月升星河，每一刻皆为我们与您共同书写的传世篇章
      </p>
      <div className="luxury-timeline">
        {scheduleData.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
