import { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { getSelectedProducts, removeSelectedProduct, clearSelectedProducts, loadSelectedProductsFromServer, syncCartToServer } from '../utils/selectedProducts'
import { removeWishlistFromServer } from '../utils/wishlistSync'
import { exportOrderPDF } from '../utils/exportPDF'
import LoginModal from '../components/LoginModal'
import type { SelectedItem } from '../utils/selectedProducts'

const CATEGORY_LABELS: Record<string, string> = {
  destination: '目的地',
  team: '婚礼团队',
  'wedding-team': '婚礼团队',
  floral: '花卉',
  'floral-product': '花卉',
  wine: '酒水宴席',
  dinner: '酒水宴席',
  catering: '酒水宴席',
  dress: '礼服',
  photography: '摄影',
  other: '其他服务',
}

/** 根据 categoryId 生成详情页路由 */
function getDetailPath(categoryId: string, productId: string): string | null {
  const map: Record<string, string> = {
    destination: '/destinations',
    team: '/wedding-team',
    'wedding-team': '/wedding-team',
    floral: '/flowers',
    'floral-product': '/flowers/product',
    wine: '/wine',
    dress: '/dresses',
    photography: '/photography',
  }
  const prefix = map[categoryId]
  return prefix ? `${prefix}/${productId}` : null
}

/** 根据 SelectedItem 获取商品图片 */
function getProductImg(item: SelectedItem): string {
  if (item.image) return item.image
  if (item.categoryId === 'destination') {
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
  }
  return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
}

interface ChatMessage {
  id: number
  sender_type: 'user' | 'admin'
  content: string
  created_at: string
}

export default function OrderDetail() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SelectedItem[]>(() => getSelectedProducts())
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  // 每次进入订单页时滚动到顶部（同步执行，避免闪烁）
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    contentRef.current?.scrollTo(0, 0)
  }, [])

  // 挂载时从服务器恢复购物车（解决 App 级异步加载未完成时序问题）
  useEffect(() => {
    loadSelectedProductsFromServer().then(() => {
      setItems(getSelectedProducts())
    })
  }, [])

  // 从详情页返回或页面重新可见时，刷新商品列表（实时同步规格/价格变化）
  useEffect(() => {
    const refresh = () => setItems(getSelectedProducts())
    window.addEventListener('popstate', refresh)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh()
    })
    return () => {
      window.removeEventListener('popstate', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  // 初始化 WebSocket 连接（登录用户用真实 token，访客自动获取临时 token）
  useEffect(() => {
    if (!showChat) return

    const connectSocket = (token: string) => {
      const socket = io({ auth: { token, channel: 'order' } })
      socketRef.current = socket

      socket.on('connect', () => setSocketConnected(true))
      socket.on('disconnect', () => setSocketConnected(false))

      socket.on('chat_history', (history: ChatMessage[]) => {
        setMessages(history)
        isInitialLoad.current = false
        setTimeout(() => chatEndRef.current?.scrollIntoView(), 50)
      })

      socket.on('more_history', (older: ChatMessage[]) => {
        if (older.length < 20) setHasMoreHistory(false)
        const container = chatMessagesRef.current
        const prevScrollHeight = container?.scrollHeight || 0
        setMessages(prev => [...older, ...prev])
        setTimeout(() => {
          if (container) container.scrollTop = container.scrollHeight - prevScrollHeight
        }, 50)
        setLoadingMore(false)
      })

      socket.on('receive_message', (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg])
      })

      socket.on('connect_error', async (err: Error) => {
        console.error('WebSocket 连接失败:', err.message)
        setSocketConnected(false)
        // Token 过期/无效 → 自动获取新 token 并重连
        if (err.message === 'Token 无效或已过期') {
          sessionStorage.removeItem('guest_token')
          try {
            const res = await fetch('/api/auth/guest-token', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            const data = await res.json()
            if (data.success && data.data.token) {
              sessionStorage.setItem('guest_token', data.data.token)
              socket.auth = { token: data.data.token, channel: 'order' }
              socket.connect()
            }
          } catch (e) {
            console.error('自动刷新 token 失败:', e)
          }
        }
      })

      return socket
    }

    // 已登录：直接用真实 token
    const realToken = localStorage.getItem('token')
    if (realToken) {
      const socket = connectSocket(realToken)
      return () => { socket.disconnect(); socketRef.current = null }
    }

    // 未登录：获取/复用访客 token
    let cancelled = false
    const getGuestToken = async () => {
      let guestToken = sessionStorage.getItem('guest_token')
      if (!guestToken) {
        try {
          const res = await fetch('/api/auth/guest-token', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
          const data = await res.json()
          if (data.success && data.data.token) {
            const newToken: string = data.data.token
            guestToken = newToken
            sessionStorage.setItem('guest_token', newToken)
          }
        } catch (e) {
          console.error('获取访客 token 失败:', e)
          return
        }
      }
      if (cancelled || !guestToken) return
      // 访客 token 就绪后，补同步购物车到服务器（之前加入的商品因无 token 未能同步）
      syncCartToServer()
      connectSocket(guestToken)
    }
    getGuestToken()

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [showChat])

  // 新消息自动滚动到底部（仅在发送/接收新消息时，不在加载历史时）
  useEffect(() => {
    if (isInitialLoad.current) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 滚动到顶部时加载更多历史
  const handleChatScroll = () => {
    const container = chatMessagesRef.current
    if (!container || loadingMore || !hasMoreHistory || messages.length === 0) return
    if (container.scrollTop < 50) {
      setLoadingMore(true)
      const oldestId = messages[0]?.id
      if (oldestId && socketRef.current) {
        socketRef.current.emit('load_more_history', { before_id: oldestId })
      } else {
        setLoadingMore(false)
      }
    }
  }

  // 离开订单页时清除首次咨询标记
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('order_first_chat_notified')
    }
  }, [])

  const handleSendMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return
    const content = chatInput.trim()
    socketRef.current.emit('send_message', { content })
    setChatInput('')

    // 首次发起咨询时发送提醒邮件（支持登录用户和访客）
    if (!sessionStorage.getItem('order_first_chat_notified')) {
      sessionStorage.setItem('order_first_chat_notified', '1')
      const token = localStorage.getItem('token') || sessionStorage.getItem('guest_token')
      fetch('/api/chat/notify-first-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      }).catch(e => console.error('发送咨询提醒邮件失败:', e))
    }
  }

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, SelectedItem[]>()
    for (const item of items) {
      const label = CATEGORY_LABELS[item.categoryId] || item.categoryId
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(item)
    }
    return map
  }, [items])

  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0), [items])

  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const pdfGroups: { label: string; items: SelectedItem[] }[] = Array.from(grouped.entries()).map(([label, items]) => ({ label, items }))
      await exportOrderPDF(pdfGroups, totalPrice)
    } finally {
      setExporting(false)
    }
  }

  const handleRemove = (categoryId: string, productId: string) => {
    // 清除购物车
    const updated = removeSelectedProduct(categoryId, productId)
    setItems([...updated])
    // 同步清除意向单 sessionStorage + 服务端（花卉/酒水）
    if (categoryId === 'floral-product') {
      removeWishlistFromServer('floral', productId)
    } else if (categoryId === 'wine') {
      removeWishlistFromServer('wine', productId)
    }
  }

  const handleClear = () => {
    clearSelectedProducts()
    // 清除花卉/酒水模块独立的 sessionStorage key
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith('flower_wishlist_') || key?.startsWith('selected_flowers_') || key?.startsWith('wine_wishlist_')) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k))
    setItems([])
  }

  return (
    <div className="order-detail-page">
      {/* 顶部导航 */}
      <div className="order-detail-nav">
        <button className="order-detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="order-detail-title">我的订单</h1>
        <button className="order-detail-chat-toggle" onClick={() => setShowChat(v => !v)}>
          💬 {showChat ? '收起咨询' : '咨询客服'}
        </button>
      </div>

      {/* 主体区域 */}
      <div className="order-detail-main">
        {/* 左侧：订单内容 */}
        <div className="order-detail-content" ref={contentRef}>
        {items.length === 0 ? (
          <div className="order-detail-empty">
            <div className="order-detail-empty-icon">🛍️</div>
            <h3>还没有选择商品哦</h3>
            <p className="order-detail-empty-desc">去婚礼商城挑选您心仪的服务，我们将为您量身定制专属方案</p>
            <button className="order-detail-btn-primary" onClick={() => navigate('/listing')}>
              🛒 去选购
            </button>
          </div>
        ) : (
          <>
            {/* 按分类展示 */}
            <div className="order-detail-groups">
              {Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
                <div key={groupLabel} className="order-detail-group">
                  <div className="order-detail-group-header">
                    <span className="order-detail-group-label">{groupLabel}</span>
                    <span className="order-detail-group-count">{groupItems.length} 项</span>
                  </div>
                  {groupItems.map(item => {
                    const detailPath = getDetailPath(item.categoryId, item.productId)
                    return (
                    <div
                      key={`${item.categoryId}:${item.productId}`}
                      className="order-detail-item"
                    >
                      <div className="order-detail-item-img">
                        <img
                          src={getProductImg(item)}
                          alt={item.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="order-detail-item-info">
                        <div className="order-detail-item-name">{item.name}</div>
                        <div className="order-detail-item-name-en">{item.nameEn}</div>
                        <div className="order-detail-item-price">
                          {item.unit === '€' ? '€' : item.unit === '£' ? '£' : '¥'}{item.price.toLocaleString()}
                        </div>
                        {item.specs && (
                          <div className="order-detail-item-specs">{item.specs}</div>
                        )}
                        {detailPath && (
                          <span
                            className="order-detail-item-link"
                            onClick={(e) => { e.stopPropagation(); navigate(detailPath) }}
                          >
                            查看详情 →
                          </span>
                        )}
                      </div>
                      <button
                        className="order-detail-item-remove"
                        onClick={(e) => { e.stopPropagation(); handleRemove(item.categoryId, item.productId) }}
                        title="移除"
                      >
                        ✕
                      </button>
                    </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 底部汇总 */}
            <div className="order-detail-summary">
              <div className="order-detail-summary-row">
                <span>共 {items.reduce((s, i) => s + (i.qty || 1), 0)} 项服务</span>
                <span className="order-detail-total">
                  合计：€{totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="order-detail-actions">
                <button className="order-detail-btn-clear" onClick={handleClear}>
                  清空选择
                </button>
                <button className="order-detail-btn-primary" onClick={() => navigate('/listing')}>
                  继续选购
                </button>
                <button className="order-detail-btn-export" onClick={handleExportPDF} disabled={exporting}>
                  {exporting ? '生成中...' : '📄 导出PDF'}
                </button>
              </div>
            </div>

            {/* 页脚品牌信息 */}
            <div className="order-detail-footer">
              <div className="order-detail-footer__monogram">V &amp; V</div>
              <p className="order-detail-footer__tagline">Forever &amp; Always</p>
              <div className="order-detail-footer__copy">© 2026 Verra & Voile (Beijing) Network Technology Co., Ltd.</div>
              <div className="order-detail-footer__icp">
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="nofollow">皖ICP备2026019280号-1</a>
              </div>
            </div>
          </>
        )}
      </div>

        {/* 右侧：聊天面板（始终渲染，避免布局抖动） */}
        <div className={`order-chat-panel ${showChat ? '' : 'order-chat-panel--hidden'}`}>
          {!showChat ? (
            <div className="order-chat-login-prompt">
              <div className="order-chat-login-prompt__icon">💬</div>
              <h3>需要帮助？</h3>
              <p>在线沟通客服，为您量身定制方案</p>
              <button className="order-chat-login-prompt__btn" onClick={() => setShowChat(true)}>
                开始咨询
              </button>
            </div>
          ) : (
            <>
            <div className="order-chat-header">
              <span className="order-chat-header__title">💬 在线咨询</span>
              <span className={`order-chat-header__status ${socketConnected ? 'order-chat-header__status--online' : ''}`}>
                {socketConnected ? '已连接' : '连接中...'}
              </span>
              <button className="order-chat-header__close" onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div className="order-chat-messages" ref={chatMessagesRef} onScroll={handleChatScroll}>
              {loadingMore && (
                <div className="order-chat-loading">加载中...</div>
              )}
              {!hasMoreHistory && messages.length > 0 && (
                <div className="order-chat-loading">已无更多历史消息</div>
              )}
              {messages.length === 0 && (
                <div className="order-chat-empty">
                  <p>您好！请描述您的需求，</p>
                  <p>我们的婚礼顾问将为您提供专业服务。</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`order-chat-msg order-chat-msg--${msg.sender_type}`}>
                  <div className="order-chat-msg__bubble">
                    <p>{msg.content}</p>
                    <span className="order-chat-msg__time">
                      {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="order-chat-input">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="请输入您的咨询内容..."
                rows={2}
              />
              <button
                className="order-chat-send"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || !socketConnected}
              >
                发送
              </button>
            </div>
            </>
          )}
        </div>
      </div>

      {/* 登录弹窗 */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onSuccess={() => { setShowLoginModal(false); setLoggedIn(true) }} title="欢迎" desc="登录后即可咨询婚礼顾问" />
      )}
    </div>
  )
}
