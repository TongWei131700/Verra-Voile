# 爬取婚礼场地详情

## 概述
用户提供两个 URL：
- **URL A**（信息来源）：从 WeddingWire 等平台提取场地文字信息（关于我们、场地特色、地点）
- **URL B**（图片来源）：从场地官网下载高清图到本地后端

数据写入 `crawled_venues` 单表，前端通过 `DestinationsDetail.tsx` 渲染。

## 前置条件
- 后端项目 `/Users/hongli/WorkSpace/Verra-Voile-End`
- 前端项目 `/Users/hongli/WorkSpace/Verra-Voile`
- Puppeteer 已安装在前端项目（`/Users/hongli/WorkSpace/Verra-Voile/node_modules/puppeteer`）
- 数据库：localhost, root, 无密码, verra_voile

## 批量爬取模式（优化版 - 节省 token）

> 以下优化模式于 2026-08-30 引入，用于批量处理多个场地时大幅减少 token 消耗。
> 若效果不佳可回退到下方「单场地标准流程」（第一步/第二步逐场地执行）。

### 核心原则：合并同类操作，减少重复上下文

| 操作 | 单场地模式 | 批量优化模式 |
|------|-----------|-------------|
| 文字提取 | N 次 Browser Agent | **1 次 Agent** 依次访问 N 个 WW 页面 |
| 图片收集 | N 次 Browser Agent | **1 次 Agent** 依次访问 N 个官网 |
| 下载脚本 | N 个独立脚本 | **1 个参数化脚本** 处理全部场地 |
| 入库脚本 | N 个独立脚本 | **1 个批量脚本** 包含全部场地数据 |
| 终端命令 | N 次格式转换/过滤/git | 各 **1 次** 遍历全部目录 |

### 批量执行流程（8 步完成 N 个场地）

```
① 1 次 Browser Agent → 批量提取 N 个 WW 页面文字信息
② 批量翻译 + 组装数据（纯文本处理，token 低）
③ 1 个批量 insert 脚本 → N 个场地一次入库（先插入基础数据，amenities 等可后续 UPDATE）
④ 1 次 Browser Agent → 批量访问 N 个官网收集图片 URL
⑤ 1 个批量下载脚本 → 并发下载全部场地图片
⑥ 1 条终端命令 → 全部场地格式转换 + 缩略图过滤
⑦ 1 次 git add + commit → 全部图片入库
⑧ 更新各场地 gallery_images 路径
```

### 注意事项
- **Browser Agent 对重定向的判断不可靠**，关键信息（地址、坐标）必须用 WebFetch 交叉验证
- 单会话内依次处理（非并行），保持上下文连续性
- 每个场地的图片仍按 40-50 张控制，精选优先
- 批量 insert 时 JSON 字段仍须用 `CAST(? AS JSON)` 避免双重编码

---

### 以下为单场地标准流程（备用/回退参考）

## 图片数量控制
每个场地下载 **40-50 张**即可，不需要全部下载。精选时优先保留：
- Hero/Drone 全景图、外观、仪式区、宴会厅、花园、套房
- 排除：卧室细节、食物特写、纯装饰细节、重复角度的照片

## ⛔ 爬取只能在本地执行，严禁在服务器上操作

---

## 第一步：从 URL A 抓取文字信息

用 Browser Agent 访问 URL A，提取以下三项内容：

### 1. 关于我们（description + description_cn）

**格式要求**：描述必须以场地原名称开头，后接破折号和正文内容。

```
Vila Alba Resort — Your wedding is one of those unforgettable days...
```

中文版本同理，地点名称保持原文不翻译：

```
Vila Alba Resort — 您的婚礼是一生中最难忘的日子...
度假村坐落于 Algarve 中心地带，俯瞰 Praia da Albandeira 的天然海蚀拱门...
```

**注意**：
- `description` 存英文原文，`description_cn` 存中文翻译
- 中文描述中地名、场地名等专有名词保持原文（如 Algarve、Praia da Albandeira）
- 精简为 3-5 段，每段 2-4 句

### 2. 场地特色（amenities）

按类别分组（如：婚礼场地、住宿、餐饮与服务、休闲设施），每组包含中英文标题和条目。

**数据结构**（必须严格匹配前端格式）：
```json
[
  {
    "titleCn": "婚礼场地",
    "title": "Wedding Venues",
    "items": [
      { "labelCn": "悬崖露台仪式区", "label": "Cliffside Terrace Ceremony" },
      { "labelCn": "海景仪式台", "label": "Sea View Ceremony Platform" }
    ]
  },
  {
    "titleCn": "住宿",
    "title": "Accommodation",
    "items": [
      { "labelCn": "高级海景套房", "label": "Premium Suite Sea View" }
    ]
  }
]
```

**⚠️ 字段名必须用 `titleCn` / `title` / `labelCn` / `label`**，不能用 `group` / `group_en` / 字符串数组等其他格式，否则前端无法渲染。

写入时使用 `CAST(? AS JSON)` 避免 JSON 双重编码：
```javascript
await conn.query(
  'UPDATE crawled_venues SET amenities = CAST(? AS JSON) WHERE slug = ?',
  [JSON.stringify(amenities), slug]
);
```

### 3. 地点（address + coordinates）
- 提取地址、经纬度
- 写入 `address`、`latitude`、`longitude` 字段

### 其他字段
- `name_cn`：中文名称
- `tagline` / `tagline_cn`：中英文宣传语（≤30字）
- `phone`：联系电话（可选）
- `price_unit`：使用货币符号（`€`、`$`、`£`），不用货币代码（EUR、USD、GBP）
- `price`：起步价（整数）。若数据源未提供价格，须自行评估给出最低起步价：
  - 用 WebSearch 搜索同地区同类场地（château/villa/mas）的婚礼租赁价格
  - 参考 2-3 个可比场地的起步价，取最低档作为本场地价格
  - 评估依据：地区消费水平、场地规模（床位数/接待面积）、设施档次
  - 常见地区参考区间：法国南部 €8,000-€15,000 / 希腊 €5,000-€10,000 / 西班牙 €6,000-€12,000 / 葡萄牙 €5,000-€10,000
  - **禁止 price 留 null 或 0**，必须有值

### 插入数据库
写一个 Node.js 脚本 `scripts/insert-{venue-slug}.cjs`：
```javascript
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'verra_voile'
  });
  await conn.query(
    `INSERT INTO crawled_venues
     (slug, name, name_cn, country, country_cn, region, city, city_cn,
      address, postal_code, latitude, longitude,
      tagline, tagline_cn, description, description_cn,
      cover_image, gallery_images, venue_types, amenities,
      capacity, phone, website, source_url, source_name,
      price, price_unit, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [slug, name, name_cn, country, country_cn, region, city, city_cn,
     address, postal_code, lat, lng, tagline, tagline_cn, desc, desc_cn,
     coverImage, JSON.stringify(galleryImages), JSON.stringify(venueTypes),
     JSON.stringify(amenities), capacity, phone, website, sourceUrl, sourceName,
     price, priceUnit, sortOrder]
  );
  await conn.end();
})();
```

**⚠️ JSON 字段（gallery_images, venue_types, amenities）必须用 `CAST(? AS JSON)` 写入**，否则 mysql2 会双重编码导致前端 `JSON.parse()` 失败。

---

## 第二步：从 URL B 下载高清图

### 2.1 用 Browser Agent 抓取图片 URL
访问 URL B（官网），遍历首页、Gallery、Weddings 等页面，提取所有高清图片 URL。

**不同网站的图片 CDN 域名不同**：
- Squarespace 站点：`images.squarespace-cdn.com`，加 `?w=2500` 获取高分辨率
- GuestCentric 站点：`static.guestcentric.net` 或 `secure.guestcentric.net`
- WordPress 站点：`wp-content/uploads/` 路径
- 其他：直接从页面 `<img>` 标签和 CSS 背景中提取

### 2.2 下载图片到后端

**必须使用并发下载**（5 路同时），顺序下载因国际延迟极慢（每张 3-10 秒）：
```javascript
const CONCURRENCY = 5; // 同时下载 5 张

async function downloadBatch(urls, startIdx) {
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((url, j) => {
        const idx = startIdx + i + j;
        const ext = url.includes('.webp') ? '.webp' : '.jpg';
        const filepath = path.join(SAVE_DIR, `${PREFIX}-${String(idx).padStart(3, '0')}${ext}`);
        return download(url, filepath).then(() => `✓ #${idx}`).catch(e => `✗ #${idx}: ${e.message}`);
      })
    );
    results.push(...batchResults);
    console.log(`Progress: ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length}`);
  }
  return results;
}
```

**无 CDN 防盗链的站点**：直接用 Node.js https 模块下载（更快更简单）：
```javascript
const https = require('https');
const fs = require('fs');
const path = require('path');

const SAVE_DIR = '/Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/{venue-slug}/';
const PREFIX = 'var'; // 图片前缀，如 var-000.jpg

function download(url, filepath) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      const ws = fs.createWriteStream(filepath);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(filepath); });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}
```

**有 CDN 防盗链的站点**（WeddingWire、Squarespace 等）：用 Puppeteer 绕过：
```javascript
const puppeteer = require('/Users/hongli/WorkSpace/Verra-Voile/node_modules/puppeteer');
// 从前段项目目录运行
cd /Users/hongli/WorkSpace/Verra-Voile
node /tmp/download-{venue}-images.cjs
```

### 2.3 格式转换与质量过滤

下载后必须执行两步处理：

**① 转换非 JPEG 格式**（WebP 等）：
```bash
for f in /path/to/dir/*.webp; do
  sips -s format jpeg "$f" --out "${f%.webp}.jpg"
  rm "$f"
done
```

**② 过滤小图**（宽度 < 500px 的缩略图）：
```bash
for f in /path/to/dir/*.jpg; do
  w=$(sips -g pixelWidth "$f" 2>/dev/null | grep pixelWidth | awk '{print $2}')
  if [ "$w" -lt 500 ] 2>/dev/null; then
    echo "Deleting: $f (${w}px)"
    rm -f "$f"
  fi
done
```

**⚠️ 不要以下载数量为准**，官网可能返回大量缩略图。必须按实际像素尺寸过滤后，再更新数据库 gallery_images 数组。

### 2.4 更新数据库图片路径
```javascript
// 根据实际保留的文件生成路径数组
const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.jpg')).sort();
const galleryImages = files.map(f => `/uploads/crawled/{venue-slug}/${f}`);

await conn.query(
  `UPDATE crawled_venues SET cover_image=?, gallery_images=CAST(? AS JSON) WHERE slug=?`,
  [galleryImages[0], JSON.stringify(galleryImages), slug]
);
```

### 2.5 清理旧图片
删除该场地目录下所有不再使用的旧图片文件。

---

## 第三步：前端渲染

### 详情页结构（DestinationsDetail.tsx）
```
Hero 轮播（前 3 张图）
  ↓
cd-content 容器
  ├── 关于我们（cd-about photo-about 样式：标题 + 分割线 + 正文）
  ├── 场地特色（wt-services 样式：分组标题 + 打勾列表）
  ├── 地点（dest-detail__location：地址信息）
  └── 图集（wt-portfolio__columns：瀑布流，跳过前 3 张）
```

### 列表页卡片（Destinations.tsx）
```typescript
// mapApiItem 映射
name: row.name_cn || row.name
country: row.country_cn || row.country
city: row.city_cn || row.city
tagline: row.tagline_cn || row.tagline || ''
desc: row.description_preview || ''  // API 已优先返回 description_cn
```

### 数据映射（mapApiDetail）
```typescript
tagline: row.tagline_cn || row.tagline || ''   // ⚠️ 必须优先 tagline_cn
description: row.description_cn || row.description || ''

// amenities 解析：兼容字符串数组和对象数组两种格式
const rawAmenities = typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || [])
amenities = rawAmenities.map((g: any) => ({
  titleCn: g.titleCn || g.title_cn || g.title || '',
  title: g.title || '',
  items: (g.items || []).map((item: any) =>
    typeof item === 'string' ? { labelCn: item, label: item } : item
  ),
}))
```

### 要点
- 中文优先：`description_cn || description`、`tagline_cn || tagline`
- 图集从第 4 张开始（前 3 张用于 Hero 轮播）
- 图集图片保持原始尺寸（`height: auto`），不强制固定比例
- 底部预定栏复用 `cd-book-bar` 标准组件
- 所有图片通过 `/uploads/` 代理到后端

---

## 数据库表结构（crawled_venues）

| 字段 | 类型 | 说明 |
|------|------|------|
| slug | VARCHAR(150) | URL 标识 |
| name / name_cn | VARCHAR(200) | 英文/中文名 |
| country / country_cn | VARCHAR(100) | 国家 |
| region | VARCHAR(100) | 地区（如 Algarve） |
| city / city_cn | VARCHAR(100) | 城市 |
| tagline / tagline_cn | VARCHAR(500) | 中英文宣传语 |
| description | TEXT | 英文描述 |
| description_cn | TEXT | 中文描述（以场地名称开头） |
| amenities | JSON | 场地特色（titleCn/title/items 分组结构） |
| address | VARCHAR(500) | 地址 |
| postal_code | VARCHAR(20) | 邮编 |
| latitude / longitude | DECIMAL(10,6) | 坐标 |
| cover_image | VARCHAR(500) | 封面图路径 |
| gallery_images | JSON | 图集路径数组 |
| venue_types | JSON | 场地类型（name/name_cn 对象数组） |
| capacity | VARCHAR(100) | 宾客容量 |
| website | VARCHAR(500) | 官网 URL |
| phone | VARCHAR(50) | 联系电话 |
| price | INT | 起步价 |
| price_unit | VARCHAR(20) | 货币符号（€、$、£） |
| source_url | VARCHAR(500) | 数据来源 URL |
| source_name | VARCHAR(200) | 来源平台名 |

---

## 踩坑记录

### CDN 防盗链导致图片下载 403
Squarespace CDN、WeddingWire CDN（cdn0.bodas.net / cdn0.weddingwire.com）有 Akamai bot 防护，Node.js 直接请求返回 403。
**解决**：用 Puppeteer 打开图片 URL，通过 canvas 提取 base64 数据。无防盗链的站点直接用 https 模块下载。

### Puppeteer 必须从前段项目运行
puppeteer 安装在 `/Users/hongli/WorkSpace/Verra-Voile/node_modules/`，从 `/tmp` 或后端目录运行会找不到模块。
**解决**：`require('/Users/hongli/WorkSpace/Verra-Voile/node_modules/puppeteer')`

### 图片必须存储到独立图片仓库
之前图片存在前端 `uploads/crawled/`，后端通过符号链接引用。前端目录被清空后符号链接断裂，390 张图片全部 404。
**现架构**：图片统一下载到独立 Git 仓库 `Verra-Voile-Uploads/crawled/`，后端通过符号链接引用。下载后必须在图片仓库执行 `git add + git commit`。

### WebP 格式伪装为 JPEG
WeddingWire CDN 和部分官网返回的图片实际是 WebP 格式但保存为 .jpg 扩展名，前端无法渲染。
**解决**：下载后用 `sips -s format jpeg` 批量转换所有非 JPEG 文件。

### MySQL JSON 列双重编码
对 JSON 类型列通过 `?` 占位符传入 `JSON.stringify()` 结果会导致双重编码，存为逗号分隔字符串而非 JSON 数组，前端 `JSON.parse()` 静默失败。
**解决**：SQL 中使用 `CAST(? AS JSON)` 确保正确存储为 JSON 数组。

### amenities 字段名必须匹配前端
前端期望 `{ titleCn, title, items: [{ labelCn, label }] }`，使用 `group` / `group_en` 等其他字段名会导致渲染空白。
**解决**：严格按前端接口格式组装数据。

### 官网图片大量缩略图混入
官网通常提供多种分辨率（缩略图、中图、大图），不加过滤全部下载会导致画廊充斥小图。
**解决**：下载后用 `sips -g pixelWidth` 检查每张图实际尺寸，删除宽度 < 500px 的图片。

### 列表 API description_preview 未翻译
原查询 `LEFT(description, 200)` 只取英文描述，卡片显示英文。
**解决**：改为 `LEFT(COALESCE(NULLIF(description_cn, ''), description), 200)` 优先中文。

### price_unit 使用符号而非代码
`price_unit` 存 "EUR" 会显示 "EUR5,000"，不直观。
**解决**：存货币符号 `€`、`$`、`£`，显示为 "€5,000起"。

### 图集图片被强制裁剪
`wt-portfolio__img` 样式设置了 `aspect-ratio: 3/4` + `object-fit: cover`，所有图片被裁成固定比例。
**解决**：改为 `height: auto` 保持图片原始尺寸，与 Photography 作品展一致。

### tagline_cn 未优先显示
详情页 `mapApiDetail` 中 `tagline` 字段使用了 `row.tagline || ''`，导致显示英文原文而非中文翻译。
**解决**：改为 `row.tagline_cn || row.tagline || ''`，与列表页 `mapApiItem` 保持一致。所有中文优先字段都应按此模式处理。

### amenities items 为字符串数组时渲染空白
插入数据时 amenities 的 items 存为字符串数组 `["玻璃幕墙宴会厅", ...]`，但前端渲染访问 `item.labelCn` 属性（期望对象格式），导致场地特色区域显示空白。
**解决**：在 `mapApiDetail` 中增加自动转换逻辑——`typeof item === 'string' ? { labelCn: item, label: item } : item`，兼容两种数据格式。插入新数据时仍应尽量使用标准对象格式。

### 顺序下载图片极慢
国际链路（法国/意大利/希腊服务器）顺序下载每张 3-10 秒，45 张需 5-10 分钟。
**解决**：必须用并发下载（`Promise.all` 分批，每批 5 张同时下载），45 张只需 30-60 秒。

### Browser Agent 误报重定向
Browser Agent 访问场地官网时错误报告"页面重定向到其他网站"，实际上两个场地完全独立。Agent 对 URL 跳转的判断不可靠。
**解决**：关键信息（地址、坐标、场地名称）必须用 WebFetch 直接验证，不盲信 Agent 的结论。

### 列表页无限滚动与分组渲染冲突
Destinations/WeddingTeam/Photography 列表页使用国家分组布局，但全局无限滚动（`visibleCount` 按平面列表切片）会导致新场地插入后渲染位置错乱——滑到底部才在顶部渲染出新卡片。
**解决**：移除全局 `visibleCount` 无限滚动，改为**国家分组级别分页**：`GROUPS_PER_PAGE = 5` 控制每次显示几个国家分组，每组内部已有"查看更多"展开机制。底部用"加载更多…"按钮替代 scroll 事件监听。新场地入库只影响其所在国家分组，不打乱其他分组。
