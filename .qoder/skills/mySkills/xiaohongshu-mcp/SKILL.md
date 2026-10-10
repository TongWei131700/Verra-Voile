---
name: xiaohongshu-mcp
description: 小红书 MCP 服务：搜索帖子、获取详情、发布图文/视频、评论互动、点赞收藏。当用户说"搜索小红书"、"小红书运营"、"发布到小红书"、"小红书获流"、"xiaohongshu"时触发。
---

# 小红书 MCP 运营管理

## 服务信息

- **二进制位置**: `/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/`
- **MCP 主程序**: `xiaohongshu-mcp-darwin-arm64`
- **登录工具**: `xiaohongshu-login-darwin-arm64`
- **服务地址**: `http://localhost:18060/mcp`（账号 A）/ `http://localhost:18061/mcp`（账号 B）
- **Cookie 存储**: MCP 从工作目录的 `cookies.json` 读取（格式: `{version, seed, saved_at, cookies[]}`）
- **登录工具 Cookie**: `~/.xhs-mcp/cookies.json`（格式: `[{name, value, domain...}]`）
- **账号 B 目录**: `~/.xhs-mcp-account2/cookies.json`
- **GitHub 仓库**: https://github.com/xpzouying/xiaohongshu-mcp
- **当前版本**: v2.5.5

## 启动流程

### 1. 检查 MCP 服务是否运行

```bash
curl -s -X POST http://localhost:18060/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

如果返回 `serverInfo` 则服务已运行；如果连接失败则需要启动。

### 2. 启动 MCP 服务

```bash
/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64
```

后台运行：
```bash
nohup /Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64 > /tmp/xhs-mcp.log 2>&1 &
```

### 3. 登录（仅首次或 Cookie 过期时）

```bash
# 确保所有 cookies.json 已删除，否则登录工具检测到已有登录态会直接退出
rm -f ./cookies.json ~/.xhs-mcp/cookies.json ~/.xhs-mcp-account2/cookies.json
/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-login-darwin-arm64
```

会打开浏览器窗口显示二维码，用小红书 App 扫码登录。

> **重要**: 登录后不要在其他网页端登录同一账号，否则会把 MCP 的登录态"踢掉"。手机 App 端不受影响。
> **注意**: 登录工具从**当前工作目录**读取/写入 `cookies.json`，启动前务必 `cd` 到目标账号目录。

## 双账号架构

**用途**: 账号 A 用于搜索分析+评论互动，账号 B 专门用于发布内容，互不干扰。

| | 账号 A（搜索+评论） | 账号 B（发布） |
|---|---|---|
| 端口 | `:18060` | `:18061` |
| 工作目录 | `/Users/hongli/WorkSpace/Verra-Voile` | `~/.xhs-mcp-account2/` |
| Cookie | `./cookies.json` | `~/.xhs-mcp-account2/cookies.json` |
| MCP 地址 | `http://localhost:18060/mcp` | `http://localhost:18061/mcp` |

### 启动双账号

```bash
# 账号 A（默认目录）
cd /Users/hongli/WorkSpace/Verra-Voile
./tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64 -port :18060

# 账号 B（独立目录）
cd ~/.xhs-mcp-account2
/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64 -port :18061
```

### 切换/登录新账号

```bash
# 1. 停掉目标实例
pkill -f "xiaohongshu-mcp-darwin-arm64.*18061"

# 2. 清除所有 Cookie（防止登录工具误判已登录）
rm -f ./cookies.json ~/.xhs-mcp/cookies.json ~/.xhs-mcp-account2/cookies.json

# 3. 从目标账号目录启动登录工具
cd ~/.xhs-mcp-account2
/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-login-darwin-arm64
# 扫码登录

# 4. 重新启动 MCP 实例
cd ~/.xhs-mcp-account2
/Users/hongli/WorkSpace/Verra-Voile/tools/xiaohongshu-mcp/xiaohongshu-mcp-darwin-arm64 -port :18061
```

### Cookie 备份与恢复

登录成功后可备份 `cookies.json`，下次直接恢复无需重新扫码：
```bash
cp ~/.xhs-mcp-account2/cookies.json ~/.xhs-mcp-account2/cookies-backup.json
# 恢复时
cp ~/.xhs-mcp-account2/cookies-backup.json ~/.xhs-mcp-account2/cookies.json
```

### 全部登出（安全清理）

```bash
# 通过 API 删除 Cookie
for port in 18060 18061; do
  curl -s --max-time 30 -X POST http://localhost:$port/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"delete_cookies","arguments":{}},"id":1}'
done
# 停掉所有实例
pkill -f xiaohongshu-mcp-darwin-arm64
# 清除残余 Cookie 文件
rm -f ./cookies.json ~/.xhs-mcp/cookies.json ~/.xhs-mcp-account2/cookies.json
```

## 调用方式

由于 Qoder 的 MCP Host 可能无法直接发现该服务器，通过 `curl` 直接调用 HTTP API：

```bash
# 通用调用模板
curl -s --max-time 90 -X POST http://localhost:18060/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"<工具名>","arguments":{<参数>}},"id":1}' \
  -o /tmp/xhs-result.json
```

> **注意**: MCP 服务使用无头浏览器，同一时间只能处理一个请求。并发调用会导致超时。每次调用间隔至少等前一个完成。

## 可用工具（18 个）

### 账号管理

| 工具 | 说明 | 参数 |
|------|------|------|
| `check_login_status` | 检查登录状态 | 无 |
| `get_login_qrcode` | 获取登录二维码 | 无 |
| `delete_cookies` | 删除 Cookie 重置登录 | 无 |
| `get_my_profile` | 获取当前登录用户主页 | `tab`: note(笔记,默认) \| fav(收藏) \| liked(点赞) |
| `get_unread_count` | 获取未读通知数 | 无 |

### 搜索与浏览

| 工具 | 说明 | 参数 |
|------|------|------|
| `search_feeds` | **搜索内容**（核心工具） | `keyword`(必填), `filters`(可选，见下方) |
| `list_feeds` | 获取首页推荐列表 | 无 |
| `get_feed_detail` | 获取帖子详情+评论 | `feed_id`, `xsec_token`(必填), `load_all_comments`, `limit`, `click_more_replies`(可选) |
| `user_profile` | 获取用户主页 | `user_id`, `xsec_token`(必填), `tab`(可选) |

#### search_feeds 筛选参数（filters 对象）

```json
{
  "filters": {
    "sort_by": "综合|最新|最多点赞|最多评论|最多收藏",
    "note_type": "不限|视频|图文",
    "publish_time": "不限|一天内|一周内|半年内",
    "search_scope": "不限|已看过|未看过|已关注",
    "location": "不限|同城|附近"
  }
}
```

### 互动操作

| 工具 | 说明 | 必填参数 |
|------|------|----------|
| `like_feed` | 点赞/取消点赞 | `feed_id`, `xsec_token`; `unlike=true` 取消 |
| `favorite_feed` | 收藏/取消收藏 | `feed_id`, `xsec_token`; `unfavorite=true` 取消 |
| `post_comment_to_feed` | 发表评论 | `feed_id`, `xsec_token`, `content` |
| `reply_comment_in_feed` | 回复指定评论 | `feed_id`, `xsec_token`, `content` + `comment_id` 或 `user_id` |
| `reply_notification` | 回复通知中的评论 | `comment_id`, `content` |
| `like_notification` | 给评论点赞 | `comment_id`; `unlike=true` 取消 |
| `list_notifications` | 获取通知列表 | `tab`: mentions(评论和@,默认) \| likes(赞和收藏) \| connections(新增关注); `limit` |

### 发布内容

| 工具 | 说明 | 必填参数 |
|------|------|----------|
| `publish_content` | 发布图文 | `title`(≤20字), `content`(≤1000字), `images`(图片路径数组) |
| `publish_with_video` | 发布视频 | `title`(≤20字), `content`(≤1000字), `video`(本地视频路径) |

#### 发布可选参数

- `tags`: 话题标签数组，如 `["欧洲婚礼", "目的地婚礼"]`
- `schedule_at`: 定时发布（ISO8601），支持 1 小时至 14 天内
- `is_original`: 是否声明原创（仅图文）
- `visibility`: 公开可见(默认) / 仅自己可见 / 仅互关好友可见
- `products`: 商品关键词数组（需开通商品功能）

## 搜索 Harness 脚本

**路径**: `scripts/xhs-search-harness.sh`

**固定流程**: 清理进程 → 启动服务 → 等待就绪 → 检查登录 → 带重试搜索 → 解析结果（含 TS 格式输出）

```bash
# 用法
bash scripts/xhs-search-harness.sh "欧洲婚礼" "综合" "不限"
# 参数: [关键词] [排序:综合|最新|最多点赞|最多评论|最多收藏] [时间:不限|一天内|一周内|半年内]
```

**关键经验**:
- **首次搜索必超时**: MCP 启动后第一次 search_feeds 必定 context deadline exceeded，这是无头浏览器冷启动问题。Harness 内置重试机制会自动处理。
- **Cookie 过期**: 每隔几天 Cookie 会失效，check_login_status 返回"未登录"。需从 `cookies-account1.json` 备份恢复或重新扫码。
- **串行请求**: 同一时间只能处理一个请求，必须等前一个完成再发下一个。

## 常用工作流

### 工作流 1: 竞品/获流分析（推荐用 Harness 脚本）

搜索一周内热门帖子，分析内容模式：

```bash
# 1. 搜索一周内帖子
curl -s --max-time 90 -X POST http://localhost:18060/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_feeds","arguments":{"keyword":"欧洲婚礼","filters":{"publish_time":"一周内","sort_by":"最多点赞"}}},"id":1}' \
  -o /tmp/xhs-result.json

# 2. 解析结果
python3 -c "
import json
with open('/tmp/xhs-result.json') as f:
    data = json.load(f)
text = data['result']['content'][0]['text']
feeds = json.loads(text)['feeds']
for i, feed in enumerate(feeds):
    nc = feed['noteCard']
    info = nc['interactInfo']
    print(f'{i+1}. {nc.get(\"displayTitle\",\"(无标题)\")} | 赞:{info[\"likedCount\"]} 藏:{info[\"collectedCount\"]} 评:{info[\"commentCount\"]}')
"
```

### 工作流 2: 获取帖子详情与评论

```bash
curl -s --max-time 90 -X POST http://localhost:18060/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_feed_detail","arguments":{"feed_id":"<帖子ID>","xsec_token":"<token>","load_all_comments":true,"limit":50}},"id":1}' \
  -o /tmp/xhs-detail.json
```

> `feed_id` 和 `xsec_token` 从 `search_feeds` 或 `list_feeds` 结果中获取。

**响应数据结构**：
```json
{
  "feed_id": "...",
  "data": {
    "note": {
      "noteId": "...",
      "title": "",
      "desc": "#标签1[话题]# #标签2[话题]#",
      "type": "normal",
      "time": 1791527168000,
      "ipLocation": "广东",
      "user": { "userId": "...", "nickname": "...", "avatar": "..." },
      "interactInfo": { "likedCount": "8", "commentCount": "13", "collectedCount": "1" },
      "imageList": [{ "width": 1080, "height": 1440, "urlDefault": "http://...", "urlPre": "http://..." }]
    },
    "comments": { "list": [...], "cursor": "...", "hasMore": false }
  }
}
```

### 工作流 2.5: 纯图帖图片文字识别（高价值询盘帖）

**适用场景**：搜索发现无标题、只有图片的帖子，这类帖子往往是客户直接询盘，商业价值最高。

步骤：
1. 用 `get_feed_detail` 获取帖子详情，拿到 `imageList` 中的图片 URL
2. 下载图片到本地
3. 用 `Read` 工具查看图片，识别其中的文字内容
4. 将识别出的文字标注到研究页面

```bash
# 1. 获取帖子详情
curl -s --max-time 90 -X POST http://localhost:18060/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_feed_detail","arguments":{"feed_id":"<帖子ID>","xsec_token":"<token>"}},"id":1}' \
  -o /tmp/xhs-detail.json

# 2. 提取首张图片 URL
python3 -c "
import json
with open('/tmp/xhs-detail.json') as f:
    data = json.load(f)
text = data['result']['content'][0]['text']
detail = json.loads(text)
note = detail['data']['note']
print('Title:', note.get('title', ''))
print('Desc:', note.get('desc', ''))
print('IP:', note.get('ipLocation', ''))
imgs = note.get('imageList', [])
print(f'Images: {len(imgs)}')
for i, img in enumerate(imgs):
    print(f'  [{i+1}] {img.get(\"urlDefault\", \"\")}')
"

# 3. 下载图片
mkdir -p /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/xhs-research
curl -s -o /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/xhs-research/<filename>.webp "<图片URL>"

# 4. 用 Read 工具查看图片内容，识别文字
# 5. 将文字内容写入研究页面的 imageContent 字段
```

**识别要点**：
- 纯图帖通常把需求/询盘写在图片上（绕过标题字数限制）
- 重点关注：时间、地点、人数、预算、偏好、联系方式
- 这类帖子是获流的核心目标 — 用户有明确需求，主动寻找服务商

### 工作流 3: 询盘帖深度分析 → 生成获流内容

**完整流程**：从小红书发现询盘帖 → Agent 问答 → 生成帖子 + 评论

#### 步骤 1: 提取询盘帖中的问题

从 `imageContent` 或帖子描述中提取用户需求，拆解为 3-5 个具体问题。例如：
- 场地推荐（按时间/地点）
- 预算范围（分项明细）
- 风格建议（如何避免某种风格）
- 仪式形式选择

#### 步骤 2: 通过婚礼 Agent 逐一问答

API 地址：`https://www.europewedding.cn/api/agent/chat`

```bash
# 第一个问题（创建 session）
curl -s --max-time 120 -X POST https://www.europewedding.cn/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"<问题1>，请直接给出答案，不要追问。"}' \
  -o /tmp/xhs-agent-q1.json

# 后续问题（复用 sessionId 保持上下文）
SESSION=$(python3 -c "import json; print(json.load(open('/tmp/xhs-agent-q1.json'))['sessionId'])")
curl -s --max-time 120 -X POST https://www.europewedding.cn/api/agent/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"<问题2>，不要追问，直接给答案。\",\"sessionId\":\"$SESSION\"}" \
  -o /tmp/xhs-agent-q2.json
```

**提问技巧**：
- 末尾加"不要追问，直接给答案"，避免 Agent 反问
- 每个问题聚焦一个维度（场地/预算/风格/仪式）
- 用同一个 sessionId 保持上下文连贯

#### 步骤 3: 精选图片

从 Agent 回复中提到的场地/摄影师/花艺，检查本地图片是否存在：
```
图片目录: /Users/hongli/WorkSpace/Verra-Voile-End/uploads/crawled/
```

**选图原则**：
- 封面图选最震撼的全景/航拍（吸引点击）
- 2-3 张不同风格的场地图（展示多样性）
- 1 张仪式场景图（代入感）
- 1 张细节图（花束/装饰）
- 总计 6-8 张

#### 步骤 4: 撰写帖子内容

**标题**：≤20 字（换行也算字数！），用悬念型或干货型
**正文**：≤1000 字，叙事风格不讲产品，讲故事有代入感
**标签**：5-8 个精准标签，不用 `#` 开头（用 tags 参数）

**正文结构模板**：
1. 开头一句话抓住痛点/场景
2. 3-5 个具体推荐（带价格）
3. 预算参考（分档位）
4. 避坑指南（2-3 条）
5. 结尾"详情看评论区"

#### 步骤 5: 撰写引流评论

在原询盘帖下评论，吸引用户点击主页/帖子。

**评论要求**：
- **≤200 字**（换行算字数，尽量精简）
- 不像 AI，像真实有经验的备婚姐妹
- 提供真正有用的建议（3-5 条干货）
- 结尾自然引出"整理了一份对比/明细"
- **禁止**：链接、品牌名、"私信我"、"看我帖子"
- 用"姐妹"开头拉近距离，用"帮朋友做过"建立可信度

**评论模板**：
```
姐妹我刚帮朋友做过类似的！几个关键建议：
1 建议一（具体细节）
2 建议二（具体细节）
3 建议三（具体细节）
我整理了一份XX对比和预算明细，有日期可以帮你看看
```

### 工作流 4: 发布图文帖子（使用账号 B）

**发布帖子必须使用账号 B（端口 18061）**，避免账号 A 被风控。

```bash
# 通过账号 B 发布
curl -s --max-time 180 -X POST http://localhost:18061/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"publish_content","arguments":{"title":"标题（≤20字）","content":"正文内容（≤1000字）","images":["/absolute/path/to/image1.jpg","/absolute/path/to/image2.jpg"],"tags":["话题1","话题2"],"is_original":true}},"id":1}' \
  -o /tmp/xhs-publish.json
```

**发布后检查**：
```bash
python3 -c "
import json
d=json.load(open('/tmp/xhs-publish.json'))
for c in d.get('result',{}).get('content',[]):
    print(c.get('text','')[:300])
"
```

> 发布成功返回 "内容发布成功" + 标题/图片数/状态。失败检查违禁词或账号风控状态。

## 获流研究页面

研究页面路径：`/xhs-research`，组件：`src/pages/XhsResearch.tsx`

**页面结构**：
- 展示搜索结果列表，每条帖子包含：序号、标题、作者、互动数据、原帖链接
- 纯图帖用 `imageContent` 字段标注图片中的文字内容（粉红色高亮区块）
- Top 3 用红色序号标记
- 排除公共头部和底部

**添加新帖子到页面**：在 `posts` 数组中追加对象，`imageContent` 为可选字段。

## 小红书运营知识

- **标题**: 最多 20 个字（**换行也算字数！**）
- **正文**: 最多 1000 字，不含 `#` 开头的标签（用 `tags` 参数）
- **评论**: 尽量 ≤200 字（换行算字数），避免被折叠
- **图文流量 > 视频 > 纯文字**
- **每天发帖上限**: 约 50 篇
- **同一账号不可多端网页登录**，会互踢（手机 App 不受影响）
- **避免**: 引流、纯搬运（官方重点打击）
- **曝光低**: 先检查是否有违禁词
- **建议**: 账号提前完成实名认证

## 故障排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 连接失败 `localhost:1806x` | MCP 服务未启动 | 启动主程序二进制 |
| `context deadline exceeded` | 浏览器卡住或并发请求 | 重启 MCP 服务（`pkill` + 重新启动） |
| 登录状态失效 | Cookie 过期或在其他网页端登录 | 重新运行登录工具 |
| 登录工具显示"当前登录状态: true" | 工作目录有残留 cookies.json | `rm -f ./cookies.json` 后重试 |
| 搜索无结果 | 关键词太偏或筛选条件太严 | 放宽筛选或换关键词 |
| 发布成功但看不到 | 账号被风控或内容违规 | 用非无头模式排查，检查违禁词 |
| 双账号同时请求超时 | 无头浏览器并发冲突 | 串行调用，等一个完成再调另一个 |
