import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { getSelectedProducts, removeSelectedProduct, clearSelectedProducts } from '../utils/selectedProducts'
import type { SelectedItem } from '../utils/selectedProducts'
import { moduleProducts } from '../data/products'

const CATEGORY_LABELS: Record<string, string> = {
  destination: '目的地婚礼',
  team: '婚礼团队',
  floral: '花卉',
  wine: '酒水与餐饮',
  other: '其他服务',
}

/** 根据 categoryId 找到商品图片 */
function getProductImg(categoryId: string, productId: string): string {
  if (categoryId === 'destination') {
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
  }
  const product = moduleProducts[categoryId]?.products.find(p => p.id === productId)
  return product?.img || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
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
  const [showChat, setShowChat] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  // 同步购物车到后端
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token || items.length === 0) return
    fetch('/api/cart/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    }).catch(e => console.error('同步购物车失败:', e))
  }, [items])

  // 初始化 WebSocket 连接
  useEffect(() => {
    if (!showChat) return
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io({
      auth: { token },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketConnected(true)
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('chat_history', (history: ChatMessage[]) => {
      setMessages(history)
      isInitialLoad.current = false
      // 初始加载后滚动到底部
      setTimeout(() => chatEndRef.current?.scrollIntoView(), 50)
    })

    socket.on('more_history', (older: ChatMessage[]) => {
      if (older.length < 20) setHasMoreHistory(false)
      // 记录当前第一条消息的位置，插入后保持滚动位置
      const container = chatMessagesRef.current
      const prevScrollHeight = container?.scrollHeight || 0
      setMessages(prev => [...older, ...prev])
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight
        }
      }, 50)
      setLoadingMore(false)
    })

    socket.on('receive_message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('connect_error', (err: Error) => {
      console.error('WebSocket 连接失败:', err.message)
      setSocketConnected(false)
    })

    return () => {
      socket.disconnect()
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

    // 首次发起咨询时发送提醒邮件
    if (!sessionStorage.getItem('order_first_chat_notified')) {
      sessionStorage.setItem('order_first_chat_notified', '1')
      const token = localStorage.getItem('token')
      // 从 token 解析用户信息（此处仅传展示用信息，后端通过 socket 可获取更准确数据）
      fetch('/api/chat/notify-first-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items])

  const handleRemove = (categoryId: string, productId: string) => {
    const updated = removeSelectedProduct(categoryId, productId)
    setItems([...updated])
  }

  const handleClear = () => {
    clearSelectedProducts()
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
        <div className="order-detail-content">
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
                  {groupItems.map(item => (
                    <div
                      key={`${item.categoryId}:${item.productId}`}
                      className="order-detail-item"
                    >
                      <div className="order-detail-item-img">
                        <img
                          src={getProductImg(item.categoryId, item.productId)}
                          alt={item.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="order-detail-item-info">
                        <div className="order-detail-item-name">{item.name}</div>
                        <div className="order-detail-item-name-en">{item.nameEn}</div>
                        <div className="order-detail-item-price">
                          {item.unit === '€' ? '€' : '¥'}{item.price.toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="order-detail-item-remove"
                        onClick={() => handleRemove(item.categoryId, item.productId)}
                        title="移除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 底部汇总 */}
            <div className="order-detail-summary">
              <div className="order-detail-summary-row">
                <span>共 {items.length} 项服务</span>
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
              </div>
            </div>
          </>
        )}
      </div>

        {/* 右侧：聊天面板（始终渲染，避免布局抖动） */}
        <div className={`order-chat-panel ${showChat ? '' : 'order-chat-panel--hidden'}`}>
            <div className="order-chat-header">
              <span className="order-chat-header__title">💬 在线咨询</span>
              <span className={`order-chat-header__status ${socketConnected ? 'order-chat-header__status--online' : ''}`}>
                {socketConnected ? '已连接' : '连接中...'}
              </span>
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
        </div>
      </div>
    </div>
  )
}
