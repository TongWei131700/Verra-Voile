---
name: deploy-backend
description: 将后端代码打包部署到远程服务器，包括上传代码、安装依赖、配置环境变量、PM2启动服务。当用户说"部署后端"、"发布服务端代码"、"deploy backend"时触发。
---

# 部署后端服务

## 服务器信息

- **IP**: `47.99.138.250`
- **SSH用户**: `root`
- **SSH认证**: **仅密钥认证**（服务器已禁用密码登录，用密码会报 `Permission denied (publickey)`）。本机 `~/.ssh/id_ed25519` 已授权，直接 `ssh/scp root@47.99.138.250` 即可，无需 expect
- **历史密码备份**（仅数据库用途，SSH 不可用）: `TongWei131700` / `Chineseman.`
- **部署路径**: `/var/www/verra-voile-end`
- **服务端口**: `3000`
- **PM2进程名**: `verra-voile-api`

## 数据库配置

- **DB_HOST**: `127.0.0.1`
- **DB_PORT**: `3306`
- **DB_USER**: `root`
- **DB_PASSWORD**: `TongWei131700`
- **DB_NAME**: `verra_voile`

## 部署步骤

### 1. 确认部署

使用 `AskUserQuestion` 告知用户即将部署，确认继续。

### 2. Git 版本控制（⚠️ 第一步执行！不可跳过！）

**这是部署流程的第一步，确保代码版本锁定后再开始构建和上传！**

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End

# 1. 确认当前分支和改动
git branch
git status

# 2. 提交所有改动
git add -A
git commit -m "feat: 部署更新"

# 3. 合并到 main
git checkout main
git merge <当前分支> --no-edit
git push origin main

# 4. 版本号递增（根据当前分支号 +1）
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_VERSION=$(echo "$CURRENT_BRANCH" | sed 's/daily\///')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"

# 5. 创建并切换到下一版本分支
git checkout -b $NEXT_BRANCH
git push origin $NEXT_BRANCH
```

**分支命名规范**: `daily/x.y.z`（不使用 fe/ 或 be/ 前缀）

### 3. 本地打包

排除 `node_modules`、`.git`、`uploads`、`.env` 目录（不要覆盖服务器环境配置）：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
tar --exclude='node_modules' --exclude='.git' --exclude='uploads' --exclude='.env' -czf /tmp/verra-voile-end.tar.gz -C . .
```

### 4. 上传到服务器

直接使用密钥认证（无需 expect）：

```bash
scp /tmp/verra-voile-end.tar.gz root@47.99.138.250:/tmp/
```

### 5. 服务器解压并安装依赖

直接使用密钥认证（无需 expect）：

```bash
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "cd /var/www/verra-voile-end && rm -rf src package.json package-lock.json && tar -xzf /tmp/verra-voile-end.tar.gz && npm install --production 2>&1 | tail -5 && echo DEPLOY_OK"
```

### 6. 同步本地数据库到服务器（⚠️ 必须在 SSG 构建前完成！）

将本地 `verra_voile` 数据库的**全量业务表**导出并导入服务器，确保线上数据与本地一致。

**⚠️ 此步骤必须在 SSG 预渲染构建之前完成！** SSG 构建从生产 API 拉取数据，如果数据库未同步，预渲染的 HTML 将包含旧数据。

**⚠️ 关键：必须动态获取表列表，禁止硬编码！**

每次部署前，先查询本地数据库获取所有 `crawled_*`、`cd_*`、`cv_*` 表名，确保不遗漏任何新增表。历史上曾因遗漏 `crawled_wedding_teams` 表导致摄影页面 API 报 500 错误。

```bash
# 0. 动态获取所有业务表名（最重要的一步！）
ALL_TABLES=$(/usr/local/mysql/bin/mysql -u root -N -B -e "
  SELECT TABLE_NAME FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = 'verra_voile'
  AND (
    TABLE_NAME LIKE 'crawled_%'
    OR TABLE_NAME LIKE 'cd_%'
    OR TABLE_NAME LIKE 'cv_%'
    OR TABLE_NAME IN (
      'products', 'product_modules',
      'products_catering', 'products_destination', 'products_dress',
      'products_floral', 'products_other', 'products_team', 'products_wine',
      'data_versions', 'deploy_versions', 'wedding_teams'
    )
  )
  ORDER BY TABLE_NAME;
")
echo "将要同步的表: $ALL_TABLES"

# 1. 本地导出全量业务表（含表结构 + 数据）
/usr/local/mysql/bin/mysqldump -u root verra_voile $ALL_TABLES \
  --skip-lock-tables --routines --triggers > /tmp/full_business_tables.sql

# 确认导出成功
ls -lh /tmp/full_business_tables.sql
```

**不同步（服务器产生的用户数据）：**
- `users`, `reservations`, `verification_codes`, `messages`, `user_selected_products`
- 测试/快照表：`snapshot_*`, `test_*`, `testDestination`

```bash
# 2. 上传 SQL 到服务器（独立执行，不要和其他长命令用 && 串联）
scp -o StrictHostKeyChecking=no /tmp/full_business_tables.sql root@47.99.138.250:/tmp/

# 3. 服务器导入（全量替换业务表）
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "mysql -h 127.0.0.1 -P 3306 -u root -p'TongWei131700' verra_voile < /tmp/full_business_tables.sql && echo DB_SYNC_OK"
```

> **注意**：此步骤会全量覆盖业务表，服务器上的爬取数据和商品数据会被本地数据完全替换。用户数据（订单、注册等）不受影响。
>
> **⚠️ 踩坑记录**：数据库导出和前端上传不要放在同一个 Bash 命令中用 `&&` 串联，否则前端上传耗时过长时数据库导出可能被静默跳过。必须作为独立步骤分别执行。

### 7. 同步爬取图片到服务器（⚠️ 必须执行！）

后端打包时 `--exclude='uploads'` 会跳过图片目录，因此每次部署后必须同步本地新增的爬取图片。
图片统一存储在独立 Git 仓库 `/Users/hongli/WorkSpace/Verra-Voile-Uploads/`（使用 Git LFS），后端通过符号链接引用。
使用 `rsync -avz` 增量同步，已存在的文件会自动跳过，不会重复上传。

```bash
# 从图片仓库同步所有爬取图片到服务器
rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" \
  --exclude='._*' \
  /Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled/ \
  root@47.99.138.250:/var/www/verra-voile-end/uploads/crawled/
```

> **说明**：rsync 会自动对比文件大小和时间戳，已有文件全部跳过（显示 `skipping`），仅传输新增/变更的文件。首次同步可能较慢，后续增量同步通常只需几秒。
>
> **⚠️ 如果 rsync 不可用或网络不稳定**，改用打包方案：
> ```bash
> # 本地打包 → 上传 → 服务器解压
> tar -czf /tmp/crawled-images.tar.gz -C /Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled . --exclude='._*'
> scp /tmp/crawled-images.tar.gz root@47.99.138.250:/tmp/
> ssh root@47.99.138.250 "cd /var/www/verra-voile-end/uploads/crawled && tar -xzf /tmp/crawled-images.tar.gz"
> ```
>
> **图片仓库架构**：
> - 仓库位置：`/Users/hongli/WorkSpace/Verra-Voile-Uploads/`（独立 Git 仓库，使用 Git LFS）
> - 后端引用：`Verra-Voile-End/uploads/crawled` → 符号链接到图片仓库
> - 新增图片后必须在图片仓库 commit 并 push，确保有版本控制备份

### 8. 停止服务并释放端口

**必须先杀端口再重启**，否则旧进程占用端口 3000 会导致 EADDRINUSE 错误，服务陷入崩溃循环：

```bash
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "pm2 stop verra-voile-api 2>/dev/null; sleep 1; fuser -k 3000/tcp 2>/dev/null; sleep 2 && echo PORT_CLEARED"
```

### 9. 启动服务

端口释放后再启动，避免端口冲突：

```bash
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "pm2 restart verra-voile-api && sleep 3 && curl -s http://localhost:3000/health"
```

### 10. 检查 Nginx 配置清洁度

**⚠️ 必须执行！** 每次部署前后都要检查 `sites-enabled/` 下是否有冲突的配置文件（如 `.bak` 文件），否则会导致前端页面无法访问。

```bash
# 检查 sites-enabled 下是否有多个配置文件导致 server_name 冲突
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "ls -la /etc/nginx/sites-enabled/"

# 如果存在 .bak 或其他多余文件，立即删除
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "rm -f /etc/nginx/sites-enabled/*.bak && nginx -t 2>&1 && nginx -s reload"
```

> **踩坑记录**：`sites-enabled/` 下同时存在 `verra-voile` 和 `verra-voile.bak` 两个文件，两者监听相同端口和 server_name，导致 Nginx 路由冲突，前端页面返回 404。

### 11. 验证部署

**必须验证所有关键 API 端点**，不能只检查 health：

```bash
# 1. API 健康检查
curl -s http://47.99.138.250/health

# 2. 摄影页面关键 API（曾因缺表导致 500）
curl -s -o /dev/null -w "%{http_code}" http://47.99.138.250/api/products/crawled-wedding-teams

# 3. 前端页面
curl -s -o /dev/null -w "%{http_code}" https://www.europewedding.cn/

# 4. 检查 PM2 错误日志是否有新报错
ssh -o StrictHostKeyChecking=no root@47.99.138.250 "tail -10 /root/.pm2/logs/verra-voile-api-error.log"
```

确认所有端点返回 200，且 PM2 错误日志无新增 `ER_NO_SUCH_TABLE` 等数据库错误。

## 首次部署（无PM2进程时）

如果 PM2 中没有 `verra-voile-api` 进程，改用以下命令启动：

```bash
cd /var/www/verra-voile-end && pm2 start src/index.js --name verra-voile-api && pm2 save
```

## Nginx 反向代理（已配置）

服务器 Nginx 已配置好以下代理规则，无需重复配置：

- `/api/` → `http://127.0.0.1:3000`
- `/uploads/` → `http://127.0.0.1:3000`
- `/` → 前端静态文件（`/var/www/verra-voile`）
- 配置文件位置：`/etc/nginx/sites-enabled/verra-voile`

## ⚠️ 部署踩坑清单（必读）

| # | 问题 | 原因 | 解决方案 |
|---|------|------|----------|
| 1 | 摄影页 API 报 500，`Table 'crawled_wedding_teams' doesn't exist` | 数据库导出时硬编码表名，遗漏了新增表 | **动态查询** information_schema 获取所有 crawled_*/cd_*/cv_* 表名 |
| 2 | 前端页面 404 无法访问 | `sites-enabled/` 下有 `.bak` 冲突配置文件 | 部署后检查并清理 sites-enabled 下的多余文件 |
| 3 | 数据库导出静默失败 | 和前端上传用 `&&` 串联，上传耗时导致导出被跳过 | 每个操作**独立执行**，不要用 `&&` 串联长时间命令 |
| 4 | SSH 命令使用 expect 但服务器已启用密钥认证 | 旧模板未更新 | 后端 SSH 直接用 `ssh/scp`，无需 expect |
| 5 | PM2 进程名写错（`verra-api` vs `verra-voile-api`） | 命令中进程名与实际不一致 | 统一使用 `verra-voile-api`，操作前先 `pm2 list` 确认 |
| 6 | 部署后图片 404（摄影师/场地图片缺失） | 后端打包 `--exclude='uploads'` 跳过了图片目录，新增的图片未上传到服务器 | 每次部署后用 **rsync 增量同步** 图片仓库 `Verra-Voile-Uploads/crawled/` 到服务器（步骤 7），已有文件自动跳过不会重复上传 |
| 7 | 本地图片目录被误删，所有图片 404 | `uploads/` 在 `.gitignore` 中，不受 Git 保护，误删后无法恢复 | 图片统一存储在独立 Git 仓库 `Verra-Voile-Uploads/`（使用 Git LFS），后端通过符号链接引用。新增图片后必须在图片仓库 commit |

## 输出

部署完成后报告：
- Git 分支操作结果（合并到 main、新建分支）
- 打包状态
- 上传结果
- 健康检查 HTTP 响应
- 数据库同步结果（记录条数对比）
- PM2 进程状态
- 图片同步结果（rsync 增量同步，新增文件数）
- Nginx 配置清洁度检查结果
