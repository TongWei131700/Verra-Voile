import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import ewLogo from '../assets/europewedding-logo.png'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import type { WineProduct, WineCharacteristic, WineReview, WineAboutImage, WineOverview, WineOverviewAttribute, WineOverviewItem, WineBuyingOption } from './Wine'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

interface WishlistOption {
  name: string
  price: number
  qty: number
}

interface WineWishlistItem {
  productId: string
  name: string
  nameEn: string
  image: string
  basePrice: number
  unit: string
  options: Record<string, WishlistOption>
  totalPrice: number
  addedAt: number
  updatedAt: number
}

const WISHLIST_KEY = (id: string) => `wine_wishlist_${id}`

export default function WineDetail() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<WineProduct | null>(null)
  const [currentImg, setCurrentImg] = useState(0)
  const [prevImg, setPrevImg] = useState<number | null>(null)
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward')
  const [lightbox, setLightbox] = useState(false)
  const carouselTouchX = useRef<number | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  // 从 sessionStorage 恢复选中状态
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>(() => {
    const saved = sessionStorage.getItem(productId ? WISHLIST_KEY(productId) : '')
    if (saved) {
      const item: WineWishlistItem = JSON.parse(saved)
      const result: Record<number, number> = {}
      Object.entries(item.options).forEach(([idx, o]) => {
        result[Number(idx)] = o.qty
      })
      return result
    }
    return {}
  })
  const [submittedOptions, setSubmittedOptions] = useState<Record<number, number>>(() => {
    const saved = sessionStorage.getItem(productId ? WISHLIST_KEY(productId) : '')
    if (saved) {
      const item: WineWishlistItem = JSON.parse(saved)
      const result: Record<number, number> = {}
      Object.entries(item.options).forEach(([idx, o]) => {
        result[Number(idx)] = o.qty
      })
      return result
    }
    return {}
  })
  const [isBooked, setIsBooked] = useState(() => {
    return sessionStorage.getItem(productId ? WISHLIST_KEY(productId) : '') !== null
  })

  // 拉取酒水宴席商品并定位当前项
  useEffect(() => {
    fetch('/api/products/wine')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.products) {
          const found = data.data.products.find((p: WineProduct) => p.productId === productId) || null
          setDetail(found)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  // 加入意向单后设置列表页锚点
  useEffect(() => {
    if (isBooked && productId) sessionStorage.setItem('scroll_anchor_wine', productId)
  }, [isBooked, productId])

  // 检查是否有未提交的修改
  const hasUnsavedChanges = isBooked && JSON.stringify(selectedOptions) !== JSON.stringify(submittedOptions)

  // 保存意向单到 sessionStorage
  const saveToWishlist = (options: Record<number, number>) => {
    if (!detail || !productId) return
    const wishlistOptions: Record<string, WishlistOption> = {}
    let totalPrice = 0

    // 未选规格时自动取最低价格选项
    const effectiveOptions = Object.keys(options).length === 0 && detail.buyingOptions?.length
      ? { 0: 1 }
      : options

    Object.entries(effectiveOptions).forEach(([idx, qty]) => {
      const opt = detail.buyingOptions?.[Number(idx)]
      if (opt) {
        wishlistOptions[idx] = { name: opt.name, price: opt.price, qty }
        totalPrice += opt.price * qty
      }
    })

    const existing = sessionStorage.getItem(WISHLIST_KEY(productId))
    const addedAt = existing ? JSON.parse(existing).addedAt : Date.now()

    const item: WineWishlistItem = {
      productId,
      name: detail.name,
      nameEn: detail.nameEn,
      image: detail.image,
      basePrice: detail.price,
      unit: detail.unit || '£',
      options: wishlistOptions,
      totalPrice,
      addedAt,
      updatedAt: Date.now()
    }

    sessionStorage.setItem(WISHLIST_KEY(productId), JSON.stringify(item))
  }

  const removeFromWishlist = () => {
    if (!productId) return
    sessionStorage.removeItem(WISHLIST_KEY(productId))
  }

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    if (detail) {
      setSelectedItem({
        categoryId: 'wine',
        productId: detail.productId,
        name: detail.name,
        nameEn: detail.nameEn,
        price: detail.price || 0,
        unit: detail.unit || '£',
        image: detail.image,
      })
    }
    navigate('/order')
  }, [detail, navigate])

  const imgUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('/')) return `${API_BASE}${path}`
    return path
  }

  const goImg = (idx: number, dir: 'forward' | 'backward') => {
    if (idx === currentImg) return
    setSlideDir(dir)
    setPrevImg(currentImg)
    setCurrentImg(idx)
    setTimeout(() => setPrevImg(null), 650)
  }

  if (loading) {
    return (
      <div className="fpd-page">
        <div className="fpd-loading">加载中…</div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="fpd-page">
        <BackButton to="/wine" />
        <div className="fpd-loading">未找到该酒水服务</div>
      </div>
    )
  }

  const images = detail.images && detail.images.length > 0 ? detail.images : [detail.image]

  const getAttrIcon = (icon: string) => {
    const s = { stroke: '#A07A11', strokeWidth: 1.5, fill: 'none', width: 24, height: 24, viewBox: '0 0 24 24' }
    const iconSvg: Record<string, React.ReactElement> = {
      droplet: <svg {...s}><path d="M12 2.5S5 10.5 5 15a7 7 0 0014 0c0-4.5-7-12.5-7-12.5z" strokeLinejoin="round"/><path d="M9 16a3 3 0 003 3" strokeLinecap="round" opacity="0.5"/></svg>,
      glass: <svg {...s}><path d="M8 2h8l-1 7c0 2-1.5 3-3 3s-3-1-3-3L8 2z"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
      calendar: <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>,
      percent: <svg {...s}><line x1="4" y1="20" x2="20" y2="4"/><circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/></svg>,
      clock: <svg {...s}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1" fill="#A07A11"/><line x1="12" y1="12" x2="12" y2="6" strokeLinecap="round"/><line x1="12" y1="12" x2="16" y2="14" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="21"/><line x1="3" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="21" y2="12"/></svg>,
      grape: <svg {...s}><circle cx="12" cy="7" r="2.5"/><circle cx="8" cy="11" r="2.5"/><circle cx="16" cy="11" r="2.5"/><circle cx="10" cy="15" r="2.5"/><circle cx="14" cy="15" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M12 4.5V2"/></svg>,
      body: <svg {...s}><path d="M4 6h16M12 6v4M6 10h12l-2 10H8L6 10z"/><path d="M10 14h4" strokeLinecap="round"/></svg>,
      producer: <svg {...s}><path d="M3 21h18M5 21V7l7-4 7 4v14"/><rect x="9" y="13" width="6" height="8"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="15" y1="9" x2="15" y2="9.01"/></svg>,
    }
    return iconSvg[icon] || <span style={{fontSize: '1.4rem', opacity: 0.7}}>•</span>
  }

  return (
    <div className="fpd-page">
      <BackButton to="/wine" />

      {/* 左侧：图片轮播 */}
      <div className="fpd-carousel">
        <div
          className="fpd-carousel__inner"
          onClick={() => setLightbox(true)}
          onTouchStart={(e) => { carouselTouchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (carouselTouchX.current === null) return
            const diff = e.changedTouches[0].clientX - carouselTouchX.current
            carouselTouchX.current = null
            if (Math.abs(diff) < 40) return
            goImg(diff < 0 ? (currentImg + 1) % images.length : (currentImg - 1 + images.length) % images.length, diff < 0 ? 'forward' : 'backward')
          }}
        >
          {images.map((img, i) => {
            const isActive = i === currentImg
            const isPrev = i === prevImg
            const tx = isActive || isPrev ? 'translateX(0)' : `translateX(${slideDir === 'forward' ? '100%' : '-100%'})`
            return (
              <div
                key={i}
                className={`fpd-carousel__slide${isActive ? ' fpd-carousel__slide--active' : ''}${isPrev ? ' fpd-carousel__slide--prev' : ''}`}
                style={{ transform: tx }}
              >
                <FallbackImage src={imgUrl(img)} alt={detail.name} className="fpd-carousel__img" />
              </div>
            )
          })}
          {isBooked && (
            <div className="photo-booked-badge">
              <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <ellipse cx="11" cy="44" rx="3" ry="1.5" transform="rotate(-30 11 44)" fill="currentColor" opacity="0.15"/>
                <ellipse cx="69" cy="44" rx="3" ry="1.5" transform="rotate(30 69 44)" fill="currentColor" opacity="0.15"/>
                <circle cx="40" cy="8" r="1.5" fill="currentColor" opacity="0.3"/>
              </svg>
              <div className="photo-booked-badge__check">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="photo-booked-badge__text">已加入意向单</span>
            </div>
          )}
          <div className="fpd-carousel__zoom">🔍</div>
        </div>

        {/* 缩略图列表 */}
        {images.length > 1 && (
          <div className="fpd-thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                className={`fpd-thumb${i === currentImg ? ' fpd-thumb--active' : ''}`}
                onClick={() => goImg(i, i > currentImg ? 'forward' : 'backward')}
              >
                <FallbackImage
                  src={imgUrl(img)}
                  alt={`${detail.name} ${i + 1}`}
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
              onClick={() => goImg((currentImg - 1 + images.length) % images.length, 'backward')}
            >
              ‹
            </button>
            <button
              className="fpd-arrow fpd-arrow--right"
              onClick={() => goImg((currentImg + 1) % images.length, 'forward')}
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* 右侧：商品信息 */}
      <div className="fpd-info">
        <div className="fpd-info__scroll">
          <h1 className="fpd-name">{detail.name}</h1>
          <p className="fpd-name-en">{detail.nameEn}</p>
          <div className="fpd-divider" />

          <p className="fpd-price">
            {detail.unit}{detail.price}
            {detail.capacity && <span className="fpd-price-from"> / {detail.capacity}</span>}
          </p>

          {detail.tagline && (
            <p className="fpd-tagline">{detail.tagline}</p>
          )}

          {detail.sourceUrl && (
            <a className="fpd-source-link" href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              <span>访问供应商</span>
            </a>
          )}

          {/* 描述 */}
          {detail.overview?.description && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">描述</h3>
              <div className="fpd-section__text fpd-section__text--full">
                <p>{detail.overview.description}</p>
              </div>
            </div>
          )}

          {/* 概览 */}
          {detail.overview?.attributes && detail.overview.attributes.length > 0 && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">概览</h3>
              <div className="fpd-attrs">
              {detail.overview.attributes.map((attr: WineOverviewAttribute, i: number) => (
                <div key={i} className="fpd-attr">
                  <span className="fpd-attr__icon">{getAttrIcon(attr.icon)}</span>
                  <div className="fpd-attr__content">
                    <span className="fpd-attr__label">{attr.label}</span>
                    <span className="fpd-attr__value">{attr.value}</span>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

          {detail.overview?.aboutItems && detail.overview.aboutItems.length > 0 && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">关于这款酒</h3>
              <div className={`fpd-about-items${detail.overview.aboutItems.length <= 2 ? ' fpd-about-items--compact' : ''}`}>
                {detail.overview.aboutItems.map((item: WineOverviewItem, i: number) => (
                  <div key={i} className="fpd-about-item">
                    <FallbackImage
                      src={imgUrl(item.image)}
                      alt={item.title}
                      className="fpd-about-item__img"
                    />
                    <div className="fpd-about-item__info">
                      <h4 className="fpd-about-item__title">{item.title}</h4>
                      <p className="fpd-about-item__text">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 规格套餐 */}
          {detail.buyingOptions && detail.buyingOptions.length > 0 && (
            <div className="fpd-section">
              <h3 className="fpd-section__title">规格套餐</h3>
              <div className="fpd-formules">
                {detail.buyingOptions.map((opt: WineBuyingOption, idx: number) => {
                  const isSelected = selectedOptions[idx] !== undefined
                  const qty = selectedOptions[idx] || 0
                  return (
                    <div
                      key={idx}
                      className={`fpd-formule ${isSelected ? 'fpd-formule--selected' : ''}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('.fpd-formule__qty')) return
                        if (!isSelected) {
                          setSelectedOptions(prev => ({ ...prev, [idx]: 1 }))
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
                        <span className="fpd-formule__name">{opt.name}</span>
                        <span className="fpd-formule__price">{opt.unit}{opt.price}</span>
                      </div>
                      <p className="fpd-formule__desc">{opt.spec}</p>
                      {opt.note && <p className="fpd-formule__detail">{opt.note}</p>}
                      {isSelected && (
                        <div className="fpd-formule__qty">
                          <button
                            className="fpd-formule__qty-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (qty <= 1) {
                                setSelectedOptions(prev => {
                                  const next = { ...prev }
                                  delete next[idx]
                                  return next
                                })
                              } else {
                                setSelectedOptions(prev => ({ ...prev, [idx]: qty - 1 }))
                              }
                            }}
                          >−</button>
                          <span className="fpd-formule__qty-value">{qty}</span>
                          <button
                            className="fpd-formule__qty-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOptions(prev => ({ ...prev, [idx]: qty + 1 }))
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
              {Object.keys(selectedOptions).length > 0 ? '总价' : '起步价'}
            </span>
            <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">
              {Object.keys(selectedOptions).length > 0
                ? `${detail.unit}${Object.entries(selectedOptions).reduce((sum, [idx, qty]) => {
                    const opt = detail.buyingOptions![Number(idx)]
                    return sum + opt.price * qty
                  }, 0).toLocaleString()}`
                : detail.price > 0
                  ? `${detail.unit}${detail.price.toLocaleString()}`
                  : '需咨询'
              }
            </span>
          </div>
          <div className="cd-book-bar__actions">
            <button className="cd-book-bar__consult" onClick={handleConsult} title="咨询">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button
              className={`cd-book-bar__book ${isBooked ? 'cd-book-bar__book--booked' : ''}`}
              title={isBooked ? '移出意向单' : '加入意向单'}
              onClick={() => {
                if (isBooking || isCanceling) return
                if (isBooked) {
                  setIsCanceling(true)
                  setTimeout(() => {
                    setIsBooked(false)
                    setIsCanceling(false)
                    setSelectedOptions({})
                    setSubmittedOptions({})
                    removeFromWishlist()
                  }, 1500)
                } else {
                  setIsBooking(true)
                  setTimeout(() => {
                    setIsBooked(true)
                    setIsBooking(false)
                    setSubmittedOptions(selectedOptions)
                    saveToWishlist(selectedOptions)
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
                    setSubmittedOptions(selectedOptions)
                    setIsBooking(false)
                    saveToWishlist(selectedOptions)
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

      {/* 登录弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" onClick={() => setShowLoginModal(false)} />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => setShowLoginModal(false)}>✕</button>
            <h3 className="login-modal__title">登录</h3>
            <p className="login-modal__desc">登录后即可咨询订单</p>
            <LoginForm onSuccess={() => { setShowLoginModal(false); handleConsult() }} />
          </div>
        </>
      )}

      {/* 图片放大 Lightbox */}
      {lightbox && (
        <div className="fpd-lightbox" onClick={() => setLightbox(false)}>
          <button className="fpd-lightbox__close" onClick={() => setLightbox(false)}>✕</button>

          {images.length > 1 && (
            <button
              className="fpd-lightbox__arrow fpd-lightbox__arrow--left"
              onClick={(e) => { e.stopPropagation(); goImg((currentImg - 1 + images.length) % images.length, 'backward') }}
            >‹</button>
          )}

          <img
            src={imgUrl(images[currentImg])}
            alt={detail.name}
            className="fpd-lightbox__img"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { carouselTouchX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (carouselTouchX.current === null) return
              const diff = e.changedTouches[0].clientX - carouselTouchX.current
              carouselTouchX.current = null
              if (Math.abs(diff) < 40) return
              e.stopPropagation()
              goImg(diff < 0 ? (currentImg + 1) % images.length : (currentImg - 1 + images.length) % images.length, diff < 0 ? 'forward' : 'backward')
            }}
          />

          {images.length > 1 && (
            <button
              className="fpd-lightbox__arrow fpd-lightbox__arrow--right"
              onClick={(e) => { e.stopPropagation(); goImg((currentImg + 1) % images.length, 'forward') }}
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

// 登录/注册表单子组件
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSendEmailCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('请输入有效的邮箱地址'); return }
    setError(''); setEmailSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-email-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailCountdown(60)
        const timer = setInterval(() => setEmailCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 }), 1000)
      } else { setError(data.message || '发送失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setEmailSending(false) }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login-by-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code: emailCode }) })
      const data = await res.json()
      if (res.ok && data.success) { localStorage.setItem('token', data.data.token); localStorage.setItem('userEmail', data.data.email); onSuccess() }
      else { setError(data.message || '登录失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      if (loginMode === 'register' && password !== confirmPassword) { setError('两次密码不一致'); setSubmitting(false); return }
      const url = loginMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = loginMode === 'login' ? { phone, password } : { phone, password, name: phone }
      const res = await fetch(`${API_BASE}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token); localStorage.setItem('userPhone', data.data.phone); onSuccess()
      } else {
        if (data.code === 'NOT_REGISTERED') { setError('该手机号未注册，请先注册'); setLoginMode('register') }
        else if (data.code === 'ALREADY_EXISTS') { setError('该手机号已注册，请直接登录'); setLoginMode('login') }
        else { setError(data.message || (loginMode === 'login' ? '登录失败' : '注册失败')) }
      }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const switchMode = () => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setError(''); setAuthMethod('phone') }

  return (
    <>
      <div className="login-modal__tabs">
        <button type="button" className={`login-modal__tab ${loginMode === 'login' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('login'); setError('') }}>登录</button>
        <button type="button" className={`login-modal__tab ${loginMode === 'register' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('register'); setAuthMethod('phone'); setError('') }}>注册</button>
      </div>
      {loginMode === 'login' && (
        <div className="login-modal__method-tabs">
          <button type="button" className={`login-modal__method-tab ${authMethod === 'email' ? 'active' : ''}`} onClick={() => { setAuthMethod('email'); setError('') }}>邮箱</button>
          <button type="button" className={`login-modal__method-tab ${authMethod === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMethod('phone'); setError('') }}>手机号</button>
        </div>
      )}
      {authMethod === 'phone' ? (
        <form className="login-modal__form" onSubmit={handleModalSubmit}>
          <div className="login-modal__field">
            <input type="tel" placeholder="请输入手机号码" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={11} />
          </div>
          <div className="login-modal__field">
            <input type="password" placeholder="请输入密码" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {loginMode === 'register' && (
            <div className="login-modal__field">
              <input type="password" placeholder="请确认密码" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          )}
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>
            {submitting ? (loginMode === 'login' ? '登录中...' : '注册中...') : (loginMode === 'login' ? '登 录' : '注 册')}
          </button>
        </form>
      ) : (
        <form className="login-modal__form" onSubmit={handleEmailLogin}>
          <div className="login-modal__field">
            <input type="email" placeholder="请输入邮箱地址" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="login-modal__field login-modal__field--code">
            <input type="text" placeholder="请输入6位验证码" required maxLength={6} value={emailCode} onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className="login-modal__send-btn" disabled={emailCountdown > 0 || emailSending} onClick={handleSendEmailCode}>
              {emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
            </button>
          </div>
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>{submitting ? '登录中...' : '登 录'}</button>
        </form>
      )}
      <p className="login-modal__tip">
        {loginMode === 'login' ? '还没有账号？' : '已有账号？'}
        <button type="button" className="login-modal__switch" onClick={switchMode}>
          {loginMode === 'login' ? '立即注册' : '去登录'}
        </button>
      </p>
    </>
  )
}
