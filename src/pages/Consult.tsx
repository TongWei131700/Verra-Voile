import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { syncCartToServer } from '../utils/selectedProducts'
import LoginModal from '../components/LoginModal'

interface ChatMessage {
  id: number
  sender_type: 'user' | 'admin' | 'system'
  content: string
  created_at: string
}

interface ConsultContext {
  name: string
  nameEn: string
  image: string
  price: number
  unit: string
  type: string
  slug?: string
  route?: string
}

export default function Consult() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loggedIn] = useState(() => !!localStorage.getItem('token'))
  const [context, setContext] = useState<ConsultContext | null>(() => {
    try {
      const raw = sessionStorage.getItem('consult_context')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)
  const localSystemIds = useRef<Set<string>>(new Set())
  const localSystemMsgs = useRef<ChatMessage[]>([])
  const productContextSentRef = useRef(false)

  // 进入页面时滚动到顶部（同步执行，避免闪烁）
  useLayoutEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // 进入页面自动建立 WebSocket 连接
  useEffect(() => {
    const connectSocket = (token: string) => {
      const socket = io({ auth: { token, channel: 'consult' } })
      socketRef.current = socket

      socket.on('connect', () => {
        setSocketConnected(true)
      })
      socket.on('disconnect', () => setSocketConnected(false))

      socket.on('chat_history', (history: ChatMessage[]) => {
        // 保留本地追加的 system 消息（后端 history 可能还没有它们）
        const serverIds = new Set(history.map(h => h.id))
        const localOnly = localSystemMsgs.current.filter(m => !serverIds.has(m.id))
        const merged = [...history, ...localOnly].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(merged)
        isInitialLoad.current = false
        setTimeout(() => chatEndRef.current?.scrollIntoView(), 50)
      })

      socket.on('more_history', (older: ChatMessage[]) => {
        const container = chatMessagesRef.current
        const prevScrollHeight = container?.scrollHeight || 0
        setMessages(prev => [...older, ...prev])
        setTimeout(() => {
          if (container) container.scrollTop = container.scrollHeight - prevScrollHeight
        }, 50)
      })

      socket.on('receive_message', (msg: ChatMessage) => {
        // 过滤后端返回的 system 消息（如果前端已本地添加过相同商品）
        if (msg.sender_type === 'system') {
          try {
            const ctx = JSON.parse(msg.content)
            const pid = `${ctx.type}_${ctx.name}`
            if (localSystemIds.current.has(pid)) return
          } catch {}
        }
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
              socket.auth = { token: data.data.token, channel: 'consult' }
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
      // 访客 token 就绪后，补同步购物车到服务器
      syncCartToServer()
      connectSocket(guestToken)
    }
    getGuestToken()

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [])

  // 新消息自动滚动到底部
  useEffect(() => {
    if (isInitialLoad.current) return
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket 连接后推送商品上下文（独立 effect，确保 context 和 socket 都就绪）
  useEffect(() => {
    if (!context || !socketRef.current?.connected || productContextSentRef.current) {
      return
    }
    productContextSentRef.current = true
    // 前端立即追加系统消息
    const sysMsg: ChatMessage = {
      id: Date.now(),
      sender_type: 'system',
      content: JSON.stringify(context),
      created_at: new Date().toISOString(),
    }
    localSystemMsgs.current.push(sysMsg)
    setMessages(prev => [...prev, sysMsg])
    localSystemIds.current.add(`${context.type}_${context.name}`)
    // 推送后端（管理员可见 + 持久化）
    socketRef.current.emit('product_context', {
      name: context.name, nameEn: context.nameEn, image: context.image,
      price: context.price, unit: context.unit, type: context.type,
    })
  }, [context, socketConnected])

  // 离开页面时清除首次咨询标记
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

  return (
    <div className="consult-page">
      {/* 顶部导航 */}
      <div className="consult-header">
        <button className="consult-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="consult-title">💬 在线咨询</h1>
        <span className={`consult-status ${socketConnected ? 'consult-status--online' : ''}`}>
          {socketConnected ? '已连接' : '连接中...'}
        </span>
      </div>

      {/* 聊天消息区 */}
      <div className="consult-messages" ref={chatMessagesRef}>
        {messages.length === 0 && (
          <div className="order-chat-empty">
            <p>您好！请描述您的需求，</p>
            <p>我们的婚礼顾问将为您提供专业服务。</p>
          </div>
        )}
        {messages.map(msg => {
          // 系统消息：商品咨询上下文气泡（从后端 DB 渲染）
          if (msg.sender_type === 'system') {
            let ctx: ConsultContext | null = null
            try { ctx = JSON.parse(msg.content) } catch {}
            if (!ctx?.name) return null
            return (
              <div key={msg.id} className="consult-system-product">
                <span className="consult-system-product__label">🛍️ 正在咨询</span>
                <div
                  className="consult-system-product__card"
                  style={ctx.route ? { cursor: 'pointer' } : undefined}
                  onClick={() => ctx.route && navigate(ctx.route)}
                >
                  {ctx.image && <img src={ctx.image} alt={ctx.name} className="consult-system-product__img" />}
                  <div className="consult-system-product__info">
                    <span className="consult-system-product__type">{ctx.type}</span>
                    <span className="consult-system-product__name">{ctx.name}</span>
                    {ctx.nameEn && <span className="consult-system-product__name-en">{ctx.nameEn}</span>}
                    {ctx.price > 0 && (
                      <span className="consult-system-product__price">{ctx.unit}{ctx.price?.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          }
          return (
            <div key={msg.id} className={`order-chat-msg order-chat-msg--${msg.sender_type}`}>
              <div className="order-chat-msg__bubble">
                <p>{msg.content}</p>
                <span className="order-chat-msg__time">
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={chatEndRef} />
      </div>

      {/* 输入区 */}
      <div className="consult-input">
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

      {/* 登录弹窗（可选，不阻塞使用） */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} onSuccess={() => setShowLoginModal(false)} title="欢迎" desc="登录后即可咨询婚礼顾问" />
      )}
    </div>
  )
}
