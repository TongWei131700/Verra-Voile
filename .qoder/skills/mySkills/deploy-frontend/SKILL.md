---
name: deploy-frontend
description: 将前端代码构建并部署到远程服务器，包括 git 版本控制、构建、上传、Nginx 配置。当用户说"部署前端"、"发布前端代码"、"deploy frontend"时触发。
---

# 部署前端服务

## 服务器信息

- **IP**: `47.99.138.250`
- **SSH用户**: `root`
- **SSH密码**: `TongWei131700`
- **部署路径**: `/var/www/verra-voile`
- **本地项目路径**: `/Users/hongli/WorkSpace/Verra-Voile`

## 部署步骤

### 1. 确认部署

使用 `AskUserQuestion` 告知用户即将部署，确认继续。

### 2. 本地构建

```bash
cd /Users/hongli/WorkSpace/Verra-Voile && npm run build
```

等待构建完成，确认 `dist/` 包含 `index.html` 和 `assets/`。

### 3. 上传到服务器

使用 `expect` 处理密码认证：

```bash
expect << 'EXPECT_EOF'
set timeout 120
spawn scp -r -o StrictHostKeyChecking=no /Users/hongli/WorkSpace/Verra-Voile/dist/index.html /Users/hongli/WorkSpace/Verra-Voile/dist/assets root@47.99.138.250:/var/www/verra-voile/
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

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

### 6. Git 版本控制（部署完成后执行）

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

## 输出

部署完成后报告：
- Git 分支操作结果（合并到 main、新建分支）
- 构建状态
- 上传结果
- HTTPS 访问状态
