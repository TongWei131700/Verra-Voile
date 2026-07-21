import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 前端校验密码一致性
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, confirmPassword }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('userPhone', data.data.phone)
        alert('注册成功！')
        navigate('/')
      } else {
        setError(data.message || '注册失败')
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
        <h2 className="auth-subtitle">创建账号</h2>

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
            <label>设置密码</label>
            <input
              type="password"
              placeholder="至少6位密码"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label>确认密码</label>
            <input
              type="password"
              placeholder="请再次输入密码"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? '注册中...' : '注 册'}
          </button>

          <p className="auth-link">
            已有账号？<Link to="/login">去登录</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
