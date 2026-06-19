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

export default function Admin() {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reservation')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError('获取数据失败')
      }
    } catch {
      setError('网络错误，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  // 统计数据
  const totalCount = data.length
  const destinationStats = data.reduce((acc, item) => {
    acc[item.destination] = (acc[item.destination] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topDestination = Object.entries(destinationStats).sort((a, b) => b[1] - a[1])[0]

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = data.filter(item => item.created_at.slice(0, 10) === today).length

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Verra & Voile · 预约管理</h1>
        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
          {loading ? '加载中...' : '刷新数据'}
        </button>
      </header>

      {error && <div className="admin-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{totalCount}</div>
          <div className="stat-label">总预约数</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{todayCount}</div>
          <div className="stat-label">今日新增</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{Object.keys(destinationStats).length}</div>
          <div className="stat-label">目的地种类</div>
        </div>
        <div className="stat-card">
          <div className="stat-number hot">{topDestination ? topDestination[0].split('·')[0].trim() : '-'}</div>
          <div className="stat-label">最热目的地</div>
        </div>
      </div>

      {/* 目的地分布 */}
      {Object.keys(destinationStats).length > 0 && (
        <div className="admin-section">
          <h2>目的地分布</h2>
          <div className="bar-chart">
            {Object.entries(destinationStats)
              .sort((a, b) => b[1] - a[1])
              .map(([dest, count]) => (
                <div key={dest} className="bar-row">
                  <span className="bar-label">{dest}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${(count / totalCount) * 100}%` }}
                    />
                  </div>
                  <span className="bar-count">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 数据表格 */}
      <div className="admin-section">
        <h2>预约记录 ({totalCount})</h2>
        {data.length === 0 && !loading ? (
          <div className="empty-state">暂无预约记录</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
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
                {data.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td className="cell-name">{item.name}</td>
                    <td>{item.phone}</td>
                    <td>{item.email || '-'}</td>
                    <td className="cell-dest">{item.destination}</td>
                    <td>{item.date}</td>
                    <td className="cell-time">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
