# BBR 葡萄酒爬取入库技能

## 概述

从 bbr.com (Berry Bros. & Rudd) 爬取葡萄酒/香槟商品数据，下载图片并写入 `products_wine` 表。BBR 无 Cloudflare 防护，可直接爬取。

## 完整流程

### 第一步：Browser Agent 爬取数据

使用 Browser Agent 访问 BBR 产品页，提取以下信息：

```
Browser Agent 提示词模板：

Visit {BBR_URL}

Extract ALL of the following data from this page:

1. **Product name** (exact name shown on page)
2. **Price** in £ (exact price, including any decimal)
3. **Bottle volume/capacity** (e.g. 75cl)
4. **Region/Country** (e.g. France, Champagne)
5. **Wine type** (Champagne / Sparkling / Red wine etc.)
6. **Vintage year**
7. **Full Description** - the complete product description text, including any attribution
8. **All images** - get the full-resolution image URLs:
   - The main product image URL (use the base URL without overlays:
     https://media.bbr.com/i/bbr/...?fmt=auto&qlt=default&w=944&h=944)
   - Any other product images in the carousel/gallery
9. **Buying options** - all available options (Bottle, Case etc.) with exact prices and specs
10. **Overview attributes** - structured data: Colour, Sweetness, Vintage, Alcohol %,
    Maturity, Grape List, Producer, Region etc.
11. **Tagline or subtitle** if shown
12. **About section** - Click on the "About" tab. Get ALL image-text cards (Grape, Region,
    Producer). For each card get:
    - The exact image URL (right-click → copy image address)
    - The title text
    - The full description text
13. **Wine reviews/ratings** - any critic scores shown

Take screenshots of the full page and the About tab. Report ALL data precisely.
```

**注意事项：**
- BBR 产品页只有 1 张产品主图（轮播中重复显示），不要遗漏
- About 部分通常有 2-3 张图文卡片（品种/产区/酒庄），不是每个产品都有产区卡片
- 部分产品没有独立的描述文字（description 为空），需要根据属性信息自行撰写
- 图片 URL 使用 `media.bbr.com` CDN，通过 URL 参数调整尺寸

### 第二步：下载图片

```bash
# 主产品图（944x944 高清）
curl -sL "{主图URL}?fmt=auto&qlt=default&w=944&h=944" \
  -o /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/wine/{slug}.jpg

# About 图文卡片（500x500）
curl -sL "{品种图URL}?w=500&fmt=auto&qlt=default&sm=aspect&aspect=1:1" \
  -o /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/wine/{grape-slug}-grape.jpg

curl -sL "{酒庄图URL}?w=500&fmt=auto&qlt=default&sm=aspect&aspect=1:1" \
  -o /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/wine/{producer-slug}-producer.jpg
```

**同步到前端：**
```bash
cp /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/wine/{所有新图片}.jpg \
   /Users/hongli/WorkSpace/Verra-Voile/uploads/crawled/wine/
```

**图片复用：**
- 同一品种（如 Pinot Noir）可复用已有图片，无需重复下载
- 已有品种图片：`pinot-noir-grape.jpg`、`chardonnay-grape.jpg`、`grenache-grape.jpg`

### 第三步：数据库入库

使用内联 Node.js 脚本插入数据：

```javascript
export PATH="/Users/hongli/.nvm/versions/node/v24.18.0/bin:$PATH"
cd /Users/hongli/WorkSpace/Verra-Voile-End
node -e '
require("dotenv").config();
const mysql = require("mysql2/promise");
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "verra_voile",
  });

  const productId = "{产品slug}";
  // ... 插入逻辑
})().catch(e => { console.error(e); process.exit(1); });
'
```

### 数据库字段规范

#### products_wine 表核心字段

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| product_id | varchar(50) | 唯一标识（slug） | `champagne-agrapart-avizoise-2019` |
| name | varchar(200) | 中文名 | `阿格拉帕尔 阿维兹特酿` |
| name_en | varchar(200) | 英文名 | `Champagne Agrapart Avizoise...` |
| price | int | 起步价（整数，四舍五入） | `154` |
| unit | varchar(10) | 货币符号 | `£` |
| capacity | varchar(100) | 瓶装容量 | `75cl` |
| image | varchar(500) | 主图路径 | `/uploads/crawled/wine/xxx.jpg` |
| images | json | 图片数组 | `["/uploads/crawled/wine/xxx.jpg"]` |
| tagline | varchar(300) | 营销短语 | `白丘心脏的纯粹霞多丽香槟` |
| tags | json | 分类标签 | `{type:"香槟", region:"法国", vintage:"2019"}` |
| highlights | json | 亮点数组 | `["100% 霞多丽", "Avize 特级村", ...]` |
| buying_options | json | 规格套餐 | `[{name,spec,unit,price,note}]` |
| overview | json | 概览内容 | 见下方结构 |
| source_url | varchar(500) | BBR 原站链接 | `https://www.bbr.com/products-...` |

**注意：表中没有 `type`、`region`、`vintage`、`alcohol`、`updated_at` 列。** 这些信息存在 `tags` 和 `overview` JSON 字段中。

#### overview JSON 结构

```json
{
  "description": "中文描述段落（BBR 无描述时自行撰写）",
  "attributes": [
    { "icon": "droplet", "label": "色泽", "value": "白葡萄酒" },
    { "icon": "glass", "label": "甜度", "value": "特干 (Extra Brut)" },
    { "icon": "calendar", "label": "年份", "value": "2019" },
    { "icon": "percent", "label": "酒精度", "value": "12.5%" },
    { "icon": "clock", "label": "成熟度", "value": "尚未适饮 (2027-2044)" },
    { "icon": "grape", "label": "葡萄品种", "value": "100% 霞多丽 (Chardonnay)" },
    { "icon": "body", "label": "酒体", "value": "中等酒体" },
    { "icon": "producer", "label": "产区", "value": "Côte des Blancs, Champagne" },
    { "icon": "producer", "label": "酒庄", "value": "Champagne Agrapart & Fils" }
  ],
  "aboutItems": [
    {
      "title": "葡萄品种：霞多丽",
      "image": "/uploads/crawled/wine/chardonnay-grape.jpg",
      "text": "品种介绍中文文字..."
    },
    {
      "title": "酒庄：Champagne Agrapart & Fils",
      "image": "/uploads/crawled/wine/agrapart-producer.jpg",
      "text": "酒庄介绍中文文字..."
    }
  ]
}
```

#### icon 映射（必须使用以下有效值）

| 属性 | icon 值 |
|------|---------|
| 色泽 | `droplet` |
| 甜度 | `glass` |
| 年份 | `calendar` |
| 酒精度 | `percent` |
| 成熟度/适饮期 | `clock` |
| 葡萄品种 | `grape` |
| 酒体 | `body` |
| 产区 | `producer` |
| 酒庄 | `producer` |

**无效 icon（如 `check`、`wine`、`map-pin`、`home`）会显示为默认圆点。**

#### tags JSON 结构

```json
{ "type": "香槟", "region": "法国", "vintage": "2019" }
```

- `type` 可选值：`红葡萄酒`、`白葡萄酒`、`香槟`
- `region`：国家名（`法国`、`意大利`、`西班牙`）
- `vintage`：年份字符串

#### buying_options JSON 结构

```json
[
  { "name": "单瓶", "spec": "1 x 75cl", "unit": "£", "price": 48.80 },
  { "name": "整箱", "note": "6瓶装", "spec": "6 x 75cl", "unit": "£", "price": 292.80 },
  { "name": "大瓶装", "note": "Magnum", "spec": "1 x 150cl", "unit": "£", "price": 88.90 }
]
```

- 规格名称已中文化：Bottle→单瓶，Case→整箱
- 如果单瓶和整箱价格一致，只保留单瓶

#### aboutItems 字段注意

- 必须使用 `text` 字段（不是 `description`），前端渲染读取的是 `item.text`
- 图片路径使用本地路径：`/uploads/crawled/wine/xxx.jpg`

### 第四步：验证

```bash
curl -s http://localhost:3000/api/products/wine | python3 -c "
import sys, json
d = json.load(sys.stdin)
products = d['data']['products']
for p in products:
    if p['productId'] == '{product_id}':
        print('name:', p['name'])
        print('price:', p['price'])
        print('tags:', json.dumps(p.get('tags'), ensure_ascii=False))
        print('buyingOptions:', json.dumps(p.get('buyingOptions'), ensure_ascii=False))
        ov = p.get('overview', {})
        print('attributes:', len(ov.get('attributes',[])), '项')
        print('aboutItems:', len(ov.get('aboutItems',[])), '项')
        for i, item in enumerate(ov.get('aboutItems',[])):
            print(f'  卡片{i+1}: text={\"text\" in item}')
print('共', len(products), '款产品')
"
```

## 踩坑记录

1. **表结构陷阱**：products_wine 没有 `type`/`region`/`vintage`/`alcohol`/`updated_at` 列，INSERT 语句不要包含这些字段
2. **aboutItems 字段名**：必须用 `text` 不是 `description`，前端 `WineDetail.tsx` 读取的是 `item.text`
3. **icon 名称**：只能使用 `getAttrIcon` 函数中定义的 8 个图标名（droplet/glass/calendar/percent/clock/grape/body/producer），其他名称会显示为圆点
4. **price 字段**：数据库定义为 `int` 类型，需要四舍五入取整（如 £153.50 → 154）
5. **capacity 补全**：部分产品可能缺少 capacity 字段，可从 buying_options[0].spec 中提取（正则 `(\d+\s*cl)`）
6. **图片同步**：后端 downloads 必须 cp 到前端 uploads，否则 Vite 无法 serve 图片
7. **产品图 URL 必须用 `/s/` 路径**：BBR 产品图 CDN 有两种路径 — `/i/`（内部服务）和 `/s/`（静态服务）。curl 下载时**必须用 `/s/` 路径**，格式：`https://media.bbr.com/s/bbr/{product_code}-ms?img404=Default_Wine&fmt=auto&qlt=default&w=944&h=944`。`/i/` 路径可能返回酒桶占位图而非真实产品图。页面源码中的 `$deskPDP$` 是服务端模板变量，curl 时需去掉
8. **aboutItems 图片路径必须是相对 URL**：所有 aboutItems 中的 `image` 字段必须是 `/uploads/crawled/wine/xxx.jpg` 格式的相对 URL，**严禁使用文件系统绝对路径**（如 `/uploads/hongli/WorkSpace/.../xxx.jpg`）。插入前务必检查每个 image 值是否以 `/uploads/crawled/wine/` 开头
9. **替换图片后浏览器缓存问题**：后端 `/uploads` 静态文件设置了 30 天缓存（`max-age=2592000`），替换图片文件后浏览器仍会显示旧图。验证时需按 **Cmd+Shift+R** 强制刷新跳过缓存，或在图片 URL 后加 `?v=时间戳` 破坏缓存
10. **curl/JSON-LD 无法获取 aboutItems**：BBR 的 Overview/About 是客户端渲染的 Tab 切换，curl 获取的静态 HTML 中**不包含 About 标签页的图文卡片数据**。JSON-LD Product 对象只有基础属性（name/description/image/additionalProperty），没有 grape/region/producer 的图文卡片。此外 JSON-LD 本身也不可靠——部分页面完全没有 JSON-LD Product 数据，或返回了错误产品的数据。**aboutItems 必须通过 Browser Agent 访问页面、点击 About 标签页后提取**
11. **product_id 长度限制**：varchar(50) 限制，slug 生成时控制在 40 字符以内，避免超长被截断导致 URL 不可用
12. **价格必须从页面提取，不可留空或写 0**：BBR 页面的价格来源有两种渠道 — ① JSON-LD 中的 `offers.price` 字段（curl 可提取，格式 `"price":16.5`）；② Browser Agent 访问页面直接读取。部分页面没有 JSON-LD Product 数据（如 Triennes），此时**必须用 Browser Agent 获取价格**。入库前必须验证 price > 0，buying_options 数组不能为空。价格四舍五入存入 price 字段（int），buying_options 中保留精确价格（含小数）

## 产品 ID (slug) 命名规范

格式：`{品种/酒庄关键词}-{产区}-{年份}`

已有示例：
- `allegrini-valpolicella-2025`
- `pieropan-soave-classico-la-rocca-2023`
- `lo-bancal-de-granatxa-2025`
- `champagne-clandestin-boreal-2022`
- `pierre-paillard-ambonnay-grand-cru-2020`
- `champagne-agrapart-avizoise-2019`

## 完整检查清单

1. [ ] Browser Agent 爬取所有数据（名称/价格/属性/About 卡片图片URL）
2. [ ] curl 下载主产品图到后端 uploads/crawled/wine/
3. [ ] curl 下载 About 图文卡片到后端 uploads/crawled/wine/（已有品种图可复用）
4. [ ] cp 同步所有新图片到前端 uploads/crawled/wine/
5. [ ] 内联 Node.js 脚本插入数据库（注意字段名和 icon 映射）
6. [ ] curl API 验证新产品数据完整
7. [ ] 确认 aboutItems 使用 `text` 字段（非 `description`）
8. [ ] 确认 aboutItems 所有 image 路径以 `/uploads/crawled/wine/` 开头，无绝对路径泄漏
