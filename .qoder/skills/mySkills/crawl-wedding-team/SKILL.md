---
name: crawl-wedding-team
description: 从婚礼策划公司官网或第三方平台爬取数据，下载图片到本地，插入数据库，自动生成婚礼团队详情页。当用户说"爬取婚礼团队"、"添加婚礼策划公司"、"抓取wedding team"时触发。
---

# 爬取婚礼团队数据并生成详情页

## 概述
从婚礼策划公司官网（或 Junebug 等第三方平台）爬取数据，下载图片到本地存储，插入 `crawled_wedding_teams` 数据库表。前端自动从 API 获取数据渲染列表和详情页，**无需修改前端代码**。

## 适用场景
- 用户提供婚礼策划公司官网 URL，需要爬取并添加到婚礼团队列表
- 从 Junebug Weddings 等第三方平台爬取婚礼策划公司
- 更新现有婚礼团队的图片、服务、描述等数据

## 架构特点
- **数据库驱动**：数据存储在 `crawled_wedding_teams` 表，前端通过 API 动态获取
- **图片本地化**：所有图片下载到本地 `uploads/crawled/{slug}/` 目录，不依赖外部 URL
- **零前端改动**：新增/更新婚礼团队只需数据库操作，前端自动适配
- **双语支持**：所有文本字段支持中英文（`_cn` 后缀），中文直接存入主字段

## 前置条件
- 后端 Node.js 环境 + mysql2 依赖
- 后端运行在 `localhost:3000`
- 前端运行在 `localhost:5173`

---

## 第一部分：数据爬取

### 数据源类型

#### 类型 A：公司官网（推荐）
直接从婚礼策划公司官网爬取，数据最完整。
- 示例：`https://la-fete.com/about/`、`https://aimeedunne.com/`
- 使用 Browser Agent 爬取全部页面

#### 类型 B：第三方平台
从 Junebug Weddings 等平台获取基础数据，再补充官网信息。
- 示例：`https://junebugweddings.com/vendors/wedding-planners/united-kingdom/london/La-Fete`
- 图片质量高（平台提供高清图片）

### Step 1：使用 Browser Agent 爬取官网

**必须爬取的信息**：

| 字段 | 说明 | 来源页面 |
|------|------|----------|
| 公司名称 | 英文名 + 中文名（音译） | 首页/About |
| Tagline | 一句话宣传语 | 首页 |
| 描述 | 完整的 About 文本，翻译为中文 | About 页 |
| 团队成员 | 姓名、职位、简介、头像（含中英文） | About/Team 页 |
| 服务项目 | 类别、项目名、描述（含中英文） | Services 页 |
| 作品集图片 | 高清 URL（选 15-20 张最佳的） | Gallery/Portfolio 页 |
| 客户评价 | 客户名、评价内容（含中英文） | Testimonials 页 |
| 特色标签 | 4-6 个关键词标签 | 首页/About |
| 成立年份 | 数字 | About 页 |
| 联系方式 | 地址、电话、邮箱、社交媒体 | Contact 页 |
| 封面图 | 最佳的一张作为封面 | 首页 Hero |
| 头像 | 创始人/团队合照 | About 页 |

**Browser Agent 提示词模板**（直接复制使用，替换 `{URL}` 为实际网址）：

```
Please visit {URL} and extract ALL information thoroughly for creating a wedding team product listing.

Visit ALL pages in the navigation menu. Be extremely thorough.

1. **Homepage**: Extract tagline, description, hero images, any featured content
2. **About page**: Full about text, founder bio, team members with names/roles/bios/photos
3. **Services page**: ALL services offered with detailed descriptions, packages, pricing if available
4. **Gallery/Portfolio page**: ALL high-resolution image URLs (click through galleries, get full resolution not thumbnails)
5. **Contact page**: Email, phone, address, social media links
6. **Testimonials/Reviews**: Any client testimonials
7. **FAQ**: Any frequently asked questions
8. **Blog**: Check if there's a blog with relevant content

For EACH page, extract:
- ALL text content (every paragraph, every heading)
- ALL image URLs (full resolution, not thumbnails)
- Navigation structure and all page URLs

Important notes:
- Scroll down to load ALL images (many sites use lazy loading)
- Click into gallery lightboxes to get full-resolution URLs
- Note the platform used (Squarespace, Wix, WordPress, etc.)
- Get team member photo URLs from About/Team pages
```

**爬取要点**：
- 导航到所有子页面（/about/、/services/、/gallery/、/contact/）
- **滚动到页面底部**确保懒加载图片全部加载
- 图片要获取完整分辨率 URL（非缩略图），Squarespace 站点加 `?format=1500w`
- 所有文本内容需翻译为中文
- 记录网站使用的建站平台（Squarespace/Wix/WordPress 等），影响图片提取策略

### Step 2：补充第三方平台数据（可选）

如果从 Junebug 等平台获取补充数据：
- 高清图片（Junebug 图片质量好）
- 简短描述
- "Visit Website" 链接指向的官网 URL

### 常见建站平台提取技巧

#### Squarespace（最常见）
- **图片 URL 特征**：`images.squarespace-cdn.com/content/v1/...`
- **获取高清版**：URL 末尾加 `?format=1500w` 或 `?format=2500w`
- **懒加载**：Squarespace 大量使用懒加载，必须滚动到页面底部
- **Gallery 页**：点击图片打开 lightbox，从浏览器地址栏或开发者工具获取完整 URL
- **HTTP/HTTPS 混合**：部分图片 URL 是 `http://`，下载脚本需同时支持两种协议

#### Wix
- **图片 URL 特征**：`static.wixstatic.com/media/...`
- **获取高清版**：URL 参数中修改质量参数，如 `quality/90`
- **动态加载**：Wix 使用 SPA 架构，需等待页面完全加载

#### WordPress
- **图片 URL 特征**：通常在 `wp-content/uploads/` 目录下
- **较简单**：图片通常直接嵌入页面，不需要特殊处理

---

## 数据量标准与翻译规范

### 数据量指导

| 数据类型 | 推荐数量 | 说明 |
|---------|---------|------|
| 作品集图片 | 15-20 张 | 精选质量最好的，不要凑数 |
| 团队成员 | 1-5 人 | 小型团队通常 1-3 人 |
| 服务类别 | 2-4 个 | 每个类别 3-7 个具体项目 |
| 客户评价 | 3-5 条 | 选择内容最丰富的 |
| 特色标签 | 4-6 个 | 概括核心服务特色 |

### 中文名翻译规范

- **公司名**：音译 + 意译结合，如 `Wild Hearts Elopements` → `狂野之心私密婚礼`
- **人名**：标准音译，如 `Laura Gonzalez` → `劳拉·冈萨雷斯`
- **城市名**：使用官方中文名，如 `Aberdeen` → `阿伯丁`
- **Tagline**：意译为主，保持简洁优美，如 `苏格兰私密婚礼专家 · 高地城堡与湖泊的浪漫庆典`

---

## 第二部分：图片下载与本地化

### 目录结构
```
uploads/crawled/{slug}/
├── cover/cover.jpg          # 封面图
├── headshot/headshot.jpg    # 头像
└── portfolio/01.jpg ~ N.jpg # 作品集（15-20 张）
```

### 下载脚本模板

**推荐模式：下载+插入合并脚本**（一个脚本完成图片下载和数据库插入）

```javascript
// scripts/insert-{slug}.cjs
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const BASE_DIR = path.join(__dirname, '../uploads/crawled/{slug}')

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://{source-domain}/',  // 必须设置，否则返回 403
      },
      timeout: 30000,
    }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      const ws = fs.createWriteStream(dest)
      res.pipe(ws)
      ws.on('finish', () => { ws.close(); resolve() })
      ws.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout for ${url}`)) })
  })
}

async function main() {
  const pool = mysql.createPool({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'verra_voile' })

  // 检查是否已存在
  const [existing] = await pool.execute('SELECT id FROM crawled_wedding_teams WHERE slug = ?', ['{slug}'])
  if (existing.length > 0) {
    console.log('{slug} 已存在，跳过')
    await pool.end()
    return
  }

  // 创建目录
  for (const sub of ['cover', 'headshot', 'portfolio']) {
    fs.mkdirSync(path.join(BASE_DIR, sub), { recursive: true })
  }

  // 图片 URL 列表
  const coverUrl = '...'
  const headshotUrl = '...'
  const portfolioUrls = ['...', '...']

  let ok = 0, fail = 0

  // 下载封面
  try {
    await download(coverUrl, path.join(BASE_DIR, 'cover', 'cover.jpg'))
    console.log('✅ cover/cover.jpg')
    ok++
  } catch (e) { console.error('❌ cover:', e.message); fail++ }

  // 下载头像
  try {
    await download(headshotUrl, path.join(BASE_DIR, 'headshot', 'headshot.jpg'))
    console.log('✅ headshot/headshot.jpg')
    ok++
  } catch (e) { console.error('❌ headshot:', e.message); fail++ }

  // 下载作品集
  for (let i = 0; i < portfolioUrls.length; i++) {
    const url = portfolioUrls[i]
    const name = `${String(i + 1).padStart(2, '0')}.jpg`
    try {
      await download(url, path.join(BASE_DIR, 'portfolio', name))
      console.log(`✅ portfolio/${name}`)
      ok++
    } catch (e) { console.error(`❌ portfolio/${name}:`, e.message); fail++ }
  }

  console.log(`\n下载完成: ${ok} 成功, ${fail} 失败`)

  // 插入数据库
  // ... (见下方插入脚本模板)

  await pool.end()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
```

### 下载后必须复制到前端目录

```bash
# 后端目录 → 前端目录（Vite sirv 从前端目录提供静态文件）
cp -r /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/{slug} \
      /Users/hongli/WorkSpace/Verra-Voile/uploads/crawled/{slug}
```

**原因**：前端 Vite dev server 用 `sirv` 中间件从前端 `uploads/` 目录提供静态文件，后端 `uploads/` 目录的图片前端无法直接访问。

### 图片代理白名单

如果保留外部 URL（不下载本地），需将域名加入白名单：

```javascript
// src/routes/imageProxy.js → ALLOWED_DOMAINS 数组
'aimeedunne.com',
'www.aimeedunne.com',
```

修改后需重启后端：`lsof -ti:3000 | xargs kill -9; cd Verra-Voile-End && node src/index.js &`

---

## 第三部分：数据库插入

### 表结构（crawled_wedding_teams）

```
基础字段：
  slug          varchar(100)   # URL 标识，如 'aimee-dunne'
  name          varchar(200)   # 英文名
  name_cn       varchar(200)   # 中文名
  source_url    varchar(500)   # 数据来源 URL
  country       varchar(100)   # 国家英文
  country_cn    varchar(100)   # 国家中文
  city          varchar(100)   # 城市英文
  city_cn       varchar(100)   # 城市中文
  tagline       varchar(500)   # 宣传语
  description   text           # 详细描述（直接存中文）
  story         text           # 品牌故事
  founded_year  int            # 成立年份

JSON 字段（mysql2 自动解析）：
  team_members  json           # 团队成员数组
  services      json           # 服务项目数组
  service_areas json           # 服务地区数组
  specialties   json           # 特色标签数组
  testimonials  json           # 客户评价数组
  faq           json           # 常见问题数组
  partners      json           # 合作伙伴数组
  images        json           # 作品集图片路径数组

媒体字段：
  cover_image   varchar(500)   # 封面图路径
  headshot      varchar(500)   # 头像路径
  website       varchar(500)   # 官网 URL

管理字段：
  price         int            # 起步价（€）
  sort_order    int            # 排序权重
  created_at    timestamp      # 创建时间
```

### JSON 字段格式

#### team_members
```json
[
  {
    "name": "Aimee Dunne",
    "name_cn": "艾米·邓恩",
    "role": "Founder / Wedding & Event Planner",
    "role_cn": "创始人 / 婚礼与活动设计师",
    "image": "",
    "description": "English bio...",
    "description_cn": "中文简介...",
    "link": "https://aimeedunne.com/about/"
  }
]
```
- `image`：团队成员头像 URL，无则留空（前端用默认头像）
- `link`：点击跳转到原网站对应页面的链接

#### services
```json
[
  {
    "title": "Luxury Wedding Planning",
    "title_cn": "奢华婚礼策划",
    "items": [
      {
        "label": "Bespoke Wedding Design",
        "label_cn": "定制婚礼设计",
        "desc": "Fully personalized...",
        "desc_cn": "完全个性化的..."
      }
    ]
  }
]
```

#### images
```json
[
  "/uploads/crawled/aimee-dunne/portfolio/01.jpg",
  "/uploads/crawled/aimee-dunne/portfolio/02.jpg"
]
```
本地路径格式：`/uploads/crawled/{slug}/portfolio/NN.jpg`

#### specialties
```json
["奢华婚礼策划", "伦敦及英国全境", "目的地婚礼", "帐篷婚礼"]
```

#### testimonials
```json
[
  {
    "author": "Amy & Karl",
    "role": "London Wedding",
    "content": "English testimonial...",
    "content_cn": "中文评价..."
  }
]
```

### 数据库插入 SQL 参考

插入语句格式（在合并脚本的 `main()` 函数中，下载图片后执行）：

```javascript
await pool.execute(
  `INSERT INTO crawled_wedding_teams
    (slug, name, name_cn, source_url, country, country_cn, city, city_cn,
     tagline, description, founded_year,
     team_members, services, images, specialties, testimonials,
     cover_image, headshot, website, price, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    slug, name, name_cn, source_url, country, country_cn, city, city_cn,
    tagline, description, founded_year,
    JSON.stringify(team_members), JSON.stringify(services), JSON.stringify(images),
    JSON.stringify(specialties), JSON.stringify(testimonials),
    cover_image, headshot, website, price, sort_order
  ]
)
```

### 价格规范
- 单位：€（欧元）
- 范围：€5,000 ~ €18,000
- 根据公司规模、定位、地区综合定价
- 前端根据 `country` 字段自动切换货币符号（UK → £，其他 → €）

---

## 第四部分：前端页面架构

### 路由
- 列表页：`/wedding-team` → `WeddingTeam.tsx`
- 详情页：`/wedding-team/:slug` → `WeddingTeamDetail.tsx`

### API 接口
- 列表：`GET /api/products/crawled-wedding-teams`
- 详情：`GET /api/products/crawled-wedding-teams/:slug`

### 列表页（WeddingTeam.tsx）
- 全屏 Hero + 搜索框
- 筛选栏：国家、服务特色
- 卡片展示：封面图 + 名称 + 宣传语 + 特色标签 + 价格
- 价格显示：`€XX,XXX起` 或 `£XX,XXX起`（根据 country 自动判断）
- 数据来源：API 动态获取

### 详情页模块顺序（WeddingTeamDetail.tsx）
```
Hero 区域（轮播图 + 信息面板）
  ├── 轮播：cover + 前 2 张作品
  └── 信息面板：头像、名称、国家、成立年份、宣传语
    ↓
关于我们（description 正文）
    ↓
团队成员（网格卡片，头像 + 姓名 + 职位 + 描述 + 查看主页链接）
    ↓
服务项目（分类网格展示）
    ↓
作品集（动态列瀑布流：宽屏3列、中屏2列、手机1列）
    ↓
客户评价
    ↓
底部预定栏（价格 + 咨询按钮）
```

### 团队成员卡片设计
- 头像可点击，跳转到原网站对应页面（`team_members[].link` 字段）
- 描述全部展示（不截断）
- 底部「查看主页 ↗」链接
- 使用 flex 布局，链接始终在卡片底部

### 响应式规则
| 断点 | 作品集列数 | 团队成员列 | 服务项目 |
|------|-----------|-----------|---------|
| ≥1100px | 3 列 | auto-fill (220px) | 全部展示 |
| 500-1100px | 2 列 | 2 列 | 全部展示 |
| <500px | 1 列 | 2 列 | 最多2组+更多 |
| ≤900px | - | - | padding 调整 |

---

## 第五部分：CSS 关键样式

### 样式文件
```
/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css
```

### 核心 CSS 类名

| 类名 | 用途 |
|------|------|
| `.wt-hero` | Hero 区域容器 |
| `.wt-hero__slide` | 轮播幻灯片 |
| `.wt-hero__info` | 信息面板 |
| `.wt-hero__headshot` | 头像区域 |
| `.wt-team-section` | 团队成员 section（`padding: 50px 5%`） |
| `.wt-team-grid` | 团队成员网格 |
| `.wt-team-card` | 团队成员卡片（flex column） |
| `.wt-team-card__avatar-link` | 头像链接（可点击跳转） |
| `.wt-team-card__desc` | 描述文字 |
| `.wt-team-card__link` | 「查看主页」链接 |
| `.wt-services__grid` | 服务项目网格 |
| `.wt-portfolio__columns` | 作品集多列布局 |
| `.cd-book-bar` | 底部预定栏 |

### 宽度规范
所有区域统一 `padding: 0 5%` 水平间距，窄屏 `0 3%`。

---

## 注意事项

### 爬取
1. **优先官网**：官网数据最完整，第三方平台作为补充
2. **图片选择**：从大量图片中精选 15-20 张质量最好的
3. **中文翻译**：所有文本必须翻译为中文，翻译质量要高
4. **服务提炼**：不要照搬原文，要根据实际服务内容总结提炼

### 图片
5. **必须本地化**：图片下载到本地，不依赖外部 URL
6. **前后端同步**：下载后必须 `cp -r` 复制到前端 `uploads/` 目录
7. **防盗链**：如果保留外部 URL，需将域名加入图片代理白名单
8. **Cloudflare 防护**：受 Cloudflare 保护的站点图片必须下载到本地

### 数据
9. **slug 规范**：全小写，用 `-` 连接，如 `aimee-dunne`
10. **description 直接存中文**：数据库无 `description_cn` 列，中文直接存 `description`
11. **sort_order**：控制列表排序，数字越大越靠后
12. **price**：整数，单位 €，范围 €5,000-€18,000

### 后端
13. **重启后端**：修改白名单或路由后必须重启
14. **JSON 字段**：mysql2 自动解析，前端无需手动 JSON.parse

---

## 踩坑记录

### 前端无法访问后端 uploads 目录的图片
**问题**：图片下载到后端 `Verra-Voile-End/uploads/`，但 Vite sirv 从前端 `Verra-Voile/uploads/` 提供静态文件。
**解决**：下载后必须 `cp -r` 复制到前端目录。

### 图片代理返回 403
**问题**：外部图片域名不在 `ALLOWED_DOMAINS` 白名单中。
**解决**：将域名加入 `src/routes/imageProxy.js` 的 `ALLOWED_DOMAINS` 数组，重启后端。

### 窄屏媒体查询覆盖 padding-bottom
**问题**：基础样式设了 `padding-bottom: 80px`，但窄屏 `@media` 中 `padding: 0 3%` 覆盖了底部间距，导致内容被底部预定栏遮挡。
**解决**：窄屏媒体查询中也要保留底部间距 `padding: 0 3% 100px`。

### 团队成员头像远程 URL 404 导致持续加载
**问题**：`team_members[].image` 存了失效的远程 URL，前端持续尝试加载直到超时。
**解决**：清空失效的远程 URL（设为空字符串），让前端回退到默认头像。

### description 字段无 _cn 回退
**问题**：前端映射 `item.description || ''`，无 `description_cn` 回退。
**解决**：中文直接存入 `description` 字段，与 sposiamovi 保持一致。

### Squarespace 图片下载返回 403
**问题**：Squarespace CDN 图片需要正确的 Referer 头，否则返回 403 Forbidden。
**解决**：下载脚本中设置 `Referer: https://{source-domain}/`，同时设置 `User-Agent` 模拟浏览器。

### HTTP/HTTPS 混合内容导致下载失败
**问题**：部分 Squarespace 站点的图片 URL 是 `http://` 而非 `https://`，用 `https.get()` 下载会失败。
**解决**：下载函数中根据 URL 协议动态选择 `http` 或 `https` 模块：`const client = url.startsWith('https') ? https : http`

### Squarespace 懒加载导致图片遗漏
**问题**：Browser Agent 爬取时只获取了首屏图片，滚动后才加载的图片被遗漏。
**解决**：Browser Agent 提示词中明确要求“滚动到页面底部”，等待懒加载完成后再提取图片 URL。

### 下载脚本与插入脚本分离导致流程碎片化
**问题**：早期将图片下载和数据插入分成两个脚本，执行时容易漏掉其中一步。
**解决**：合并为单一脚本 `insert-{slug}.cjs`，先下载图片再插入数据库，一个命令完成全部操作。

---

## 完整流程（Checklist）

```
1. [ ] 获取目标网站 URL
2. [ ] 使用 Browser Agent 爬取全部页面数据（基础信息、团队、服务、图片、评价）
3. [ ] 翻译所有文本内容为中文
4. [ ] 精选 15-20 张最佳作品图片
5. [ ] 编写合并脚本 scripts/insert-{slug}.cjs（含图片下载 + 数据插入）
6. [ ] 执行脚本，验证全部图片下载成功（0 失败）
7. [ ] 复制图片到前端目录：cp -r 后端uploads → 前端uploads
8. [ ] 验证 API 返回：curl http://localhost:3000/api/products/crawled-wedding-teams/{slug}
9. [ ] 验证图片可访问：curl -I http://localhost:5173/uploads/crawled/{slug}/cover/cover.jpg
10. [ ] 访问 /wedding-team/{slug} 查看页面效果
```

### 验证步骤示例

**验证 API 返回**：
```bash
curl -s http://localhost:3000/api/products/crawled-wedding-teams/wild-hearts-elopements | jq '{name, slug, country, price, team_count: (.team_members | length), images_count: (.images | length)}'
```
预期输出：
```json
{
  "name": "Wild Hearts Elopements",
  "slug": "wild-hearts-elopements",
  "country": "United Kingdom",
  "price": 5000,
  "team_count": 1,
  "images_count": 15
}
```

**验证图片可访问**：
```bash
curl -I http://localhost:5173/uploads/crawled/wild-hearts-elopements/cover/cover.jpg
```
预期输出：
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 172345
```
如果返回 `text/html` 或 404，说明图片未复制到前端目录。

---

## 相关文件

### 后端
- 数据库路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 图片代理：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/imageProxy.js`
- 合并脚本（下载+插入）：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/insert-{slug}.cjs`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/{slug}/`

### 前端
- 列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/WeddingTeam.tsx`
- 详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/WeddingTeamDetail.tsx`
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile/uploads/crawled/{slug}/`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`

### 现有数据参考
- sposiamovi（意大利，€5,000）：`scripts/insert-sposiamovi.cjs`
- la-fete（英国，€15,000）：`scripts/insert-la-fete.cjs`
- aimee-dunne（英国，€12,000）：`scripts/insert-aimee-dunne.cjs`
- wild-hearts-elopements（英国，€5,000）：`scripts/insert-wild-hearts.cjs`
