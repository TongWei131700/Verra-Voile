#!/bin/bash
# ============================================================
# Verra-Voile 全栈一键部署脚本
# 用法: ./scripts/deploy.sh
# 前提: 本地已安装 sshpass (brew install hudochenkov/sshpass/sshpass)
# ============================================================

set -e

# ---------- 配置区 ----------
SERVER_IP="47.99.138.250"
SERVER_USER="root"
SERVER_PASS="TongWei131700"
FRONTEND_DIR="/Users/hongli/WorkSpace/Verra-Voile"
BACKEND_DIR="/Users/hongli/WorkSpace/Verra-Voile-End"
REMOTE_FRONTEND="/var/www/verra-voile"
REMOTE_BACKEND="/var/www/verra-voile-end"
DB_NAME="verra_voile"
DB_USER="verra"
DB_PASS="VerraVoile2024!"
API_BASE="http://${SERVER_IP}"
# ----------------------------

SSH_COMMON_OPTS="-o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -o ConnectTimeout=10"
SSH_OPTS="${SSH_COMMON_OPTS} -p 59222"
SSH_CMD="sshpass -p '${SERVER_PASS}' ssh ${SSH_OPTS} ${SERVER_USER}@${SERVER_IP}"
SCP_CMD="sshpass -p '${SERVER_PASS}' scp ${SSH_COMMON_OPTS} -P 59222"

run_remote() {
  eval "${SSH_CMD} \"$1\""
}

echo "============================================"
echo "   Verra-Voile 全栈部署"
echo "   目标: ${SERVER_IP}"
echo "============================================"

# ====== Step 1: 本地构建前端 ======
echo ""
echo "▶ [1/8] 构建前端..."
cd "$FRONTEND_DIR"
npx vite build
echo "  ✓ 前端构建完成"

# ====== Step 2: 服务器环境安装 ======
echo ""
echo "▶ [2/8] 安装服务器环境..."

echo "  - apt update..."
run_remote "export DEBIAN_FRONTEND=noninteractive && apt-get update -qq 2>/dev/null"

echo "  - 安装 curl, nginx..."
run_remote "export DEBIAN_FRONTEND=noninteractive && apt-get install -y -qq curl nginx 2>/dev/null && echo OK"

echo "  - 安装 MySQL..."
run_remote "export DEBIAN_FRONTEND=noninteractive && apt-get install -y -qq mysql-server 2>/dev/null && echo OK"

echo "  - 安装 Node.js..."
run_remote "
if command -v node &> /dev/null; then
  echo ALREADY_INSTALLED
else
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
  apt-get install -y -qq nodejs 2>/dev/null
  echo INSTALLED
fi
"

echo "  - 安装 PM2..."
run_remote "
if command -v pm2 &> /dev/null; then
  echo ALREADY_INSTALLED
else
  npm install -g pm2 > /dev/null 2>&1 && echo INSTALLED
fi
"
echo "  ✓ 环境就绪"

# ====== Step 3: 配置 MySQL ======
echo ""
echo "▶ [3/8] 配置 MySQL 数据库..."
run_remote "
systemctl enable mysql > /dev/null 2>&1
systemctl start mysql
mysql -u root -e \"CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4;\"
mysql -u root -e \"CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';\"
mysql -u root -e \"GRANT ALL ON ${DB_NAME}.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;\"
echo 'DB_READY'
"
echo "  ✓ 数据库配置完成"

# ====== Step 4: 上传后端代码 ======
echo ""
echo "▶ [4/8] 上传后端代码..."
run_remote "rm -rf ${REMOTE_BACKEND} && mkdir -p ${REMOTE_BACKEND}"

# 排除 node_modules 和 .env
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.git' \
  -e "sshpass -p '${SERVER_PASS}' ssh ${SSH_OPTS}" \
  "${BACKEND_DIR}/" "${SERVER_USER}@${SERVER_IP}:${REMOTE_BACKEND}/"

echo "  ✓ 后端代码已上传"

# ====== Step 5: 配置并启动后端 ======
echo ""
echo "▶ [5/8] 配置后端环境并启动..."
run_remote "
cd ${REMOTE_BACKEND}

# 写入 .env
cat > .env << EOF
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
EOF

# 创建 uploads 目录
mkdir -p uploads

# 安装依赖
npm install --production > /dev/null 2>&1

# PM2 重启
pm2 delete verra-api 2>/dev/null || true
pm2 start src/index.js --name verra-api
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true

echo 'API_STARTED'
"
echo "  ✓ 后端服务已启动 (PM2: verra-api)"

# ====== Step 6: 上传前端产物 ======
echo ""
echo "▶ [6/8] 上传前端产物..."
run_remote "rm -rf ${REMOTE_FRONTEND} && mkdir -p ${REMOTE_FRONTEND}"

eval "${SCP_CMD} -r ${FRONTEND_DIR}/dist/* ${SERVER_USER}@${SERVER_IP}:${REMOTE_FRONTEND}/"

echo "  ✓ 前端文件已上传"

# ====== Step 7: 配置 Nginx ======
echo ""
echo "▶ [7/8] 配置 Nginx..."
run_remote "
cat > /etc/nginx/sites-available/verra-voile << 'NGINX_CONF'
server {
    listen 80;
    server_name ${SERVER_IP};

    # 前端静态资源
    root ${REMOTE_FRONTEND};
    index index.html;

    # SPA 路由 fallback
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        client_max_body_size 10m;
    }

    # 上传文件访问
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
NGINX_CONF

# 启用配置
ln -sf /etc/nginx/sites-available/verra-voile /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试并重载
nginx -t && systemctl reload nginx
echo 'NGINX_READY'
"
echo "  ✓ Nginx 配置完成"

# ====== Step 8: 版本控制 ======
echo ""
echo "▶ [8/8] 版本控制..."

# 获取当前分支和commit信息
FRONTEND_BRANCH=$(cd "$FRONTEND_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')
BACKEND_BRANCH=$(cd "$BACKEND_DIR" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')

# 先获取 admin token
ADMIN_TOKEN=$(curl -s -X POST "${API_BASE}/api/auth/admin-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"tongwei","password":"TongWei131700"}' 2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "  ⚠ 无法获取管理员 token，跳过版本记录"
else
  # --- 前端版本 ---
  FE_VERSION=$(echo "$FRONTEND_BRANCH" | sed 's/daily\///' 2>/dev/null || echo '')
  if [ -n "$FE_VERSION" ] && [ "$FE_VERSION" != "main" ] && [ "$FE_VERSION" != "$FRONTEND_BRANCH" ]; then
    echo "  前端版本: v${FE_VERSION} (${FRONTEND_BRANCH})"
    FE_RESP=$(curl -s -X POST "${API_BASE}/api/version/deploy" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -d '{"side":"frontend","note":"部署脚本自动记录"}' 2>/dev/null)
    FE_NEXT=$(echo "$FE_RESP" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$FE_NEXT" ]; then
      IFS='.' read -r MAJOR MINOR PATCH <<< "$FE_NEXT"
      FE_NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"
      cd "$FRONTEND_DIR"
      # 合并到 main
      git checkout main 2>/dev/null
      git pull origin main --rebase 2>/dev/null || true
      git merge "$FRONTEND_BRANCH" --no-edit 2>/dev/null || true
      git push origin main 2>/dev/null || true
      echo "  ✓ 前端已合并到 main"
      # 切换到下一分支
      git checkout -b "$FE_NEXT_BRANCH" 2>/dev/null || git checkout "$FE_NEXT_BRANCH" 2>/dev/null || true
      git push origin "$FE_NEXT_BRANCH" 2>/dev/null || true
      echo "  ✓ 前端已切换到 ${FE_NEXT_BRANCH}"
    else
      echo "  ✓ 前端版本已记录"
    fi
  else
    echo "  ⚠ 前端分支: ${FRONTEND_BRANCH}（非 daily/x.y.z 格式，跳过）"
  fi

  # --- 后端版本 ---
  BE_VERSION=$(echo "$BACKEND_BRANCH" | sed 's/daily\///' 2>/dev/null || echo '')
  if [ -n "$BE_VERSION" ] && [ "$BE_VERSION" != "main" ] && [ "$BE_VERSION" != "$BACKEND_BRANCH" ]; then
    echo "  后端版本: v${BE_VERSION} (${BACKEND_BRANCH})"
    BE_RESP=$(curl -s -X POST "${API_BASE}/api/version/deploy" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -d '{"side":"backend","note":"部署脚本自动记录"}' 2>/dev/null)
    BE_NEXT=$(echo "$BE_RESP" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$BE_NEXT" ]; then
      IFS='.' read -r MAJOR MINOR PATCH <<< "$BE_NEXT"
      BE_NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"
      cd "$BACKEND_DIR"
      # 合并到 main
      git checkout main 2>/dev/null
      git pull origin main --rebase 2>/dev/null || true
      git merge "$BACKEND_BRANCH" --no-edit 2>/dev/null || true
      git push origin main 2>/dev/null || true
      echo "  ✓ 后端已合并到 main"
      # 切换到下一分支
      git checkout -b "$BE_NEXT_BRANCH" 2>/dev/null || git checkout "$BE_NEXT_BRANCH" 2>/dev/null || true
      git push origin "$BE_NEXT_BRANCH" 2>/dev/null || true
      echo "  ✓ 后端已切换到 ${BE_NEXT_BRANCH}"
    else
      echo "  ✓ 后端版本已记录"
    fi
  else
    echo "   后端分支: ${BACKEND_BRANCH}（非 daily/x.y.z 格式，跳过）"
  fi
fi

echo "  ✓ 版本控制完成"

# ====== 完成 ======
echo ""
echo "============================================"
echo "   部署完成!"
echo "============================================"
echo ""
echo "  前端: http://${SERVER_IP}/"
echo "  API:  http://${SERVER_IP}/api/reservation"
echo "  健康: http://${SERVER_IP}/health"
echo ""
echo "  PM2 管理: ssh root@${SERVER_IP} 'pm2 status'"
echo "  版本管理: http://${SERVER_IP}/ → Admin → 版本控制"
echo "============================================"
