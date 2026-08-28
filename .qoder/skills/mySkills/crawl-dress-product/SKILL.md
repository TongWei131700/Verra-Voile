---
name: crawl-dress-product
description: 从 wonaconcept.com 或其他来源爬取礼服商品数据，下载图片/视频到本地，插入数据库，rsync 图片到服务器。前端自动从 API 获取数据渲染，无需修改前端代码。当用户说"爬取礼服"、"添加礼服商品"、"抓取dress"时触发。
---

# 爬取礼服商品数据并渲染

## 概述
从 wonaconcept.com 爬取礼服商品数据，下载图片/视频到本地存储，插入 `crawled_dresses` 数据库表。前端通过 API 动态获取数据渲染列表和详情页，**无需修改前端代码、无需重新构建部署前端**。

## 架构特点
- **数据库驱动**：数据存储在 `crawled_dresses` 表，前端通过 API 动态获取
- **图片本地化**：所有图片/视频下载到本地 `uploads/crawled/dresses/{slug}/` 目录
- **零前端改动**：新增/更新礼服只需数据库插入 + rsync 图片，前端自动适配
- **瀑布流画廊**：详情页作品画廊采用响应式分列布局（宽屏3列/窄屏2列/手机1列）

## 前置条件
- 后端运行在服务器（PM2 管理），数据库 MySQL
- 本地后端 `localhost:3000`（开发用）
- 前端 `localhost:5173`（Vite dev server）

---

## 第一部分：数据爬取

### 数据源
主要来自 `https://wonaconcept.com/{slug}/`，每个商品页面包含：
- 商品名称、系列（Collection）
- 描述（廓形、面料、风格）
- 产品图片（高清 JPG）
- 产品视频（MP4/WebM，部分商品有）

### Step 1：检查商品是否已存在

```bash
# 查数据库
ssh root@server "mysql -u root -p'密码' verra_voile -e \"SELECT slug, name FROM crawled_dresses WHERE slug LIKE '%关键词%' OR name_en LIKE '%关键词%' LIMIT 5\" 2>/dev/null"
```

### Step 2：使用 Browser Agent 爬取页面

**Browser Agent 提示词模板**：

```
Visit https://wonaconcept.com/{slug}/ and extract ALL product information:

1. Product name and full description text
2. ALL image URLs (from img tags, especially large product images from wonaconcept.com/upload/... - ignore thumbnails with t_ prefix, logos, and tiny icons)
3. Any video URLs (video tags or source elements with .webm or .mp4)
4. Category/series info (what collection/line it belongs to - look for breadcrumbs or navigation)
5. Product specifications (silhouette, style, neckline, dress length etc.)

Return the complete organized list of URLs.
```

### Step 3：翻译为中文

爬取到的英文数据**必须立即翻译**后再入库，所有面向用户的字段都使用中文：

| 字段 | 翻译规则 | 示例 |
|------|----------|------|
| `name` | `中文名 英文名` 格式 | `阿诺 Aveline` |
| `name_en` | 保留英文原名 | `Aveline` |
| `tagline` | 翻译系列名 | `工坊传承系列`（原 Atelier Heritage Edition） |
| `description` | 整段翻译为流畅中文 | 塔夫绸、缎面与蕾丝交织出… |
| `highlights` | 每个标签翻译 | `["美人鱼廓形", "波西米亚风格", "及地长裙"]` |

**翻译要点**：
- 廓形术语：Mermaid→美人鱼廓形、A-line→A字廓形、Ball gown→蓬蓬裙
- 领口术语：Sweetheart→心形领、Strapless→抹胸、Asymmetric→不对称
- 面料术语：Taffeta→塔夫绸、Satin→缎面、Lace→蕾丝、Tulle→薄纱
- 风格术语：Boho→波西米亚风格、Romantic→浪漫风格、Minimalist→极简风格
- 裙长术语：Floor length→及地长裙、Tea length→中长裙、Mini→迷你短裙

### Step 4：提取信息整理

| 字段 | 说明 | 示例 |
|------|------|------|
| 名称 | 中文名 + 英文名（已翻译） | `阿诺 Aveline` / `Aveline` |
| 系列 | 所属产品线 | `Atelier Heritage Edition` |
| 描述 | **已翻译为中文**的完整描述 | 塔夫绸、缎面与蕾丝交织出… |
| 亮点 | 4-6 个**已翻译**关键词标签 | `['美人鱼廓形', '波西米亚风格', '及地长裙']` |
| 图片 | 全部高清 JPG URL | 通常 5-9 张 |
| 视频 | MP4/WebM URL（可选） | 部分商品有 |
| 分类 | 对应前端 DressCategory | `maison-blanche` / `atelier` / `veils` 等 |

### 分类映射（DressCategory）

```typescript
type DressCategory =
  | 'maison-blanche'    // Maison Blanche
  | 'atelier'           // Atelier 系列
  | 'white'             // White 系列
  | 'couture'           // Couture 高定
  | 'bridal-alchemy'    // Bridal Alchemy
  | 'gemini'            // Gemini
  | 'alma-de-oro'       // Alma de Oro
  | 'amore-in-fiore'    // Amore in Fiore
  | 'endless-styles'    // Endless Styles
  | 'miami-bliss'       // Miami Bliss
  | 'veils'             // Veils 头纱
```

如需新增分类：同时修改 `wonaDresses.ts` 中的 `DressCategory` 类型和 `dressCategoryList` 数组。

---

## 第二部分：图片/视频下载

### 目录结构
```
uploads/crawled/dresses/{slug}/
├── images/
│   ├── 00.jpg    # 封面图（第一张）
│   ├── 01.jpg
│   ├── 02.jpg
│   └── ...
└── videos/
    └── video.mp4  # 或 video.webm（可选）
```

### 下载命令

```bash
# 创建目录
mkdir -p /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/dresses/{slug}/images
mkdir -p /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/dresses/{slug}/videos

# 下载图片（并发）
cd /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/dresses/{slug}
for i in 1 2 3 4 5; do
  idx=$(printf "%02d" $((i-1)))
  curl -sL -o "images/${idx}.jpg" "https://wonaconcept.com/upload/catalog/XXXX/YYYY/wona_{collection}_{slug}_${i}.jpg" &
done

# 下载视频（如有）
curl -sL -o "videos/video.mp4" "https://wonaconcept.com/upload/catalog/XXXX/YYYY/wona_{collection}_{slug}.mp4" &
wait
```

### WONÁ Concept 图片 URL 规律
- 格式：`https://wonaconcept.com/upload/catalog/{catalog_id}/{product_id}/wona_{collection}_{slug}_{n}.jpg`
- catalog_id/product_id：从页面 HTML 或 Browser Agent 提取
- 视频：同目录下无 `_N` 后缀，如 `wona_{collection}_{slug}.mp4`

---

## 第三部分：数据库插入

### ⚠️ 入库前必须确认翻译

所有面向用户字段（name、tagline、description、highlights）**必须是中文**，不可将英文原文直接入库。
翻译工作在爬取完成后、数据库插入前完成。

### 表结构（crawled_dresses）

```sql
CREATE TABLE crawled_dresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(150) NOT NULL,          -- URL标识，如 'wona-carat'
  name VARCHAR(200) NOT NULL,          -- 中文名，如 '克拉 Carat'
  name_en VARCHAR(200) DEFAULT '',     -- 英文名，如 'Carat'
  category VARCHAR(100) DEFAULT '',    -- 分类key，如 'atelier'
  category_cn VARCHAR(100) DEFAULT '', -- 分类显示名，如 'Atelier 系列'
  tagline VARCHAR(500) DEFAULT '',     -- 宣传语，如 'Atelier Heritage Edition · 复古'
  description TEXT,                    -- 完整描述（中文）
  highlights JSON,                     -- 亮点标签 ["A 字廓形", "心形领 · 抹胸"]
  cover_image VARCHAR(500),            -- 封面图路径
  images JSON,                         -- 图片路径数组 ["/uploads/.../00.jpg", ...]
  video_url VARCHAR(500) DEFAULT '',   -- 视频路径
  source_name VARCHAR(200) DEFAULT '', -- 来源名称
  source_url VARCHAR(500) DEFAULT '',  -- 来源URL
  price INT DEFAULT NULL,              -- 价格（€）
  sort_order INT DEFAULT 0,            -- 排序权重
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_slug (slug),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 插入 SQL

```javascript
await conn.execute(
  `INSERT INTO crawled_dresses
    (slug, name, name_en, category, category_cn, tagline, description,
     highlights, cover_image, images, video_url, source_name, source_url, price, sort_order)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    slug, name, name_en, category, category_cn, tagline, description,
    JSON.stringify(highlights),  // 数组转 JSON
    cover_image,
    JSON.stringify(images),      // 数组转 JSON
    video_url, source_name, source_url, price, sort_order
  ]
)
```

### 本地路径格式
所有图片/视频使用本地路径：
- 图片：`/uploads/crawled/dresses/{slug}/images/NN.jpg`
- 视频：`/uploads/crawled/dresses/{slug}/videos/video.mp4`

### 价格规范
- **所有礼服必须有价格**，禁止留空或设为 NULL
- 单位：€（欧元），显示格式 `€{price} 起`
- 范围：€100 ~ €400（礼服），€100 ~ €300（配饰/头纱）
- 定价策略：在对应系列的价格区间内随机取值，参考各系列均价：

| 系列 | 均价 | 区间 |
|------|------|------|
| Atelier 系列 | ~€250 | €100 ~ €400 |
| Maison Blanche | ~€220 | €100 ~ €320 |
| Couture 高定 | ~€240 | €100 ~ €400 |
| White 系列 | ~€240 | €100 ~ €380 |
| Bridal Alchemy | ~€255 | €100 ~ €400 |
| Miami Bliss | ~€290 | €100 ~ €400 |
| Endless Styles | ~€250 | €100 ~ €400 |
| Gemini Collection | ~€250 | €100 ~ €400 |
| Alma de Oro | ~€250 | €100 ~ €390 |
| Amore in Fiore | ~€220 | €100 ~ €400 |
| Veils 头纱 | ~€180 | €150 ~ €200 |

- 新商品入库时，根据其所属系列，在该系列均价附近随机取值（±€50）
- 底部预定栏始终显示价格，不做条件判断

---

## 第四部分：图片同步到服务器

### 逐个目录 rsync（推荐）

```bash
# 必须逐个目录同步，不要用多源 rsync（会导致目录嵌套错误）
rsync -avz -e "ssh" /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/dresses/{slug}/ \
  root@47.99.138.250:/var/www/verra-voile-end/uploads/crawled/dresses/{slug}/
```

### 验证图片可访问

```bash
ssh root@server "curl -sI 'https://www.europewedding.cn/uploads/crawled/dresses/{slug}/images/00.jpg' | head -3"
# 预期：HTTP/1.1 200 OK
```

### ⚠️ 踩坑：多源 rsync 导致目录嵌套

**错误写法**（会把多个源目录内容混在一起）：
```bash
# ❌ 错误！多个源目录 → 目标目录会创建 images/ videos/ 等错误子目录
rsync -avz dir1/ dir2/ dir3/ root@server:/destination/
```

**正确写法**：
```bash
# ✅ 逐个同步
rsync -avz dir1/ root@server:/destination/dir1/
rsync -avz dir2/ root@server:/destination/dir2/
rsync -avz dir3/ root@server:/destination/dir3/
```

---

## 第五部分：API 接口

### 后端路由

| 端点 | 说明 |
|------|------|
| `GET /api/products/crawled-dresses` | 列表（返回 description_preview 截断200字） |
| `GET /api/products/crawled-dresses/:slug` | 详情（返回完整 description） |

### API 返回格式

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "wona-carat",
      "name": "克拉 Carat",
      "name_en": "Carat",
      "category": "atelier",
      "category_cn": "Atelier 系列",
      "tagline": "Atelier Heritage Edition · 复古",
      "description_preview": "Carat 以比例优先呈现…",
      "highlights": ["A 字廓形", "心形领 · 抹胸", "落地长裙"],
      "cover_image": "/uploads/crawled/dresses/wona-carat/images/00.jpg",
      "images": ["/uploads/crawled/dresses/wona-carat/images/00.jpg", "..."],
      "video_url": "/uploads/crawled/dresses/wona-carat/videos/video.mp4",
      "source_name": "WONÁ Concept",
      "source_url": "https://wonaconcept.com/carat/",
      "price": 350
    }
  ]
}
```

### 前端映射（mapApiItem / mapApiDetail）

后端返回 snake_case，前端需要转为 camelCase：

```typescript
function mapApiItem(row: any): DressProduct {
  let highlights: string[] = []
  try { highlights = typeof row.highlights === 'string' ? JSON.parse(row.highlights) : (row.highlights || []) } catch {}
  let images: string[] = []
  try { images = typeof row.images === 'string' ? JSON.parse(row.images) : (row.images || []) } catch {}
  return {
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en || '',
    category: row.category || 'all',
    categoryCn: row.category_cn || '',
    tagline: row.tagline || '',
    desc: row.description_preview || row.description || '',
    highlights,
    cover: row.cover_image || '',
    images,
    video: row.video_url || undefined,
    price: row.price ?? undefined,
    source: row.source_name ? { name: row.source_name, url: row.source_url || '' } : undefined,
  }
}
```

**关键**：MySQL JSON 列由 mysql2 驱动自动解析为数组，但需兼容字符串情况（`typeof === 'string'` 时手动 `JSON.parse`）。

---

## 第六部分：前端页面架构

### 路由
- 列表页：`/dresses` → `Dresses.tsx`
- 详情页：`/dresses/:slug` → `DressesDetail.tsx`

### 列表页（Dresses.tsx）
- 全屏 Hero + 搜索框 + 筛选栏（系列/廓形风格）
- 卡片展示：封面图 + 名称 + 宣传语 + 亮点标签 + 价格
- 按系列分组显示，支持"查看更多"分页加载
- 数据从 `GET /api/products/crawled-dresses` 获取
- 模块级缓存 `_cachedDresses`（返回列表页时复用）

### 详情页（DressesDetail.tsx）
```
Hero 区域（轮播图：cover + images 前几张）
  ↓
关于这件礼服（description 正文）
  ↓
亮点标签（highlights）
  ↓
作品画廊（瀑布流分列：≥1100px→3列, ≥500px→2列, <500px→1列）
  ├── 视频项（如有，带播放图标）
  └── 图片项（点击打开 Lightbox）
  ↓
底部预定栏（价格 + 咨询按钮）
```

### ⚠️ useMemo 依赖陷阱

从静态数据改为 API 获取后，所有依赖 `allProducts` 的 `useMemo` 必须将 `allProducts` 加入依赖数组：

```typescript
// ❌ 错误：allProducts 是 useState，初始为空数组，API 加载后不重新计算
const filteredList = useMemo(() => { ... }, [selectedSeries, selectedStyles, searchFilter])

// ✅ 正确：加入 allProducts
const filteredList = useMemo(() => { ... }, [allProducts, selectedSeries, selectedStyles, searchFilter])
```

---

## 完整流程（Checklist）

```
1. [ ] 检查商品是否已存在（数据库查询）
2. [ ] 使用 Browser Agent 爬取页面（名称、描述、图片URL、视频URL、系列）
3. [ ] 翻译所有英文内容为中文（name、tagline、description、highlights）
4. [ ] 下载图片/视频到本地后端目录
     mkdir -p uploads/crawled/dresses/{slug}/images videos/
     curl 下载到本地
5. [ ] 插入本地数据库（INSERT INTO crawled_dresses，使用翻译后的中文数据，必须包含 price）
6. [ ] 本地预览确认（刷新 localhost:5173/dresses 查看效果）
7. [ ] 用户确认后：rsync 图片到服务器 + 插入服务器数据库
8. [ ] 验证 API 返回：curl https://www.europewedding.cn/api/products/crawled-dresses/{slug}
9. [ ] 验证图片可访问：curl -I https://www.europewedding.cn/uploads/.../{slug}/images/00.jpg
```

### 验证示例

```bash
# 验证 API
curl -s http://127.0.0.1:3000/api/products/crawled-dresses/wona-carat | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['name'], len(d['data']['images']), 'images')"

# 验证图片
curl -sI https://www.europewedding.cn/uploads/crawled/dresses/wona-carat/images/00.jpg | head -3
# 预期：HTTP/1.1 200 OK
```

---

## 注意事项

### 爬取
1. **wonaconcept.com 图片 URL**：需从页面 HTML 中提取完整路径（catalog_id/product_id 每个商品不同）
2. **视频格式**：可能是 `.mp4` 或 `.webm`，需实际验证
3. **分类对应**：根据商品所属系列映射到前端 `DressCategory`

### 图片
4. **必须本地化**：图片下载到后端 `uploads/crawled/dresses/`，不依赖外部 URL
5. **必须 rsync 到服务器**：本地下载后需同步到服务器，否则线上 404
6. **逐个 rsync**：不要用多源 rsync，会导致目录嵌套错误

### 数据库
7. **JSON 字段**：`highlights` 和 `images` 是 JSON 列，插入时 `JSON.stringify()`
8. **mysql2 自动解析**：API 返回时 JSON 列已自动解析为数组
9. **sort_order**：控制列表排序，新商品追加到末尾即可
10. **price 必填**：所有礼服必须有价格（€100~€400），禁止 NULL 或 0，否则前端显示“需咨询”

### 前端
10. **零改动**：新增商品只需数据库插入 + rsync 图片，前端自动显示
11. **useMemo 依赖**：所有依赖 `allProducts` 的计算必须加入依赖数组
12. **缓存机制**：列表页有模块级缓存 `_cachedDresses`，详情页每次 fetch

---

## 相关文件

### 后端
- 数据库建表：`/Users/hongli/WorkSpace/Verra-Voile-End/src/db.js`（ensureCrawledDressesTable）
- API 路由：`/Users/hongli/WorkSpace/Verra-Voile-End/src/routes/products.js`（crawled-dresses）
- 迁移脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/scripts/migrate-dresses-to-db.cjs`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/dresses/{slug}/`

### 前端
- 列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Dresses.tsx`
- 详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/DressesDetail.tsx`
- 类型定义：`/Users/hongli/WorkSpace/Verra-Voile/src/data/wonaDresses.ts`
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`

### 服务器
- 后端目录：`/var/www/verra-voile-end/`
- 前端目录：`/var/www/verra-voile/`
- 图片仓库：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/dresses/`（本地）
- 服务器图片目录：`/var/www/verra-voile-end/uploads/crawled/dresses/`（部署时 rsync 同步）
- 数据库：MySQL `verra_voile`，用户 `root`

### 现有数据参考
- 368 件商品已入库（wona-adagio-set ~ wona-palette）
- 新增的 3 个单独爬取商品：wona-nv001（头纱）、wona-carat（Atelier）、wona-palette（Maison Blanche）
