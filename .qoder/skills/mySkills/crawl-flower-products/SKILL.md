# 花卉产品爬取技能

## 概述

本技能用于爬取花卉产品数据并入库，支持两种类型：
1. **鲜花花束系列** - 单个花卉商品（如 Florajet 的 COCCINELLE、LIMONE、EVIDENCE）
2. **花艺服务团队** - 花店/花艺工作室（如 Amaranté London）

## 数据结构

### 鲜花花束系列 (fresh_flower_products)

存储在 `crawled_florists` 表的 `fresh_flower_products` JSON 字段中，数组格式：

```json
{
  "slug": "evidence",
  "name": "EVIDENCE",
  "name_cn": "EVIDENCE",
  "price": 36.90,
  "price_from": true,
  "category": "鲜花花束",
  "image": "/uploads/crawled/florajet/products/evidence.jpg",
  "images": [
    "/uploads/crawled/florajet/products/evidence.jpg",
    "/uploads/crawled/florajet/products/evidence-2.jpg"
  ],
  "desc": "法语简短描述...",
  "desc_cn": "中文简短描述...",
  "desc_full": "法语完整描述...",
  "desc_full_cn": "中文完整描述...",
  "composition": "法语花材组成...",
  "composition_cn": "中文花材组成...",
  "formules": [
    {
      "name": "Beaucoup",
      "name_cn": "经典款",
      "price": 36.90,
      "diameter": "34cm - 38cm",
      "desc": "标准规格，精致小巧的花束...",
      "detail": "花束尺寸较小，花材数量较少...",
      "recommended": false,
      "luxury": false
    },
    {
      "name": "Énormément",
      "name_cn": "推荐款",
      "price": 42.90,
      "diameter": "38cm - 42cm",
      "desc": "推荐规格，与展示图片基本一致...",
      "detail": "花束在花材种类和数量上与商品图片高度一致...",
      "recommended": true,
      "luxury": false
    },
    {
      "name": "Passionnément",
      "name_cn": "豪华款",
      "price": 52.90,
      "diameter": "42cm - 46cm",
      "desc": "豪华规格，花材更丰富...",
      "detail": "这是最尊贵的规格...",
      "recommended": false,
      "luxury": true
    }
  ],
  "accessoires": [
    { "name": "Bulle d'eau", "name_cn": "水球保鲜", "price": 4.50 },
    { "name": "Vase PVC", "name_cn": "PVC花瓶", "price": 5.00 }
  ]
}
```

**关键字段说明：**
- `name` / `name_cn`: 商品名称（建议保留法语原文）
- `price_from`: 是否显示"起"字（true = 显示价格起步）
- `desc_full_cn`: 完整中文描述（必须翻译）
- `formules`: 规格套餐数组，通常 3 档
- `accessoires`: 附加选项数组

### 花艺服务团队

存储在 `crawled_florists` 表的独立记录中，`type` 字段为 `florist`：

```json
{
  "slug": "amarante-london",
  "name": "Amaranté London",
  "type": "florist",
  "country": "英国",
  "city": "伦敦",
  "description": "花店描述...",
  "description_cn": "中文描述...",
  "specialties": ["婚礼花艺", "手捧花", "场地布置"],
  "images": ["图片1", "图片2"],
  "team_members": [...],
  "price": 3500
}
```

## 爬取流程

### 1. 鲜花花束系列（以 Florajet 为例）

#### 步骤 1: 使用 Browser Agent 爬取商品页面

```javascript
// 在 Browser Agent 中执行，提取以下信息：
// - 商品名称（法语原文）
// - 价格（数字）
// - 所有图片 URL（主图 + 缩略图的大图版本）
// - 产品描述（法语 + 中文翻译）
// - 规格套餐 formules（名称、价格、直径、描述）
// - 附加选项 accessoires（名称、价格）
// - 花材组成 composition
```

#### 步骤 2: 下载图片到本地

```bash
# 后端目录
cd /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/florajet/products
curl -sL -o {slug}.jpg "{图片URL}"
curl -sL -o {slug}-2.jpg "{图片URL2}"
# ... 下载所有图片

# 同步到前端
cp {slug}*.jpg /Users/hongli/WorkSpace/Verra-Voile/uploads/crawled/florajet/products/
```

#### 步骤 3: 插入数据库

```javascript
// 读取现有 florajet 记录
const [rows] = await pool.execute(
  "SELECT fresh_flower_products FROM crawled_florists WHERE slug='florajet'"
);
let products = JSON.parse(rows[0].fresh_flower_products);

// 添加新商品
products.push({
  slug: 'new-product',
  name: 'PRODUCT NAME',
  name_cn: 'PRODUCT NAME', // 保留原文
  // ... 其他字段
});

// 更新数据库
await pool.execute(
  'UPDATE crawled_florists SET fresh_flower_products = ? WHERE slug = ?',
  [JSON.stringify(products), 'florajet']
);
```

### 2. 花艺服务团队

#### 步骤 1: 爬取花店官网

使用 Browser Agent 访问花店网站，提取：
- 花店名称
- 国家/城市
- 特色服务（specialties）
- 团队成员信息
- 作品图片
- 价格区间

#### 步骤 2: 下载图片

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/{florist-slug}
# 下载主图、团队照片、作品图等
```

#### 步骤 3: 插入数据库

```javascript
await pool.execute(
  `INSERT INTO crawled_florists 
   (slug, name, type, country, city, description, description_cn, 
    specialties, images, team_members, price)
   VALUES (?, ?, 'florist', ?, ?, ?, ?, ?, ?, ?, ?)`,
  [slug, name, country, city, desc, desc_cn, 
   JSON.stringify(specialties), JSON.stringify(images), 
   JSON.stringify(team_members), price]
);
```

## 翻译规范

### 必须翻译的字段
- `desc_cn`: 简短描述
- `desc_full_cn`: 完整描述
- `composition_cn`: 花材组成
- `formules[].name_cn`: 规格名称（经典款/推荐款/豪华款）
- `formules[].desc`: 规格描述
- `accessoires[].name_cn`: 附加选项名称

### 保留原文的字段
- `name` / `name_cn`: 商品名称保留法语原文
- `formules[].name`: 规格名称保留法语（Beaucoup/Énormément/Passionnément）

### 通用翻译模板

```javascript
const commonConseilsCn = '您的Florajet花艺作品由鲜花制成，可能与展示的图片略有不同，图片仅供参考。您的花艺作品由花艺师专门为您手工制作，可能会因花艺师的艺术感觉以及花卉的季节性而略有变化。花束的整体风格、形状、颜色及主要花材将由花艺师在配送前几分钟精心制作时予以保留。';

const commonDeliveryCn = '此产品将由Florajet网络的花艺师亲自配送。配送费起步价：12.95€。Premium会员免配送费。';

const formuleDescs = {
  'Beaucoup': { 
    name_cn: '经典款',
    desc: '标准规格，精致小巧的花束，适合日常赠礼或家居摆放。', 
    detail: '花束尺寸较小，花材数量较少，但同样精心制作。' 
  },
  'Énormément': { 
    name_cn: '推荐款',
    desc: '推荐规格，与展示图片基本一致的花束，饱满而精致。', 
    detail: '花束在花材种类和数量上与商品图片高度一致，是性价比之选。', 
    recommended: true 
  },
  'Passionnément': { 
    name_cn: '豪华款',
    desc: '豪华规格，花材更丰富、花束更硕大，尽显奢华气派。', 
    detail: '这是最尊贵的规格，花束更加丰满，花材更加丰富，直径更大。', 
    luxury: true 
  },
};
```

## 前端显示

### FlowerProductDetail.tsx 字段优先级

```tsx
// 商品名称
{product.name_cn || product.name}

// 产品描述
{product.desc_full_cn || product.desc_full}

// 花材组成
{product.composition_cn || product.composition}

// 规格套餐名称
{formule.name_cn || formule.name}

// 规格套餐描述
{formule.desc || formule.description}
```

### TypeScript 接口

```typescript
interface Formule {
  name: string
  name_cn?: string
  description?: string
  desc?: string
  price: number
  detail?: string
  diameter?: string
  recommended?: boolean
  luxury?: boolean
}

interface Product {
  slug: string
  name: string
  name_cn: string
  price: number
  price_from: boolean
  category: string
  image: string
  images?: string[]
  desc: string
  desc_cn: string
  desc_full?: string
  desc_full_cn?: string
  composition?: string
  composition_cn?: string
  formules?: Formule[]
  accessoires?: Accessoire[]
}
```

## 注意事项

1. **图片本地化**: 所有图片必须下载到本地 `uploads/crawled/` 目录，并同步到前后端
2. **中文翻译**: 所有描述性字段必须有中文翻译
3. **规格描述**: formules 必须有 `desc` 字段（中文描述）
4. **名称保留原文**: 商品名称和规格名称保留法语原文，`name_cn` 也使用原文
5. **价格格式**: 使用欧元符号 €，`price_from: true` 表示"起"价
6. **数据库同步**: 修改后需同步到服务器数据库

## 示例脚本

### 添加新花朵商品

```javascript
// scripts/add-flower-product.cjs
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // 读取现有数据
  const [rows] = await pool.execute(
    "SELECT fresh_flower_products FROM crawled_florists WHERE slug='florajet'"
  );
  let products = JSON.parse(rows[0].fresh_flower_products);

  // 检查是否已存在
  if (products.some(p => p.slug === 'new-slug')) {
    console.log('已存在，跳过');
    await pool.end();
    return;
  }

  // 新商品数据
  const newProduct = {
    slug: 'new-slug',
    name: 'PRODUCT NAME',
    name_cn: 'PRODUCT NAME',
    price: 39.90,
    price_from: true,
    category: '鲜花花束',
    image: '/uploads/crawled/florajet/products/new-slug.jpg',
    images: [
      '/uploads/crawled/florajet/products/new-slug.jpg',
      '/uploads/crawled/florajet/products/new-slug-2.jpg',
    ],
    desc: '法语描述...',
    desc_cn: '中文描述...',
    desc_full: '法语完整描述...',
    desc_full_cn: '中文完整描述...',
    composition: '法语花材...',
    composition_cn: '中文花材...',
    formules: [
      { name: 'Beaucoup', name_cn: '经典款', price: 39.90, diameter: '30cm - 34cm', desc: '标准规格...', detail: '详细说明...' },
      { name: 'Énormément', name_cn: '推荐款', price: 45.90, diameter: '34cm - 38cm', desc: '推荐规格...', detail: '详细说明...', recommended: true },
      { name: 'Passionnément', name_cn: '豪华款', price: 55.90, diameter: '38cm - 42cm', desc: '豪华规格...', detail: '详细说明...', luxury: true },
    ],
    accessoires: [
      { name: 'Bulle d\'eau', name_cn: '水球保鲜', price: 4.50 },
      { name: 'Vase PVC', name_cn: 'PVC花瓶', price: 5.00 },
    ],
  };

  products.push(newProduct);

  await pool.execute(
    'UPDATE crawled_florists SET fresh_flower_products = ? WHERE slug = ?',
    [JSON.stringify(products), 'florajet']
  );

  console.log('✅ 商品已添加');
  await pool.end();
}

main();
```

## 相关文件

- `/Users/hongli/WorkSpace/Verra-Voile/src/pages/FlowerProductDetail.tsx` - 花朵商品详情页
- `/Users/hongli/WorkSpace/Verra-Voile/src/pages/FlowersDetail.tsx` - 花艺服务团队详情页
- `/Users/hongli/WorkSpace/Verra-Voile/src/pages/Flowers.tsx` - 花卉列表页
- `/Users/hongli/WorkSpace/Verra-Voile-End/scripts/` - 爬取脚本目录
