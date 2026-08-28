---
name: travel-photo-attraction
description: 管理欧洲旅拍景点数据：新增景点、下载图片、维护数据库。当用户说"添加旅拍景点"、"新增景点"、"旅拍图片"、"travel photo attraction"时触发。
---

# 欧洲旅拍景点管理

## 概述
管理「欧洲旅拍」模块的景点数据。数据存储在 `crawled_travel_attractions` 表中，前端通过 API 获取并渲染列表页和详情页。新增景点只需：插入数据库记录 + 准备封面图，无需重新构建前端。

## 适用场景
- 新增一个旅拍景点（如"罗马斗兽场"）
- 替换某个景点的封面图
- 批量添加某国家的景点数据
- 修改景点描述、亮点等信息

## 前置条件
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End`
- 前端项目 `/Users/hongli/WorkSpace/Verra-Voile`
- 数据库连接：通过后端 `.env` 配置（`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`）

---

## 数据库表结构

表名：`crawled_travel_attractions`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INT AUTO_INCREMENT | 主键 |
| `slug` | VARCHAR(150) UNIQUE | URL 标识，如 `eiffel-tower`，前端路由用 |
| `name` | VARCHAR(200) | 中文名 |
| `name_en` | VARCHAR(200) | 英文名 |
| `country` | VARCHAR(100) | 国家中文 |
| `country_en` | VARCHAR(100) | 国家英文 |
| `location` | VARCHAR(100) | 城市中文 |
| `location_en` | VARCHAR(100) | 城市英文 |
| `cover_image` | VARCHAR(500) | 封面图 URL 或本地路径 |
| `tagline` | VARCHAR(500) | 宣传语 |
| `description` | TEXT | 景点介绍（中文） |
| `description_en` | TEXT | 景点介绍（英文） |
| `highlights` | JSON | 亮点标签 `[{"icon":"🗼","title":"建筑高度","desc":"324米"}]` |
| `price` | INT | 起步价（欧元），0 表示"需咨询" |
| `sort_order` | INT | 排序权重，越小越靠前 |
| `tags` | JSON | 标签数组 `["海岛","古堡","世界遗产"]`，用于列表页筛选 |
| `recommended_photographers` | JSON | SEO 固定推荐摄影师 slug 列表 `["slug1","slug2","slug3"]` |
| `created_at` | TIMESTAMP | 创建时间 |

---

## 新增景点完整流程

### 第一步：准备封面图

封面图来源优先级：
1. **Unsplash 搜索**（推荐）：用 Browser Agent 在 Unsplash 搜索英文关键词，获取真实高清图片
2. **已有本地图片**：如果用户提供了图片文件
3. **Unsplash URL 直链**：直接使用 Unsplash CDN URL（无需下载）

**⚠️ 搜索要求**：
- **直接用景点英文名搜索，不加城市名或其他修饰词**（如搜 "Eiffel Tower" 而非 "Eiffel Tower Paris France landscape"）
- **必须选择宽图（landscape）**，因为详情页使用全屏 Hero 背景图模式，竖图效果不佳
- 下载后通过 `file` 命令或 `new Image()` 确认图片尺寸，宽 > 高才可用

#### 用 Browser Agent 搜索 Unsplash 图片流程

```
1. 打开 https://unsplash.com
2. 搜索英文关键词（如 "mont saint michel france aerial"）
3. 点击第一个满意的结果
4. 从图片 URL 中提取 photo ID（格式：images.unsplash.com/photo-XXXXX）
5. 用 curl 下载高清版：
   curl -L -H "User-Agent: Mozilla/5.0" \
     -o attraction-name.jpg \
     "https://images.unsplash.com/photo-XXXXX?w=1600&q=85&fit=crop"
6. 验证文件：ls -lh（>10KB）+ file（JPEG image data）
```

**⚠️ 禁止猜测 Unsplash photo ID**：随机 ID 会返回 HTML 错误页（29 字节），必须从搜索结果中获取。

#### 图片存储位置

**⚠️ 图片统一存储到独立 Git 仓库，不再存到后端目录！**

- **下载目录**：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/travel-attractions/{slug}.jpg`
- **版本控制**：下载后必须在图片仓库执行 `git add + git commit`
- **无需复制到前端**：后端通过符号链接引用图片仓库，Vite 代理 `/uploads` 到后端
- **数据库路径**：`/uploads/crawled/travel-attractions/{slug}.jpg`
- **Unsplash URL 方式**：数据库直接存 Unsplash CDN 链接也可以
  - 格式：`https://images.unsplash.com/photo-XXXXX?w=1200&fit=crop`

### 第二步：插入数据库

编写 Node.js 脚本 `scripts/insert-{slug}.cjs`：

**必填字段说明**：
- `description`：景点介绍，支持分段（用 `\n\n` 分隔），首段为景点概述（大字 + 首字下沉），后续段为拍摄建议（缩进）。建议 250~350 字
- `tags`：标签数组，用于列表页筛选和卡片展示，建议 3~4 个（如 `['海岛', '古堡', '世界遗产']`）

```javascript
const mysql = require('mysql2/promise')
require('dotenv').config()

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  await pool.execute(
    `INSERT INTO crawled_travel_attractions
     (slug, name, name_en, country, country_en, location, location_en,
      cover_image, tagline, description, description_en, highlights, price, sort_order, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'colosseum',                    // slug
      '罗马斗兽场',                    // name
      'Colosseum',                    // name_en
      '意大利',                        // country
      'Italy',                        // country_en
      '罗马',                          // location
      'Rome',                         // location_en
      '/uploads/crawled/travel-attractions/colosseum.jpg', // cover_image
      '古罗马文明的永恒象征',            // tagline
      '罗马斗兽场是古罗马最大的圆形剧场…', // description
      'The Colosseum is the largest ancient amphitheatre…', // description_en
      JSON.stringify([                // highlights
        { icon: '🏟️', title: '建造规模', desc: '可容纳5万观众' },
        { icon: '📸', title: '最佳拍摄', desc: '清晨或黄昏，光线柔和' },
      ]),
      0,                              // price（0=需咨询）
      9,                              // sort_order
      JSON.stringify(['古迹', '城市地标', '历史', '世界遗产']), // tags
    ]
  )

  console.log('✓ 已插入罗马斗兽场')
  await pool.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
```

执行：
```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/insert-colosseum.cjs
```

### 第三步：验证

1. 重启后端（如果表结构或路由有变化）
2. 检查 API 返回：
   ```bash
   curl http://localhost:3000/api/products/crawled-travel-attractions | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).data.length,'items'))"
   ```
3. 前端访问 `/travel-photo` 列表页确认新景点显示
4. 点击卡片进入详情页确认图片和文字正确

**推荐摄影师说明**：推荐摄影师采用动态随机查询，每次从该国家的摄影师中随机返回 3 位（优先有头像的）。无需在爬取时分配，新增摄影师后自动出现在推荐中。

---

## 批量爬取优化流程

当需要爬取大量景点时（如一个国家的所有景点），使用批量流程显著提高效率。

### 批量流程概览

```
阶段 A：批量收集 Unsplash 图片 ID（1 个 Browser Agent 会话）
  ↓
阶段 B：批量下载验证（1 个 curl 命令）
  ↓
阶段 C：批量插入数据库（1 个 Node.js 脚本）
  ↓
阶段 D：单次 git commit + 验证
```

**推荐摄影师说明**：采用动态随机查询，无需在爬取时分配。

### 阶段 A：批量收集图片 ID

**⚠️ 关键：使用单个 Browser Agent 会话连续搜索，禁止启动多个并行 Agent！**

```
启动 1 个 Browser Agent，在单次会话中：
1. 打开 https://unsplash.com
2. 搜索第 1 个景点关键词 → 记录 photo ID
3. 返回搜索页
4. 搜索第 2 个景点关键词 → 记录 photo ID
5. 继续... 直到所有景点完成
```

**错误示范**：启动 10 个并行 Browser Agent（浪费 token，每个都要重新加载页面）

**正确示范**：1 个 Browser Agent，prompt 中列出所有 10 个景点，要求按顺序搜索并返回所有 photo ID

**Token 节省**：单会话 ~2000 token vs 10 个并行会话 ~20000 token

### 阶段 B：批量下载

```bash
# 一个命令下载所有图片
cd /Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/travel-attractions
curl -sL -H "User-Agent: Mozilla/5.0" -o louvre.jpg "https://images.unsplash.com/photo-XXX?w=1600&q=85&fit=crop" & \
curl -sL -H "User-Agent: Mozilla/5.0" -o notre-dame.jpg "https://images.unsplash.com/photo-YYY?w=1600&q=85&fit=crop" & \
# ... 并行下载
wait
# 统一验证
ls -lh *.jpg && file *.jpg
```

### 阶段 C：批量插入

编写单个脚本插入所有景点：

```javascript
const attractions = [
  { slug: 'louvre', name: '卢浮宫', ..., sort_order: 24 },
  { slug: 'notre-dame', name: '巴黎圣母院', ..., sort_order: 25 },
  // ... 所有景点
]

for (const a of attractions) {
  await pool.execute('INSERT INTO ...', [...])
  console.log(`✓ ${a.name}`)
}
```

### 阶段 D：单次提交 + 验证

```bash
# 图片仓库：单次 commit
cd /Users/hongli/WorkSpace/Verra-Voile-Uploads
git add crawled/travel-attractions/
git commit -m "feat: 添加法国 10 个景点封面图"

# API 验证：单次检查
curl http://localhost:3000/api/products/crawled-travel-attractions | node -e "..."

# 更新爬取清单：批量修改 📋 → ✅
```

### 批量 vs 逐个对比

| 项目 | 逐个爬取 | 批量爬取 |
|------|----------|----------|
| Browser Agent 启动 | N 次 | 1 次 |
| git commit | N 次 | 1 次 |
| 数据库脚本 | N 个 | 1 个 |
| 上下文切换 | 频繁 | 无 |
| Token 消耗 | 高（每次 ~1500） | 低（首次 ~5000，后续 ~500/个） |

### 描述内容策略

批量爬取时，描述可以：
1. **模板化生成**：为国家/地区创建描述模板，填充具体景点信息
2. **AI 辅助**：用 AI 批量生成描述草稿，人工审核关键点
3. **简化内容**：首段概述（100字）+ 拍摄建议（100字），无需 3 段长文

---

## 前端架构

### 列表页 `TravelPhoto.tsx`
- 从 API 获取数据：`GET /api/products/crawled-travel-attractions`
- 按国家分组展示（法国、意大利…）
- **筛选**：国家筛选 + 标签筛选 + 搜索（景点名/城市/国家）
  - 桌面端：左侧 `ph-filter` 侧边栏，国家 + 标签两个折叠组
  - 移动端：底部操作栏 + ActionSheet（国家/标签/综合筛选）
- **卡片展示**：图片 + 名称 + 标签（`.cd-card__style-tag`，最多 3 个）+ 底部价格/箭头
- 卡片点击跳转：`/travel-photo/{slug}`
- 使用 `navFromList` 工具函数处理导航和滚动位置缓存

### 详情页 `TravelPhotoDetail.tsx`
- 从 API 获取详情：`GET /api/products/crawled-travel-attractions/:slug`
- **全屏 Hero 布局**：背景图 + 叠加文字（名称、英文名、地点、宣传语）
- **下滑引导**：金色渐变线 + "向下滚动"文字，滚动超过 50px 淡出
- **景点介绍**：`.cd-about .photo-about` 样式（标题 + 分割线 + 正文）
  - 描述支持分段：按 `\n\n` 拆分多段
  - 首段 `--lead`：17px + 首字下沉（金色 3.2em）
  - 后续段 `--sub`：17px + 首行缩进 2em
- **推荐摄影师**：`.tpd-rec` 模块（景点介绍和拍摄事项之间）
  - 从 API 获取推荐摄影师：`GET /api/products/crawled-travel-attractions/:slug/photographers`
  - 有摄影师：3 列卡片网格（`.tpd-rec__grid`）+ "查看更多"按钮
  - 无摄影师："联系客服咨询摄影师"按钮（`.tpd-rec__empty-btn`）
  - 卡片点击跳转：`/photography/{slug}`，带 `from: '/travel-photo'` 状态
  - "查看更多"跳转：`/photography?country={countryEn}`
- **拍摄事项**：`.tpd-notice` 独立卡片样式（暖米色背景 + 金色左边框 + 提示图标）
- **底部价格栏**：滚动超过 50px 后显示（`cd-book-bar`），价格 €0 + 括号注释
- 咨询按钮：设置 `consult_context` 到 sessionStorage 后跳转 `/consult`

### 数据映射（snake_case → camelCase）

```javascript
// 列表项映射
function mapApiItem(row) {
  let tags = row.tags || []
  if (typeof tags === 'string') {
    try { tags = JSON.parse(tags) } catch { tags = [] }
  }
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    country: row.country || '',
    countryEn: row.country_en || '',
    location: row.location || '',
    locationEn: row.location_en || '',
    cover: row.cover_image || '',
    tagline: row.tagline || '',
    tags,  // 标签数组，用于筛选和卡片展示
  }
}

// 详情映射（含 JSON 字段解析）
function mapApiDetail(row) {
  let highlights = row.highlights || []
  if (typeof highlights === 'string') {
    try { highlights = JSON.parse(highlights) } catch { highlights = [] }
  }
  return { ...fields, highlights }
}
```

**注意**：mysql2 驱动会自动解析 JSON 列为 JavaScript 对象，但兼容检查 `typeof === 'string'` 仍是好习惯。

---

## 后端 API

### 列表接口
```
GET /api/products/crawled-travel-attractions
```
返回：`{ success: true, data: [{ slug, name, name_en, country, ... }] }`

### 详情接口
```
GET /api/products/crawled-travel-attractions/:slug
```
返回：`{ success: true, data: { slug, name, ..., description, description_en, highlights, ... } }`

### 推荐摄影师接口
```
GET /api/products/crawled-travel-attractions/:slug/photographers
```
返回：`{ success: true, data: [{ slug, name, name_cn, headshot, cover_image, tagline, photo_styles, price }], country: "Norway" }`

**逻辑**：从景点的 `recommended_photographers` 字段（JSON 数组，存储 3 个摄影师 slug）读取固定推荐，按 slug 查询摄影师详情并返回。

**⚠️ SEO 固定推荐规范**：每个景点的推荐摄影师在插入时随机分配并固定存储，后续不再变化。这样搜索引擎每次爬取看到相同内容，有利于 SEO 索引和内部链接权重传递。

**插入时分配流程**：
1. 查询该国家的摄影师列表（优先有头像的）
2. 随机选 3 位，将其 slug 数组写入 `recommended_photographers` 字段
3. 后续 API 直接读取此固定列表，不再实时随机查询

**兼容旧数据**：若 `recommended_photographers` 为空，API 回退到随机查询模式。

**前端展示**：
- 有摄影师：显示 3 列卡片网格（头像 + 名称 + 宣传语 + 风格标签）+ "查看更多{国家}摄影师"按钮
- 无摄影师：显示"联系客服咨询摄影师"按钮（跳转 `/consult`，自动带入景点上下文）
- "查看更多"跳转：`/photography?country={countryEn}`，摄影列表页自动勾选该国家筛选

### 摄影列表页国家参数
```
GET /photography?country=Norway
```
`Photography.tsx` 支持 URL 参数 `?country=`，自动映射为中文国家名并填入筛选器。优先级：URL 参数 > 缓存。

### 路由文件
`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `Verra-Voile-End/src/db.js` | 表创建 `ensureCrawledTravelAttractionsTable()` + 种子数据 `seedTravelAttractions()` |
| `Verra-Voile-End/src/routes/products.js` | API 路由（列表 + 详情） |
| `Verra-Voile/src/pages/TravelPhoto.tsx` | 列表页组件 |
| `Verra-Voile/src/pages/TravelPhotoDetail.tsx` | 详情页组件 |
| `Verra-Voile/src/styles/index.css` | `.tpd-*` 详情页样式 + `.tpd-notice` 拍摄事项卡片 + `.photo-about__text--lead/sub` 描述分段样式 |
| `Verra-Voile-End/uploads/crawled/travel-attractions/` | 本地图片存储目录 |

---

## 踩坑记录

### 1. Unsplash photo ID 不可猜测
随机拼凑的 ID 返回 29 字节 HTML 错误页，`curl` 仍报成功。**必须**用 Browser Agent 实际搜索 Unsplash 获取有效 ID，下载后立即 `ls -lh` + `file` 验证。

### 2. 本地路径 vs CDN URL
- 本地路径 `/uploads/...` 在开发时需要前后端都存放文件（Vite 从 `public/` 提供静态文件）
- 生产环境后端 Express.static 直接提供，无此问题
- **推荐**：初期用 Unsplash CDN URL，稳定后再本地化

### 3. slug 是路由关键
前端导航和 API 查询都依赖 `slug` 字段。slug 必须是 URL 安全的（小写字母 + 连字符），如 `eiffel-tower`、`mont-saint-michel`。不能用中文名或带空格的英文名。

### 4. highlights JSON 字段
插入时用 `JSON.stringify()` 序列化，查询时 mysql2 自动反序列化。前端需兼容两种情况（已是对象 or 字符串）。

### 5. 种子数据只执行一次
`seedTravelAttractions()` 内部检查 `SELECT COUNT(*) > 0` 则跳过。如需更新已有记录，直接写 SQL UPDATE 脚本。

### 6. tags 字段必填
新增景点时必须提供 `tags` 标签数组，否则列表页筛选和卡片标签展示会为空。标签应为中文短词（2~4字），与景点特色匹配。

### 7. 描述分段格式
`description` 字段用 `\n\n` 分段。首段为景点概述（会显示为大字 + 首字下沉），后续段为拍摄建议或补充信息（首行缩进）。不要用 `<br>` 或 `\n` 单换行。
