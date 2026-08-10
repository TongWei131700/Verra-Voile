---
name: crawl-junebug-photographer
description: 从 Junebug Weddings 爬取婚礼摄影师数据并生成摄影详情页。当用户说"抓取摄影师"、"爬取 Junebug"、"添加摄影师"时触发。
---

# 爬取 Junebug 摄影师并生成详情页

## 概述
从 junebugweddings.com 爬取婚礼摄影师数据（头像、作品集、视频等），写入前端静态数据文件，自动生成摄影详情页。无需后端 API，纯前端静态数据驱动。

## 适用场景
- 用户提供 Junebug Weddings 摄影师 URL，需要爬取并添加到摄影列表
- 批量添加某地区摄影师
- 更新现有摄影师的图片或视频数据

## 前置条件
- 本地 Node.js 环境（用于运行 API 请求脚本）
- 无需 puppeteer，Junebug 提供 AJAX API 可直接获取完整数据

---

## 第一部分：数据爬取

### 数据源 URL 格式
```
https://junebugweddings.com/vendors/wedding-photographers/{country}/{city}/{Photographer-Slug}
```
示例：
- `https://junebugweddings.com/vendors/wedding-photographers/spain/Alicia-Nacenta-Photography`
- `https://junebugweddings.com/vendors/wedding-photographers/new-zealand/Tinted-Photography`
- `https://junebugweddings.com/vendors/wedding-photographers/united-kingdom/london/Nicole-Lamparska-Photography`

### Step 1：获取页面基础信息

用 `curl` 请求页面 HTML，提取基础数据：

```bash
curl -s 'https://junebugweddings.com/vendors/wedding-photographers/{country}/{Photographer-Slug}'
```

**从 HTML 中提取**：
- **账号 ID**：`vendorAccountId = {数字}` 或 `acct{数字}` 格式 → 后续 API 调用必需
- **3 张 vendor 展示照**：页面静态 HTML 中的图片（通常只有 3 张）
- **摄影师名称**：`<h1>` 标签内容
- **描述**：页面 `.why-book__text` 区域
- **网站链接**：`<a>` 标签中的外部链接
- **静态图片 URL**：`images.junebugweddings.com` 域名下的图片
- **头像/headshot**：`static.junebugweddings.com` 域名下的 headshot 或 logo 图片（**必须每次都检查**）

```bash
# 提取账号 ID（两种格式）
curl -s '{URL}' | grep -oE 'vendorAccountId = [0-9]+' | head -1
curl -s '{URL}' | grep -oE 'acct[0-9]+' | sort -u

# 提取静态图片
curl -s '{URL}' | grep -oE 'https://images\.junebugweddings\.com[^"'\'' ]+' | sort -u | head -10

# 提取头像/headshot（必须检查！）
curl -s '{URL}' | grep -oE 'https://static\.junebugweddings\.com[^"'\'' ]+' | sort -u
```

### Step 2：通过 AJAX API 抓取完整作品集

Junebug 使用 AJAX 接口动态加载作品集，可直接 POST 请求获取全部图片：

```bash
node -e "
const https = require('https');
const qs = require('querystring');
function fetchPortfolio(offset) {
  return new Promise((resolve, reject) => {
    const post = qs.stringify({ accountid: '{ACCOUNT_ID}', slug: '{Photographer-Slug}', offset });
    const req = https.request({
      hostname: 'junebugweddings.com', path: '/ajax/vendor/portfolio', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': post.length, 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({}); } });
    });
    req.on('error', () => resolve({}));
    req.write(post);
    req.end();
  });
}
(async () => {
  const all = [];
  for (let o = 0; o < 200; o += 9) {
    const j = await fetchPortfolio(o);
    if (!j.images || j.images.length === 0) break;
    j.images.forEach(img => {
      // 优先用 uri（无 _avif 后缀），avifUri 需去掉 _avif 才能下载
      const raw = img.uri || (img.avifUri || '').replace(/_avif\.avif$/, '.jpg').replace(/\.avif$/, '.jpg');
      if (raw) all.push(raw);
    });
    if (j.images.length < 9) break;
  }
  console.log(JSON.stringify(all, null, 2));
  console.log('Total:', all.length);
})();
"
```

**关键参数**：
- `accountid`：从 Step 1 获取的数字 ID（去掉 `acct` 前缀）
- `slug`：URL 中的摄影师标识（如 `Tinted-Photography`）
- `offset`：分页偏移，每次 +9

**图片格式处理**：
- API 返回的 `avifUri` 带有 `_avif` 后缀（如 `.../hash_avif.avif`），该路径**无法下载**（404 或被 Cloudflare 拦截返回 HTML）
- **必须去掉 `_avif`**：`hash_avif.avif` → `hash.jpg`
- 优先使用 `img.uri` 字段（本身就是不带 `_avif` 的正确路径）
- 如果只有 `avifUri`，替换规则：`url.replace(/_avif\.avif$/, '.jpg').replace(/\.avif$/, '.jpg')`
- **禁止**直接用 `avifUri` 只替换扩展名而保留 `_avif` 路径段，那样下载到的不是图片

### Step 3：通过 AJAX API 抓取视频

```bash
node -e "
const https = require('https');
const qs = require('querystring');
const post = qs.stringify({ accountid: '{ACCOUNT_ID}', slug: '{Photographer-Slug}' });
const req = https.request({
  hostname: 'junebugweddings.com', path: '/ajax/vendor/videos', method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': post.length, 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => { console.log(d); });
});
req.write(post);
req.end();
"
```

返回 JSON 中包含视频列表，取第一个视频的 URL。

**视频来源支持**：
- **YouTube**：**直接舍弃，不写入 `videoUrl`**。前端对 YouTube 视频不做展示，会降级为轮播图模式，因此无需写入
- **Vimeo**：直接写入 `videoUrl`，如 `https://vimeo.com/202038149`
- 前端通过 `src/utils/videoEmbed.ts` 中的 `detectVideoProvider()` 判断来源，YouTube 自动跳过，Vimeo 走视频背景三态逻辑
- 如果 API 返回 0 个视频或只有 YouTube 视频，则不设置 `videoUrl` 字段

### Step 4：整理图片顺序

最终 `images` 数组的图片顺序：
1. **前 3 张**：页面静态 HTML 中的 vendor 展示照（封面质量最高）
2. **后续**：AJAX API 返回的作品集图片

`cover` 字段取 `images[0]`（第一张 vendor 展示照）。

---

## 第二部分：数据写入

### 数据文件位置
```
/Users/hongli/WorkSpace/Verra-Voile/src/data/junebugPhotographers.ts
```

### 数据类型定义
```typescript
export interface PhotographerProduct {
  slug: string           // URL 标识，如 'tinted-photography'
  name: string           // 中文名，如 'Tinted 摄影'
  nameEn: string         // 英文名，如 'Tinted Photography'
  category: PhotoCategory // 分类，如 'new-zealand'
  categoryCn: string     // 分类中文，如 '新西兰 · 目的地婚礼'
  country: string        // 国家，如 '新西兰'
  countryEn: string      // 国家英文，如 'New Zealand'
  photoStyles: string[]  // 摄影风格标签
  tagline: string        // 宣传语
  desc: string           // 详细描述
  highlights: string[]   // 亮点
  style?: { title: string; items: { label: string; desc?: string }[] }[]
  cover: string          // 封面图 URL
  images: string[]       // 所有图片 URL 数组
  videoUrl?: string      // Vimeo 视频 URL（可选，YouTube 视频不写入）
  headshot?: string      // 头像 URL（可选，不设则用默认头像）
  price?: number         // 起步价（€）
  website?: string       // 个人网站
  source: { name: string; url: string }  // 数据来源
}
```

### 新增摄影师数据模板

```typescript
{
  slug: '{photographer-slug}',
  name: '{中文名}',
  nameEn: '{英文名}',
  category: '{category-key}',
  categoryCn: '{国家} · 目的地婚礼',
  country: '{国家中文}',
  countryEn: '{Country English}',
  photoStyles: ['{风格1}', '{风格2}', '{风格3}', '{风格4}'],
  tagline: '{宣传语，如：新西兰 · 澳大利亚 · 意大利 | 捕捉灵魂深处的真实情感}',
  price: {起步价数字},
  desc: '{详细描述，2-3 句话}',
  style: [
    { title: '风格定位', items: [
      { label: '{标签1}', desc: '{描述}' },
      { label: '{标签2}', desc: '{描述}' },
      { label: '{标签3}', desc: '{描述}' },
    ]},
    { title: '服务特色', items: [
      { label: '{特色1}', desc: '{描述}' },
      { label: '{特色2}', desc: '{描述}' },
      { label: '{特色3}', desc: '{描述}' },
    ]},
  ],
  highlights: ['{亮点1}', '{亮点2}', '{亮点3}', '{亮点4}'],
  cover: `${IMG}/{前两位}/{后两位}/{完整hash}.jpg`,
  images: [
    // 前 3 张：vendor 展示照
    `${IMG}/xx/xx/xxxxxxxx.jpg`,
    `${IMG}/xx/xx/xxxxxxxx.jpg`,
    `${IMG}/xx/xx/xxxxxxxx.jpg`,
    // 后续：作品集图片
    `${IMG}/xx/xx/xxxxxxxx.jpg`,
    // ... 更多图片
  ],
  // videoUrl: 'https://vimeo.com/{videoId}',  // 仅 Vimeo 视频写入，YouTube 视频舍弃
  // headshot: 'https://static.junebugweddings.com/hotlists/acct{id}/headshot/{Slug}-headshot-{date}-{hash}.jpg',  // 有头像时添加，否则用默认头像
  website: '{摄影师个人网站}',
  source: { name: 'Junebug Weddings', url: '{Junebug 页面 URL}' },
},
```

### IMG 常量
```typescript
const IMG = 'https://images.junebugweddings.com'
```
所有图片 URL 使用模板字符串 `` `${IMG}/path` `` 格式。

### 新增分类（如果需要）

当摄影师来自新国家/地区时，需更新分类：

1. **更新 PhotoCategory 类型**：
```typescript
export type PhotoCategory = 'all' | 'south-france' | 'paris' | 'new-zealand' | '{new-category}'
```

2. **更新 photoCategoryList**：
```typescript
{ key: '{new-category}', label: '{中文标签}' },
```

### 头像处理
- **每次爬取都必须检查** `static.junebugweddings.com` 域名下是否有 headshot/logo 图片
- 如果有 headshot URL → 直接写入 `headshot` 字段
- 如果没有 → **不设置 `headshot` 字段**，前端会自动 fallback 到默认头像
- 默认头像路径：`src/assets/default-photographer-headshot.jpg`
- headshot URL 格式示例：`https://static.junebugweddings.com/hotlists/acct{id}/headshot/{Slug}-headshot-{date}-{hash}.jpg`
- logo URL 格式示例：`https://static.junebugweddings.com/hotlists/acct{id}/logo/{Slug}-logo-{date}-{hash}.png`

---

## 第三部分：前端页面架构

### 路由
- 摄影列表页：`/photography` → `Photography.tsx`
- 摄影详情页：`/photography/:slug` → `PhotographyDetail.tsx`

### 列表页功能（Photography.tsx）
- 全屏 Hero 背景图
- 搜索框（按名称、风格搜索）
- 筛选栏：国家、摄影风格（桌面端左侧栏 + 移动端抽屉）
- 卡片列表：封面图 + 名称 + 宣传语 + 风格标签 + 价格
- 已预定（意向单）摄影师置顶显示，带花环徽章
- 数据来源：`photographerProducts` 数组（静态导入）

### 详情页模块顺序（PhotographyDetail.tsx）

```
Hero 区域（三态：骨架屏 → 视频背景 / 轮播图）
  ├── 左侧/背景：视频背景 或 轮播图（前3张） 或 骨架屏
  └── 右侧/居中：信息面板（头像、名字、标签、宣传语、网站链接）
    ↓
摄影师介绍（desc 正文）
    ↓
摄影风格（网格卡片） + 作品展（瀑布流双列，分页加载）
    ↓
底部预定栏（价格 + 咨询 + 加入意向单）
```

### Hero 区域三态逻辑（核心）

```
有 videoUrl 且非 YouTube？（通过 detectVideoProvider 判断）
├── 是 → 开始加载视频
│   ├── 加载中（0-3s）→ 骨架屏 shimmer 铺满卡片，信息面板居中叠在上方
│   ├── 加载成功（<3s）→ 视频背景播放（Vimeo iframe autoplay）
│   └── 超时（>3s）→ timedOut=true → 切换为轮播模式
└── 否（无视频 / YouTube / 超时）→ 直接轮播模式
```

**视频加载技术细节**：
- iframe 在骨架屏阶段就渲染到 DOM（`visibility: hidden`），避免 onLoad 死锁
- 视频加载成功后移除隐藏类，iframe 可见
- 超时后骨架屏和 iframe 一起移除，切换为轮播
- YouTube embed 参数：`autoplay=1&mute=1&loop=1&playlist={videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`

### 动态作品集索引
- 视频成功播放时：`galleryStart = 0`（前 3 张也纳入作品集）
- 轮播模式时：`galleryStart = 3`（前 3 张已在 Hero 轮播展示，不重复）

### 作品集“查看更多”按钮（3s 延迟出现）
- 点击后按钮立即消失，新图片开始加载（骨架屏）
- 加载完成后仍保持隐藏，直到点击后 3 秒才重新出现在底部
- 实现：`gallerySuppressUntil` 状态 + `galleryTick` 触发重渲染
- 如果没有更多内容，按钮不再出现

### 窄屏响应式（≤900px）
- 无论视频还是轮播，统一上下堆叠布局
- 视频区域：`position: relative; height: 55vh`（非全屏覆盖）
- 移除视频暗色遮罩
- 已预定状态背景色需要更高优先级选择器

---

## 第四部分：CSS 关键样式

### 样式文件
```
/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css
```

### 核心 CSS 类名

| 类名 | 用途 |
|------|------|
| `.photo-hero` | Hero 区域容器 |
| `.photo-hero__card` | Hero 卡片（`position: relative`，作为骨架屏定位上下文） |
| `.photo-hero__card--video` | 视频模式状态 |
| `.photo-hero__card--loading` | 加载状态（骨架屏可见） |
| `.photo-hero__skeleton` | 骨架屏容器（`position: absolute; inset: 0; z-index: 1`） |
| `.photo-hero__skeleton-shimmer` | shimmer 动画层 |
| `.photo-hero__video-bg` | 视频背景容器 |
| `.photo-hero__video-bg--hidden` | 视频加载阶段隐藏（`width:0; height:0`） |
| `.photo-hero__video-overlay` | 视频暗色遮罩 |
| `.photo-hero__carousel` | 轮播容器 |
| `.photo-hero__info` | 信息面板 |
| `.photo-hero__info--booked` | 已预定状态 |
| `.photo-hero__headshot` | 头像区域 |
| `.photo-booked-badge` | 已预定花环徽章 |
| `.photo-gallery__columns` | 作品集双列瀑布流 |
| `.photo-style__grid` | 摄影风格网格 |

### Shimmer 动画
```css
@keyframes photo-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 注意事项

### 爬取
1. **不需要 puppeteer**：Junebug 的 AJAX API 可直接获取完整作品集和视频，用 Node.js `https` 模块即可
2. **图片格式**：API 返回的可能是 `.avif`，需统一转 `.jpg`
3. **图片顺序**：前 3 张必须是页面静态 vendor 展示照（封面质量），后面接 API 作品集
4. **视频 URL**：通过 `/ajax/vendor/videos` API 获取。**YouTube 视频直接舍弃不写入**，仅保留 Vimeo 等非 YouTube 视频
5. **账号 ID 获取**：从页面 HTML 中提取 `acct{数字}` 格式，API 调用时去掉 `acct` 前缀

### 数据
6. **slug 规范**：全小写，用 `-` 连接，如 `tinted-photography`
7. **中文名**：根据英文名音译，如 Nicole Lamparska → 妮可·兰帕尔斯卡
8. **photoStyles**：4 个标签，从描述中提取关键词
9. **price**：整数，单位 €，无真实价格时给一个估算值（如 250-280）
10. **headshot 可选**：不设则自动用默认头像
11. **新分类**：来自新国家时必须更新 `PhotoCategory` 类型和 `photoCategoryList`

### 编译验证
12. 每次数据修改后必须运行 `npx tsc --noEmit` 验证编译通过
13. 图片 URL 使用模板字符串格式 `` `${IMG}/path` ``

---

## 踩坑记录

### iframe 条件渲染导致加载死锁
**问题**：iframe 只在 `videoLoaded=true` 时渲染，但 `videoLoaded` 依赖 iframe 的 `onLoad` 事件 → iframe 永远无法加载。
**解决**：将 iframe 始终渲染在 DOM 中，加载阶段用 `photo-hero__video-bg--hidden`（`width:0; height:0; overflow:hidden`）隐藏容器，iframe 设 `visibility: hidden`。

### CSS 选择器优先级导致已预定背景不生效
**问题**：`.photo-hero__card--video .photo-hero__info`（0,2,0）与 `.photo-hero__info--booked`（0,2,0）优先级相同，后者被覆盖。
**解决**：添加更高优先级选择器 `.photo-hero__card--video .photo-hero__info--booked`（0,3,0）。

### 骨架屏覆盖方式演变
**初始方案**：骨架屏在 video-bg 内部作为 flex 子元素 → 左右分栏布局
**第二版**：`position: absolute; inset: 0; z-index: 10` 覆盖整个卡片 → 信息面板被遮挡
**最终方案**：骨架屏 `absolute` 铺满卡片（z-index:1），信息面板 `position: relative; z-index: 2; background: transparent` 居中叠在上方

### 页面静态图片只有 3 张
Junebug 页面 HTML 只包含 3 张 vendor 展示照，其余作品集通过 JS 动态加载。`curl` 无法获取完整作品集，必须使用 AJAX API。

### AJAX API 返回的 avifUri 带 _avif 后缀无法下载
**问题**：API 返回的 `avifUri` 形如 `.../hash_avif.avif`，仅替换扩展名为 `.jpg` 后变成 `.../hash_avif.jpg`，该路径不存在（404）或被 Cloudflare 拦截返回 HTML 页面而非图片。之前成功的下载是因为数据文件中的 URL 本身就不带 `_avif`。
**解决**：优先使用 `img.uri` 字段（不带 `_avif`）；若只有 `avifUri`，必须同时去掉 `_avif` 路径段：`url.replace(/_avif\.avif$/, '.jpg')`。

---

## 完整爬取流程（Checklist）

```
1. [ ] 获取 Junebug URL
2. [ ] curl 页面 HTML → 提取 vendorAccountId、3 张 vendor 展示照、名称、描述、网站
3. [ ] curl 检查 static.junebugweddings.com → 提取 headshot/logo（必须！）
4. [ ] 调用 /ajax/vendor/portfolio API → 获取全部作品集图片（avif→jpg）
5. [ ] 调用 /ajax/vendor/videos API → 获取视频 URL（YouTube 舍弃，仅保留 Vimeo）
6. [ ] 整理图片顺序：3 张 vendor 照 + N 张作品集
7. [ ] 如果是新国家 → 更新 PhotoCategory 类型 + photoCategoryList
8. [ ] 按模板写入 PhotographerProduct 数据到 junebugPhotographers.ts
9. [ ] 运行 npx tsc --noEmit 验证编译
10. [ ] 访问 /photography/{slug} 查看效果
```

---

## 相关文件

### 数据
- 摄影师数据：`/Users/hongli/WorkSpace/Verra-Voile/src/data/junebugPhotographers.ts`
- 默认头像：`/Users/hongli/WorkSpace/Verra-Voile/src/assets/default-photographer-headshot.jpg`

### 前端页面
- 摄影列表页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/Photography.tsx`
- 摄影详情页：`/Users/hongli/WorkSpace/Verra-Voile/src/pages/PhotographyDetail.tsx`
- 路由配置：`/Users/hongli/WorkSpace/Verra-Voile/src/App.tsx`

### 样式
- 全局样式：`/Users/hongli/WorkSpace/Verra-Voile/src/styles/index.css`

### 组件
- 图片组件：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/FallbackImage.tsx`
- 返回按钮：`/Users/hongli/WorkSpace/Verra-Voile/src/components/common/BackButton.tsx`
