# 爬取婚礼场地并生成商品

## 概述
从 WeddingWire/mariages.net/hitched.co.uk 爬取婚礼场地数据，本地入库翻译，前端渲染为高质量场地详情页。

## 适用场景
- 用户提供 WeddingWire URL，需要爬取并展示
- 批量爬取某国场地，生成"测试 XX 国"测试数据
- 优化现有场地详情页布局

## 前置条件
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End` 可访问本地数据库
- Node.js 环境，已安装 `cheerio`、`mysql2`、`dotenv`
- 批量爬取时额外需要 `puppeteer-core`（本地使用 Chrome）

## ⛔ 爬取环境限制

**所有爬取操作只能在本地执行，严禁在 47.99.138.250 服务器上爬取。**

- 禁止在服务器上安装 puppeteer-core、chromium、chrome 等浏览器
- 禁止通过服务器 API 触发爬取任务
- 禁止在服务器上运行 `node scripts/crawl-*.cjs`
- 服务器仅用于部署后端 API 和前端静态文件，不承担爬取负载
- 原因：服务器资源有限，爬取会导致内存/CPU 飙升影响正常服务

## 数据库连接（本地）
- host=localhost, port=3306, user=root, password=(空), database=verra_voile

---

## 第一部分：爬取流程

### 方式 A：单场地快速爬取（cheerio）

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/crawl-venue-detail.cjs [URL]
```

**脚本功能**：请求页面 → 提取数据 → 过滤图片 → 高清化 → 入库（按 slug 去重）

**失败时（0图片/乱码/描述为空）**：立即用 Browser Agent 访问目标 URL 提取真实数据，手动构建 SQL 更新。

### 方式 B：批量爬取某国场地（puppeteer + 硬编码 URL）

**适用**：用户说"爬取 XX 国场地"并提供 WeddingWire 搜索 URL。

#### B1. 提取场地 URL 列表

用 Browser Agent 打开搜索页，逐页提取所有场地详情页链接：
```
https://www.weddingwire.com/destination-wedding/destination/xxx--eXXXXXXX
```

> **⚠️ 不要尝试自动化翻页**：WeddingWire 分页由 JS 拦截，puppeteer 自动翻页不可靠。用 Browser Agent 手动逐页提取 URL 后硬编码。

#### B2. 生成爬取脚本

参考模板 `/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-uk-puppeteer.cjs`，修改配置：

```javascript
const COUNTRY = '英文名称'        // 如 'Spain'（测试数据加 Test 前缀：'Test Spain'）
const COUNTRY_CN = '测试XX国'     // 如 '测试西班牙'
const VENUES = [
  { name: 'Venue Name', url: 'https://www.weddingwire.com/...' },
  // ... 硬编码的场地列表
]
```

脚本命名：`crawl-{country}-puppeteer.cjs`，放在 `scripts/` 目录。

#### B3. 本地执行

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/crawl-{country}-puppeteer.cjs
```

#### B4. 前端配置（让"测试 XX 国"出现在 destinations 页面）

**CrawledCountries.tsx** — 添加国家配置：
```typescript
'test-{country}': { code: '测试XX国', label: '测试XX国', en: 'Test XX', sub: '...' },
```

**Destinations.tsx** — 在 `test-dest-list` 末尾添加卡片，跳转 `/europe/test-{country}`。

### 反爬措施（puppeteer）
1. 先访问 WeddingWire 首页建立会话
2. 设置真实 User-Agent
3. 场地间随机延时 1.5-2.5 秒

### 数据提取规则

**⚠️ "Read more" 展开内容**：
页面中描述、特色、FAQ 等区域可能有 "Read more" / "Voir plus" 折叠按钮，cheerio 只能拿到截断内容。必须：
- 用 Browser Agent 访问页面，点击所有 "Read more" 展开完整内容后再提取
- 或确保爬取的数据是完整版本，而非截断预览

**图片**：
- CDN 域名：`cdn0.weddingwire.com`、`cdn0.mariages.net`、`cdn0.hitched.co.uk`
- 只保留 vendor 图片，过滤婚纱/模板图
- 上限 24 张，高清化：`/960/` → `/1920/`
- 头图选宽幅全景/航拍

```javascript
const hd = src.replace(/(\/vendor\/\d+\/\d+_\d+)\/\d+(\/)/, '$1/1920$2').replace(/\?.*$/, '')
```

**其他字段**：
- 标题：`h1` 或 JSON-LD `name`
- 描述：`.storefrontDescription__content` 或 JSON-LD `description`，按 `\n\n` 分段
- 评分：JSON-LD `aggregateRating` 或文本 `X.X out of 5`，只存数字
- 评论数：`(\d+)\s+reviews?`
- 位置：`.storefrontHeadingLocation__label` 或 JSON-LD `address`
- 场地类型：面包屑解析（Mansion/Garden/Hotel 等）

---

## 第二部分：数据库写入

### 按国家分表架构

每个国家独立建表，彻底隔离数据：

| 表命名 | 用途 | 示例 |
|---|---|---|
| `cv_{suffix}` | 完整场地详情 | cv_uk, cv_france, cv_test_uk |
| `cd_{suffix}` | 前端列表页 | cd_uk, cd_france, cd_test_uk |
| `products` | 商品化管理（共用） | product_id=slug |

**国家后缀映射**：
- 英国→uk, 法国→france, 西班牙→spain, 希腊→greece, 葡萄牙→portugal, 意大利→italy
- 测试英国→test_uk（新增测试国家时创建新表，如 test_france）

**新增国家时**：
```sql
CREATE TABLE `cv_{suffix}` LIKE crawled_venues;
CREATE TABLE `cd_{suffix}` LIKE crawled_destinations;
```

### 写入示例

```javascript
// 写入对应国家的 cv_ 和 cd_ 表
const vt = `cv_${suffix}`  // 如 cv_test_uk
const dt = `cd_${suffix}`  // 如 cd_test_uk

await pool.execute(
  `INSERT INTO \`${vt}\` (slug,name,...) VALUES (?,...)`,
  [slug, name, ...]
)
await pool.execute(
  `INSERT INTO \`${dt}\` (slug,name,...) VALUES (?,...)`,
  [slug, name, ...]
)
// 写入 products
await pool.execute(
  'INSERT INTO products (...) VALUES (...)',
  ['destination', slug, nameCn, ...]
)
```

### 表结构（cv_ / cd_ 通用）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO | 主键 |
| slug | VARCHAR(100) | URL标识，表内唯一 |
| name / name_cn | VARCHAR(300) | 英文/中文名 |
| country / country_cn | VARCHAR(100) | 国家英文/中文 |
| source_url | VARCHAR(500) | 来源URL |
| tagline / tagline_cn | VARCHAR(500) | 宣传语 |
| description / description_cn | TEXT | 描述 |
| features | JSON | 特色亮点（中文，每条≤25字） |
| venue_types | JSON | 场地类型（含 name + name_en） |
| towns | JSON | 位置（含 name + name_cn） |
| images | JSON | 图片URL数组（最多24张） |
| budget_ranges | JSON | 预算区间 |
| guest_capacities | JSON | 宾客规模 |
| faq | JSON | FAQ数组（q + a） |
| cover_image | VARCHAR(500) | 封面图 |
| rating | VARCHAR(10) | 评分（仅 cv_ 表） |
| review_count | VARCHAR(20) | 评论数（仅 cv_ 表） |
| location | VARCHAR(500) | 地址（仅 cv_ 表） |

#### products（商品）

| 字段 | 说明 |
|------|------|
| category_id | 固定 'destination' |
| product_id | 同 slug |
| name / name_en | 中文/英文名 |
| description | 简短描述 |
| image | 封面图 |
| price | 0（无价格） |
| unit | € |
| highlight | 亮点标签 |

---

## 第三部分：翻译

爬取数据默认英文/法文，需翻译为中文写入 `_cn` 后缀字段或 JSON 字段内。

**必须翻译**：name_cn、tagline_cn（≤30字）、description_cn（按 `\n\n` 分段）、features（每条≤25字）、venue_types（name_cn）、towns（name_cn）、location

**翻译方式**：爬取时由 AI 直接翻译写入，或运行翻译脚本：
```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
node scripts/translate-venues.cjs
```

### 翻译脚本模板

爬取完成后，单独编写翻译脚本批量更新中文内容：

```javascript
// scripts/translate-{country}.cjs
require('dotenv').config()
const mysql = require('mysql2/promise')

const translations = [
  {
    slug: 'venue-slug',
    name_cn: '中文名称',
    tagline_cn: '中文宣传语（≤30字）',
    description_cn: `中文描述（按段落组织）`,
    features: ['特色1', '特色2', ...],  // 每条≤25字
    venue_types: [
      { name: 'Country House', name_cn: '乡村庄园' }
    ],
    towns: [
      { name: 'Somerset', name_cn: '萨默塞特郡' }
    ]
  },
  // ... 更多场地
]

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'verra_voile'
  })

  for (const t of translations) {
    // 更新 cv_ 表
    await pool.execute(
      `UPDATE cv_{suffix} SET name_cn=?, tagline_cn=?, description_cn=?, features=?, venue_types=?, towns=? WHERE slug=?`,
      [t.name_cn, t.tagline_cn, t.description_cn, JSON.stringify(t.features), JSON.stringify(t.venue_types), JSON.stringify(t.towns), t.slug]
    )
    // 更新 cd_ 表
    await pool.execute(
      `UPDATE cd_{suffix} SET name_cn=?, tagline_cn=?, description_cn=? WHERE slug=?`,
      [t.name_cn, t.tagline_cn, t.description_cn, t.slug]
    )
  }

  await pool.end()
  console.log('All translations done!')
}

main().catch(e => { console.error(e.message); process.exit(1) })
```

### 翻译注意事项

1. **JSON 字段翻译**：features/venue_types/towns 是 JSON 列，不是独立的 _cn 列。翻译时直接更新原字段，将中文内容写入 JSON 的 name_cn 属性或替换为中文数组
2. **tagline_cn 长度限制**：VARCHAR(500)，超长描述会报 "Data too long" 错误。保持简洁，≤30字
3. **description_cn 格式**：按 `\n\n` 分段，保留场地介绍、设施列表等结构
4. **翻译时机**：爬取完成后立即翻译，避免遗漏
5. **同步更新 cv_ 和 cd_ 表**：两个表的 name_cn/tagline_cn/description_cn 需保持一致

---

## 第四部分：后端 API

| 接口 | 说明 |
|------|------|
| `GET /api/products/crawled-destinations` | 场地列表（UNION ALL 所有 cd_ 表） |
| `GET /api/products/crawled-destinations/:slug` | 场地详情（逐表查找） |
| `GET /api/products/crawled-venues/:slug` | 场地详情（逐表查找 cv_ 表，含 rating） |

实现：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`

**核心逻辑**：API 动态发现所有 `cd_` / `cv_` 表，UNION ALL 查询列表，逐表查找详情。无需手动维护合并逻辑，新增国家表后自动生效。

---

## 第五部分：前端渲染规范

### 路由
- 详情页：`/venue/:slug` → CrawledVenueDetail
- 国家列表：`/europe/:country` → CrawledCountries
- Destinations：`/destinations` → Destinations

### 详情页模块顺序

```
全屏首图 Hero（国家标签 / 名称 / 宣传语 / 评分）
    ↓
图片画廊 GalleryCarousel（最多20张高清大图）
    ↓
场地描述「关于这里」（正文≥16px，行高≥1.8，max-width 720px 居中）
    ↓
特色亮点（左） + 场地类型/位置 tags（右）  ← 并排布局
    ↓
预算参考（最低价 Tag，无价格显示「？」） + 宾客规模 tags
    ↓
FAQ 手风琴（有数据时展示）
    ↓
数据来源链接
```

### 底部预定栏
- 滚动到「关于这里」可见时滑入
- 左侧：最低价格（红色），无价格显示「？」
- 右侧：「咨询」+「立即预定」按钮（复用 VenueDetail 标准样式）
- 立即预定：添加/移除购物车切换

### 渲染要点
- **中文优先**：`description_cn || description`，`tagline_cn || tagline`
- **图片质量第一**：最低 1200px，推荐 1920px+，宁少勿糊
- **所有图片用 FallbackImage 组件**
- **Hero 不显示评论条数**，仅显示评分
- **不提供 mock 数据**：无数据则不展示该模块
- **响应式**：移动端单列，tag 自动换行

---

## 第六部分：数据字段与 AI 处理汇总

| 模块 | 字段 | AI 处理 |
|------|------|---------|
| 描述 | description | 翻译为中文 |
| 特色 | features | AI 精简每条 ≤25 字 |
| 图片 | images | 无，使用原图链接 |
| 场地类型 | venue_types | 翻译为中文 |
| 位置 | towns | 翻译为中文 |
| 预算 | budget_ranges | 取最低价，无价格显示「？」 |
| 宾客规模 | guest_capacities | 无 |
| FAQ | faq | 翻译为中文 |
| 评分 | rating | 无，仅数字 |
| 地址 | location | 翻译为中文 |

---

## 注意事项

### 爬取
1. **严禁在 47.99.138.250 服务器上执行任何爬取操作**，所有爬取只能在本地运行
2. 只提取 vendor 图片，过滤非场地图
3. 图片 CDN 三域名都需支持
4. 图片上限 24 张，使用原图链接不下载本地
5. 数据写入对应国家的 cv_/cd_ 表，不同国家数据完全隔离
6. 批量爬取先查已有 slug，跳过已存在的
7. 测试数据用独立表（如 cv_test_uk），绝不写入正式表（cv_uk）
8. JS 渲染页面 cheerio 失败时立即用 Browser Agent

### 数据库
8. 每个国家独立 cv_/cd_ 表，新增国家时先建表
9. 只增不覆盖，不删除现有数据
10. country_cn 值必须与 CrawledCountries.tsx COUNTRIES 配置一致

### 渲染
11. 全中文展示，优先 `_cn` 字段
12. 画廊紧跟头图
13. 预算只展示最低价
14. 位置用 tag 形式（附近城市 + 国家）
15. FAQ 按需展示
16. 底部栏复用标准样式，禁止自定义

---

## 踩坑记录

### 搜索页分页无法自动化
WeddingWire 分页由 JS 拦截，puppeteer 自动翻页不可靠。**解决**：用 Browser Agent 手动提取 URL 后硬编码到脚本。

### 共享表导致测试数据污染正式数据
旧架构用共享表 crawled_venues/crawled_destinations，测试数据和正式数据混在一起，互相影响。**解决**：按国家分表（cv_uk, cv_test_uk），彻底隔离。

### slug 去重跨国影响
旧架构 `WHERE slug=?` 不限定国家，导致不同国家同 slug 互相跳过。**解决**：分表后每个国家独立表，不存在跨国冲突。

### 翻译字段类型混淆
features/venue_types/towns 是 JSON 列，没有独立的 _cn 后缀列。直接 UPDATE 这些字段时，需将整个 JSON 数组替换为中文内容（features）或包含 name_cn 的对象（venue_types/towns）。

### budget_ranges 和 guest_capacities 也是英文
爬取时 budget_ranges.label（如 "Winter from £8,889"）和 guest_capacities（如 "Up to 180 guests"）都是英文。翻译时需一并处理：
- budget_ranges.label：翻译为中文（如"冬季起价 £8,889"）
- guest_capacities：翻译为中文（如"最多180位宾客"）

### cd_ 表 venue_types 结构不同
`cv_` 表的 venue_types 包含 `name` + `name_cn`，但 `cd_` 表可能是 `name` + `name_en` 结构。翻译时需同时更新两个表的 venue_types，确保都有 `name_cn` 字段。

### venue_types 前端渲染英文
前端渲染 venue_types 时使用了 `v.name`（英文），应改为 `v.name_cn || v.name`。TypeScript 类型定义也需同步更新为 `{ name: string; name_cn?: string }[]`。

**涉及文件**：
- CrawledVenueDetail.tsx：详情页场地类型渲染
- CrawledCountries.tsx：列表页筛选栏场地类型显示

### tagline_cn 超长报错
VARCHAR(500) 的 tagline_cn 字段，写入过长描述会报 "Data too long for column 'tagline_cn'"。tagline 应保持简洁，≤30字，完整描述放 description_cn。

### 爬取后翻译字段为空
cheerio/puppeteer 爬取只写入英文原文，_cn 后缀字段和 JSON 中的中文内容全部为空。必须在爬取完成后立即运行翻译脚本，将 name_cn/tagline_cn/description_cn/features/venue_types/towns 全部翻译写入。

---

## 相关文件

### 爬取与翻译
- 爬取脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-venue-detail.cjs`
- puppeteer 模板：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-uk-puppeteer.cjs`
- 翻译脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/translate-venues.cjs`
- 翻译示例：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/translate-test-uk.cjs`

### 后端
- API 路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 数据库：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`

### 前端
- 详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledVenueDetail.tsx`
- 国家列表：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledCountries.tsx`
- Destinations：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Destinations.tsx`
- 画廊组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/GalleryCarousel.tsx`
- 图片组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/FallbackImage.tsx`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`
