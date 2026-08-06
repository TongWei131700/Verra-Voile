import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import { photoCategoryList, photographerProducts, type PhotographerProduct, type PhotoCategory } from '../data/junebugPhotographers'

const allProducts: PhotographerProduct[] = photographerProducts

const HERO_IMG = 'https://images.junebugweddings.com/09/9f/099f0d9d40804819.jpg'

export default function Photography() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<PhotoCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredList = useMemo(() => {
    let list = category === 'all' ? allProducts : allProducts.filter(p => p.category === category)
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q)
      )
    }
    return list
  }, [category, searchQuery])

  return (
    <div className="cd-page">
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          width: '100%', height: '100%'
        }} />
        <div className="cd-list-hero__overlay" />
        <button className="cd-list-hero__back" onClick={() => navigate('/listing')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>返回</span>
        </button>
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Wedding Photography</p>
          <h1 className="cd-list-hero__title">摄影</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allProducts.length > 0 ? `共收录 ${allProducts.length} 位严选摄影师` : '记录每一个珍贵瞬间'}
          </p>
        </div>
      </section>

      {/* 搜索框 */}
      <div className="cd-search-bar">
        <div className="cd-search-bar__inner">
          <svg className="cd-search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="cd-search-bar__input"
            type="text"
            placeholder="搜索摄影师名称、风格…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="floral-filter-tabs">
        {photoCategoryList.map(c => (
          <button
            key={c.key}
            type="button"
            className={`floral-filter-tab${category === c.key ? ' floral-filter-tab--active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 商品卡片列表 */}
      <div className="cd-filter-layout" style={{ display: 'block' }}>
        <div className="cd-list">
          {filteredList.length > 0 ? (
            <>
              {filteredList.map(item => (
                <div key={item.slug} className="cd-card" onClick={() => navigate(`/photography/${item.slug}`)}>
                  <div className="cd-card__img-wrap">
                    <FallbackImage src={item.cover} alt={item.name} className="cd-card__img" />
                    <div className="cd-card__img-overlay" />
                    <span className="cd-card__country">{item.categoryCn}</span>
                  </div>
                  <div className="cd-card__body">
                    <h3 className="cd-card__name">{item.name}</h3>
                    <p className="cd-card__tagline">{item.tagline}</p>
                    <p className="cd-card__preview">{item.desc}</p>
                    <div className="cd-card__footer">
                      {item.highlights.slice(0, 2).map(h => (
                        <span key={h} className="cd-card__stat">✦ {h}</span>
                      ))}
                      <span className="cd-card__arrow">查看详情 →</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="cd-load-end">
                <span>— 已展示全部 {filteredList.length} 位摄影师 —</span>
              </div>
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{searchQuery ? '当前搜索条件下无摄影师' : '该分类下暂无摄影师'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
