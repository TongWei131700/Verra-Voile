import { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

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
  imageContent?: string
  images?: { url: string; width: number; height: number }[]
}

interface TagConfig {
  name: string
  custom?: boolean
}

/* ── 常量 ──────────────────────────────────────────────── */
const DEFAULT_TAGS: TagConfig[] = [
  { name: '欧洲婚礼' },
  { name: '意大利婚礼' },
  { name: '目的地婚礼' },
  { name: '法国婚礼' },
  { name: '冰岛婚礼' },
]

const TIME_OPTIONS = [
  { label: '一天内', value: '一天内' },
  { label: '一周内', value: '一周内' },
  { label: '半年内', value: '半年内' },
  { label: '不限', value: '不限' },
]

export const INITIAL_POSTS: XhsPost[] = [
  { index: 1, title: '🇮🇸冰岛旅行结婚｜在世界尽头的婚礼', author: '莱斯利', likes: '109', collects: '35', comments: '10', shares: '0', id: '6ac639630000000018007886', token: 'ABigqD8DDLiIa7ujFGdDc1ZJ-hY2zdzV_-l8gwELj5k8Q=', url: 'https://www.xiaohongshu.com/explore/6ac639630000000018007886?xsec_token=ABigqD8DDLiIa7ujFGdDc1ZJ-hY2zdzV_-l8gwELj5k8Q=' },
  { index: 2, title: '国庆旅游，顺便结个婚 🥹冰岛🇮🇸', author: '白1989.', likes: '7', collects: '3', comments: '2', shares: '0', id: '6ac99350000000001c02eb97', token: 'ABkN7ADd-n0hWg-QWhO1M5iH_m-utVHQ4vdLvKRU3hOn4=', url: 'https://www.xiaohongshu.com/explore/6ac99350000000001c02eb97?xsec_token=ABkN7ADd-n0hWg-QWhO1M5iH_m-utVHQ4vdLvKRU3hOn4=' },
  { index: 3, title: '我看伦敦未必有冰岛忧郁', author: '辩日记', likes: '5', collects: '1', comments: '3', shares: '0', id: '6ac958000000000014038795', token: 'ABkN7ADd-n0hWg-QWhO1M5iNU0bODwGdTP59F4_kFJ180=', url: 'https://www.xiaohongshu.com/explore/6ac958000000000014038795?xsec_token=ABkN7ADd-n0hWg-QWhO1M5iNU0bODwGdTP59F4_kFJ180=' },
  { index: 4, title: '要不要尝试在冰岛把誓言写下来？🇮🇸', author: 'StudioMann.', likes: '3', collects: '1', comments: '3', shares: '0', id: '6ac8f7df000000001303fefc', token: 'ABdCJmt43cSrL900-vZGGES7iMXrnCeLXsUyP0MsZpv8Y=', url: 'https://www.xiaohongshu.com/explore/6ac8f7df000000001303fefc?xsec_token=ABdCJmt43cSrL900-vZGGES7iMXrnCeLXsUyP0MsZpv8Y=' },
  { index: 5, title: '奔赴冰岛，举行一场纯粹的教堂婚礼💒', author: 'Ice-memory冰岛婚礼&婚纱照', likes: '6', collects: '0', comments: '0', shares: '0', id: '6ac3bf6100000000120379e2', token: 'AB-zPuohPP8waD5MbQB0HoIJIHtnj_9Z6ksxWojugjDc0=', url: 'https://www.xiaohongshu.com/explore/6ac3bf6100000000120379e2?xsec_token=AB-zPuohPP8waD5MbQB0HoIJIHtnj_9Z6ksxWojugjDc0=' },
  { index: 6, title: 'Vik 红顶教堂 彩绘的玻璃窗', author: '任蝶', likes: '2', collects: '0', comments: '2', shares: '0', id: '6ac8d49c000000001a0290af', token: 'ABdCJmt43cSrL900-vZGGES5jYXR0-0hnI2GLnS86p81o=', url: 'https://www.xiaohongshu.com/explore/6ac8d49c000000001a0290af?xsec_token=ABdCJmt43cSrL900-vZGGES5jYXR0-0hnI2GLnS86p81o=' },
  { index: 7, title: '自己备花、自己见证｜冰岛最纯粹的婚礼', author: '中义不拍综艺', likes: '4', collects: '1', comments: '0', shares: '0', id: '6ac837990000000018017a0f', token: 'ABdCJmt43cSrL900-vZGGESxHiz_UI1EoKn8FzdB0JA64=', url: 'https://www.xiaohongshu.com/explore/6ac837990000000018017a0f?xsec_token=ABdCJmt43cSrL900-vZGGESxHiz_UI1EoKn8FzdB0JA64=' },
  { index: 8, title: '听劝！不出片都难唉！ 🇮🇸冰岛', author: '白1989.', likes: '12', collects: '0', comments: '3', shares: '0', id: '6ac81787000000001a031d49', token: 'ABdCJmt43cSrL900-vZGGESyxzP8034w-a2TOEXBt4kdE=', url: 'https://www.xiaohongshu.com/explore/6ac81787000000001a031d49?xsec_token=ABdCJmt43cSrL900-vZGGESyxzP8034w-a2TOEXBt4kdE=' },
  { index: 9, title: '冰岛婚礼，到世界尽头办场婚礼愿望达成', author: 'kiki暖心策划', likes: '21', collects: '3', comments: '12', shares: '0', id: '6ac7b3e20000000002010367', token: 'ABhBaZSZ8HJJ9lx1XEI1C6x2UBJHXMmnKIHzRsrqpnJgs=', url: 'https://www.xiaohongshu.com/explore/6ac7b3e20000000002010367?xsec_token=ABhBaZSZ8HJJ9lx1XEI1C6x2UBJHXMmnKIHzRsrqpnJgs=' },
  { index: 10, title: '终于在冰岛大教堂举行了婚礼', author: 'Ice-memory冰岛婚礼&婚纱照', likes: '5', collects: '1', comments: '0', shares: '0', id: '6ac79527000000001a0201e8', token: 'ABhBaZSZ8HJJ9lx1XEI1C6x1zD0SHIIE4ejfJih_3tt9w=', url: 'https://www.xiaohongshu.com/explore/6ac79527000000001a0201e8?xsec_token=ABhBaZSZ8HJJ9lx1XEI1C6x1zD0SHIIE4ejfJih_3tt9w=' },
  { index: 11, title: '🇲🇾JB备婚ING｜婚宴 vs 冰岛＋瑞士 🇮🇸🇨🇭', author: '小红帽坐飞机', likes: '75', collects: '24', comments: '66', shares: '0', id: '6ac77fd6000000001901e0e0', token: 'ABhBaZSZ8HJJ9lx1XEI1C6x8baeZSpEr6sOHVVIIUElBU=', url: 'https://www.xiaohongshu.com/explore/6ac77fd6000000001901e0e0?xsec_token=ABhBaZSZ8HJJ9lx1XEI1C6x8baeZSpEr6sOHVVIIUElBU=' },
  { index: 12, title: '想去冰岛拍婚纱，有人少一点的景点吗', author: '来杯地铁', likes: '5', collects: '2', comments: '4', shares: '0', id: '6ac913c20000000018039862', token: 'ABkN7ADd-n0hWg-QWhO1M5iA7dAFSL904Jhq9krRAZrhA=', url: 'https://www.xiaohongshu.com/explore/6ac913c20000000018039862?xsec_token=ABkN7ADd-n0hWg-QWhO1M5iA7dAFSL904Jhq9krRAZrhA=' },
  { index: 13, title: '婚礼花絮｜如果冰岛是一块大蛋糕', author: '啤酒座的丸子婚礼策划', likes: '13', collects: '5', comments: '3', shares: '0', id: '6ac7a6630000000015013f81', token: 'ABhBaZSZ8HJJ9lx1XEI1C6x57_-Rudyu6_bydx3qXdQuI=', url: 'https://www.xiaohongshu.com/explore/6ac7a6630000000015013f81?xsec_token=ABhBaZSZ8HJJ9lx1XEI1C6x57_-Rudyu6_bydx3qXdQuI=' },
  { index: 14, title: '冰岛求婚成功！还收到了彩虹的祝福！', author: '八萬Hachi', likes: '14', collects: '0', comments: '2', shares: '0', id: '6ac74f6d000000001402d25f', token: 'ABhBaZSZ8HJJ9lx1XEI1C6xzP-futhMgmZ9DHOdCT_r_c=', url: 'https://www.xiaohongshu.com/explore/6ac74f6d000000001402d25f?xsec_token=ABhBaZSZ8HJJ9lx1XEI1C6xzP-futhMgmZ9DHOdCT_r_c=' },
  { index: 15, title: '今日礼成', author: 'GEO-MHT', likes: '88', collects: '3', comments: '41', shares: '0', id: '6ac519340000000014039011', token: 'ABb609-ziSHaKGjzQwhQCrPUQlMVK0x0xkCeh9JsbvAh8=', url: 'https://www.xiaohongshu.com/explore/6ac519340000000014039011?xsec_token=ABb609-ziSHaKGjzQwhQCrPUQlMVK0x0xkCeh9JsbvAh8=' },
  { index: 16, title: '感\u202e十谢\u202c月', author: '无聊就买早餐', likes: '2', collects: '0', comments: '0', shares: '0', id: '6ac25b5f000000001a029537', token: 'ABKJJn_xOkqbux_i3mH1dCgkIQA___1kty-e2yCZIJiPU=', url: 'https://www.xiaohongshu.com/explore/6ac25b5f000000001a029537?xsec_token=ABKJJn_xOkqbux_i3mH1dCgkIQA___1kty-e2yCZIJiPU=' },
  { index: 17, title: '我要去参加橹穆的婚礼了', author: '豚馒许愿屋', likes: '108', collects: '1', comments: '76', shares: '0', id: '6ac2586d000000001b02e7b7', token: 'ABKJJn_xOkqbux_i3mH1dCgjU6uh2NXMubzvwrioZ-BkY=', url: 'https://www.xiaohongshu.com/explore/6ac2586d000000001b02e7b7?xsec_token=ABKJJn_xOkqbux_i3mH1dCgjU6uh2NXMubzvwrioZ-BkY=' },
  { index: 18, title: '(无标题)', author: '田夏哇倒立', likes: '7', collects: '2', comments: '1', shares: '0', id: '6ac250d4000000001203e382', token: 'ABKJJn_xOkqbux_i3mH1dCgkd5CaJggyrp09OC-QuPU8o=', url: 'https://www.xiaohongshu.com/explore/6ac250d4000000001203e382?xsec_token=ABKJJn_xOkqbux_i3mH1dCgkd5CaJggyrp09OC-QuPU8o=' },
  { index: 19, title: '好喜欢！在冰岛拍到了人生婚纱照💍（ccd版）', author: 'QueenQueen来了', likes: '168', collects: '13', comments: '19', shares: '0', id: '6ac11a76000000000a01c870', token: 'ABW-EX_eYjn1tzylVLmkyjwaPEjNjUFRRPsfB9RdAT2Qs=', url: 'https://www.xiaohongshu.com/explore/6ac11a76000000000a01c870?xsec_token=ABW-EX_eYjn1tzylVLmkyjwaPEjNjUFRRPsfB9RdAT2Qs=' },
  { index: 20, title: '想找冰岛婚纱摄影师～有没有推荐的呀～一月中旬刚好去冰岛想找一天去拍照～我需要有服装和装饰', author: '小红书用户', likes: '0', collects: '0', comments: '0', shares: '0', id: 'xhs-iceland-photo-jan', token: '', url: '', imageContent: '想找冰岛婚纱摄影师～有没有推荐的呀～一月中旬刚好去冰岛想找一天去拍照～我需要有服装和装饰' },
]

/* ── MCP API 调用 ──────────────────────────────────────── */
async function mcpCall(tool: string, args: Record<string, unknown>) {
  const res = await fetch('/xhs-mcp/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id: 1,
    }),
  })
  const data = await res.json()
  const text = data?.result?.content?.[0]?.text
  return text ? JSON.parse(text) : null
}

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
  const [tags, setTags] = useState<TagConfig[]>(() => {
    try {
      const saved = localStorage.getItem('xhs-tags')
      return saved ? JSON.parse(saved) : DEFAULT_TAGS
    } catch { return DEFAULT_TAGS }
  })
  const [activeTag, setActiveTag] = useState(0)
  const [timePeriod, setTimePeriod] = useState('一周内')
  const [searching, setSearching] = useState(false)
  const [lastSearch, setLastSearch] = useState('2026-10-09')
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  const [extracting, setExtracting] = useState<Set<number>>(new Set())
  const [newTag, setNewTag] = useState('')
  const [showAddTag, setShowAddTag] = useState(false)

  /* 持久化标签 */
  useEffect(() => {
    localStorage.setItem('xhs-tags', JSON.stringify(tags))
  }, [tags])

  /* 搜索 */
  const handleSearch = useCallback(async () => {
    setSearching(true)
    try {
      const result = await mcpCall('search_feeds', {
        keyword: tags[activeTag].name,
        filters: { publish_time: timePeriod },
      })
      if (result?.feeds?.length) {
        const mapped: XhsPost[] = result.feeds.map((f: any, i: number) => {
          const nc = f.noteCard || f
          const info = nc.interactInfo || {}
          return {
            index: i + 1,
            title: nc.displayTitle || nc.title || '(无标题)',
            author: nc.user?.nickname || '',
            likes: info.likedCount || '0',
            collects: info.collectedCount || '0',
            comments: info.commentCount || '0',
            shares: info.shareCount || '0',
            id: f.feed_id || nc.noteId || '',
            token: nc.xsecToken || '',
            url: f.feed_id
              ? `https://www.xiaohongshu.com/explore/${f.feed_id}?xsec_token=${nc.xsecToken || ''}`
              : '',
          }
        })
        setPosts(mapped)
        setExpandedPost(null)
        setLastSearch(new Date().toLocaleDateString('zh-CN'))
      }
    } catch (e) {
      console.error('搜索失败:', e)
    } finally {
      setSearching(false)
    }
  }, [tags, activeTag, timePeriod])

  /* 提取图片内容 */
  const handleExtract = useCallback(async (post: XhsPost) => {
    if (extracting.has(post.index)) return
    setExtracting(prev => new Set(prev).add(post.index))
    try {
      const detail = await mcpCall('get_feed_detail', {
        feed_id: post.id,
        xsec_token: post.token,
      })
      const note = detail?.data?.note
      const imgs = note?.imageList?.map((img: any) => ({
        url: img.urlDefault || img.urlPre || '',
        width: img.width || 0,
        height: img.height || 0,
      })) || []
      setPosts(prev => prev.map(p =>
        p.index === post.index ? { ...p, images: imgs } : p
      ))
    } catch (e) {
      console.error('提取失败:', e)
    } finally {
      setExtracting(prev => { const n = new Set(prev); n.delete(post.index); return n })
    }
  }, [extracting])

  /* 保存图片文字 */
  const handleSaveContent = useCallback((idx: number, content: string) => {
    setPosts(prev => prev.map(p =>
      p.index === idx ? { ...p, imageContent: content } : p
    ))
  }, [])

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

  /* 高价值帖子判定 */
  const INQUIRY_KW = ['求推荐', '推荐一下', '寻找', '有没有', '求助', '求姐妹', '能接', '来聊', '预算', '多少钱']
  const isHighValue = (p: XhsPost) =>
    !!p.imageContent || !p.title || p.title === '(无标题)' ||
    INQUIRY_KW.some(kw => p.title.includes(kw))
  const highValuePosts = posts.filter(isHighValue)

  /* 总互动数 */
  const totalEngagement = posts.reduce((sum, p) =>
    sum + parseInt(p.likes || '0') + parseInt(p.collects || '0')
    + parseInt(p.comments || '0') + parseInt(p.shares || '0'), 0)

  /* ── 渲染 ──────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 32, paddingBottom: 80 }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>

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
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.3 }}>
                精准获客Agent
              </h1>
              <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                社交平台监控 · 询盘挖掘 · 智能应答
              </p>
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

        {/* ── 时间筛选 + 搜索 ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '14px 20px',
          marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {TIME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTimePeriod(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  background: timePeriod === opt.value ? '#1a1a1a' : '#f5f5f7',
                  color: timePeriod === opt.value ? '#fff' : '#666',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              padding: '8px 24px', borderRadius: 20, border: 'none',
              background: searching
                ? '#ccc'
                : 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: searching ? 'wait' : 'pointer',
              transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {searching ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                搜索中...
              </>
            ) : '搜索'}
          </button>
        </div>

        {/* ── 统计栏 ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '0 4px',
        }}>
          <div style={{ fontSize: 13, color: '#999' }}>
            <span style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 18 }}>{posts.length}</span>
            <span style={{ margin: '0 4px' }}>条结果</span>
            <span style={{ color: '#ddd' }}>|</span>
            <span style={{ margin: '0 4px' }}>总互动</span>
            <span style={{ fontWeight: 600, color: '#ff2442', fontSize: 15 }}>{totalEngagement.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 12, color: '#bbb' }}>
            更新于 {lastSearch}
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
                  onClick={() => post.id && navigate(`/xhs-research/${post.id}`)}
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

        {/* ── 帖子列表 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {posts.map((post) => {
            const isExpanded = expandedPost === post.index
            const isExtracting = extracting.has(post.index)
            const hasImages = post.images && post.images.length > 0
            const isHighValuePost = isHighValue(post)

            return (
              <div
                key={post.id || post.index}
                onClick={() => post.id && navigate(`/xhs-research/${post.id}`)}
                style={{
                  background: '#fff', borderRadius: 14, overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  border: isHighValuePost ? '1px solid rgba(255,36,66,0.15)' : '1px solid rgba(0,0,0,0.04)',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
              >
                {/* 卡片主体 */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* 序号 */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, marginTop: 2,
                      background: post.index <= 3
                        ? 'linear-gradient(135deg, #ff2442, #ff6b81)'
                        : isHighValuePost ? '#fff0f3' : '#f5f5f7',
                      color: post.index <= 3 ? '#fff' : isHighValuePost ? '#ff2442' : '#999',
                    }}>
                      {post.index}
                    </div>

                    {/* 内容 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 标题行 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        {isHighValuePost && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, color: '#ff2442',
                            background: '#fff0f3', padding: '2px 6px', borderRadius: 4,
                            flexShrink: 0,
                          }}>
                            询盘
                          </span>
                        )}
                        <h2 style={{
                          fontSize: 15, fontWeight: 600, color: '#1a1a1a',
                          margin: 0, lineHeight: 1.4, flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {post.title}
                        </h2>
                      </div>

                      {/* 作者 */}
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                        @{post.author}
                      </div>

                      {/* 已有的图片文字内容 */}
                      {post.imageContent && (
                        <div style={{
                          padding: '10px 14px', marginBottom: 10,
                          background: 'linear-gradient(135deg, #fff5f5 0%, #fff0f6 100%)',
                          borderRadius: 10, borderLeft: '3px solid #ff2442',
                          fontSize: 13, color: '#333', lineHeight: 1.7,
                        }}>
                          <div style={{
                            fontSize: 10, color: '#ff2442', fontWeight: 600,
                            marginBottom: 4, letterSpacing: 1,
                          }}>
                            图片文字内容
                          </div>
                          {post.imageContent}
                        </div>
                      )}

                      {/* 互动数据 */}
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#bbb' }}>
                        <span>❤ {post.likes}</span>
                        <span>⭐ {post.collects}</span>
                        <span>💬 {post.comments}</span>
                        <span>↗ {post.shares}</span>
                      </div>
                    </div>

                    {/* 右侧操作区 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {/* 提取图片按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isExpanded) { setExpandedPost(null) }
                          else { setExpandedPost(post.index); handleExtract(post) }
                        }}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11,
                          border: '1px solid #eee', background: isExpanded ? '#fff0f3' : '#fafafa',
                          color: isExpanded ? '#ff2442' : '#999',
                          cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                        }}
                      >
                        {isExtracting ? '提取中...' : isExpanded ? '收起' : '提取图片'}
                      </button>
                      {/* 原帖链接 */}
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11,
                          border: '1px solid #eee', background: '#fafafa',
                          color: '#999', textDecoration: 'none',
                          textAlign: 'center', transition: 'all 0.2s',
                        }}
                      >
                        原帖 ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* 展开区域：图片 + 文字提取 */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid #f0f0f0',
                    padding: '16px 20px',
                    background: '#fafbfc',
                  }}>
                    {/* 图片缩略图 */}
                    {hasImages ? (
                      <div style={{
                        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12,
                      }}>
                        {post.images!.map((img, i) => (
                          <a
                            key={i}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              width: 100, height: 100, borderRadius: 8,
                              overflow: 'hidden', flexShrink: 0,
                              border: '1px solid #eee',
                            }}
                          >
                            <img
                              src={img.url}
                              alt={`图${i + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </a>
                        ))}
                        <div style={{
                          fontSize: 11, color: '#bbb', alignSelf: 'center',
                          paddingLeft: 4,
                        }}>
                          共 {post.images!.length} 张图 · 点击查看原图
                        </div>
                      </div>
                    ) : isExtracting ? (
                      <div style={{
                        padding: '20px 0', textAlign: 'center',
                        fontSize: 13, color: '#bbb',
                      }}>
                        <span style={{
                          display: 'inline-block', width: 18, height: 18,
                          border: '2px solid #eee', borderTopColor: '#ff2442',
                          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                          marginBottom: 8,
                        }} />
                        <br />正在获取帖子图片...
                      </div>
                    ) : (
                      <div style={{ padding: '12px 0', fontSize: 13, color: '#ccc' }}>
                        暂无图片数据
                      </div>
                    )}

                    {/* 文字提取输入区 */}
                    <div>
                      <div style={{
                        fontSize: 11, color: '#999', marginBottom: 6, fontWeight: 500,
                      }}>
                        图片文字提取（查看图片后手动输入或粘贴）
                      </div>
                      <textarea
                        defaultValue={post.imageContent || ''}
                        onBlur={e => handleSaveContent(post.index, e.target.value)}
                        placeholder="识别图片中的文字内容，粘贴或输入到此处..."
                        style={{
                          width: '100%', minHeight: 60, padding: '10px 12px',
                          borderRadius: 10, border: '1px solid #e8e8e8',
                          fontSize: 13, lineHeight: 1.6, resize: 'vertical',
                          outline: 'none', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#ff2442'}
                        onBlurCapture={e => (e.target as HTMLTextAreaElement).style.borderColor = '#e8e8e8'}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

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
  )
}
