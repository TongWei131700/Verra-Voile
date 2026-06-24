---
name: wedding-expense-parser
description: 将用户提供的自然语言婚礼花销描述，解析拆分成结构化的商品数据方案，自动匹配或创建商品模块，生成变更清单后执行代码修改。当用户提到"拆分花销"、"解析商品"、"添加商品到模块"、"新增商品模块"，或以自然语言描述婚礼费用项并要求归类到系统模块时触发。
---

# 婚礼花销文本 → 商品数据解析器

## 触发场景

用户以自然语言描述一段婚礼花销文字，例如：
> "克罗地亚hvar岛放地点模块，摄影化妆发型主持放到婚礼团队，升级花艺500€放花卉，当天包车100€新建一个其他模块"

需要将其解析为结构化商品数据，并更新到项目代码中。

## 解析流程

### Step 1: 读取当前数据状态

读取以下文件获取当前模块和商品状态：
- `src/data/products.ts` — 通用商品模块（team/floral/wine/other 等）
- `src/data/cities.ts` — 地点城市数据
- `src/data/venues.ts` — 地点场地数据
- `src/pages/Listing.tsx` — Listing 页产品列表（products 数组 + moduleKeys）

### Step 2: 解析自然语言

从用户文字中提取以下信息：

| 提取项 | 说明 | 示例 |
|--------|------|------|
| **商品名** | 服务/物品名称 | "当天包车"、"Maslina Resort酒店" |
| **价格** | 数字 + 货币符号 | "500€"、"€4100"、"380欧" |
| **目标模块** | 归属的商品分类 | "放酒水里"、"放到花卉" |
| **新建模块** | 需要创建的新分类 | "新建一个其他模块" |
| **重命名模块** | 已有模块改名 | "摄影改叫婚礼团队" |
| **交互变更** | 选择模式等改动 | "改成多选"、"不直接跳转" |

### Step 3: 模块匹配规则

将用户文字中的关键词匹配到已有模块 ID：

| 关键词 | 模块 ID | 模块中文名 |
|--------|---------|-----------|
| 地点/目的地/城市/岛 | destination | 地点 |
| 团队/策划/摄影/化妆/摄像/主持 | team | 婚礼团队 |
| 花/花卉/花艺/手捧花 | floral | 花卉 |
| 酒/酒水/餐饮/酒店/宴/晚宴 | wine | 酒水 |
| 礼服/婚纱/西装 | dress | 礼服 |
| 宴席/餐厅 | catering | 宴席 |
| 其他/包车/交通 | other | 其他 |

若关键词无法匹配任何已有模块，提示用户确认是否新建。

### Step 4: 生成变更方案

输出一份结构化的变更清单（Markdown 表格），格式：

```markdown
## 变更方案

### 模块变更
| 操作 | 模块 ID | 模块名 | 英文名 | 说明 |
|------|---------|--------|--------|------|
| 新建 | other | 其他 | Others | 新增模块 |
| 重命名 | photography→team | 婚礼团队 | Wedding Team | 原"摄影" |

### 商品变更
| 操作 | 商品名 | 价格 | 目标模块 | 说明 |
|------|--------|------|----------|------|
| 新增 | 当天包车 | €100 | other | 全天接送用车 |
| 新增 | 大丽花手捧花束 | €500 | floral | 经典欧式手捧花 |

### 地点变更（如涉及 destination 模块）
| 操作 | 城市/场地 | 说明 |
|------|-----------|------|
| 新增城市 | Croatia / Hvar | cities.ts 新增 |
| 新增场地 | Hvar Island | venues.ts 新增 |

### 交互变更
| 变更项 | 说明 |
|--------|------|
| 多选模式 | 地点模块改为多选 + 底部确认栏 |

### 涉及文件
| 文件 | 操作 |
|------|------|
| src/data/products.ts | 修改 — 新增/更新模块和商品 |
| src/pages/Listing.tsx | 修改 — products 数组 + moduleKeys |
| src/data/cities.ts | 修改 — 新增城市（如涉及地点） |
| src/data/venues.ts | 修改 — 新增场地（如涉及地点） |
```

### Step 5: 确认后执行

用户确认方案后，按以下顺序修改代码：

1. **数据层**：`products.ts` / `cities.ts` / `venues.ts`
2. **Listing 页**：`Listing.tsx` 中 products 数组 + moduleNames + moduleKeys
3. **路由**（如需新页面）：`App.tsx`
4. **构建验证**：`npx tsc --noEmit && npx vite build`

## 商品数据格式

每个商品必须符合 `Product` 接口：

```typescript
{
  id: string          // 格式: "{moduleId}-{slug}"，如 "wine-dinner"
  name: string        // 中文名
  nameEn: string      // 英文名
  desc: string        // 一句话描述（15-30字）
  img: string         // Unsplash 图片 URL，600x400
  price: number       // 数字价格
  unit: string        // 货币符号，通常 "€"
  capacity: string    // 规格/容量说明
  highlight: string   // 标签：热门/推荐/空字符串
}
```

## Listing 页同步规则

当 products.ts 中新增/删除模块时，需同步更新 `Listing.tsx`：

1. `products` 数组：新增/删除对应卡片项
2. `moduleNames` 对象：新增/删除 ID→中文名映射
3. `moduleKeys` 数组：新增/删除模块 ID（用于 localStorage 读取）

## 图片选择指南

根据模块类型选择 Unsplash 图片关键词：

| 模块 | 搜索关键词 |
|------|-----------|
| team | wedding photographer, wedding planner |
| floral | wedding bouquet, bridal flowers |
| wine | wine dinner, resort hotel |
| other | car rental, transportation |
| destination | 城市/地点实景 |
