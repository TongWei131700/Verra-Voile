# 线上爬取任意国家婚礼场地（测试商品）

## 概述
用户提供 WeddingWire 搜索页 URL，在服务器上用 puppeteer-core 爬取场地详情，数据以"测试 XX 国"存入 `crawled_venues` 表，自动出现在 `/destinations` 页面。

## 适用场景
- 用户说"爬取 XX 国场地"并提供 WeddingWire 搜索 URL
- 数据放在"测试 XX 国"下，不影响线上正式数据
- 支持任意国家，不限英国

## 用户输入
用户只需提供：
1. **WeddingWire 搜索页 URL**（如 `https://www.weddingwire.com/shared/search?destCountry=4`）
2. **国家名称**（如"英国"、"法国"、"西班牙"等，用于命名"测试 XX 国"）

## 前置条件
- 后端服务在服务器运行（PM2: `verra-api`）
- 数据库 `crawled_venues` 表已存在
- 服务器已安装 `puppeteer-core`（`npm install puppeteer-core`）
- 服务器 Chromium 路径：`/usr/bin/chromium-browser`

## 数据库连接信息
- **服务器**: host=127.0.0.1, port=13306, user=root, password=caoqiangiot@123, database=verra_voile

---

## 完整执行流程

### 步骤 1：从搜索页提取场地 URL

用 Browser Agent 或 puppeteer 打开用户提供的搜索页 URL，提取所有场地详情页链接（格式：`https://www.weddingwire.com/destination-wedding/destination/xxx--eXXXXXXX`）。

提取后确认场地列表和数量，让用户确认。

### 步骤 2：生成爬取脚本

参考模板 `/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-uk-puppeteer.cjs`，修改以下配置：

```javascript
const COUNTRY = '英文名称'        // 如 'Spain'
const COUNTRY_CN = '测试XX国'     // 如 '测试西班牙'
const VENUES = [
  { name: 'Venue Name', url: 'https://www.weddingwire.com/destination-wedding/destination/xxx--eXXX' },
  // ... 从搜索页提取的场地列表
]
```

脚本文件名：`crawl-{country}-puppeteer.cjs`，放在 `scripts/` 目录下。

### 步骤 3：上传并执行

```bash
# 打包上传（tar.gz 方式避免网络超时）
cd /Users/hongli/WorkSpace/Verra-Voile-End && tar -czf /tmp/verra-crawl.tar.gz scripts/crawl-{country}-puppeteer.cjs
sshpass -p "TongWei131700" scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=5 -o ConnectionAttempts=3 /tmp/verra-crawl.tar.gz root@47.99.138.250:/tmp/

# SSH 到服务器解压并执行
sshpass -p "TongWei131700" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=5 -o ConnectionAttempts=3 root@47.99.138.250 \
  "cd /var/www/verra-voile-end && tar -xzf /tmp/verra-crawl.tar.gz && node scripts/crawl-{country}-puppeteer.cjs"
```

### 步骤 4：前端配置（让"测试 XX 国"出现在 destinations 页面）

#### 4a. CrawledCountries.tsx 添加国家配置

文件：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledCountries.tsx`

在 `COUNTRIES` 对象中添加：
```typescript
'test-{country}': { code: '测试XX国', label: '测试XX国', en: 'Test XX', sub: 'Test XX Destination Wedding' },
```

#### 4b. Destinations.tsx 添加卡片

文件：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Destinations.tsx`

在 `test-dest-list` 末尾添加卡片（参考已有的"测试英国"卡片格式）：
```tsx
<div className="test-dest-card test-dest-card--reverse" onClick={() => navigate('/europe/test-{country}')}>
  {/* 图片、徽章、国家名等 */}
</div>
```

关键点：
- 跳转路由：`/europe/test-{country}`
- 场地数量：从 `venueCounts['测试XX国']` 读取（后端 API 已自动合并 crawled_venues 数据）

#### 4c. 构建部署前端

```bash
cd /Users/hongli/WorkSpace/Verra-Voile && npm run build
cd dist && tar -czf /tmp/verra-voile-dist.tar.gz .
sshpass -p "TongWei131700" scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=5 -o ConnectionAttempts=3 /tmp/verra-voile-dist.tar.gz root@47.99.138.250:/tmp/
sshpass -p "TongWei131700" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=5 -o ConnectionAttempts=3 root@47.99.138.250 \
  "cd /var/www/verra-voile && rm -rf index.html assets && tar -xzf /tmp/verra-voile-dist.tar.gz"
```

### 步骤 5：Git 操作

```bash
# 后端
cd /Users/hongli/WorkSpace/Verra-Voile-End
git add -A && git commit -m "feat: 新增XX国爬取脚本"
git checkout main && git merge <当前分支> --no-edit && git push origin main
git checkout -b daily/0.0.X && git push origin daily/0.0.X

# 前端
cd /Users/hongli/WorkSpace/Verra-Voile
git add -A && git commit -m "feat: destinations新增测试XX国"
git checkout main && git merge <当前分支> --no-edit && git push origin main
git checkout -b daily/0.0.X && git push origin daily/0.0.X
```

---

## 爬取脚本核心逻辑（puppeteer-core）

### 反爬绕过措施
1. 使用 `puppeteer-core` + 服务器 Chromium（非 fetch/cheerio）
2. 先访问 WeddingWire 首页建立会话上下文
3. 设置真实 User-Agent
4. 每个场地间随机延时 1.5-2.5 秒

### 数据提取
- 标题：`h1` 或 `title`
- 图片：JSON-LD (`image`) + DOM `img[src*="cdn0"]`，高清化替换 `/960/` → `/1920/`
- 描述：`.storefrontDescription__content` 或 JSON-LD `description`
- 评分：JSON-LD `aggregateRating` 或页面文本 `X.X out of 5`
- 场地类型：面包屑解析（Mansion/Garden/Hotel 等）
- 位置：`.storefrontHeadingLocation__label` 或 JSON-LD `address`

### 图片 URL 高清化
```javascript
const hd = src.replace(/(\/vendor\/\d+\/\d+_\d+)\/\d+(\/)/, '$1/1920$2').replace(/\?.*$/, '')
```

---

## 数据自动集成原理

后端 `GET /api/products/crawled-destinations` 接口已合并两张表：
- `crawled_destinations` 表（正式数据）
- `crawled_venues` 表（测试数据，如"测试 XX 国"）

前端 `CrawledCountries` 组件筛选逻辑支持 `country` 或 `country_cn` 匹配：
```typescript
allData.filter(d => d.country === currentCountry.code || d.country_cn === currentCountry.code)
```

因此只要 `crawled_venues` 中 `country_cn = '测试XX国'`，数据自动出现在 `/europe/test-xx` 页面。

---

## 数据表结构（crawled_venues）

| 字段 | 类型 | 说明 |
|------|------|------|
| slug | VARCHAR(100) | URL标识，唯一 |
| name | VARCHAR(300) | 场地英文名 |
| name_cn | VARCHAR(300) | 中文名（可留空） |
| country | VARCHAR(100) | 国家英文名（如 Spain） |
| country_cn | VARCHAR(100) | "测试XX国" |
| source_url | VARCHAR(500) | 来源URL |
| tagline | VARCHAR(500) | 英文宣传语 |
| description | TEXT | 英文描述 |
| features | JSON | 特色亮点数组 |
| venue_types | JSON | 场地类型数组 |
| images | JSON | 图片URL数组（最多24张） |
| cover_image | VARCHAR(500) | 封面图URL |
| rating | VARCHAR(20) | 评分 |
| review_count | VARCHAR(20) | 评论数 |
| location | VARCHAR(500) | 地址 |

---

## 相关文件

### 后端
- 爬取脚本模板：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/crawl-uk-puppeteer.cjs`
- 数据接口：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 数据库：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`

### 前端
- 国家列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledCountries.tsx`
- Destinations 页面：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Destinations.tsx`
- 场地详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledVenueDetail.tsx`

---

## 注意事项

1. **数据隔离**：country_cn 统一用"测试XX国"格式，不影响线上正式数据
2. **只增不覆盖**：slug 已存在则跳过，不覆盖已有数据
3. **图片高清化**：所有 CDN 图片 URL 替换 `/960/` 为 `/1920/`
4. **图片过滤**：只保留 vendor 场地图片（cdn0.hitched.co.uk / cdn0.weddingwire.com）
5. **图片数量上限 24 张**
6. **puppeteer-core 反爬**：必须用浏览器渲染，fetch 会被 WeddingWire 拦截
7. **部署用 tar.gz**：服务器网络不稳定，单文件打包传输更可靠
8. **API 缓存策略**：后端使用 `Cache-Control: no-cache` + ETag，确保新数据实时生效

---

## 踩坑记录与解决思路

### 坑1：搜索页分页无法自动化抓取

**问题**：WeddingWire 搜索页使用传统分页（`?page=1`, `?page=2`...），但分页链接带有 `app-directory-filters-change-page` class，由客户端 JS 拦截处理。puppeteer 的 `page.goto()` 直接访问分页 URL 无效（内容不变），`page.click()` 点击 Next 按钮也无法触发页面内容更新。

**解决**：放弃自动化分页爬取，改用**硬编码 URL 列表**方式：
1. 先用 Browser Agent 手动打开搜索页，逐页点击提取所有场地 URL
2. 将全部 URL 硬编码到爬取脚本的数组中（参考葡萄牙脚本 `crawl-portugal-full.cjs` 的做法）
3. 爬取时逐个检查 slug 是否已存在，已存在则跳过，只爬新增的

**教训**：对于分页机制复杂或有 JS 拦截的网站，不要浪费时间尝试自动化翻页，直接用 Browser Agent 提取 URL 后硬编码更可靠高效。

### 坑2：country 字段与正式数据冲突

**问题**：爬取"测试法国"时，`country` 字段设为 `'France'`，导致测试数据出现在正式法国页面（因为法国页面的 `code` 也是 `'France'`）。

**解决**：测试数据的 `country` 字段使用 `'Test France'`（而非 `'France'`），避免与正式数据冲突。"测试英国"没出问题是因为正式英国的 `code` 是 `'United Kingdom'`，而测试数据恰好也用了 `'United Kingdom'`，靠 `country_cn` 区分。

**规则**：测试数据的 `country` 字段必须加 `Test` 前缀，如 `'Test France'`、`'Test Spain'` 等。

### 坑3：slug 去重未限定国家导致跨国影响

**问题**：slug 去重检查只用 `WHERE slug = ?`，没有限定 `country_cn`，导致不同国家同 slug 的场地互相影响（A 国已存在的场地会导致 B 国同 slug 场地被跳过）。

**解决**：slug 检查必须加 `AND country_cn = ?`：
```sql
SELECT id FROM crawled_venues WHERE slug = ? AND country_cn = ?
```

### 坑4：API 双表合并去重优先级错误

**问题**：`crawled_destinations` 和 `crawled_venues` 两张表的数据合并时，直接拼接 `[...rows, ...venueData]` 导致大量重复。修复去重后，优先级设反（`crawled_destinations` 优先），导致测试数据被正式数据覆盖。

**解决**：用 Map 以 slug 为键去重，`crawled_venues` 优先（因为它是最新爬取数据）：
```javascript
const merged = new Map()
for (const item of venueData) merged.set(item.slug, item)
for (const item of rows) { if (!merged.has(item.slug)) merged.set(item.slug, item) }
```

### 坑5：SSH 不稳定时如何触发爬取

**问题**：服务器 SSH（22端口）经常超时不可达，无法远程执行脚本。

**解决**：发现 HTTP（80端口）始终可用，通过 HTTP API 在服务器内部触发爬取：
```bash
# 从服务器内部调用（SSH 可用时）
ssh root@47.99.138.250 "curl -s -X POST http://localhost:3000/api/crawl/start -H 'Content-Type: application/json' -d '{\"country\":\"france\",\"limit\":51}'"

# 或通过域名（HTTPS 可用时）
curl -X POST https://europewedding.cn/api/crawl/start -H 'Content-Type: application/json' -d '{"country":"france","limit":51}'
```

### 坑6：重复爬取浪费时间

**问题**：每次触发爬取都从第1个 URL 开始，已入库的场地被重复访问（虽然不重复入库，但浪费了爬取时间）。

**解决**：爬取脚本中先查询数据库已有的 slug 列表，在遍历 URL 时直接跳过已存在的，只爬取新增的：
```javascript
// 先获取已有的 slug
const [existingRows] = await pool.execute(
  'SELECT slug FROM crawled_venues WHERE country_cn = ?', [COUNTRY_CN]
)
const existingSlugs = new Set(existingRows.map(r => r.slug))

// 遍历时跳过
if (existingSlugs.has(slug)) {
  results.push({ name: venueData.name, slug, status: '已存在' })
  continue
}
```
