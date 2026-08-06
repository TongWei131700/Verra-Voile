import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/europewedding-logo.png'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface ModuleDef {
  id: string
  title: string
  route: string
}

// 六个固定模块，路由与 Listing 页保持一致
const MODULES: ModuleDef[] = [
  { id: 'destination', title: '地点', route: '/destinations' },
  { id: 'team', title: '婚礼团队', route: '/wedding-team' },
  { id: 'floral', title: '花卉', route: '/flowers' },
  { id: 'wine', title: '酒水宴席', route: '/wine' },
  { id: 'dress', title: '礼服', route: '/listing/dress' },
  { id: 'photography', title: '摄影', route: '/photography' },
]

// 酒水/宴席历史数据归并到 wine 分组
const mergeCategoryId = (id: string) => (id === 'dinner' || id === 'catering' ? 'wine' : id)

// 前三个模块固定使用 villapiccolomini 参考站封面图
const COVER_OVERRIDES: Record<string, string> = {
  destination: 'https://villapiccolomini.com/wp-content/uploads/2025/05/IMG_8086.jpg',
  team: 'https://villapiccolomini.com/wp-content/uploads/2025/05/IMG_8088-scaled.jpg',
  floral: 'https://villapiccolomini.com/wp-content/uploads/2025/05/IMG_8087-scaled.jpg',
}

export default function NewHome() {
  const navigate = useNavigate()
  const [images, setImages] = useState<Record<string, string>>({})
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 从 API 获取分类图片
  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.categories) {
          const map: Record<string, string> = {}
          for (const c of data.data.categories as { id: string; image: string }[]) {
            map[mergeCategoryId(c.id)] = c.image
          }
          setImages({ ...map, ...COVER_OVERRIDES })
        }
      })
      .catch(() => setImages({ ...COVER_OVERRIDES }))
  }, [])

  const itemStyle = (id: string) =>
    images[id]
      ? { backgroundImage: `url(${images[id]})` }
      : { backgroundColor: '#2a2723' }

  const renderItemContent = (m: ModuleDef) => (
    <div className="nh-content">
      <h2>{m.title}</h2>
      <div className="nh-wrapper">
        <button type="button" onClick={() => navigate(m.route)}>定制</button>
        <Link to="/listing">咨询</Link>
      </div>
    </div>
  )

  return (
    <>
      {/* 顶部固定导航（仿 villapiccolomini） */}
      <header className="nh-header">
        <div className="nh-container">
          <nav className="nh-menu-nav">
            <ul className="nh-menu-list">
              <li className="nh-logo">
                <Link to="/old-home" aria-label="首页">
                  <img src={logoUrl} alt="EuropeWedding" />
                </Link>
              </li>
              <li className="nh-nav-actions">
                <button type="button" onClick={() => setShowLoginModal(true)}>登录</button>
                <Link to="/order">订单</Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* 主体：滚动吸附容器 */}
      <main className="nh-intro">
        {/* 桌面端：每屏三块面板并排，六模块分两屏 */}
        <section className="nh-desktop-only">
          {MODULES.slice(0, 3).map(m => (
            <div key={m.id} className="nh-item" style={itemStyle(m.id)}>
              {renderItemContent(m)}
            </div>
          ))}
        </section>
        <section className="nh-desktop-only">
          {MODULES.slice(3).map(m => (
            <div key={m.id} className="nh-item" style={itemStyle(m.id)}>
              {renderItemContent(m)}
            </div>
          ))}
        </section>

        {/* 移动端：每个模块独立一屏 */}
        {MODULES.map(m => (
          <section key={m.id} className="nh-mobile-only" style={itemStyle(m.id)}>
            <div className="nh-mobile-container">
              <h2>{m.title}</h2>
              <div className="nh-wrapper">
                <button type="button" onClick={() => navigate(m.route)}>定制</button>
                <Link to="/listing">咨询</Link>
              </div>
            </div>
          </section>
        ))}
      </main>

      {/* 登录/注册弹窗 */}
      {showLoginModal && (
        <>
          <div className="login-modal-backdrop" onClick={() => setShowLoginModal(false)} />
          <div className="login-modal">
            <button type="button" className="login-modal__close" onClick={() => setShowLoginModal(false)}>✕</button>
            <h3 className="login-modal__title">登录</h3>
            <p className="login-modal__desc">登录后即可查看订单</p>
            <LoginForm onSuccess={() => { setShowLoginModal(false); navigate('/order') }} />
          </div>
        </>
      )}
    </>
  )
}

// 登录/注册表单子组件（复用首页结构）
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login')
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email')
  // 邮箱登录
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)
  // 手机号登录/注册
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // 通用
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
        if (data.code === 'NOT_REGISTERED') { setError('该手机号未注册，请注册'); setLoginMode('register') }
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
