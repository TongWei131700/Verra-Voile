import { useEffect } from 'react'
import type { Venue } from '../data/venues'
import FallbackImage from './common/FallbackImage'

interface VenuePanelDesktopProps {
  venue: Venue
  onClose: () => void
  onBook: (venue: Venue) => void
  booked?: boolean
  onCancel?: (venue: Venue) => void
  loading?: boolean
}

export default function VenuePanelDesktop({ venue, onClose, onBook, booked, onCancel, loading }: VenuePanelDesktopProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      <div className="venue-panel-backdrop venue-panel-backdrop--open" onClick={onClose} />

      <div className="vp-desktop">
        {/* 左侧图片 */}
        <div className="vp-desktop__img">
          {loading ? (
            <div className="vp-skeleton__img shimmer" />
          ) : (
            <FallbackImage src={venue.img} alt={venue.name} />
          )}
        </div>

        {/* 右侧内容 */}
        <div className="vp-desktop__main">
          <button type="button" className="venue-panel__close" onClick={onClose}>✕</button>

          <div className="vp-desktop__content">
            {loading ? (
              <>
                <div className="vp-skeleton__line vp-skeleton__line--sm shimmer" style={{ width: '40%' }} />
                <div className="vp-skeleton__line vp-skeleton__line--lg shimmer" style={{ width: '65%' }} />
                <div className="venue-panel__divider" />
                <div className="vp-skeleton__line vp-skeleton__line--md shimmer" style={{ width: '30%' }} />
                <div className="vp-skeleton__line shimmer" style={{ width: '100%', marginTop: 8 }} />
                <div className="vp-skeleton__line shimmer" style={{ width: '90%' }} />
                <div className="vp-skeleton__line shimmer" style={{ width: '70%' }} />
                <div className="vp-skeleton__line vp-skeleton__line--md shimmer" style={{ width: '30%', marginTop: 20 }} />
                <div className="vp-skeleton__line shimmer" style={{ width: '50%', marginTop: 8 }} />
              </>
            ) : (
              <>
                <p className="venue-panel__en">{venue.nameEn}</p>
                <h2 className="venue-panel__name">
                  {venue.name}
                  {booked && <span className="venue-panel__selected-badge">✓ 已选中</span>}
                </h2>

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
              </>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="venue-panel__bar">
            {loading ? (
              <>
                <div className="vp-skeleton__line vp-skeleton__line--md shimmer" style={{ width: 80 }} />
                <div className="vp-skeleton__btn shimmer" />
              </>
            ) : booked ? (
              <div className="venue-panel__btn-wrap" style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className="venue-panel__btn venue-panel__btn--cancel"
                  onClick={() => onCancel && onCancel(venue)}
                >
                  取消选中
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
