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
