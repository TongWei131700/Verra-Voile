import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import html2canvas from 'html2canvas'

interface MerchantItem {
  id: string
  name: string
  image?: string
  desc?: string
}

interface TierDef {
  label: string
  color: string
  bgColor: string
  emoji: string
  items: MerchantItem[]
}

const TIER_CONFIGS = [
  { key: 'S级', label: 'S 级', color: '#e74c3c', bgColor: '#fde8e8', emoji: '🏆' },
  { key: '第一梯队', label: '第一梯队', color: '#e67e22', bgColor: '#fef3e2', emoji: '✨' },
  { key: '第二梯队', label: '第二梯队', color: '#f1c40f', bgColor: '#fef9e7', emoji: '💎' },
  { key: '第三梯队', label: '第三梯队', color: '#27ae60', bgColor: '#e8f8f0', emoji: '' },
]

export default function XhsTierEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<any>(null)
  const [copyText, setCopyText] = useState('')
  const [tiers, setTiers] = useState<TierDef[]>(TIER_CONFIGS.map(c => ({ ...c, items: [] })))
  const [loading, setLoading] = useState(true)
  const [dragItem, setDragItem] = useState<{ itemId: string; fromTier: number } | null>(null)
  const [dragOverTier, setDragOverTier] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const captureRef = useCallback((node: HTMLDivElement | null) => {
    if (node) (window as any).tierCaptureRef = node
  }, [])

  // 检测 URL 参数 auto-download，自动触发截图
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('auto-download') === 'true' && !downloading && tiers.some(t => t.items.length > 0)) {
      // 等待 DOM 渲染完成后自动截图
      setTimeout(() => {
        handleDownloadImage()
      }, 1500)
    }
  }, [tiers])

  useEffect(() => {
    if (!id) return
    // 从 AI 内容加载文案和商家数据
    fetch(`/api/xhs-mcp/posts/${id}/ai-content`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.copywriting) {
          setCopyText(data.data.copywriting)
          
          // 优先使用后端返回的 merchants 数据（中文名+头像）
          const merchants = data.data.merchants || []
          if (merchants.length > 0) {
            // 将 merchants 按梯队分组
            const groupedTiers: TierDef[] = TIER_CONFIGS.map(c => ({ ...c, items: [] }))
            for (const m of merchants) {
              const tierIdx = (m.tier - 1) >= 0 ? (m.tier - 1) : 0
              groupedTiers[tierIdx].items.push({
                id: `m-${tierIdx}-${groupedTiers[tierIdx].items.length}`,
                name: m.nameCn || m.nameEn, // 优先中文名
                image: m.image,
                desc: '',
              })
            }
            setTiers(groupedTiers)
          } else {
            // 降级：从文案解析
            const parsed = parseTiersFromCopy(data.data.copywriting)
            setTiers(parsed)
            fetchMerchantImages(parsed)
          }
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('加载失败:', err)
        setLoading(false)
      })
  }, [id])

  // 从文案解析梯队
  const parseTiersFromCopy = (text: string): TierDef[] => {
    const result: TierDef[] = TIER_CONFIGS.map(c => ({ ...c, items: [] }))
    const lines = text.split('\n')
    let currentTierIdx = -1
    
    for (const line of lines) {
      const clean = line.replace(/\*+/g, '').trim()
      
      // 检测梯队标题
      if (/(S级|S 级)/.test(clean)) { currentTierIdx = 0; continue }
      if (/第一梯队/.test(clean)) { currentTierIdx = 1; continue }
      if (/第二梯队/.test(clean)) { currentTierIdx = 2; continue }
      if (/第三梯队/.test(clean)) { currentTierIdx = 3; continue }
      
      // 检测商家条目
      if (currentTierIdx >= 0) {
        const circledMatch = clean.match(/^[①③④⑤⑥⑦⑧⑨⑩]\s*(.+)/)
        if (circledMatch) {
          const name = circledMatch[1].trim().replace(/[：:，,。.]+$/, '')
          if (name.length >= 2) {
            result[currentTierIdx].items.push({
              id: `${currentTierIdx}-${result[currentTierIdx].items.length}`,
              name,
              image: undefined,
            })
          }
        }
      }
    }
    
    return result
  }

  // 批量获取商家图片
  const fetchMerchantImages = async (tierDefs: TierDef[]) => {
    try {
      // 提取所有商家名称作为关键词
      const keywords: string[] = []
      tierDefs.forEach(tier => {
        tier.items.forEach(item => {
          // 提取英文关键词
          const enWords = item.name.match(/[A-Za-z][A-Za-z\s&]{2,}/g)
          if (enWords && enWords.length > 0) {
            keywords.push(enWords[0].trim())
          } else if (item.name.length >= 3) {
            keywords.push(item.name.substring(0, Math.min(8, item.name.length)))
          }
        })
      })
      
      if (keywords.length === 0) return
      
      // 批量搜索
      const res = await fetch('/api/xhs-mcp/batch-search-merchants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords }),
      })
      const data = await res.json()
      
      if (data.success && data.results) {
        // 更新每个商家的图片
        const updatedTiers = tierDefs.map(tier => ({
          ...tier,
          items: tier.items.map(item => {
            // 查找匹配的商家
            const enWords = item.name.match(/[A-Za-z][A-Za-z\s&]{2,}/g)
            const keyword = enWords && enWords.length > 0 ? enWords[0].trim() : item.name.substring(0, 6)
            
            let best: any = null
            for (const [kw, results] of Object.entries(data.results)) {
              if (kw.includes(keyword) || keyword.includes(kw)) {
                const photographers = (results as any).photographers || []
                if (photographers.length > 0) {
                  best = photographers[0]
                  break
                }
              }
            }
            
            if (best) {
              // 优先用 firstPhoto（作品集第一张），其次 image（headshot/cover）
              const photo = best.firstPhoto || best.image
              if (photo) return { ...item, image: photo }
            }
            
            return item
          }),
        }))
        
        setTiers(updatedTiers)
      }
    } catch (err) {
      console.error('获取商家图片失败:', err)
    }
  }

  const handleDragStart = (itemId: string, fromTier: number) => {
    setDragItem({ itemId, fromTier })
  }
  
  const handleDragOver = (e: React.DragEvent, tierIdx: number) => {
    e.preventDefault()
    setDragOverTier(tierIdx)
  }
  
  const handleDrop = (toTier: number) => {
    if (!dragItem) return
    const { itemId, fromTier } = dragItem
    if (fromTier === toTier) return
    
    const movingItem = tiers[fromTier].items.find(i => i.id === itemId)
    if (!movingItem) return
    
    setTiers(prev => {
      const next = prev.map(t => ({ ...t, items: [...t.items] }))
      next[fromTier].items = next[fromTier].items.filter(i => i.id !== itemId)
      next[toTier].items.push(movingItem)
      return next
    })
    setDragItem(null)
    setDragOverTier(null)
  }
  
  const handleDragEnd = () => { setDragItem(null); setDragOverTier(null) }

  // 下载为图片并保存为配图封面
  const handleDownloadImage = async () => {
    if (!(window as any).tierCaptureRef || downloading) return
    setDownloading(true)
    try {
      const canvas = await html2canvas((window as any).tierCaptureRef, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f5f5f5',
      })
      
      // 转换为 Blob 并上传到后端
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png')
      })
      
      // 上传到后端
      const formData = new FormData()
      formData.append('image', blob, `tier-list-${post?.title || 'ranking'}.png`)
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!uploadRes.ok) throw new Error('上传失败')
      
      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.data?.url || uploadData.url || uploadData.path
      
      // 保存为帖子的配图（第一张作为封面）
      const contentRes = await fetch(`/api/xhs-mcp/posts/${id}/ai-content`, {
        method: 'GET',
      })
      const contentData = await contentRes.json()
      const existingImages = contentData.success && contentData.data?.selectedImages ? contentData.data.selectedImages : []
      
      // 将新图片插入到最前面（作为封面）
      const updatedImages = [imageUrl, ...existingImages]
      
      await fetch(`/api/xhs-mcp/posts/${id}/ai-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copywriting: contentData.data?.copywriting || '',
          comment: contentData.data?.comment || '',
          selectedImages: updatedImages,
        }),
      })
      
      alert(`✅ 梯队图已保存为帖子封面！\n\n图片路径：${imageUrl}`)
    } catch (err) {
      console.error('截图或上传失败:', err)
      alert('截图或上传失败，请重试')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <p style={{ fontSize: 16, color: '#999' }}>加载中...</p>
      </div>
    )
  }

  const totalMerchants = tiers.reduce((sum, t) => sum + t.items.length, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 30%, #f5f5f5 30%)', padding: '0 0 40px' }}>
      {/* 顶部作者信息 */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13,
          }}>← 返回</button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}> 针对这个问题的排行榜</span>
          
          {/* 下载按钮 */}
          <button
            onClick={handleDownloadImage}
            disabled={downloading || totalMerchants === 0}
            style={{
              marginLeft: 'auto',
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: downloading ? '#999' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              cursor: downloading || totalMerchants === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(102,126,234,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {downloading ? '⏳ 生成中...' : '📥 下载为图片'}
          </button>
        </div>
        {post && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px', borderRadius: 14,
            background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
          }}>
            {post.avatarUrl ? (
              <img src={post.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18, fontWeight: 'bold',
              }}>{(post.author || '?').charAt(0)}</div>
            )}
            <div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>@{post.author || '未知'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{post.title || '(无标题)'}</div>
            </div>
          </div>
        )}
      </div>

      {/* 梯队区域 - 可截图 */}
      <div ref={captureRef} style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px' }}>
        {totalMerchants === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: '#fff', borderRadius: 14,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <p style={{ fontSize: 15, color: '#999' }}>暂未从文案中提取到商家</p>
            <p style={{ fontSize: 13, color: '#bbb', marginTop: 8 }}>请先生成 AI 文案，再进入此页面</p>
          </div>
        )}

        {tiers.map((tier, tierIdx) => {
          if (tier.items.length === 0) return null
          return (
            <div
              key={tier.label}
              onDragOver={(e) => handleDragOver(e, tierIdx)}
              onDrop={() => handleDrop(tierIdx)}
              style={{
                marginBottom: 24, borderRadius: 20, overflow: 'hidden',
                background: `linear-gradient(135deg, ${tier.bgColor} 0%, #fff 100%)`,
                boxShadow: dragOverTier === tierIdx ? `0 8px 32px ${tier.color}44` : '0 4px 20px rgba(0,0,0,0.08)',
                border: dragOverTier === tierIdx ? `3px solid ${tier.color}` : 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: dragOverTier === tierIdx ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {/* 梯队标题栏 - 大标签 */}
              <div style={{
                background: `linear-gradient(90deg, ${tier.color}, ${tier.color}dd)`,
                padding: '16px 24px',
                display: 'flex', alignItems: 'center', gap: 12,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 装饰性背景图案 */}
                <div style={{
                  position: 'absolute', right: -20, top: -20,
                  width: 100, height: 100, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                }} />
                
                <span style={{ fontSize: 28 }}>{tier.emoji}</span>
                <div>
                  <div style={{ 
                    fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}>{tier.label}</div>
                  <div style={{ 
                    fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2,
                  }}>共 {tier.items.length} 位推荐</div>
                </div>
                
                <div style={{
                  marginLeft: 'auto',
                  padding: '6px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  backdropFilter: 'blur(10px)',
                }}>TIER {tierIdx + 1}</div>
              </div>

              {/* 商家卡片列表 */}
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {tier.items.map((item, itemIdx) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id, tierIdx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 14,
                      background: '#fff',
                      cursor: 'grab', 
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: dragItem?.itemId === item.id ? 0.4 : 1,
                      border: '2px solid transparent',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateY(-4px) scale(1.02)'
                      el.style.boxShadow = `0 8px 24px ${tier.color}33`
                      el.style.borderColor = `${tier.color}44`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = ''
                      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                      el.style.borderColor = 'transparent'
                    }}
                  >
                    {/* 排名编号 - 徽章样式 */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${tier.color}, ${tier.color}dd)`,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900, flexShrink: 0,
                      boxShadow: `0 2px 8px ${tier.color}44`,
                      border: '2px solid rgba(255,255,255,0.8)',
                    }}>{itemIdx + 1}</div>

                    {/* 商家头像 - 更大更突出 */}
                    {item.image ? (
                      <img src={item.image} alt="" style={{
                        width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                        border: `3px solid ${tier.color}`,
                        boxShadow: `0 4px 12px ${tier.color}33`,
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                      }} />
                    ) : (
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${tier.color}33, ${tier.color}11)`,
                        border: `3px solid ${tier.color}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: tier.color, fontWeight: 'bold', flexShrink: 0,
                      }}>{item.name.charAt(0)}</div>
                    )}

                    {/* 商家名称 - 更醒目 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 15, fontWeight: 800, color: '#1a1a1a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: 1.3,
                      }}>{item.name}</div>
                    </div>

                    {/* 拖拽把手 - 更精致 */}
                    <div style={{ 
                      color: tier.color, fontSize: 20, flexShrink: 0, cursor: 'grab',
                      opacity: 0.4, transition: 'opacity 0.2s',
                    }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                       onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.4'}>⠿</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div style={{ height: 30 }} />
      </div>
    </div>
  )
}
