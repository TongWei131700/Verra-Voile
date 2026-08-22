import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import ewLogo from '../assets/europewedding-logo.png'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Formule {
  name: string
  name_cn?: string
  description?: string
  desc?: string
  price: number
  detail?: string
  diameter?: string
  recommended?: boolean
  luxury?: boolean
}

interface Accessoire {
  name: string
  price: number
}

interface Product {
  slug: string
  name: string
  name_cn: string
  price: number
  price_from: boolean
  category: string
  image: string
  images?: string[]
  desc: string
  desc_cn: string
  desc_full?: string
  desc_full_cn?: string
  conseils?: string
  conseils_cn?: string
  composition?: string
  composition_cn?: string
  delivery_info?: string
  delivery_info_cn?: string
  formules?: Formule[]
  accessoires?: Accessoire[]
}

interface WishlistFormule {
  name: string
  price: number
  qty: number
}

interface WishlistItem {
  slug: string
  name: string
  nameCn: string
  image: string
  basePrice: number
  formules: Record<string, WishlistFormule>
  totalPrice: number
  addedAt: number
  updatedAt: number
}

const WISHLIST_KEY = (slug: string) => `flower_wishlist_${slug}`

export default function FlowerProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [currentImg, setCurrentImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)
  const [selectedFormules, setSelectedFormules] = useState<Record<number, number>>(() => {
    const saved = sessionStorage.getItem(slug ? WISHLIST_KEY(slug) : '')
    if (saved) {
      const item: WishlistItem = JSON.parse(saved)
      const result: Record<number, number> = {}
      Object.entries(item.formules).forEach(([idx, f]) => {
        result[Number(idx)] = f.qty
      })
      return result
    }
    return {}
  })
  const [submittedFormules, setSubmittedFormules] = useState<Record<number, number>>(() => {
    const saved = sessionStorage.getItem(slug ? WISHLIST_KEY(slug) : '')
    if (saved) {
      const item: WishlistItem = JSON.parse(saved)
      const result: Record<number, number> = {}
      Object.entries(item.formules).forEach(([idx, f]) => {
        result[Number(idx)] = f.qty
      })
      return result
    }
    return {}
  })
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isBooked, setIsBooked] = useState(() => {
    return sessionStorage.getItem(slug ? WISHLIST_KEY(slug) : '') !== null
  })

  // 检查是否有未提交的修改
  const hasUnsavedChanges = isBooked && JSON.stringify(selectedFormules) !== JSON.stringify(submittedFormules)

  // 保存产品信息到 sessionStorage
  const saveToWishlist = (formules: Record<number, number>) => {
    if (!product || !slug) return
    const wishlistFormules: Record<string, WishlistFormule> = {}
    let totalPrice = product.price
    
    Object.entries(formules).forEach(([idx, qty]) => {
      const formule = product.formules?.[Number(idx)]
      if (formule) {
        wishlistFormules[idx] = {
          name: formule.name,
          price: formule.price,
          qty
        }
        totalPrice += formule.price * qty
      }
    })

    const existing = sessionStorage.getItem(WISHLIST_KEY(slug))
    const addedAt = existing ? JSON.parse(existing).addedAt : Date.now()

    const item: WishlistItem = {
      slug,
      name: product.name,
      nameCn: product.name_cn,
      image: product.image,
      basePrice: product.price,
      formules: wishlistFormules,
      totalPrice,
      addedAt,
      updatedAt: Date.now()
    }
    
    sessionStorage.setItem(WISHLIST_KEY(slug), JSON.stringify(item))
  }

  // 从 sessionStorage 移除
  const removeFromWishlist = () => {
    if (!slug) return
    sessionStorage.removeItem(WISHLIST_KEY(slug))
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/products/crawled-florists/florajet`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const products = typeof res.data.fresh_flower_products === 'string'
            ? JSON.parse(res.data.fresh_flower_products)
            : res.data.fresh_flower_products
          const found = products.find((p: Product) => p.slug === slug)
          if (found) {
            // Build images array - for now just the single image
            const imgs = found.images || [found.image]
            setProduct({ ...found, images: imgs })
          }
        }
      })
      .catch(err => console.error('加载商品失败:', err))
      .finally(() => setLoading(false))
  }, [slug])

  const imgUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('/')) return `${API_BASE}${path}`
    return path
  }

  if (loading) {
    return (
      <div className="fpd-page">
        <div className="fpd-loading">加载中…</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="fpd-page">
        <div className="fpd-loading">商品不存在</div>
      </div>
    )
  }

  const images = product.images || [product.image]

  return (
    <div className="fpd-page">
      <BackButton to="/flowers" />

      {/* 左侧：图片轮播 */}
      <div className="fpd-carousel">
        <div className="fpd-carousel__inner" onClick={() => setLightbox(true)}>
          <FallbackImage
            src={imgUrl(images[currentImg])}
            alt={product.name_cn}
            className="fpd-carousel__img"
          />
          <div className="fpd-carousel__zoom">🔍</div>
        </div>

        {/* 缩略图列表 */}
        {images.length > 1 && (
          <div className="fpd-thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                className={`fpd-thumb${i === currentImg ? ' fpd-thumb--active' : ''}`}
                onClick={() => setCurrentImg(i)}
              >
                <FallbackImage
                  src={imgUrl(img)}
                  alt={`${product.name_cn} ${i + 1}`}
                  className="fpd-thumb__img"
                />
              </button>
            ))}
          </div>
        )}

        {/* 左右箭头 */}
        {images.length > 1 && (
          <>
            <button
              className="fpd-arrow fpd-arrow--left"
              onClick={() => setCurrentImg(i => (i - 1 + images.length) % images.length)}
            >
              ‹
            </button>
            <button
              className="fpd-arrow fpd-arrow--right"
              onClick={() => setCurrentImg(i => (i + 1) % images.length)}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 右侧：商品信息 */}
      <div className="fpd-info">
        <div className="fpd-info__scroll">
          <h1 className="fpd-name">{product.name_cn}</h1>
          <p className="fpd-name-en">{product.name}</p>
          <div className="fpd-divider" />
      
          <p className="fpd-price">
            €{product.price}
            {product.price_from && <span className="fpd-price-from"> 起</span>}
          </p>
      
          {/* 产品描述 */}
          {(product.desc_full_cn || product.desc_full) && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">产品描述</h3>
              <p className="fpd-section__text fpd-section__text--full">{product.desc_full_cn || product.desc_full}</p>
            </div>
          )}
          
          {/* 花材组成 */}
          {(product.composition_cn || product.composition) && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">花材组成</h3>
              <p className="fpd-section__text fpd-section__text--full">{product.composition_cn || product.composition}</p>
            </div>
          )}
          
          {/* 规格套餐 */}
          {product.formules && product.formules.length > 0 && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">规格套餐</h3>
              <div className="fpd-formules">
                {product.formules.map((formule, idx) => {
                  const isSelected = selectedFormules[idx] !== undefined
                  const qty = selectedFormules[idx] || 0
                  return (
                    <div 
                      key={idx}
                      className={`fpd-formule ${isSelected ? 'fpd-formule--selected' : ''}`}
                      onClick={(e) => {
                        // 避免点击数量按钮时触发选中
                        if ((e.target as HTMLElement).closest('.fpd-formule__qty')) return
                        if (!isSelected) {
                          setSelectedFormules(prev => ({ ...prev, [idx]: 1 }))
                        }
                      }}
                    >
                      {isSelected && (
                        <div className="fpd-formule__check">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                      <div className="fpd-formule__header">
                        <span className="fpd-formule__name">
                          {formule.name_cn || formule.name}
                          {formule.recommended && <span className="fpd-formule__recommended"> (推荐)</span>}
                          {formule.luxury && <span className="fpd-formule__luxury"> (豪华)</span>}
                        </span>
                        <span className="fpd-formule__price">€{formule.price}</span>
                      </div>
                      <p className="fpd-formule__desc">{formule.desc || formule.description}</p>
                      {formule.detail && (
                        <p className="fpd-formule__detail">{formule.detail}</p>
                      )}
                      {formule.diameter && (
                        <p className="fpd-formule__diameter">尺寸: {formule.diameter}</p>
                      )}
                      {isSelected && (
                        <div className="fpd-formule__qty">
                          <button 
                            className="fpd-formule__qty-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (qty <= 1) {
                                // 数量为1时再减，取消选中
                                setSelectedFormules(prev => {
                                  const next = { ...prev }
                                  delete next[idx]
                                  return next
                                })
                              } else {
                                setSelectedFormules(prev => ({
                                  ...prev,
                                  [idx]: qty - 1
                                }))
                              }
                            }}
                          >−</button>
                          <span className="fpd-formule__qty-value">{qty}</span>
                          <button 
                            className="fpd-formule__qty-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedFormules(prev => ({
                                ...prev,
                                [idx]: qty + 1
                              }))
                            }}
                          >+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="cd-book-bar cd-book-bar--visible">
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">
              {Object.keys(selectedFormules).length > 0 ? '总价' : '起步价'}
            </span>
            <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">
              {Object.keys(selectedFormules).length > 0
                ? `€${Object.entries(selectedFormules).reduce((sum, [idx, qty]) => {
                    const formule = product.formules![Number(idx)]
                    return sum + formule.price * qty
                  }, 0).toFixed(2)}`
                : `€${product.price}`
              }
            </span>
          </div>
          <div className="cd-book-bar__actions">
            <button className="cd-book-bar__consult" title="咨询">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button 
              className={`cd-book-bar__book ${isBooked ? 'cd-book-bar__book--booked' : ''}`}
              title={isBooked ? "移出意向单" : "加入意向单"}
              onClick={() => {
                if (isBooking || isCanceling) return
                if (isBooked) {
                  // 清空操作
                  setIsCanceling(true)
                  setTimeout(() => {
                    setIsBooked(false)
                    setIsCanceling(false)
                    setSelectedFormules({})
                    setSubmittedFormules({})
                    removeFromWishlist()
                  }, 1500)
                } else {
                  // 加入操作
                  setIsBooking(true)
                  setTimeout(() => {
                    setIsBooked(true)
                    setIsBooking(false)
                    setSubmittedFormules(selectedFormules)
                    saveToWishlist(selectedFormules)
                  }, 1500)
                }
              }}
            >
              {isBooked ? '移出意向单' : '加入意向单'}
            </button>
            {hasUnsavedChanges && (
              <button 
                className="cd-book-bar__book"
                onClick={() => {
                  if (isBooking) return
                  setIsBooking(true)
                  setTimeout(() => {
                    setSubmittedFormules(selectedFormules)
                    setIsBooking(false)
                    saveToWishlist(selectedFormules)
                  }, 1500)
                }}
              >
                更新
              </button>
            )}
          </div>
        </div>
      </div>
      {/* 加入/移出意向单动画 */}
      {(isBooking || isCanceling) && (
        <div className="photo-booking-overlay">
          <div className="photo-booking-gift">
            <div className="photo-booking-gift__lid" />
            <div className="photo-booking-gift__box">
              <img src={ewLogo} alt="" className="photo-booking-gift__logo" />
            </div>
            <div className="photo-booking-gift__sparkles">
              <span /><span /><span /><span /><span /><span />
            </div>
          </div>
          <p className="photo-booking-text">{isCanceling ? '正在移出意向单…' : '正在加入意向单…'}</p>
        </div>
      )}

      {/* 图片放大 Lightbox */}
      {lightbox && (
        <div className="fpd-lightbox" onClick={() => setLightbox(false)}>
          <button className="fpd-lightbox__close" onClick={() => setLightbox(false)}>✕</button>

          {images.length > 1 && (
            <button
              className="fpd-lightbox__arrow fpd-lightbox__arrow--left"
              onClick={(e) => { e.stopPropagation(); setCurrentImg(i => (i - 1 + images.length) % images.length) }}
            >‹</button>
          )}

          <img
            src={imgUrl(images[currentImg])}
            alt={product.name_cn}
            className="fpd-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              className="fpd-lightbox__arrow fpd-lightbox__arrow--right"
              onClick={(e) => { e.stopPropagation(); setCurrentImg(i => (i + 1) % images.length) }}
            >›</button>
          )}

          {images.length > 1 && (
            <div className="fpd-lightbox__counter">
              {currentImg + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
