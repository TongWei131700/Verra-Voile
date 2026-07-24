import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

type LoginTab = 'phone' | 'email'

export default function Login() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<LoginTab>('email')

  // 手机号登录
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  // 邮箱登录
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailSending, setEmailSending] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 发送邮箱验证码
  const handleSendEmailCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setError('')
    setEmailSending(true)
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
        setError(data.message || '发送失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setEmailSending(false)
    }
  }

  // 手机号密码登录
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userPhone', data.data.phone)
        alert('登录成功！')
        navigate('/')
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 邮箱验证码登录
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: emailCode }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userEmail', data.data.email)
        alert('登录成功！')
        navigate('/')
      } else {
        setError(data.message || '登录失败')
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = (newTab: LoginTab) => {
    setTab(newTab)
    setError('')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title script">Éternel Amour</h1>
        <h2 className="auth-subtitle">欢迎回来</h2>

        {/* Tab 切换 */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'email' ? 'active' : ''}`}
            onClick={() => switchTab('email')}
          >
            邮箱登录
          </button>
          <button
            className={`auth-tab ${tab === 'phone' ? 'active' : ''}`}
            onClick={() => switchTab('phone')}
          >
            手机号登录
          </button>
        </div>

        {/* 手机号登录表单 */}
        {tab === 'phone' && (
          <form className="auth-form" onSubmit={handlePhoneLogin}>
            <div className="field">
              <label>手机号码</label>
              <input
                type="tel"
                placeholder="请输入11位手机号"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="field">
              <label>密码</label>
              <input
                type="password"
                placeholder="请输入密码"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? '登录中...' : '登 录'}
            </button>

            <p className="auth-link">
              还没有账号？<Link to="/register">立即注册</Link>
            </p>
          </form>
        )}

        {/* 邮箱登录表单 */}
        {tab === 'email' && (
          <form className="auth-form" onSubmit={handleEmailLogin}>
            <div className="field">
              <label>邮箱地址</label>
              <input
                type="email"
                placeholder="请输入邮箱地址"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>验证码</label>
              <div className="auth-code-row">
                <input
                  type="text"
                  placeholder="请输入6位验证码"
                  required
                  maxLength={6}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                />
                <button
                  type="button"
                  className="auth-send-code-btn"
                  disabled={emailCountdown > 0 || emailSending}
                  onClick={handleSendEmailCode}
                >
                  {emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}s` : '发送验证码'}
                </button>
              </div>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={submitting}>
              {submitting ? '登录中...' : '登 录'}
            </button>

            <p className="auth-link">
              还没有账号？<Link to="/register">立即注册</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
