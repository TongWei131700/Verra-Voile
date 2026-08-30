import { useState, useEffect, useRef, useLayoutEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import Seo from '../components/Seo'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface PlanItem {
  category: string
  categoryCn: string
  name: string
  nameEn: string
  description: string
  priceRange: string
  image: string
  link: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface TurnData {
  thinkingLabels: string[]
  text: string
  tableData: Map<number, string>
  planSummary?: PlanItem[]
}

export default function AgentChat() {
  const navigate = useNavigate()

  /* ── React state（仅低频变化） ── */
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const s = sessionStorage.getItem('agent_chat_messages')
      return s ? JSON.parse(s) : []
    } catch { return [] }
  })
  const [showAsst, setShowAsst] = useState(false)   // 助手气泡是否可见
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null) // 当前打开反馈输入的回复索引
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState<Set<number>>(new Set()) // 已发送反馈的回复索引
  const [sessionId, setSessionId] = useState(() =>
    sessionStorage.getItem('agent_session_id') || ''
  )

  /* ── 媒体上传状态 ── */
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [mediaId, setMediaId] = useState('')
  const [mediaPreview, setMediaPreview] = useState('')
  const [mediaUploading, setMediaUploading] = useState(false)
  const [mediaType, setMediaType] = useState<'video' | 'image' | ''>('')

  /* ── Refs（高频变化，直接操作 DOM，不触发 re-render） ── */
  const socketRef = useRef<Socket | null>(null)
  const tkContainerRef = useRef<HTMLDivElement>(null)   // 思考步骤容器
  const tkIconRef = useRef<HTMLImageElement>(null)       // 唯一图标（左上角）
  const rpyRawRef = useRef<HTMLDivElement>(null)         // 回复打字区（raw text）
  const fullReplyRef = useRef('')                        // 累积的完整回复
  const tkgQueueRef = useRef<string[]>([])               // 待打思考步骤队列
  const tkgStepsRef = useRef(0)                          // 已打步骤计数
  const isTkgRef = useRef(false)                         // 正在打思考？
  const isRpyRef = useRef(false)                         // 正在打回复？
  const tkgTimerRef = useRef<number | null>(null)
  const rpyTimerRef = useRef<number | null>(null)
  const allTkgDoneRef = useRef(false)
  const rpyStartedRef = useRef(false)
  const thinkingLabelsRef = useRef<string[]>([])            // 当前轮次的思考标签
  const tableDataRef = useRef<Map<number, string>>(new Map()) // 后端推送的表格数据 [TABLE_N] → content
  const planSummaryRef = useRef<PlanItem[] | null>(null)       // 后端推送的方案摘要数据
  const dotsRef = useRef<HTMLDivElement>(null)             // 跳动点容器
  const dividerRef = useRef<HTMLDivElement>(null)          // 思考/回复分隔线
  const isPlaceholderRef = useRef(false)                   // 是否还在打前置占位
  const messagesRef = useRef<HTMLDivElement>(null)          // 消息容器 ref（用于滚动）

  // turns 持久化：Map 不能直接 JSON，需序列化
  const serializeTurns = (turns: TurnData[]) =>
    turns.map(t => ({ thinkingLabels: t.thinkingLabels, text: t.text, tableData: Array.from(t.tableData.entries()), planSummary: t.planSummary }))
  const deserializeTurns = (raw: any[]): TurnData[] =>
    raw.map(t => ({ thinkingLabels: t.thinkingLabels || [], text: t.text || '', tableData: new Map(t.tableData || []), planSummary: t.planSummary }))
  const saveTurns = () => {
    try { sessionStorage.setItem('agent_chat_turns', JSON.stringify(serializeTurns(turnsRef.current))) } catch {}
  }
  const turnsRef = useRef<TurnData[]>((() => {
    try {
      const s = sessionStorage.getItem('agent_chat_turns')
      return s ? deserializeTurns(JSON.parse(s)) : []
    } catch { return [] }
  })())

  /* ── 持久化 ── */
  useEffect(() => { if (sessionId) sessionStorage.setItem('agent_session_id', sessionId) }, [sessionId])
  useEffect(() => { sessionStorage.setItem('agent_chat_messages', JSON.stringify(messages)) }, [messages])

  /* ── Socket 连接 ── */
  useEffect(() => {
    const url = import.meta.env.DEV ? 'http://localhost:3000/agent' : '/agent'
    const connect = () => {
      // 获取用户标识：已登录用手机号/邮箱，未登录生成 guest
      const token = localStorage.getItem('token')
      let userToken = token ? (localStorage.getItem('userPhone') || localStorage.getItem('userEmail') || token.substring(0, 16)) : sessionStorage.getItem('agent_guest_id')
      if (!userToken) {
        userToken = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        sessionStorage.setItem('agent_guest_id', userToken)
      }
      const socket = io(url, { transports: ['websocket'], reconnection: true, reconnectionDelay: 1000, auth: { userToken } })
      socketRef.current = socket
      socket.on('connect', () => console.log('[Agent] connected'))
      socket.on('disconnect', () => console.log('[Agent] disconnected'))
      socket.on('connect_error', (err) => {
        console.warn('[Agent] connect_error:', err.message)
      })
      socket.on('agent_session', (d: { sessionId: string }) => setSessionId(d.sessionId))
    }
    connect()

    // 页面重新可见时检查并重建连接（SPA 路由跳转后返回 + bfcache）
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const socket = socketRef.current
        if (!socket || !socket.connected) {
          console.log('[Agent] 页面恢复可见，socket 已断开，重建连接')
          socket?.disconnect()
          connect()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // bfcache 恢复时重建 WebSocket
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        console.log('[Agent] bfcache 恢复，重建连接')
        socketRef.current?.disconnect()
        connect()
      }
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      socketRef.current?.disconnect()
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  /* ── Socket 事件 ── */
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const onEvent = (ev: { type: string; label?: string; content?: string; index?: number; items?: PlanItem[] }) => {
      switch (ev.type) {
        case 'thinking': {
          const label = ev.label || '思考中...'
          // 首条真实思考 → 清掉前置占位
          if (isPlaceholderRef.current) {
            isPlaceholderRef.current = false
            if (tkgTimerRef.current) { clearInterval(tkgTimerRef.current); tkgTimerRef.current = null }
            isTkgRef.current = false
            tkgQueueRef.current = []
            tkgStepsRef.current = 0
            if (tkContainerRef.current) tkContainerRef.current.innerHTML = ''
            if (tkIconRef.current) { tkIconRef.current.src = '/agent-thinking.gif'; tkIconRef.current.style.display = '' }
            setShowAsst(true)
            if (dotsRef.current) dotsRef.current.style.display = ''
          }
          // 收集思考标签
          thinkingLabelsRef.current.push(label)
          tkgQueueRef.current.push(label)
          scheduleTkg()
          break
        }
        case 'token': {
          // 首个 token 到达（无工具调用场景）：清除前置占位思考
          if (isPlaceholderRef.current) {
            isPlaceholderRef.current = false
            if (tkgTimerRef.current) { clearInterval(tkgTimerRef.current); tkgTimerRef.current = null }
            isTkgRef.current = false
            tkgQueueRef.current = []
            tkgStepsRef.current = 0
            if (tkContainerRef.current) tkContainerRef.current.innerHTML = ''
            if (tkIconRef.current) tkIconRef.current.style.display = 'none'
            setShowAsst(true)
            if (dotsRef.current) dotsRef.current.style.display = ''
          }
          fullReplyRef.current += (ev.content || '')
          if (!rpyStartedRef.current && allTkgDoneRef.current) startReply()
          break
        }
        case 'table_data': {
          // 后端推送的表格数据，index 对应文本中的 [TABLE_N] 标记
          if (ev.index != null && ev.content) {
            tableDataRef.current.set(ev.index, ev.content)
            console.log(`[Agent] ✅ 收到表格 #${ev.index}, 长度: ${ev.content.length}, 预览:`, ev.content.slice(0, 120))
          } else {
            console.warn('[Agent] ⚠️ table_data 事件数据异常:', ev)
          }
          break
        }
        case 'plan_summary': {
          // 后端推送的方案摘要数据
          if (ev.items && Array.isArray(ev.items)) {
            planSummaryRef.current = ev.items
            console.log('[Agent] 📋 收到方案摘要:', ev.items.length, '项')
          }
          break
        }
        case 'done': {
          allTkgDoneRef.current = true
          if (rpyStartedRef.current) break
          if (fullReplyRef.current) startReply()
          else finishReply()
          break
        }
        case 'error': {
          loadingRef.current = false  // 出错时也要允许重新发送
          fullReplyRef.current += (ev.content || '服务异常')
          allTkgDoneRef.current = true
          if (!rpyStartedRef.current) startReply()
          break
        }
      }
    }

    socket.on('agent_event', onEvent)
    return () => { socket.off('agent_event', onEvent) }
  }, [])

  /* ── 思考步骤调度器 ── */
  const scheduleTkg = () => {
    if (isTkgRef.current || tkgQueueRef.current.length === 0) return
    const text = tkgQueueRef.current.shift()!
    typeTkgStep(text)
  }

  useEffect(() => { scheduleTkg() })

  /* ── 逐字打思考步骤（直接 DOM 操作） ── */
  const typeTkgStep = (text: string) => {
    isTkgRef.current = true
    const container = tkContainerRef.current
    if (!container) { isTkgRef.current = false; return }

    const el = document.createElement('div')
    el.className = 'agent-thinking-step'
    // 第一条思考步骤：图标内联在文字旁边
    if (tkgStepsRef.current === 0 && tkIconRef.current) {
      el.appendChild(tkIconRef.current)
      tkIconRef.current.style.display = ''
    }
    const textEl = document.createElement('span')
    textEl.className = 'agent-thinking-step__text'
    el.appendChild(textEl)
    container.appendChild(el)

    const cursor = document.createElement('span')
    cursor.className = 'agent-thinking-cursor'
    cursor.textContent = '|'
    textEl.appendChild(cursor)

    const chars = [...text]
    let idx = 0

    tkgTimerRef.current = window.setInterval(() => {
      idx++
      if (idx >= chars.length) {
        if (tkgTimerRef.current) clearInterval(tkgTimerRef.current)
        tkgTimerRef.current = null
        cursor.remove()
        tkgStepsRef.current++
        isTkgRef.current = false
        // 将点点点动画移到当前步骤文字后面（inline）
        if (dotsRef.current) {
          textEl.appendChild(dotsRef.current)
          dotsRef.current.style.display = ''
        }

        if (tkgQueueRef.current.length > 0) {
          scheduleTkg()
        } else if (allTkgDoneRef.current) {
          if (fullReplyRef.current) startReply()
          else finishReply()
        }
        return
      }
      textEl.insertBefore(document.createTextNode(chars[idx - 1]), cursor)
      // 平滑滚动消息区到底部
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight
      }
    }, 100)
  }

  /* ── 回复直接打印（跳过逐字动画，思考速度不变） ── */
  const startReply = () => {
    if (isRpyRef.current || !rpyRawRef.current) return
    rpyStartedRef.current = true
    isRpyRef.current = true
    rpyRawRef.current.style.display = ''
    rpyRawRef.current.textContent = fullReplyRef.current
    isRpyRef.current = false
    finishReply()
  }

  const finishReply = () => {
    loadingRef.current = false  // 回复完成，允许发送下一条
    // 保存当前轮次回复（含思考标签 + 表格数据快照）
    turnsRef.current = [...turnsRef.current, {
      thinkingLabels: [...thinkingLabelsRef.current],
      text: fullReplyRef.current,
      tableData: new Map(tableDataRef.current),
      planSummary: planSummaryRef.current || undefined,
    }]
    saveTurns()  // 持久化到 sessionStorage
    console.log(`[Agent] ✅ 回复完成，思考标签: ${thinkingLabelsRef.current.length} 个，轮次数: ${turnsRef.current.length}`)
    // 清掉思考步骤 DOM（已保存到 thinkingLabels，会在已完成轮次中用 React 渲染）
    if (tkContainerRef.current) tkContainerRef.current.innerHTML = ''
    if (tkIconRef.current) tkIconRef.current.style.display = 'none'
    if (dotsRef.current) dotsRef.current.style.display = 'none'
    if (dividerRef.current) dividerRef.current.style.display = 'none'
    // 隐藏打字区，统一用 renderContent 渲染（含表格解析）
    if (rpyRawRef.current) rpyRawRef.current.style.display = 'none'
    // 隐藏思考区（已完成内容在 turnsRef 中渲染，思考区空了会变空白框）
    setShowAsst(false)
    setMessages(prev => [...prev])
    // 等 React 渲染完表格/卡片后滚动到底部
    requestAnimationFrame(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight
      }
    })
  }

  /* ── 重置（发新消息时） ── */
  const resetForNewMsg = () => {
    if (tkgTimerRef.current) clearInterval(tkgTimerRef.current)
    if (rpyTimerRef.current) clearInterval(rpyTimerRef.current)
    tkgTimerRef.current = null
    rpyTimerRef.current = null
    isTkgRef.current = false
    isRpyRef.current = false
    tkgQueueRef.current = []
    tkgStepsRef.current = 0
    allTkgDoneRef.current = false
    rpyStartedRef.current = false
    fullReplyRef.current = ''
    thinkingLabelsRef.current = []
    tableDataRef.current = new Map()
    planSummaryRef.current = null
    if (tkContainerRef.current) tkContainerRef.current.innerHTML = ''
    if (tkIconRef.current) { tkIconRef.current.src = '/agent-thinking.gif'; tkIconRef.current.style.display = 'none' }
    if (rpyRawRef.current) { rpyRawRef.current.textContent = ''; rpyRawRef.current.style.display = 'none' }
    if (dotsRef.current) dotsRef.current.style.display = 'none'
    if (dividerRef.current) dividerRef.current.style.display = 'none'
    isPlaceholderRef.current = false
    setShowAsst(false)  // 隐藏思考区，等下一轮 thinking/token 事件再显示
    // 注意：不清空 turnsRef，保留之前轮次的回复
  }

  /* ── 媒体上传处理 ── */
  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // 重置 input 以便重复选择同一文件
    e.target.value = ''

    // 生成预览
    const isVideo = file.type.startsWith('video/')
    if (isVideo) {
      const url = URL.createObjectURL(file)
      setMediaPreview(url)
      setMediaType('video')
    } else {
      const reader = new FileReader()
      reader.onload = (ev) => { setMediaPreview(ev.target?.result as string); setMediaType('image') }
      reader.readAsDataURL(file)
    }

    // 上传
    setMediaUploading(true)
    setMediaId('')
    try {
      const formData = new FormData()
      formData.append('media', file)
      const res = await fetch('/api/agent/upload-media', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success) {
        const vid = json.data.videoId
        setMediaId(vid)
        console.log('[Agent] 媒体上传成功:', json.data)
        // 上传成功后自动发送分析请求
        setTimeout(() => doSend('请分析这个婚礼视频/图片的风格，并推荐匹配的场地、花艺和礼服方案', vid), 300)
      } else {
        console.error('[Agent] 媒体上传失败:', json.message)
        setMediaPreview('')
        setMediaType('')
      }
    } catch (err) {
      console.error('[Agent] 媒体上传异常:', err)
      setMediaPreview('')
      setMediaType('')
    } finally {
      setMediaUploading(false)
    }
  }

  const handleMediaRemove = () => {
    if (mediaPreview && mediaPreview.startsWith('blob:')) URL.revokeObjectURL(mediaPreview)
    setMediaId('')
    setMediaPreview('')
    setMediaType('')
  }

  /* ── 发送消息 ── */
  const doSend = (text: string, overrideMediaId?: string) => {
    if (!text || loadingRef.current) return
    resetForNewMsg()
    setMessages(prev => [...prev, {
      id: `u${Date.now()}`, role: 'user' as const, content: text, timestamp: Date.now(),
    }])
    if (inputRef.current) inputRef.current.value = ''
    setInputVal('')
    loadingRef.current = true
    const currentMediaId = overrideMediaId || mediaId || undefined
    // 立即显示助手气泡 + 前置占位思考
    setShowAsst(true)
    isPlaceholderRef.current = true
    tkgQueueRef.current = [currentMediaId ? '正在分析你上传的婚礼媒体...' : '正在分析你的需求...', '提取关键信息...']
    if (dotsRef.current) dotsRef.current.style.display = ''
    socketRef.current?.emit('chat', { message: text, sessionId: sessionId || undefined, mediaId: currentMediaId })
    // 清除媒体状态
    if (currentMediaId) handleMediaRemove()
    isPlaceholderRef.current = true  // 标记前置占位，等待真实 thinking/token 时清除
  }

  const sendMsg = () => {
    const text = inputRef.current?.value.trim()
    if (!text) return
    doSend(text)
  }

  /* ── 输入框（需要按钮 enable/disable 响应） ── */
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const loadingRef = useRef(false)
  const [inputVal, setInputVal] = useState('')

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  /* ── 清空对话 ── */
  const clearChat = () => {
    resetForNewMsg()
    turnsRef.current = []
    setMessages([])
    setSessionId('')
    loadingRef.current = false
    sessionStorage.removeItem('agent_session_id')
    sessionStorage.removeItem('agent_chat_messages')
    sessionStorage.removeItem('agent_chat_turns')
  }

  /* ── Markdown 渲染（含表格） ── */
  const renderBold = (text: string, keyPrefix = '') => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={`${keyPrefix}${j}`}>{p.slice(2, -2)}</strong>
        : <span key={`${keyPrefix}${j}`}>{p}</span>
    )
  }

  /* 清理卡片描述文本：去除 markdown 格式和多余管道符 */
  const stripCardDesc = (raw: string) =>
    raw.split('|')[0].replace(/\*\*/g, '').replace(/^\s*[-•]\s*/, '').trim()

  /* 渲染卡片：支持多种格式 → 返回 React 节点或 null */
  const renderCard = (text: string, keyPrefix: string): React.ReactNode | null => {
    const t = text.trim()

    // 模式1: 可点击卡片 [![name](img)](link) desc — 外层有链接包裹
    const linkCardMatch = t.match(/^\s*\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)\s*(.*)/)
    if (linkCardMatch) {
      const [, name, img, link, rawDesc] = linkCardMatch
      const desc = stripCardDesc(rawDesc)
      return (
        <div key={keyPrefix} className="agent-venue-card" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(link) }}>
          <img src={img} alt={name} className="agent-venue-card__img" />
          <div className="agent-venue-card__info">
            <div className="agent-venue-card__name">{name}</div>
            {desc && <div className="agent-venue-card__desc">{desc}</div>}
          </div>
          <span className="agent-venue-card__arrow">→</span>
        </div>
      )
    }

    // 模式2: 全宽列表卡片 ![name](url "/full/path") desc — 引号内为完整链接路径
    const imgSlugMatch = t.match(/^\s*!\[([^\]]*)\]\(([^)]+)\s+"([^"]*)"\)\s*(.*)/)
    if (imgSlugMatch) {
      const [, name, img, slug, rawDesc] = imgSlugMatch
      const desc = stripCardDesc(rawDesc)
      // slug 现在是完整路径（如 /flowers/product/coccinelle），直接使用
      const href = slug ? (slug.startsWith('/') ? slug : `/destinations/${slug}`) : undefined
      const inner = (
        <>
          <img src={img} alt={name} className="agent-card-wide__img" />
          <div className="agent-card-wide__body">
            <div className="agent-card-wide__name">{name}</div>
            {desc && <div className="agent-card-wide__desc">{desc}</div>}
          </div>
          {href && <span className="agent-card-wide__arrow">→</span>}
        </>
      )
      return href
        ? <div key={keyPrefix} className="agent-card-wide" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); navigate(href) }}>{inner}</div>
        : <div key={keyPrefix} className="agent-card-wide">{inner}</div>
    }

    // 模式3: 纯图片 ![name](url) desc — 无外层链接、无 slug（模型常见输出）
    const imgOnlyMatch = t.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*(.*)/)
    if (imgOnlyMatch) {
      const [, name, img, rawDesc] = imgOnlyMatch
      const desc = stripCardDesc(rawDesc)
      console.log(`[renderCard] ✅ 模式3匹配: name="${name}", img="${img?.slice(0, 60)}", desc="${desc?.slice(0, 40)}"`)
      return (
        <div key={keyPrefix} className="agent-venue-card agent-venue-card--static">
          <img src={img} alt={name} className="agent-venue-card__img" />
          <div className="agent-venue-card__info">
            <div className="agent-venue-card__name">{name}</div>
            {desc && <div className="agent-venue-card__desc">{desc}</div>}
          </div>
        </div>
      )
    }

    return null
  }

  /* 单元格渲染：优先检测卡片，否则加粗 */
  const renderCell = (cell: string, keyPrefix: string) => {
    console.log(`[renderCell] 输入: ${JSON.stringify(cell.slice(0, 100))}`)
    const card = renderCard(cell, keyPrefix)
    if (card) {
      console.log(`[renderCell] ✅ 卡片匹配成功`)
      return card
    }
    console.log(`[renderCell] ❌ 卡片未匹配，走文字渲染`)
    return renderBold(cell.replace(/\*\*/g, ''), keyPrefix)
  }

  const renderContent = (text: string, tableData?: Map<number, string>) => {
    // 1. 按 [TABLE_N] 标记分割（后端保证标记准确）
    const segments: { type: 'text' | 'table' | 'card'; content: string }[] = []
    const markerRegex = /\[TABLE_(\d+)\]/g
    let lastIdx = 0, m
    while ((m = markerRegex.exec(text)) !== null) {
      if (m.index > lastIdx) segments.push({ type: 'text', content: text.slice(lastIdx, m.index) })
      const tableIdx = parseInt(m[1])
      const tableContent = tableData?.get(tableIdx) || tableDataRef.current.get(tableIdx) || ''
      segments.push({ type: 'table', content: tableContent })
      lastIdx = markerRegex.lastIndex
    }
    if (lastIdx < text.length) segments.push({ type: 'text', content: text.slice(lastIdx) })

    // 2. 兜底：没有 [TABLE_N] 标记时，先提取卡片行再检测表格
    if (segments.length === 1 && segments[0].type === 'text') {
      const rawLines = segments[0].content.split('\n').filter(l => l.trim())
      const cardLineRe = /^\d+\.\s*\[!\[|^\[!\[|^!\[/
      const isCardLine = (l: string) => cardLineRe.test(l.trim())

      // 先提取卡片行（避免被后续预处理正则破坏）
      const preSegs: { type: 'text' | 'table' | 'card'; content: string }[] = []
      let buf: string[] = []
      for (const line of rawLines) {
        if (isCardLine(line)) {
          if (buf.length) { preSegs.push({ type: 'text', content: buf.join('\n') }); buf = [] }
          preSegs.push({ type: 'card', content: line })
        } else {
          buf.push(line)
        }
      }
      if (buf.length) preSegs.push({ type: 'text', content: buf.join('\n') })

      // 对非卡片文本做表格检测预处理
      const newSegs: { type: 'text' | 'table' | 'card'; content: string }[] = []
      for (const seg of preSegs) {
        if (seg.type === 'card') { newSegs.push(seg); continue }
        if (seg.type !== 'text') { newSegs.push(seg); continue }
        let raw = seg.content
        raw = raw.replace(/(?<!^|\n)(\d+\.\s)/g, '\n$1')
        raw = raw.replace(/(?<!\n)\s*\|/g, '\n|')
        raw = raw.replace(/\|(?!\n|$)/g, '|\n')
        const procLines = raw.split('\n').filter(l => l.trim())
        const isTableLine = (l: string) =>
          (l.trim().startsWith('|')) ||
          (/^\d+\.\s/.test(l) && /[|\uff5c]/.test(l))
        const hasAnyTable = procLines.some(isTableLine)
        if (hasAnyTable) {
          let tBuf: string[] = [], inTable = false
          for (const line of procLines) {
            const isT = isTableLine(line)
            if (!inTable && isT) {
              if (tBuf.length) { newSegs.push({ type: 'text', content: tBuf.join('\n') }); tBuf = [] }
              inTable = true; tBuf.push(line)
            } else if (inTable && !isT) {
              if (tBuf.length) { newSegs.push({ type: 'table', content: tBuf.join('\n') }); tBuf = [] }
              inTable = false; tBuf.push(line)
            } else {
              tBuf.push(line)
            }
          }
          if (tBuf.length) newSegs.push({ type: inTable ? 'table' : 'text', content: tBuf.join('\n') })
        } else {
          newSegs.push(seg)
        }
      }
      segments.splice(0, segments.length, ...newSegs)
    }

    console.log('[renderContent] 输入文本前200字:', text.slice(0, 200))
    console.log('[renderContent] segments:', segments.map(s => ({ type: s.type, len: s.content.length, preview: s.content.slice(0, 60) })))

    const result: React.ReactNode[] = []

    segments.forEach((seg, si) => {
      if (seg.type === 'card') {
        // 卡片行（已在兜底阶段提取保护，可能带编号前缀）
        const key = `card${si}`
        const stripped = seg.content.replace(/^\d+\.\s*/, '')
        const card = renderCard(stripped, key)
        if (card) result.push(card)
      } else if (seg.type === 'table') {
        // 直接按换行分割，不做预处理（避免破坏不以 | 开头的表格行）
        const tLines = seg.content.split('\n').map(l => l.trim()).filter(Boolean)
        let ti = 0
        while (ti < tLines.length) {
          const tl = tLines[ti]
          // 编号 + 分隔符 → 卡片表格
          if (/^\d+\.\s/.test(tl) && /[|\uff5c]/.test(tl)) {
            const items: string[][] = []
            while (ti < tLines.length && /^\d+\.\s/.test(tLines[ti]) && /[|\uff5c]/.test(tLines[ti])) {
              const raw = tLines[ti].replace(/^\d+\.\s*/, '')
              items.push(raw.split(/[|\uff5c]/).map(p => p.trim()).filter(Boolean))
              ti++
            }
            if (items.length >= 1) {
              const colCount = Math.max(...items.map(r => r.length))
              result.push(
                <div key={`tv${si}${ti}`} className="agent-table-wrap">
                  <table className="agent-table agent-table--cards">
                    <tbody>
                      {items.map((row, ri) => (
                        <tr key={ri}>
                          {Array.from({ length: colCount }).map((_, ci) => {
                            const cell = row[ci] || ''
                            return <td key={ci} className={ci === 0 ? 'agent-table__name' : ''}>{renderCell(cell, `cc${ri}${ci}`)}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              continue
            }
          }
          // Markdown 表格（支持有/无前导 | 的格式）
          if (tl.includes('|') || tl.includes('\uff5c')) {
            const tRows: string[] = []
            while (ti < tLines.length && (tLines[ti].includes('|') || tLines[ti].includes('\uff5c'))) {
              tRows.push(tLines[ti])
              ti++
            }
            if (tRows.length >= 2) {
              const parseR = (r: string) => {
                // 如果行以 | 开头，去掉首尾空 pipe；否则直接 split
                const trimmed = r.trim().startsWith('|') ? r : '|' + r + (r.trim().endsWith('|') ? '' : '|')
                return trimmed.split('|').slice(1, -1).map(c => c.trim())
              }
              const headers = parseR(tRows[0])
              const dStart = tRows.length > 1 && /^\|?[\s-:|]+\|?$/.test(tRows[1].trim()) ? 2 : 1
              const dRows = tRows.slice(dStart).map(parseR)
              console.log(`[renderContent] ✅ 渲染表格: ${headers.length} 列, ${dRows.length} 数据行, 首行首列:`, dRows[0]?.[0]?.slice(0, 50))
              result.push(
                <div key={`tm${si}${ti}`} className="agent-table-wrap">
                  <table className="agent-table">
                    <thead><tr>{headers.map((h, hi) => <th key={hi}>{renderBold(h, `th${hi}`)}</th>)}</tr></thead>
                    <tbody>{dRows.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{renderCell(cell, `c${ri}${ci}`)}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              )
            }
            continue
          }
          ti++
        }
      } else {
        // 普通文本
        const lines = seg.content.split('\n')
        lines.forEach((line, li) => {
          const key = `s${si}l${li}`
          // 优先检测卡片语法
          const card = renderCard(line, key)
          if (card) {
            result.push(card)
          } else {
            const rendered = renderBold(line, key)
            if (line.match(/^\d+\.\s/)) {
              result.push(<div key={key} className="agent-msg-line agent-msg-line--list">{rendered}</div>)
            } else if (line.startsWith('- ') || line.startsWith('• ')) {
              result.push(<div key={key} className="agent-msg-line agent-msg-line--bullet">{rendered}</div>)
            } else if (line.trim() === '') {
              result.push(<div key={key} className="agent-msg-line agent-msg-line--empty" />)
            } else {
              result.push(<div key={key} className="agent-msg-line">{rendered}</div>)
            }
          }
        })
      }
    })
    console.log(`[renderContent] 🎯 最终渲染元素数: ${result.length}`)
    return result
  }

  // 获取用户标识（已登录用手机号/邮箱，未登录生成随机标识）
  const getUserToken = () => {
    const token = localStorage.getItem('token')
    if (token) return localStorage.getItem('userPhone') || localStorage.getItem('userEmail') || token.substring(0, 16)
    let guestId = sessionStorage.getItem('agent_guest_id')
    if (!guestId) {
      guestId = 'guest_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      sessionStorage.setItem('agent_guest_id', guestId)
    }
    return guestId
  }

  // 提交反馈
  const submitFeedback = async (idx: number, rating: 'up' | 'down') => {
    const text = feedbackIdx === idx ? feedbackText.trim() : ''
    const replyText = turnsRef.current[idx]?.text || ''
    try {
      await fetch('/api/agent/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: getUserToken(),
          rating,
          comment: text || undefined,
          context: replyText.substring(0, 300),
        }),
      })
      setFeedbackSent(prev => new Set(prev).add(idx))
      setFeedbackIdx(null)
      setFeedbackText('')
    } catch {
      // 静默失败
    }
  }

  /* ── 方案摘要渲染 + PDF 下载 ── */
  const downloadPlanPDF = async (items: PlanItem[]) => {
    // 预加载图片
    const imgUrls = items.map(i => i.image).filter(Boolean)
    await new Promise<void>(resolve => {
      if (imgUrls.length === 0) return resolve()
      let loaded = 0
      for (const url of imgUrls) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = img.onerror = () => { loaded++; if (loaded >= imgUrls.length) resolve() }
        img.src = url
      }
    })

    const container = document.createElement('div')
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 800px; background: #fff;
      font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      color: #333; padding: 0;
    `
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

    // 构建每个分组（每项一个分组，保证不被跨页拆分）
    const groupsHTML = items.map((item, idx) => {
      const imgSrc = item.image || ''
      const imgCell = imgSrc
        ? `<img src="${imgSrc}" crossorigin="anonymous" style="width:48px;height:48px;object-fit:cover;border-radius:6px;display:block;" />`
        : `<div style="width:48px;height:48px;border-radius:6px;background:#f5f0ea;display:flex;align-items:center;justify-content:center;font-size:18px;color:#ccc;">📷</div>`
      return `
        <div class="pdf-plan-group" data-group-index="${idx}" style="margin-bottom:28px;">
          <div style="display:flex;align-items:center;margin-bottom:12px;">
            <span style="font-size:16px;font-weight:600;color:#333;letter-spacing:1px;">${item.categoryCn}</span>
            <span style="flex:1;height:1px;background:linear-gradient(to right, #b76e79 0%, transparent 100%);margin-left:16px;"></span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#faf7f2;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;width:60px;">图片</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;">英文名</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;">名称</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#999;font-weight:400;">价格</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;">${imgCell}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:13px;color:#888;">${item.nameEn || ''}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:14px;font-weight:500;">${item.name}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:14px;text-align:right;white-space:nowrap;color:#b76e79;font-weight:600;">${item.priceRange}</td>
              </tr>
            </tbody>
          </table>
        </div>`
    }).join('')

    container.innerHTML = `
      <div id="pdf-header" style="padding:48px 48px 32px;text-align:center;border-bottom:2px solid #b76e79;">
        <h1 style="margin:0;font-size:28px;font-weight:300;letter-spacing:6px;color:#b76e79;">EUROPE WEDDING</h1>
        <p style="margin:8px 0 0;font-size:13px;color:#999;letter-spacing:2px;">婚礼推荐方案</p>
      </div>
      <div id="pdf-info" style="padding:24px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0ebe3;">
        <span style="font-size:13px;color:#888;">日期：${today}</span>
        <span style="font-size:13px;color:#888;">共 ${items.length} 项服务</span>
      </div>
      <div id="pdf-groups-wrapper" style="padding:32px 48px 16px;">
        ${groupsHTML}
      </div>
      <div id="pdf-footer" style="padding:24px 48px 40px;text-align:center;border-top:2px solid #b76e79;margin:0 48px;">
        <p style="margin:0;font-size:11px;color:#bbb;letter-spacing:1px;">Europe Wedding — Your Dream Wedding, Perfectly Crafted</p>
        <p style="margin:6px 0 0;font-size:11px;color:#bbb;">europewedding.cn</p>
      </div>
    `
    document.body.appendChild(container)
    try {
      // 测量各区域高度
      const headerEl = document.getElementById('pdf-header')!
      const infoEl = document.getElementById('pdf-info')!
      const footerEl = document.getElementById('pdf-footer')!
      const groupEls = container.querySelectorAll('.pdf-plan-group')

      const headerH = headerEl.offsetHeight
      const infoH = infoEl.offsetHeight
      const footerH = footerEl.offsetHeight

      const groupHeights: number[] = []
      groupEls.forEach(el => groupHeights.push((el as HTMLElement).offsetHeight + 28))

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const pxPerMm = 800 / pdfWidth
      const pagePx = pdfHeight * pxPerMm

      // 智能分页：贪心算法
      const firstFixed = headerH + infoH
      const lastFixed = footerH + 40

      const pages: number[][] = []
      let curPage: number[] = []
      let curHeight = firstFixed

      for (let i = 0; i < items.length; i++) {
        const gh = groupHeights[i]
        if (curPage.length > 0) {
          const wouldBeLast = curHeight + gh + lastFixed
          if (wouldBeLast > pagePx) {
            pages.push(curPage)
            curPage = [i]
            curHeight = gh
          } else {
            curPage.push(i)
            curHeight += gh
          }
        } else {
          curPage.push(i)
          curHeight += gh
        }
      }
      if (curPage.length > 0) pages.push(curPage)

      // 逐页渲染
      for (let p = 0; p < pages.length; p++) {
        const pageSet = new Set(pages[p])
        const isFirst = p === 0
        const isLast = p === pages.length - 1

        groupEls.forEach((el, idx) => {
          ;(el as HTMLElement).style.display = pageSet.has(idx) ? '' : 'none'
        })
        headerEl.style.display = isFirst ? '' : 'none'
        infoEl.style.display = isFirst ? '' : 'none'
        footerEl.style.display = isLast ? '' : 'none'

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        const imgH = (canvas.height * pdfWidth) / canvas.width

        if (p > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgH)
      }

      // 恢复
      groupEls.forEach(el => { ;(el as HTMLElement).style.display = '' })
      headerEl.style.display = ''
      infoEl.style.display = ''
      footerEl.style.display = ''

      pdf.save(`婚礼方案-${today.replace(/\//g, '-')}.pdf`)
    } finally {
      document.body.removeChild(container)
    }
  }

  const renderPlanSummary = (items: PlanItem[], key: string) => (
    <div key={key} className="agent-plan-summary" id={`plan-${key}`}>
      <div className="agent-plan-summary__header">
        <span className="agent-plan-summary__title">推荐方案</span>
      </div>
      <div className="agent-plan-summary__body">
        <div className="agent-plan-row agent-plan-row--header">
          <div className="agent-plan-row__label">类别</div>
          <div className="agent-plan-row__card">推荐方案</div>
          <div className="agent-plan-row__price">预算参考</div>
        </div>
        {items.map((item, i) => (
          <div key={i} className="agent-plan-row">
            <div className="agent-plan-row__label">{item.categoryCn}</div>
            <div className="agent-plan-row__card">
              <div className="agent-venue-card agent-plan-venue-card"
                onClick={() => item.link && navigate(item.link)}
                style={item.link ? { cursor: 'pointer' } : undefined}>
                <img src={item.image || ''} alt={item.name} className="agent-venue-card__img" />
                <div className="agent-venue-card__info">
                  <div className="agent-venue-card__name">{item.name}</div>
                  {item.description && <div className="agent-venue-card__desc">{item.description}</div>}
                </div>
                {item.link && <span className="agent-venue-card__arrow">→</span>}
              </div>
            </div>
            <div className="agent-plan-row__price">{item.priceRange}</div>
          </div>
        ))}
      </div>
      <button className="agent-plan-summary__download" onClick={() => downloadPlanPDF(items)}>
        📄 下载 PDF 方案
      </button>
    </div>
  )

  return (
    <div className="agent-chat-page">
      <Seo
        title="AI欧洲婚礼规划助手 - 智能目的地婚礼策划"
        description="EuropeWedding AI 婚礼规划助手，基于欧洲 12 国 50+ 城市真实婚礼数据，提供场地甄选、摄影师推荐、花卉方案、酒水搭配、礼服选择及预算规划等一站式智能策划服务。"
        keywords="AI婚礼策划, 智能婚礼助手, 欧洲婚礼场地推荐, 目的地婚礼预算, 婚礼花卉方案, 婚礼摄影师推荐, 婚礼礼服选择"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "AI欧洲婚礼规划助手",
            "url": "https://europewedding.cn/agent-chat",
            "description": "基于欧洲 12 国真实婚礼数据的智能婚礼策划助手，提供场地甄选、摄影师推荐、花卉方案、预算规划等一站式服务。",
            "applicationCategory": "TravelApplication",
            "operatingSystem": "Web",
            "provider": {
              "@type": "Organization",
              "name": "EuropeWedding",
              "url": "https://europewedding.cn"
            },
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
            "featureList": [
              "欧洲 12 国城堡庄园场地推荐",
              "驻场摄影师风格匹配",
              "Florajet 46 款花卉商品智能搭配",
              "66 款酒水选品推荐",
              "婚礼礼服个性化推荐",
              "婚礼预算智能分配计算"
            ]
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "AI 婚礼规划助手能做什么？",
                "acceptedAnswer": { "@type": "Answer", "text": "AI 助手可以基于欧洲 12 国 50+ 城市的真实婚礼数据，为您推荐场地、摄影师、花卉方案、酒水和礼服，并根据您的预算和人数智能规划婚礼方案。" }
              },
              {
                "@type": "Question",
                "name": "使用 AI 助手需要付费吗？",
                "acceptedAnswer": { "@type": "Answer", "text": "完全免费。AI 婚礼规划助手是 EuropeWedding 为所有客户提供的一项增值服务，帮助您快速了解欧洲目的地婚礼的可行方案。" }
              },
              {
                "@type": "Question",
                "name": "AI 助手推荐的数据准确吗？",
                "acceptedAnswer": { "@type": "Answer", "text": "所有推荐均基于平台真实商品数据，包括场地价格、花卉商品、酒水酒单和礼服款式，价格信息与实际情况一致。" }
              }
            ]
          }
        ]}
      />
      <div className="agent-header">
        <button className="agent-back" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="agent-title">AI欧洲婚礼规划助手</h1>
        <button className={`agent-clear${messages.length === 0 ? ' agent-clear--hidden' : ''}`} onClick={clearChat}>新对话</button>
      </div>

      <div className="agent-messages" ref={messagesRef}>
        {messages.length === 0 && !loadingRef.current && (
          <div className="agent-welcome">
            <div className="agent-welcome__icon">💍</div>
            <h2 className="agent-welcome__title">你好，我是你的婚礼策划助手</h2>
            <p className="agent-welcome__desc">告诉我你的婚礼梦想，我来帮你实现。<br />比如：「我想在意大利办一场 60 人的婚礼，预算 15 万」</p>
            <div className="agent-suggestions">
              {['我想去法国巴黎办婚礼，预算 10 万', '意大利有什么好的场地推荐？', '帮我规划一场 50 人的希腊婚礼', '预算 5 万能去哪里办婚礼？'].map((s, i) => (
                <button key={i} className="agent-suggestion-btn"
                  onClick={() => { if (inputRef.current) { inputRef.current.value = s; setInputVal(s); inputRef.current.focus() } }}>{s}</button>
              ))}
            </div>
            <div className="agent-welcome__upload-hint">
              <span className="agent-welcome__upload-icon">🎬</span>
              <span>上传婚礼视频或图片，AI 自动识别风格，为你推荐同风格的场地、花艺和礼服方案</span>
              <button className="agent-welcome__upload-btn" onClick={() => mediaInputRef.current?.click()}>上传视频/图片</button>
            </div>
          </div>
        )}

        {/* 对话流：用户消息和 AI 回复交替渲染 */}
        {(() => {
          const userMsgs = messages.filter(m => m.role === 'user')
          console.log(`[render] 用户消息数: ${userMsgs.length}, turnsRef长度: ${turnsRef.current.length}, showAsst: ${showAsst}`)
          return userMsgs.map((msg, idx) => {
            console.log(`[render] msg#${idx} "${msg.content.slice(0, 20)}" → hasReply: ${idx < turnsRef.current.length}, isLast: ${idx === userMsgs.length - 1}`)
            return (
          <Fragment key={msg.id}>
            {/* 用户消息气泡 */}
            <div className="agent-msg agent-msg--user">
              <div className="agent-msg__bubble">
                <div className="agent-msg__content">{msg.content}</div>
                <span className="agent-msg__time">{new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            {/* 已完成的回复（该轮次：思考 + 结果） */}
            {idx < turnsRef.current.length && (
              <div className="agent-asst-reply" style={{ opacity: 1, pointerEvents: 'auto' }}>
                {turnsRef.current[idx].thinkingLabels.length > 0 && (
                  <div className="agent-thinking-steps-static">
                    {turnsRef.current[idx].thinkingLabels.map((label, li) => (
                      <div key={li} className="agent-thinking-step">
                        <span className="agent-thinking-step__text">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="agent-thinking-divider" />
                <div className="agent-asst-reply__content">
                  {renderContent(turnsRef.current[idx].text, turnsRef.current[idx].tableData)}
                  {turnsRef.current[idx].planSummary && turnsRef.current[idx].planSummary!.length > 0 &&
                    renderPlanSummary(turnsRef.current[idx].planSummary!, `turn${idx}`)
                  }
                </div>
                <div className="agent-reply-feedback">
                  {feedbackSent.has(idx) ? (
                    <span className="agent-feedback-sent">✓ 已反馈</span>
                  ) : (
                    <>
                      <button className="agent-feedback-btn" title="回答有帮助" onClick={() => submitFeedback(idx, 'up')}>👍</button>
                      <button className="agent-feedback-btn" title="回答没帮助" onClick={() => submitFeedback(idx, 'down')}>👎</button>
                      <button className="agent-feedback-btn" title="详细反馈" onClick={() => { setFeedbackIdx(feedbackIdx === idx ? null : idx); setFeedbackText('') }}>💬</button>
                    </>
                  )}
                </div>
                {feedbackIdx === idx && (
                  <div className="agent-feedback-input">
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="请输入你的反馈..."
                      rows={2}
                    />
                    <button className="agent-feedback-submit" onClick={() => submitFeedback(idx, feedbackText.trim() ? 'up' : 'up')}>提交</button>
                  </div>
                )}
              </div>
            )}
            {/* 思考+回复区（仅在最后一条用户消息后显示） */}
            {idx === userMsgs.length - 1 && (
              <div className="agent-asst-reply"
                style={{
                  opacity: showAsst ? 1 : 0,
                  maxHeight: showAsst ? 'none' : 0,
                  overflow: showAsst ? 'visible' : 'hidden',
                  transition: 'opacity 0.3s ease',
                  pointerEvents: showAsst ? 'auto' : 'none',
                  padding: showAsst ? undefined : 0,
                }}>
                <div ref={tkContainerRef}>
                  <img ref={tkIconRef} src="/agent-thinking.gif" className="agent-thinking-step__icon" alt="" style={{ display: 'none' }} />
                </div>
                <div ref={dotsRef} className="agent-thinking-dots" style={{ display: 'none' }}>
                  <span></span><span></span><span></span>
                </div>
                <div ref={dividerRef} className="agent-thinking-divider" style={{ display: 'none' }} />
                <div ref={rpyRawRef} className="agent-asst-reply__content" style={{ display: 'none' }} />
              </div>
            )}
          </Fragment>
          )})
        })()}
      </div>

      {/* 媒体预览条 */}
      {mediaPreview && (
        <div className="agent-media-preview">
          {mediaType === 'video' ? (
            <video src={mediaPreview} className="agent-media-preview__thumb" muted />
          ) : (
            <img src={mediaPreview} className="agent-media-preview__thumb" alt="" />
          )}
          <div className="agent-media-preview__info">
            {mediaUploading ? (
              <span className="agent-media-preview__status">上传中...</span>
            ) : mediaId ? (
              <span className="agent-media-preview__status agent-media-preview__status--ready">✓ 已就绪</span>
            ) : (
              <span className="agent-media-preview__status">处理中...</span>
            )}
          </div>
          <button className="agent-media-preview__remove" onClick={handleMediaRemove} title="移除">×</button>
        </div>
      )}

      <div className="agent-input">
        <input
          ref={mediaInputRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: 'none' }}
          onChange={handleMediaSelect}
        />
        <button
          className="agent-media-btn"
          onClick={() => mediaInputRef.current?.click()}
          disabled={mediaUploading}
          title="上传婚礼视频或图片"
        >
          {mediaUploading ? '⏳' : '📎'}
        </button>
        <textarea ref={inputRef} value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={onKeyDown} placeholder="描述你的婚礼需求..." rows={1} />
        <button className="agent-send" onClick={sendMsg} disabled={!inputVal.trim()}>
          发送
        </button>
      </div>
    </div>
  )
}
