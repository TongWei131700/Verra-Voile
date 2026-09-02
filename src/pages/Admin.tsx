import { useState, useEffect, useRef, Fragment } from 'react'
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
  sender_type: 'user' | 'admin' | 'system'
  content: string
  created_at: string
  user_id?: number
  user_phone?: string
  channel?: string
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

interface ProductItem {
  id: number
  categoryId: string
  productId: string
  name: string
  nameEn: string
  description: string
  image: string
  price: number
  unit: string
  capacity: string
  highlight: string
  sort_order: number
}

interface ProductModule {
  id: string
  name: string
  nameEn: string
  image: string
  description: string
  sort_order: number
}

interface DeployVersion {
  id: number
  version: string
  branch: string
  frontend_commit: string
  backend_commit: string
  target: string
  status: string
  note: string
  deployed_at: string
  rolled_back: number
}

type Tab = 'overview' | 'reservations' | 'users' | 'chat' | 'products' | 'version' | 'db-version' | 'agent-chat' | 'analytics'

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

  // 商品管理状态
  const [products, setProducts] = useState<ProductItem[]>([])
  const [productModules, setProductModules] = useState<ProductModule[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null)
  const [productForm, setProductForm] = useState({
    categoryId: '', productId: '', name: '', nameEn: '', description: '', image: '', price: 0, unit: '€', capacity: '', highlight: '', sortOrder: 0,
  })
  const [productFilter, setProductFilter] = useState('')
  const [productCategoryTab, setProductCategoryTab] = useState<string>('')
  const [quickFillId, setQuickFillId] = useState<string>('')
  const [customNameMode, setCustomNameMode] = useState(false)

  // 聊天状态
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [socketConnected, setSocketConnected] = useState(false)
  const [userProducts, setUserProducts] = useState<UserProduct[]>([])
  const socketRef = useRef<Socket | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 版本控制状态
  const [feVersions, setFeVersions] = useState<DeployVersion[]>([])
  const [beVersions, setBeVersions] = useState<DeployVersion[]>([])
  const [currentVersion, setCurrentVersion] = useState<any>(null)
  const [feNext, setFeNext] = useState<{ current: string; next: string; nextBranch: string } | null>(null)
  const [beNext, setBeNext] = useState<{ current: string; next: string; nextBranch: string } | null>(null)
  const [feNote, setFeNote] = useState('')
  const [beNote, setBeNote] = useState('')
  const [deployingSide, setDeployingSide] = useState<'frontend' | 'backend' | null>(null)
  const [rollingBack, setRollingBack] = useState<number | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  // 数据库版本控制状态
  const [dbTables, setDbTables] = useState<{name: string; label: string; record_count: number; version_count: number}[]>([])
  const [dbSelectedTable, setDbSelectedTable] = useState<string>('')
  const [dbVersions, setDbVersions] = useState<any[]>([])
  const [dbPreviewData, setDbPreviewData] = useState<any[] | null>(null)
  const [dbPreviewTotal, setDbPreviewTotal] = useState(0)
  const [dbPreviewVersionId, setDbPreviewVersionId] = useState<number | null>(null)
  const [dbPreviewPage, setDbPreviewPage] = useState(1)
  const [dbPreviewTotalPages, setDbPreviewTotalPages] = useState(0)
  const [dbPreviewColumns, setDbPreviewColumns] = useState<string[]>([])
  const [dbShowSaveDialog, setDbShowSaveDialog] = useState(false)
  const [dbSaveName, setDbSaveName] = useState('')
  const [dbSaveNote, setDbSaveNote] = useState('')
  const [dbSaving, setDbSaving] = useState(false)
  const [dbRestoreConfirm, setDbRestoreConfirm] = useState<{id: number; name: string} | null>(null)
  const [dbRestoring, setDbRestoring] = useState(false)
  // AI 对话管理状态
  const [agentSessions, setAgentSessions] = useState<{user_token: string; message_count: number; last_message_at: string; first_message_at: string}[]>([])
  const [agentSelectedUser, setAgentSelectedUser] = useState<string | null>(null)
  const [agentMessages, setAgentMessages] = useState<any[]>([])

  // 埋点数据分析状态
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null)
  const [analyticsTopPages, setAnalyticsTopPages] = useState<any[]>([])
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([])
  const [analyticsTimeline, setAnalyticsTimeline] = useState<any[]>([])

  const moreRef = useRef<HTMLDivElement>(null)

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
      const [resRes, userRes, statsRes, prodRes, modRes] = await Promise.all([
        fetch('/api/reservation', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/product-modules', { headers }),
      ])
      const resJson = await resRes.json()
      const userJson = await userRes.json()
      const statsJson = await statsRes.json()
      const prodJson = await prodRes.json()
      const modJson = await modRes.json()
      if (resJson.success) setReservations(resJson.data)
      if (userJson.success) setUsers(userJson.data)
      if (statsJson.success) setStats(statsJson.data)
      if (prodJson.success) setProducts(prodJson.data.products)
      if (modJson.success) {
        setProductModules(modJson.data)
        // 默认选中第一个分类Tab
        if (!productCategoryTab && modJson.data.length > 0) {
          setProductCategoryTab(modJson.data[0].id)
        }
      }
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
      // 如果消息来自当前选中用户，自动标记已读并刷新
      if (msg.user_id === selectedChatUser?.id) {
        fetch(`/api/admin/mark-read/${msg.user_id}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
        }).catch(() => {})
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
    // 标记该用户的消息为已读
    const token = localStorage.getItem('admin_token')
    try {
      await fetch(`/api/admin/mark-read/${user.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      // 清除该用户的未读数
      setChatUsers(prev => prev.map(u => u.id === user.id ? { ...u, unread_count: 0 } : u))
    } catch {}
    // 加载用户商品
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

  // 商品管理函数
  // 当前分类下的已有商品（用于快速填充下拉）
  const categoryProducts = products.filter(p => p.categoryId === productForm.categoryId)

  const handleQuickFill = (key: string) => {
    setQuickFillId(key)
    if (key === '__custom__') {
      setCustomNameMode(true)
      setProductForm(f => ({ ...f, name: '', nameEn: '', description: '' }))
      return
    }
    setCustomNameMode(false)
    const found = products.find(p => `${p.categoryId}:${p.productId}` === key)
    if (found) {
      setProductForm(f => ({
        ...f,
        productId: found.productId,
        name: found.name,
        nameEn: found.nameEn,
        description: found.description,
      }))
    }
  }

  const openAddProduct = () => {
    setEditingProduct(null)
    setQuickFillId('')
    setCustomNameMode(true)
    setProductForm({ categoryId: productCategoryTab || productModules[0]?.id || '', productId: '', name: '', nameEn: '', description: '', image: '', price: 0, unit: '€', capacity: '', highlight: '', sortOrder: 0 })
    setShowProductModal(true)
  }

  const openEditProduct = (p: ProductItem) => {
    setEditingProduct(p)
    setQuickFillId(`${p.categoryId}:${p.productId}`)
    setCustomNameMode(false)
    setProductForm({
      categoryId: p.categoryId, productId: p.productId, name: p.name, nameEn: p.nameEn,
      description: p.description, image: p.image, price: p.price, unit: p.unit,
      capacity: p.capacity, highlight: p.highlight, sortOrder: p.sort_order,
    })
    setShowProductModal(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('admin_token')
    const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products'
    const method = editingProduct ? 'PUT' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(productForm),
      })
      const data = await res.json()
      if (data.success) {
        setShowProductModal(false)
        fetchAll()
      } else {
        alert(data.message || '操作失败')
      }
    } catch {
      alert('网络异常')
    }
  }

  const handleDeleteProduct = async (p: ProductItem) => {
    if (!confirm(`确定要删除商品「${p.name}」吗？`)) return
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ categoryId: p.categoryId }),
      })
      const data = await res.json()
      if (data.success) fetchAll()
      else alert(data.message || '删除失败')
    } catch {
      alert('网络异常')
    }
  }

  const filteredProducts = products
    .filter(p => !productCategoryTab || p.categoryId === productCategoryTab)
    .filter(p => !productFilter || p.name.includes(productFilter) || p.nameEn.toLowerCase().includes(productFilter.toLowerCase()))

  const getModuleName = (catId: string) => productModules.find(m => m.id === catId)?.name || catId

  const destinationStats = reservations.reduce((acc, item) => {
    acc[item.destination] = (acc[item.destination] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // ==================== 版本控制 ====================
  const fetchVersions = async () => {
    const token = localStorage.getItem('admin_token')
    const h = { Authorization: `Bearer ${token}` }
    try {
      const [currentRes, feListRes, beListRes, feNextRes, beNextRes] = await Promise.all([
        fetch('/api/version/current', { headers: h }),
        fetch('/api/version/list?side=frontend', { headers: h }),
        fetch('/api/version/list?side=backend', { headers: h }),
        fetch('/api/version/next?side=frontend', { headers: h }),
        fetch('/api/version/next?side=backend', { headers: h }),
      ])
      const currentData = await currentRes.json()
      const feListData = await feListRes.json()
      const beListData = await beListRes.json()
      const feNextData = await feNextRes.json()
      const beNextData = await beNextRes.json()
      if (currentData.success) setCurrentVersion(currentData.data)
      if (feListData.success) setFeVersions(feListData.data)
      if (beListData.success) setBeVersions(beListData.data)
      if (feNextData.success) setFeNext(feNextData.data)
      if (beNextData.success) setBeNext(beNextData.data)
    } catch (e) {
      console.error('获取版本信息失败', e)
    }
  }

  useEffect(() => {
    if (tab === 'version' && authed) fetchVersions()
    if (tab === 'db-version' && authed) fetchDbTables()
    if (tab === 'agent-chat' && authed) fetchAgentSessions()
    if (tab === 'analytics' && authed) fetchAnalytics()
  }, [tab, authed])

  // AI 对话管理函数
  const fetchAgentSessions = async () => {
    try {
      const res = await fetch('/api/admin/agent-sessions', { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      const data = await res.json()
      if (data.success) setAgentSessions(data.data)
    } catch (e) {
      console.error('获取 AI 会话列表失败:', e)
    }
  }

  const fetchAgentMessages = async (userToken: string) => {
    try {
      const res = await fetch(`/api/admin/agent-messages/${encodeURIComponent(userToken)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      const data = await res.json()
      if (data.success) setAgentMessages(data.data)
    } catch (e) {
      console.error('获取 AI 对话详情失败:', e)
    }
  }

  // 埋点数据获取
  const fetchAnalytics = async () => {
    try {
      const [overviewRes, topPagesRes, eventsRes, timelineRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/analytics/top-pages?limit=15&days=30'),
        fetch('/api/analytics/events?days=30'),
        fetch('/api/analytics/timeline?limit=30'),
      ])
      const [overviewData, topPagesData, eventsData, timelineData] = await Promise.all([
        overviewRes.json(), topPagesRes.json(), eventsRes.json(), timelineRes.json(),
      ])
      if (overviewData.success) setAnalyticsOverview(overviewData.data)
      if (topPagesData.success) setAnalyticsTopPages(topPagesData.data)
      if (eventsData.success) setAnalyticsEvents(eventsData.data)
      if (timelineData.success) setAnalyticsTimeline(timelineData.data)
    } catch (e) {
      console.error('获取埋点数据失败:', e)
    }
  }

  // 数据库版本控制函数
  const fetchDbTables = async () => {
    try {
      const res = await fetch('/api/data-version/tables')
      const data = await res.json()
      if (data.success) {
        setDbTables(data.data)
        if (data.data.length > 0 && !dbSelectedTable) {
          setDbSelectedTable(data.data[0].name)
        }
      }
    } catch (e) {
      console.error('获取数据库表列表失败:', e)
    }
  }

  const fetchDbVersions = async (table?: string) => {
    const targetTable = table || dbSelectedTable
    if (!targetTable) return
    try {
      const res = await fetch(`/api/data-version/list?table=${encodeURIComponent(targetTable)}`)
      const data = await res.json()
      if (data.success) setDbVersions(data.data)
    } catch (e) {
      console.error('获取版本列表失败:', e)
    }
  }

  useEffect(() => {
    if (dbSelectedTable) fetchDbVersions(dbSelectedTable)
  }, [dbSelectedTable])

  const handleDbSaveVersion = async () => {
    if (!dbSaveName.trim()) return alert('请输入版本名称')
    setDbSaving(true)
    try {
      const res = await fetch('/api/data-version/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: dbSelectedTable, name: dbSaveName.trim(), note: dbSaveNote.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setDbShowSaveDialog(false)
        setDbSaveName('')
        setDbSaveNote('')
        fetchDbVersions()
        fetchDbTables()
      } else {
        alert(data.message || '保存失败')
      }
    } catch (e) {
      alert('保存失败: ' + (e as Error).message)
    } finally {
      setDbSaving(false)
    }
  }

  const handleDbPreview = async (versionId: number, page: number = 1) => {
    try {
      const res = await fetch(`/api/data-version/preview/${versionId}?page=${page}&pageSize=10`)
      const data = await res.json()
      if (data.success) {
        setDbPreviewData(data.data)
        setDbPreviewTotal(data.total)
        setDbPreviewTotalPages(data.totalPages)
        setDbPreviewPage(data.page)
        setDbPreviewColumns(data.columns || [])
        setDbPreviewVersionId(versionId)
      }
    } catch (e) {
      console.error('预览失败:', e)
    }
  }

  const handleDbPreviewPageChange = (newPage: number) => {
    if (dbPreviewVersionId && newPage >= 1 && newPage <= dbPreviewTotalPages) {
      handleDbPreview(dbPreviewVersionId, newPage)
    }
  }

  const handleDbRestore = (versionId: number, versionName: string) => {
    setDbRestoreConfirm({ id: versionId, name: versionName })
  }

  const handleDbConfirmRestore = async () => {
    if (!dbRestoreConfirm) return
    setDbRestoring(true)
    try {
      const res = await fetch(`/api/data-version/restore/${dbRestoreConfirm.id}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        setDbRestoreConfirm(null)
        setDbPreviewData(null)
        setDbPreviewVersionId(null)
        fetchDbVersions()
        fetchDbTables()
      } else {
        alert(data.message || '回滚失败')
      }
    } catch (e) {
      alert('回滚失败: ' + (e as Error).message)
    } finally {
      setDbRestoring(false)
    }
  }

  const handleDbDeleteVersion = async (versionId: number, versionName: string) => {
    if (!confirm(`确定删除版本「${versionName}」？此操作不可恢复。`)) return
    try {
      const res = await fetch(`/api/data-version/${versionId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchDbVersions()
        fetchDbTables()
      }
    } catch (e) {
      console.error('删除失败:', e)
    }
  }

  const handleDeploy = async (side: 'frontend' | 'backend') => {
    const nextInfo = side === 'frontend' ? feNext : beNext
    const note = side === 'frontend' ? feNote : beNote
    if (!nextInfo) return
    setDeployingSide(side)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch('/api/version/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ side, note }),
      })
      const data = await res.json()
      if (data.success) {
        await fetch('/api/version/switch-branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ side, version: nextInfo.next }),
        })
        if (side === 'frontend') { setFeNote('') } else { setBeNote('') }
        fetchVersions()
        const prefix = side === 'frontend' ? 'fe' : 'be'
        alert(`${side === 'frontend' ? '前端' : '后端'} v${nextInfo.next} 已发布，分支已切换到 ${prefix}/${nextInfo.next}`)
      } else {
        alert(data.message || '操作失败')
      }
    } catch {
      alert('网络异常')
    } finally {
      setDeployingSide(null)
    }
  }

  const handleRollback = async (id: number, version: string) => {
    if (!confirm(`确定要回滚到版本 v${version} 吗？`)) return
    setRollingBack(id)
    const token = localStorage.getItem('admin_token')
    try {
      const res = await fetch(`/api/version/rollback/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message)
        fetchVersions()
      } else {
        alert(data.message || '回滚失败')
      }
    } catch {
      alert('网络异常')
    } finally {
      setRollingBack(null)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success': return { text: '成功', cls: 'version-status--success' }
      case 'failed': return { text: '失败', cls: 'version-status--failed' }
      case 'rolled_back': return { text: '已回滚', cls: 'version-status--rolled' }
      default: return { text: status, cls: '' }
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: '数据概览' },
    { key: 'reservations', label: '预约管理' },
    { key: 'users', label: '注册用户' },
    { key: 'chat', label: '💬 客户咨询' },
    { key: 'products', label: ' 商品管理' },
    { key: 'version', label: '🚀 版本控制' },
    { key: 'db-version', label: '🗄️ 数据库' },
    { key: 'agent-chat', label: '🤖 AI 对话' },
    { key: 'analytics', label: '📊 数据分析' },
  ]

  const MAX_VISIBLE_TABS = 4
  const visibleTabs = tabs.slice(0, MAX_VISIBLE_TABS)
  const overflowTabs = tabs.slice(MAX_VISIBLE_TABS)
  const isOverflowActive = overflowTabs.some(t => t.key === tab)

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      <nav className="dashboard-tabs">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        {overflowTabs.length > 0 && (
          <div className="tab-more-wrapper" ref={moreRef}>
            <button
              className={`tab-btn tab-more-btn ${isOverflowActive ? 'active' : ''}`}
              onClick={() => setMoreOpen(v => !v)}
            >
              {isOverflowActive ? overflowTabs.find(t => t.key === tab)?.label : '更多'} ▾
            </button>
            {moreOpen && (
              <div className="tab-more-dropdown">
                {overflowTabs.map(t => (
                  <button
                    key={t.key}
                    className={`tab-more-item ${tab === t.key ? 'active' : ''}`}
                    onClick={() => { setTab(t.key); setMoreOpen(false) }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

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
                    {chatMessages.map((msg, idx) => {
                      // 渠道切换分隔线
                      const prevChannel = idx > 0 ? chatMessages[idx - 1]?.channel : undefined
                      const showChannelLabel = msg.channel && msg.channel !== prevChannel
                      const channelLabel = msg.channel === 'consult' ? '💬 咨询' : '📋 订单'

                      // 系统消息：商品咨询上下文
                      if (msg.sender_type === 'system') {
                        let ctx: { name?: string; nameEn?: string; image?: string; price?: number; unit?: string; type?: string; route?: string } | null = null
                        try { ctx = JSON.parse(msg.content) } catch {}
                        if (!ctx || !ctx.name) return null
                        return (
                          <Fragment key={msg.id}>
                            {showChannelLabel && (
                              <div className="admin-chat-channel-divider"><span>{channelLabel}</span></div>
                            )}
                            <div className="admin-chat-system-msg">
                              <span className="admin-chat-system-msg__label">🛍️ 用户正在咨询</span>
                              <div
                                className="admin-chat-system-msg__card"
                                style={ctx.route ? { cursor: 'pointer' } : undefined}
                                onClick={() => ctx.route && window.open(ctx.route, '_blank')}
                              >
                                {ctx.image && <img src={ctx.image} alt={ctx.name} className="admin-chat-system-msg__img" />}
                                <div className="admin-chat-system-msg__info">
                                  <span className="admin-chat-system-msg__type">{ctx.type}</span>
                                  <span className="admin-chat-system-msg__name">{ctx.name}</span>
                                  {ctx.nameEn && <span className="admin-chat-system-msg__name-en">{ctx.nameEn}</span>}
                                  {ctx.price && ctx.price > 0 && (
                                    <span className="admin-chat-system-msg__price">{ctx.unit}{ctx.price?.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Fragment>
                        )
                      }
                      return (
                        <Fragment key={msg.id}>
                          {showChannelLabel && (
                            <div className="admin-chat-channel-divider"><span>{channelLabel}</span></div>
                          )}
                          <div className={`admin-chat-bubble admin-chat-bubble--${msg.sender_type}`}>
                            <div className="admin-chat-bubble__content">
                              <p>{msg.content}</p>
                              <span className="admin-chat-bubble__time">
                                {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </Fragment>
                      )
                    })}
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

      {/* 商品管理 */}
      {tab === 'products' && (
        <div className="dashboard-content">
          {/* 分类子Tab */}
          <div className="prod-category-tabs">
            {productModules.map(mod => (
              <button
                key={mod.id}
                className={`prod-category-tab ${productCategoryTab === mod.id ? 'prod-category-tab--active' : ''}`}
                onClick={() => { setProductCategoryTab(mod.id); setProductFilter('') }}
              >
                {mod.name}
                <span className="prod-category-tab__count">
                  {products.filter(p => p.categoryId === mod.id).length}
                </span>
              </button>
            ))}
          </div>

          <div className="dash-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0 }}>
                {productCategoryTab ? getModuleName(productCategoryTab) : '全部'} 商品列表 ({filteredProducts.length})
              </h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="搜索商品..."
                  value={productFilter}
                  onChange={e => setProductFilter(e.target.value)}
                  className="prod-search-input"
                />
                <button className="dashboard-refresh prod-add-btn" onClick={openAddProduct}>+ 新增商品</button>
              </div>
            </div>
            {filteredProducts.length === 0 ? (
              <p className="empty">暂无商品</p>
            ) : (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th style={{width: 40}}>ID</th>
                      <th>商品ID</th>
                      <th>名称</th>
                      <th>英文名</th>
                      <th>描述</th>
                      <th>价格</th>
                      <th>标签</th>
                      <th>排序</th>
                      <th style={{width: 120}}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id}>
                        <td>{p.id}</td>
                        <td><code>{p.productId}</code></td>
                        <td className="cell-name">{p.name}</td>
                        <td>{p.nameEn}</td>
                        <td className="cell-desc">{p.description || '-'}</td>
                        <td>{p.unit}{p.price.toLocaleString()}</td>
                        <td>{p.highlight || '-'}</td>
                        <td>{p.sort_order}</td>
                        <td>
                          <button className="prod-action-btn" onClick={() => openEditProduct(p)}>编辑</button>
                          <button className="prod-action-btn prod-action-btn--danger" onClick={() => handleDeleteProduct(p)}>删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 版本控制 */}
      {tab === 'version' && (
        <div className="dashboard-content">
          {/* 当前状态 */}
          <div className="dash-section">
            <h3>📍 当前状态</h3>
            {currentVersion ? (
              <div className="version-status-grid">
                <div className="version-status-panel version-status-panel--fe">
                  <div className="version-status-panel__title">🎨 前端</div>
                  <div className="version-status-panel__branch">{currentVersion.frontend?.branch || '-'}</div>
                  <div className="version-status-panel__commit">commit: {currentVersion.frontend?.shortCommit || '-'}</div>
                  <div className="version-status-panel__version">
                    最新版本: {currentVersion.frontend?.latest ? `v${currentVersion.frontend.latest.version}` : '暂无'}
                  </div>
                </div>
                <div className="version-status-panel version-status-panel--be">
                  <div className="version-status-panel__title">⚙️ 后端</div>
                  <div className="version-status-panel__branch">{currentVersion.backend?.branch || '-'}</div>
                  <div className="version-status-panel__commit">commit: {currentVersion.backend?.shortCommit || '-'}</div>
                  <div className="version-status-panel__version">
                    最新版本: {currentVersion.backend?.latest ? `v${currentVersion.backend.latest.version}` : '暂无'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty">加载中...</p>
            )}
          </div>

          {/* 左右分栏：前端 + 后端 */}
          <div className="version-columns">
            {/* 前端 */}
            <div className="version-column">
              <h3>🎨 前端发布</h3>
              {feNext && (
                <div className="version-deploy-form">
                  <div className="version-deploy-row">
                    <label>下一版本</label>
                    <span className="version-deploy-badge version-deploy-badge--fe">v{feNext.next}</span>
                  </div>
                  <div className="version-deploy-row">
                    <label>分支</label>
                    <span className="version-deploy-branch">fe/{feNext.next}</span>
                  </div>
                  <div className="version-deploy-row">
                    <label>备注</label>
                    <input type="text" placeholder="如: 修复首页样式" value={feNote} onChange={e => setFeNote(e.target.value)} />
                  </div>
                  <button className="version-deploy-btn version-deploy-btn--fe" onClick={() => handleDeploy('frontend')} disabled={deployingSide === 'frontend'}>
                    {deployingSide === 'frontend' ? '发布中...' : `发布前端 v${feNext.next}`}
                  </button>
                </div>
              )}
              <div className="version-timeline">
                <h4>历史记录 ({feVersions.length})</h4>
                {feVersions.length === 0 ? (
                  <p className="empty">暂无记录</p>
                ) : feVersions.map((v, idx) => {
                  const statusInfo = getStatusLabel(v.status)
                  const isLatest = idx === 0 && !v.rolled_back
                  return (
                    <div key={v.id} className={`version-item ${v.rolled_back ? 'version-item--rolled' : ''} ${isLatest ? 'version-item--latest' : ''}`}>
                      <div className="version-item__dot" />
                      <div className="version-item__content">
                        <div className="version-item__header">
                          <span className="version-item__version">v{v.version}</span>
                          <span className={`version-item__status ${statusInfo.cls}`}>{statusInfo.text}</span>
                          {isLatest && <span className="version-item__latest">当前</span>}
                        </div>
                        <div className="version-item__meta">
                          <span>🔀 {v.branch}</span>
                          <span>🕐 {formatDate(v.deployed_at)}</span>
                        </div>
                        {v.note && <div className="version-item__note">📝 {v.note}</div>}
                        {v.frontend_commit && <div className="version-item__commits"><span>commit: {v.frontend_commit.substring(0, 7)}</span></div>}
                        {!isLatest && (
                          <button className="version-item__rollback" onClick={() => handleRollback(v.id, v.version)} disabled={rollingBack === v.id}>
                            {rollingBack === v.id ? '回滚中...' : v.rolled_back ? '↩ 重新回滚到此版本' : '↩ 回滚到此版本'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 后端 */}
            <div className="version-column">
              <h3>⚙️ 后端发布</h3>
              {beNext && (
                <div className="version-deploy-form">
                  <div className="version-deploy-row">
                    <label>下一版本</label>
                    <span className="version-deploy-badge version-deploy-badge--be">v{beNext.next}</span>
                  </div>
                  <div className="version-deploy-row">
                    <label>分支</label>
                    <span className="version-deploy-branch">be/{beNext.next}</span>
                  </div>
                  <div className="version-deploy-row">
                    <label>备注</label>
                    <input type="text" placeholder="如: 新增接口" value={beNote} onChange={e => setBeNote(e.target.value)} />
                  </div>
                  <button className="version-deploy-btn version-deploy-btn--be" onClick={() => handleDeploy('backend')} disabled={deployingSide === 'backend'}>
                    {deployingSide === 'backend' ? '发布中...' : `发布后端 v${beNext.next}`}
                  </button>
                </div>
              )}
              <div className="version-timeline">
                <h4>历史记录 ({beVersions.length})</h4>
                {beVersions.length === 0 ? (
                  <p className="empty">暂无记录</p>
                ) : beVersions.map((v, idx) => {
                  const statusInfo = getStatusLabel(v.status)
                  const isLatest = idx === 0 && !v.rolled_back
                  return (
                    <div key={v.id} className={`version-item ${v.rolled_back ? 'version-item--rolled' : ''} ${isLatest ? 'version-item--latest' : ''}`}>
                      <div className="version-item__dot" />
                      <div className="version-item__content">
                        <div className="version-item__header">
                          <span className="version-item__version">v{v.version}</span>
                          <span className={`version-item__status ${statusInfo.cls}`}>{statusInfo.text}</span>
                          {isLatest && <span className="version-item__latest">当前</span>}
                        </div>
                        <div className="version-item__meta">
                          <span>🔀 {v.branch}</span>
                          <span>🕐 {formatDate(v.deployed_at)}</span>
                        </div>
                        {v.note && <div className="version-item__note">📝 {v.note}</div>}
                        {v.backend_commit && <div className="version-item__commits"><span>commit: {v.backend_commit.substring(0, 7)}</span></div>}
                        {!isLatest && (
                          <button className="version-item__rollback" onClick={() => handleRollback(v.id, v.version)} disabled={rollingBack === v.id}>
                            {rollingBack === v.id ? '回滚中...' : v.rolled_back ? '↩ 重新回滚到此版本' : '↩ 回滚到此版本'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 数据库版本控制 */}
      {tab === 'db-version' && (
        <div className="dashboard-content">
          {/* 表选择器 */}
          <div className="dash-section">
            <h3>🗄️ 数据库版本管理</h3>
            <div className="db-table-selector">
              {dbTables.map(t => (
                <button
                  key={t.name}
                  className={`db-table-btn ${dbSelectedTable === t.name ? 'db-table-btn--active' : ''}`}
                  onClick={() => setDbSelectedTable(t.name)}
                >
                  <span className="db-table-btn__name">{t.label}</span>
                  <span className="db-table-btn__meta">{t.record_count} 条 · {t.version_count} 版本</span>
                </button>
              ))}
            </div>
          </div>

          {/* 版本列表 */}
          <div className="dash-section">
            <div className="db-version-header">
              <h4>📋 {dbTables.find(t => t.name === dbSelectedTable)?.label || ''}版本列表</h4>
              <button className="db-save-btn" onClick={() => setDbShowSaveDialog(true)}>+ 保存当前数据为新版本</button>
            </div>
            {dbVersions.length === 0 ? (
              <p className="empty">暂无版本，点击「保存当前数据为新版本」创建第一个快照</p>
            ) : (
              <div className="db-version-list">
                {dbVersions.map(v => {
                  const countrySummary = typeof v.country_summary === 'string' ? JSON.parse(v.country_summary) : v.country_summary
                  return (
                    <div key={v.id} className="db-version-card">
                      <div className="db-version-card__header">
                        <div className="db-version-card__title">
                          <span className="db-version-card__name">{v.version_name}</span>
                          <span className="db-version-card__count">{v.record_count} 条记录</span>
                        </div>
                        <div className="db-version-card__time">{new Date(v.created_at).toLocaleString('zh-CN')}</div>
                      </div>
                      {v.note && <div className="db-version-card__note">📝 {v.note}</div>}
                      {countrySummary && countrySummary.length > 0 && (
                        <div className="db-version-card__summary">
                          {countrySummary.map((c: any) => (
                            <span key={c.country} className="db-version-card__tag">{c.country_cn || c.country}: {c.cnt}</span>
                          ))}
                        </div>
                      )}
                      <div className="db-version-card__actions">
                        <button className="db-action-btn db-action-btn--preview" onClick={() => handleDbPreview(v.id)}>
                          👁 预览数据
                        </button>
                        <button className="db-action-btn db-action-btn--restore" onClick={() => handleDbRestore(v.id, v.version_name)}>
                          ↩ 回滚到此版本
                        </button>
                        <button className="db-action-btn db-action-btn--delete" onClick={() => handleDbDeleteVersion(v.id, v.version_name)}>
                          🗑 删除
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 数据预览弹窗 */}
          {dbPreviewData && (
            <>
              <div className="modal-backdrop" onClick={() => { setDbPreviewData(null); setDbPreviewVersionId(null) }} />
              <div className="db-preview-modal">
                <div className="db-preview-modal__header">
                  <h3>📊 数据预览 - 版本 #{dbPreviewVersionId}</h3>
                  <button className="product-modal__close" onClick={() => { setDbPreviewData(null); setDbPreviewVersionId(null) }}>✕</button>
                </div>
                <div className="db-preview-modal__info">
                  共 {dbPreviewTotal} 条记录 · 第 {dbPreviewPage}/{dbPreviewTotalPages} 页
                </div>
                <div className="db-preview-modal__table-wrap">
                  <table className="db-preview-table">
                    <thead>
                      <tr>
                        {dbPreviewColumns.map(col => (
                          <th key={col} title={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dbPreviewData.map(row => (
                        <tr key={row.id}>
                          {dbPreviewColumns.map(col => {
                            const val = row[col]
                            // 图片字段
                            if (col === 'cover_image' || col === 'cover_image_url') {
                              return (
                                <td key={col}>
                                  {val && <img src={val} alt="" style={{width: 50, height: 35, objectFit: 'cover', borderRadius: 4}} />}
                                </td>
                              )
                            }
                            // JSON 数组/对象
                            if (Array.isArray(val)) {
                              const text = val.map((item: any) => {
                                if (typeof item === 'string') return item
                                if (typeof item === 'object') return item.name_cn || item.name || item.label || JSON.stringify(item)
                                return String(item)
                              }).join(', ')
                              return <td key={col} className="db-cell-truncate" title={text}>{text}</td>
                            }
                            if (val !== null && typeof val === 'object') {
                              const text = JSON.stringify(val)
                              return <td key={col} className="db-cell-truncate" title={text}>{text}</td>
                            }
                            // 长文本截断
                            if (typeof val === 'string' && val.length > 60) {
                              return <td key={col} className="db-cell-truncate" title={val}>{val}</td>
                            }
                            // 普通值
                            return <td key={col}>{val === null || val === undefined ? '' : String(val)}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="db-preview-modal__footer">
                  <div className="db-pagination">
                    <button disabled={dbPreviewPage <= 1} onClick={() => handleDbPreviewPageChange(1)}>«</button>
                    <button disabled={dbPreviewPage <= 1} onClick={() => handleDbPreviewPageChange(dbPreviewPage - 1)}>‹</button>
                    <span className="db-pagination__info">{dbPreviewPage} / {dbPreviewTotalPages}</span>
                    <button disabled={dbPreviewPage >= dbPreviewTotalPages} onClick={() => handleDbPreviewPageChange(dbPreviewPage + 1)}>›</button>
                    <button disabled={dbPreviewPage >= dbPreviewTotalPages} onClick={() => handleDbPreviewPageChange(dbPreviewTotalPages)}>»</button>
                  </div>
                  <div className="db-preview-modal__actions">
                    <button onClick={() => { setDbPreviewData(null); setDbPreviewVersionId(null) }}>关闭</button>
                    <button className="db-action-btn db-action-btn--restore" onClick={() => {
                      const version = dbVersions.find(v => v.id === dbPreviewVersionId)
                      if (version) handleDbRestore(version.id, version.version_name)
                    }}>
                      ↩ 确认回滚到此版本
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 保存版本弹窗 */}
          {dbShowSaveDialog && (
            <>
              <div className="modal-backdrop" onClick={() => setDbShowSaveDialog(false)} />
              <div className="db-save-modal">
                <h3>💾 保存当前数据为新版本</h3>
                <p>将 <strong>{dbTables.find(t => t.name === dbSelectedTable)?.label}</strong> 的当前数据创建快照</p>
                <div className="db-save-modal__field">
                  <label>版本名称 *</label>
                  <input type="text" value={dbSaveName} onChange={e => setDbSaveName(e.target.value)} placeholder="如: 爬取意大利前" autoFocus />
                </div>
                <div className="db-save-modal__field">
                  <label>备注</label>
                  <textarea value={dbSaveNote} onChange={e => setDbSaveNote(e.target.value)} placeholder="可选，记录本次操作说明" rows={3} />
                </div>
                <div className="db-save-modal__actions">
                  <button onClick={() => { setDbShowSaveDialog(false); setDbSaveName(''); setDbSaveNote('') }}>取消</button>
                  <button className="db-save-btn" onClick={handleDbSaveVersion} disabled={dbSaving}>
                    {dbSaving ? '保存中...' : '确认保存'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* 回滚确认弹窗 */}
          {dbRestoreConfirm && (
            <>
              <div className="modal-backdrop" onClick={() => setDbRestoreConfirm(null)} />
              <div className="db-restore-modal">
                <h3>⚠️ 确认回滚</h3>
                <p>确定要将 <strong>{dbTables.find(t => t.name === dbSelectedTable)?.label}</strong> 的数据回滚到版本「<strong>{dbRestoreConfirm.name}</strong>」吗？</p>
                <p className="db-restore-modal__warning">⚠️ 这将覆盖当前表中的所有数据，此操作不可撤销！</p>
                <div className="db-restore-modal__actions">
                  <button onClick={() => setDbRestoreConfirm(null)}>取消</button>
                  <button className="db-restore-btn" onClick={handleDbConfirmRestore} disabled={dbRestoring}>
                    {dbRestoring ? '回滚中...' : '确认回滚'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI 对话管理 */}
      {tab === 'agent-chat' && (
        <div className="dashboard-content">
          <div className="dash-section">
            <h3>🤖 AI 助手对话记录</h3>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>查看用户使用 AI 婚礼规划助手的对话历史</p>
            
            {agentSessions.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无对话记录</p>
            ) : (
              <div className="agent-admin-layout">
                {/* 左侧：用户列表 */}
                <div className="agent-admin-sidebar">
                  <h4>用户列表 ({agentSessions.length})</h4>
                  <div className="agent-admin-user-list">
                    {agentSessions.map(s => (
                      <button
                        key={s.user_token}
                        className={`agent-admin-user-item ${agentSelectedUser === s.user_token ? 'active' : ''}`}
                        onClick={() => { setAgentSelectedUser(s.user_token); fetchAgentMessages(s.user_token) }}
                      >
                        <div className="agent-admin-user-token">{s.user_token}</div>
                        <div className="agent-admin-user-meta">
                          <span>{s.message_count} 条对话</span>
                          <span>{new Date(s.last_message_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 右侧：对话详情 */}
                <div className="agent-admin-main">
                  {agentSelectedUser ? (
                    <>
                      <h4>对话详情 - {agentSelectedUser}</h4>
                      {agentMessages.length === 0 ? (
                        <p style={{ color: '#999', padding: 20 }}>加载中...</p>
                      ) : (
                        <div className="agent-admin-messages">
                          {agentMessages.map((msg, idx) => (
                            <div key={idx} className="agent-admin-conversation">
                              <div className="agent-admin-msg-time">{new Date(msg.created_at).toLocaleString('zh-CN')}</div>
                              <div className="agent-admin-msg agent-admin-msg--user">
                                <div className="agent-admin-msg-label">用户提问</div>
                                <div className="agent-admin-msg-content">{msg.user_message}</div>
                              </div>
                              <div className="agent-admin-msg agent-admin-msg--ai">
                                <div className="agent-admin-msg-label">AI 回复</div>
                                <div className="agent-admin-msg-content">{msg.ai_reply}</div>
                              </div>
                              {msg.thinking_steps && msg.thinking_steps.length > 0 && (
                                <details className="agent-admin-thinking">
                                  <summary>思考过程 ({msg.thinking_steps.length} 步)</summary>
                                  <div className="agent-admin-thinking-content">
                                    {msg.thinking_steps.map((step: string, i: number) => (
                                      <div key={i} className="agent-admin-thinking-step">{step}</div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#999', padding: 40, textAlign: 'center' }}>← 请选择一个用户查看对话详情</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据分析 */}
      {tab === 'analytics' && (
        <div className="dashboard-content">
          <div className="dash-section">
            <h3>📊 埋点数据概览</h3>

            {analyticsOverview ? (
              <>
                {/* 核心指标卡片 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
                  <div style={{ background: '#f8f6f3', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2a2723' }}>{analyticsOverview.todayPv}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>今日 PV</div>
                  </div>
                  <div style={{ background: '#f8f6f3', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2a2723' }}>{analyticsOverview.todayUv}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>今日 UV</div>
                  </div>
                  <div style={{ background: '#f8f6f3', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2a2723' }}>{analyticsOverview.yesterdayPv}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>昨日 PV</div>
                  </div>
                  <div style={{ background: '#f8f6f3', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2a2723' }}>{analyticsOverview.yesterdayUv}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>昨日 UV</div>
                  </div>
                  <div style={{ background: '#f8f6f3', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2a2723' }}>{analyticsOverview.totalEvents?.toLocaleString()}</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>总事件数</div>
                  </div>
                </div>

                {/* 7 天趋势 */}
                {analyticsOverview.trend?.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ marginBottom: 12, fontSize: 15 }}>最近 7 天趋势</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e8e4df' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px' }}>日期</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>PV</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>UV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsOverview.trend.map((row: any) => (
                          <tr key={row.date} style={{ borderBottom: '1px solid #f0ece8' }}>
                            <td style={{ padding: '8px 12px' }}>{new Date(row.date).toLocaleDateString('zh-CN')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.pv}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.uv}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 热门页面 */}
                {analyticsTopPages.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ marginBottom: 12, fontSize: 15 }}>热门页面 Top 15（近 30 天）</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e8e4df' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '8px 12px' }}>页面路径</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>PV</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>UV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsTopPages.map((row: any, i: number) => (
                          <tr key={row.page_path} style={{ borderBottom: '1px solid #f0ece8' }}>
                            <td style={{ padding: '8px 12px', color: '#999' }}>{i + 1}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.page_path}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.pv}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.uv}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 事件类型统计 */}
                {analyticsEvents.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ marginBottom: 12, fontSize: 15 }}>事件类型统计（近 30 天）</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e8e4df' }}>
                          <th style={{ textAlign: 'left', padding: '8px 12px' }}>事件类型</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>次数</th>
                          <th style={{ textAlign: 'right', padding: '8px 12px' }}>涉及会话</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsEvents.map((row: any) => (
                          <tr key={row.event_type} style={{ borderBottom: '1px solid #f0ece8' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{row.event_type}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.count}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>{row.sessions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 最近事件时间线 */}
                {analyticsTimeline.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 12, fontSize: 15 }}>最近事件（最新 30 条）</h4>
                    <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e8e4df', borderRadius: 8 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e8e4df', position: 'sticky', top: 0, background: '#fff' }}>
                            <th style={{ textAlign: 'left', padding: '6px 10px' }}>时间</th>
                            <th style={{ textAlign: 'left', padding: '6px 10px' }}>事件</th>
                            <th style={{ textAlign: 'left', padding: '6px 10px' }}>页面</th>
                            <th style={{ textAlign: 'left', padding: '6px 10px' }}>用户</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsTimeline.map((ev: any) => (
                            <tr key={ev.id} style={{ borderBottom: '1px solid #f0ece8' }}>
                              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap', color: '#888' }}>{new Date(ev.created_at).toLocaleString('zh-CN')}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'monospace' }}>{ev.event_type}</td>
                              <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.page_path}</td>
                              <td style={{ padding: '6px 10px', color: '#888', fontSize: 11 }}>{ev.user_token}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {analyticsOverview.totalEvents === 0 && (
                  <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>暂无埋点数据，前端开始上报后将在此显示</p>
                )}
              </>
            ) : (
              <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>加载中...</p>
            )}
          </div>
        </div>
      )}

      {/* 商品编辑弹窗 */}
      {showProductModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowProductModal(false)} />
          <div className="product-modal">
            <div className="product-modal__header">
              <h3>{editingProduct ? '编辑商品' : '新增商品'}</h3>
              <button className="product-modal__close" onClick={() => setShowProductModal(false)}>✕</button>
            </div>
            <form className="product-modal__form" onSubmit={handleSaveProduct}>
              <div className="product-modal__row">
                <div className="product-modal__field">
                  <label>所属分类</label>
                  <select value={productForm.categoryId} onChange={e => { setProductForm(f => ({...f, categoryId: e.target.value})); setQuickFillId(''); setCustomNameMode(true) }} required>
                    {productModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="product-modal__field">
                  <label>商品ID</label>
                  <input type="text" value={productForm.productId} onChange={e => setProductForm(f => ({...f, productId: e.target.value}))} required placeholder="如: base" />
                </div>
              </div>
              <div className="product-modal__row">
                <div className="product-modal__field">
                  <label>中文名称 {categoryProducts.length > 0 && !customNameMode && <span style={{fontSize:12,color:'#999'}}>（下拉选择自动填充英文名和描述）</span>}</label>
                  {categoryProducts.length > 0 && !customNameMode ? (
                    <select value={quickFillId} onChange={e => handleQuickFill(e.target.value)} required>
                      <option value="">— 请选择已有商品 —</option>
                      {categoryProducts.map(p => (
                        <option key={`${p.categoryId}:${p.productId}`} value={`${p.categoryId}:${p.productId}`}>
                          {p.name}
                        </option>
                      ))}
                      <option value="__custom__">+ 自定义新名称</option>
                    </select>
                  ) : (
                    <div style={{display:'flex',gap:8}}>
                      <input type="text" value={productForm.name} onChange={e => setProductForm(f => ({...f, name: e.target.value}))} required placeholder="输入新商品名称" style={{flex:1}} />
                      {categoryProducts.length > 0 && (
                        <button type="button" className="prod-action-btn" style={{whiteSpace:'nowrap'}} onClick={() => { setCustomNameMode(false); setQuickFillId('') }}>选择已有</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="product-modal__field">
                  <label>英文名称 {!customNameMode && <span style={{fontSize:12,color:'#999'}}>（自动填充）</span>}</label>
                  <input type="text" value={productForm.nameEn} onChange={e => setProductForm(f => ({...f, nameEn: e.target.value}))} readOnly={customNameMode && categoryProducts.length === 0 ? false : !customNameMode} style={!customNameMode ? {background:'#f5f5f5',color:'#999'} : {}} />
                </div>
              </div>
              <div className="product-modal__field">
                <label>描述 {!customNameMode && <span style={{fontSize:12,color:'#999'}}>（自动填充）</span>}</label>
                <textarea value={productForm.description} onChange={e => setProductForm(f => ({...f, description: e.target.value}))} rows={2} readOnly={!customNameMode} style={!customNameMode ? {background:'#f5f5f5',color:'#999'} : {}} />
              </div>
              <div className="product-modal__field">
                <label>图片URL</label>
                <input type="text" value={productForm.image} onChange={e => setProductForm(f => ({...f, image: e.target.value}))} placeholder="https://..." />
              </div>
              <div className="product-modal__row">
                <div className="product-modal__field">
                  <label>价格</label>
                  <input type="number" value={productForm.price} onChange={e => setProductForm(f => ({...f, price: Number(e.target.value)}))} required />
                </div>
                <div className="product-modal__field">
                  <label>单位</label>
                  <input type="text" value={productForm.unit} onChange={e => setProductForm(f => ({...f, unit: e.target.value}))} style={{width: 80}} />
                </div>
                <div className="product-modal__field">
                  <label>规格</label>
                  <input type="text" value={productForm.capacity} onChange={e => setProductForm(f => ({...f, capacity: e.target.value}))} />
                </div>
              </div>
              <div className="product-modal__row">
                <div className="product-modal__field">
                  <label>标签（热门/推荐）</label>
                  <input type="text" value={productForm.highlight} onChange={e => setProductForm(f => ({...f, highlight: e.target.value}))} placeholder="留空则无标签" />
                </div>
                <div className="product-modal__field">
                  <label>排序权重</label>
                  <input type="number" value={productForm.sortOrder} onChange={e => setProductForm(f => ({...f, sortOrder: Number(e.target.value)}))} />
                </div>
              </div>
              <div className="product-modal__actions">
                <button type="button" onClick={() => setShowProductModal(false)}>取消</button>
                <button type="submit" className="product-modal__submit">{editingProduct ? '保存修改' : '创建商品'}</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
