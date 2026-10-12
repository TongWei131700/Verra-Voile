import { useState, useEffect, useLayoutEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { INITIAL_POSTS } from './XhsResearch'
import html2canvas from 'html2canvas'

/* ── 静态 Agent 生成数据（示例） ── */
const AGENT_DATA: Record<string, {
  title?: string
  copy: string
  images: string[]
  comment: string
}> = {
  '6ac889000000000014038087': {
    copy: `姐妹你的需求我太懂了！去年帮朋友策划过类似的2人托斯卡纳婚礼，说几个关键建议：

1 场地一定要选含住宿的庄园，仪式住宿不分开跑。贝拉里亚和马亚诺都可以住里面

2 4月比5月人少很多，紫藤刚好开，场地费能便宜20%左右

3 摄影师找当地驻场的，纪实风格比摆拍好看一百倍，差旅也省了

4 仪式别搞花拱！在葡萄藤下面或者橡树下面站一站就很有感觉

5 预算2人婚礼€1万以内完全可以搞定，别被那些动辄€5万的套餐吓到

我整理了一份托斯卡纳2人婚礼的场地对比和预算明细，有具体日期的话可以帮你看看哪个最合适`,
    images: [
      '/uploads/crawled/villa-valentini-bonaparte/vvb-000.jpg',
      '/uploads/crawled/medici-villa/mv-000.jpg',
      '/uploads/crawled/villa-di-striano/vds-000.jpg',
      '/uploads/crawled/villa-di-maiano/vdm-000.jpg',
      '/uploads/crawled/villa-bellaria/vb-000.jpg',
      '/uploads/crawled/florajet/products/coccinelle-1.jpg',
    ],
    comment: `姐妹我刚帮朋友做过类似的！几个关键建议：
1 选含住宿的庄园，仪式住宿不分开跑
2 4月比5月人少，紫藤刚好开，场地费便宜20%
3 摄影师找当地驻场的，纪实风比摆拍好看太多
4 别搞花拱，葡萄藤或橡树下站一站就很出片
5 2人婚礼€1万内完全可以搞定
我整理了一份托斯卡纳场地对比和预算明细，有日期可以帮你看看`,
  },
  '6ac913c20000000018039862': {
    copy: `冰岛婚拍选址方案，按「人少 + 出片 + 交通可达」三个维度筛选：

① 斯奈山半岛 Snæfellsnes
教堂山 Kirkjufell 是冰岛最具辨识度的地标，非旺季几乎无游客。斯奈山冰川 Snæfellsjökull 可做背景，黑沙滩 + 草帽山一条线拍齐。从雷克雅未克车程 2h，建议安排一整天。

② 北部阿库雷里 Akureyri
众神瀑布 Goðafoss + 米湖 Mývatn 区域，远离南部热门线路，游客量极少。阿库雷里本身有航班直达，不必走南部环岛。适合 2-3 天深度拍摄。

③ 高地兰德曼纳劳卡 Landmannalaugar
彩色流纹岩山脉 + 黑曜石沙漠，地貌外星球感。需四驱车进入，仅 6-8 月开放，其他时间封路。适合追求极致小众风格的拍摄。

④ 冰河湖 Jökulsárlón + 钻石沙滩
冰川入海形成的泻湖，漂浮着蓝色冰块。钻石沙滩上冰块散落黑沙中，构图极强。建议日出或日落时段拍摄，光线最佳。

⑤ 斯科加瀑布 Skógafoss + 塞里雅兰瀑布 Seljalandsfoss
南岸两大瀑布，斯科加气势磅礴可走到顶部，塞里雅兰可以走到瀑布后方。南岸常规线游客较多，建议工作日清晨到达。

⑥ 雷尼斯黑沙滩 Reynisfjara
玄武岩柱 + 黑色海滩 + 大西洋海浪，暗调风格出片极佳。风大浪急需注意安全，不适合长时间停留。

时间建议：6 月中至 9 月初，几乎极昼光线充足，气温 10-15°C 体感舒适。避开 7 月旺季，6 月底和 8 月底性价比最高。

摄影师建议选冰岛本地团队，省去国际差旅费。风格推荐纪实 + 风光结合，利用自然光 + 恶劣天气营造氛围感。

（以上参考了欧婚纪的冰岛选址攻略，整理得比较全）`,
    images: [
      '/uploads/crawled/travel-attractions/kirkjufell.jpg',
      '/uploads/crawled/travel-attractions/jokulsarlon.jpg',
      '/uploads/crawled/travel-attractions/landmannalaugar.jpg',
      '/uploads/crawled/travel-attractions/reynisfjara.jpg',
      '/uploads/crawled/travel-attractions/akureyri.jpg',
      '/uploads/crawled/travel-attractions/snæfellsjokull.jpg',
    ],
    comment: `我也研究了好久冰岛婚拍！怕人多的话千万别走黄金圈+南岸常规线，游客多到崩溃
斯奈山半岛教堂山那边非旺季几乎没人，冰川+黑沙滩一条线拍齐
北部阿库雷里+众神瀑布+米湖更小众，游客少90%
高地兰德曼纳劳卡彩色山脉绝美但要四驱车，仅6-8月能进
时间选6月中或8月底，极昼光线好+性价比最高
我之前翻欧婚纪的选址对比整理了一份表格，要的姐妹可以分享给你~`,
  },
  'xhs-iceland-photo-jan': {
    title: '1月冰岛婚纱照｜摄影师推荐',
    copy: `1月冰岛婚纱照｜4位真实驻场摄影师推荐+服装攻略
以下内容部分参考自【欧婚纪】冰岛摄影师数据库，整理出4位靠谱的，风格价位都不一样，按需选：

① Kristín María · 光影诗人
风格：自然光·艺术情感·永恒经典
特色：科班出身，擅长利用冰岛变幻的天空和光线，拍出安静高级的感觉。适合喜欢文艺风、不想太套路的情侣

② McWhirter Elopements · 冒险大片
风格：私奔婚礼·电影感·史诗地貌
特色：Lisa团队拍过250+对新人，专攻黑沙滩、冰川等极端地貌，风格原始有叙事感，对各类文化都很包容

③ Zakas Photography · 一站式策划
风格：冒险定制·童话魔幻
特色：摄影师Steph同时是婚礼策划师，20年镜头经验，不只拍照还能帮你规划整趟冰岛行程，不想自己操心路线的首选

④ Styrmir Kári & Heiðdís · 双人团队
风格：壮丽景观·双视角
特色：双人摄影师组合同时两个角度捕捉，覆盖面更广，对冰川地貌理解极深

👗 服装推荐（冰岛冬季旅拍款）

① A字裙 / 鱼尾裙 · 首选
简洁线条不拖沓，雪地行走方便，A字裙摆风吹起来很出片。避免大拖尾，雪地拖不动还容易脏。

② 白色皮草披肩 / 斗篷 · 必备
保暖神器，拍摄时披着特别有氛围感。冰岛1月气温 -5°C~5°C，没它扛不住。

③ 干花花束 · 比鲜花实用
冰岛低温下鲜花半小时就冻蔫，干花耐寒又复古，和冰岛荒原风格绝配。

④ 道具加分项
复古手提灯、透明雨伞、羊毛毡帽子都是出片利器。多数摄影师有合作道具包，咨询时直接问“Do you provide or help source wedding attire and props?”

❄️ 1月提醒：日照仅5h，电池多备，运气好能加拍极光`,
    images: [
      '/uploads/crawled/photographers/mcwhirter-elopements/00.jpg',
      '/uploads/crawled/dresses/wona-aphrodite/images/00.jpg',
      '/uploads/crawled/dresses/wona-alaska/images/00.jpg',
      '/uploads/crawled/photographers/kristin-maria/00.jpg',
      '/uploads/crawled/photographers/zakas-photography/00.jpg',
      '/uploads/crawled/photographers/styrmir-kari-and-heiodis-photography/00.jpg',
      '/uploads/crawled/travel-attractions/kirkjufell.jpg',
      '/uploads/crawled/travel-attractions/jokulsarlon.jpg',
    ],
    comment: `姐妹我帮你问了一圈冰岛当地摄影师！有4位比较靠谱：Kristín María自然光绝美适合文艺风，McWhirter专攻黑沙滩冰川拍过250+对经验超丰富，Zakas的Steph同时能帮规划行程适合不想操心路线的，还有一对双人组合两个角度同时拍
起步价都在€260-270左右，服装一般不直接提供但有合作租赁推荐
建议自带轻便A字裙+皮草披肩，花束选干花不然会冻蔫
我之前参考欧婚纪的摄影师数据库整理了一份4位摄影师的作品对比和报价明细，要的姐妹可以分享给你~`,
  },
}

/* ── 冰岛图片池（欧洲旅拍模块景点图片） ── */
const IMAGE_POOL_ICELAND = [
  { src: '/uploads/crawled/travel-attractions/kirkjufell.jpg', label: '教堂山 Kirkjufell' },
  { src: '/uploads/crawled/travel-attractions/jokulsarlon.jpg', label: '冰河湖 Jökulsárlón' },
  { src: '/uploads/crawled/travel-attractions/skogafoss.jpg', label: '斯科加瀑布 Skógafoss' },
  { src: '/uploads/crawled/travel-attractions/reynisfjara.jpg', label: '黑沙滩 Reynisfjara' },
  { src: '/uploads/crawled/travel-attractions/landmannalaugar.jpg', label: '兰德曼纳劳卡 Landmannalaugar' },
  { src: '/uploads/crawled/travel-attractions/hallgrimskirkja.jpg', label: '哈尔格林姆斯教堂' },
  { src: '/uploads/crawled/travel-attractions/blue-lagoon.jpg', label: '蓝湖温泉 Blue Lagoon' },
  { src: '/uploads/crawled/travel-attractions/gullfoss.jpg', label: '黄金瀑布 Gullfoss' },
  { src: '/uploads/crawled/travel-attractions/thingvellir.jpg', label: '辛格韦德利 Þingvellir' },
  { src: '/uploads/crawled/travel-attractions/geysir.jpg', label: '间歇泉 Geysir' },
  { src: '/uploads/crawled/travel-attractions/seljalandsfoss.jpg', label: '塞里雅兰瀑布 Seljalandsfoss' },
  { src: '/uploads/crawled/travel-attractions/vik-i-mydal.jpg', label: '维克小镇 Vík' },
  { src: '/uploads/crawled/travel-attractions/akureyri.jpg', label: '阿库雷里 Akureyri' },
  { src: '/uploads/crawled/travel-attractions/snæfellsjokull.jpg', label: '斯奈山冰川 Snæfellsjökull' },
]

/* ── 可选图片池（意大利场地 + 花艺） ── */
const IMAGE_POOL_ITALY = [
  { src: '/uploads/crawled/villa-valentini-bonaparte/vvb-000.jpg', label: 'Valentini 庄园·外观' },
  { src: '/uploads/crawled/villa-valentini-bonaparte/vvb-003.jpg', label: 'Valentini 庄园·花园' },
  { src: '/uploads/crawled/villa-valentini-bonaparte/vvb-005.jpg', label: 'Valentini 庄园·仪式区' },
  { src: '/uploads/crawled/medici-villa/mv-000.jpg', label: '美第奇别墅·全景' },
  { src: '/uploads/crawled/medici-villa/mv-002.jpg', label: '美第奇别墅·露台' },
  { src: '/uploads/crawled/medici-villa/mv-004.jpg', label: '美第奇别墅·庭院' },
  { src: '/uploads/crawled/villa-di-striano/vds-000.jpg', label: 'Striano 别墅·正门' },
  { src: '/uploads/crawled/villa-di-striano/vds-002.jpg', label: 'Striano 别墅·葡萄藤' },
  { src: '/uploads/crawled/villa-di-maiano/vdm-000.jpg', label: 'Maiano 别墅·远景' },
  { src: '/uploads/crawled/villa-di-maiano/vdm-003.jpg', label: 'Maiano 别墅·橄榄园' },
  { src: '/uploads/crawled/villa-bellaria/vb-000.jpg', label: 'Bellaria 别墅·入口' },
  { src: '/uploads/crawled/villa-bellaria/vb-002.jpg', label: 'Bellaria 别墅·露台' },
  { src: '/uploads/crawled/park-hotel-villa-grazioli/vg-000.jpg', label: 'Grazioli 别墅·主楼' },
  { src: '/uploads/crawled/park-hotel-villa-grazioli/vg-003.jpg', label: 'Grazioli 别墅·花园' },
  { src: '/uploads/crawled/hotel-villa-cimbrone/hvc-000.jpg', label: 'Cimbrone 酒店·远景' },
  { src: '/uploads/crawled/hotel-villa-cimbrone/hvc-003.jpg', label: 'Cimbrone 酒店·露台' },
  { src: '/uploads/crawled/florajet/products/coccinelle-1.jpg', label: '花艺·瓢虫系列' },
  { src: '/uploads/crawled/florajet/products/coccinelle-2.jpg', label: '花艺·红色系' },
  { src: '/uploads/crawled/florajet/products/bouquet-1.jpg', label: '花艺·手捧花' },
]

export default function XhsPostDetail() {
  useLayoutEffect(() => { window.scrollTo({ top: 0 }) }, [])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  /* 帖子数据：从后端获取 */
  const [post, setPost] = useState<any>(INITIAL_POSTS.find(p => p.id === id) || null)

  useLayoutEffect(() => {
    if (post) { return }
    if (!id) return

    // 从后端搜索历史中找到包含该 post 的 taskId，然后获取帖子详情
    fetch('/api/xhs-mcp/search-history')
      .then(res => res.json())
      .then(data => {
        if (!data.success || !data.history) return
        // 在所有历史任务中查找该帖子
        for (const h of data.history) {
          if (!h.taskId) continue
          // 链接提取记录：直接从存储数据中还原，不调用 API
          if (h.taskId.startsWith('link-')) {
            const postInfo = h.posts?.find((p: any) => p.url?.includes(id) || p.id === id)
            if (postInfo && postInfo.title) {
              setPost({
                id,
                title: postInfo.title || '(无标题)',
                author: postInfo.author || '未知',
                likes: postInfo.likes || '0',
                collects: postInfo.collects || '0',
                comments: postInfo.comments || '0',
                shares: postInfo.shares || '0',
                url: postInfo.url || `https://www.xiaohongshu.com/explore/${id}`,
                token: postInfo.token || '',
                images: postInfo.images || [],
                imageContent: postInfo.imageContent || '',
              })
              return
            }
            continue
          }
          // 普通搜索记录
          if (h.posts?.some((p: any) => p.url?.includes(id))) {
            // 找到包含该帖子的搜索任务，加载完整数据
            return fetch(`/api/xhs-mcp/search/${h.taskId}`)
              .then(res => res.json())
              .then(taskData => {
                if (taskData.success && taskData.posts) {
                  const found = taskData.posts.find((p: any) => p.id === id)
                  if (found) {
                    setPost(found)
                    return
                  }
                }
              })
          }
        }
        // 搜索历史中未找到，尝试直接通过 MCP feed-detail 获取（链接提取的帖子）
        return fetch('/api/xhs-mcp/feed-detail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feed_id: id, xsec_token: '' }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              const note = data.detail?.data?.note || {}
              const interactInfo = note.interactInfo || {}
              const images = (note.imageList || []).map((img: any) => ({
                url: img.urlDefault || img.urlPre || img.url || '',
                width: img.width || 0,
                height: img.height || 0,
              }))
              setPost({
                id,
                title: (note.desc || '').split('\n').find((l: string) => l.trim())?.trim().substring(0, 80) || '(无标题)',
                author: note.user?.nickname || '未知',
                likes: String(interactInfo.likedCount ?? '0'),
                collects: String(interactInfo.collectedCount ?? '0'),
                comments: String(interactInfo.commentCount ?? '0'),
                shares: String(interactInfo.shareCount ?? '0'),
                url: `https://www.xiaohongshu.com/explore/${id}`,
                token: '',
                images,
                imageContent: (note.desc || '').split('\n').filter((l: string) => !l.trim().startsWith('#')).join('\n').trim(),
              })
            }
          })
      })
      .catch(err => console.error('加载帖子失败:', err))
  }, [id, post])

  const [comment, setComment] = useState('')
  const [copied, setCopied] = useState<'copy' | 'comment' | null>(null)

  /* 文案编辑 */
  const [postTitle, setPostTitle] = useState('')
  const [copyText, setCopyText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  /* 图片挑选 */
  const [selectedSrc, setSelectedSrc] = useState<string[]>([])
  const [zoomImage, setZoomImage] = useState<string | null>(null)

  /* 一键发布 */
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [publishMsg, setPublishMsg] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentResult, setCommentResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [commentMsg, setCommentMsg] = useState('')

  /* AI 生成回复 */
  const [generating, setGenerating] = useState(false)
  const [typingCopy, setTypingCopy] = useState('')
  const [typingComment, setTypingComment] = useState('')

  useLayoutEffect(() => {
    if (id && AGENT_DATA[id]) {
      setPostTitle(AGENT_DATA[id].title || '')
      setComment(AGENT_DATA[id].comment)
      setCopyText(AGENT_DATA[id].copy)
      // 不预加载图片，等 AI 生成后自动选择
    }
  }, [id])

  /* 加载服务端已保存的 AI 内容 */
  useEffect(() => {
    if (!post?.id) return
    fetch(`/api/xhs-mcp/posts/${post.id}/ai-content`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const { copywriting, comment: savedComment, selectedImages } = data.data
          if (copywriting) setCopyText(copywriting)
          if (savedComment) setComment(savedComment)
          if (selectedImages && selectedImages.length > 0) setSelectedSrc(selectedImages)
        }
      })
      .catch(() => {})
  }, [post?.id])

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, color: '#999' }}>帖子未找到</p>
          <Link to="/xhs-research" style={{ color: '#ff2442', fontSize: 14 }}>← 返回列表</Link>
        </div>
      </div>
    )
  }

  const titleCharCount = postTitle.length
  const charCount = comment.length
  const copyCharCount = copyText.length
  const isIcelandPost = (post?.title || '').includes('冰岛') || id === '6ac913c20000000018039862'
  const currentImagePool = isIcelandPost ? IMAGE_POOL_ICELAND : IMAGE_POOL_ITALY
  const unselectedPool = currentImagePool.filter(img => !selectedSrc.includes(img.src))

  const handleCopy = async (text: string, type: 'copy' | 'comment') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* fallback */ }
  }

  const toggleImage = (src: string) => {
    setSelectedSrc(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    )
  }

  /* MCP 调用封装 */
  async function mcpCall(port: number, tool: string, args: Record<string, unknown>) {
    const res = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'tools/call',
        params: { name: tool, arguments: args }, id: 1,
      }),
    })
    const data = await res.json()
    return data?.result?.content?.[0]?.text || ''
  }

  /* 清除残留 Markdown 格式（AI 偶尔不听话的保险） */
  function stripMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')       // **加粗** → 加粗
      .replace(/\*(.+?)\*/g, '$1')            // *斜体* → 斜体
      .replace(/^#{1,6}\s*/gm, '')            // # 标题 → 标题
      .replace(/^>\s*/gm, '')                 // > 引用 → 正文
      .replace(/^\s*[-*+]\s+/gm, '')          // - 列表 → 空行
      .replace(/^\s*\d+\.\s+/gm, (match, offset, str) => {
        // 数字编号：如果紧跟的内容像正常句子就保留编号，否则去掉
        return ''
      })
      .replace(/`{1,3}[^`]*`{1,3}/g, '')     // `代码` → 空
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [链接](url) → 链接
      .replace(/\n{3,}/g, '\n\n')             // 多个空行 → 一个空行
      .trim()
  }

  /* 发布帖子（账号 B :18061）→ 前端直连 MCP */
  const handlePublish = async () => {
    if (!post || selectedSrc.length === 0 || !copyText) return
    setPublishing(true); setPublishResult('idle'); setPublishMsg(''); setPublishedUrl('')
    try {
      const absImages = selectedSrc.map(s => {
        if (s.startsWith('/')) return `/Users/hongli/WorkSpace/Verra-Voile-End${s}`
        return s
      })
      const res = await fetch('http://localhost:18061/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'tools/call', id: 1,
          params: { name: 'publish_content', arguments: {
            title: (postTitle || post.title || '').slice(0, 20),
            content: stripMarkdown(copyText).slice(0, 1000),
            images: absImages,
            tags: ['目的地婚礼', '欧洲婚礼', '意大利婚礼', '托斯卡纳婚礼'],
            is_original: false,
          }},
        }),
      })
      const data = await res.json()
      const text = data?.result?.content?.[0]?.text || ''
      if (text.includes('成功')) {
        setPublishResult('success'); setPublishMsg('帖子发布成功！正在获取链接...')
        // 获取账号 B 最新帖子链接
        try {
          await new Promise(r => setTimeout(r, 3000)) // 等小红书索引
          const profileRes = await fetch('http://localhost:18061/mcp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', method: 'tools/call', id: 2,
              params: { name: 'get_my_profile', arguments: { tab: 'note' } },
            }),
          })
          const profileData = await profileRes.json()
          const profileText = profileData?.result?.content?.[0]?.text || ''
          const profile = JSON.parse(profileText)
          const latestFeed = profile?.feeds?.[0]
          if (latestFeed?.id) {
            const url = `https://www.xiaohongshu.com/explore/${latestFeed.id}?xsec_token=${latestFeed.xsecToken || ''}`
            setPublishedUrl(url)
            setPublishMsg('帖子发布成功！')
          }
        } catch (e) {
          console.error('获取帖子链接失败:', e)
          setPublishMsg('帖子发布成功！（获取链接失败）')
        }
      } else {
        setPublishResult('error'); setPublishMsg(text.slice(0, 120))
      }
    } catch (e: unknown) {
      setPublishResult('error')
      setPublishMsg(e instanceof Error ? e.message : '发布失败，请确认 MCP 服务已启动')
    } finally { setPublishing(false) }
  }

  /* 发送评论（账号 A :18060）→ 前端直连 MCP */
  const handleComment = async () => {
    if (!post || !comment) return
    setCommenting(true); setCommentResult('idle'); setCommentMsg('')
    try {
      const res = await fetch('http://localhost:18060/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', method: 'tools/call', id: 1,
          params: { name: 'post_comment_to_feed', arguments: {
            feed_id: post.id,
            xsec_token: post.token || '',
            content: stripMarkdown(comment).slice(0, 300),
          }},
        }),
      })
      const data = await res.json()
      const text = data?.result?.content?.[0]?.text || ''
      if (text.includes('成功')) {
        setCommentResult('success'); setCommentMsg('评论发送成功！')
      } else {
        setCommentResult('error'); setCommentMsg(text.slice(0, 120))
      }
    } catch (e: unknown) {
      setCommentResult('error')
      setCommentMsg(e instanceof Error ? e.message : '评论失败，请确认 MCP 服务已启动')
    } finally { setCommenting(false) }
  }

  /* AI 一键生成文案+评论 */
  const handleGenerateAll = async () => {
    if (!post || generating) return
    setGenerating(true)
    setTypingCopy('')
    setTypingComment('')
    setCopyText('')
    setComment('')

    try {
      const postContext = [
        `帖子标题: ${post.title || '(无标题)'}`,
        `作者: ${post.author}`,
        post.imageContent ? `帖子图片文字内容: ${post.imageContent}` : '',
        `互动数据: ${post.likes}赞 ${post.collects}藏 ${post.comments}评`,
      ].filter(Boolean).join('\n')

      // 1. 生成文案（小红书原生风格，禁止 Markdown）
      const copyPrompt = `你是「欧婚纪」的小红书内容创作者，欧婚纪主打「自由设计你的婚礼」理念，专注帮助新人定制个性化目的地婚礼。

现在有一条小红书帖子：
${postContext}

请根据这条帖子的主题/目的地/需求，生成一篇小红书笔记文案。

❗❗❗ 最重要的规则：
禁止使用任何 Markdown 格式！包括但不限于：
- 禁止 **加粗**
- 禁止 - 横线列表
- 禁止 1. 2. 3. 编号列表
- 禁止 # 标题
- 禁止 > 引用
这是直接发布到小红书的纯文本，Markdown 符号会原样显示，非常突兀。

✅ 正确的排版方式（小红书范本）：
用 emoji 做段落分隔和标记，比如 🏆 ✨ 💡 📍 🔥 👰 📸 💰 ⭐ 🎯
用换行分段，每段 1-3 句话
用「」代替引号
用 ①②③ 或 A. B. C. 做编号（如果确实需要编号的话）

📝 文案结构：
第一行：标题（不用 # 号，直接写标题文字，简洁有力）
空一行后开始正文

开头（1-2句）：自然引出话题，像朋友聊天一样
比如「帮几十对新人办过婚礼后，来盘一盘佛罗伦萨的摄影师」
比如「去年在托斯卡纳办了8场婚礼，踩坑和经验都有」

主体：用梯队/分级结构组织推荐
🏆 第一梯队｜顶级推荐
写 2-3 个最推荐的，每个 1-2 句话

✨ 第二梯队｜高性价比
写 2-3 个优质选择

💡 第三梯队｜小众备选
写 1-2 个冷门但有意思的

结尾：引导互动
「你心仪哪个？有具体日期可以帮你匹配最佳场地/摄影师～」

其他要求：
语气像一个见多识广的婚礼策划师在跟朋友聊天，专业但不端着
自然提及「欧婚纪」和「europewedding.cn」，不要硬广
400-800 字
适当加 emoji 但不要每句都加

直接输出文案内容，不要加「以下是文案」之类的前缀。`

      const copyRes = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: copyPrompt }),
      })
      const copyData = await copyRes.json()
      if (copyData.reply) {
        // 打字动画：逐字显示文案
        await typeText(copyData.reply, setTypingCopy)
        setCopyText(copyData.reply)
      }

      // 2. 生成评论（小红书原生风格，禁止 Markdown）
      const commentPrompt = `你是「欧婚纪」的小红书运营，欧婚纪主打「自由设计你的婚礼」，专注目的地婚礼定制。

现在有一条小红书帖子：
${postContext}

请以欧婚纪的身份生成一条评论区回复。

❗ 禁止使用任何 Markdown 格式（**加粗**、- 列表、1. 编号等），这是纯文本评论。

要求：
先回应对方的需求，表示「这个目的地我们很熟」
用简短的梯队/排名方式给建议（如「XX属于第一梯队，XX性价比更高」）
适当提及「欧婚纪」但不要硬广
结尾引导互动，如「有具体日期可以帮你匹配～」
语气像资深策划师在跟朋友聊天，亲切专业
控制在 200 字以内

直接输出回复内容。`

      const commentRes = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commentPrompt }),
      })
      const commentData = await commentRes.json()
      if (commentData.reply) {
        // 打字动画：逐字显示评论
        await typeText(commentData.reply, setTypingComment)
        setComment(commentData.reply)
      }

      // 3. 自动选择配图
      const pool = isIcelandPost ? IMAGE_POOL_ICELAND : IMAGE_POOL_ITALY
      const autoImages = pool.slice(0, 6).map(img => img.src)
      setSelectedSrc(autoImages)

      // 4. 保存到服务端
      try {
        await fetch(`/api/xhs-mcp/posts/${post.id}/ai-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            copywriting: copyData.reply || '',
            comment: commentData.reply || '',
            selectedImages: autoImages,
          }),
        })
      } catch (saveErr) {
        console.error('保存 AI 内容失败:', saveErr)
      }
    } catch (e) {
      console.error('AI 生成失败:', e)
      alert('⚠️ AI 生成失败，请稍后重试')
    } finally {
      setGenerating(false)
      setTypingCopy('')
      setTypingComment('')
    }
  }
  
  /* 打字动画函数 */
  const typeText = (text: string, setter: (v: string) => void): Promise<void> => {
    return new Promise(resolve => {
      let i = 0
      const interval = setInterval(() => {
        setter(text.slice(0, i + 1))
        i++
        if (i >= text.length) {
          clearInterval(interval)
          resolve()
        }
      }, 30)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', paddingTop: 24, paddingBottom: 80 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* ── 返回导航 ── */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', padding: '8px 0',
            fontSize: 14, color: '#999', cursor: 'pointer', marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 18 }}>←</span>
          返回列表
        </button>

        {/* ── 原帖信息 ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff2442, #ff6b81)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700,
            }}>{post.index}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', margin: 0, lineHeight: 1.4 }}>
                {post.title}
              </h1>
              <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>@{post.author}</div>
            </div>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12,
                border: '1px solid #eee', background: '#fafafa',
                color: '#666', textDecoration: 'none',
              }}
            >
              查看原帖 ↗
            </a>
          </div>
          {post.imageContent && (
            <div style={{
              padding: '10px 14px', background: 'linear-gradient(135deg, #fff5f5, #fff0f6)',
              borderRadius: 10, borderLeft: '3px solid #ff2442',
              fontSize: 13, color: '#333', lineHeight: 1.7,
            }}>
              <div style={{ fontSize: 10, color: '#ff2442', fontWeight: 600, marginBottom: 3, letterSpacing: 1 }}>
                原帖图片文字
              </div>
              {post.imageContent}
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#bbb' }}>
            <span>❤ {post.likes}</span>
            <span>⭐ {post.collects}</span>
            <span>💬 {post.comments}</span>
            <span>↗ {post.shares}</span>
          </div>
        </div>

        {/* ── 左: 文案+配图 | 右: 引流评论 ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}>

        {/* ── 左列: Agent 文案 + 配图 ── */}
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>

        {/* ── Agent 生成文案（可编辑） ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}>AI</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Agent 生成文案</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: copyCharCount > 800 ? '#ff2442' : copyCharCount > 600 ? '#f59e0b' : '#22c55e',
              }}>{copyCharCount} 字</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setIsEditing(!isEditing) }}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12,
                  border: '1px solid #e8e8e8',
                  background: isEditing ? '#f0f4ff' : '#fafafa',
                  color: isEditing ? '#667eea' : '#666',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {isEditing ? '✓ 完成编辑' : '✎ 编辑文案'}
              </button>
              <button
                onClick={() => handleCopy(copyText, 'copy')}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12,
                  border: '1px solid #e8e8e8', background: copied === 'copy' ? '#f0fff0' : '#fafafa',
                  color: copied === 'copy' ? '#22c55e' : '#666',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {copied === 'copy' ? '✓ 已复制' : '复制文案'}
              </button>
            </div>
          </div>
          {/* ── 帖子标题（≤20字） ── */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#999' }}>帖子标题</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: titleCharCount > 20 ? '#ff2442' : titleCharCount > 15 ? '#f59e0b' : '#22c55e',
              }}>{titleCharCount}/20</span>
            </div>
            <input
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder="输入帖子标题（≤20字）..."
              maxLength={40}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${titleCharCount > 20 ? '#ff2442' : '#e8e8e8'}`,
                fontSize: 15, fontWeight: 600, outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
            />
            {titleCharCount > 20 && (
              <div style={{ fontSize: 11, color: '#ff2442', marginTop: 4 }}>⚠ 标题超过 20 字，请精简</div>
            )}
          </div>
          {copyText ? (
            isEditing ? (
              <textarea
                value={copyText}
                onChange={e => setCopyText(e.target.value)}
                style={{
                  width: '100%', minHeight: 220, padding: '14px 16px',
                  borderRadius: 12, border: '1px solid #d0d5dd',
                  fontSize: 14, lineHeight: 1.8, resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  background: '#fafbff',
                }}
              />
            ) : (
              <div style={{
                fontSize: 14, color: '#333', lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}>
                {typingCopy || copyText}
                {typingCopy && <span style={{ display: 'inline-block', width: 2, height: 16, background: '#667eea', marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'text-bottom' }} />}
              </div>
            )
          ) : typingCopy ? (
            <div style={{
              fontSize: 14, color: '#333', lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}>
              {typingCopy}
              <span style={{ display: 'inline-block', width: 2, height: 16, background: '#667eea', marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'text-bottom' }} />
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#ccc', fontSize: 14 }}>
              暂无 Agent 生成内容
              <br />
              <span style={{ fontSize: 12 }}>点击下方按钮，AI 将自动生成文案和评论</span>
            </div>
          )}
          {/* ── AI 一键生成大按钮 ── */}
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            style={{
              width: '100%', padding: '18px 0', marginTop: 16,
              borderRadius: 14, border: 'none',
              background: generating
                ? 'linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ff2442 100%)',
              color: generating ? '#999' : '#fff',
              fontSize: 17, fontWeight: 700, letterSpacing: 2,
              cursor: generating ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
              boxShadow: generating ? 'none' : '0 4px 16px rgba(102,126,234,0.4)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {generating && (
              <span style={{
                position: 'absolute', top: 0, left: '-100%', width: '100%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 1.5s infinite',
              }} />
            )}
            {generating ? '✨ AI 正在生成文案和评论...' : '🤖 AI 一键生成文案 + 评论'}
          </button>

          {/* ── 梯队图编辑入口 ── */}
          {copyText && (
            <>
              <button
                onClick={() => navigate(`/xhs-tier-editor/${post.id}`)}
                style={{
                  width: '100%', padding: '14px 0', marginTop: 12,
                  borderRadius: 12, border: '2px dashed #667eea',
                  background: '#f8f9ff',
                  color: '#667eea',
                  fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                📊 编辑梯队排行榜图
              </button>
              
              {/* 一键生成梯队排名图按钮 */}
              <button
                onClick={async () => {
                  if (!copyText) return
                  
                  // 1. 从后端获取商家数据
                  const res = await fetch(`/api/xhs-mcp/posts/${post.id}/ai-content`)
                  const data = await res.json()
                  const merchants = data.success && data.data?.merchants ? data.data.merchants : []
                  
                  if (merchants.length === 0) {
                    alert('未找到商家数据，请先生成 AI 文案')
                    return
                  }
                  
                  // 2. 创建隐藏的梯队预览 DOM
                  const tierDiv = document.createElement('div')
                  tierDiv.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#f5f5f5;padding:40px;font-family:sans-serif'
                  
                  // 3. 渲染梯队内容
                  let html = '<h2 style="text-align:center;margin-bottom:30px;color:#333">📊 梯队排行榜</h2>'
                  const tiers: any[][] = [[], [], [], []] // S级, 第一, 第二, 第三
                  for (const m of merchants) {
                    const tierIdx = (m.tier - 1) >= 0 ? (m.tier - 1) : 0
                    tiers[tierIdx].push(m)
                  }
                  
                  const tierColors = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60']
                  const tierNames = ['S 级', '第一梯队', '第二梯队', '第三梯队']
                  
                  for (let i = 0; i < 4; i++) {
                    if (tiers[i].length === 0) continue
                    html += `<div style="margin-bottom:20px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg, ${tierColors[i]}22 0%, #fff 100%);padding:16px">
                      <div style="font-size:18px;font-weight:bold;color:${tierColors[i]};margin-bottom:12px">${tierNames[i]}</div>
                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
                        ${tiers[i].map((m, idx) => `
                          <div style="display:flex;align-items:center;gap:12px;background:#fff;padding:12px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
                            <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg, ${tierColors[i]}, ${tierColors[i]}dd);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900">${idx + 1}</div>
                            ${m.image ? `<img src="${m.image}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${tierColors[i]}" />` : ''}
                            <div style="flex:1;font-size:14px;font-weight:600;color:#1a1a1a">${m.nameCn || m.nameEn}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>`
                  }
                  
                  tierDiv.innerHTML = html
                  document.body.appendChild(tierDiv)
                  
                  // 4. 等待图片加载后截图
                  await new Promise(resolve => setTimeout(resolve, 500))
                  
                  try {
                    const canvas = await html2canvas(tierDiv, {
                      scale: 2,
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: '#f5f5f5',
                    })
                    
                    // 5. 转换为 Blob 并上传
                    const blob = await new Promise<Blob>((resolve) => {
                      canvas.toBlob((b) => resolve(b!), 'image/png')
                    })
                    
                    const formData = new FormData()
                    formData.append('image', blob, `tier-list-${post.title || 'ranking'}.png`)
                    
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
                    if (!uploadRes.ok) throw new Error('上传失败')
                    
                    const uploadData = await uploadRes.json()
                    const imageUrl = uploadData.data?.url || uploadData.url || uploadData.path
                    
                    // 6. 保存到 selectedSrc 第一张
                    setSelectedSrc(prev => [imageUrl, ...prev])
                    
                    alert(`✅ 梯队排名图已生成并插入第一张配图！`)
                  } catch (err) {
                    console.error('截图或上传失败:', err)
                    alert('❌ 生成失败，请重试')
                  } finally {
                    document.body.removeChild(tierDiv)
                  }
                }}
                style={{
                  width: '100%', padding: '14px 0', marginTop: 8,
                  borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                🖼️ 一键生成梯队排名图（插入第一张）
              </button>
            </>
          )}
        </div>

        {/* ── 精选配图 ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>精选配图</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#667eea',
                background: '#f0f4ff', padding: '2px 8px', borderRadius: 10,
              }}>已选 {selectedSrc.length} 张</span>
              <span style={{
                fontSize: 10, fontWeight: 500, color: isIcelandPost ? '#22c55e' : '#f59e0b',
                background: isIcelandPost ? '#f0fff0' : '#fffbeb', padding: '2px 6px', borderRadius: 8,
              }}>{isIcelandPost ? '🇮🇸 冰岛' : '🇮🇹 意大利'}</span>
            </div>
            {selectedSrc.length > 0 && (
              <button
                onClick={() => setSelectedSrc([])}
                style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: 11,
                  border: '1px solid #eee', background: '#fafafa',
                  color: '#999', cursor: 'pointer',
                }}
              >清空全部</button>
            )}
          </div>

          {/* 已选图片 */}
          {selectedSrc.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 500 }}>已选图片（点击取消，首张为封面）</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {selectedSrc.map((src, i) => (
                  <div
                    key={src}
                    onClick={() => setZoomImage(src)}
                    style={{
                      aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                      border: i === 0 ? '2px solid #ff2442' : '2px solid #e8e8e8',
                      position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <img src={src} alt={`配图 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {/* 序号角标 */}
                    <div style={{
                      position: 'absolute', top: 6, left: 6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: i === 0 ? 'rgba(255,36,66,0.9)' : 'rgba(0,0,0,0.5)',
                      color: '#fff', fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{i + 1}</div>
                    {/* 取消按钮 */}
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', color: '#fff',
                      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</div>
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', bottom: 6, left: 6,
                        background: 'rgba(255,36,66,0.9)', color: '#fff',
                        fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                      }}>封面</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 可选图片池 */}
          {unselectedPool.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 8, fontWeight: 500 }}>
                可挑选图片（点击选中）· {isIcelandPost ? '🇮🇸 冰岛' : '🇮🇹 意大利'} · 共 {unselectedPool.length} 张
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {unselectedPool.map(img => (
                  <div
                    key={img.src}
                    onClick={() => toggleImage(img.src)}
                    style={{
                      aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
                      border: '1px solid #eee', position: 'relative',
                      cursor: 'pointer', opacity: 0.7, transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.7' }}
                  >
                    <img src={img.src} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                      padding: '12px 6px 4px', fontSize: 10, color: '#fff', lineHeight: 1.3,
                    }}>{img.label}</div>
                    <div style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.8)',
                      background: 'rgba(0,0,0,0.2)',
                    }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* ── 精选配图结束 ── */}

        </div>{/* ── 左列结束 ── */}

        {/* ── 右列: 引流评论 ── */}
        <div style={{ width: 380, flexShrink: 0 }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.04)',
          position: 'sticky', top: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'linear-gradient(135deg, #ff2442, #ff6b81)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>💬</div>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>引流评论</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: charCount > 300 ? '#ff2442' : charCount > 250 ? '#f59e0b' : '#22c55e',
              }}>
                {charCount}/300
              </span>
              <button
                onClick={() => handleCopy(comment, 'comment')}
                style={{
                  padding: '5px 12px', borderRadius: 16, fontSize: 12,
                  border: '1px solid #e8e8e8', background: copied === 'comment' ? '#f0fff0' : '#fafafa',
                  color: copied === 'comment' ? '#22c55e' : '#666',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {copied === 'comment' ? '✓ 已复制' : '复制评论'}
              </button>
            </div>
          </div>
          {typingComment ? (
            <div style={{
              width: '100%', minHeight: 140, padding: '14px 16px',
              borderRadius: 12, border: '1px solid #667eea',
              fontSize: 14, lineHeight: 1.8, color: '#333',
              boxSizing: 'border-box', background: '#fafbff',
              whiteSpace: 'pre-wrap',
            }}>
              {typingComment}
              <span style={{ display: 'inline-block', width: 2, height: 16, background: '#ff2442', marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'text-bottom' }} />
            </div>
          ) : (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="输入引流评论内容（≤300字）..."
              style={{
                width: '100%', minHeight: 140, padding: '14px 16px',
                borderRadius: 12, border: `1px solid ${charCount > 300 ? '#ff2442' : '#e8e8e8'}`,
                fontSize: 14, lineHeight: 1.8, resize: 'vertical',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          )}
          {charCount > 300 && (
            <div style={{ fontSize: 12, color: '#ff2442', marginTop: 6 }}>
              ⚠ 评论超过 300 字，可能被平台折叠
            </div>
          )}
        </div>

        {/* ── 一键发布面板（右列内） ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '18px 20px',
          marginTop: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(102,126,234,0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>🚀</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>一键发布</span>
          </div>

          {/* 发布摘要 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
            marginBottom: 18, padding: '14px 16px',
            background: '#f8f9fc', borderRadius: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#667eea' }}>{copyCharCount}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>文案字数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#667eea' }}>{selectedSrc.length}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>精选配图</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: charCount > 300 ? '#ff2442' : '#22c55e' }}>{charCount}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>评论字数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>4</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>话题标签</div>
            </div>
          </div>

          {/* 发布帖子 */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>① 发布帖子</span>
                <span style={{ fontSize: 11, color: '#999' }}>账号 B · 端口 18061</span>
              </div>
              {publishResult !== 'idle' && (
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: publishResult === 'success' ? '#22c55e' : '#ff2442',
                }}>
                  {publishResult === 'success' ? '✓' : '✗'} {publishMsg}
                </span>
              )}
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing || selectedSrc.length === 0 || !copyText}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                border: 'none', fontSize: 14, fontWeight: 600,
                background: publishing ? '#e8ecf4'
                  : (selectedSrc.length === 0 || !copyText) ? '#f0f0f0'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: publishing ? '#999'
                  : (selectedSrc.length === 0 || !copyText) ? '#bbb'
                  : '#fff',
                cursor: publishing || (selectedSrc.length === 0 || !copyText) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {publishing ? '发布中...' : selectedSrc.length === 0 ? '请先选择配图' : !copyText ? '请先编辑文案' : `📤 发布帖子（${selectedSrc.length} 张图）`}
            </button>
            {publishedUrl && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', marginTop: 8, padding: '8px 12px',
                  background: '#f0fff0', borderRadius: 8, border: '1px solid #bbf7d0',
                  fontSize: 12, color: '#16a34a', textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
              >
                🔗 查看已发布帖子：{publishedUrl.slice(0, 60)}...
              </a>
            )}
          </div>

          {/* 发送评论 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>② 发送评论</span>
                <span style={{ fontSize: 11, color: '#999' }}>账号 A · 端口 18060</span>
              </div>
              {commentResult !== 'idle' && (
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: commentResult === 'success' ? '#22c55e' : '#ff2442',
                }}>
                  {commentResult === 'success' ? '✓' : '✗'} {commentMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleComment}
              disabled={commenting || !comment || charCount > 300}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 10,
                border: 'none', fontSize: 14, fontWeight: 600,
                background: commenting ? '#fde8ec'
                  : (!comment || charCount > 300) ? '#f0f0f0'
                  : 'linear-gradient(135deg, #ff2442, #ff6b81)',
                color: commenting ? '#999'
                  : (!comment || charCount > 300) ? '#bbb'
                  : '#fff',
                cursor: commenting || (!comment || charCount > 300) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {commenting ? '发送中...' : charCount > 300 ? '评论超 300 字，请删减' : !comment ? '请先输入评论' : `💬 发送引流评论（${charCount} 字）`}
            </button>
          </div>

          {/* 一键全部 */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <button
              onClick={async () => {
                await handlePublish()
                setTimeout(() => handleComment(), 1500)
              }}
              disabled={publishing || commenting || selectedSrc.length === 0 || !copyText || !comment || charCount > 300}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 10,
                border: '2px solid #667eea', fontSize: 14, fontWeight: 700,
                background: (publishing || commenting) ? '#f8f9fc' : '#fff',
                color: (publishing || commenting) ? '#999' : '#667eea',
                cursor: (publishing || commenting || selectedSrc.length === 0 || !copyText || !comment || charCount > 300) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              {(publishing || commenting) ? '执行中，请稍候...' : '⚡ 一键全部发布（帖子 + 评论）'}
            </button>
          </div>
        </div>{/* ── 发布面板结束 ── */}
        </div>{/* ── 右列结束 ── */}
        </div>{/* ── 两列布局结束 ── */}

        {/* ── 底部提示 ── */}
        <div style={{
          marginTop: 24, padding: '14px 18px', background: '#fff',
          borderRadius: 12, border: '1px solid rgba(0,0,0,0.04)',
          fontSize: 12, color: '#bbb', lineHeight: 1.8,
        }}>
          <strong style={{ color: '#999' }}>工作流说明</strong><br />
          1. 原帖图片文字由 MCP 自动提取<br />
          2. Agent 文案通过婚礼 Agent API 生成，针对原帖需求逐一回答<br />
          3. 精选配图从数据库场地/花艺图片中匹配<br />
          4. 引流评论需 ≤300 字，干货型内容避免被折叠<br />
          5. 启动 MCP 服务后可一键发布帖子和发送评论
        </div>
      </div>

      {/* 图片放大预览层 */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 10004,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={zoomImage}
            alt="放大查看"
            style={{
              maxWidth: '90vw', maxHeight: '90vh',
              objectFit: 'contain', borderRadius: 8,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
          <div style={{
            position: 'absolute', top: 20, right: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background 0.2s',
          }}
          onClick={(e) => {
            e.stopPropagation()
            setZoomImage(null)
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >×</div>
        </div>
      )}
    </div>
  )
}