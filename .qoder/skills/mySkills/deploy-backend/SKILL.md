---
name: deploy-backend
description: 将后端代码打包部署到远程服务器，包括上传代码、安装依赖、配置环境变量、PM2启动服务。当用户说"部署后端"、"发布服务端代码"、"deploy backend"时触发。
---

# 部署后端服务

## 服务器信息

- **IP**: `47.99.138.250`
- **SSH用户**: `root`
- **SSH密码**: `TongWei131700`
- **部署路径**: `/var/www/verra-voile-end`
- **服务端口**: `3000`
- **PM2进程名**: `verra-voile-api`

## 数据库配置

- **DB_HOST**: `127.0.0.1`
- **DB_PORT**: `3306`
- **DB_USER**: `root`
- **DB_PASSWORD**: `caoqiangiot@123`
- **DB_NAME**: `verra_voile`

## 部署步骤

### 1. 确认部署

使用 `AskUserQuestion` 告知用户即将部署，确认继续。

### 2. 本地打包

排除 `node_modules`、`.git`、`uploads`、`.env` 目录（不要覆盖服务器环境配置）：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End
tar --exclude='node_modules' --exclude='.git' --exclude='uploads' --exclude='.env' -czf /tmp/verra-voile-end.tar.gz -C . .
```

### 3. 上传到服务器

使用 `expect` 处理密码认证：

```bash
expect << 'EXPECT_EOF'
set timeout 60
spawn scp -o StrictHostKeyChecking=no /tmp/verra-voile-end.tar.gz root@47.99.138.250:/tmp/
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 4. 服务器解压并安装依赖

```bash
expect << 'EXPECT_EOF'
set timeout 120
spawn ssh -o StrictHostKeyChecking=no root@47.99.138.250 "cd /var/www/verra-voile-end && rm -rf src package.json package-lock.json && tar -xzf /tmp/verra-voile-end.tar.gz && npm install --production 2>&1 | tail -5 && echo DEPLOY_OK"
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 5. 停止服务并释放端口

**必须先杀端口再重启**，否则旧进程占用端口 3000 会导致 EADDRINUSE 错误，服务陷入崩溃循环：

```bash
expect << 'EXPECT_EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@47.99.138.250 "pm2 stop verra-api && sleep 1 && fuser -k 3000/tcp 2>/dev/null; sleep 2 && echo PORT_CLEARED"
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 6. 启动服务

端口释放后再启动，避免端口冲突：

```bash
expect << 'EXPECT_EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@47.99.138.250 "pm2 start verra-api && sleep 3 && curl -s http://localhost:3000/health"
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 7. 同步本地数据库到服务器

将本地 `verra_voile` 数据库的**全量业务表**导出并导入服务器，确保线上数据与本地一致：

**同步范围（业务数据表，本地为主）：**
- 爬取数据：`crawled_destinations`, `crawled_venues`
- 商品数据：`products`, `product_modules`, `products_catering`, `products_destination`, `products_dress`, `products_floral`, `products_other`, `products_team`, `products_wine`
- 版本/配置：`data_versions`, `deploy_versions`, `wedding_teams`

**不同步（服务器产生的用户数据）：**
- `users`, `reservations`, `verification_codes`, `messages`, `user_selected_products`
- 测试/快照表：`snapshot_*`, `test_*`, `testDestination`

```bash
# 1. 本地导出全量业务表（含表结构 + 数据）
/usr/local/mysql/bin/mysqldump -u root verra_voile \
  crawled_destinations crawled_venues \
  products product_modules \
  products_catering products_destination products_dress products_floral \
  products_other products_team products_wine \
  data_versions deploy_versions wedding_teams \
  --skip-lock-tables --routines --triggers > /tmp/full_business_tables.sql

# 2. 上传 SQL 到服务器
expect << 'EXPECT_EOF'
set timeout 60
spawn scp -o StrictHostKeyChecking=no /tmp/full_business_tables.sql root@47.99.138.250:/tmp/
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF

# 3. 服务器导入（全量替换业务表）
expect << 'EXPECT_EOF'
set timeout 60
spawn ssh -o StrictHostKeyChecking=no root@47.99.138.250 "mysql -h 127.0.0.1 -P 3306 -u root -p'caoqiangiot@123' verra_voile < /tmp/full_business_tables.sql && echo DB_SYNC_OK"
expect {
    "password:" {
        send "TongWei131700\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

> **注意**：此步骤会全量覆盖业务表，服务器上的爬取数据和商品数据会被本地数据完全替换。用户数据（订单、注册等）不受影响。

### 8. 验证部署

健康检查 + 数据库验证：

```bash
# API 健康检查
curl -s http://47.99.138.250/api/products/crawled-destinations | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'数据: {len(d.get(\"data\",[]))} 条')"
```

确认返回 200 且数据条数与本地一致。

### 9. Git 版本控制（部署完成后执行）

部署成功后，将所有改动（包括部署过程中产生的新文件）提交并切换新分支：

```bash
cd /Users/hongli/WorkSpace/Verra-Voile-End

# 1. 提交所有改动
git add -A
git commit -m "feat: 部署更新"

# 2. 合并到 main
git checkout main
git merge <当前分支> --no-edit
git push origin main

# 3. 版本号递增（根据当前分支号 +1）
# 例如当前 daily/0.0.3 → 下一版本 daily/0.0.4
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_VERSION=$(echo "$CURRENT_BRANCH" | sed 's/daily\///')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"

# 4. 创建并切换到下一版本分支
git checkout -b $NEXT_BRANCH
git push origin $NEXT_BRANCH
```

**分支命名规范**: `daily/x.y.z`（不使用 be/ 或 fe/ 前缀）

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

## 输出

部署完成后报告：
- Git 分支操作结果（合并到 main、新建分支）
- 打包状态
- 上传结果
- 健康检查 HTTP 响应
- 数据库同步结果（记录条数对比）
- PM2 进程状态
