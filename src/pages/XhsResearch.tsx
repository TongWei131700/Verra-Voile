import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Seo from '../components/Seo'

/* ── 类型定义 ─────────────────────────────────────────── */
export interface XhsPost {
  index: number
  title: string
  author: string
  likes: string
  collects: string
  comments: string
  shares: string
  id: string
  token: string
  url: string
  keyword?: string
  imageContent?: string
  images?: { url: string; width: number; height: number }[]
  isHighValue?: boolean
  isAd?: boolean
  taskId?: string
}

interface TagConfig {
  name: string
  custom?: boolean
}

/* ── 常量 ──────────────────────────────────────────────── */
const TIME_OPTIONS = [
  { label: '不限', value: '不限' },
  { label: '一天内', value: '一天内' },
  { label: '一周内', value: '一周内' },
  { label: '半年内', value: '半年内' },
]
const SORT_OPTIONS = [
  { label: '综合', value: '综合' },
  { label: '最新', value: '最新' },
  { label: '最多点赞', value: '最多点赞' },
  { label: '最多评论', value: '最多评论' },
  { label: '最多收藏', value: '最多收藏' },
]
const NOTE_TYPE_OPTIONS = [
  { label: '不限', value: '不限' },
  { label: '图文', value: '图文' },
  { label: '视频', value: '视频' },
]

export const INITIAL_POSTS: XhsPost[] = []

/* ── 展开面板组件 ──────────────────────────────────────── */
function ExpandedPanel({ post, isExtracting, onSaveContent }: {
  post: XhsPost; isExtracting: boolean; onSaveContent: (c: string) => void
}) {
  const hasImages = post.images && post.images.length > 0
  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafbfc' }}>
      {hasImages ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {post.images!.map((img, i) => (
            <a key={i} href={img.url} target="_blank" rel="noopener noreferrer"
              style={{ width: 100, height: 100, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid #eee' }}>
              <img src={img.url} alt={`图${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
          ))}
          <div style={{ fontSize: 11, color: '#bbb', alignSelf: 'center', paddingLeft: 4 }}>
            共 {post.images!.length} 张图 · 点击查看原图
          </div>
        </div>
      ) : isExtracting ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#bbb' }}>
          <span style={{
            display: 'inline-block', width: 18, height: 18,
            border: '2px solid #eee', borderTopColor: '#ff2442',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 8,
          }} /><br />正在获取帖子图片...
        </div>
      ) : (
        <div style={{ padding: '12px 0', fontSize: 13, color: '#ccc' }}>暂无图片数据</div>
      )}
      <div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 500 }}>
          图片文字提取（查看图片后手动输入或粘贴）
        </div>
        <textarea
          defaultValue={post.imageContent || ''}
          onBlur={e => onSaveContent(e.target.value)}
          placeholder="识别图片中的文字内容，粘贴或输入到此处..."
          style={{
            width: '100%', minHeight: 60, padding: '10px 12px',
            borderRadius: 10, border: '1px solid #e8e8e8',
            fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

/* ── 主组件 ────────────────────────────────────────────── */
export default function XhsResearch() {
  useLayoutEffect(() => { window.scrollTo({ top: 0 }) }, [])
  const navigate = useNavigate()

  /* 状态 */
  const [posts, setPosts] = useState<XhsPost[]>(INITIAL_POSTS)
  const [tags, setTags] = useState<TagConfig[]>([])
  const [activeTag, setActiveTag] = useState(-1)
  const [timePeriod, setTimePeriod] = useState('一周内')
  const [sortBy, setSortBy] = useState('综合')
  const [noteType, setNoteType] = useState('不限')
  const [searching, setSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 0, keyword: '' })
  const [lastSearch, setLastSearch] = useState('')
  const [currentTaskId, setCurrentTaskId] = useState('')
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiStats, setAiStats] = useState<{ highValue: number; ad: number; normal: number } | null>(null)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  const [extracting, setExtracting] = useState<Set<number>>(new Set())
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)
  const [accountInfo, setAccountInfo] = useState<{ nickname: string; userId: string } | null>(null)
  const [checkingLogin, setCheckingLogin] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [searchHistory, setSearchHistory] = useState<Array<{
    id: string
    time: string
    tags: string[]
    timePeriod: string
    filters?: { publish_time: string; sort_by: string; note_type: string }
    count: number
    posts: Array<{ title: string; url: string }>
    taskId?: string
  }>>([])

  /* 加载标签和搜索历史（从后端） */
  useEffect(() => {
    // 加载标签
    fetch('/api/xhs-mcp/tags')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tags?.length) {
          setTags(data.tags.map((t: any) => ({ name: t.name, custom: true })))
        }
      })
      .catch(() => {})

    // 加载搜索历史
    fetch('/api/xhs-mcp/search-history')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSearchHistory(data.history || [])
      })
      .catch(() => {})
  }, [])

  /* 标签变更时保存到后端 */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/xhs-mcp/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tags.map(t => t.name) }),
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [tags])

  /* 检查登录状态 */
  useEffect(() => {
    const checkLogin = async () => {
      setCheckingLogin(true)
      try {
        const res = await fetch('/api/xhs-mcp/status')
        const data = await res.json()
        if (data.loggedIn) {
          setAccountInfo({
            nickname: data.nickname || '未知用户',
            userId: '',
          })
        }
      } catch (e) {
        console.error('检查登录状态失败:', e)
      } finally {
        setCheckingLogin(false)
      }
    }
    checkLogin()
  }, [])

  /* 登出 - 一键完全清理 */
  const handleLogout = async () => {
    const confirmMsg = `确定要完全登出当前账号吗？

此操作将：
1. 清除 MCP 服务的登录态
2. 停止 MCP 服务进程
3. 删除所有 Cookie 文件

登出后需要重新扫码登录。`
    
    if (!window.confirm(confirmMsg)) return
    
    try {
      const res = await fetch('/api/xhs-mcp/logout', {
        method: 'POST',
      })
      const data = await res.json()
      
      if (data.success) {
        setAccountInfo(null)
        alert('✅ ' + data.message)
      } else {
        alert('⚠️ 登出失败: ' + data.message)
      }
    } catch (e) {
      console.error('登出失败:', e)
      alert('⚠️ 登出失败，请检查后端服务是否运行')
    }
  }

  /* 登录 - 一键启动登录工具 */
  const handleLogin = async () => {
    setLoggingIn(true)
    try {
      // 1. 调用后端 API 启动登录工具
      const res = await fetch('/api/xhs-mcp/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: 'A' }),
      })
      const data = await res.json()
      
      if (!data.success) {
        alert('⚠️ ' + data.message)
        setLoggingIn(false)
        return
      }
      
      // 2. 提示用户扫码
      alert('🔍 浏览器已弹出二维码，请用小红书 App 扫码登录\n\n扫码完成后点击确定')
      
      // 3. 等待用户确认扫码后，启动 MCP 服务
      const startRes = await fetch('/api/xhs-mcp/start-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: 'A' }),
      })
      const startData = await startRes.json()
      
      if (startData.success) {
        // 4. 轮询检查登录状态（最多等待 15 秒）
        let loggedIn = false
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 3000))
          try {
            const statusRes = await fetch('/api/xhs-mcp/status')
            const statusData = await statusRes.json()
            
            if (statusData.loggedIn) {
              setAccountInfo({
                nickname: statusData.nickname || '未知用户',
                userId: '',
              })
              alert('✅ 登录成功！欢迎 ' + statusData.nickname)
              loggedIn = true
              break
            }
          } catch (e) {
            // 继续重试
          }
        }
        
        if (!loggedIn) {
          alert('⚠️ 服务已启动，但未检测到登录态\n\n可能原因：\n1. 扫码未完成或已过期\n2. MCP 服务启动较慢\n\n请刷新页面重试，或手动检查 MCP 服务状态')
        }
      } else {
        alert('⚠️ ' + startData.message)
      }
    } catch (e) {
      console.error('登录失败:', e)
      alert('⚠️ 登录失败，请检查后端服务是否运行')
    } finally {
      setLoggingIn(false)
    }
  }

  /* 搜索 - 异步任务模式：POST 创建任务 → 轮询结果 */
  const handleSearch = useCallback(async () => {
    setSearching(true)
    const tagsToSearch = activeTag === -1 ? tags : [tags[activeTag]]
    setSearchProgress({ current: 0, total: tagsToSearch.length, keyword: '' })

    try {
      // 1. 创建搜索任务
      const res = await fetch('/api/xhs-mcp/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tagsToSearch.map(t => t.name),
          timePeriod,
          sortBy,
          noteType,
        }),
      })
      const data = await res.json()
      if (!data.success || !data.taskId) {
        alert('⚠️ 创建搜索任务失败: ' + (data.message || '未知错误'))
        setSearching(false)
        return
      }

      const taskId = data.taskId

      // 2. 轮询任务状态（每 2 秒一次）
      let done = false
      let attempts = 0
      const maxAttempts = 150 // 最多等待 5 分钟

      while (!done && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++

        try {
          const statusRes = await fetch(`/api/xhs-mcp/search/${taskId}`)
          const statusData = await statusRes.json()

          if (!statusData.success) {
            console.error('轮询失败:', statusData.message)
            continue
          }

          // 更新进度
          if (statusData.progress) {
            setSearchProgress({
              current: statusData.progress.current,
              total: statusData.progress.total,
              keyword: statusData.progress.keyword,
            })
          }

          // 任务完成
          if (statusData.status === 'done') {
            done = true
            const postsData = statusData.posts || []
            const mapped: XhsPost[] = postsData.map((p: any, idx: number) => ({
              index: idx + 1,
              title: p.title,
              author: p.author,
              likes: p.likes,
              collects: p.collects,
              comments: p.comments,
              shares: p.shares,
              id: p.id,
              token: p.token || '',
              url: p.url || '',
              keyword: p.keyword,
              imageContent: p.imageContent || '',
              images: p.images || [],
              isHighValue: p.isHighValue,
              isAd: p.isAd,
              taskId,
            }))

            setPosts(mapped)
            setExpandedPost(null)
            setLastSearch(new Date().toLocaleDateString('zh-CN'))
            setCurrentTaskId(taskId)
            setAiStats(null)

            // 加载搜索历史
            try {
              const histRes = await fetch('/api/xhs-mcp/search-history')
              const histData = await histRes.json()
              if (histData.success) setSearchHistory(histData.history)
            } catch {}

            // 自动触发 AI 高价值分析
            setAiAnalyzing(true)
            setTimeout(() => {
              fetch('/api/xhs-mcp/analyze-high-value', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
              })
                .then(res => res.json())
                .then(aiData => {
                  if (aiData.success) {
                    setAiStats(aiData.stats)
                    // 重新加载帖子获取最新分类
                    fetch(`/api/xhs-mcp/search/${taskId}`)
                      .then(r => r.json())
                      .then(reload => {
                        if (reload.success && reload.status === 'done' && reload.posts) {
                          const remapped: XhsPost[] = reload.posts.map((p: any, idx: number) => ({
                            index: idx + 1, title: p.title, author: p.author,
                            likes: p.likes, collects: p.collects, comments: p.comments, shares: p.shares,
                            id: p.id, token: p.token || '', url: p.url || '', keyword: p.keyword,
                            imageContent: p.imageContent || '', images: p.images || [],
                            isHighValue: p.isHighValue, isAd: p.isAd, taskId,
                          }))
                          setPosts(remapped)
                        }
                      })
                  }
                })
                .catch(() => {})
                .finally(() => setAiAnalyzing(false))
            }, 500)
          }

          // 任务失败
          if (statusData.status === 'failed') {
            done = true
            alert('⚠️ 搜索失败: ' + (statusData.error || '未知错误'))
          }
        } catch (e) {
          console.error('轮询出错:', e)
        }
      }

      if (!done) {
        alert('⚠️ 搜索超时，请稍后查看结果')
      }
    } catch (e) {
      console.error('搜索失败:', e)
      alert('⚠️ 搜索失败，请检查后端服务')
    } finally {
      setSearching(false)
      setSearchProgress({ current: 0, total: 0, keyword: '' })
    }
  }, [tags, activeTag, timePeriod, sortBy, noteType])

  /* 点击历史记录：加载该任务的完整结果 */
  const handleLoadHistory = useCallback(async (taskId: string) => {
    if (!taskId) {
      alert('⚠️ 该历史记录没有关联任务ID，无法加载完整结果')
      return
    }
    setSearching(true)
    setSearchProgress({ current: 0, total: 0, keyword: '加载中...' })
    try {
      const res = await fetch(`/api/xhs-mcp/search/${taskId}`)
      const data = await res.json()
      if (!data.success) {
        alert('⚠️ 加载失败: ' + (data.message || '未知错误'))
        return
      }
      if (data.status === 'done' && data.posts) {
        const mapped: XhsPost[] = data.posts.map((p: any, idx: number) => ({
          index: idx + 1,
          title: p.title,
          author: p.author,
          likes: p.likes,
          collects: p.collects,
          comments: p.comments,
          shares: p.shares,
          id: p.id,
          token: p.token || '',
          url: p.url || '',
          keyword: p.keyword,
          imageContent: p.imageContent || '',
          images: p.images || [],
          isHighValue: p.isHighValue,
          isAd: p.isAd,
          taskId,
        }))
        setPosts(mapped)
        setExpandedPost(null)
        setCurrentTaskId(taskId)
        setAiStats(null)
      } else if (data.status === 'running') {
        alert('⚠️ 该搜索任务还在执行中，请稍后再试')
      } else {
        alert('⚠️ 该任务状态为: ' + data.status)
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
      alert('⚠️ 加载失败，请检查后端服务')
    } finally {
      setSearching(false)
      setSearchProgress({ current: 0, total: 0, keyword: '' })
    }
  }, [])

  /* AI 分析高价值帖子 - 调用 LLM 语义判断 */
  const handleAnalyzeAI = useCallback(async () => {
    if (!currentTaskId) {
      alert('⚠️ 请先搜索或加载历史记录')
      return
    }
    setAiAnalyzing(true)
    try {
      const res = await fetch('/api/xhs-mcp/analyze-high-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: currentTaskId }),
      })
      const data = await res.json()
      if (!data.success) {
        alert('⚠️ AI 分析失败: ' + (data.message || '未知错误'))
        return
      }
      setAiStats(data.stats)
      alert(`✅ AI 分析完成！\n\n🔴 高价值询盘帖: ${data.stats.highValue} 条\n⚪ 广告/营销帖: ${data.stats.ad} 条\n🔵 普通帖: ${data.stats.normal} 条\n\n页面将刷新显示最新分类结果。`)

      // 重新加载当前任务的帖子（获取最新分类）
      const reloadRes = await fetch(`/api/xhs-mcp/search/${currentTaskId}`)
      const reloadData = await reloadRes.json()
      if (reloadData.success && reloadData.status === 'done' && reloadData.posts) {
        const mapped: XhsPost[] = reloadData.posts.map((p: any, idx: number) => ({
          index: idx + 1,
          title: p.title,
          author: p.author,
          likes: p.likes,
          collects: p.collects,
          comments: p.comments,
          shares: p.shares,
          id: p.id,
          token: p.token || '',
          url: p.url || '',
          keyword: p.keyword,
          imageContent: p.imageContent || '',
          images: p.images || [],
          isHighValue: p.isHighValue,
          isAd: p.isAd,
          taskId: currentTaskId,
        }))
        setPosts(mapped)
      }
    } catch (e) {
      console.error('AI 分析失败:', e)
      alert('⚠️ AI 分析失败，请检查后端服务')
    } finally {
      setAiAnalyzing(false)
    }
  }, [currentTaskId])

  /* 提取图片内容 - 通过后端 API 调用 MCP */
  const handleExtract = useCallback(async (post: XhsPost) => {
    if (extracting.has(post.index)) return
    setExtracting(prev => new Set(prev).add(post.index))
    try {
      // 调用后端代理 MCP get_feed_detail
      const res = await fetch('/api/xhs-mcp/feed-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feed_id: post.id, xsec_token: post.token }),
      })
      const data = await res.json()
      if (data.success && data.images) {
        const imgs = data.images
        // 保存图片到后端
        await fetch(`/api/xhs-mcp/posts/${post.id}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: imgs, taskId: post.taskId }),
        })
        setPosts(prev => prev.map(p =>
          p.index === post.index ? { ...p, images: imgs } : p
        ))
      }
    } catch (e) {
      console.error('提取失败:', e)
    } finally {
      setExtracting(prev => { const n = new Set(prev); n.delete(post.index); return n })
    }
  }, [extracting])

  /* 保存图片文字 - 存储到后端 */
  const handleSaveContent = useCallback(async (idx: number, content: string) => {
    setPosts(prev => prev.map(p =>
      p.index === idx ? { ...p, imageContent: content } : p
    ))
    // 异步保存到后端
    const post = posts.find(p => p.index === idx)
    if (post) {
      try {
        await fetch(`/api/xhs-mcp/posts/${post.id}/image-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageContent: content, taskId: post.taskId }),
        })
      } catch {}
    }
  }, [posts])

  /* 标签管理 */
  const addTag = () => {
    const name = newTag.trim()
    if (name && !tags.find(t => t.name === name)) {
      setTags(prev => [...prev, { name, custom: true }])
      setNewTag('')
      setShowAddTag(false)
    }
  }
  const removeTag = (i: number) => {
    if (tags[i].custom) {
      setTags(prev => prev.filter((_, j) => j !== i))
      if (activeTag >= i) setActiveTag(Math.max(0, activeTag - 1))
    }
  }

  /* 帖子卡片渲染函数 */
  const renderPostCard = (post: XhsPost) => {
    const isExpanded = expandedPost === post.index
    const isExtracting = extracting.has(post.index)
    const hasImages = post.images && post.images.length > 0

    return (
      <div
        key={post.id || post.index}
        onClick={() => post.id && navigate(`/xhs-post/${post.id}`)}
        style={{
          background: '#fff', borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: isHighValue(post)
            ? '1px solid rgba(255,36,66,0.12)'
            : '1px solid rgba(0,0,0,0.04)',
          cursor: 'pointer',
        }}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, marginTop: 2,
            background: 'linear-gradient(135deg, #ff2442, #ff6b81)',
            color: '#fff',
          }}>{post.index}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {isHighValue(post) && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: '#ff2442',
                  background: '#fff0f3', padding: '2px 6px', borderRadius: 4,
                }}>询盘</span>
              )}
              <h3 style={{
                fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{post.title}</h3>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>@{post.author}</div>
            {post.imageContent && (
              <div style={{
                padding: '8px 12px', marginBottom: 6,
                background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f6 100%)',
                borderRadius: 8, borderLeft: '3px solid #ff2442',
                fontSize: 13, color: '#333', lineHeight: 1.7,
              }}>
                <div style={{ fontSize: 10, color: '#ff2442', fontWeight: 600, marginBottom: 2, letterSpacing: 1 }}>图片文字内容</div>
                {post.imageContent}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#bbb' }}>
              <span>❤ {post.likes}</span><span>⭐ {post.collects}</span>
              <span>💬 {post.comments}</span><span>↗ {post.shares}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setExpandedPost(post.index); handleExtract(post) }} style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 11,
              border: '1px solid #ffe0e6', background: '#fff5f7',
              color: '#ff2442', cursor: 'pointer',
            }}>提取图片</button>
            <a href={post.url} target="_blank" rel="noopener noreferrer" style={{
              padding: '5px 10px', borderRadius: 8, fontSize: 11,
              border: '1px solid #eee', background: '#fafafa',
              color: '#999', textDecoration: 'none', textAlign: 'center',
            }}>原帖 ↗</a>
          </div>
        </div>
        {isExpanded && (
          <ExpandedPanel post={post} isExtracting={isExtracting} onSaveContent={(c) => handleSaveContent(post.index, c)} />
        )}
      </div>
    )
  }

  /* 高价值帖子（后端已标记） */
  const isHighValue = (p: XhsPost) => p.isHighValue === true
  const highValuePosts = posts.filter(isHighValue)

  /* 总互动数 */
  const totalEngagement = posts.reduce((sum, p) =>
    sum + parseInt(p.likes || '0') + parseInt(p.collects || '0')
    + parseInt(p.comments || '0') + parseInt(p.shares || '0'), 0)

  /* ── 渲染 ──────────────────────────────────────────── */
  return (
    <>
    <Seo
      title="精准获客 Agent · 小红书智能引流 - 欧婚纪"
      description="欧婚纪精准获客 Agent，AI 智能分析小红书询盘帖子，自动生成专业回复文案和引流评论，帮助婚礼策划品牌精准获取客户。一键生成文案+配图+评论，高效引流。"
      keywords="小红书引流, 精准获客, AI 营销, 婚礼策划, 目的地婚礼, 欧婚纪, 智能客服, 社交媒体营销"
      structuredData={[
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: '精准获客 Agent',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description: 'AI 智能分析小红书询盘帖，自动生成专业回复文案和引流评论',
          provider: {
            '@type': 'Organization',
            name: '欧婚纪 EuropeWedding',
            url: 'https://www.europewedding.cn',
          },
        },
      ]}
    />
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>

        {/* ── 返回按钮 ── */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', padding: '8px 0',
            fontSize: 14, color: '#999', cursor: 'pointer', marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 18 }}>←</span>
          返回
        </button>

        {/* ── 标题区 ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 700,
            }}>
              研
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>
                精准获客Agent
              </h1>
              <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                社交平台监控 · 询盘挖掘 · 智能应答
              </p>
            </div>
            {/* 账号状态 */}
            <div style={{
              padding: '8px 16px', borderRadius: 12,
              background: accountInfo ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${accountInfo ? '#bbf7d0' : '#fecaca'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {checkingLogin ? (
                <>
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    border: '2px solid #e5e7eb', borderTopColor: '#ff2442',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: 12, color: '#666' }}>检查中...</span>
                </>
              ) : accountInfo ? (
                <>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>
                      ✓ {accountInfo.nickname}
                    </div>
                    <div style={{ fontSize: 10, color: '#16a34a' }}>账号 A · 搜索+评论</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca',
                      background: '#fff', fontSize: 11, color: '#dc2626', cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    登出
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                    ✗ 未登录
                  </span>
                  <button
                    onClick={handleLogin}
                    disabled={loggingIn}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: 'none',
                      background: loggingIn ? '#ccc' : 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
                      fontSize: 11, color: '#fff', cursor: loggingIn ? 'wait' : 'pointer',
                      fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    {loggingIn ? (
                      <>
                        <span style={{
                          display: 'inline-block', width: 10, height: 10,
                          border: '1.5px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff', borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }} />
                        登录中...
                      </>
                    ) : '登录'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 标签订阅栏 ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '16px 20px',
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 10, fontWeight: 500, letterSpacing: 0.5 }}>
            订阅标签
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <div
              onClick={() => setActiveTag(-1)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeTag === -1
                  ? 'linear-gradient(135deg, #ff2442 0%, #ff4d6a 100%)'
                  : '#f5f5f7',
                color: activeTag === -1 ? '#fff' : '#555',
                border: activeTag === -1 ? '1px solid transparent' : '1px solid #e8e8e8',
              }}
            >
              全选
            </div>
            {tags.map((tag, i) => (
              <div
                key={tag.name}
                onClick={() => setActiveTag(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: activeTag === i
                    ? 'linear-gradient(135deg, #ff2442 0%, #ff4d6a 100%)'
                    : '#f5f5f7',
                  color: activeTag === i ? '#fff' : '#555',
                  border: activeTag === i ? '1px solid transparent' : '1px solid #e8e8e8',
                }}
              >
                <span>{tag.name}</span>
                {tag.custom && (
                  <span
                    onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                    style={{
                      marginLeft: 2, width: 16, height: 16, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, background: 'rgba(0,0,0,0.1)', cursor: 'pointer',
                    }}
                  >
                    ×
                  </span>
                )}
              </div>
            ))}
            {/* 添加标签 */}
            {showAddTag ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="输入标签名"
                  autoFocus
                  style={{
                    width: 100, padding: '6px 10px', borderRadius: 20,
                    border: '1px solid #ddd', fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={addTag} style={{
                  padding: '6px 12px', borderRadius: 20, border: 'none',
                  background: '#ff2442', color: '#fff', fontSize: 12, cursor: 'pointer',
                }}>
                  添加
                </button>
                <button onClick={() => { setShowAddTag(false); setNewTag('') }} style={{
                  padding: '6px 8px', borderRadius: 20, border: '1px solid #ddd',
                  background: '#fff', fontSize: 12, cursor: 'pointer', color: '#999',
                }}>
                  取消
                </button>
              </div>
            ) : (
              <div
                onClick={() => setShowAddTag(true)}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px dashed #ccc', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, color: '#999', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                +
              </div>
            )}
          </div>
        </div>

        {/* ── 筛选条件 ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '16px 20px',
          marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {/* 时间 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 500, minWidth: 48 }}>时间</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {TIME_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setTimePeriod(opt.value)} style={{
                  padding: '8px 14px', borderRadius: 14, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: timePeriod === opt.value ? '#1a1a1a' : '#f5f5f7',
                  color: timePeriod === opt.value ? '#fff' : '#666',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
          {/* 排序 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 500, minWidth: 48 }}>排序</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)} style={{
                  padding: '8px 14px', borderRadius: 14, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: sortBy === opt.value ? '#1a1a1a' : '#f5f5f7',
                  color: sortBy === opt.value ? '#fff' : '#666',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
          {/* 笔记类型 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 500, minWidth: 48 }}>类型</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {NOTE_TYPE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setNoteType(opt.value)} style={{
                  padding: '8px 14px', borderRadius: 14, fontSize: 11, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: noteType === opt.value ? '#1a1a1a' : '#f5f5f7',
                  color: noteType === opt.value ? '#fff' : '#666',
                }}>{opt.label}</button>
              ))}
            </div>
            {(sortBy !== '综合' || noteType !== '不限') && (
              <button onClick={() => { setSortBy('综合'); setNoteType('不限') }} style={{
                padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 500,
                border: '1px solid #e5e5e5', background: '#fff', color: '#999', cursor: 'pointer',
                marginLeft: 'auto',
              }}>重置筛选</button>
            )}
          </div>
        </div>

        {/* ── 搜索按钮 ── */}
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 14, border: 'none',
            background: searching
              ? '#ccc'
              : 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: searching ? 'wait' : 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 20, boxShadow: '0 2px 8px rgba(255,36,66,0.2)',
          }}
        >
          {searching ? (
            <>
              <span style={{
                display: 'inline-block', width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              搜索中... {searchProgress.current}/{searchProgress.total} {searchProgress.keyword}
            </>
          ) : '🔍 搜索'}
        </button>

        {/* ── 搜索历史 ── */}
        {searchHistory.length > 0 && (
          <div style={{
            marginBottom: 16, background: '#fff', borderRadius: 14, padding: '14px 18px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📝 搜索历史</span>
              <span style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>最近 {searchHistory.length} 条 · 点击可加载完整结果</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {searchHistory.map(history => (
                <div key={history.id}
                  onClick={() => history.taskId && handleLoadHistory(history.taskId)}
                  style={{
                    padding: '10px 14px', borderRadius: 10, background: '#f9fafb',
                    border: '1px solid #f0f0f0',
                    cursor: history.taskId ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    if (history.taskId) { el.style.background = '#f0f4ff' }
                    el.style.borderColor = '#d0d8ff'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#f9fafb'
                    el.style.borderColor = '#f0f0f0'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#999' }}>{history.time}</span>
                      <span style={{
                        fontSize: 9, color: '#ff2442', background: '#fff0f3',
                        padding: '1px 5px', borderRadius: 6, fontWeight: 500,
                      }}>{history.filters?.publish_time || history.timePeriod}</span>
                      {history.filters?.sort_by && history.filters.sort_by !== '综合' && (
                        <span style={{
                          fontSize: 9, color: '#f59e0b', background: '#fffbeb',
                          padding: '1px 5px', borderRadius: 6, fontWeight: 500,
                        }}>{history.filters.sort_by}</span>
                      )}
                      {history.filters?.note_type && history.filters.note_type !== '不限' && (
                        <span style={{
                          fontSize: 9, color: '#10b981', background: '#ecfdf5',
                          padding: '1px 5px', borderRadius: 6, fontWeight: 500,
                        }}>{history.filters.note_type}</span>
                      )}
                      <div style={{ display: 'flex', gap: 3 }}>
                        {history.tags.map(tag => (
                          <span key={tag} style={{
                            fontSize: 9, color: '#667eea', background: '#f0f2ff',
                            padding: '1px 5px', borderRadius: 4,
                          }}>{tag}</span>
                        ))}
                      </div>
                      <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto' }}>
                        {history.count} 条
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#888', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {history.posts.slice(0, 2).map((post, i) => (
                        <span key={i}>{i > 0 && <span style={{ color: '#ddd', margin: '0 4px' }}>·</span>}{post.title}</span>
                      ))}
                      {history.posts.length > 2 && <span style={{ color: '#bbb' }}> ...+{history.posts.length - 2}</span>}
                    </div>
                  </div>
                  {history.taskId && (
                    <div style={{ flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, color: '#667eea', fontWeight: 500,
                        padding: '4px 10px', borderRadius: 6,
                        background: '#fff', border: '1px solid #d0d8ff',
                        whiteSpace: 'nowrap',
                      }}>查看 →</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 统计栏 ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '0 4px',
        }}>
          <div style={{ fontSize: 13, color: '#999', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 18 }}>{posts.length}</span>
              <span style={{ margin: '0 4px' }}>条结果</span>
              <span style={{ color: '#ddd' }}>|</span>
              <span style={{ margin: '0 4px' }}>总互动</span>
              <span style={{ fontWeight: 600, color: '#ff2442', fontSize: 15 }}>{totalEngagement.toLocaleString()}</span>
            </div>
            {aiStats && (
              <div style={{ fontSize: 11, display: 'flex', gap: 6 }}>
                <span style={{ color: '#ff2442', fontWeight: 600 }}>🔴 {aiStats.highValue} 询盘</span>
                <span style={{ color: '#999' }}>⚪ {aiStats.ad} 广告</span>
                <span style={{ color: '#667eea' }}>🔵 {aiStats.normal} 普通</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {aiAnalyzing && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 8,
                background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
                border: '1px solid #667eea30',
              }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10,
                  border: '1.5px solid #667eea',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 11, color: '#667eea', fontWeight: 500 }}>🤖 AI 正在分析高价值帖子...</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#bbb' }}>
              更新于 {lastSearch}
            </div>
          </div>
        </div>

        {/* ── 高价值帖子专区 ── */}
        {highValuePosts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 12, padding: '0 4px',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}>!</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>高价值帖子</span>
              <span style={{
                fontSize: 11, color: '#ff2442', background: '#fff0f3',
                padding: '2px 8px', borderRadius: 10, fontWeight: 600,
              }}>{highValuePosts.length} 条</span>
              <span style={{ fontSize: 12, color: '#bbb', marginLeft: 4 }}>
                纯图询盘 · 有明确需求的潜在客户
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {highValuePosts.map(post => (
                <div key={`hv-${post.id || post.index}`}
                  onClick={() => post.id && navigate(`/xhs-post/${post.id}`)}
                  style={{
                  background: '#fff', borderRadius: 14, overflow: 'hidden',
                  border: '1px solid rgba(255,36,66,0.12)',
                  boxShadow: '0 2px 8px rgba(255,36,66,0.06)',
                  cursor: 'pointer',
                }}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, marginTop: 2,
                      background: 'linear-gradient(135deg, #ff2442, #ff6b81)',
                      color: '#fff',
                    }}>{post.index}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#ff2442',
                          background: '#fff0f3', padding: '2px 6px', borderRadius: 4,
                        }}>询盘</span>
                        <h3 style={{
                          fontSize: 14, fontWeight: 600, color: '#1a1a1a', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{post.title}</h3>
                      </div>
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>@{post.author}</div>
                      {post.imageContent && (
                        <div style={{
                          padding: '8px 12px', marginBottom: 6,
                          background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f6 100%)',
                          borderRadius: 8, borderLeft: '3px solid #ff2442',
                          fontSize: 13, color: '#333', lineHeight: 1.7,
                        }}>
                          <div style={{ fontSize: 10, color: '#ff2442', fontWeight: 600, marginBottom: 2, letterSpacing: 1 }}>图片文字内容</div>
                          {post.imageContent}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#bbb' }}>
                        <span>❤ {post.likes}</span><span>⭐ {post.collects}</span>
                        <span>💬 {post.comments}</span><span>↗ {post.shares}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedPost(post.index); handleExtract(post) }} style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11,
                        border: '1px solid #ffe0e6', background: '#fff5f7',
                        color: '#ff2442', cursor: 'pointer',
                      }}>提取图片</button>
                      <a href={post.url} target="_blank" rel="noopener noreferrer" style={{
                        padding: '5px 10px', borderRadius: 8, fontSize: 11,
                        border: '1px solid #eee', background: '#fafafa',
                        color: '#999', textDecoration: 'none', textAlign: 'center',
                      }}>原帖 ↗</a>
                    </div>
                  </div>
                  {expandedPost === post.index && (
                    <ExpandedPanel
                      post={post}
                      isExtracting={extracting.has(post.index)}
                      onSaveContent={(c) => handleSaveContent(post.index, c)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 全部帖子分隔线 ── */}
        {highValuePosts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '0 4px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#bbb' }}>全部帖子</span>
            <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
          </div>
        )}

        {/* ── 帖子列表（按标签分组） ── */}
        {posts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {/* 标签分组标题 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 16, padding: '0 4px',
            }}>
              <div style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
                color: '#fff',
              }}>
                {activeTag === -1 ? '全部标签' : tags[activeTag]?.name || '搜索结果'}
              </div>
              <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
              <span style={{ fontSize: 12, color: '#999' }}>{posts.length} 条帖子</span>
            </div>

            {/* 高价值帖子 */}
            {highValuePosts.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, padding: '0 4px',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>!</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>高价值帖子</span>
                  <span style={{
                    fontSize: 11, color: '#ff2442', background: '#fff0f3',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  }}>{highValuePosts.length} 条</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {highValuePosts.map(post => renderPostCard(post))}
                </div>
              </div>
            )}

            {/* 其他结果 */}
            {posts.length > highValuePosts.length && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 12, padding: '0 4px',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#999' }}>其他结果</span>
                  <span style={{
                    fontSize: 11, color: '#999', background: '#f5f5f7',
                    padding: '2px 8px', borderRadius: 10,
                  }}>{posts.length - highValuePosts.length} 条</span>
                  <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {posts.filter(p => !isHighValue(p)).map(post => renderPostCard(post))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Agent 获客方案展示 ── */}
        <div style={{
          marginTop: 32, padding: '28px 32px 32px', background: '#fff',
          borderRadius: 16, border: '1px solid rgba(102,126,234,0.12)',
          boxShadow: '0 4px 20px rgba(102,126,234,0.06)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#667eea', fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>WORKFLOW</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>基于业务数据库的 Agent 精准获客方案</div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 6 }}>基于你的业务数据库，Agent 自动分析询盘并生成专业回复方案</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* ── 左侧: 精准获客 Agent ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid #e8e8e8', background: '#fafafa',
              }}>
                {/* Agent 标题栏 */}
                <div style={{
                  padding: '10px 16px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: 'rgba(255,255,255,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }}>🤖</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>精准获客 Agent</span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 'auto' }}>业务数据库驱动</span>
                </div>
                {/* Agent 对话内容 */}
                <div style={{ padding: '14px 16px' }}>
                  {/* 用户输入 */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <div style={{
                      flex: 1, padding: '10px 12px', borderRadius: '12px 12px 12px 4px',
                      background: '#f0f2f5', fontSize: 12, color: '#333', lineHeight: 1.6,
                    }}>
                      <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>📋 原帖需求</div>
                      求推荐适合2人的XX方案，预算1W以内，不要批量流水线
                    </div>
                  </div>
                  {/* Agent 回复 */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', marginTop: 2,
                    }}>AI</div>
                    <div style={{
                      flex: 1, padding: '10px 12px', borderRadius: '4px 12px 12px 12px',
                      background: '#f0fff4', border: '1px solid #d4edda',
                      fontSize: 12, color: '#333', lineHeight: 1.7,
                    }}>
                      <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>✅ 基于数据库匹配的方案</div>
                      <div><b>方案推荐：</b></div>
                      <div style={{ color: '#667eea', margin: '2px 0' }}>· 商品 A · 核心卖点匹配需求</div>
                      <div style={{ color: '#667eea', margin: '2px 0' }}>· 服务 B · 符合预算范围</div>
                      <div style={{ color: '#667eea', margin: '2px 0' }}>· 方案 C · 差异化优势突出</div>
                      <div style={{ marginTop: 4, color: '#666' }}>💰 预估报价区间，突出性价比</div>
                    </div>
                  </div>
                  {/* 数据库标签 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['商品数据库', '服务/方案库', '案例/素材库'].map(tag => (
                      <span key={tag} style={{
                        padding: '3px 8px', borderRadius: 10, fontSize: 10,
                        background: '#f0f2ff', color: '#667eea', fontWeight: 500,
                        border: '1px solid rgba(102,126,234,0.15)',
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 中间: 大箭头 ── */}
            <div style={{
              flexShrink: 0, width: 80, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(102,126,234,0.3)',
              }}>
                <span style={{ fontSize: 22, color: '#fff' }}>→</span>
              </div>
              <div style={{
                fontSize: 10, color: '#999', marginTop: 6, textAlign: 'center',
                lineHeight: 1.3, whiteSpace: 'nowrap',
              }}>Agent<br/>自动生成</div>
            </div>

            {/* ── 右侧: 帖子详情页 ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                border: '1px solid #e8e8e8', background: '#fafafa',
              }}>
                {/* 详情页标题栏 */}
                <div style={{
                  padding: '10px 16px', background: '#fff',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>帖子详情页</span>
                  <span style={{
                    fontSize: 10, color: '#999', marginLeft: 'auto',
                    padding: '2px 8px', background: '#f5f5f5', borderRadius: 8,
                  }}>/research/post/6ac8...</span>
                </div>
                {/* 详情页内容 */}
                <div style={{ padding: '14px 16px' }}>
                  {/* 两列布局缩略 */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* 左列: 文案+配图 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        padding: '10px 12px', borderRadius: 10,
                        background: '#fff', border: '1px solid #eee', marginBottom: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, color: '#fff',
                          }}>AI</div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#333' }}>Agent 文案</span>
                          <span style={{
                            fontSize: 9, color: '#22c55e', marginLeft: 'auto',
                            padding: '1px 6px', background: '#f0fff4', borderRadius: 6,
                          }}>可编辑</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6 }}>
                          姐妹你的需求我太懂了！给你几个建议...<br/>
                          方案 A 最适合你，核心优势是...<br/>
                          预算 1W 内完全可以搞定...<br/>
                          我整理了一份详细对比，可以帮你看看
                        </div>
                      </div>
                      <div style={{
                        padding: '8px 10px', borderRadius: 10,
                        background: '#fff', border: '1px solid #eee',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#333', marginBottom: 6 }}>精选配图 <span style={{ color: '#999', fontWeight: 400 }}>已选 6 张</span></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                          {['🏛', '🌿', '🏡', '🌸', '🏰', '🌺'].map((emoji, i) => (
                            <div key={i} style={{
                              aspectRatio: '1', borderRadius: 4,
                              background: i === 0 ? 'linear-gradient(135deg, #ff244220, #ff6b8120)' : '#f8f8f8',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14, border: i === 0 ? '1.5px solid #ff2442' : '1px solid #eee',
                            }}>{emoji}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* 右列: 评论+发布 */}
                    <div style={{ width: 110, flexShrink: 0 }}>
                      <div style={{
                        padding: '8px 10px', borderRadius: 10,
                        background: '#fff', border: '1px solid #eee', marginBottom: 8,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#ff2442', marginBottom: 4 }}>💬 引流评论</div>
                        <div style={{ fontSize: 9, color: '#666', lineHeight: 1.5 }}>
                          姐妹我刚帮朋友做过类似的！几个关键建议...
                        </div>
                        <div style={{ fontSize: 9, color: '#22c55e', marginTop: 3 }}>186/300 字</div>
                      </div>
                      <div style={{
                        padding: '8px 10px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #f0f2ff, #f8f0ff)',
                        border: '1px solid rgba(102,126,234,0.2)',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#667eea', marginBottom: 6 }}>🚀 一键发布</div>
                        <div style={{
                          padding: '5px 0', borderRadius: 6, textAlign: 'center',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: '#fff', fontSize: 9, fontWeight: 600,
                        }}>发布帖子</div>
                        <div style={{
                          marginTop: 4, padding: '5px 0', borderRadius: 6, textAlign: 'center',
                          background: 'linear-gradient(135deg, #ff2442, #ff6b81)',
                          color: '#fff', fontSize: 9, fontWeight: 600,
                        }}>发送评论</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部数据流说明 */}
          <div style={{
            marginTop: 20, padding: '12px 20px', borderRadius: 10,
            background: '#f8f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
            fontSize: 12, color: '#999',
          }}>
            <span>📦 <b style={{ color: '#667eea' }}>商品</b> 数据库</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span>🛎 <b style={{ color: '#667eea' }}>服务</b> 数据库</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span>📋 <b style={{ color: '#667eea' }}>案例</b> 数据库</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span>💰 <b style={{ color: '#667eea' }}>报价</b> 数据库</span>
          </div>
        </div>

        {/* ── 核心卖点: 训练你的业务 Agent ── */}
        <div style={{
          marginTop: 48, padding: '32px 36px', borderRadius: 20,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          boxShadow: '0 8px 32px rgba(15,52,96,0.3)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 背景装饰 */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102,126,234,0.15), transparent)',
          }} />
          <div style={{
            position: 'absolute', bottom: -40, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(118,75,162,0.12), transparent)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* 标题 */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                display: 'inline-block', padding: '4px 16px', borderRadius: 20,
                background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.3)',
                fontSize: 11, color: '#8b9cf7', fontWeight: 600, letterSpacing: 1, marginBottom: 12,
              }}>CORE VALUE · 核心竞争力</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.4 }}>
                训练一个真正懂你业务的 Agent
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8, maxWidth: 560, margin: '8px auto 0' }}>
                不是通用 AI 套话，而是基于你的商品、报价、案例，生成专业精准的回复方案
              </div>
            </div>

            {/* 左右对比: 通用 AI vs 你的 Agent */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              {/* 左: 通用 AI */}
              <div style={{
                flex: 1, padding: '20px 22px', borderRadius: 14,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>🤖</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>通用 AI</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>没有你的业务数据</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,50,50,0.08)', marginBottom: 6 }}>
                    ✗ 「建议您多对比几家，选择靠谱的商家」
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,50,50,0.08)', marginBottom: 6 }}>
                    ✗ 「具体价格需要咨询商家哦」
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,50,50,0.08)' }}>
                    ✗ 「可以看看我们的服务，相信不会让您失望」
                  </div>
                </div>
                <div style={{
                  marginTop: 12, padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,50,50,0.1)', fontSize: 11,
                  color: 'rgba(255,100,100,0.8)', textAlign: 'center',
                }}>⚠️ 空泛套话，用户直接划走</div>
              </div>

              {/* 中间: VS */}
              <div style={{
                flexShrink: 0, width: 44, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: '#fff',
                  boxShadow: '0 4px 16px rgba(102,126,234,0.4)',
                }}>VS</div>
              </div>

              {/* 右: 你的 Agent */}
              <div style={{
                flex: 1, padding: '20px 22px', borderRadius: 14,
                background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                  }}>✨</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>你的业务 Agent</div>
                    <div style={{ fontSize: 10, color: '#8b9cf7' }}>基于你的数据库训练</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', marginBottom: 6 }}>
                    ✓ 「商品 A 报价 ¥8800，含 3 套方案，比你的预算低 12%」
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)', marginBottom: 6 }}>
                    ✓ 「案例 B 和你的需求很像，2人小团，已收藏」
                  </div>
                  <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.1)' }}>
                    ✓ 「服务 C 本周有档期，可安排免费试纱」
                  </div>
                </div>
                <div style={{
                  marginTop: 12, padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.12)', fontSize: 11,
                  color: 'rgba(100,220,130,0.9)', textAlign: 'center',
                }}>✅ 精准报价 + 真实案例，用户愿意点进来看</div>
              </div>
            </div>

            {/* 训练数据说明 */}
            <div style={{
              padding: '16px 24px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textAlign: 'center' }}>
                你的 Agent 训练数据来源
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { icon: '📦', label: '商品库', desc: '名称·规格·价格' },
                  { icon: '🛎', label: '服务库', desc: '方案·流程·档期' },
                  { icon: '📋', label: '案例库', desc: '实拍·评价·数据' },
                  { icon: '💰', label: '报价库', desc: '套餐·优惠·历史' },
                  { icon: '📝', label: '知识库', desc: 'FAQ·话术·行业' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 10,
                    background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.15)',
                  }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 系统原型图 ── */}
        <div style={{
          marginTop: 48, padding: '28px 32px 24px', background: '#fff',
          borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>SYSTEM ARCHITECTURE</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>社交媒体精准获客 · 系统原型图</div>
          </div>

          {/* ── 第一层: 数据源 ── */}
          <div style={{
            padding: '16px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #f8f9fc, #f0f2ff)',
            border: '1px dashed rgba(102,126,234,0.3)', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: '#667eea', fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>📦 业务数据库（你的后端 / CMS）</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {[
                { icon: '📦', label: '商品/SKU', count: 'N+', color: '#e8f5e9' },
                { icon: '🛎', label: '服务/方案', count: 'N+', color: '#e3f2fd' },
                { icon: '📋', label: '案例/素材', count: 'N+', color: '#fce4ec' },
                { icon: '💰', label: '报价/套餐', count: 'N+', color: '#fff3e0' },
                { icon: '👥', label: '客户资源', count: 'N+', color: '#f3e5f5' },
                { icon: '📝', label: '知识库', count: 'N+', color: '#fffde7' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '8px 14px', borderRadius: 10, background: item.color,
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontWeight: 600, color: '#333' }}>{item.label}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── 向下箭头 ── */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 16, background: '#667eea' }} />
              <div style={{ fontSize: 10, color: '#667eea', fontWeight: 500, margin: '2px 0' }}>数据驱动</div>
              <div style={{ width: 2, height: 8, background: '#667eea' }} />
              <div style={{ fontSize: 14, color: '#667eea', lineHeight: 1 }}>▼</div>
            </div>
          </div>

          {/* ── 第二层: 核心工作流 ── */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 16 }}>
            {/* Step 1: 搜索发现 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 12, height: '100%',
                border: '1px solid #e8e8e8', background: '#fff',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#ff2442', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>1</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>搜索发现询盘</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7 }}>
                  <div>· MCP 服务搜索关键词</div>
                  <div>· 筛选高价值纯图帖</div>
                  <div>· 提取图片识别需求</div>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 6,
                  background: '#fff0f3', fontSize: 10, color: '#ff2442', fontWeight: 500,
                  display: 'inline-block',
                }}>📡 MCP 搜索服务</div>
              </div>
            </div>

            {/* Arrow 1→2 */}
            <div style={{
              flexShrink: 0, width: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 20, height: 2, background: '#ddd' }} />
                <div style={{ fontSize: 12, color: '#ccc', marginLeft: -2 }}>▶</div>
              </div>
            </div>

            {/* Step 2: Agent 分析 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 12, height: '100%',
                border: '1px solid rgba(102,126,234,0.2)', background: 'linear-gradient(135deg, #fafaff, #f5f0ff)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>2</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>Agent 智能分析</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7 }}>
                  <div>· 解析原帖具体需求</div>
                  <div>· 匹配数据库商品/服务</div>
                  <div>· 生成专业回复方案</div>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 6,
                  background: '#f0f2ff', fontSize: 10, color: '#667eea', fontWeight: 500,
                  display: 'inline-block',
                }}>🤖 业务 Agent API</div>
              </div>
            </div>

            {/* Arrow 2→3 */}
            <div style={{
              flexShrink: 0, width: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 20, height: 2, background: '#ddd' }} />
                <div style={{ fontSize: 12, color: '#ccc', marginLeft: -2 }}>▶</div>
              </div>
            </div>

            {/* Step 3: 编辑方案 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 12, height: '100%',
                border: '1px solid rgba(0,0,0,0.06)', background: '#fff',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#1a1a1a', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>3</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>编辑发布方案</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7 }}>
                  <div>· 编辑/优化 Agent 文案</div>
                  <div>· 从数据库挑选配图</div>
                  <div>· 编写引流评论 ≤300字</div>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 6,
                  background: '#f5f5f5', fontSize: 10, color: '#333', fontWeight: 500,
                  display: 'inline-block',
                }}>📝 帖子详情页</div>
              </div>
            </div>

            {/* Arrow 3→4 */}
            <div style={{
              flexShrink: 0, width: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 20, height: 2, background: '#ddd' }} />
                <div style={{ fontSize: 12, color: '#ccc', marginLeft: -2 }}>▶</div>
              </div>
            </div>

            {/* Step 4: 发布方案帖子 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 12, height: '100%',
                border: '1px solid rgba(34,197,94,0.2)', background: 'linear-gradient(135deg, #fafff5, #f0fff4)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#22c55e', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>4</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>发布方案帖子</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7 }}>
                  <div>· 账号 B 发布帖子</div>
                  <div>· Agent 生成的专业方案</div>
                  <div>· 数据库精选配图</div>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 6,
                  background: '#f0fff4', fontSize: 10, color: '#22c55e', fontWeight: 500,
                  display: 'inline-block',
                }}>📤 MCP 发布服务</div>
              </div>
            </div>

            {/* Arrow 4→5 */}
            <div style={{
              flexShrink: 0, width: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 20, height: 2, background: '#ddd' }} />
                <div style={{ fontSize: 12, color: '#ccc', marginLeft: -2 }}>▶</div>
              </div>
            </div>

            {/* Step 5: 原帖引流评论 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '14px 16px', borderRadius: 12, height: '100%',
                border: '1px solid rgba(255,36,66,0.15)', background: 'linear-gradient(135deg, #fffafa, #fff0f3)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: '#ff2442', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>5</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>原帖引流评论</span>
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7 }}>
                  <div>· 账号 A 回到原需求帖</div>
                  <div>· 简要概括方案亮点</div>
                  <div>· 引用新帖链接引导查看</div>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 10px', borderRadius: 6,
                  background: '#fff0f3', fontSize: 10, color: '#ff2442', fontWeight: 500,
                  display: 'inline-block',
                }}>💬 MCP 评论服务</div>
              </div>
            </div>
          </div>

          {/* ── 向下箭头 ── */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 2, height: 8, background: '#ddd' }} />
              <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1 }}>▼</div>
            </div>
          </div>

          {/* ── 第三层: 双账号架构 ── */}
          <div style={{
            padding: '14px 20px', borderRadius: 12,
            background: '#fafafa', border: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 600, marginBottom: 10, textAlign: 'center' }}>🔐 双账号隔离架构</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, alignItems: 'center' }}>
              <div style={{
                padding: '10px 20px', borderRadius: 10, background: '#fff',
                border: '1px solid #e8e8e8', textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ff2442' }}>账号 A</div>
                <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>搜索 + 评论</div>
                <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>端口 18060</div>
              </div>
              <div style={{ fontSize: 20, color: '#ddd' }}>⇄</div>
              <div style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>账号 B</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>发布帖子</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>端口 18061</div>
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginLeft: 8 }}>降低风控风险</div>
            </div>
          </div>
        </div>

        {/* ── 底部说明 ── */}
        <div style={{
          marginTop: 32, padding: '16px 20px', background: '#fff',
          borderRadius: 14, border: '1px solid rgba(0,0,0,0.04)',
          fontSize: 12, color: '#bbb', lineHeight: 1.8,
        }}>
          <strong style={{ color: '#999', fontSize: 12 }}>使用说明</strong>
          <div style={{ marginTop: 6 }}>
            · 点击标签切换搜索关键词，点击 + 添加自定义标签<br />
            · 选择时间范围后点击「搜索」获取最新帖子（需 MCP 服务运行）<br />
            · 点击「提取图片」获取帖子图片并手动提取文字内容<br />
            · 标有<span style={{ color: '#ff2442', fontWeight: 500 }}>「询盘」</span>的帖子为高价值纯图帖<br />
            · 数据通过 MCP 社交媒体服务获取
          </div>
        </div>
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
    </>
  )
}
