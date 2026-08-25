import { useState } from 'react'
import { onLoginSuccess } from '../utils/selectedProducts'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface LoginFormProps {
  onSuccess: () => void
  onRegistered?: () => void
}

export default function LoginForm({ onSuccess, onRegistered }: LoginFormProps) {
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
  const [showPw, setShowPw] = useState(false)
  // 通用
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [submitting, setSubmitting] = useState(false)
  // 忘记密码
  const [forgotPw, setForgotPw] = useState(false)
  const [resetStep, setResetStep] = useState<'email' | 'reset'>('email')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetSending, setResetSending] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(0)

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
      if (res.ok && data.success) { onLoginSuccess(data.data.token, { email: data.data.email }); onSuccess() }
      else { setError(data.message || '登录失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      if (loginMode === 'register' && password !== confirmPassword) { setError('两次密码不一致'); setSubmitting(false); return }
      const url = loginMode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = loginMode === 'login' ? { phone, password } : { phone, password, confirmPassword }
      const res = await fetch(`${API_BASE}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok && data.success) {
        onLoginSuccess(data.data.token, { phone: data.data.phone })
        if (loginMode === 'register') {
          setRegistered(true); setError(''); setCountdown(3)
          onRegistered?.()
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) { clearInterval(timer); onSuccess(); return 0 }
              return prev - 1
            })
          }, 1000)
        } else {
          onSuccess()
        }
      } else {
        if (data.code === 'NOT_REGISTERED') { setError('该手机号未注册，请注册'); setLoginMode('register') }
        else if (data.code === 'ALREADY_EXISTS') { setError('该手机号已注册，请直接登录'); setLoginMode('login') }
        else { setError(data.message || (loginMode === 'login' ? '登录失败' : '注册失败')) }
      }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  const switchMode = () => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setError(''); if (loginMode === 'login') setAuthMethod('phone') }

  const handleSendResetCode = async () => {
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) { setError('请输入有效的邮箱地址'); return }
    setError(''); setResetSending(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-email-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail }) })
      const data = await res.json()
      if (res.ok && data.success) {
        setResetStep('reset'); setResetCountdown(60)
        const timer = setInterval(() => setResetCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 }), 1000)
      } else { setError(data.message || '发送失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setResetSending(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }) })
      const data = await res.json()
      if (res.ok && data.success) {
        setRegistered(true); setCountdown(3)
        const timer = setInterval(() => { setCountdown(prev => { if (prev <= 1) { clearInterval(timer); onSuccess(); return 0 } return prev - 1 }) }, 1000)
      } else { setError(data.message || '重置失败') }
    } catch { setError('网络异常，请稍后重试') } finally { setSubmitting(false) }
  }

  return (
    <>
      {registered ? (
        <div className="login-modal__success-screen">
          <div className="login-modal__success-icon">✓</div>
          <p className="login-modal__success-text">{forgotPw ? '密码重置成功' : '注册成功'}</p>
          <p className="login-modal__success-countdown">{countdown}s 后自动关闭</p>
          <button type="button" className="login-modal__success-btn" onClick={onSuccess}>关闭</button>
        </div>
      ) : forgotPw ? (
        <>
        <h3 style={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', marginBottom: '16px' }}>重置密码</h3>
        {resetStep === 'email' ? (
          <form className="login-modal__form" onSubmit={e => { e.preventDefault(); handleSendResetCode() }}>
            <p style={{ fontSize: '13px', color: '#999', marginBottom: '16px', textAlign: 'center' }}>请输入注册邮箱，我们将发送验证码</p>
            <div className="login-modal__field">
              <input type="email" placeholder="请输入注册邮箱" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
            </div>
            {error && <p className="login-modal__error">{error}</p>}
            <button type="submit" className="login-modal__submit" disabled={resetSending}>{resetSending ? '发送中...' : '发送验证码'}</button>
          </form>
        ) : (
          <form className="login-modal__form" onSubmit={handleResetPassword}>
            <div className="login-modal__field login-modal__field--code">
              <input type="text" placeholder="请输入6位验证码" required maxLength={6} value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))} />
              <button type="button" className="login-modal__send-btn" disabled={resetCountdown > 0 || resetSending} onClick={handleSendResetCode}>
                {resetSending ? '发送中...' : resetCountdown > 0 ? `${resetCountdown}s` : '重新发送'}
              </button>
            </div>
            <div className="login-modal__field">
              <input type="password" placeholder="请输入新密码（至少6位）" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            {error && <p className="login-modal__error">{error}</p>}
            <button type="submit" className="login-modal__submit" disabled={submitting}>{submitting ? '重置中...' : '重置密码'}</button>
          </form>
        )}
        <p className="login-modal__tip">
          <button type="button" className="login-modal__switch" onClick={() => { setForgotPw(false); setError(''); setResetStep('email') }}>返回登录</button>
        </p>
        </>
      ) : (
      <>
      <div className="login-modal__tabs">
        <button type="button" className={`login-modal__tab ${loginMode === 'login' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('login'); setError('') }}>登录</button>
        <button type="button" className={`login-modal__tab ${loginMode === 'register' ? 'login-modal__tab--active' : ''}`} onClick={() => { setLoginMode('register'); setAuthMethod('phone'); setError('') }}>注册</button>
      </div>

      <div className="login-modal__method-tabs">
        <button type="button" className={`login-modal__method-tab ${authMethod === 'email' ? 'active' : ''}`} onClick={() => { setAuthMethod('email'); setError('') }}>邮箱</button>
        <button type="button" className={`login-modal__method-tab ${authMethod === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMethod('phone'); setError('') }}>手机号</button>
      </div>

      {authMethod === 'phone' ? (
        <form className="login-modal__form" onSubmit={handleModalSubmit}>
          <div className="login-modal__field">
            <input type="tel" placeholder="请输入手机号码" required value={phone} onChange={e => setPhone(e.target.value)} maxLength={11} />
          </div>
          <div className="login-modal__field login-modal__field--password">
            <input type={showPw ? 'text' : 'password'} placeholder="请输入密码" required value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="login-modal__eye-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? '隐藏密码' : '查看密码'}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg></button>
          </div>
          {loginMode === 'register' && (
            <div className="login-modal__field login-modal__field--password">
              <input type={showPw ? 'text' : 'password'} placeholder="请确认密码" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <button type="button" className="login-modal__eye-btn" onClick={() => setShowPw(!showPw)} aria-label={showPw ? '隐藏密码' : '查看密码'}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg></button>
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
        {loginMode === 'login' ? (
          <>
            还没有账号？
            <button type="button" className="login-modal__switch" onClick={switchMode}>立即注册</button>
            <span style={{ margin: '0 6px', color: '#ccc' }}>|</span>
            <button type="button" className="login-modal__switch" onClick={() => { setForgotPw(true); setError('') }}>忘记密码</button>
          </>
        ) : (
          <>
            已有账号？
            <button type="button" className="login-modal__switch" onClick={switchMode}>去登录</button>
          </>
        )}
      </p>
      </>
      )}
    </>
  )
}