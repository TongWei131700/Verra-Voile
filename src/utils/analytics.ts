/**
 * 自建埋点工具模块
 *
 * 设计：
 * - 事件先攒在内存队列，满 10 条或每 5 秒 flush 一次
 * - 页面卸载时用 sendBeacon 确保最后一批不丢
 * - sessionId 每次打开网站生成一个，存 sessionStorage
 * - userToken 从 localStorage 读取（与 AgentChat 一致的逻辑）
 */

interface AnalyticsEvent {
  sessionId: string
  userToken: string
  eventType: string
  pagePath: string
  referrer: string
  elementId: string
  metadata: Record<string, any> | null
  createdAt?: string  // ISO 时间戳，不传则后端用 CURRENT_TIMESTAMP
}

const QUEUE_LIMIT = 10          // 队列满 10 条立即上报
const FLUSH_INTERVAL = 5000     // 每 5 秒兜底 flush
const REPORT_URL = '/api/analytics/report'

let queue: AnalyticsEvent[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null

// ── sessionId ──
function getSessionId(): string {
  let sid = sessionStorage.getItem('analytics_sid')
  if (!sid) {
    sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('analytics_sid', sid)
  }
  return sid
}

// ── userToken ──
function getUserToken(): string {
  const token = localStorage.getItem('token')
  if (token) return token.substring(0, 16)
  // 与 AgentChat 一致的访客标识
  let guest = sessionStorage.getItem('analytics_guest')
  if (!guest) {
    guest = `guest_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem('analytics_guest', guest)
  }
  return guest
}

// ── 核心：推入队列 ──
function enqueue(ev: AnalyticsEvent) {
  queue.push(ev)
  if (queue.length >= QUEUE_LIMIT) flush()
}

// ── 上报 ──
function flush() {
  if (queue.length === 0) return
  const batch = queue.splice(0, QUEUE_LIMIT)
  const body = JSON.stringify({ events: batch })

  // 优先用 sendBeacon（页面卸载时也能发送）
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(REPORT_URL, blob)
  } else {
    fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {/* 静默失败 */})
  }
}

// ── 启动定时 flush ──
function startTimer() {
  if (flushTimer) return
  flushTimer = setInterval(flush, FLUSH_INTERVAL)
}

// ── 页面卸载时最后一次 flush ──
function setupUnloadFlush() {
  // visibilitychange 比 beforeunload 更可靠
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('beforeunload', flush)
}

// ── 初始化（仅执行一次）──
let inited = false
function init() {
  if (inited) return
  inited = true
  getSessionId()   // 确保 sessionId 生成
  startTimer()
  setupUnloadFlush()
}

// ── 公开 API ──

/** 追踪页面浏览 */
export function trackPageView(path: string, title?: string) {
  init()
  enqueue({
    sessionId: getSessionId(),
    userToken: getUserToken(),
    eventType: 'page_view',
    pagePath: path,
    referrer: document.referrer || '',
    elementId: '',
    metadata: title ? { title } : null,
  })
}

/** 追踪自定义事件 */
export function trackEvent(eventType: string, metadata?: Record<string, any>, elementId?: string) {
  init()
  enqueue({
    sessionId: getSessionId(),
    userToken: getUserToken(),
    eventType,
    pagePath: location.pathname,
    referrer: '',
    elementId: elementId || '',
    metadata: metadata || null,
  })
}
