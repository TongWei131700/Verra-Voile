import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FallbackImage from '../components/common/FallbackImage'
import RevealGroup from '../components/RevealGroup'
import { getSelectedProducts } from '../utils/selectedProducts'

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

interface CategoryItem {
  id: string
  name: string
  nameEn: string
  image: string
  description: string
}

// 骨架屏组件
function CategorySkeleton() {
  return (
    <div className="product-card product-card--skeleton">
      <div className="product-card__img">
        <div className="skeleton-pulse" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="product-card__info">
        <div className="skeleton-pulse" style={{ width: '40%', height: 18, borderRadius: 4, marginBottom: 10 }} />
        <div className="skeleton-pulse" style={{ width: '70%', height: 14, borderRadius: 4 }} />
      </div>
    </div>
  )
}

type AuthMethod = 'phone' | 'email'

export default function Listing() {
  const navigate = useNavigate()
  const [showCart, setShowCart] = useState(false)
  const [barVisible, setBarVisible] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginConfirmPassword, setLoginConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 从 sessionStorage 读取所有已选商品，页面显示时刷新
  const [selectedItems, setSelectedItems] = useState(() => getSelectedProducts())

  // 从 API 获取分类数据
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // 邮箱登录状态
  const [loginEmail, setLoginEmail] = useState('')
  const [loginEmailCode, setLoginEmailCode] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailSending, setEmailSending] = useState(false)

  // 从 API 获取分类列表
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            nameEn: c.nameEn,
            image: c.image,
            description: c.description,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false))
  }, [])

  // 页面可见时重新读取 sessionStorage
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setSelectedItems(getSelectedProducts())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    // 每次路由导航回来也刷新
    setSelectedItems(getSelectedProducts())
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // 滚动时隐藏，停止滚动后再显示
  useEffect(() => {
    const handleScroll = () => {
      setBarVisible(false)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => setBarVisible(true), 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
    }
  }, [])

  // 模块 ID 到中文名映射
  const moduleNames: Record<string, string> = {
    destination: '地点', team: '婚礼团队', floral: '花卉',
    wine: '酒水', dinner: '宴席', dress: '礼服', catering: '宴席', other: '其他',
  }
  const moduleKeys = ['destination', 'team', 'floral', 'wine', 'dinner', 'dress', 'catering', 'other']

  // 按模块分组
  const bookedMap: Record<string, { productId: string; venueName: string; price: number; unit: string }[]> = {}
  for (const item of selectedItems) {
    if (!bookedMap[item.categoryId]) bookedMap[item.categoryId] = []
    bookedMap[item.categoryId].push({ productId: item.productId, venueName: item.name, price: item.price, unit: item.unit })
  }

  // 汇总已选商品列表
  const cartItems: { module: string; name: string; price: number; unit: string; categoryId: string; productId: string }[] = []
  for (const item of selectedItems) {
    cartItems.push({ module: moduleNames[item.categoryId] || item.categoryId, name: item.name, price: item.price, unit: item.unit, categoryId: item.categoryId, productId: item.productId })
  }

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0)
  const hasItems = cartItems.length > 0

  const handleRemoveItem = (categoryId: string, productId: string) => {
    const items = getSelectedProducts().filter(
      i => !(i.categoryId === categoryId && i.productId === productId)
    )
    sessionStorage.setItem('selected_products', JSON.stringify(items))
    setSelectedItems(items)
  }

  // pad打开时锁定滚动
  useEffect(() => {
    document.body.style.overflow = showCart || showLoginModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCart, showLoginModal])

  const handleConsultOrder = () => {
    if (isLoggedIn()) {
      navigate('/order')
    } else {
      setShowLoginModal(true)
    }
  }

  // 发送邮箱验证码
  const handleSendEmailCode = async () => {
    if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setLoginError('请输入有效的邮箱地址')
      return
    }
    setLoginError('')
    setEmailSending(true)
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailCountdown(60)
        const timer = setInterval(() => {
          setEmailCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setLoginError(data.message || '发送失败')
      }
    } catch {
      setLoginError('网络异常，请稍后重试')
    } finally {
      setEmailSending(false)
    }
  }

  // 邮箱验证码登录
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginSubmitting(true)
    try {
      const res = await fetch('/api/auth/login-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, code: loginEmailCode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userEmail', data.data.email)
        setShowLoginModal(false)
        setLoginEmail('')
        setLoginEmailCode('')
        navigate('/order')
      } else {
        setLoginError(data.message || '登录失败')
      }
    } catch {
      setLoginError('网络异常，请稍后重试')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    // 注册模式校验密码一致性
    if (loginMode === 'register' && loginPassword !== loginConfirmPassword) {
      setLoginError('两次输入的密码不一致')
      return
    }

    setLoginSubmitting(true)
    try {
      const url = loginMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = loginMode === 'login'
        ? { phone: loginPhone, password: loginPassword }
        : { phone: loginPhone, password: loginPassword, confirmPassword: loginConfirmPassword }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userPhone', data.data.phone)
        setShowLoginModal(false)
        setLoginPhone('')
        setLoginPassword('')
        setLoginConfirmPassword('')
        navigate('/order')
      } else {
        // 根据错误码自动切换模式
        if (data.code === 'NOT_REGISTERED') {
          // 登录时账号不存在，切换到注册模式
          setLoginMode('register')
          setLoginError('该手机号未注册，请先注册')
        } else if (data.code === 'ALREADY_REGISTERED') {
          // 注册时账号已存在，切换到登录模式
          setLoginMode('login')
          setLoginError('该手机号已注册，请直接登录')
        } else {
          setLoginError(data.message || (loginMode === 'login' ? '登录失败' : '注册失败'))
        }
      }
    } catch {
      setLoginError('网络异常，请稍后重试')
    } finally {
      setLoginSubmitting(false)
    }
  }

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/" className="cust-back">← 返回首页</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">Wedding Customization</p>
          <h1>定制你的婚礼</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">每一个细节，都值得被认真对待</p>
        </div>
      </header>

      <section className="cust-section">
        {categoriesLoading ? (
          <div className="product-grid">
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </div>
        ) : (
        <RevealGroup stagger={120} perRow={3} className="product-grid">
          {categories.map((item) => {
            const booked = bookedMap[item.id]
            const isBooked = !!booked && booked.length > 0
            const bookedSummary = isBooked
              ? `✓ 已选 ${booked.length} 项：${booked.map(b => b.venueName).join('、')}`
              : null
            return (
              <div
                key={item.id}
                className={`product-card${isBooked ? ' product-card--booked' : ''}`}
                onClick={() => {
                  if (item.id === 'destination') {
                    navigate('/destinations')
                  } else if (item.id === 'team') {
                    navigate('/wedding-team')
                  } else {
                    navigate(`/listing/${item.id}`)
                  }
                }}
              >
                <div className="product-card__img">
                  <FallbackImage src={item.image} alt={item.name} />
                  <span className="product-card__explore">探索</span>
                </div>
                <div className="product-card__info">
                  <h3 className="product-card__name">{item.name}</h3>
                  <p className="product-card__desc">
                    {bookedSummary || item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </RevealGroup>
        )}
      </section>

      {/* 底部订单栏 */}
      {hasItems && (
        <div className={`order-bar${barVisible ? '' : ' order-bar--hidden'}`}>
          <div className="order-bar__price">
            <span className="order-bar__price-label">合计</span>
            <span className="order-bar__price-num">€{totalPrice.toLocaleString()}</span>
          </div>
          <button type="button" className="order-bar__cart" onClick={() => setShowCart(true)}>
            📋
            <span className="order-bar__cart-count">{cartItems.length}</span>
          </button>
          <button type="button" className="order-bar__btn" onClick={handleConsultOrder}>咨询此订单</button>
        </div>
      )}

      {/* 商品清单 Pad */}
      {showCart && (
        <>
          <div className="cart-pad-backdrop" onClick={() => setShowCart(false)} />
          <div className="cart-pad">
            <button type="button" className="cart-pad__close" onClick={() => setShowCart(false)}>✕</button>
            <h3 className="cart-pad__title">已选商品清单</h3>
            <div className="cart-pad__list">
              {moduleKeys.map(catId => {
                const items = bookedMap[catId]
                if (!items || items.length === 0) return null
                return (
                  <div key={catId} className="cart-pad__group">
                    <div className="cart-pad__group-header">
                      <span className="cart-pad__group-icon">
                        {catId === 'destination' ? '📍' : catId === 'team' ? '👥' : catId === 'floral' ? '💐' : catId === 'wine' ? '🍷' : catId === 'dinner' || catId === 'catering' ? '🍽️' : catId === 'dress' ? '👗' : '📦'}
                      </span>
                      <span className="cart-pad__group-name">{moduleNames[catId] || catId}</span>
                      <span className="cart-pad__group-count">{items.length} 项</span>
                    </div>
                    {items.map(item => (
                      <div key={`${catId}:${item.productId}`} className="cart-pad__item">
                        <span className="cart-pad__item-name">{item.venueName}</span>
                        <span className="cart-pad__item-price">€{item.price.toLocaleString()}{item.unit}</span>
                        <button
                          type="button"
                          className="cart-pad__item-remove"
                          onClick={() => handleRemoveItem(catId, item.productId)}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="cart-pad__total">
              <span>合计</span>
              <span>€{totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </>
      )}
      {/* 登录/注册弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => { setShowLoginModal(false); setLoginError('') }}>✕</button>
            <h3 className="login-modal__title">{loginMode === 'login' ? '欢迎回来' : '创建账号'}</h3>
            <p className="login-modal__desc">{loginMode === 'login' ? '登录后即可咨询订单' : '注册后即可咨询订单'}</p>
            
            {/* 登录/注册切换 */}
            <div className="login-modal__tabs">
              <button
                type="button"
                className={`login-modal__tab ${loginMode === 'login' ? 'login-modal__tab--active' : ''}`}
                onClick={() => { setLoginMode('login'); setLoginError('') }}
              >
                登录
              </button>
              <button
                type="button"
                className={`login-modal__tab ${loginMode === 'register' ? 'login-modal__tab--active' : ''}`}
                onClick={() => { setLoginMode('register'); setAuthMethod('phone'); setLoginError('') }}
              >
                注册
              </button>
            </div>

            {/* 登录方式切换：邮箱 / 手机号 */}
            {loginMode === 'login' && (
              <div className="login-modal__method-tabs">
                <button
                  type="button"
                  className={`login-modal__method-tab ${authMethod === 'email' ? 'active' : ''}`}
                  onClick={() => { setAuthMethod('email'); setLoginError('') }}
                >
                  邮箱
                </button>
                <button
                  type="button"
                  className={`login-modal__method-tab ${authMethod === 'phone' ? 'active' : ''}`}
                  onClick={() => { setAuthMethod('phone'); setLoginError('') }}
                >
                  手机号
                </button>
              </div>
            )}

            {/* 手机号登录/注册表单 */}
            {authMethod === 'phone' && (
              <form className="login-modal__form" onSubmit={handleModalSubmit}>
                <div className="login-modal__field">
                  <input
                    type="tel"
                    placeholder="请输入手机号码"
                    required
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    maxLength={11}
                  />
                </div>
                <div className="login-modal__field">
                  <input
                    type="password"
                    placeholder="请输入密码"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                {loginMode === 'register' && (
                  <div className="login-modal__field">
                    <input
                      type="password"
                      placeholder="请确认密码"
                      required
                      value={loginConfirmPassword}
                      onChange={(e) => setLoginConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
                {loginError && <p className="login-modal__error">{loginError}</p>}
                <button type="submit" className="login-modal__submit" disabled={loginSubmitting}>
                  {loginSubmitting ? (loginMode === 'login' ? '登录中...' : '注册中...') : (loginMode === 'login' ? '登 录' : '注 册')}
                </button>
              </form>
            )}

            {/* 邮箱登录表单 */}
            {authMethod === 'email' && loginMode === 'login' && (
              <form className="login-modal__form" onSubmit={handleEmailLogin}>
                <div className="login-modal__field">
                  <input
                    type="email"
                    placeholder="请输入邮箱地址"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="login-modal__field login-modal__field--code">
                  <input
                    type="text"
                    placeholder="请输入6位验证码"
                    required
                    maxLength={6}
                    value={loginEmailCode}
                    onChange={(e) => setLoginEmailCode(e.target.value.replace(/\D/g, ''))}
                  />
                  <button
                    type="button"
                    className="login-modal__send-btn"
                    disabled={emailCountdown > 0 || emailSending}
                    onClick={handleSendEmailCode}
                  >
                    {emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
                  </button>
                </div>
                {loginError && <p className="login-modal__error">{loginError}</p>}
                <button type="submit" className="login-modal__submit" disabled={loginSubmitting}>
                  {loginSubmitting ? '登录中...' : '登 录'}
                </button>
              </form>
            )}

            <p className="login-modal__tip">
              {loginMode === 'login' ? '还没有账号？' : '已有账号？'}
              <button type="button" className="login-modal__switch" onClick={() => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setLoginError(''); setAuthMethod('phone') }}>
                {loginMode === 'login' ? '立即注册' : '去登录'}
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  )
}
