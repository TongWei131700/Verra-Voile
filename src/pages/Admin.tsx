import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

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

interface ChatUser {
  id: number
  phone: string
  last_message: string
  last_message_at: string
  last_sender_type: string
  unread_count: number
}

interface ChatMessage {
  id: number
  sender_type: 'user' | 'admin'
  content: string
  created_at: string
  user_id?: number
  user_phone?: string
}

interface UserProduct {
  category_id: string
  product_id: string
  name: string
  name_en: string
  price: number
  unit: string
  created_at: string
}

type Tab = 'overview' | 'reservations' | 'users' | 'chat'

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

  // 聊天状态
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  // 聊天 WebSocket 连接
  useEffect(() => {
    if (tab !== 'chat' || !authed) return
    const adminToken = localStorage.getItem('admin_token')
    if (!adminToken) return

    const socket = io({
      auth: { token: adminToken },
    })
    socketRef.current = socket

    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))

    // 加载聊天用户列表
    fetchChatUsers()

    // 接收用户消息（实时）
    socket.on('receive_message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg])
      // 如果消息来自当前选中用户，刷新聊天用户列表
      if (msg.user_id === selectedChatUser?.id) {
        fetchChatUsers()
      }
    })

    // 加载某个用户的聊天记录
    socket.on('user_chat_loaded', (data: { user_id: number; user_phone: string; messages: ChatMessage[] }) => {
      setChatMessages(data.messages)
      // 更新选中用户信息
      setChatUsers(prev => prev.map(u => u.id === data.user_id ? { ...u, phone: data.user_phone } : u))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setSocketConnected(false)
    }
  }, [tab, authed])

  // 新消息自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchChatUsers = async () => {
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/admin/chat-users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setChatUsers(data.data)
    } catch (e) {
      console.error('获取聊天用户失败', e)
    }
  }

  const handleSelectChatUser = async (user: ChatUser) => {
    setSelectedChatUser(user)
    setChatMessages([])
    socketRef.current?.emit('load_user_chat', { user_id: user.id })
    // 加载用户商品
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(`/api/admin/user-products/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setUserProducts(data.data)
      else setUserProducts([])
    } catch {
      setUserProducts([])
    }
  }

  const handleAdminReply = () => {
    if (!chatInput.trim() || !socketRef.current || !selectedChatUser) return
    socketRef.current.emit('admin_reply', {
      target_user_id: selectedChatUser.id,
      content: chatInput.trim(),
    })
    setChatInput('')
  }

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdminReply()
    }
  }

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
    { key: 'chat', label: '💬 客户咨询' },
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

      {/* 客户咨询 */}
      {tab === 'chat' && (
        <div className="admin-chat-layout">
          {/* 左侧：用户列表 */}
          <div className="admin-chat-sidebar">
            <div className="admin-chat-sidebar__header">
              <span>咨询用户</span>
              <span className={`admin-chat-sidebar__status ${socketConnected ? 'admin-chat-sidebar__status--online' : ''}`}>
                {socketConnected ? '在线' : '离线'}
              </span>
            </div>
            <div className="admin-chat-sidebar__list">
              {chatUsers.length === 0 ? (
                <div className="admin-chat-empty">暂无咨询记录</div>
              ) : (
                chatUsers.map(user => (
                  <div
                    key={user.id}
                    className={`admin-chat-user-item ${selectedChatUser?.id === user.id ? 'admin-chat-user-item--active' : ''}`}
                    onClick={() => handleSelectChatUser(user)}
                  >
                    <div className="admin-chat-user-item__top">
                      <span className="admin-chat-user-item__phone">{user.phone}</span>
                      <span className="admin-chat-user-item__time">
                        {new Date(user.last_message_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="admin-chat-user-item__bottom">
                      <span className="admin-chat-user-item__last">
                        {user.last_sender_type === 'admin' ? '我: ' : ''}{user.last_message}
                      </span>
                      {user.unread_count > 0 && (
                        <span className="admin-chat-user-item__badge">{user.unread_count}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧：对话区域 + 商品信息 */}
          <div className="admin-chat-main">
            {selectedChatUser ? (
              <>
                <div className="admin-chat-main__header">
                  <span>📱 {selectedChatUser.phone}</span>
                </div>
                <div className="admin-chat-main__body">
                  <div className="admin-chat-main__messages">
                    {chatMessages.length === 0 && (
                      <div className="admin-chat-empty">加载中...</div>
                    )}
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`admin-chat-bubble admin-chat-bubble--${msg.sender_type}`}>
                        <div className="admin-chat-bubble__content">
                          <p>{msg.content}</p>
                          <span className="admin-chat-bubble__time">
                            {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {/* 用户已选商品面板 */}
                  <div className="admin-chat-products">
                    <div className="admin-chat-products__header">
                      🛒 用户已选商品 ({userProducts.length})
                    </div>
                    <div className="admin-chat-products__list">
                      {userProducts.length === 0 ? (
                        <div className="admin-chat-empty">该用户暂无已选商品</div>
                      ) : (
                        userProducts.map((p, idx) => (
                          <div key={idx} className="admin-chat-products__item">
                            <div className="admin-chat-products__name">{p.name}</div>
                            <div className="admin-chat-products__name-en">{p.name_en}</div>
                            <div className="admin-chat-products__meta">
                              <span className="admin-chat-products__price">
                                {p.unit === '€' ? '€' : '¥'}{p.price.toLocaleString()}
                              </span>
                              <span className="admin-chat-products__cat">{p.category_id}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="admin-chat-main__input">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="输入回复内容，Enter 发送..."
                    rows={2}
                  />
                  <button
                    className="admin-chat-main__send"
                    onClick={handleAdminReply}
                    disabled={!chatInput.trim() || !socketConnected}
                  >
                    发送
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-chat-placeholder">
                <p>💬</p>
                <p>选择左侧用户开始对话</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
