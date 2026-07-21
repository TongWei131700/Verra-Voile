import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title script">Éternel Amour</h1>
        <h2 className="auth-subtitle">欢迎回来</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
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
      </div>
    </div>
  )
}
