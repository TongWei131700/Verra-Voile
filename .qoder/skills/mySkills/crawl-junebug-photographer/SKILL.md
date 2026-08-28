---
name: crawl-junebug-photographer
description: 从 Junebug Weddings 爬取婚礼摄影师数据并生成摄影详情页。当用户说"抓取摄影师"、"爬取 Junebug"、"添加摄影师"时触发。
---

# 爬取 Junebug 摄影师并生成详情页

## 概述
从 junebugweddings.com 爬取婚礼摄影师数据（头像、作品集、视频等），写入前端静态数据文件，自动生成摄影详情页。无需后端 API，纯前端静态数据驱动。

## 适用场景
- 用户提供 Junebug Weddings 摄影师 URL，需要爬取并添加到摄影列表
- 批量添加某地区摄影师
- 更新现有摄影师的图片或视频数据

## 前置条件
- 本地 Node.js 环境 + puppeteer 依赖
- **必须使用 Puppeteer**：Junebug 有 Cloudflare 防护，curl/WebFetch 均返回 403

---

## 第一部分：数据爬取

### 数据源 URL 格式
```
https://junebugweddings.com/vendors/wedding-photographers/{country}/{region}/{Photographer-Slug}
```
示例：
- `https://junebugweddings.com/vendors/wedding-photographers/italy/southern-italy/Spazio46`
- `https://junebugweddings.com/vendors/wedding-photographers/new-zealand/Tinted-Photography`
- `https://junebugweddings.com/vendors/wedding-photographers/united-kingdom/london/Nicole-Lamparska-Photography`

### 唯一执行方案 — 单个 Puppeteer 脚本

**必须且只能用 Puppeteer 脚本**，禁止使用 Browser Agent（太慢）、WebFetch（被 Cloudflare 拦截 403）、curl（同样被拦截）。

编写 `scripts/extract-junebug-{slug}.cjs`，一个脚本完成全部工作：
1. 启动 Puppeteer 浏览器，访问 Junebug 页面（自动通过 Cloudflare）
2. 通过 `page.on('response')` 拦截 `images.junebugweddings.com` 的图片 buffer
3. 从页面 HTML 提取 `vendorAccountId`（后续 AJAX API 调用必需）
4. 从 `static.junebugweddings.com` 提取 headshot/logo URL
5. 滚动页面 + 循环点击 `.load-more.is-visible` 按钮加载全部画廊图片
6. 提取页面 DOM 中的文字数据（名称、描述、网站链接、评价等）
7. **在页面上下文中**调用 AJAX API 获取完整作品集和视频（利用已有的 Cloudflare clearance）
8. 将拦截到的图片 buffer 写入 `uploads/crawled/photographers/{slug}/` 目录
9. 输出 JSON 数据文件 `scripts/junebug-{slug}-data.json`

**禁止的方案**（每次必须遵守）：
- ✖ 禁止用 Browser Agent（启动慢、提取慢）
- ✖ 禁止用 WebFetch（Cloudflare 返回 403）
- ✖ 禁止用 curl / http.get 下载 Junebug 图片（Cloudflare 返回 403）
- ✖ 禁止分两步脚本（先提取再下载），必须一个脚本搞定

### Puppeteer 脚本核心结构

```javascript
const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const SLUG = '{slug}'
const PAGE_URL = '{junebug-url}'
const BASE_DIR = path.join(__dirname, '../uploads/crawled/photographers', SLUG)

async function main() {
  fs.mkdirSync(BASE_DIR, { recursive: true })
  const browser = await puppeteer.launch({ headless: 'new' })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 ...')

  // 1. 拦截图片响应（images + static 两个域名）
  const capturedBuffers = new Map()
  let headshotBuffer = null
  page.on('response', async (response) => {
    const url = response.url()
    // 拦截作品集图片
    if (url.includes('images.junebugweddings.com/')) {
      const match = url.match(/images\.junebugweddings\.com\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/)
      if (!match) return
      const pattern = match[1]
      if (capturedBuffers.has(pattern)) return
      try {
        const buffer = await response.buffer()
        if (buffer.length < 5000) return // 跳过缩略图
        capturedBuffers.set(pattern, buffer)
      } catch (e) {}
    }
    // 拦截头像/logo（static.junebugweddings.com 也有 Cloudflare 防护，必须本地化）
    if (url.includes('static.junebugweddings.com/') && (url.includes('headshot') || url.includes('logo'))) {
      try {
        const buffer = await response.buffer()
        if (buffer.length > 1000) headshotBuffer = buffer
      } catch (e) {}
    }
  })

  // 2. 访问页面
  await page.goto(PAGE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 3000))

  // 3. 提取 vendorAccountId（从 page.content() 的 HTML 中）
  const pageContent = await page.content()
  const acctMatch = pageContent.match(/vendorAccountId\s*=\s*(\d+)/)
  const acctMatch2 = pageContent.match(/acct(\d+)/)
  const accountId = acctMatch ? acctMatch[1] : (acctMatch2 ? acctMatch2[1] : null)

  // 4. 提取 headshot/logo（static.junebugweddings.com）
  const staticUrls = [...new Set(
    (pageContent.match(/https:\/\/static\.junebugweddings\.com[^"'\s]+/g) || [])
  )]

  // 5. 提取 DOM 数据（名称、描述、网站、轮播图、画廊等）
  const data = await page.evaluate(() => {
    // ... 其他提取逻辑 ...
    
    // 提取摄影师个人网站（"Visit Website" 按钮）
    const website = (() => {
      // 优先选择 .see-website a（Junebug 标准 "Visit Website" 按钮）
      const visitLink = document.querySelector('.see-website a, .vendor-links-row .see-website a')
      if (visitLink && visitLink.href && !visitLink.href.includes('junebugweddings')) {
        return visitLink.href.replace(/\/$/, '') // 去掉末尾斜杠
      }
      // 备选：查找所有外部链接中文字包含 "Visit Website" 的
      const links = document.querySelectorAll('a[href*="http"]:not([href*="junebugweddings"])')
      for (const a of links) {
        if (a.textContent.toLowerCase().includes('visit') && a.textContent.toLowerCase().includes('website')) {
          return a.href.replace(/\/$/, '')
        }
      }
      return null
    })()
    return { /* ... */, website }
  })

  // 6. 滚动 + 点击 "View more +" 加载全部画廊
  for (let round = 0; round < 15; round++) {
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('.load-more.is-visible')
      btns.forEach(b => b.click())
      return btns.length
    })
    if (clicked === 0) break
    await new Promise(r => setTimeout(r, 2000))
  }

  // 7. 在页面上下文中调用 AJAX API（利用已有 Cloudflare clearance）
  let portfolioUrls = []
  if (accountId) {
    portfolioUrls = await page.evaluate(async (acctId) => {
      const all = []
      for (let offset = 0; offset < 200; offset += 9) {
        const body = new URLSearchParams({ accountid: acctId, slug: '{Slug}', offset: String(offset) })
        const resp = await fetch('/ajax/vendor/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
          body: body.toString()
        })
        const json = await resp.json()
        if (!json.images || json.images.length === 0) break
        json.images.forEach(img => {
          const raw = img.uri || (img.avifUri || '').replace(/_avif\.avif$/, '.jpg').replace(/\.avif$/, '.jpg')
          if (raw) all.push(raw)
        })
        if (json.images.length < 9) break
      }
      return [...new Set(all)]
    }, accountId)

    // 视频 API
    const videoData = await page.evaluate(async (acctId) => {
      const body = new URLSearchParams({ accountid: acctId, slug: '{Slug}' })
      const resp = await fetch('/ajax/vendor/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: body.toString()
      })
      return await resp.json()
    }, accountId)
    // 仅保留 Vimeo 视频，YouTube 视频舍弃
  }

  await browser.close()

  // 8. 整理图片顺序：轮播图(前3张) + 画廊/作品集
  // 9. 将 capturedBuffers 写入文件
  // 10. 保存 headshotBuffer 到 headshot.png（如果有）
  // 11. 输出 JSON 数据文件
}
```

### 关键参数
- `accountid`：从页面 HTML 中提取的数字 ID（去掉 `acct` 前缀）
- `slug`：URL 中的摄影师标识（如 `Spazio46`，注意大小写敏感）
- `offset`：分页偏移，每次 +9

### 图片顺序
1. **前 3 张**：页面 `.vendor__slide img` 中的 vendor 展示照（封面质量最高）
2. **后续**：`.gallery__card` 画廊图片 + AJAX API 作品集图片（去重后）

`cover` 字段取 `images[0]`（第一张 vendor 展示照）。

### 视频处理
- **YouTube**：直接舍弃，不写入 `videoUrl`
- **Vimeo**：直接写入 `videoUrl`
- 如果 API 返回 0 个视频或只有 YouTube 视频，则不设置 `videoUrl` 字段

---

## 第二部分：数据写入

### ⚠️ 架构重要说明

摄影师数据已从静态 TS 文件迁移到**数据库驱动**架构：
- **列表页和详情页都从 API 加载数据**：`/api/products/crawled-photographers` 和 `/api/products/crawled-photographers/:slug`
- 数据存储在 `crawled_photographers` 数据库表中
- **仅修改 `junebugPhotographers.ts` 静态文件不会生效**，必须插入数据库
- 新增摄影师只需插入数据库 + 同步图片，无需重新构建/部署前端

### 数据库表结构（crawled_photographers）

```
基础字段：
  slug          varchar(255)   PRIMARY KEY - 摄影师唯一标识
  name          varchar(255)   英文名
  name_cn       varchar(255)   中文名
  country       varchar(100)   国家英文
  country_en    varchar(100)   国家英文
  category      varchar(100)   分类
  category_cn   varchar(100)   分类中文名
  tagline       text           宣传语（中文）
  description   text           详细描述（中文）

JSON 字段（mysql2 自动解析）：
  photo_styles  json           摄影风格数组
  style         json           风格分组数组
  highlights    json           亮点数组
  images        json           作品集图片路径数组

媒体字段：
  cover_image   varchar(500)   封面图路径
  headshot      varchar(500)   头像路径
  video_url     varchar(500)   Vimeo 视频 URL（YouTube 舍弃）
  website       varchar(500)   个人网站

来源字段：
  source_name   varchar(255)   来源名称
  source_url    varchar(500)   来源链接

管理字段：
  price         decimal(10,2)  起步价（€）
  sort_order    int            排序顺序
```

### 插入脚本模板

编写 `insert-{slug}.cjs` 脚本，在后端目录执行：

```javascript
// /Users/hongli/WorkSpace/Verra-Voile-End/insert-{slug}.cjs
const mysql = require('mysql2/promise')

async function main() {
  const pool = mysql.createPool({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'verra_voile'
  })

  // 检查是否已存在
  const [existing] = await pool.execute('SELECT slug FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  if (existing.length > 0) {
    console.log('{slug} 已存在，先删除...')
    await pool.execute('DELETE FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  }

  // 生成 images 数组
  const images = []
  for (let i = 0; i < {N}; i++) {
    images.push(`/uploads/crawled/photographers/{slug}/${String(i).padStart(2, '0')}.jpg`)
  }

  await pool.execute(
    `INSERT INTO crawled_photographers
      (slug, name, name_cn, country, country_en, category, category_cn,
       tagline, description, photo_styles, style, highlights,
       cover_image, headshot, images, video_url, website,
       source_name, source_url, price, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug, name, nameCn, country, countryEn, category, categoryCn,
      tagline, description,
      JSON.stringify(photoStyles), JSON.stringify(style), JSON.stringify(highlights),
      coverImage, headshot, JSON.stringify(images), videoUrl, website,
      sourceName, sourceUrl, price, sortOrder
    ]
  )

  console.log('✅ 已插入 crawled_photographers 表')
  // 验证
  const [rows] = await pool.execute('SELECT slug, name, name_cn, JSON_LENGTH(images) AS img_count FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  console.log('验证:', rows[0])
  await pool.end()
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
```

### 图片路径规范

所有图片使用本地路径格式：
```
/uploads/crawled/photographers/{slug}/NN.jpg
```
- 前 3 张（00-02）：vendor 展示照（封面）
- 后续（03+）：作品集图片

### 图片目录（独立图片仓库）

**⚠️ 图片统一存储到独立 Git 仓库，不再存到前端/后端目录！**

```bash
# 图片仓库目录（后端通过符号链接引用）
/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/photographers/{slug}/
```

> 后端通过符号链接引用：`Verra-Voile-End/uploads/crawled` → `Verra-Voile-Uploads/crawled`
> Vite 代理 `/uploads` 到后端，无需复制到前端或后端目录。

### 头像/Logo 处理（必须本地化）
- **每次爬取都必须检查** `static.junebugweddings.com` 域名下是否有 headshot/logo 图片
- **必须下载到本地**：`static.junebugweddings.com` 同样有 Cloudflare 防护，远程 URL 通过图片代理也会返回 403，必须用 Puppeteer 拦截 response buffer 下载到本地
- 保存路径：`Verra-Voile-Uploads/crawled/photographers/{slug}/headshot.png`（或 `.jpg`）
- 数据库 `headshot` 字段存储本地路径，如 `/uploads/crawled/photographers/spazio46/headshot.png`
- 如果没有 headshot/logo → 不设置，前端自动 fallback 到默认头像
- 下载方式：在 Puppeteer 脚本的 `page.on('response')` 中增加对 `static.junebugweddings.com` 的拦截，或在主脚本完成后单独编写下载脚本

### API 返回格式
- 列表：`GET /api/products/crawled-photographers` → `{success: true, data: [...]}`
- 详情：`GET /api/products/crawled-photographers/:slug` → `{success: true, data: {...}}`
- MySQL JSON 列由 mysql2 自动解析，前端无需 JSON.parse

### 摄影风格充实标准（参考 Margaux Kanarek）

`style` 字段应尽量充实，不强制固定分组数量，根据摄影师特点灵活调整（通常 3-5 组），每组 3-4 个条目。格式如下：

```json
[
  {
    "title": "风格定位",
    "items": [
      { "label": "私密婚礼 / 小型旅行婚礼", "desc": "专注小众、intimate 场景" },
      { "label": "美学意境", "desc": "追求画面整体的艺术感与氛围营造" },
      { "label": "时尚杂志审美", "desc": "兼具高级感与精致度（editorial aesthetic）" }
    ]
  },
  {
    "title": "光影与色调",
    "items": [
      { "label": "光影质感", "desc": "注重光线的层次与表现力" },
      { "label": "柔和色调", "desc": "低饱和、温柔的色彩倾向（soft tones）" },
      { "label": "静谧氛围", "desc": "画面传递安静、平和的情绪" }
    ]
  },
  {
    "title": "拍摄手法",
    "items": [
      { "label": "纪实叙事", "desc": "以故事线串联画面（documentary storytelling）" },
      { "label": "摒弃刻意摆拍", "desc": "不干预、不导演，追求自然状态" },
      { "label": "捕捉真实情感与动态瞬间", "desc": "强调 candid / 抓拍" },
      { "label": "关注细节", "desc": "对微小之处的敏锐观察" }
    ]
  },
  {
    "title": "整体调性",
    "items": [
      { "label": "自然随性 + 精致优雅", "desc": "看似随意实则讲究" },
      { "label": "极简 / 简约", "desc": "减法美学，去除冗余元素" },
      { "label": "个人风格化", "desc": "非流水线，有辨识度" }
    ]
  }
]
```

**分组标题参考**（根据摄影师特点灵活选择，不限于以下 4 个）：
- 风格定位 / 摄影哲学 / 核心理念
- 光影与色调 / 色彩美学 / 后期风格
- 拍摄手法 / 工作方式 / 构图特点
- 整体调性 / 情感表达 / 作品氛围
- 服务特色 / 目的地经验 / 专业领域

**每个 item 结构**：
- `label`: 简短标签（中文，4-8字）
- `desc`: 补充说明（可选，括号内可加英文术语）

**photoStyles 字段**：4 个标签，从描述中提取关键词（如：纪实叙事、自然光、私密婚礼、编辑级审美）

**highlights 字段**：3-4 个亮点，突出摄影师特色和专长

### 风格属性完整参考库

以下为 5 大类别的全部可用风格属性，充实 style 时根据摄影师描述中的关键词进行匹配选择：

**① 风格定位**
| 属性 | 匹配关键词 |
|------|------------|
| 纪实叙事 | 纪实、叙事、documentary、storytelling、故事 |
| 美学意境 | 美学、艺术、artistic、aesthetic、意境 |
| 时尚杂志审美 | 编辑、editorial、杂志、时尚、高端、奢华、luxury |
| 电影感影像 | 电影、cinematic、cinema、场景 |
| 复古胶片质感 | 胶片、film、复古、vintage、retro |
| 私密婚礼 / 小型旅行婚礼 | 私密、小型、elopement、私奔、intimate |
| 目的地婚礼专家 | 目的地、destination、全球、旅拍、国际 |
| 浪漫诗意 | 浪漫、romantic、诗意、poetic |
| 原始真实 | 原始、raw、真实、authentic、坦诚、honest |
| 编辑式构图 | 编辑式、构图、editorial、精心、精致 |

**② 光影与色调**
| 属性 | 匹配关键词 |
|------|------------|
| 自然光运用 | 自然光、natural light、光线 |
| 柔和色调 | 柔和、soft、柔、淡、温柔、低饱和 |
| 光影质感 | 光影、light、光线、明暗 |
| 暗色主义 | 暗色、dark、moody、深沉、暗调 |
| 黑白艺术 | 黑白、black white、B&W |
| 明亮通透 | 明亮、bright、通透、airy |
| 温暖怀旧色调 | 温暖、warm、怀旧、nostalgic、温馨 |
| 电影级调色 | 调色、color grading、电影感、cinematic |
| 金色光线 | 金色、golden、黄金、日落 |

**③ 拍摄手法**
| 属性 | 匹配关键词 |
|------|------------|
| 抓拍为主 | 抓拍、candid、不摆拍 |
| 摒弃刻意摆拍 | 不摆拍、non-posed、不干预、无需摆姿 |
| 引导式抓拍 | 引导、guided、放松、comfortable、自在 |
| 胶片与数码双修 | 胶片+数码、film+digital、同时使用 |
| 摄影摄像一体 | 摄影摄像、photo and film、视频、摄像 |
| 无人机航拍 | 无人机、drone、航拍、aerial |
| 创意肖像 | 创意肖像、creative portrait、肖像 |
| 细节观察 | 细节、detail、微小、观察 |
| 安静观察式 | 安静、quiet、默默、低调、discreet |
| 叙事性剪辑 | 叙事、剪辑、故事、narrative |

**④ 整体调性**
| 属性 | 匹配关键词 |
|------|------------|
| 自然随性 + 精致优雅 | 自然、随性、优雅、elegant、松弛 |
| 情感丰沛 | 情感、emotion、感受、真挚 |
| 极简 / 简约 | 极简、简约、minimal、简洁 |
| 永恒经典 | 永恒、timeless、经典、持久 |
| 个人风格化 | 个人、个性、独特、辨识度 |
| 轻松愉快 | 轻松、fun、愉快、快乐、relaxed |
| 冒险户外 | 冒险、adventure、户外、outdoor、wild |
| 温暖亲切 | 温暖、warm、朋友、亲切、贴心 |
| 史诗壮阔 | 史诗、epic、壮阔、宏大、dramatic |
| 深度人文 | 人文、human、故事、深度 |

**⑤ 服务特色**
| 属性 | 匹配关键词 |
|------|------------|
| 全球旅拍 | 全球、worldwide、旅拍、destination、飞往 |
| 双人 / 团队视角 | 双人、团队、组合、夫妻、三人 |
| 定制冒险策划 | 策划、planner、定制、冒险 |
| 本地专家 | 本地、local、当地、了解、向导 |
| 奢华婚礼经验 | 奢华、luxury、高端、premium |
| 摄影摄像全覆盖 | 摄影摄像、photo and film、摄像、影片 |
| 少量接单 / 全身心投入 | 少量、有限、每年、全身心 |
| 跨文化经验 | 跨文化、文化、international、多元 |

### 批量充实流程

1. **读取全部摄影师数据**：从数据库获取 slug、name、description、photo_styles
2. **关键词匹配**：将 description + photo_styles 合并为文本，与上述属性库的关键词逐一匹配打分
3. **分组生成**：每个类别中选取得分≥1的属性，按得分排序取 top 3-4 项；仅保留≥2项匹配的类别作为分组
4. **保底机制**：确保至少 3 个分组（不足则补充通用的「整体调性」和「拍摄手法」）；最多 5 个分组
5. **质量门槛**：每个摄影师最终 ≥ 3 组、≥ 8 项
6. **批量更新**：生成 JSON 后执行 `UPDATE crawled_photographers SET style = ? WHERE slug = ?`

---

## 第三部分：前端页面架构

### 路由
- 摄影列表页：`/photography` → `Photography.tsx`
- 摄影详情页：`/photography/:slug` → `PhotographyDetail.tsx`

### 列表页功能（Photography.tsx）
- 全屏 Hero 背景图
- 搜索框（按名称、风格搜索）
- 筛选栏：国家、摄影风格（桌面端左侧栏 + 移动端抽屉）
- 卡片列表：封面图 + 名称 + 宣传语 + 风格标签 + 价格
- 已预定（意向单）摄影师置顶显示，带花环徽章
- 数据来源：`photographerProducts` 数组（静态导入）

### 详情页模块顺序（PhotographyDetail.tsx）

```
Hero 区域（三态：骨架屏 → 视频背景 / 轮播图）
  ├── 左侧/背景：视频背景 或 轮播图（前3张） 或 骨架屏
  └── 右侧/居中：信息面板（头像、名字、标签、宣传语、网站链接）
    ↓
摄影师介绍（desc 正文）
    ↓
摄影风格（网格卡片） + 作品展（瀑布流双列，分页加载）
    ↓
底部预定栏（价格 + 咨询 + 加入意向单）
```

### Hero 区域三态逻辑（核心）

```
有 videoUrl 且非 YouTube？（通过 detectVideoProvider 判断）
├── 是 → 开始加载视频
│   ├── 加载中（0-3s）→ 骨架屏 shimmer 铺满卡片，信息面板居中叠在上方
│   ├── 加载成功（<3s）→ 视频背景播放（Vimeo iframe autoplay）
│   └── 超时（>3s）→ timedOut=true → 切换为轮播模式
└── 否（无视频 / YouTube / 超时）→ 直接轮播模式
```

**视频加载技术细节**：
- iframe 在骨架屏阶段就渲染到 DOM（`visibility: hidden`），避免 onLoad 死锁
- 视频加载成功后移除隐藏类，iframe 可见
- 超时后骨架屏和 iframe 一起移除，切换为轮播
- YouTube embed 参数：`autoplay=1&mute=1&loop=1&playlist={videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`

### 动态作品集索引
- 视频成功播放时：`galleryStart = 0`（前 3 张也纳入作品集）
- 轮播模式时：`galleryStart = 3`（前 3 张已在 Hero 轮播展示，不重复）

### 作品集“查看更多”按钮（3s 延迟出现）
- 点击后按钮立即消失，新图片开始加载（骨架屏）
- 加载完成后仍保持隐藏，直到点击后 3 秒才重新出现在底部
- 实现：`gallerySuppressUntil` 状态 + `galleryTick` 触发重渲染
- 如果没有更多内容，按钮不再出现

### 窄屏响应式（≤900px）
- 无论视频还是轮播，统一上下堆叠布局
- 视频区域：`position: relative; height: 55vh`（非全屏覆盖）
- 移除视频暗色遮罩
- 已预定状态背景色需要更高优先级选择器

---

## 第四部分：CSS 关键样式

### 样式文件
```
/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css
```

### 核心 CSS 类名

| 类名 | 用途 |
|------|------|
| `.photo-hero` | Hero 区域容器 |
| `.photo-hero__card` | Hero 卡片（`position: relative`，作为骨架屏定位上下文） |
| `.photo-hero__card--video` | 视频模式状态 |
| `.photo-hero__card--loading` | 加载状态（骨架屏可见） |
| `.photo-hero__skeleton` | 骨架屏容器（`position: absolute; inset: 0; z-index: 1`） |
| `.photo-hero__skeleton-shimmer` | shimmer 动画层 |
| `.photo-hero__video-bg` | 视频背景容器 |
| `.photo-hero__video-bg--hidden` | 视频加载阶段隐藏（`width:0; height:0`） |
| `.photo-hero__video-overlay` | 视频暗色遮罩 |
| `.photo-hero__carousel` | 轮播容器 |
| `.photo-hero__info` | 信息面板 |
| `.photo-hero__info--booked` | 已预定状态 |
| `.photo-hero__headshot` | 头像区域 |
| `.photo-booked-badge` | 已预定花环徽章 |
| `.photo-gallery__columns` | 作品集双列瀑布流 |
| `.photo-style__grid` | 摄影风格网格 |

### Shimmer 动画
```css
@keyframes photo-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 注意事项

### 爬取
1. **必须使用 Puppeteer**：Junebug 有 Cloudflare 防护，curl/WebFetch 均返回 403，只有 Puppeteer 能通过 JS Challenge
2. **AJAX API 在页面上下文中调用**：通过 `page.evaluate(async () => { fetch(...) })` 调用，利用已有的 Cloudflare clearance
3. **图片通过 response 拦截获取**：`page.on('response')` 拦截 `images.junebugweddings.com` 的图片 buffer，不能用 http.get 下载
4. **图片格式**：API 返回的可能是 `.avif`，需统一转 `.jpg`
5. **图片顺序**：前 3 张必须是页面 `.vendor__slide` vendor 展示照（封面质量），后面接画廊 + API 作品集
6. **视频 URL**：通过 `/ajax/vendor/videos` API 获取。**YouTube 视频直接舍弃不写入**，仅保留 Vimeo 等非 YouTube 视频
7. **账号 ID 获取**：从 `page.content()` 的 HTML 中提取 `vendorAccountId = {数字}` 或 `acct{数字}` 格式
8. **headshot/logo 必须检查**：从 `static.junebugweddings.com` 域名提取，有则写入 `headshot` 字段
9. **摄影师个人网站必须提取**：使用 `.see-website a` 选择器提取 "Visit Website" 按钮链接，写入 `website` 字段。若未找到则回退到 Junebug 页面链接（`source_url`）

### 数据
9. **slug 规范**：全小写，用 `-` 连接，如 `spazio46`
10. **中文名**：根据英文名音译，如 Spazio46 → 斯帕齐奥46
11. **photoStyles**：4 个标签，从描述中提取关键词
12. **style 必须充实**：3-5 个分组，每组 3-4 个条目，**最低 ≥ 3 组 ≥ 8 项**。使用「风格属性完整参考库」中的 5 大类别（风格定位、光影与色调、拍摄手法、整体调性、服务特色）根据摄影师描述关键词匹配生成
13. **highlights**：3-4 个亮点，突出摄影师特色和专长
14. **price**：整数，单位 €，无真实价格时给一个估算值（如 250-280）
15. **headshot 可选**：不设则自动用默认头像
16. **新分类**：来自新国家时必须更新 `PhotoCategory` 类型和 `photoCategoryList`
17. **图片使用本地路径**：`/uploads/crawled/photographers/{slug}/NN.jpg` 格式

### 编译验证
16. 每次数据修改后必须运行 `npx tsc --noEmit` 验证编译通过

---

## 踩坑记录

### iframe 条件渲染导致加载死锁
**问题**：iframe 只在 `videoLoaded=true` 时渲染，但 `videoLoaded` 依赖 iframe 的 `onLoad` 事件 → iframe 永远无法加载。
**解决**：将 iframe 始终渲染在 DOM 中，加载阶段用 `photo-hero__video-bg--hidden`（`width:0; height:0; overflow:hidden`）隐藏容器，iframe 设 `visibility: hidden`。

### CSS 选择器优先级导致已预定背景不生效
**问题**：`.photo-hero__card--video .photo-hero__info`（0,2,0）与 `.photo-hero__info--booked`（0,2,0）优先级相同，后者被覆盖。
**解决**：添加更高优先级选择器 `.photo-hero__card--video .photo-hero__info--booked`（0,3,0）。

### 骨架屏覆盖方式演变
**初始方案**：骨架屏在 video-bg 内部作为 flex 子元素 → 左右分栏布局
**第二版**：`position: absolute; inset: 0; z-index: 10` 覆盖整个卡片 → 信息面板被遮挡
**最终方案**：骨架屏 `absolute` 铺满卡片（z-index:1），信息面板 `position: relative; z-index: 2; background: transparent` 居中叠在上方

### Cloudflare 防护下 curl/WebFetch 全部失败
**问题**：Junebug 有 Cloudflare 防护，curl 返回 Cloudflare challenge 页面，WebFetch 返回 403 Forbidden。
**解决**：必须用 Puppeteer 启动浏览器访问页面获取 Cloudflare clearance，然后通过 `page.on('response')` 拦截网络响应获取图片 buffer，通过 `page.evaluate(fetch(...))` 在页面上下文中调用 AJAX API。

### 仅修改静态文件不会生效，必须插入数据库
**问题**：摄影师数据已从静态 TS 文件迁移到数据库架构，列表页和详情页都从 API (`/api/products/crawled-photographers`) 加载数据。仅修改 `junebugPhotographers.ts` 静态文件不会在页面上显示新摄影师，访问详情页会显示“未找到该摄影师”。
**解决**：爬取数据后必须编写插入脚本 `insert-{slug}.cjs` 将数据写入 `crawled_photographers` 数据库表，同时确保图片已下载到图片仓库 `Verra-Voile-Uploads/crawled/photographers/{slug}/` 并 commit。新增摄影师无需重新构建/部署前端。

### 头像/Logo 远程 URL 被 Cloudflare 拦截
**问题**：`static.junebugweddings.com` 同样有 Cloudflare 防护，将 headshot 字段存为远程 URL 后，前端通过图片代理加载返回 403，头像无法显示。
**解决**：必须用 Puppeteer 拦截 `static.junebugweddings.com` 的 response buffer 下载到本地，数据库存储本地路径 `/uploads/crawled/photographers/{slug}/headshot.png`。

### 页面静态图片只有 3 张
Junebug 页面 HTML 只包含 3 张 vendor 展示照（`.vendor__slide`），其余作品集通过 JS 动态加载。必须滚动 + 点击 `.load-more.is-visible` 按钮加载全部画廊。

### AJAX API 返回的 avifUri 带 _avif 后缀无法下载
**问题**：API 返回的 `avifUri` 形如 `.../hash_avif.avif`，仅替换扩展名为 `.jpg` 后变成 `.../hash_avif.jpg`，该路径不存在（404）。
**解决**：优先使用 `img.uri` 字段（不带 `_avif`）；若只有 `avifUri`，必须同时去掉 `_avif` 路径段：`url.replace(/_avif\.avif$/, '.jpg')`。

---

## 完整爬取流程（Checklist）

```
1. [ ] 获取 Junebug URL
2. [ ] 编写 Puppeteer 脚本 scripts/extract-junebug-{slug}.cjs
     - page.on('response') 拦截 images.junebugweddings.com 图片 buffer
     - 从 page.content() 提取 vendorAccountId
     - 从 static.junebugweddings.com 提取 headshot/logo（必须！）
     - 提取 DOM 数据（名称、描述、轮播图、评价等）
     - 用 `.see-website a` 提取摄影师个人网站 URL（找不到则用 Junebug 页面链接）
     - 滚动 + 循环点击 .load-more.is-visible 加载全部画廊
     - 在 page.evaluate 中调用 /ajax/vendor/portfolio API 获取完整作品集
     - 在 page.evaluate 中调用 /ajax/vendor/videos API 获取视频（YouTube 舍弃，仅保留 Vimeo）
     - 整理图片顺序：轮播图(前3张) + 画廊/作品集
     - 保存拦截的图片到 Verra-Voile-Uploads/crawled/photographers/{slug}/
     - 输出 JSON 数据文件
3. [ ] 执行脚本，验证图片全部下载成功（0 失败）
4. [ ] 在图片仓库提交：cd Verra-Voile-Uploads && git add crawled/photographers/{slug}/ && git commit -m "添加摄影师图片: {slug}"
5. [ ] 根据 JSON 数据翻译为中文，充实 style（≥3组≥8项，参考风格属性库）和 highlights（3-4个），编写插入脚本 insert-{slug}.cjs 写入 crawled_photographers 表
6. [ ] 执行插入脚本，验证 API 返回：curl http://localhost:3000/api/products/crawled-photographers/{slug}
7. [ ] 访问 /photography/{slug} 查看效果
```

---

## 相关文件

### 数据
- 数据库表：`crawled_photographers`（摄影师数据主存储）
- 静态文件（历史遗留）：`/Users/hongli/WorkSpace/Verra-Voile/src/data/junebugPhotographers.ts`
- 默认头像：`/Users/hongli/WorkSpace/Verra-Voile/src/assets/default-photographer-headshot.jpg`
- 后端插入脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/insert-{slug}.cjs`

### 脚本
- Puppeteer 提取脚本：`/Users/hongli/WorkSpace/Verra-Voile/scripts/extract-junebug-{slug}.cjs`
- 输出 JSON 数据：`/Users/hongli/WorkSpace/Verra-Voile/scripts/junebug-{slug}-data.json`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/photographers/{slug}/`

### 前端页面
- 摄影列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Photography.tsx`
- 摄影详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/PhotographyDetail.tsx`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`

### 样式
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`

### 组件
- 图片组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/FallbackImage.tsx`
- 返回按钮：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/BackButton.tsx`
