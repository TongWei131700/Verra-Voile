import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { floralCategoryList, floralProducts, type FloralProduct, type FloralCategory } from '../data/floralWorks'
import { florajetProducts } from '../data/florajetFlowers'

// 全部花卉商品：Greenfield 婚礼花艺 + Florajet 爬取商品（测试数据）
const allProducts: FloralProduct[] = [...floralProducts, ...florajetProducts]

const HERO_IMG = 'https://images.squarespace-cdn.com/content/v1/677c4cad8635c35334d5863d/62458890-9284-406a-9f06-14e3c3646027/IMG_2891.jpg'

export default function Flowers() {
  const navigate = useNavigate()
  const [category, setCategory] = useState<FloralCategory>('all')
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
        <BackButton />
        <div className="cd-list-hero__content">
          <p className="cd-list-hero__sub">Wedding Florals</p>
          <h1 className="cd-list-hero__title">花卉</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {allProducts.length > 0 ? `共收录 ${allProducts.length} 件花艺作品` : '可持续 · 当季 · 让自然主导设计'}
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
            placeholder="搜索花艺作品名称、风格…"
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
        {floralCategoryList.map(c => (
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
                <div key={item.slug} className="cd-card" onClick={() => navigate(`/flowers/${item.slug}`)}>
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
                      <span className="cd-card__arrow">{item.price ? `€${item.price.toFixed(2)} 起 →` : '查看详情 →'}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="cd-load-end">
                <span>— 已展示全部 {filteredList.length} 件作品 —</span>
              </div>
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{searchQuery ? '当前搜索条件下无花艺作品' : '该分类下暂无作品'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
