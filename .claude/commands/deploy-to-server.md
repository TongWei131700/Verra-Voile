# Deploy to Server

Deploy a static build directory (e.g. `dist/`) to a remote server via SCP + Nginx.

## Trigger

Use this skill when the user says:
- "部署 dist 到服务器"
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
> 即将部署到服务器 **47.99.138.250**（`/var/www/html`），请输入 SSH 密码进行确认：

Use `AskUserQuestion` to ask the user for the **SSH password** only.
Display the target server info (IP, user, remote path) so the user knows where it's deploying.

If the user wants to deploy to a different server, allow them to provide a new IP via the "Other" option.

### 2. Verify local dist directory

```bash
ls -la <dist-path>/
```

Confirm the directory exists and contains build artifacts (e.g. `index.html`, `assets/`).

### 3. Upload files via SCP

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

If the remote directory doesn't exist, create it first:

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

### 4. Ensure Nginx is installed and running

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

### 5. Configure Nginx for SPA routing

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

### 6. Verify deployment

```bash
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nSize: %{size_download} bytes\n" http://<server-ip>/
```

Confirm HTTP 200 and report the access URL to the user.

## Output

After successful deployment, report:
- Access URL: `http://<server-ip>/`
- HTTP status code
- List of deployed files and sizes
