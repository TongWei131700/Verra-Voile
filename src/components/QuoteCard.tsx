import type { Venue } from '../data/venues'

interface QuoteCardProps {
  venue: Venue
}

export default function QuoteCard({ venue }: QuoteCardProps) {
  return (
    <div className="quote-card">
      {/* 图片区 */}
      <div className="quote-card__img">
        <img src={venue.img} alt={venue.name} loading="lazy" />
        {venue.highlight && (
          <span className="quote-card__badge">{venue.highlight}</span>
        )}
      </div>

      {/* 信息区 */}
      <div className="quote-card__body">
        {/* 标题行 */}
        <p className="quote-card__en">{venue.nameEn}</p>
        <h4 className="quote-card__name">{venue.name}</h4>

        {/* 描述 */}
        <p className="quote-card__desc">{venue.desc}</p>

        {/* 分隔线 */}
        <div className="quote-card__divider" />

        {/* 价格 */}
        <div className="quote-card__price">
          <span className="quote-card__price-num">{venue.price}</span>
          <span className="quote-card__price-unit">{venue.unit}</span>
        </div>

        {/* 特点 */}
        <div className="quote-card__feature">
          <span>{venue.capacity}</span>
        </div>
      </div>
    </div>
  )
}
