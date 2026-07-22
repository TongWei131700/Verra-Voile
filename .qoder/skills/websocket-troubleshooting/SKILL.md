---
name: websocket-troubleshooting
description: WebSocket 配置排查与最佳实践指南。当 WebSocket 连接失败、显示"连接中"、Nginx 代理问题、socket.io 配置错误时使用此技能快速定位问题。
---

# WebSocket 配置排查指南

## 快速诊断清单

当 WebSocket 连接出现问题时，按以下顺序检查：

```
排查步骤：
- [ ] 1. 后端 WebSocket 服务是否启动？
- [ ] 2. Nginx 是否配置了 WebSocket 代理？
- [ ] 3. 生产域名配置是否包含 WebSocket？
- [ ] 4. 前端连接地址是否正确？
- [ ] 5. 防火墙/安全组是否放行？
```

## 常见错误与解决方案

### 错误 1：前端显示"连接中..."但后端正常

**症状**：
- 后端日志显示 WebSocket 服务已启动
- 前端一直显示"连接中"或"连接失败"
- Nginx access.log 显示 `/socket.io/` 请求返回 200 但内容是 HTML

**原因**：Nginx 配置缺少 WebSocket 代理，请求被当作普通 HTTP 处理

**解决方案**：
```nginx
# ❌ 错误配置（缺少 WebSocket 代理）
server {
    listen 443 ssl;
    server_name example.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
    }
}

# ✅ 正确配置
server {
    listen 443 ssl;
    server_name example.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # 必须单独配置 WebSocket 路径
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 错误 2：多域名配置遗漏

**症状**：
- IP 直接访问正常，域名访问异常
- 开发环境正常，生产环境异常

**原因**：Nginx 有多个 server block，只配置了其中一个

**排查命令**：
```bash
# 查看所有 Nginx 配置
ls -la /etc/nginx/sites-enabled/

# 搜索包含域名的配置
grep -r "your-domain.com" /etc/nginx/

# 检查所有配置文件
nginx -t
```

**解决方案**：确保所有域名的配置都包含 WebSocket 代理

### 错误 3：WebSocket 升级头缺失

**症状**：
- 连接建立后立即断开
- 错误信息：`WebSocket connection failed`

**原因**：缺少必要的 HTTP 升级头

**必须包含的头信息**：
```nginx
proxy_http_version 1.1;                    # WebSocket 需要 HTTP/1.1
proxy_set_header Upgrade $http_upgrade;    # 升级协议
proxy_set_header Connection "upgrade";     # 升级连接
proxy_set_header Host $host;               # 保持主机名
```

## 排查命令速查

### 后端检查
```bash
# 查看后端日志
pm2 logs your-app-name --lines 50

# 检查端口占用
lsof -i:3000

# 测试后端健康检查
curl http://localhost:3000/health
```

### Nginx 检查
```bash
# 测试配置语法
nginx -t

# 重新加载配置
systemctl reload nginx

# 查看 WebSocket 请求日志
tail -f /var/log/nginx/access.log | grep "socket.io"

# 查看错误日志
tail -f /var/log/nginx/error.log | grep -i "websocket\|upgrade"
```

### 前端检查
```bash
# 浏览器控制台检查
# 1. 打开 DevTools → Network → WS
# 2. 查看 WebSocket 连接状态
# 3. 检查请求 URL 是否正确
```

## 本项目配置参考

### 后端服务
- **路径**：`/var/www/verra-voile-end`
- **端口**：3000
- **进程管理**：PM2（进程名：`verrra-voile-end`）
- **WebSocket 路径**：`/socket.io`

### Nginx 配置
```nginx
# 生产域名配置（HTTPS）
server {
    listen 443 ssl;
    server_name europewedding.cn www.europewedding.cn;
    
    # 前端静态文件
    location / {
        root /var/www/verra-voile;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket 代理（关键！）
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 前端连接代码
```typescript
import { io } from 'socket.io-client'

// 自动连接当前域名
const socket = io({
  auth: { token: localStorage.getItem('token') }
})

// 监听连接状态
socket.on('connect', () => {
  console.log('WebSocket 已连接')
})

socket.on('connect_error', (err) => {
  console.error('WebSocket 连接失败:', err.message)
})
```

## 部署后必查项

每次部署后，务必检查：

1. **后端服务状态**
   ```bash
   pm2 status
   pm2 logs your-app --lines 10
   ```

2. **Nginx 配置完整性**
   ```bash
   # 确认所有域名配置都包含 WebSocket
   grep -A 5 "socket.io" /etc/nginx/sites-enabled/*
   ```

3. **WebSocket 连通性**
   ```bash
   # 测试本地 WebSocket
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3000/socket.io/
   
   # 测试生产 WebSocket
   curl -i -N https://your-domain.com/socket.io/?EIO=4&transport=polling
   ```

4. **浏览器控制台**
   - 打开 DevTools → Console
   - 查看是否有 WebSocket 连接错误
   - 检查 Network → WS 标签页

## 常见陷阱

### ❌ 陷阱 1：只配置了 /api 代理
```nginx
# 错误：以为 /api 会匹配所有路径
location /api/ {
    proxy_pass http://localhost:3000;
}
```
**真相**：`/socket.io` 不会被 `/api/` 匹配，必须单独配置

### ❌ 陷阱 2：多域名只改了一个
```bash
# 错误：只修改了 IP 配置
/etc/nginx/sites-enabled/verra-voile.conf  # IP 访问

# 真相：生产域名在另一个文件
/etc/nginx/sites-enabled/verra-voile       # 域名访问（HTTPS）
```

### ❌ 陷阱 3：Nginx 变量未转义
```bash
# 错误：heredoc 中变量被 shell 展开
cat > config << 'EOF'
proxy_set_header Upgrade $http_upgrade;  # $http_upgrade 被展开为空
EOF

# 正确：使用单引号或转义
cat > config << 'EOF'
proxy_set_header Upgrade \$http_upgrade;
EOF
```

## 快速修复脚本

```bash
#!/bin/bash
# WebSocket 快速诊断脚本

echo "=== 1. 检查后端服务 ==="
pm2 status | grep your-app-name

echo -e "\n=== 2. 检查端口占用 ==="
lsof -i:3000

echo -e "\n=== 3. 检查 Nginx 配置 ==="
nginx -t

echo -e "\n=== 4. 检查 WebSocket 配置 ==="
grep -A 5 "socket.io" /etc/nginx/sites-enabled/*

echo -e "\n=== 5. 测试后端连通性 ==="
curl -s http://localhost:3000/health

echo -e "\n=== 6. 查看最近错误日志 ==="
pm2 logs your-app-name --lines 20 --nostream | grep -i "error\|websocket"
```

## 总结

WebSocket 配置三大要点：
1. **后端必须启动**：PM2 管理，端口未被占用
2. **Nginx 必须代理**：`/socket.io` 路径单独配置，包含 Upgrade 头
3. **所有域名都要配置**：IP、HTTP、HTTPS 每个 server block 都要检查

记住：**看到"连接中"，先查 Nginx WebSocket 配置！**
