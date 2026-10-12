# XHS 梯队排行榜：AI 生成 → 商家中文名+头像 → 渲染

## 完整流程

```
用户点击「AI 一键生成」
    ↓
Agent 生成文案（含梯队分组 + 商家推荐）
    ↓
前端 POST /api/xhs-mcp/posts/:id/ai-content  { copywriting }
    ↓
后端自动处理：
  1. 从文案提取所有含中文的文本片段
  2. 用这些片段 LIKE 搜索 crawled_photographers.name_cn
  3. 匹配到的商家 → 返回 { name_cn, headshot/firstPhoto }
  4. 保存到 xhs_ai_content 表（merchants JSON 字段）
    ↓
前端返回结构化数据 { copywriting, merchants: [{nameCn, image, tier}] }
    ↓
用户点击「 编辑梯队排行榜图」→ 进入 XhsTierEditor
    ↓
XhsTierEditor 加载：
  1. GET /api/xhs-mcp/posts/:id/ai-content → 获取 merchants 数据
  2. 按梯队分组渲染：中文名 + 头像
```

## 数据流

### xhs_ai_content 表扩展
```sql
ALTER TABLE xhs_ai_content ADD COLUMN merchants JSON AFTER selected_images;
```

merchants 字段结构：
```json
[
  {
    "tier": 1,
    "nameCn": "意大利恋人 · 亚历山德罗",
    "nameEn": "Italian Lovers · Alessandro Negrini",
    "image": "/uploads/crawled/photographers/italian-lovers/00.jpg",
    "slug": "italian-lovers"
  },
  ...
]
```

### 商家提取策略
1. 从文案中提取所有含中文的短文本片段（2-30字）
2. 用这些片段 LIKE 搜索 `crawled_photographers.name_cn`
3. 优先精确匹配（name_cn 包含片段 或 片段包含 name_cn）
4. 匹配成功 → 取 headshot（如有）或第一张作品集照片
5. 未匹配 → 保留英文名，image 为空

### 前端渲染
- XhsTierEditor 优先使用 merchants 数据（中文名 + 头像）
- 降级：无 merchants 数据时，从文案解析英文名 + 搜索匹配

## 测试步骤
1. 进入帖子详情页
2. 点击「AI 一键生成文案 + 评论」
3. 等待生成完成 → 检查返回数据含 merchants 字段
4. 点击「 编辑梯队排行榜图」
5. 验证：每个商家显示中文名 + 头像（非 logo）
