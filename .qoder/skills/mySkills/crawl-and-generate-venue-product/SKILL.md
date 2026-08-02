# 爬取数据生成婚礼场地商品

## 概述
从 WeddingWire/mariages.net/hitched.co.uk 爬取婚礼场地详情页，提取图片、描述、特色、评分等数据，翻译为中文后入库，并通过前端渲染为高质量场地详情页，面向终端用户展示。

## 适用场景
- 用户提供 WeddingWire 场地详情页 URL，需要爬取并展示
- 批量爬取多个场地详情页并生成商品
- 优化现有场地详情页的布局与内容结构
- 需要快速预览爬取数据质量

## 前置条件
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End` 可访问数据库
- MySQL 数据库 `crawled_venues` 和 `crawled_destinations` 表已存在（首次运行爬取脚本会自动创建）
- Node.js 环境，已安装 `cheerio`、`mysql2`、`dotenv`

## 数据库连接信息
- **本地**: host=localhost, port=3306, user=root, password=(空), database=verra_voile
- **服务器**: host=47.99.138.250, port=13306, user=root, password=caoqiangiot@123, database=verra_voile

---

## 第一部分：爬取流程

### 步骤 1：运行爬取脚本

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/crawl-venue-detail.cjs [URL]
```

**参数**：
- `URL`（可选）：WeddingWire 场地详情页 URL
- 默认 URL：`https://www.weddingwire.com/destination-wedding/destination/domaine-de-beauregard--e2229202`

**脚本功能**：
1. 请求目标页面（使用 Browser User-Agent 绕过限制）
2. 提取场地名称、描述、图片、评分、评论数、位置、特色等
3. 过滤非场地图片（只保留 vendor 图片）
4. 图片 URL 替换为 1920px 高清版本
5. 创建 `crawled_venues` 表（如不存在）
6. 插入或更新数据（根据 slug 去重）

### ⚠️ 步骤 1.5：爬取失败时使用 Browser Agent（关键提速）

**当爬取脚本返回 0 张图片、位置乱码、或描述为空时**，说明页面依赖 JS 渲染或反爬严格。此时应立即使用 Browser Agent 访问页面提取真实数据：

```
使用 Browser Agent 访问目标 URL，提取：
1. 所有图片 URL（特别是 vendor 图片）
2. 完整地址文本
3. 完整描述文本
4. 评分和评论数
5. 特色/服务列表
6. 场地类型
7. FAQ 内容
8. JSON-LD 结构化数据
```

**然后手动构建 SQL 更新数据库**，示例：
```javascript
// 从浏览器提取的图片 URL 替换为 1920px
const images = rawUrls.map(u => u.replace('/960/', '/1920/'))
// 直接 UPDATE crawled_venues SET ... WHERE slug='xxx'
```

**此方法比修改爬取脚本重试快得多，适用于所有 JS 渲染页面。**

### 步骤 2：双表同步（必须）

爬取数据必须同时写入两张表：
- **`crawled_venues`**：存储完整场地详情（含 rating、review_count、location 等）
- **`crawled_destinations`**：前端 CrawledCountries 列表页读取的表

```javascript
// 从 crawled_venues 读取数据，插入 crawled_destinations
const [rows] = await pool.execute('SELECT * FROM crawled_venues WHERE slug=?', [slug])
const v = rows[0]
await pool.execute(
  `INSERT INTO crawled_destinations 
    (slug, name, name_cn, country, country_cn, source_url, tagline, tagline_cn, 
     description, description_cn, features, venue_types, towns, images, 
     budget_ranges, guest_capacities, faq, cover_image, sort_order)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [v.slug, v.name, v.name_cn, v.country, v.country_cn, ...]
)
```

同时写入 **`products`** 表作为可预定商品：
```javascript
await pool.execute(
  'INSERT INTO products (category_id, product_id, name, name_en, description, image, price, unit, highlight, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
  ['destination', slug, nameCn, nameEn, taglineCn, coverImage, 0, '€', highlight, 100]
)
```

### 步骤 3：验证爬取结果

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node -e "
require('dotenv').config()
const mysql = require('mysql2/promise')
async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })
  const [rows] = await pool.execute('SELECT slug, name_cn, country, JSON_LENGTH(images) as imgs FROM crawled_venues WHERE slug = ?', ['morden-hall'])
  console.log(JSON.stringify(rows[0], null, 2))
  await pool.end()
}
main()
"
```

### 步骤 4：翻译为中文

爬取的数据默认为英文/法文，需要翻译为中文。中文字段写入 `_cn` 后缀字段：

**必须翻译的字段**：
- `name_cn`：场地中文名
- `tagline_cn`：中文宣传语（≤30字）
- `description_cn`：中文完整描述（按 `\n\n` 分段）
- `features`：特色亮点（每条≤25字，直接存中文 JSON 数组）
- `venue_types`：场地类型（含 name 中文 + name_en 英文）
- `towns`：位置/城镇（含 name 英文 + name_cn 中文）
- `location`：中文地址

**翻译方式**：可直接在爬取时由 AI 完成翻译并写入，或运行翻译脚本：
```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/translate-venues.cjs
```

---

## 第二部分：数据提取规则

### 图片提取
- **来源 CDN 域名**（三个都支持）：
  - `cdn0.weddingwire.com/vendor/` — WeddingWire 美国站
  - `cdn0.mariages.net/vendor/` — mariages.net 法国站
  - `cdn0.hitched.co.uk/vendor/` — hitched.co.uk 英国站
- **过滤**：排除婚纱、模板等非场地图片
- **数量**：最多 24 张
- **尺寸**：替换 `/960/` 为 `/1920/` 获取高清版本
- **头图选择**：优先选宽幅全景/航拍图作为 cover_image

**图片 URL 转换规则**：
```javascript
// 原始：https://cdn0.mariages.net/vendor/9302/3_2/960/png/03_3_169302-177072873272076.jpeg
// 转换：https://cdn0.mariages.net/vendor/9302/3_2/1920/png/03_3_169302-177072873272076.jpeg
// 英国站同理：cdn0.hitched.co.uk/vendor/7059/3_2/960/jpg/xxx.jpeg → /1920/
const hd = src.replace(/(\/vendor\/\d+\/\d+_\d+)\/\d+(\/)/, '$1/1920$2')
// 或简单替换：
const hd = src.replace('/960/', '/1920/')
```

### 描述提取
- 优先从 "About" 区域提取
- 按段落（`\n\n`）分割
- 翻译为中文

### 评分提取
```javascript
const bodyText = $('body').text()
const ratingMatch = bodyText.match(/(\d+\.?\d*)\s+out of 5/)
if (ratingMatch) rating = ratingMatch[1] // 得到 '5.0'
```

### 评论数提取
```javascript
const reviewMatch = bodyText.match(/(\d+)\s+reviews?/i)
if (reviewMatch) reviewCount = reviewMatch[1]
```

### 位置提取
- 优先匹配包含邮编的地址模式
- 备用：从 Google Maps 链接提取
- 翻译为中文

---

## 第三部分：数据库表结构

### crawled_venues 表（完整详情）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO | 主键 |
| slug | VARCHAR(100) | URL标识，唯一（如 `morden-hall`） |
| name | VARCHAR(300) | 场地英文名 |
| name_cn | VARCHAR(300) | 场地中文名 |
| country | VARCHAR(100) | 国家英文（如 United Kingdom） |
| country_cn | VARCHAR(100) | 国家中文（如 英国） |
| source_url | VARCHAR(500) | 来源URL |
| tagline | VARCHAR(500) | 英文宣传语 |
| tagline_cn | VARCHAR(500) | **中文宣传语** |
| description | TEXT | 英文描述 |
| description_cn | TEXT | **中文描述** |
| features | JSON | 特色亮点数组（中文，每条≤25字） |
| venue_types | JSON | 场地类型数组（含 name + name_en） |
| towns | JSON | 位置/城镇数组（含 name + name_cn） |
| images | JSON | 图片URL数组（最多24张，1920px） |
| budget_ranges | JSON | 预算区间数组 |
| guest_capacities | JSON | 宾客规模数组 |
| faq | JSON | FAQ数组（含 q + a） |
| cover_image | VARCHAR(500) | 封面图URL |
| rating | VARCHAR(10) | 评分（如 4.9） |
| review_count | VARCHAR(20) | 评论数（如 60） |
| location | VARCHAR(500) | 详细地址 |
| sort_order | INT | 排序权重 |
| created_at | TIMESTAMP | 创建时间 |

### crawled_destinations 表（列表展示）
与 crawled_venues 结构基本相同，但无 rating、review_count、location 字段。前端 CrawledCountries 列表页读取此表。

### products 表（商品化管理）
| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | VARCHAR(50) | 固定为 'destination' |
| product_id | VARCHAR(50) | 与 slug 相同（如 'morden-hall'） |
| name | VARCHAR(200) | 中文名 |
| name_en | VARCHAR(200) | 英文名 |
| description | TEXT | 简短描述 |
| image | VARCHAR(500) | 封面图 |
| price | INT | 价格（无价格填 0） |
| unit | VARCHAR(10) | 默认 € |
| highlight | VARCHAR(50) | 亮点标签（≤50字） |
| sort_order | INT | 排序 |

---

## 第四部分：后端 API

### 获取场地列表（crawled_destinations）
```
GET /api/products/crawled-destinations
```
- 返回所有爬取场地列表，`description_preview` 优先使用中文描述（`COALESCE(description_cn, description)`）

### 获取场地详情（crawled_destinations）
```
GET /api/products/crawled-destinations/:slug
```

### 获取场地详情（crawled_venues）
```
GET /api/products/crawled-venues/:slug
```
- 返回完整场地数据（含 rating、review_count、location）
- CrawledVenueDetail 详情页使用此接口

**响应示例**：
```json
{
  "success": true,
  "data": {
    "slug": "morden-hall",
    "name": "Morden Hall",
    "name_cn": "莫登霍尔",
    "country": "United Kingdom",
    "country_cn": "英国",
    "tagline_cn": "萨里郡宁静的河畔庄园",
    "description_cn": "莫登霍尔坐落于萨里郡萨顿...",
    "images": ["https://cdn0.hitched.co.uk/vendor/7059/3_2/1920/jpg/..."],
    "features": ["全天独占使用", "National Trust公园环绕", "..."],
    "venue_types": [{"name": "乡村庄园", "name_en": "Country House"}],
    "towns": [{"name": "Sutton", "name_cn": "萨顿"}],
    "cover_image": "https://cdn0.hitched.co.uk/vendor/...",
    "rating": "4.9",
    "review_count": "60"
  }
}
```

**实现文件**：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`

---

## 第五部分：前端渲染规范

### 路由
- 详情页路由：`/venue/:slug` → `CrawledVenueDetail` 组件
- 国家列表页：`/europe/:country` → `CrawledCountries` 组件
  - `/europe/italy`、`/europe/france`、`/europe/greece`、`/europe/portugal`、`/europe/uk`
- Destinations 页面：`/destinations` → `TestDestination` 组件
- 所有入口（首页欧陆十二城、/destinations 页面、国家列表页卡片）统一跳转至 `/venue/:slug`

### 详情页模块顺序

```
┌─────────────────────────────────┐
│         全屏首图 Hero            │
│    (国家标签 / 名称 / 宣传语)     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│     图片画廊 (GalleryCarousel)   │
│     最多20张高清大图轮播          │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│         场地描述与介绍            │
│   「关于这里」大字标题 + 正文      │
│   字号≥16px，行高≥1.8，居中排版   │
└─────────────────────────────────┘
              ↓
┌──────────────────┬──────────────┐
│    特色亮点       │   场地类型    │
│  (AI精简分条)     │  (Tag chips) │
│                  │              │
│                  │   位置        │
│                  │  (Tag chips)  │
└──────────────────┴──────────────┘
              ↓
┌─────────────────────────────────┐
│  [€30,000 起]  ← 最低价格Tag     │
│  宾客规模 tags                    │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│     FAQ 手风琴（有数据时展示）     │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│         数据来源链接              │
└─────────────────────────────────┘
```

### 模块详细说明

#### 1. 全屏首图 Hero
- 全屏视差背景图（使用 cover_image）
- 显示国家标签、场地中文名、宣传语
- 显示评分（如 ★5.0），**不显示评论条数**
- 「向下探索」引导

#### 2. 图片画廊
- 使用 GalleryCarousel 轮播组件，紧跟头图下方
- **图片数量上限 20 张**
- **质量要求极其严格**：所有图片必须高清清晰，最低分辨率 1200px，推荐 1920px+
- 头图必须是所有图片中最宽、最壮观的一张（宽幅全景/航拍优先）
- 使用 FallbackImage 组件，确保加载容错
- 支持点击放大查看（lightbox）、触摸滑动

#### 3. 场地描述与介绍
- 标题：「关于这里」，字号偏大，视觉突出
- 正文：**优先使用 `description_cn`**，无中文时回退到 `description`
- 按段落（`\n\n` 分割）渲染
- **字号要求**：正文 ≥ 16px，行高 ≥ 1.8
- **排版**：最大宽度 720px 居中，两侧留白
- **风格**：文字深灰（#333），背景浅暖色或白色

#### 4. 特色亮点 + 场地类型/位置（并排布局）
**左侧列 — 特色亮点**：
- 数据来源：features 字段（JSON 数组）
- AI 精简：每条 15-25 字以内
- 分条展示，每条前加装饰性圆点，5-10 条

**右侧列 — 场地类型 + 位置**：
- 场地类型：venue_types 字段，Tag/Chip 样式
- 位置：towns 字段 + 国家名，Tag 样式（含附近城市 2-5 个 + 所属国家）
- 位置 tag 使用 `cd-chip--location` 和 `cd-chip--country` 样式区分

#### 5. 预算参考 + 宾客规模
**预算参考**：
- 仅展示最低起步价 Tag，样式醒目
- 格式：`€XX,XXX 起`
- 数据来源：budget_ranges 字段中 min 值最小的那一项
- Tag 样式：强调色（金色渐变），白色文字
- **无价格时显示「？」**

**宾客规模**：
- Tag/Chip 样式，数据来源：guest_capacities 字段

#### 6. FAQ 常见问题
- 仅当有 FAQ 数据时展示
- 手风琴（Accordion）样式，点击展开/收起
- 标题：「常见问题」+ 副标题「{场地名} 常见问题」
- 展开动画平滑，箭头图标旋转

#### 7. 数据来源
- 展示爬取来源链接

### 底部预定栏
**触发条件**：页面滚动到「关于这里」模块可见时，底部固定栏滑入显示。

**布局**：
- 固定在页面底部，毛玻璃背景
- 左侧：最低价格（红色），**无价格时显示「？」**，不显示评论条数
- 右侧：「咨询」按钮（描边样式）+「立即预定」按钮（金色渐变）

**按钮交互**：
- **立即预定**：点击后添加至购物车，按钮变为「取消预定」（玫瑰金描边）
- **取消预定**：再次点击从购物车移除，按钮恢复
- **咨询**：未登录弹出登录弹窗，已登录添加商品并跳转 /order 页面

**注意**：底部栏必须复用 VenueDetail 的标准样式（咨询+预定按钮），禁止自定义为其他链接样式。

---

## 第六部分：数据字段与 AI 处理汇总

| 模块 | 数据字段 | AI 处理 | 说明 |
|------|----------|---------|------|
| 场地描述 | description | 翻译为中文 | 爬取时完成 |
| 特色亮点 | features | AI 精简每条 ≤25 字 | 爬取时完成 |
| 图片画廊 | images | 无 | 最多 24 张，必须高清，使用原图链接 |
| 场地类型 | venue_types | 翻译为中文 | 爬取时完成 |
| 位置 | towns | 翻译为中文 | 爬取时完成 |
| 预算参考 | budget_ranges | 取最低价 | 仅展示最低起步价，无价格显示「？」 |
| 宾客规模 | guest_capacities | 无 | 保持原样 |
| FAQ | faq | 翻译为中文 | 有则展示，无则隐藏 |
| 评分 | rating | 无 | 仅显示数字，不显示评论条数 |
| 地址 | location | 翻译为中文 | 爬取时完成 |

---

## 注意事项

### 爬取相关
1. **只提取 vendor 图片**：过滤掉婚纱、模板等非场地图片
2. **图片 CDN 三域名**：weddingwire.com、mariages.net、hitched.co.uk 都需支持
3. **图片数量上限 24 张**，使用原图链接，不下载本地
4. **评分字段**：只存储数字（如 `4.9`），不存储完整文本
5. **描述分段**：按 `\n\n` 分割，便于前端渲染
6. **特色精简**：每条≤25字，AI 提炼核心卖点
7. **slug 去重**：插入前检查 slug 是否已存在，存在则 UPDATE
8. **全中文展示**：前端所有文本必须为中文，优先使用 `_cn` 字段
9. **JS 渲染页面**：cheerio 爬取失败时立即用 Browser Agent 提取数据
10. **国家信息**：爬取脚本可能无法自动识别国家（如英国 URL 为 `/destination/`），需手动设置

### 数据库相关
11. **双表同步**：数据必须同时写入 `crawled_venues` 和 `crawled_destinations`
12. **products 表**：必须写入 products 表才能作为可预定商品
13. **只增不覆盖**：向数据库插入爬取数据时，仅执行新增操作，禁止覆盖或删除现有数据
14. **国家代码匹配**：`crawled_destinations` 的 country 值必须与 `CrawledCountries.tsx` 的 COUNTRIES 配置一致（如英国为 `United Kingdom`）

### 渲染相关
15. **中文优先**：描述用 `description_cn || description`，宣传语用 `tagline_cn || tagline`
16. **列表预览中文**：API 使用 `COALESCE(description_cn, description)` 生成 description_preview
17. **图片质量第一**：宁可少放图片也不能放模糊的图
18. **画廊紧跟头图**：图片画廊位于头图下方
19. **预算只展示最低价**：无价格显示「？」
20. **位置替代推荐城镇**：tag 形式，包含附近城市和国家名
21. **FAQ 按需展示**：有数据才展示
22. **所有图片使用 FallbackImage 组件**：确保加载失败时有骨架屏兜底
23. **响应式适配**：移动端单列展示，tag 自动换行
24. **不提供 mock 数据兜底**：无数据则不展示该模块
25. **Hero 不显示评论条数**：仅显示评分数字
26. **底部栏复用标准样式**：禁止自定义为其他链接
27. **登录弹窗复用首页结构**：包含登录/注册 tabs、邮箱/手机号切换、自动模式切换

### 收尾工作
28. **清理截图**：每次爬取任务结束后，删除工作区根目录所有 .png/.jpg 截图文件
29. **截图不入 Git**：`.gitignore` 已包含 `*.png`、`*.jpg`、`*.jpeg` 规则

---

## 常见问题

### Q: 爬取时返回 403 或 0 张图片？
A: 脚本已使用 Browser User-Agent，通常可绕过。如仍失败（特别是英国 hitched.co.uk 场地），**立即使用 Browser Agent** 访问页面提取真实数据，然后手动构建 SQL 更新数据库。这比修改脚本重试快得多。

### Q: 图片 URL 转换后 404？
A: 检查原始 URL 的 CDN 域名。英国场地使用 `cdn0.hitched.co.uk`，转换规则相同（`/960/` → `/1920/`）。部分图片可能不支持 1920px，可尝试 1200px。

### Q: 描述提取为空或乱码？
A: 页面结构可能变化，或位置字段提取到 UUID 等无效数据。使用 Browser Agent 提取真实数据后手动更新。

### Q: 翻译脚本报错？
A: 确保场地已存在于数据库中。翻译脚本只更新已有数据，不创建新记录。也可以直接在爬取时由 AI 完成翻译。

### Q: 场地在 /europe/uk 页面不显示？
A: 检查两个问题：1) 数据是否已插入 `crawled_destinations` 表；2) `country` 字段值是否与 `CrawledCountries.tsx` 的 COUNTRIES 配置匹配（英国为 `United Kingdom`，不是 `UK`）。

### Q: 列表页商品介绍是英文？
A: 后端 API 的 `description_preview` 使用 `COALESCE(description_cn, description)` 优先取中文。确保 `description_cn` 字段已填入中文翻译。

---

## 相关文件

### 爬取与翻译
- 爬取脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-venue-detail.cjs`
- 翻译脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/translate-venues.cjs`

### 后端
- API 路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 数据库模型：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`
- 服务入口：`/Users/hongli/WorkSpace/Verra-Voile-End/src/index.js`

### 前端
- 通用详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/VenueDetail.tsx`
- 爬取场地详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledVenueDetail.tsx`
- 国家列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledCountries.tsx`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`
- 画廊轮播组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/GalleryCarousel.tsx`
- 图片容错组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/FallbackImage.tsx`

### 规范文档
- 批量爬取：`/Users/hongli/WorkSpace/Verra-Voile/.qoder/skills/crawl-wedding-venues/SKILL.md`

---

## 示例：完整流程（以英国场地 Morden Hall 为例）

```bash
# 1. 尝试爬取场地详情
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/crawl-venue-detail.cjs https://www.weddingwire.com/destination-wedding/destination/morden-hall--e2229594

# 1b. 如果爬取失败（0图片/乱码），使用 Browser Agent 提取真实数据
#     然后手动 SQL 更新 crawled_venues

# 2. 翻译为中文（写入 tagline_cn、description_cn 等字段）
#    可直接用 SQL 更新，或运行翻译脚本
node scripts/translate-venues.cjs

# 3. 双表同步：插入 crawled_destinations 和 products
#    （见步骤 2 的 SQL 示例）

# 4. 重启后端
node src/index.js

# 5. 启动前端
cd /Users/hongli/WorkSpace/Verra-Voile
npm run dev

# 6. 访问预览
# 详情页：http://localhost:5175/venue/morden-hall
# 英国列表：http://localhost:5175/europe/uk

# 7. 清理截图
cd /Users/hongli/WorkSpace/Verra-Voile
node -e "const fs=require('fs');fs.readdirSync('.').filter(f=>f.endsWith('.png')||f.endsWith('.jpg')).forEach(f=>fs.unlinkSync(f))"
```

---

## 扩展：批量爬取多个场地

```javascript
const urls = [
  'https://www.weddingwire.com/destination-wedding/destination/venue1--e111',
  'https://www.weddingwire.com/destination-wedding/destination/venue2--e222',
  // ...
]

for (const url of urls) {
  await crawlVenue(url)
}
```

或创建独立的批量爬取脚本。
