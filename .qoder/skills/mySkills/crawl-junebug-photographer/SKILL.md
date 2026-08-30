---
name: crawl-junebug-photographer
description: 从 Junebug Weddings 爬取婚礼摄影师数据并写入数据库。当用户说"抓取摄影师"、"爬取 Junebug"、"添加摄影师"时触发。
---

# 爬取 Junebug 摄影师

## 概述
从 junebugweddings.com 爬取婚礼摄影师数据（头像、作品集、视频），写入 `crawled_photographers` 数据库表。

## 前置条件
- 本地 Node.js + puppeteer
- **必须用 Puppeteer**：Junebug 有 Cloudflare 防护，curl/WebFetch 均 403

---

## 第一部分：数据爬取

### 数据源 URL 格式
```
https://junebugweddings.com/vendors/wedding-photographers/{country}/{region}/{Photographer-Slug}
```

### 使用通用提取脚本

**直接用通用脚本**，无需为每个摄影师编写独立脚本：

```bash
node scripts/extract-junebug.cjs "https://junebugweddings.com/vendors/wedding-photographers/switzerland/Eline-Tasma"
```

脚本自动完成：
1. 启动 Puppeteer，访问页面（通过 Cloudflare）
2. `page.on('response')` 拦截 `images.junebugweddings.com` 图片 buffer
3. 拦截 `static.junebugweddings.com` 的 headshot/logo
4. 从 HTML 提取 `vendorAccountId`
5. 提取 DOM 数据（名称、描述、网站、评价等）
6. 滚动 + 循环点击 `.load-more.is-visible` 加载全部画廊
7. 在页面上下文中调用 `/ajax/vendor/portfolio` 获取完整作品集
8. 在页面上下文中调用 `/ajax/vendor/videos` 获取视频
9. 图片写入 `Verra-Voile-Uploads/crawled/photographers/{slug}/`
10. 输出 JSON：`scripts/junebug-{slug}-data.json`

**禁止的方案**：
- ✖ Browser Agent（太慢）
- ✖ WebFetch / curl 下载图片（Cloudflare 403）
- ✖ 分两步脚本（先提取再下载）

### 关键参数
- `accountid`：从 HTML 提取的数字 ID（`vendorAccountId = {数字}` 或 `acct{数字}`）
- `slug`：URL 中的摄影师标识（大小写敏感，如 `Spazio46`）
- `offset`：作品集分页，每次 +9

### 图片顺序
1. **前 3 张（00-02）**：`.vendor__slide img` vendor 展示照（封面质量最高）
2. **后续（03+）**：`.gallery__card` 画廊 + AJAX API 作品集（去重）

`cover` = `images[0]`

### 视频处理
- **YouTube**：直接舍弃
- **Vimeo**：写入 `videoUrl`
- 只有 YouTube 或无视频 → 不设 `videoUrl`

---

## 第二部分：数据写入

### 架构说明
数据存储在 `crawled_photographers` 数据库表，通过 API 读写：
- 列表：`GET /api/products/crawled-photographers`
- 详情：`GET /api/products/crawled-photographers/:slug`
- 新增摄影师 = 插入数据库 + 同步图片，**无需重新构建/部署前端**

### 数据库表结构

```
基础字段：
  slug          varchar(255)   PRIMARY KEY
  name          varchar(255)   英文名
  name_cn       varchar(255)   中文名
  country       varchar(100)   国家英文
  country_en    varchar(100)   国家英文
  category      varchar(100)   分类
  category_cn   varchar(100)   分类中文名
  tagline       text           宣传语（中文）
  description   text           详细描述（中文）

JSON 字段（mysql2 自动解析）：
  photo_styles  json           摄影风格数组（4个标签）
  style         json           风格分组数组（≥3组≥8项）
  highlights    json           亮点数组（3-4个）
  images        json           作品集图片路径数组

媒体字段：
  cover_image   varchar(500)   封面图路径
  headshot      varchar(500)   头像路径
  video_url     varchar(500)   Vimeo 视频 URL
  website       varchar(500)   个人网站

来源字段：
  source_name   varchar(255)   来源名称（"Junebug Weddings"）
  source_url    varchar(500)   来源链接

管理字段：
  price         decimal(10,2)  起步价（€）
  sort_order    int            排序顺序
```

### 插入脚本

编写 `insert-{slug}.cjs`，在后端目录执行：

```javascript
// /Users/hongli/WorkSpace/Verra-Voile-End/insert-{slug}.cjs
const mysql = require('mysql2/promise')

async function main() {
  const pool = mysql.createPool({
    host: 'localhost', port: 3306, user: 'root', password: '', database: 'verra_voile'
  })

  const [existing] = await pool.execute('SELECT slug FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  if (existing.length > 0) {
    await pool.execute('DELETE FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  }

  const images = []
  for (let i = 0; i < {N}; i++) {
    images.push(`/uploads/crawled/photographers/{slug}/${String(i).padStart(2, '0')}.jpg`)
  }

  await pool.execute(
    `INSERT INTO crawled_photographers
      (slug, name, name_cn, country, country_en, category, category_cn,
       tagline, description, photo_styles, style, highlights,
       cover_image, headshot, images, video_url, website,
       source_name, source_url, price, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, name, nameCn, country, countryEn, category, categoryCn,
     tagline, description,
     JSON.stringify(photoStyles), JSON.stringify(style), JSON.stringify(highlights),
     coverImage, headshot, JSON.stringify(images), videoUrl, website,
     sourceName, sourceUrl, price, sortOrder]
  )

  const [rows] = await pool.execute('SELECT slug, name, JSON_LENGTH(images) AS img_count FROM crawled_photographers WHERE slug = ?', ['{slug}'])
  console.log('✅', rows[0])
  await pool.end()
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
```

### 图片路径规范
```
/uploads/crawled/photographers/{slug}/NN.jpg
```
- 00-02：vendor 展示照（封面）
- 03+：作品集

### 图片目录（独立图片仓库）
```
/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/photographers/{slug}/
```
> 后端符号链接：`Verra-Voile-End/uploads/crawled` → `Verra-Voile-Uploads/crawled`

### 头像/Logo（必须本地化）
- `static.junebugweddings.com` 也有 Cloudflare 防护，远程 URL 会 403
- 必须用 Puppeteer 拦截 buffer 下载到本地
- 路径：`Verra-Voile-Uploads/crawled/photographers/{slug}/headshot.png`
- 无 headshot → 前端自动 fallback 默认头像

---

## 数据质量规范

1. **slug**：全小写，`-` 连接，如 `spazio46`
2. **中文名**：根据英文名音译，如 Spazio46 → 斯帕齐奥46
3. **photoStyles**：4 个标签，从描述提取关键词
4. **style**：≥3 组 ≥8 项，根据描述理解摄影师特点后精心匹配。**详见 `style-reference.md`**
5. **highlights**：3-4 个亮点，突出摄影师特色和专长
6. **price**：整数 €，无真实价格时估算（250-280）
7. **website**：用 `.see-website a` 提取 "Visit Website" 按钮，未找到则用 Junebug 页面链接
8. **新国家**：必须更新 `PhotoCategory` 类型和 `photoCategoryList`
9. 每次修改后运行 `npx tsc --noEmit` 验证编译

---

## 完整流程（Checklist）

```
1. [ ] 获取 Junebug URL
2. [ ] 执行通用提取脚本：node scripts/extract-junebug.cjs "{url}"
3. [ ] 验证图片全部下载成功（0 失败）
4. [ ] 图片仓库提交：cd Verra-Voile-Uploads && git add crawled/photographers/{slug}/ && git commit -m "添加摄影师图片: {slug}"
5. [ ] 读取 JSON 数据，翻译为中文，充实 style（≥3组≥8项）和 highlights（3-4个）
6. [ ] 编写 insert-{slug}.cjs 写入 crawled_photographers 表
7. [ ] 执行插入脚本，验证 API：curl http://localhost:3000/api/products/crawled-photographers/{slug}
8. [ ] 访问 /photography/{slug} 查看效果
```

---

## 参考文档（按需加载）

- **`style-reference.md`**：风格属性完整参考库（5大类别）+ 充实标准 + 质量阈值 → 充实 style 时读取
- **`frontend-arch.md`**：前端页面架构 + Hero 三态逻辑 + CSS 类名 → 修改前端时读取
- **`troubleshooting.md`**：踩坑记录（Cloudflare、iframe 死锁、avif 后缀等）→ 遇到问题时读取

---

## 相关文件

### 数据
- 数据库表：`crawled_photographers`
- 后端插入脚本：`/Users/hongli/WorkSpace/Verra-Voile-End/insert-{slug}.cjs`
- 图片目录：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/photographers/{slug}/`

### 脚本
- 通用提取脚本：`/Users/hongli/WorkSpace/Verra-Voile/scripts/extract-junebug.cjs`
- 输出 JSON：`/Users/hongli/WorkSpace/Verra-Voile/scripts/junebug-{slug}-data.json`

### 前端
- 列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Photography.tsx`
- 详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/PhotographyDetail.tsx`
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`
