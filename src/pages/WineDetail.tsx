import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import GalleryCarousel from '../components/common/GalleryCarousel'
import { setSelectedItem, isProductSelected, removeSelectedProduct } from '../utils/selectedProducts'
import type { WineProduct } from './Wine'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function WineDetail() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)
  const [showBar, setShowBar] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isBooked, setIsBooked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<WineProduct | null>(null)
  const aboutRef = useRef<HTMLElement>(null)

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

  // 检查是否已预定
  useEffect(() => {
    if (detail) setIsBooked(isProductSelected('wine', detail.productId))
  }, [detail])

  const buildSelectedItem = useCallback(() => {
    if (!detail) return null
    return {
      categoryId: 'wine',
      productId: detail.productId,
      name: detail.name,
      nameEn: detail.nameEn,
      price: detail.price || 0,
      unit: detail.unit || '€',
      image: detail.image,
    }
  }, [detail])

  // 预定/取消预定
  const handleBook = useCallback(() => {
    const item = buildSelectedItem()
    if (!item) return
    if (isBooked) {
      removeSelectedProduct('wine', item.productId)
      setIsBooked(false)
    } else {
      setSelectedItem(item)
      setIsBooked(true)
    }
  }, [buildSelectedItem, isBooked])

  // 咨询按钮
  const handleConsult = useCallback(() => {
    if (!isLoggedIn()) {
      setShowLoginModal(true)
      return
    }
    const item = buildSelectedItem()
    if (item) setSelectedItem(item)
    navigate('/order')
  }, [buildSelectedItem, navigate])

  const onScroll = useCallback(() => setScrollY(window.scrollY), [])
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

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

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading"><p>正在加载…</p></div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/wine')}>← 返回列表</button>
        <div className="cd-loading"><p>未找到该宴席服务</p></div>
      </div>
    )
  }

  const galleryImages = detail.images && detail.images.length > 0 ? detail.images : [detail.image]
  const highlights = detail.highlights && detail.highlights.length > 0
    ? detail.highlights
    : [detail.highlight, detail.capacity].filter(Boolean) as string[]

  return (
    <div className="cd-page">
      {/* 返回按钮 */}
      <button className="cd-back" onClick={() => navigate('/wine')}>← 返回列表</button>

      {/* ===== 1. 全屏首图 Hero ===== */}
      <section className="cd-hero">
        <div className="cd-hero__parallax" style={{ transform: `translateY(${scrollY * 0.35}px)` }}>
          <FallbackImage src={detail.image} alt={detail.name} className="cd-hero__img" />
        </div>
        <div className="cd-hero__overlay" />
        <div className="cd-hero__content">
          <span className="cd-hero__badge">酒水宴席 · {detail.nameEn}</span>
          <h1 className="cd-hero__title">{detail.name}</h1>
          {isBooked && (
            <span className="cd-hero__booked-badge">✓ 已预定</span>
          )}
          <div className="cd-hero__divider" />
          <p className="cd-hero__tagline">{detail.tagline || detail.capacity || detail.nameEn}</p>
        </div>
        <div className="cd-hero__scroll" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
          <span>向下探索</span>
          <svg width="20" height="12" viewBox="0 0 20 12"><path d="M1 1l9 9 9-9" stroke="#fff" strokeWidth="1.5" fill="none"/></svg>
        </div>
      </section>

      {/* ===== 图片画廊 ===== */}
      <GalleryCarousel images={galleryImages} />

      {/* ===== 内容区 ===== */}
      <div className="cd-content">

        {/* ===== 2. 服务描述 ===== */}
        <section className="cd-about" ref={aboutRef}>
          <h2 className="cd-about__title">服务介绍</h2>
          <div className="cd-about__divider" />
          <div className="cd-about__body">
            {(detail.description || '').split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* ===== 3. 服务亮点 ===== */}
        {highlights.length > 0 && (
          <section className="cd-block cd-block--alt">
            <h2 className="cd-block__title">服务亮点</h2>
            <div className="cd-chips">
              {highlights.map((h, i) => (
                <span key={i} className="cd-chip">{h}</span>
              ))}
            </div>
          </section>
        )}

        {/* 来源 */}
        {detail.sourceUrl && (
          <section className="cd-source">
            <p>数据来源：<a href={detail.sourceUrl} target="_blank" rel="noreferrer">{detail.sourceUrl}</a></p>
          </section>
        )}
      </div>

      {/* ===== 底部预定栏 ===== */}
      <div className={`cd-book-bar${showBar ? ' cd-book-bar--visible' : ''}`}>
        <div className="cd-book-bar__inner">
          <div className="cd-book-bar__price">
            <span className="cd-book-bar__price-label">价格</span>
            {detail.price > 0 ? (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--red cd-book-bar__price-value--sm">€{detail.price.toLocaleString()}{detail.unit && detail.unit !== '€' ? detail.unit : ''}</span>
            ) : (
              <span className="cd-book-bar__price-value cd-book-bar__price-value--red">需咨询</span>
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
