import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface TraceEvent {
  id: number
  event_type: string
  page_path: string
  referrer: string
  element_id: string
  metadata: any
  created_at: string
}

interface TraceData {
  sessionId: string
  totalEvents: number
  pageViewCount: number
  pathSequence: string[]
  durationSeconds: number
  firstPage: string | null
  lastPage: string | null
  events: TraceEvent[]
}

export default function TraceView() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sid') || ''
  
  const [data, setData] = useState<TraceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setError('缺少 sessionId 参数')
      setLoading(false)
      return
    }

    const fetchTrace = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/analytics/session/${encodeURIComponent(sessionId)}`)
        const json = await res.json()
        if (json.success && json.data.pageViewCount > 0) {
          setData(json.data)
        } else if (json.success) {
          setError('该 Session 无访问记录')
        } else {
          setError(json.error || '查询失败')
        }
      } catch {
        setError('网络异常，请稍后重试')
      } finally {
        setLoading(false)
      }
    }

    fetchTrace()
  }, [sessionId])

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getPageLabel = (path: string) => {
    if (path === '/') return '首页'
    if (path.startsWith('/destinations')) return '欧洲城堡'
    if (path.startsWith('/flowers')) return '花卉'
    if (path.startsWith('/dresses')) return '礼服'
    if (path.startsWith('/photography')) return '摄影'
    if (path.startsWith('/wine')) return '酒水宴席'
    if (path.startsWith('/wedding-team')) return '婚礼团队'
    if (path.startsWith('/travel-photo')) return '欧洲旅拍'
    if (path.startsWith('/order')) return '订单'
    if (path.startsWith('/consult')) return '咨询'
    if (path.startsWith('/agent-chat')) return 'AI 规划'
    return path
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* 头部 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2a2723', margin: '0 0 8px 0' }}>
            🔍 访客访问路径追踪
          </h1>
          <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
            EuropeWedding 全链路追踪系统
          </p>
        </div>

        {/* 加载中 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <div>加载中...</div>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div style={{ background: '#fff3f3', border: '1px solid #ffcdd2', borderRadius: 12, padding: '20px 24px', color: '#c62828', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ fontSize: 16 }}>{error}</div>
            {sessionId && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#999', fontFamily: 'monospace' }}>
                Session ID: {sessionId}
              </div>
            )}
          </div>
        )}

        {/* 追踪结果 */}
        {data && (
          <>
            {/* 摘要卡片 */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#2a2723' }}>{data.pageViewCount}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>浏览页面</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#2a2723' }}>{data.totalEvents}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>总事件数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#2a2723' }}>{formatDuration(data.durationSeconds)}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>会话时长</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0ece8' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2a2723' }}>{getPageLabel(data.firstPage || '')}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontFamily: 'monospace' }}>{data.firstPage}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>入口页</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#2a2723' }}>{getPageLabel(data.lastPage || '')}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4, fontFamily: 'monospace' }}>{data.lastPage}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>最后页面</div>
                </div>
              </div>
            </div>

            {/* 访问路径可视化 */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2a2723', margin: '0 0 20px 0' }}>
                📍 访问路径
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {data.pathSequence.map((path, idx) => (
                  <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      background: idx === 0 ? '#2a2723' : idx === data.pathSequence.length - 1 ? '#8b7355' : '#f0ece8',
                      color: idx === 0 || idx === data.pathSequence.length - 1 ? '#fff' : '#555',
                      padding: '8px 16px',
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: idx === 0 || idx === data.pathSequence.length - 1 ? 600 : 400,
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }} title={path}>
                      {getPageLabel(path)}
                    </span>
                    {idx < data.pathSequence.length - 1 && (
                      <span style={{ color: '#ccc', fontSize: 18 }}>→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* 详细事件时间线 */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2a2723', margin: '0 0 20px 0' }}>
                 详细事件时间线
              </h3>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {data.events.map((ev, idx) => (
                  <div key={ev.id} style={{ 
                    display: 'flex', 
                    gap: 16, 
                    padding: '16px 0',
                    borderBottom: idx < data.events.length - 1 ? '1px solid #f0ece8' : 'none'
                  }}>
                    {/* 时间 */}
                    <div style={{ width: 100, flexShrink: 0 }}>
                      <div style={{ fontSize: 13, color: '#888' }}>{formatTime(ev.created_at)}</div>
                    </div>
                    
                    {/* 事件类型 */}
                    <div style={{ width: 80, flexShrink: 0 }}>
                      <span style={{
                        display: 'inline-block',
                        background: ev.event_type === 'page_view' ? '#e8f5e9' : '#fff3e0',
                        color: ev.event_type === 'page_view' ? '#2e7d32' : '#e65100',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {ev.event_type === 'page_view' ? ' 浏览' : ev.event_type}
                      </span>
                    </div>
                    
                    {/* 页面路径 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#2a2723', fontWeight: 500 }}>
                        {getPageLabel(ev.page_path)}
                      </div>
                      <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.page_path}
                      </div>
                      {ev.referrer && (
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                          来源：{ev.referrer}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session ID */}
            <div style={{ textAlign: 'center', marginTop: 32, padding: 16, color: '#aaa', fontSize: 12 }}>
              <div style={{ fontFamily: 'monospace' }}>Session ID: {data.sessionId}</div>
              <div style={{ marginTop: 4 }}>EuropeWedding Analytics © 2026</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
