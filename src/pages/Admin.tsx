import { useState, useEffect } from 'react'

interface Reservation {
  id: number
  name: string
  phone: string
  email: string
  destination: string
  date: string
  created_at: string
}

interface User {
  id: number
  phone: string
  created_at: string
}

interface Stats {
  totalUsers: number
  totalReservations: number
  todayReservations: number
  todayUsers: number
}

type Tab = 'overview' | 'reservations' | 'users'

export default function Admin() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging] = useState(false)

  const [tab, setTab] = useState<Tab>('overview')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalReservations: 0, todayReservations: 0, todayUsers: 0 })
  const [loading, setLoading] = useState(true)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLogging(true)
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('admin_token', data.data.token)
        setAuthed(true)
      } else {
        setLoginError(data.message || '登录失败')
      }
    } catch {
      setLoginError('网络异常，请稍后重试')
    } finally {
      setLogging(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setAuthed(false)
    setUsername('')
    setPassword('')
  }

  const fetchAll = async () => {
    setLoading(true)
    const token = localStorage.getItem('admin_token')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [resRes, userRes, statsRes] = await Promise.all([
        fetch('/api/reservation', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/stats', { headers }),
      ])
      const resJson = await resRes.json()
      const userJson = await userRes.json()
      const statsJson = await statsRes.json()
      if (resJson.success) setReservations(resJson.data)
      if (userJson.success) setUsers(userJson.data)
      if (statsJson.success) setStats(statsJson.data)
      // token过期
      if (resJson.message === 'token已过期，请重新登录' || userJson.message === 'token已过期，请重新登录') {
        handleLogout()
      }
    } catch (e) {
      console.error('获取数据失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (authed) fetchAll() }, [authed])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const destinationStats = reservations.reduce((acc, item) => {
    acc[item.destination] = (acc[item.destination] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '数据概览' },
    { key: 'reservations', label: '预约管理' },
    { key: 'users', label: '注册用户' },
  ]

  // 未登录 → 显示登录表单
  if (!authed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title script">Éternel Amour</h1>
          <h2 className="auth-subtitle">管理后台登录</h2>
          <form className="auth-form" onSubmit={handleAdminLogin}>
            <div className="field">
              <label>用户名</label>
              <input
                type="text"
                placeholder="请输入管理员用户名"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
            {loginError && <p className="auth-error">{loginError}</p>}
            <button type="submit" disabled={logging}>
              {logging ? '登录中...' : '登 录'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <span className="script">Éternel Amour</span>
          <span className="dashboard-subtitle">管理后台</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="dashboard-refresh" onClick={fetchAll} disabled={loading}>
            {loading ? '刷新中...' : '↻ 刷新'}
          </button>
          <button className="dashboard-refresh" onClick={handleLogout}>
            退出
          </button>
        </div>
      </header>

      <nav className="dashboard-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* 数据概览 */}
      {tab === 'overview' && (
        <div className="dashboard-content">
          <div className="stats-row">
            <div className="dash-card card-users">
              <div className="dash-card__num">{stats.totalUsers}</div>
              <div className="dash-card__label">注册用户</div>
              <div className="dash-card__sub">今日 +{stats.todayUsers}</div>
            </div>
            <div className="dash-card card-reservations">
              <div className="dash-card__num">{stats.totalReservations}</div>
              <div className="dash-card__label">预约咨询</div>
              <div className="dash-card__sub">今日 +{stats.todayReservations}</div>
            </div>
            <div className="dash-card card-destinations">
              <div className="dash-card__num">{Object.keys(destinationStats).length}</div>
              <div className="dash-card__label">目的地城市</div>
              <div className="dash-card__sub">覆盖 {Object.keys(destinationStats).length} 个</div>
            </div>
          </div>

          {Object.keys(destinationStats).length > 0 && (
            <div className="dash-section">
              <h3>目的地热度分布</h3>
              <div className="dash-bars">
                {Object.entries(destinationStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([dest, count]) => (
                    <div key={dest} className="dash-bar-row">
                      <span className="dash-bar-label">{dest}</span>
                      <div className="dash-bar-track">
                        <div
                          className="dash-bar-fill"
                          style={{ width: `${(count / reservations.length) * 100}%` }}
                        />
                      </div>
                      <span className="dash-bar-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="dash-section">
            <h3>最近注册用户</h3>
            {users.length === 0 ? (
              <p className="empty">暂无注册用户</p>
            ) : (
              <div className="dash-mini-table">
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="dash-mini-row">
                    <span className="dash-mini-icon">👤</span>
                    <span className="dash-mini-phone">{u.phone}</span>
                    <span className="dash-mini-time">{formatDate(u.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-section">
            <h3>最近预约</h3>
            {reservations.length === 0 ? (
              <p className="empty">暂无预约记录</p>
            ) : (
              <div className="dash-mini-table">
                {reservations.slice(0, 5).map(r => (
                  <div key={r.id} className="dash-mini-row">
                    <span className="dash-mini-icon">📋</span>
                    <span className="dash-mini-name">{r.name}</span>
                    <span className="dash-mini-dest">{r.destination}</span>
                    <span className="dash-mini-time">{formatDate(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 预约管理 */}
      {tab === 'reservations' && (
        <div className="dashboard-content">
          <div className="dash-section">
            <h3>预约记录 ({reservations.length})</h3>
            {reservations.length === 0 ? (
              <p className="empty">暂无预约记录</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>姓名</th>
                      <th>电话</th>
                      <th>邮箱</th>
                      <th>目的地</th>
                      <th>计划时间</th>
                      <th>提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td className="cell-name">{r.name}</td>
                        <td>{r.phone}</td>
                        <td>{r.email || '-'}</td>
                        <td className="cell-dest">{r.destination}</td>
                        <td>{r.date}</td>
                        <td className="cell-time">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 注册用户 */}
      {tab === 'users' && (
        <div className="dashboard-content">
          <div className="dash-section">
            <h3>注册用户 ({users.length})</h3>
            {users.length === 0 ? (
              <p className="empty">暂无注册用户</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>手机号</th>
                      <th>注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id}>
                        <td>{i + 1}</td>
                        <td className="cell-name">{u.phone}</td>
                        <td className="cell-time">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
