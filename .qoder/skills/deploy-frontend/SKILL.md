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

### 0. Git 版本控制（必须先执行）

在部署前，必须先完成以下 git 操作：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile

# 1. 提交所有改动
git add -A
git commit -m "feat: 部署更新"

# 2. 合并到 main
git checkout main
git merge <当前分支> --no-edit
git push origin main

# 3. 获取下一版本号（从线上 API 获取）
NEXT_VERSION=$(curl -s http://47.99.138.250/api/version/next?side=frontend | grep -o '"version":"[^"]*"' | cut -d'"' -f4)

# 4. 创建并切换到下一版本分支
git checkout -b daily/${NEXT_VERSION}
git push origin daily/${NEXT_VERSION}
```

**分支命名规范**: `daily/x.y.z`（不使用 fe/ 或 be/ 前缀）

**注意**: 如果当前没有未提交改动，跳过 commit 步骤，但仍需执行合并 main 和创建新分支。

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

### 4. 验证部署

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nSize: %{size_download} bytes\n" https://www.europewedding.cn/
```

确认 HTTP 200，报告访问 URL。

## Nginx 配置（已配置，无需重复）

服务器 Nginx 已配置：
- HTTPS (443) + HTTP→HTTPS 重定向 (80)
- `server_name`: `europewedding.cn www.europewedding.cn`
- SSL 证书: `/etc/letsencrypt/live/europewedding.cn/`
- SPA 路由: `try_files $uri $uri/ /index.html`
- API 代理: `/api/` → `http://127.0.0.1:3000`

## 输出

部署完成后报告：
- Git 分支操作结果（合并到 main、新建分支）
- 构建状态
- 上传结果
- HTTPS 访问状态
