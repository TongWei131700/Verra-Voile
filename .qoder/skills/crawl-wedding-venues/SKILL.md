# 婚礼场地线上数据爬取

## 概述
从 WeddingWire 等婚礼平台爬取目的地婚礼场地数据，存入 `crawled_destinations` 表，并更新到本地和服务器数据库。

## 适用场景
- 用户提供 WeddingWire 搜索页 URL，需要爬取该国家/地区的婚礼场地
- 需要为某个国家创建目的地婚礼页面
- 批量获取婚礼场地详情（名称、描述、图片、价格、容量等）

## 前置条件
- 浏览器代理可用（Browser Agent）
- MySQL 数据库 `crawled_destinations` 表已存在
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End` 可访问数据库

## 数据库连接信息
- **本地**: host=localhost, port=3306, user=root, password=(空), database=verra_voile
- **服务器**: host=47.99.138.250, port=13306, user=root, password=caoqiangiot@123, database=verra_voile

## 爬取流程

### 步骤 1：确定数据源 URL
用户提供的 WeddingWire 搜索页 URL 格式：
```
https://www.weddingwire.com/shared/search?state_id=XXX&region_id=XXX&group_id=X
```

### 步骤 2：用浏览器代理爬取列表页
使用 Browser Agent 访问搜索页 URL，提取所有场地列表：
- 场地名称（英文）
- 场地链接 URL
- 位置/地区
- 简短描述
- 封面图片 URL
- 评分、价格、容量（如有）

**注意**：WeddingWire 可能返回 403，此时使用浏览器代理可绕过限制。

### 步骤 3：逐个爬取场地详情页
对每个场地，使用 Browser Agent 访问其详情页 URL，提取：

| 字段 | 说明 | 映射到数据库字段 |
|------|------|-----------------|
| 名称 | 英文名 + 翻译中文名 | `name`, `name_cn` |
| 地址 | 完整地址 | `towns` (JSON) |
| 描述 | 翻译成中文 | `description` |
| 价格 | 起步价 | `budget_ranges` (JSON) |
| 容量 | 人数范围 | `guest_capacities` (JSON) |
| 评分 | 评分+评价数 | `features` (JSON数组) |
| 场地类型 | 分类 | `venue_types` (JSON) |
| 图片 | 最多12张 | `images` (JSON), `cover_image` |
| 特色 | 获奖/推荐率等 | `features` (JSON数组) |
| 联系方式 | 电话/社交媒体 | 存入描述或特色中 |

### 步骤 4：数据标准化

**图片限制**：每个场地最多 12 张图片

**头图选择规则（极其重要）**：
- 头图（cover_image）是用户对场地的第一印象，必须确保尺寸和清晰度
- 必须从所有可用图片中选择**宽度最大**的图片作为头图
- 优先选择宽幅全景图、航拍图（如无人机航拍），视野开阔的图片
- 头图宽度至少 1200px，推荐 1920px 以上
- 禁止使用竖版或窄图作为头图，拉伸会导致严重模糊
- 如果所有图片宽度都不足 1200px，仍选择最宽的一张

**图片本地化**：
- 所有图片必须下载到本地 `uploads/crawled/{slug}/` 目录
- 使用 puppeteer-core 无头浏览器下载（绕过 CDN 防盗链）
- 下载脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/download-images-puppeteer.cjs`
- 数据库存储本地路径（如 `/uploads/crawled/alsos-nimfon/xxx.jpeg`）
- 下载后检查实际文件格式，修正错误扩展名（如 .webp 实际是 JPEG 需改为 .jpeg）

**场地类型映射**（英文→中文）：
- Banquet Hall → 宴会厅
- Hotel → 酒店
- Resort → 度假村
- Restaurant → 餐厅
- Farm/Ranch → 农场/庄园
- Garden → 花园
- Rooftop → 屋顶露台
- Waterfront → 海滨场地
- Boat/Yacht → 游艇

**预算区间统一格式**：
```json
[
  {"label":"3万-6万欧元","min":30000,"max":60000},
  {"label":"6万-12万欧元","min":60000,"max":120000},
  {"label":"12万欧元以上","min":120000,"max":null}
]
```

**宾客规模统一格式**：
```json
["0-40人","40-80人","80-120人","120人以上"]
```

### 步骤 5：写入数据库

使用 Node.js + mysql2 执行数据库操作：

```javascript
const mysql = require('mysql2/promise');
const pool = mysql.createPool({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'verra_voile' });

// 插入数据
await pool.execute(
  `INSERT INTO crawled_destinations 
   (slug, name, name_cn, country, country_cn, source_url, tagline, description, 
    features, venue_types, towns, images, budget_ranges, guest_capacities, 
    cover_image, cover_image_url, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [slug, name, name_cn, country, country_cn, source_url, tagline, description,
   JSON.stringify(features), JSON.stringify(venue_types), JSON.stringify(towns),
   JSON.stringify(images), JSON.stringify(budget_ranges), JSON.stringify(guest_capacities),
   images[0], images[0], sort_order]
);
```

### 步骤 6：同步到服务器数据库
用相同的数据和操作连接服务器数据库执行：
```javascript
const serverPool = mysql.createPool({ 
  host: '47.99.138.250', port: 13306, 
  user: 'root', password: 'caoqiangiot@123', 
  database: 'verra_voile' 
});
// 执行相同的 INSERT/UPDATE 操作
```

### 步骤 7：验证
- 调用 API 验证数据：`curl https://www.europewedding.cn/api/products/crawled-destinations?country=Greece`
- 用浏览器代理访问前端页面确认显示正常

## crawled_destinations 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO | 主键 |
| slug | VARCHAR(100) | URL标识，唯一 |
| name | VARCHAR(200) | 英文名 |
| name_cn | VARCHAR(100) | 中文名 |
| country | VARCHAR(50) | 国家英文（如 Greece） |
| country_cn | VARCHAR(50) | 国家中文（如 希腊） |
| source_url | VARCHAR(500) | 来源URL |
| tagline | VARCHAR(200) | 宣传语 |
| description | TEXT | 描述（中文） |
| features | JSON | 特色亮点数组 |
| venue_types | JSON | 场地类型数组 |
| towns | JSON | 地区数组 |
| images | JSON | 图片本地路径数组（最多12张） |
| budget_ranges | JSON | 预算区间数组 |
| guest_capacities | JSON | 宾客规模数组 |
| cover_image | VARCHAR(500) | 封面图URL |
| cover_image_url | VARCHAR(500) | 原始外部URL |
| sort_order | INT | 排序 |

## 注意事项
1. **图片数量**：每个场地最多保存 12 张图片
2. **头图质量**：头图必须选择最宽、最清晰的图片，优先航拍/全景，禁止竖版窄图
3. **图片本地化**：所有图片通过 puppeteer 下载到本地，不使用外部 CDN 链接
4. **中文优先**：描述、特色、场地类型等面向用户的内容用中文
5. **场地下架处理**：如果某个场地页面被重定向或404，从搜索结果中找替代场地
6. **去重**：插入前先检查 slug 是否已存在，存在则 UPDATE
7. **并行爬取**：多个场地详情页可同时使用多个 Browser Agent 并行爬取，提高效率

## 示例：爬取希腊场地

```
用户输入：爬取 https://www.weddingwire.com/shared/search?state_id=1030&region_id=10531&group_id=1 的希腊场地

执行步骤：
1. Browser Agent 访问搜索页 → 提取 7 个场地列表
2. 选择 5 个场地，并行爬取详情页
3. 标准化数据（翻译、图片限12张、选最宽图作头图、统一格式）
4. 用 puppeteer 下载所有图片到本地
5. 写入本地数据库 + 服务器数据库
6. 验证页面显示（重点检查头图清晰度）
```

## 相关文件
- 后端爬虫服务：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/crawler.js`
- 后端爬虫API：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/crawl.js`
- 前端展示页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledGreece.tsx`
- 数据库模型：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`
