# 线上爬取英国婚礼场地

## 概述
从 WeddingWire 搜索页（`destCountry=4` 即英国）爬取场地列表，再逐个爬取场地详情页，提取图片、描述、评分等数据，**无需翻译**，直接存入 `crawled_venues` 表。

## 适用场景
- 线上批量爬取英国婚礼场地数据
- 通过 API 触发爬取任务，无需本地脚本
- 爬取数据直接入库，前端详情页可直接渲染

## 前置条件
- 后端服务在服务器运行（PM2: `verra-api`）
- 数据库 `crawled_venues` 表已存在
- 已安装 `cheerio` 依赖

## 数据库连接信息
- **服务器**: host=127.0.0.1, port=13306, user=root, password=caoqiangiot@123, database=verra_voile

---

## 爬取流程

### 步骤 1：触发爬取 API

```bash
curl -X POST http://localhost:3000/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{"country": "uk", "limit": 4}'
```

或通过外网触发：
```bash
curl -X POST https://www.europewedding.cn/api/crawl/start \
  -H "Content-Type: application/json" \
  -d '{"country": "uk", "limit": 4}'
```

### 步骤 2：查看爬取状态

```bash
curl http://localhost:3000/api/crawl/state
```

### 步骤 3：验证入库数据

```bash
curl http://localhost:3000/api/products/crawled-venues/{slug}
```

---

## 爬取逻辑

### 1. 搜索页解析
- 请求 `https://www.weddingwire.com/shared/search?destCountry=4`
- 从页面 HTML / JSON 中提取场地详情页 URL
- 取前 `limit`（默认 4）个场地

### 2. 详情页爬取
对每个场地详情页执行：
- 提取标题（场地名称）
- 提取 vendor 图片（cdn0.hitched.co.uk / cdn0.weddingwire.com），替换为 1920px 高清版
- 提取描述（About 区域）
- 提取评分（X.X out of 5）和评论数
- 提取地址/位置
- 提取特色/服务列表
- 提取 FAQ

### 3. 数据入库
- 写入 `crawled_venues` 表（slug 去重，已存在则 UPDATE）
- **无需翻译**：name_cn、tagline_cn、description_cn 留空或填英文名
- 图片最多 24 张

### 4. 图片 URL 转换规则
```javascript
// hitched.co.uk 图片高清化
const hd = src.replace(/(\/vendor\/\d+\/\d+_\d+)\/\d+(\/)/, '$1/1920$2')
// 或简单替换
const hd = src.replace('/960/', '/1920/')
```

---

## 数据表结构（crawled_venues）

| 字段 | 类型 | 说明 |
|------|------|------|
| slug | VARCHAR(100) | URL标识，唯一 |
| name | VARCHAR(300) | 场地英文名 |
| name_cn | VARCHAR(300) | 中文名（线上爬取可留空） |
| country | VARCHAR(100) | United Kingdom |
| country_cn | VARCHAR(100) | 英国 |
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

## 前端渲染

爬取完成后，前端通过以下路由访问：
- **详情页**: `/venue/{slug}` → CrawledVenueDetail 组件
- **数据接口**: `GET /api/products/crawled-venues/{slug}`

渲染规范参考 [crawl-and-generate-venue-product/SKILL.md](../crawl-and-generate-venue-product/SKILL.md) 第五部分。

---

## 相关文件

### 后端
- 爬取逻辑：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/crawler.js`
- 爬取路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/crawl.js`
- 数据接口：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`
- 数据库：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`

### 前端
- 场地详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/CrawledVenueDetail.tsx`
- Destinations 页面：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Destinations.tsx`

---

## 注意事项

1. **无需翻译**：线上爬取英国场地，数据保持英文原文
2. **slug 去重**：插入前检查 slug 是否已存在
3. **图片高清化**：所有 CDN 图片 URL 替换 `/960/` 为 `/1920/`
4. **图片过滤**：只保留 vendor 场地图片，过滤婚纱/模板等
5. **图片数量上限 24 张**
6. **JS 渲染页面**：cheerio 爬取失败时用 Browser Agent 提取
7. **国家信息**：英国场地 country=`United Kingdom`，country_cn=`英国`
8. **只增不覆盖**：数据库插入只增不改已有数据（新场地 INSERT，已存在 UPDATE 同 slug 记录）
