---
name: setup-https
description: 为服务器配置 Let's Encrypt HTTPS 证书，自动安装 certbot、更新 Nginx 配置、签发 SSL 证书并验证。当用户说"配置 HTTPS"、"申请 SSL 证书"、"setup https"、"启用加密"、"Let's Encrypt"时触发。
---

# Setup HTTPS with Let's Encrypt

为 Nginx 服务器配置 HTTPS 证书，支持自动续期。

## 前置条件

- 服务器已安装 Nginx
- 域名 A 记录已指向服务器 IP（裸域 `@` 和 `www` 都需要）
- 用户提供：服务器 IP、域名、SSH 密码

## 参数收集

使用 AskUserQuestion 收集：

1. **服务器 IP**（如已有记忆则跳过）
2. **域名**（如 `europewedding.cn`）
3. **SSH 密码**

## 执行步骤

### Step 1: 验证 DNS 解析

```bash
dig @8.8.8.8 <domain> A +short
dig @8.8.8.8 www.<domain> A +short
```

两个都必须返回服务器 IP，否则提示用户先去域名注册商添加 A 记录。

### Step 2: 检查 Nginx 配置

通过 expect 脚本 SSH 连接服务器，查看当前 Nginx 配置：

```bash
expect << 'EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no root@<server-ip>
expect "password:" { send "<password>\r" }
expect "# "
send "ls /etc/nginx/sites-enabled/\r"
expect "# "
send "cat /etc/nginx/sites-enabled/<config-name>\r"
expect "# "
send "exit\r"
expect eof
EOF
```

### Step 3: 更新 server_name

如果 `server_name` 中没有域名，需要更新：

```bash
sed -i 's/server_name <old>;/server_name <domain> www.<domain> <old>;/' /etc/nginx/sites-enabled/<config>
nginx -t && systemctl reload nginx
```

### Step 4: 安装 certbot

**注意**：先临时移除有 GPG 问题的 apt 源，避免安装失败。

```bash
# 备份可能有问题的源
mv /etc/apt/sources.list.d/docker-ce.list /etc/apt/sources.list.d/docker-ce.list.bak 2>/dev/null

# 安装 certbot
apt-get update -qq && apt-get install -y certbot python3-certbot-nginx

# 恢复源
mv /etc/apt/sources.list.d/docker-ce.list.bak /etc/apt/sources.list.d/docker-ce.list 2>/dev/null
```

### Step 5: 签发证书

```bash
certbot --nginx -d <domain> -d www.<domain> \
  --non-interactive --agree-tos --email admin@<domain>
```

成功后输出：
- 证书路径：`/etc/letsencrypt/live/<domain>/fullchain.pem`
- 密钥路径：`/etc/letsencrypt/live/<domain>/privkey.pem`
- 证书有效期：90 天，certbot 自动配置续期任务

### Step 6: 验证 HTTPS

```bash
curl -sI https://<domain> | head -5
```

应返回 `HTTP/1.1 200 OK`。

## expect 脚本模板

所有 SSH 操作使用 expect 处理密码认证：

```bash
expect << 'EOF'
set timeout 120
spawn ssh -o StrictHostKeyChecking=no root@<server-ip>
expect {
    "password:" { send "<password>\r" }
    timeout { puts "TIMEOUT"; exit 1 }
}
expect "# "
send "<command>\r"
expect "# "
send "exit\r"
expect eof
EOF
```

## 常见问题

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `no valid A records found` | 域名未解析 | 添加 A 记录指向服务器 IP |
| `certbot not found` | 未安装 | `apt install certbot python3-certbot-nginx` |
| `apt-get install` 失败 | apt 源 GPG 错误 | 临时移除问题源后重试 |
| PTY 资源耗尽 | expect 进程过多 | 等待后重试，或清理残留进程 |

## 完成后报告

- HTTPS 访问地址
- 证书到期时间
- 自动续期状态
