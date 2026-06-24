import { useEffect } from 'react'
import type { Venue } from '../data/venues'

interface VenuePanelProps {
  venue: Venue | null
  onClose: () => void
  onBook: (venue: Venue) => void
}

export default function VenuePanel({ venue, onClose, onBook }: VenuePanelProps) {
  // 面板打开时锁定外部滚动
  useEffect(() => {
    if (venue) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [venue])

  if (!venue) return null

  return (
    <>
      {/* Backdrop */}
      <div className={`venue-panel-backdrop ${venue ? 'venue-panel-backdrop--open' : ''}`} onClick={onClose} />

      {/* Panel */}
      <div className={`venue-panel ${venue ? 'venue-panel--open' : ''}`}>
        {/* 关闭按钮 */}
        <button type="button" className="venue-panel__close" onClick={onClose}>✕</button>

        {/* 顶部图片 */}
        <div className="venue-panel__img">
          <img src={venue.img} alt={venue.name} />
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="venue-panel__content">
          <p className="venue-panel__en">{venue.nameEn}</p>
          <h2 className="venue-panel__name">{venue.name}</h2>

          <div className="venue-panel__divider" />

          <h4 className="venue-panel__section-title">场地特色</h4>
          <p className="venue-panel__desc">{venue.desc}</p>

          <div className="venue-panel__features">
            <div className="venue-panel__feature-item">
              <span className="venue-panel__feature-label">容纳规模</span>
              <span className="venue-panel__feature-value">{venue.capacity}</span>
            </div>
          </div>

          <h4 className="venue-panel__section-title">服务包含</h4>
          <ul className="venue-panel__list">
            <li>专属婚礼策划师全程跟进</li>
            <li>场地布置与花艺设计</li>
            <li>摄影摄像团队协调</li>
            <li>宾客动线规划</li>
          </ul>
        </div>

        {/* 底部操作栏 */}
        <div className="venue-panel__bar">
          <div className="venue-panel__bar-price">
            <span className="venue-panel__bar-price-num">{venue.price}</span>
            <span className="venue-panel__bar-price-unit">{venue.unit}</span>
          </div>
          <div className="venue-panel__btn-wrap">
            {venue.highlight && (
              <span className="venue-panel__bar-badge">🔥 {venue.highlight}</span>
            )}
            <button type="button" className="venue-panel__btn venue-panel__btn--book" onClick={() => onBook(venue)}>
              立即预定
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
