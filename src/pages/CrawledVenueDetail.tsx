import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import GalleryCarousel from '../components/common/GalleryCarousel'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

const imgUrl = (src: string) => {
  if (!src) return ''
  if (src.startsWith('/uploads/') || src.startsWith('/uploads')) return `${API_BASE}${src}`
  return src
}

interface VenueData {
  id: number; slug: string; name: string; name_cn: string
  country: string; country_cn: string; source_url: string; tagline: string
  description: string; images: string[]; cover_image: string
  features: string[]
  venue_types: { name: string; name_en: string }[]
  towns: { name: string; name_cn: string }[]
  budget_ranges: { label: string; min: number; max: number | null }[]
  guest_capacities: string[]
  faq: { q: string; a: string }[] | null
  rating: string; review_count: string; location: string
}

export default function CrawledVenueDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [detail, setDetail] = useState<VenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set())
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const aboutRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()

  // 检查是否已预定
  useEffect(() => {
    if (detail) {
      setIsBooked(isProductSelected('destination', detail.slug))
    }
  }, [detail])

  // 预定/取消预定处理
  const handleBook = useCallback(() => {
    if (!detail) return
    if (isBooked) {
      removeSelectedProduct('destination', detail.slug)
      setIsBooked(false)
    } else {
      setSelectedItem({
        categoryId: 'destination',
        productId: detail.slug,
        name: detail.name_cn || detail.name,
        nameEn: detail.name,
        price: detail.budget_ranges?.[0]?.min || 0,
        unit: '€',
        image: detail.cover_image,
      })
      setIsBooked(true)
    }
  }, [detail, isBooked])

  // 咨询按钮点击处理
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    if (detail) {
      setSelectedItem({
        categoryId: 'destination',
        productId: detail.slug,
        name: detail.name_cn || detail.name,
        nameEn: detail.name,
        price: detail.budget_ranges?.[0]?.min || 0,
        unit: '€',
        image: detail.cover_image,
      })
    }
    navigate('/order')
  }, [detail, navigate])

  const toggleFaq = (idx: number) => {
    setOpenFaq(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    window.scrollTo(0, 0)
    fetch(`${API_BASE}/api/products/crawled-venues/${slug}`)
      .then(r => r.json())
      .then(res => { if (res.success) setDetail(res.data) })
      .finally(() => setLoading(false))
  }, [slug])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  useEffect(() => {
    if (!aboutRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setShowBar(true)
        } else {
          setShowBar(false)
        }
      },
      { threshold: 0 }
    )
    observer.observe(aboutRef.current)
    return () => observer.disconnect()
  }, [loading])

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading">
          <div className="cd-spinner" />
          <p>加载场地数据…</p>
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <div className="cd-loading"><p>未找到场地数据</p></div>
      </div>
    )
  }

  const imgs = detail.images || []
  const lowestBudget = detail.budget_ranges?.reduce((prev, curr) =>
    curr.min < prev.min ? curr : prev
  , detail.budget_ranges?.[0])

  return (
    <div className="cd-page">
      {/* 返回按钮 */}
      <button className="cd-back" onClick={() => window.history.back()}>← 返回</button>

      {/* ===== 1. 全屏首图 Hero ===== */}
      <section className="cd-hero">
        <div className="cd-hero__parallax" style={{ transform: `translateY(${scrollY * 0.35}px)` }}>
          <FallbackImage src={imgUrl(detail.cover_image)} alt={detail.name_cn || detail.name} className="cd-hero__img" />
        </div>
        <div className="cd-hero__overlay" />
        <div className="cd-hero__content">
          <span className="cd-hero__badge">{detail.country_cn}{detail.rating ? ` · ★${detail.rating}` : ''}</span>
          <h1 className="cd-hero__title">{detail.name_cn || detail.name}</h1>
          <div className="cd-hero__divider" />
          <p className="cd-hero__tagline">{detail.tagline || detail.location}</p>
        </div>
        <div className="cd-hero__scroll" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          <span>向下探索</span>
          <svg width="20" height="12" viewBox="0 0 20 12"><path d="M1 1l9 9 9-9" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>
        </div>
      </section>

      {/* ===== 图片画廊 ===== */}
      <GalleryCarousel images={imgs.map(imgUrl)} />

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* ===== 2. 场地描述 ===== */}
        <section className="cd-about" ref={aboutRef}>
          <h2 className="cd-about__title">关于这里</h2>
          <div className="cd-about__divider" />
          <div className="cd-about__body">
            {detail.description.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* ===== 3. 特色亮点 + 场地类型/位置 ===== */}
        <section className="cd-duo">
          <div className="cd-duo__col">
            <h2 className="cd-block__title">特色亮点</h2>
            <ul className="cd-highlights">
              {detail.features.map((f, i) => (
                <li key={i} className="cd-highlights__item">
                  <span className="cd-highlights__dot" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="cd-duo__col">
            <h2 className="cd-block__title">场地类型</h2>
            <div className="cd-chips">
              {detail.venue_types.map((v, i) => (
                <span key={i} className="cd-chip">{v.name}</span>
              ))}
            </div>

            <h2 className="cd-block__title cd-block__title--mt">位置</h2>
            <div className="cd-chips">
              {detail.towns.map((t, i) => (
                <span key={i} className="cd-chip cd-chip--location">{t.name_cn}</span>
              ))}
              <span className="cd-chip cd-chip--country">{detail.country_cn}</span>
            </div>
            {detail.location && (
              <>
                <h2 className="cd-block__title cd-block__title--mt">详细地址</h2>
                <p className="cd-about__body" style={{ fontSize: '0.95rem', opacity: 0.85 }}>{detail.location}</p>
              </>
            )}
          </div>
        </section>

        {/* ===== 预算参考 + 宾客规模 ===== */}
        {detail.budget_ranges?.length > 0 && (
          <section className="cd-block cd-block--alt">
            {lowestBudget && lowestBudget.min > 0 && (
              <>
                <h2 className="cd-block__title">预算参考</h2>
                <div className="cd-budget-lowest">
                  <span className="cd-budget-lowest__tag">€{lowestBudget.min.toLocaleString()} 起</span>
                  <p className="cd-budget-lowest__note">具体费用根据您的婚礼需求定制</p>
                </div>
              </>
            )}
            {detail.budget_ranges.map((b, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{b.label}</span>
              </div>
            ))}

            <h2 className="cd-block__title" style={{ marginTop: 32 }}>宾客规模</h2>
            <div className="cd-chips">
              {detail.guest_capacities.map((g, i) => (
                <span key={i} className="cd-chip">{g}</span>
              ))}
            </div>
          </section>
        )}

        {/* ===== FAQ ===== */}
        {detail.faq && detail.faq.length > 0 && (
          <section className="cd-faq">
            <h2 className="cd-block__title">常见问题</h2>
            <p className="cd-faq__subtitle">{detail.name_cn || detail.name} 常见问题</p>
            <div className="cd-faq__accordion">
              {detail.faq.map((item, i) => (
                <div key={i} className={`cd-faq__item${openFaq.has(i) ? ' cd-faq__item--open' : ''}`}>
                  <button className="cd-faq__question" onClick={() => toggleFaq(i)}>
                    <span>{item.q}</span>
                    <svg className={`cd-faq__arrow${openFaq.has(i) ? ' cd-faq__arrow--open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {openFaq.has(i) && (
                    <div className="cd-faq__answer">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 来源 */}
        <section className="cd-source">
          <p>数据来源：<a href={detail.source_url} target="_blank" rel="noreferrer">{detail.source_url}</a></p>
        </section>
      </div>

      {/* ===== 底部预定栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">起步价</span>
            <span className="cd-book-bar__price-value cd-book-bar__price-value--red">{lowestBudget && lowestBudget.min > 0 ? `€${lowestBudget.min.toLocaleString()}` : '？'}</span>
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
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>取消预定</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>立即预定</>
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
            <h3 className="login-modal__title">欢迎回来</h3>
            <p className="login-modal__desc">登录后即可咨询订单</p>
            <LoginForm onSuccess={() => { setShowLoginModal(false); handleConsult() }} />
          </div>
        </>
      )}
    </div>
  )
}

// 登录表单子组件
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)

  const handleSendEmailCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setError('')
    setEmailSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailCountdown(60)
        const timer = setInterval(() => {
          setEmailCountdown(prev => {
            if (prev <= 1) { clearInterval(timer); return 0 }
            return prev - 1
          })
        }, 1000)
      } else {
        setError(data.message || '发送失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setEmailSending(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login-by-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: emailCode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userEmail', data.data.email)
        onSuccess()
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userPhone', data.data.phone)
        onSuccess()
      } else {
        if (data.code === 'NOT_REGISTERED') {
          setError('该手机号未注册，请先注册')
        } else {
          setError(data.message || '登录失败')
        }
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="login-modal__method-tabs">
        <button type="button" className={`login-modal__method-tab ${authMethod === 'email' ? 'active' : ''}`} onClick={() => { setAuthMethod('email'); setError('') }}>邮箱</button>
        <button type="button" className={`login-modal__method-tab ${authMethod === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMethod('phone'); setError('') }}>手机号</button>
      </div>
      {authMethod === 'email' ? (
        <form className="login-modal__form" onSubmit={handleEmailLogin}>
          <div className="login-modal__field">
            <input type="email" placeholder="请输入邮箱地址" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="login-modal__field login-modal__field--code">
            <input type="text" placeholder="验证码" required value={emailCode} onChange={e => setEmailCode(e.target.value)} maxLength={6} />
            <button type="button" className="login-modal__code-btn" onClick={handleSendEmailCode} disabled={emailSending || emailCountdown > 0}>
              {emailCountdown > 0 ? `${emailCountdown}s` : emailSending ? '发送中...' : '获取验证码'}
            </button>
          </div>
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>{submitting ? '登录中...' : '登 录'}</button>
        </form>
      ) : (
        <form className="login-modal__form" onSubmit={handlePhoneLogin}>
          <div className="login-modal__field">
            <input type="tel" placeholder="请输入手机号码" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={11} />
          </div>
          <div className="login-modal__field">
            <input type="password" placeholder="请输入密码" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <p className="login-modal__error">{error}</p>}
          <button type="submit" className="login-modal__submit" disabled={submitting}>{submitting ? '登录中...' : '登 录'}</button>
        </form>
      )}
    </>
  )
}
