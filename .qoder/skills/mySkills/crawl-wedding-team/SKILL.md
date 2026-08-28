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
- **图片本地化**：所有图片下载到独立 Git 仓库 `Verra-Voile-Uploads/crawled/{slug}/`，不依赖外部 URL
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

#### 类型 B：第三方平台（Junebug 专用，禁止使用 Browser Agent / WebFetch）
从 Junebug Weddings 获取数据。**必须且只能用 Puppeteer 脚本**，禁止使用 Browser Agent（太慢）或 WebFetch（被 Cloudflare 拦截 403）。
- 示例：`https://junebugweddings.com/vendors/wedding-planners/italy/central-italy/THEKNOTINITALY`
- 图片质量高（平台提供高清图片）
- **无需再爬官网**：直接用 Junebug 数据即可

**Junebug 供应商页面结构**（已验证）：
```
页面从上到下：
├── 轮播图（class: vendor__slide）     → 3 张
├── 基本信息（名称、Tagline、Logo、位置、链接）
├── Why book? 描述文字
├── 画廊（class: gallery__card）        → 初始显示 9 张，点击 "View more +" 后共 21 张
├── Features 文章配图（class: features-item__image） → 不下载，跳过
├── 客户评价（Reviews）
└── 底部推荐
```

**⚠️ 重要：Junebug 页面没有「服务项目」数据**
Junebug 供应商页面不包含 services 信息。服务项目必须在编写 insert 脚本时，根据团队描述（description）、特色标签（specialties）、所在地（city/country）和评价内容**推导生成**。详见下方「服务项目生成规范」。

**唯一执行方案 — 单个 Puppeteer 脚本**：
编写 `scripts/extract-junebug-{slug}.cjs`，一个脚本完成全部工作：
1. 启动 Puppeteer 浏览器，访问 Junebug 页面
2. 通过 `page.on('response')` 拦截 `images.junebugweddings.com` 的图片 buffer
3. 滚动页面 + 循环点击 `.load-more.is-visible` 按钮加载全部画廊图片
4. 提取页面 DOM 中的所有文字数据（名称、tagline、描述、评价、网站链接、社交媒体等）
5. 提取画廊图片 URL 列表（`.gallery__card` 的 img src）
6. 将拦截到的图片 buffer 写入 `/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/{slug}/` 目录
7. 将所有提取的数据输出为 JSON 文件 `scripts/junebug-{slug}-data.json`
8. 在图片仓库执行 `git add + git commit`

**禁止的方案**（每次必须遵守）：
- ❌ 禁止用 Browser Agent（启动慢、提取慢）
- ❌ 禁止用 WebFetch（Cloudflare 返回 403）
- ❌ 禁止用 curl / http.get 下载 Junebug 图片（Cloudflare 返回 403）
- ❌ 禁止分两步脚本（先提取再下载），必须一个脚本搞定

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

#### Junebug Weddings（类型 B 数据源）
- **页面 URL 格式**：`junebugweddings.com/vendors/{category}/{country}/{region}/{vendor-name}`
- **图片 URL 特征**：`images.junebugweddings.com/xx/xx/xxxxxxxxxxxx.jpg`
- **Cloudflare 防护**：所有服务器端请求返回 403，必须用 Puppeteer 浏览器拦截方式下载
- **画廊懒加载**：初始只显示 9 张，有 "View more +" 按钮（class: `load-more`），需反复点击直到按钮消失
- **DOM 选择器**：
  - 轮播图：`.vendor__slide img`
  - 画廊：`.gallery__card`（img 元素，src 即图片 URL）
  - 加载更多：`.load-more.is-visible`（点击后按钮可能重新变为可见，需循环处理）
  - Features（不下载）：`.features-item__image`
  - **官网链接：`.see-website a`**（Junebug 标准 "Visit Website" 按钮，⚠️ 必须用此选择器）
- **数据提取**：
  - 名称：页面标题或 `.main__vendor-name` 区域
  - Tagline/描述："Why book?" 段落文字
  - 评价：Reviews 区域，包含作者、评分（全部 5 星）、内容
  - 官网链接：`.see-website a` 的 href 属性（⚠️ 禁止用通用选择器抓取，否则会抓到 `photobugcommunity.com` 广告链接或 Pinterest 等社交媒体链接）
  - 社交媒体：页面中的 Instagram/Facebook/Pinterest 链接

#### Squarespace（类型 A 官网常见）
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
| 服务类别 | 2-4 个 | 每个类别 3-7 个具体项目（**必填，不可为空**） |
| 客户评价 | 3-5 条 | 选择内容最丰富的 |
| 特色标签 | 4-6 个 | 概括核心服务特色 |

### 服务项目生成规范（⚠️ 强制执行）

**核心原则：services 字段绝不允许为空数组 `[]`。**

当数据源（如 Junebug）未提供服务项目信息时，必须根据以下信息推导生成：

1. **团队描述（description）**：从中提取核心服务类型
2. **特色标签（specialties）**：每个标签可对应一个服务项
3. **所在地（city/country）**：决定目的地婚礼、场地推荐等服务
4. **评价内容（testimonials）**：从客户评价中提取实际提供的服务

**生成规则**：
- 最少 2 个服务类别，最多 4 个
- 每个类别包含 3-7 个具体项目
- 必须包含「婚礼策划」类（核心业务）和「目的地/场地」类（地域特色）
- 服务项目名称要具体，不要泛泛而谈

**标准模板**（根据团队实际情况调整）：
```json
[
  {
    "title": "Wedding Planning",
    "title_cn": "婚礼策划",
    "items": [
      { "label": "Full Wedding Planning", "label_cn": "全程婚礼策划", "desc": "From concept to completion...", "desc_cn": "从构思到完成的全方位策划服务" },
      { "label": "Day-of Coordination", "label_cn": "婚礼当天统筹", "desc": "Seamless execution...", "desc_cn": "确保婚礼当天每个环节无缝衔接" },
      { "label": "Wedding Design", "label_cn": "婚礼设计", "desc": "Creative vision...", "desc_cn": "打造独特的婚礼视觉风格和主题" }
    ]
  },
  {
    "title": "Destination Services",
    "title_cn": "目的地服务",
    "items": [
      { "label": "Venue Selection", "label_cn": "场地推荐", "desc": "Curated venue portfolio...", "desc_cn": "精选当地优质婚礼场地资源" },
      { "label": "Vendor Coordination", "label_cn": "供应商协调", "desc": "Trusted vendor network...", "desc_cn": "可靠本地供应商网络与协调管理" },
      { "label": "Guest Management", "label_cn": "宾客管理", "desc": "Accommodation and logistics...", "desc_cn": "宾客住宿、交通和活动安排" }
    ]
  }
]
```

**检查清单**（insert 脚本执行前必须确认）：
- [ ] `services` 不是空数组
- [ ] 至少有 2 个服务类别
- [ ] 每个类别至少有 3 个具体项目
- [ ] 所有文本已翻译为中文（`_cn` 字段）

### 中文名翻译规范

- **公司名**：音译 + 意译结合，如 `Wild Hearts Elopements` → `狂野之心私密婚礼`
- **人名**：标准音译，如 `Laura Gonzalez` → `劳拉·冈萨雷斯`
- **城市名**：使用官方中文名，如 `Aberdeen` → `阿伯丁`
- **Tagline**：意译为主，保持简洁优美，如 `苏格兰私密婚礼专家 · 高地城堡与湖泊的浪漫庆典`
- **Tagline 长度规范**：必须控制在 **22-30 字**，格式为「核心定位 · 亮点特色」。参考现有数据：
  - 斯波夏莫薇: 意大利奢华目的地婚礼策划 · Vogue 推荐顶级策划团队 (29字)
  - 拉费特: 英国奢华婚礼与活动策划 · 精通法意西四国语言 (23字)
  - 艾米·邓恩: 伦敦奢华婚礼与活动策划 · 十年高端策划经验 (22字)
  - 狂野之心: 苏格兰私密婚礼专家 · 高地城堡与湖泊的浪漫庆典 (24字)

---

## 第二部分：图片下载与本地化

### 目录结构
```
/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/{slug}/
├── cover/cover.jpg          # 封面图
├── headshot/headshot.jpg    # 头像
├── team/                    # 团队成员头像（可选）
└── portfolio/01.jpg ~ N.jpg # 作品集（15-20 张）
```

**⚠️ 图片必须下载到独立 Git 仓库，不是后端目录！**
- 仓库位置：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/`
- 后端通过符号链接引用：`Verra-Voile-End/uploads/crawled` → `Verra-Voile-Uploads/crawled`
- 无需复制到前端目录（Vite 代理 `/uploads` 到后端）

### 下载脚本模板

**推荐模式：下载+插入合并脚本**（一个脚本完成图片下载和数据库插入）

```javascript
// scripts/insert-{slug}.cjs
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

const BASE_DIR = path.join('/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/{slug}')

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

### 下载后必须提交到图片仓库

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-Uploads
git add crawled/{slug}/
git commit -m "feat: 添加婚礼团队 {name} 图片"
```

**原因**：图片存储在独立 Git 仓库（Verra-Voile-Uploads），后端通过符号链接引用。新增图片必须 commit 才有版本控制备份。无需复制到前端或后端目录。

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
6. **提交到图片仓库**：下载后必须在 `Verra-Voile-Uploads` 仓库执行 `git add + git commit`
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

### 前端无法访问图片（已解决）
**旧问题**：图片下载到后端，但 Vite 从前端目录提供静态文件，需要手动复制。
**现架构**：图片统一存储在独立 Git 仓库 `Verra-Voile-Uploads/`，后端通过符号链接引用，Vite 代理 `/uploads` 到后端。无需复制。

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
**解决**：Browser Agent 提示词中明确要求"滚动到页面底部"，等待懒加载完成后再提取图片 URL。

### Junebug "View more +" 按钮导致图片数量严重不足
**问题**：Junebug 画廊初始只显示 9 张图片，未点击 "View more +" 按钮导致只下载到 9 张（实际有 21 张）。
**解决**：用 Puppeteer 循环点击 `.load-more.is-visible` 按钮，每轮点击后等待 2 秒，直到没有可见的按钮为止。最终可获取全部 21 张画廊图片。

### Junebug 图片下载返回 403 Forbidden
**问题**：`images.junebugweddings.com` 有 Cloudflare 防护，curl/Node http 等服务器端请求全部返回 403。
**解决**：必须用 Puppeteer 启动浏览器访问页面获取 Cloudflare clearance，然后通过 `page.on('response')` 拦截网络响应获取图片 buffer 写入文件。不能用传统的 http.get() 方式下载。

### Junebug tagline 字段存了英文未翻译
**问题**：插入脚本中 tagline 直接存了英文原文，前端显示英文。
**解决**：tagline 字段直接存中文翻译，数据库无 `tagline_cn` 列。所有面向用户显示的文本字段都必须存中文。

### Junebug 批量爬取时 services 字段被遗漏
**问题**：批量爬取 41 个 Junebug 团队时，insert 脚本全部写入 `services: []` 空数组，导致详情页「服务项目」模块不显示。
**根因**：Junebug 页面本身不包含 services 数据，提取脚本正确返回空值。但编写 insert 脚本时未根据团队描述、特色标签和所在地推导生成服务项目。
**解决**：编写 insert 脚本时，**必须**根据以下信息推导生成 2-4 个服务类别：
- 团队描述（description）→ 提取核心服务类型
- 特色标签（specialties）→ 每个标签对应一个服务项
- 所在地（city/country）→ 目的地婚礼、场地推荐等服务
- 评价内容（testimonials）→ 实际提供的服务
**流程更新**：在 SKILL.md Type B checklist 第 5 步增加强制检查项，insert 脚本执行前必须确认 services 非空。

### Junebug website 字段提取选择器错误
**问题**：批量爬取 46 个 Junebug 团队时，website 字段全部为空或存了错误的 Pinterest/Vimeo 链接，导致详情页「Visit Website」按钮不显示或跳转错误。
**根因**：提取脚本中使用了通用选择器抓取外部链接，结果抓到的是 `photobugcommunity.com`（Junebug 广告链接）或 Pinterest 社交媒体链接，而非供应商真实官网。为避免存错数据，insert 脚本直接留空。
**解决**：Junebug 页面的 "Visit Website" 按钮有固定选择器 **`.see-website a`**，必须用此选择器提取 href。禁止用通用外部链接选择器，否则会抓到广告或社交媒体链接。
**流程更新**：在 DOM 选择器列表中明确标注官网链接选择器为 `.see-website a`，并在数据提取说明中增加警告。

### 下载脚本与插入脚本分离导致流程碎片化
**问题**：早期将图片下载和数据插入分成两个脚本，执行时容易漏掉其中一步。
**解决**：合并为单一脚本 `insert-{slug}.cjs`，先下载图片再插入数据库，一个命令完成全部操作。

---

## 完整流程（Checklist）

```
类型 A（官网）流程：
1. [ ] 获取目标官网 URL
2. [ ] 使用 Browser Agent 爬取全部页面数据（基础信息、团队、服务、图片、评价）
3. [ ] 翻译所有文本内容为中文
4. [ ] 精选 15-20 张最佳作品图片
5. [ ] 编写合并脚本 scripts/insert-{slug}.cjs（含图片下载 + 数据插入）
     - ⚠️ 必须包含 services 数据（最少 2 个类别，每类最少 3 个项目）
6. [ ] 执行脚本，验证全部图片下载成功（0 失败）
7. [ ] 在图片仓库提交：cd Verra-Voile-Uploads && git add crawled/{slug}/ && git commit
8. [ ] 验证 API 返回：curl http://localhost:3000/api/products/crawled-wedding-teams/{slug}
9. [ ] 访问 /wedding-team/{slug} 查看页面效果

类型 B（Junebug）流程 — 固定方案，禁止使用其他方法：
1. [ ] 获取 Junebug 供应商 URL
2. [ ] 编写单个 Puppeteer 脚本 scripts/extract-junebug-{slug}.cjs
     - 访问页面 + page.on('response') 拦截图片 buffer
     - 滚动 + 循环点击 .load-more.is-visible 加载全部画廊
     - 提取 DOM 文字数据（名称、tagline、描述、评价、网站、社交媒体）
     - 提取画廊图片 URL 列表（.gallery__card img src）
     - 保存图片到 Verra-Voile-Uploads/crawled/{slug}/ + 输出 JSON 数据文件
3. [ ] 执行脚本，验证图片全部下载成功
4. [ ] 在图片仓库提交：cd Verra-Voile-Uploads && git add crawled/{slug}/ && git commit
5. [ ] 根据 JSON 数据翻译为中文，编写 insert-{slug}.cjs 插入数据库
     - ⚠️ **必须生成 services 数据**（Junebug 页面不提供，需根据描述/特色/所在地推导）
     - ⚠️ services 绝不允许为空数组，最少 2 个类别，每类最少 3 个项目
     - 参考上方「服务项目生成规范」的标准模板
6. [ ] 执行插入脚本前检查：services 非空、team_members/testimonials 尽量填充
7. [ ] 执行插入脚本，验证数据入库
8. [ ] 验证 API 返回：curl http://localhost:3000/api/products/crawled-wedding-teams/{slug}
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
如果返回 `text/html` 或 404，说明图片仓库符号链接断裂或文件不存在。检查 `ls -lh Verra-Voile-End/uploads/crawled`。

---

## 相关文件

### 后端
- 数据库路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 图片代理：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/imageProxy.js`
- 插入脚本（类型 A）：`/Users/hongli/WorkSpace/Verra-Voile-End/insert-{slug}.cjs`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/{slug}/`

### 图片仓库
- 图片统一存储：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/{slug}/`
- 后端符号链接：`Verra-Voile-End/uploads/crawled` → `Verra-Voile-Uploads/crawled`

### 前端
- 列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/WeddingTeam.tsx`
- 详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/WeddingTeamDetail.tsx`
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`

### 现有数据参考
- sposiamovi（意大利，€5,000）：`insert-sposiamovi.cjs`
- la-fete（英国，€15,000）：`insert-la-fete.cjs`
- aimee-dunne（英国，€12,000）：`insert-aimee-dunne.cjs`
- wild-hearts-elopements（英国，€5,000）：`insert-wild-hearts.cjs`
- the-knot-in-italy（意大利，€15,000，类型 B Junebug）：`insert-theknotinitay.cjs` + `download-theknot-images.cjs`
