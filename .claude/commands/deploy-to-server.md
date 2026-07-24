# Deploy to Server

Build the project and deploy `dist/` to a remote server via SCP + Nginx.

## Trigger

Use this skill when the user says:
- "部署到服务器"
- "把构建文件发布到线上"
- "deploy to server"

## Saved Server

- **Server IP**: `47.99.138.250`
- **SSH User**: `root`
- **Remote Path**: `/var/www/verra-voile`
- **Dist Path**: `./dist`

## Parameters

- `$ARGUMENTS` — optional, can override `dist-path` or `remote-path`.

## Steps

### 1. Confirm deployment target and collect password

Tell the user:
> 即将构建并部署到服务器 **47.99.138.250**（`/var/www/verra-voile`），请输入 SSH 密码：

Use `AskUserQuestion` to ask the user for the **SSH password** only.
Display the target server info (IP, user, remote path) so the user knows where it's deploying.

If the user wants to deploy to a different server, allow them to provide a new IP via the "Other" option.

### 2. Build the project

Always run a fresh build before deploying, regardless of whether `dist/` already exists:

```bash
cd <project-root> && npm run build
```

Wait for the build to complete and verify `dist/` contains `index.html` and `assets/`.

### 3. Ensure remote directory exists

```bash
expect << 'EXPECT_EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no <ssh-user>@<server-ip> {mkdir -p <remote-path>}
expect {
    "password:" {
        send "<password>\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 4. Upload files via SCP

Use `expect` to handle password authentication (since `sshpass` may not be installed):

```bash
expect << 'EXPECT_EOF'
set timeout 120
spawn scp -r -o StrictHostKeyChecking=no <dist-path>/index.html <dist-path>/assets <ssh-user>@<server-ip>:<remote-path>/
expect {
    "password:" {
        send "<password>\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 5. Ensure Nginx is installed and running

```bash
expect << 'EXPECT_EOF'
set timeout 180
spawn ssh -o StrictHostKeyChecking=no <ssh-user>@<server-ip> {
    which nginx || (apt-get update -qq && apt-get install -y -qq nginx)
    systemctl enable nginx
    systemctl start nginx
}
expect {
    "password:" {
        send "<password>\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 6. Configure Nginx for SPA routing

Update `try_files` so all routes fall back to `index.html` (essential for SPA apps):

```bash
expect << 'EXPECT_EOF'
set timeout 30
spawn ssh -o StrictHostKeyChecking=no <ssh-user>@<server-ip> {
    sed -i 's|try_files $uri $uri/ =404;|try_files $uri $uri/ /index.html;|' /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx && echo DONE
}
expect {
    "password:" {
        send "<password>\r"
        exp_continue
    }
    eof
}
EXPECT_EOF
```

### 7. Verify deployment

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nSize: %{size_download} bytes\n" http://<server-ip>/
```

Confirm HTTP 200 and report the access URL to the user.

### 8. Git 版本控制（部署完成后执行）

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
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_VERSION=$(echo "$CURRENT_BRANCH" | sed 's/daily\///')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
NEXT_BRANCH="daily/${MAJOR}.${MINOR}.$((PATCH + 1))"

# 4. 创建并切换到下一版本分支
git checkout -b $NEXT_BRANCH
git push origin $NEXT_BRANCH
```

**分支命名规范**: `daily/x.y.z`

## Output

After successful deployment, report:
- Build status (success/fail)
- Access URL: `http://<server-ip>/`
- HTTP status code
- List of deployed files and sizes
