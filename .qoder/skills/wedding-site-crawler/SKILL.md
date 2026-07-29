---
name: wedding-site-crawler
description: 爬取 stylemepretty.com 等婚礼网站的供应商类目、场地信息、商品分类及报价信息。支持两种模式：1) 批量爬取所有 Destination 场地并写入数据库；2) 爬取供应商类目和文章数据。当用户说"爬取婚礼场地"、"爬取 destination"、"批量爬取场地"、"crawl wedding venues"、"爬取婚礼网站商品报价"时触发。
---

# 婚礼网站爬虫

支持两种爬取模式，根据用户需求选择：

## 模式 A：批量爬取 Destination 场地（推荐）

从 stylemepretty.com 批量爬取目的地婚礼场地信息，并写入项目数据库。

### 执行流程

```
任务进度：
- [ ] Step 1: 发现场地 URL 列表
- [ ] Step 2: 批量爬取场地详情
- [ ] Step 3: 数据映射与入库
- [ ] Step 4: 验证 API 返回
```

### Step 1: 发现场地 URL 列表

使用浏览器工具访问 SMP 场地目录页：

```
https://www.stylemepretty.com/vendor-guide/location/destination
```

从页面中提取所有 **Venue 类型** 的供应商 Profile URL。URL 格式为：
```
https://www.stylemepretty.com/vendor-profile/{venue-slug}?location=destination
```

**注意**：页面会列出所有类型的供应商（摄影师、策划师等），只需筛选标记为 "Venue" 的场地。

### Step 2: 批量爬取场地详情

对每个 Venue URL，使用浏览器工具逐个访问并提取以下字段：

| 字段 | 说明 | 提取方式 |
|------|------|----------|
| **主图 URL** | 场地 hero 图片 | 从 `_next/image?url=...` 中解码 `url` 参数获取原始图片地址 |
| **名称** | 场地英文名 | 页面标题区域 |
| **服务地区** | 场地所在城市/地区 | About 区域或 Location 字段 |
| **Services** | 提供的服务列表 | Services 区域（如 Ceremony & Reception, Elopement 等） |
| **About 文本** | 场地描述 | About 区域全文 |
| **容量** | 可容纳人数 | About 文本中提取（如有） |
| **官网** | 场地官方网站 | 页面链接区 |
| **Instagram** | Instagram 链接 | 页面链接区 |

**图片 URL 解码规则**：
```
原始: https://www.stylemepretty.com/_next/image?url=https%3A%2F%2Fsmp-is.stylemepretty.com%2Fuploads%2Fportfolio%2F511492%2Fhyepjvq%24!1200x.jpg&w=3840&q=75
解码: https://smp-is.stylemepretty.com/uploads/portfolio/511492/hyepjvq$!1200x.jpg
```

### Step 3: 数据映射与入库

#### 3.1 分类映射规则

将 SMP 的 Services 映射到项目现有的场地分类体系：

| SMP Service | 项目分类 ID | 分类名 | 图标 |
|-------------|------------|--------|------|
| Private Estates & Villas | manor | 庄园 | 🏰 |
| Ceremony & Reception | manor | 庄园 | 🏰 |
| Elopement | manor | 庄园 | 🏰 |
| Hotel Boutique / Resort & Spa | hotel | 酒店/度假村 | 🏨 |
| 湖畔/水边场地 | lakeside | 湖畔 | 🏞️ |

#### 3.2 城市分配

- 如果场地所在城市已存在于 `cities.ts`，使用现有 city_id
- 如果是新城市，需要新增城市条目（id 递增）
- 城市信息需编写中文名称、描述、风格等

#### 3.3 写入文件

需要更新以下文件：

1. **`src/data/cities.ts`** — 新增城市（如有）
2. **`src/data/venues.ts`** — 新增场地数据 + 注册到 `cityVenuesMap`
3. **`Verra-Voile-End/src/db.js`** — 种子数据同步

#### 3.4 数据库字段映射

`products_destination` 表字段对应：

```
product_id  → 场地 slug（如 'chateau-valouze'）
name        → 中文名（需翻译）
name_en     → 英文名（从 SMP 提取）
description → 中文描述（基于 About 文本总结）
image       → 解码后的主图 URL
price       → 0（SMP 不公开价格，前端显示 "——"）
unit        → '——'
capacity    → 从 About 提取，无则 '——'
highlight   → ''（或根据情况填 '热门'/'限定'）
city_id     → 对应城市 ID
category_id → 映射后的分类 ID
category_name    → 分类中文名
category_name_en → 分类英文名
category_icon    → 分类图标 emoji
sort_order  → 1（默认）
```

#### 3.5 执行 SQL 插入

```bash
/usr/local/mysql/bin/mysql -u root verra_voile -e "INSERT INTO products_destination (...) VALUES (...);"
```

**注意**：种子函数 `seedDestinationVenues` 只在数据库为空时执行，已有数据需手动 SQL 插入。

### Step 4: 验证

重启后端服务，调用 API 验证：

```bash
curl -s http://localhost:3000/api/products/destination | python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data['data']['cities']:
    cats = c['categories']
    venues = [v['nameEn'] for cat in cats for v in cat['venues']]
    print(f\"city_id={c['cityId']}: {', '.join(venues)}\")
"
```

---

## 模式 B：爬取供应商类目与文章数据

爬取 SMP 的供应商分类、文章内容及标签信息，输出为 JSON 文件。

### 执行流程

```
任务进度：
- [ ] Step 1: 检查并安装依赖
- [ ] Step 2: 运行爬虫脚本
- [ ] Step 3: 验证输出结果
- [ ] Step 4: 向用户汇报爬取摘要
```

### Step 1: 检查并安装依赖

```bash
cd /Users/hongli/WorkSpace/Verra-Voile
npm ls puppeteer 2>/dev/null || npm install puppeteer --save-dev
```

### Step 2: 运行爬虫脚本

```bash
cd /Users/hongli/WorkSpace/Verra-Voile
node scripts/crawl-wedding-sites.cjs
```

脚本自动爬取：
- **9 个供应商类目**：场地、摄影师、策划师、花艺、造型师、文具、租赁装饰、摄像师、美妆
- **7 个内容分类**：真实婚礼、目的地婚礼、浪漫风格、传统优雅、现代极简、波西米亚、婚礼策划
- **首页最新文章**及标签
- **JSON-LD 结构化数据**

### Step 3: 验证输出

```bash
ls -la scripts/smp-data.json
```

### Step 4: 汇报结果

展示：供应商类目数量、供应商总数、文章数量、标签数量、输出文件路径。

---

## 项目数据结构参考

### 前端 Venue 接口

```typescript
// src/data/venues.ts
interface Venue {
  id: string        // 唯一标识
  name: string      // 中文名
  nameEn: string    // 英文名
  desc: string      // 中文描述
  img: string       // 图片URL
  price: number     // 价格（0 表示未定价，显示 "——"）
  unit: string      // 价格单位
  capacity: string  // 容纳人数
  highlight: string // 标签（热门/限定/私享/空）
}
```

### 首页与 Listing 数据隔离

- **首页"欧陆十二城"**：`Destinations.tsx` 使用 `HOME_CITIES = cities.filter(c => c.id <= 12)`，纯静态，不读数据库
- **Listing 目的地页**：从 `/api/products/destination` 读取全部城市及场地数据

## 注意事项

- 使用浏览器工具（BrowserAgent）爬取 SMP 页面，支持 JS 渲染
- 每次请求间隔 1-2 秒，避免对目标网站造成压力
- 价格信息 SMP 不公开，统一设为 0，前端显示 "——"
- 图片 URL 需从 Next.js `_next/image` 包装中解码出原始地址
- 场地分类以项目现有体系为准，SMP Services 需做映射转换
---
name: wedding-site-crawler
description: 爬取欧洲目的地婚礼网站（如 stylemepretty.com）的商品类目、供应商和报价信息，输出结构化 JSON 数据。当用户说"爬取婚礼网站商品报价"、"爬取婚礼网站"、"抓取婚礼报价"、"crawl wedding site"、"scrape wedding pricing"时触发。
---

# 婚礼网站商品报价爬虫

自动爬取 stylemepretty.com 等婚礼网站的供应商类目、商品分类、文章标签及报价信息，输出为 JSON 文件。

## 执行流程

按以下步骤依次执行，每步完成后打勾：

```
任务进度：
- [ ] Step 1: 检查并安装依赖
- [ ] Step 2: 运行爬虫脚本
- [ ] Step 3: 验证输出结果
- [ ] Step 4: 向用户汇报爬取摘要
```

### Step 1: 检查并安装依赖

```bash
cd /Users/hongli/WorkSpace/Verra-Voile
npm ls puppeteer 2>/dev/null || npm install puppeteer --save-dev
```

如果 puppeteer 未安装，执行安装命令。安装过程会下载 Chromium（约 200MB），需要等待。

### Step 2: 运行爬虫脚本

```bash
cd /Users/hongli/WorkSpace/Verra-Voile
node scripts/crawl-wedding-sites.js
```

脚本会自动爬取以下内容：
- **9 个供应商类目**：场地、摄影师、策划师、花艺、造型师、文具、租赁装饰、摄像师、美妆
- **7 个内容分类**：真实婚礼、目的地婚礼、浪漫风格、传统优雅、现代极简、波西米亚、婚礼策划
- **首页最新文章**及标签
- **JSON-LD 结构化数据**（可能包含价格信息）

### Step 3: 验证输出结果

检查 `scripts/smp-data.json` 是否生成成功：

```bash
ls -la scripts/smp-data.json
```

读取 JSON 文件中的 `summary` 字段，确认数据统计。

### Step 4: 向用户汇报

向用户展示爬取结果摘要，包括：
- 供应商类目数量
- 供应商总数
- 内容分类数量
- 文章数量
- 标签数量
- 输出文件路径

## 输出数据结构

```json
{
  "crawlTime": "ISO时间戳",
  "source": "stylemepretty.com",
  "summary": {
    "totalVendorCategories": 9,
    "totalVendors": 0,
    "totalContentCategories": 7,
    "totalArticles": 0,
    "totalTags": 0
  },
  "vendorCategories": [...],
  "contentCategories": [...],
  "latestArticles": [...],
  "allTags": [...],
  "vendors": [...],
  "structuredData": [...]
}
```

## 注意事项

- 脚本内置了礼貌延迟（每次请求间隔 1-2 秒），避免对目标网站造成压力
- 价格信息优先从 JSON-LD 结构化数据中提取，如果页面没有结构化价格数据则忽略
- 如果某个页面爬取失败，脚本会跳过并继续，不会中断整个流程
- 输出文件路径：`scripts/smp-data.json`
