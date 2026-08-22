import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import BackButton from '../components/common/BackButton'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import { type DressProduct } from '../data/wonaDresses'
import ewLogo from '../assets/europewedding-logo.png'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

// 将 API 返回的 snake_case 数据转为前端格式
function mapApiDetail(row: any): DressProduct {
  let highlights: string[] = []
  try { highlights = typeof row.highlights === 'string' ? JSON.parse(row.highlights) : (row.highlights || []) } catch { /* ignore */ }
  let images: string[] = []
  try { images = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []) } catch { /* ignore */ }
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    category: row.category || 'all',
    categoryCn: row.category_cn || '',
    tagline: row.tagline || '',
    desc: row.description || '',
    highlights,
    cover: row.cover_image || '',
    images,
    video: row.video_url || undefined,
    price: row.price ?? undefined,
    source: row.source_name ? { name: row.source_name, url: row.source_url || '' } : undefined,
  }
}

export default function DressesDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<DressProduct | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [heroSlide, setHeroSlide] = useState(0)
  const [heroPrev, setHeroPrev] = useState<number | null>(null)
  const [heroPaused, setHeroPaused] = useState(false)
  const [galleryLightbox, setGalleryLightbox] = useState<number | null>(null)
  const [videoLightbox, setVideoLightbox] = useState(false)
  const [galleryVideoReady, setGalleryVideoReady] = useState(false)
  const [galleryCols, setGalleryCols] = useState(3)
  const [videoReady, setVideoReady] = useState(false)
  const [videoTimedOut, setVideoTimedOut] = useState(false)
  const videoReadyRef = useRef(false)
  const aboutRef = useRef<HTMLElement>(null)
  const heroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 从 API 获取详情数据
  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setDataLoading(true)
    fetch(`${API_BASE}/api/products/crawled-dresses/${slug}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return
        if (json.success && json.data) {
          setDetail(mapApiDetail(json.data))
        } else {
          setDetail(null)
        }
      })
      .catch(err => {
        console.error('获取礼服详情失败:', err)
        if (!cancelled) setDetail(null)
      })
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  // 响应列数：宽屏 3 列，窄屏 2 列，手机 1 列
  useEffect(() => {
    const update = () => setGalleryCols(window.innerWidth >= 1100 ? 3 : window.innerWidth >= 500 ? 2 : 1)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // 检查是否已预定
  useEffect(() => {
    if (detail) setIsBooked(isProductSelected('dress', detail.slug))
  }, [detail])

  // 预定/取消预定
  const handleBook = useCallback(() => {
    if (!detail) return
    if (isBooked) {
      setIsCanceling(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        removeSelectedProduct('dress', detail.slug)
        setIsBooked(false)
        setIsCanceling(false)
      }, 1200)
    } else {
      setIsBooking(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => {
        setSelectedItem({
          categoryId: 'dress',
          productId: detail.slug,
          name: detail.name,
          nameEn: detail.nameEn,
          price: detail.price || 0,
          unit: '€',
          image: detail.cover,
        })
        setIsBooked(true)
        setIsBooking(false)
      }, 1500)
    }
  }, [detail, isBooked])

  // 加入意向单后设置列表页锚点
  useEffect(() => {
    if (isBooked && detail) sessionStorage.setItem('scroll_anchor_dresses', detail.slug)
  }, [isBooked, detail])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    if (detail) {
      setSelectedItem({
        categoryId: 'dress',
        productId: detail.slug,
        name: detail.name,
        nameEn: detail.nameEn,
        price: detail.price || 0,
        unit: '€',
        image: detail.cover,
      })
    }
    navigate('/order')
  }, [detail, navigate])

  // 视频加载：3s 超时回退轮播（已加载则跳过）
  const showVideo = !!detail?.video && !videoTimedOut
  const videoLoading = !!detail?.video && !videoReady && !videoTimedOut

  // Hero 轮播（视频播放时暂停）
  useEffect(() => {
    if (!detail || heroPaused || showVideo) return
    const total = detail.images.length
    if (total <= 1) return
    const timer = setInterval(() => {
      setHeroSlide(prev => {
        setHeroPrev(prev)
        setTimeout(() => setHeroPrev(null), 650)
        return (prev + 1) % total
      })
    }, 4000)
    return () => clearInterval(timer)
  }, [detail, heroPaused, showVideo])

  const pauseHeroCarousel = useCallback(() => {
    setHeroPaused(true)
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current)
    heroTimerRef.current = setTimeout(() => setHeroPaused(false), 5000)
  }, [])

  const goHeroSlide = useCallback((idx: number) => {
    if (idx === heroSlide) return
    setHeroPrev(heroSlide); setHeroSlide(idx)
    pauseHeroCarousel()
    setTimeout(() => setHeroPrev(null), 650)
  }, [heroSlide, pauseHeroCarousel])

  useEffect(() => {
    return () => { if (heroTimerRef.current) clearTimeout(heroTimerRef.current) }
  }, [])

  useEffect(() => { window.scrollTo({ top: 0 }) }, [])

  useEffect(() => {
    if (!detail?.video) return
    setVideoReady(false)
    videoReadyRef.current = false
    setVideoTimedOut(false)
    // 2s 后检测视频是否真正在播放（微信等浏览器 canplay 会触发但 autoplay 被阻止）
    const timer = setTimeout(() => {
      if (!videoReadyRef.current) setVideoTimedOut(true)
    }, 2000)
    return () => clearTimeout(timer)
  }, [detail?.video])

  useEffect(() => {
    if (!aboutRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) setShowBar(true)
        else setShowBar(false)
      },
      { threshold: 0 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [detail])

  if (dataLoading) {
    return (
      <div className="cd-page">
        <section className="wt-hero">
          <div className="wt-hero__bg">
            <div className="wt-hero__shimmer" />
            <div className="wt-hero__overlay" />
          </div>
          <BackButton to="/dresses" />
          <div className="wt-hero__info">
            <div className="wt-hero__headshot">
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div className="wt-hero__meta">
              <div style={{ height: 14, width: '35%', borderRadius: 4, marginBottom: 12, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 22, width: '50%', borderRadius: 4, marginBottom: 8, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 14, width: '30%', borderRadius: 4, marginBottom: 14, background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ height: 1, width: '40%', background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
              <div style={{ height: 14, width: '60%', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <BackButton to="/dresses" />
        <div className="cd-loading"><p>未找到该礼服作品</p></div>
      </div>
    )
  }

  return (
    <div className="cd-page">
      {/* ===== 1. Hero 区域（wt-hero 轮播风格） ===== */}
      <section className="wt-hero">
        <div className="wt-hero__bg">
          {/* 视频骨架屏 */}
          {videoLoading && <div className="wt-hero__shimmer" />}
          {/* 视频 or 轮播 */}
          {showVideo ? (
            <video
              className={`wt-hero__video${videoReady ? ' wt-hero__video--ready' : ''}`}
              src={detail.video}
              autoPlay muted loop playsInline
              onPlaying={() => { videoReadyRef.current = true; setVideoReady(true) }}
            />
          ) : (
            detail.images.map((img, i) => (
              <div
                key={i}
                className={`wt-hero__slide${i === heroSlide ? ' wt-hero__slide--active' : ''}${i === heroPrev ? ' wt-hero__slide--prev' : ''}`}
              >
                <FallbackImage src={img} alt={`${detail.nameEn} 作品 ${i + 1}`} className="wt-hero__img" />
              </div>
            ))
          )}
          <div className="wt-hero__overlay" />
          {isBooked && (
            <div className="photo-booked-badge">
              <svg className="photo-booked-badge__svg" viewBox="0 0 80 80" width="120" height="120">
                <path d="M20 62 C8 52, 4 38, 12 24 C16 17, 22 12, 30 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M60 62 C72 52, 76 38, 68 24 C64 17, 58 12, 50 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
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
        </div>

        <BackButton to="/dresses" />

        <div className={`wt-hero__info${isBooked ? ' wt-hero__info--booked' : ''}`}>
          <div className="wt-hero__headshot">
            <FallbackImage src={detail.cover} alt={detail.nameEn} className="wt-hero__headshot-img" />
          </div>
          <div className="wt-hero__meta">
            <span className="wt-hero__badge">{detail.categoryCn}</span>
            <h1 className="wt-hero__name">{detail.name}</h1>
            <p className="wt-hero__name-en">{detail.nameEn}</p>
            <div className="wt-hero__divider" />
            <p className="wt-hero__tagline">{detail.tagline}</p>
          </div>
        </div>

        <div className="wt-hero__scroll-hint">
          <div className="wt-hero__scroll-line" />
          <span className="wt-hero__scroll-text">Scroll</span>
        </div>

        {/* 轮播指示器（无视频或视频超时时显示） */}
        {(!showVideo) && detail.images.length > 1 && (
          <div className="wt-hero__dots">
            {detail.images.map((_, i) => (
              <button key={i} className={`wt-hero__dot${i === heroSlide ? ' wt-hero__dot--active' : ''}`} onClick={() => goHeroSlide(i)} />
            ))}
          </div>
        )}

        {/* 预定/取消加载动画 */}
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
      </section>

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* 2. 作品介绍 */}
        <section className="cd-about photo-about" ref={aboutRef}>
          <h2 className="cd-about__title">作品介绍</h2>
          <div className="cd-about__divider" />
          <div className="cd-about__body">
            {detail.desc.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* 3. 作品亮点 */}
        <section className="cd-block">
          <h2 className="cd-block__title">作品亮点</h2>
          <div className="cd-chips">
            {detail.highlights.map((h, i) => (
              <span key={i} className="cd-chip">{h}</span>
            ))}
          </div>
        </section>

        {/* 4. 作品画廊 */}
        {detail.images.length > 0 && (() => {
          const allItems: { type: 'video' | 'image'; src: string }[] = []
          if (detail.video) allItems.push({ type: 'video', src: detail.video })
          detail.images.forEach(src => allItems.push({ type: 'image', src }))
          return (
            <section className="wt-portfolio">
              <h2 className="cd-block__title">作品画廊</h2>
              <div className="wt-portfolio__wrapper">
                <div className="wt-portfolio__columns">
                  {Array.from({ length: galleryCols }).map((_, colIdx) => (
                    <div key={colIdx} className="wt-portfolio__col">
                      {allItems.filter((_, i) => i % galleryCols === colIdx).map((item, idx) => {
                        const origIdx = idx * galleryCols + colIdx
                        if (item.type === 'video') {
                          return (
                            <div key={origIdx} className="wt-portfolio__item wt-portfolio__item--video" onClick={() => setVideoLightbox(true)}>
                              {!galleryVideoReady && <div className="wt-portfolio__shimmer" />}
                              <video src={item.src} muted playsInline preload="metadata" className="wt-portfolio__video" onCanPlay={() => setGalleryVideoReady(true)} />
                              <div className="wt-portfolio__play-btn">
                                <div className="wt-portfolio__play-icon">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        const imgIdx = detail.video ? origIdx - 1 : origIdx
                        return (
                          <div key={origIdx} className="wt-portfolio__item" onClick={() => setGalleryLightbox(imgIdx)} style={{ cursor: 'zoom-in' }}>
                            <FallbackImage src={item.src} alt={`${detail.nameEn} 作品 ${origIdx + 1}`} className="wt-portfolio__img" loading="lazy" />
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })()}

        {/* Lightbox */}
        {galleryLightbox !== null && (() => {
          const total = detail.images.length
          const currentIdx = galleryLightbox
          const goPrev = () => setGalleryLightbox((currentIdx - 1 + total) % total)
          const goNext = () => setGalleryLightbox((currentIdx + 1) % total)
          return (
            <div className="photo-hero__lightbox" onClick={() => setGalleryLightbox(null)}>
              <button className="photo-hero__lightbox-close" onClick={() => setGalleryLightbox(null)}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--left" onClick={e => { e.stopPropagation(); goPrev() }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <img src={detail.images[currentIdx]} alt={`作品 ${currentIdx + 1}`} className="photo-hero__lightbox-img" onClick={e => e.stopPropagation()} />
              <button className="photo-hero__lightbox-arrow photo-hero__lightbox-arrow--right" onClick={e => { e.stopPropagation(); goNext() }}>
                <svg width="28" height="28" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" fill="none" /></svg>
              </button>
              <div className="photo-hero__lightbox-counter" onClick={e => e.stopPropagation()}>
                {currentIdx + 1} / {total}
              </div>
            </div>
          )
        })()}

        {/* 视频 Lightbox */}
        {videoLightbox && detail.video && (
          <div className="photo-hero__lightbox" onClick={() => setVideoLightbox(false)}>
            <button className="photo-hero__lightbox-close" onClick={() => setVideoLightbox(false)}>
              <svg width="28" height="28" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2" fill="none" /></svg>
            </button>
            <video
              src={detail.video}
              className="photo-hero__lightbox-img"
              autoPlay
              controls
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

      </div>

      {/* ===== 底部预定栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">起步价</span>
            {(detail.price ?? 0) > 0 ? (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold cd-book-bar__price-value--sm">€{(detail.price ?? 0).toLocaleString()}起</span>
            ) : (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--gold">需咨询</span>
            )}
          </div>
          <div className="cd-book-bar__actions">
            <button className="cd-book-bar__consult" onClick={handleConsult}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              咨询
            </button>
            <button className={`cd-book-bar__book${isBooked ? ' cd-book-bar__book--cancel' : ''}`} onClick={handleBook}>
              {isBooked ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>移出意向单</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>加入意向单</>
              )}
            </button>
          </div>
        </div>
      </div>

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
