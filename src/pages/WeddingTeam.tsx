import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'

const API_BASE = import.meta.env.VITE_API_URL || ''

const imgUrl = (src: string) => {
  if (!src) return ''
  if (src.startsWith('/uploads/') || src.startsWith('/uploads')) return `${API_BASE}${src}`
  return src
}

interface TeamMember {
  id: number
  name: string
  name_en: string
  role: string
  role_en: string
  description: string
  image: string
  price: number
  unit: string
  highlight: string
  sort_order: number
}

export default function WeddingTeam() {
  const navigate = useNavigate()
  const [list, setList] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(6)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 从新 API 获取婚礼团队数据
  useEffect(() => {
    fetch(`${API_BASE}/api/products/wedding-teams`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setList(res.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // 搜索筛选
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.trim().toLowerCase()
    return list.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.name_en?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q) ||
      p.role_en?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }, [list, searchQuery])

  // 分页
  const displayList = useMemo(() => filteredList.slice(0, visibleCount), [filteredList, visibleCount])
  const hasMore = visibleCount < filteredList.length

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return
    setLoadingMore(true)
    setTimeout(() => {
      setVisibleCount(prev => prev + 6)
      setLoadingMore(false)
    }, 300)
  }, [loadingMore])

  // 搜索时重置分页
  useEffect(() => {
    setVisibleCount(6)
  }, [searchQuery])

  // IntersectionObserver 监听哨兵元素
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore()
        }
      },
      { rootMargin: '100px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, handleLoadMore, loadingMore])

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading">
          <div className="cd-spinner" />
          <p>加载婚礼团队数据…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cd-page">
      {/* 首屏 */}
      <section className="cd-list-hero">
        <div className="cd-list-hero__bg" style={{
          background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a2e 50%, #16213e 100%)',
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
          <p className="cd-list-hero__sub">Wedding Team</p>
          <h1 className="cd-list-hero__title">婚礼团队</h1>
          <div className="cd-list-hero__divider" />
          <p className="cd-list-hero__count">
            {list.length > 0 ? `共收录 ${list.length} 项专业服务` : '专业婚礼服务团队，为您打造完美婚礼'}
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
            placeholder="搜索服务名称、角色…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="cd-search-bar__clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 卡片列表 */}
      <div className="cd-filter-layout" style={{ display: 'block' }}>
        <div className="cd-list">
          {displayList.length > 0 ? (
            <>
              {displayList.map(item => (
                <div key={item.id} className="cd-card cd-card--team">
                  <div className="cd-card__img-wrap">
                    <FallbackImage src={imgUrl(item.image)} alt={item.name} className="cd-card__img" />
                    <div className="cd-card__img-overlay" />
                    {item.highlight && (
                      <span className="cd-card__country">{item.highlight}</span>
                    )}
                  </div>
                  <div className="cd-card__body">
                    <h3 className="cd-card__name">{item.name}</h3>
                    <p className="cd-card__tagline">{item.role || item.name_en}</p>
                    <p className="cd-card__preview">{item.description}</p>
                    <div className="cd-card__footer">
                      {item.role && (
                        <span className="cd-card__stat">✦ {item.role}</span>
                      )}
                      {item.price > 0 && (
                        <span className="cd-card__price">
                          €{item.price?.toLocaleString()}{item.unit || ''}
                        </span>
                      )}
                      <span className="cd-card__arrow">查看详情 →</span>
                    </div>
                  </div>
                </div>
              ))}
              {hasMore && (
                <>
                  {loadingMore ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={`skeleton-${i}`} className="cd-card cd-card--skeleton">
                        <div className="cd-card__img-wrap cd-skeleton__img" />
                        <div className="cd-card__body">
                          <div className="cd-skeleton__line cd-skeleton__title" />
                          <div className="cd-skeleton__line cd-skeleton__tagline" />
                          <div className="cd-skeleton__line cd-skeleton__text" />
                          <div className="cd-skeleton__line cd-skeleton__text cd-skeleton__text--short" />
                          <div className="cd-card__footer">
                            <div className="cd-skeleton__line cd-skeleton__stat" />
                            <div className="cd-skeleton__line cd-skeleton__price" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div ref={sentinelRef} className="cd-load-sentinel" />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="cd-filter__empty" style={{ gridColumn: '1 / -1' }}>
              <span className="cd-filter__empty-icon">✦</span>
              <p>{searchQuery ? '当前搜索条件下无服务' : '暂无婚礼团队服务，敬请期待'}</p>
            </div>
          )}
          {!hasMore && displayList.length > 0 && (
            <div className="cd-load-end">
              <span>— 已展示全部 {filteredList.length} 项服务 —</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
