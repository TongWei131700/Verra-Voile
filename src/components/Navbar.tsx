import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useNavShrink } from '../hooks/useScrollAnimations'

const navLinks = [
  { href: '#story', label: '故事' },
  { href: '#venue', label: '庄园' },
  { href: '#destinations', label: '目的地' },
  { href: '#schedule', label: '流程' },
  { href: '#gallery', label: '画廊' },
  { href: '#rsvp', label: '预约咨询' },
]

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

function getUserPhone() {
  return localStorage.getItem('userPhone') || ''
}

type AuthMethod = 'phone' | 'email'

export default function Navbar() {
  useNavShrink()
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(isLoggedIn)
  const [userPhone, setUserPhone] = useState(getUserPhone)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginConfirmPassword, setLoginConfirmPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 邮箱登录状态
  const [loginEmail, setLoginEmail] = useState('')
  const [loginEmailCode, setLoginEmailCode] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailSending, setEmailSending] = useState(false)

  // 监听登录状态变化（跨组件同步）
  useEffect(() => {
    const handleStorage = () => {
      setLoggedIn(isLoggedIn())
      setUserPhone(getUserPhone())
    }
    window.addEventListener('storage', handleStorage)
    // 每次页面可见时刷新
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleStorage()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('storage', handleStorage)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 弹窗打开时锁定滚动
  useEffect(() => {
    document.body.style.overflow = showLoginModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showLoginModal])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userPhone')
    localStorage.removeItem('userEmail')
    setLoggedIn(false)
    setUserPhone('')
    setShowUserMenu(false)
    navigate('/')
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
        setLoggedIn(true)
        setUserPhone(data.data.email)
        setShowLoginModal(false)
        setLoginEmail('')
        setLoginEmailCode('')
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
        setLoggedIn(true)
        setUserPhone(data.data.phone)
        setShowLoginModal(false)
        setLoginPhone('')
        setLoginPassword('')
        setLoginConfirmPassword('')
      } else {
        if (data.code === 'NOT_REGISTERED') {
          setLoginMode('register')
          setLoginError('该手机号未注册，请先注册')
        } else if (data.code === 'ALREADY_REGISTERED') {
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
    <>
      <nav>
        <div className="logo">V &amp; V</div>
        <ul>
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
          {/* 登录/用户菜单 */}
          <li className="nav-user">
            {loggedIn ? (
              <div className="nav-user__logged" ref={menuRef}>
                <button className="nav-user__btn" onClick={() => setShowUserMenu(v => !v)}>
                  <span className="nav-user__avatar">👤</span>
                  <span className="nav-user__phone">{userPhone}</span>
                </button>
                {showUserMenu && (
                  <div className="nav-user__dropdown">
                    <Link to="/order" className="nav-user__menu-item" onClick={() => setShowUserMenu(false)}>
                      📋 我的订单
                    </Link>
                    <button className="nav-user__menu-item" onClick={handleLogout}>
                      🚪 退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="nav-user__login-btn" onClick={() => setShowLoginModal(true)}>
                登录
              </button>
            )}
          </li>
        </ul>
      </nav>

      {/* 登录/注册弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => { setShowLoginModal(false); setLoginError('') }}>✕</button>
            <h3 className="login-modal__title">{loginMode === 'login' ? '欢迎回来' : '创建账号'}</h3>
            <p className="login-modal__desc">{loginMode === 'login' ? '登录后即可查看订单' : '注册后即可查看订单'}</p>

            <div className="login-modal__tabs">
              <button type="button" className={`login-modal__tab ${loginMode === 'login' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('login'); setLoginError('') }}>登录</button>
              <button type="button" className={`login-modal__tab ${loginMode === 'register' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('register'); setAuthMethod('phone'); setLoginError('') }}>注册</button>
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
                  <input type="tel" placeholder="请输入手机号码" required value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} maxLength={11} />
                </div>
                <div className="login-modal__field">
                  <input type="password" placeholder="请输入密码" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                {loginMode === 'register' && (
                  <div className="login-modal__field">
                    <input type="password" placeholder="请确认密码" required value={loginConfirmPassword} onChange={(e) => setLoginConfirmPassword(e.target.value)} />
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
                  <input type="email" placeholder="请输入邮箱地址" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="login-modal__field login-modal__field--code">
                  <input type="text" placeholder="请输入6位验证码" required maxLength={6} value={loginEmailCode} onChange={(e) => setLoginEmailCode(e.target.value.replace(/\D/g, ''))} />
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
    </>
  )
}
