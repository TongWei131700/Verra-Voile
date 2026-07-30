---
name: crawl-destination
description: 爬取目的地婚礼网站（如 italiandestinationweddings.com）的目的地信息，组装成商品化数据写入 crawled_destinations 表，并自动下载压缩图片到本地服务器。当用户说"爬取目的地"、"爬取新目的地"、"crawl destination"、"抓取目的地网站"时触发。
---

# 目的地爬取与图片本地化

从目的地婚礼网站爬取目的地信息，组装成商品化数据入库，并自动下载压缩图片到本地服务器。

## 执行流程

```
任务进度：
- [ ] Step 1: 浏览器爬取目的地页面
- [ ] Step 2: 提取并组装目的地数据
- [ ] Step 3: 写入 crawled_destinations 数据库表
- [ ] Step 4: 下载压缩图片到本地
- [ ] Step 5: 重启后端并验证 API
- [ ] Step 6: 向用户汇报结果
```

---

### Step 1: 浏览器爬取目的地页面

使用 BrowserAgent 访问目标目的地页面，提取全部信息。

**典型目标网站示例**：
- `https://italiandestinationweddings.com/destinations/{slug}/`
- 其他目的地婚礼策划网站

**需要提取的字段**：

| 字段 | 说明 | 示例 |
|------|------|------|
| 目的地名称 | 英文名 | Amalfi Coast |
| 中文名 | 翻译后的名称 | 阿马尔菲海岸 |
| 国家 | 英文/中文 | Italy / 意大利 |
| 宣传语 | 副标题，需翻译为中文 | 在意大利的阳光下庆祝爱情 |
| 完整描述 | 翻译为中文的多段文案 | — |
| 特色亮点 | 中文数组，10条左右 | 悬崖露台仪式，俯瞰地中海… |
| 场地类型 | 中英双语对象数组 | {name: '悬崖露台', name_en: 'Cliffside Terrace'} |
| 城镇 | 中英双语对象数组 | {name: 'Positano', name_cn: '波西塔诺'} |
| 图片URL | 所有图片原始地址 | https://...jpg |
| 预算区间 | 中文标签+数值范围 | {label: '4万-8万欧元', min: 40000, max: 80000} |
| 宾客人数 | 中文数组 | ['0-40人', '40-80人', ...] |

**重要**：所有文本内容必须是中文，英文内容需翻译。

---

### Step 2: 组装目的地数据

将爬取的数据组装为以下结构，slug 从 URL 中提取（如 `amalfi-coast`）：

```javascript
{
  slug: 'amalfi-coast',
  name: 'Amalfi Coast',
  name_cn: '阿马尔菲海岸',
  country: 'Italy',
  country_cn: '意大利',
  source_url: 'https://...',
  tagline: '在意大利的阳光下庆祝爱情',
  description: '完整中文描述文案...',
  features: JSON.stringify(['特色1', '特色2', ...]),
  venue_types: JSON.stringify([{name: '悬崖露台', name_en: 'Cliffside Terrace'}, ...]),
  towns: JSON.stringify([{name: 'Positano', name_cn: '波西塔诺'}, ...]),
  images: JSON.stringify(['https://...1.jpg', 'https://...2.jpg', ...]),
  budget_ranges: JSON.stringify([{label: '4万-8万欧元', min: 40000, max: 80000}, ...]),
  guest_capacities: JSON.stringify(['0-40人', '40-80人', '80-120人', '120人以上']),
  cover_image: 'https://...第1张图.jpg',
  cover_image_url: 'https://...第1张图.jpg',  // 原始封面URL，用于重新下载原图
  sort_order: 1
}
```

---

### Step 3: 写入数据库

在 `Verra-Voile-End/src/db.js` 的 `seedCrawledDestinations` 函数中的 `destinations` 数组里添加新目的地数据。

**或者直接 SQL 插入**（如果服务已运行）：

```bash
/usr/local/mysql/bin/mysql -u root verra_voile -e "
INSERT INTO crawled_destinations (slug, name, name_cn, country, country_cn, source_url, tagline, description, features, venue_types, towns, images, budget_ranges, guest_capacities, cover_image, sort_order)
VALUES ('slug值', '英文名', '中文名', 'England', '英国', '来源URL', '中文宣传语', '中文描述', 'JSON数组', 'JSON数组', 'JSON数组', 'JSON数组', 'JSON数组', 'JSON数组', '封面图URL', 排序值);
"
```

**注意**：`features`、`venue_types`、`towns`、`images`、`budget_ranges`、`guest_capacities` 字段都是 JSON 字符串，插入时需要正确转义。

---

### Step 4: 下载图片到本地（关键步骤）

数据入库后，**必须立即执行**图片下载脚本（使用 puppeteer 无头浏览器绕过 CDN 防盗链）：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End && node scripts/download-images-puppeteer.cjs
```

**脚本自动完成**：
1. 从 `crawled_destinations` 表读取所有图片URL和 `cover_image_url`
2. 通过无头浏览器访问图片URL，绕过 Akamai 等 CDN 防盗链
3. 所有图片**保存原图，不压缩**
4. 存储到 `uploads/crawled/{slug}/` 目录
5. 自动检测实际文件格式，修正错误扩展名（如 .webp 实际是 JPEG 需改为 .jpeg）
6. 更新数据库中 `cover_image` 和 `images` 字段为本地路径 `/uploads/crawled/...`
7. 已存在的图片自动跳过，不会重复下载
8. 每个商品最多下载 12 张图片

**依赖**：需要 `puppeteer-core` 库（已在 package.json 中安装）

---

### Step 5: 重启后端并验证

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 1 && node src/index.js &
```

验证 API 返回本地图片路径：

```bash
curl -s http://localhost:3000/api/products/crawled-destinations | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
for d in data:
    print(f\"{d['name_cn']}: 封面={d['cover_image'][:50]}...\")
"
```

确认 `cover_image` 和 `images` 中的路径是 `/uploads/crawled/...` 格式（本地路径），而非外部 URL。

---

### Step 6: 向用户汇报

汇报内容：
- 新增目的地名称（中英文）
- 图片下载数量、成功/失败数
- 压缩效果（原始总大小 → 压缩后总大小）
- 本地存储路径
- 前端访问路径：`/crawled-destinations`

---

## 数据库表结构参考

`crawled_destinations` 表字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| slug | VARCHAR(100) UNIQUE | URL标识 |
| name | VARCHAR(200) | 英文名 |
| name_cn | VARCHAR(200) | 中文名 |
| country | VARCHAR(100) | 国家英文 |
| country_cn | VARCHAR(100) | 国家中文 |
| source_url | VARCHAR(500) | 爬取来源URL |
| tagline | VARCHAR(300) | 中文宣传语 |
| description | TEXT | 中文完整描述 |
| features | JSON | 特色亮点数组 |
| venue_types | JSON | 场地类型数组 |
| towns | JSON | 城镇数组 |
| images | JSON | 图片URL列表 |
| budget_ranges | JSON | 预算区间数组 |
| guest_capacities | JSON | 宾客人数数组 |
| cover_image | VARCHAR(500) | 封面图本地路径 |
| cover_image_url | VARCHAR(1024) | 封面图原始外部URL（用于重新下载原图） |
| sort_order | INT | 排序权重 |

## API 接口

- `GET /api/products/crawled-destinations` — 列表
- `GET /api/products/crawled-destinations/:slug` — 详情

## 前端页面

- 路由：`/crawled-destinations`
- 组件：`src/pages/CrawledDestinations.tsx`
- 图片URL自动处理：本地路径（`/uploads/...`）拼接后端地址，外部URL直接使用

## 注意事项

- 所有展示文本必须为中文，英文内容需翻译
- **头图极其重要**：必须从所有图片中选择宽度最大的作为 cover_image，优先航拍/全景图，禁止竖版窄图（拉伸会模糊）
- 图片脚本支持断点续传：已下载的图片自动跳过
- 下载失败的图片保留原始外部URL，不影响其他图片
- 部署后本地图片自动通过 `https://www.europewedding.cn/uploads/...` 访问
- 每次爬取新目的地后都要运行 `node scripts/download-images-puppeteer.cjs`
