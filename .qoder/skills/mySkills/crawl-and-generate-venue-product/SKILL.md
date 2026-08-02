# 爬取数据生成婚礼场地商品

## 概述
从 WeddingWire/mariages.net 爬取婚礼场地详情页，提取图片、描述、特色、评分等数据，翻译为中文后入库 `crawled_venues` 表，并通过前端渲染为高质量场地详情页，面向终端用户展示。

## 适用场景
- 用户提供 WeddingWire 场地详情页 URL，需要爬取并展示
- 批量爬取多个场地详情页并生成商品
- 优化现有场地详情页的布局与内容结构
- 需要快速预览爬取数据质量

## 前置条件
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End` 可访问数据库
- MySQL 数据库 `crawled_venues` 表已存在（首次运行爬取脚本会自动创建）
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

### 步骤 2：验证爬取结果

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
  const [rows] = await pool.execute('SELECT * FROM crawled_venues WHERE slug = ?', ['domaine-de-beauregard'])
  console.log(JSON.stringify(rows[0], null, 2))
  await pool.end()
}
main()
"
```

### 步骤 3：翻译为中文

爬取的数据默认为英文/法文，需要翻译为中文：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/translate-venues.cjs
```

**翻译内容**：
- `name_cn`：场地中文名
- `tagline`：宣传语
- `description`：完整描述（分段翻译）
- `features`：特色亮点（每条≤25字）
- `venue_types`：场地类型
- `towns`：位置/城镇
- `budget_ranges`：预算区间
- `faq`：常见问题（如有）
- `location`：详细地址

---

## 第二部分：数据提取规则

### 图片提取
- **来源**：只提取 `cdn0.weddingwire.com/vendor/` 或 `cdn0.mariages.net/vendor/` 的图片
- **过滤**：排除婚纱、模板等非场地图片
- **数量**：最多 24 张
- **尺寸**：替换为 1920px 高清版本
- **头图选择**：第一张 vendor 图片作为封面图

**图片 URL 转换规则**：
```javascript
// 原始：https://cdn0.mariages.net/vendor/9302/3_2/960/png/03_3_169302-177072873272076.jpeg
// 转换：https://cdn0.mariages.net/vendor/9302/3_2/1920/png/03_3_169302-177072873272076.jpeg
const hd = src.replace(/(\/vendor\/\d+\/\d+_\d+)\/\d+(\/)/, '$1/1920$2')
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

### crawled_venues 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO | 主键 |
| slug | VARCHAR(100) | URL标识，唯一（如 `domaine-de-beauregard`） |
| name | VARCHAR(300) | 场地英文名 |
| name_cn | VARCHAR(300) | 场地中文名 |
| country | VARCHAR(100) | 国家英文（如 France） |
| country_cn | VARCHAR(100) | 国家中文（如 法国） |
| source_url | VARCHAR(500) | 来源URL |
| tagline | VARCHAR(500) | 宣传语 |
| description | TEXT | 描述（中文） |
| features | JSON | 特色亮点数组（每条≤25字） |
| venue_types | JSON | 场地类型数组 |
| towns | JSON | 位置/城镇数组 |
| images | JSON | 图片URL数组（最多24张，1920px） |
| budget_ranges | JSON | 预算区间数组 |
| guest_capacities | JSON | 宾客规模数组 |
| faq | JSON | FAQ数组（含 q + a） |
| cover_image | VARCHAR(500) | 封面图URL |
| rating | VARCHAR(10) | 评分（如 5.0） |
| review_count | VARCHAR(20) | 评论数（如 111） |
| location | VARCHAR(500) | 详细地址 |
| sort_order | INT | 排序权重 |
| created_at | TIMESTAMP | 创建时间 |

---

## 第四部分：后端 API

### 获取场地详情
```
GET /api/products/crawled-venues/:slug
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "domaine-de-beauregard",
    "name": "Domaine de Beauregard",
    "name_cn": "博雷加德庄园",
    "country": "France",
    "country_cn": "法国",
    "source_url": "https://www.weddingwire.com/...",
    "tagline": "普罗旺斯腹地的十八世纪瑰宝",
    "description": "博雷加德庄园始建于18世纪...",
    "images": ["https://cdn0.mariages.net/vendor/..."],
    "features": ["18世纪历史庄园...", "..."],
    "venue_types": [{"name": "庄园", "name_en": "Manor"}],
    "towns": [{"name": "Monteux", "name_cn": "蒙图"}],
    "budget_ranges": [{"label": "场地费详情请联系咨询", "min": 0, "max": null}],
    "guest_capacities": ["50-150人", "150-220人"],
    "faq": [{"q": "...", "a": "..."}],
    "cover_image": "https://cdn0.mariages.net/vendor/...",
    "rating": "5.0",
    "review_count": "111",
    "location": "524, Chemin de Beauregard, 84170 Monteux, 普罗旺斯, 法国"
  }
}
```

**实现文件**：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`

---

## 第五部分：前端渲染规范

### 路由
- 统一路由：`/venue/:slug`
- 通用组件：`VenueDetail` 根据 slug 动态请求数据
- 所有入口（首页欧陆十二城、/destinations 页面、国家列表页卡片）统一跳转至该路由

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
- 正文：description 字段，按段落（`\n\n` 分割）渲染
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
2. **图片数量上限 24 张**，使用原图链接，不下载本地
3. **评分字段**：只存储数字（如 `5.0`），不存储完整文本
4. **描述分段**：按 `\n\n` 分割，便于前端渲染
5. **特色精简**：每条≤25字，AI 提炼核心卖点
6. **slug 去重**：插入前检查 slug 是否已存在，存在则 UPDATE
7. **全中文展示**：前端所有文本必须为中文

### 渲染相关
8. **图片质量第一**：宁可少放图片也不能放模糊的图
9. **画廊紧跟头图**：图片画廊位于头图下方
10. **预算只展示最低价**：目的是挽留客户，无价格显示「？」
11. **位置替代推荐城镇**：tag 形式，包含附近城市和国家名
12. **FAQ 按需展示**：有数据才展示
13. **所有图片使用 FallbackImage 组件**：确保加载失败时有骨架屏兜底
14. **响应式适配**：移动端单列展示，tag 自动换行
15. **不提供 mock 数据兜底**：无数据则不展示该模块
16. **Hero 不显示评论条数**：仅显示评分数字
17. **底部栏复用标准样式**：禁止自定义为其他链接

---

## 常见问题

### Q: 爬取时返回 403 怎么办？
A: 脚本已使用 Browser User-Agent，通常可绕过。如仍失败，使用 Browser Agent 访问页面。

### Q: 图片 URL 转换后 404？
A: 检查原始 URL 格式，确保替换规则正确。部分图片可能不支持 1920px，可尝试 1200px。

### Q: 描述提取为空？
A: 页面结构可能变化，检查 "About" 区域的选择器。备用方案：从整个页面文本提取长段落。

### Q: 翻译脚本报错？
A: 确保场地已存在于数据库中。翻译脚本只更新已有数据，不创建新记录。

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

## 示例：完整流程

```bash
# 1. 爬取场地详情
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/crawl-venue-detail.cjs https://www.weddingwire.com/destination-wedding/destination/xxx--e1234567

# 2. 翻译为中文
node scripts/translate-venues.cjs

# 3. 启动后端（如未运行）
node src/index.js

# 4. 启动前端（如未运行）
cd /Users/hongli/WorkSpace/Verra-Voile
npm run dev

# 5. 访问预览
# http://localhost:5175/venue/xxx
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
