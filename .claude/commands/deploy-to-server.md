# Deploy to Server

Deploy a static build directory (e.g. `dist/`) to a remote server via SCP + Nginx.

## Trigger

Use this skill when the user says:
- "部署 dist 到服务器"
- "把构建文件发布到线上"
- "deploy to server"

## Parameters

- `$ARGUMENTS` — optional, format: `<dist-path> <server-ip> [ssh-user] [remote-path]`
  - If not provided, prompt the user for these values.

## Steps

### 1. Collect deployment info

If `$ARGUMENTS` is provided, parse it:
- `dist-path`: local directory to deploy (default: `./dist`)
- `server-ip`: remote server IP
- `ssh-user`: SSH username (default: `root`)
- `remote-path`: remote target directory (default: `/var/www/html`)

If any required info is missing, use `AskUserQuestion` to ask the user for:
- Server IP address
- SSH password
- SSH username (default `root`)
- Remote deploy path (default `/var/www/html`)

**IMPORTANT**: Never hardcode credentials in the skill file. Always collect them at runtime.

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
