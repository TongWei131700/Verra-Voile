---
name: deploy-frontend
description: 将前端代码构建并部署到远程服务器，包括 git 版本控制、构建、上传、Nginx 配置。当用户说"部署前端"、"发布前端代码"、"deploy frontend"时触发。
---

# 部署前端服务

## ⚠️⚠️⚠️ 前端必须使用 SSG 预渲染部署

**禁止使用 `npm run build`（纯 SPA 模式），必须使用 `npm run build:seo`（SSG 预渲染）！**

```bash
# ✅ 正确：SSG 预渲染（生成所有动态页面的静态 HTML，确保 SEO）
VITE_API_URL=https://europewedding.cn npm run build:seo

# ❌ 禁止：纯 SPA 构建（无预渲染，搜索引擎无法抓取动态内容）
npm run build
```

- `build:seo` = `vite build` + `node scripts/prerender.cjs`（Puppeteer 预渲染页面）
- 预渲染耗时约 10-15 分钟，需提前告知用户预计时间
- 必须设置 `VITE_API_URL=https://europewedding.cn` 环境变量，确保预渲染时 API 请求指向线上

### SSG 预渲染范围规则

**仅预渲染以下模块的列表页 + 详情页：**
- Destinations（目的地场地）：列表页 + 国家落地页 + 所有场地详情页
- Photography（摄影师）：列表页 + 所有摄影师详情页
- Wedding Team（婚礼团队）：列表页 + 所有团队详情页

**以下模块仅预渲染列表页，跳过详情页：**
- Flowers（花卉）：仅列表页
- Dresses（礼服）：仅列表页
- Wine（酒水宴席）：仅列表页

> 礼服、花卉、酒水的详情页由 SPA fallback 处理，用户访问时动态加载，不影响用户体验。此规则已写入 `scripts/prerender.cjs`。

---

## ⚠️⚠️⚠️ 部署前必读：Git 分支操作

**每次部署前后都必须执行 Git 分支操作，绝对不能忘记！**

部署流程中的 Git 步骤：
1. **部署前**：确认当前分支，确保所有改动已提交
2. **部署后**：提交改动 → 合并到 main → 创建下一版本分支

> 忘记做 Git 操作会导致代码版本混乱，下次部署时找不到正确的改动记录。

---

## 服务器信息

- **IP**: `47.99.138.250`
- **SSH用户**: `root`
- **SSH密码**: `TongWei131700`
- **部署路径**: `/var/www/verra-voile`
- **本地项目路径**: `/Users/hongli/WorkSpace/Verra-Voile`

## 部署步骤

### 1. 确认部署

使用 `AskUserQuestion` 告知用户即将部署，确认继续。

### 1.5 罗列 SSG 页面明细（⚠️ 必须执行，不可跳过！）

**构建前必须先查询本地数据库各模块数据量，罗列 SSG 页面明细表供用户确认，用户同意后才开始构建！**

```bash
mysql -u root verra_voile -e "
  SELECT 'venues' AS module, COUNT(*) AS cnt FROM crawled_venues
  UNION ALL SELECT 'photographers', COUNT(*) FROM crawled_photographers
  UNION ALL SELECT 'teams', COUNT(*) FROM crawled_wedding_teams;
"
```

根据查询结果计算 SSG 页面总数并展示明细表：

| 模块 | 页面构成 | 页面数 |
|------|----------|--------|
| 首页 | 1 | 1 |
| 目的地 | 列表页 1 + 国家落地页 5 + 场地详情 N | 6 + N |
| 摄影师 | 列表页 1 + 摄影师详情 M | 1 + M |
| 婚礼团队 | 列表页 1 + 团队详情 K | 1 + K |
| 花卉 / 礼服 / 酒水 | 各仅列表页 | 3 |
| **合计** | | **12 + N + M + K** |

> 用户确认明细后才执行 `npm run build:seo`，避免构建完成后发现数量不对。

### 2. 本地 SSG 构建（⚠️ 必须用 build:seo）

```bash
cd /Users/hongli/WorkSpace/Verra-Voile && VITE_API_URL=https://europewedding.cn npm run build:seo
```

等待 Vite 构建 + Puppeteer 预渲染完成（约 15-20 分钟），确认 `dist/` 包含所有预渲染的静态 HTML 页面。

### 3. 上传到服务器

**⚠️ 必须分两步上传：先上传 assets，再上传 index.html！** 否则 index.html 先到位但 JS/CSS 还没传完，用户访问会白屏。

```bash
# 第一步：先上传 assets 目录（JS/CSS/图片等）
expect << 'EXPECT_EOF'
set timeout 120
spawn scp -r -o StrictHostKeyChecking=no /Users/hongli/WorkSpace/Verra-Voile/dist/assets root@47.99.138.250:/var/www/verra-voile/
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF

# 第二步：上传 index.html（最后上传，确保所有资源已就位）
expect << 'EXPECT_EOF'
set timeout 30
spawn scp -o StrictHostKeyChecking=no /Users/hongli/WorkSpace/Verra-Voile/dist/index.html root@47.99.138.250:/var/www/verra-voile/
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 3.5 验证服务器文件完整性（必须执行）

上传后**立即对比**服务器和本地的 JS/CSS 文件大小，防止 0 字节空文件导致白屏：

```bash
# 服务器端检查关键文件大小
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "ls -la /var/www/verra-voile/assets/index-*.js /var/www/verra-voile/assets/index-*.css"

# 本地对比
ls -la /Users/hongli/WorkSpace/Verra-Voile/dist/assets/index-*.js /Users/hongli/WorkSpace/Verra-Voile/dist/assets/index-*.css
```

> 如果服务器上任何 JS/CSS 文件大小为 0 或与本地不一致，**必须重新上传该文件**，否则会导致白屏。

### 3.6 缓存破坏（防止浏览器缓存旧版 JS）

如果之前部署出过 0 字节文件被浏览器缓存的情况，需要在 index.html 中给 JS 引用加缓存破坏参数：

```bash
# 在服务器上给 JS 文件加版本号参数，强制浏览器重新获取
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "sed -i 's|index-\([a-zA-Z0-9]*\)\.js|index-\1.js?v=2|g' /var/www/verra-voile/index.html"
```

> 每次部署如果怀疑有缓存问题，递增 `?v=3`、`?v=4` 等。

### 4. 检查 Nginx 配置清洁度

**⚠️ 必须执行！** 每次前端部署后都要检查 `sites-enabled/` 下是否有冲突的配置文件，否则可能导致前端页面无法访问。

```bash
# 检查 sites-enabled 下是否有多个配置文件导致 server_name 冲突
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "ls -la /etc/nginx/sites-enabled/"

# 如果存在 .bak 或其他多余文件，立即删除并重载
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "rm -f /etc/nginx/sites-enabled/*.bak && nginx -t 2>&1 && nginx -s reload"
```

> **踩坑记录**：`sites-enabled/` 下同时存在 `verra-voile` 和 `verra-voile.bak`，两者监听相同端口和 server_name，导致 Nginx 路由冲突，前端页面返回 404。

### 5. 验证部署

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nSize: %{size_download} bytes\n" https://www.europewedding.cn/
```

确认 HTTP 200，报告访问 URL。

### 6. Git 版本控制（⚠️ 必须执行，不可跳过！）

**这是部署流程的必要组成部分，不是可选步骤！** 每次部署后都必须执行以下 Git 操作：

部署成功后，将所有改动（包括部署过程中产生的新文件）提交并切换新分支：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile

# 1. 提交所有改动
git add -A
git commit -m "feat: 部署更新"

# 2. 合并到 main
git checkout main
git merge <当前分支> --no-edit
git push origin main

# 3. 版本号递增（根据当前分支号 +1）
# 例如当前 daily/0.0.6 → 下一版本 daily/0.0.7
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_VERSION=$(echo "$CURRENT_BRANCH" | sed 's/daily\///')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"

# 4. 创建并切换到下一版本分支
git checkout -b $NEXT_BRANCH
git push origin $NEXT_BRANCH
```

**分支命名规范**: `daily/x.y.z`（不使用 fe/ 或 be/ 前缀）

## Nginx 配置（已配置，无需重复）

服务器 Nginx 已配置：
- HTTPS (443) + HTTP→HTTPS 重定向 (80)
- `server_name`: `europewedding.cn www.europewedding.cn`
- SSL 证书: `/etc/letsencrypt/live/europewedding.cn/`
- SPA 路由: `try_files $uri $uri/ /index.html`
- API 代理: `/api/` → `http://127.0.0.1:3000`
- 配置文件位置: `/etc/nginx/sites-enabled/verra-voile`

## ⚠️ 前端部署踩坑清单（必读）

| # | 问题 | 原因 | 解决方案 |
|---|------|------|----------|
| 1 | 前端页面 404 无法访问 | `sites-enabled/` 下有 `.bak` 冲突配置文件 | 部署后必须检查并清理 sites-enabled 下的多余文件 |
| 2 | 前端上传后数据库导出静默失败 | 和数据库导出用 `&&` 串联，上传耗时导致后续命令被跳过 | 前后端部署的每个步骤**独立执行**，不要用 `&&` 串联长时间命令 |
| 3 | 前端部署后白屏，JS 文件 0 字节 | `scp -r` 同时上传 index.html 和 assets 时，JS 文件在服务器上变成 0 字节；且浏览器会缓存这个 0 字节响应，即使后续重新上传正确文件，浏览器仍返回缓存的空文件 | 1. **分步上传**：先传 assets，验证文件大小正确后再传 index.html；2. 上传后立即对比服务器和本地的 JS/CSS 文件大小；3. 若已产生缓存问题，在 index.html 中给 JS 引用加 `?v=N` 缓存破坏参数 |

## 输出

部署完成后报告：
- Git 分支操作结果（合并到 main、新建分支）
- 构建状态
- 上传结果
- HTTPS 访问状态
