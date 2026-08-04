# 后端数据库字段缺失问题排查技能

## 触发条件

当用户报告以下情况时使用此技能：
- API 接口返回 500 Internal Server Error
- 错误日志包含 `ER_BAD_FIELD_ERROR` 或 `Unknown column 'xxx' in 'where clause'`
- 新增功能后接口报错

## 问题根因

代码中的 SQL 查询引用了数据库表中不存在的字段。常见原因：
1. 代码新增了字段引用，但数据库未执行 ALTER TABLE
2. 部署代码时遗漏了数据库迁移
3. 本地开发环境已更新但生产环境未同步

## 排查步骤

### 1. 查看错误日志定位问题

```bash
# SSH 登录服务器后执行
pm2 logs verrra-voile-end --lines 50 --nostream
```

关键错误信息格式：
```
sqlMessage: "Unknown column 'type' in 'where clause'"
sql: "SELECT id FROM verification_codes WHERE phone = ? AND type = 'email' ..."
```

### 2. 确认当前数据库表结构

```bash
mysql -u verra -p'VerraVoile2024!' verra_voile -e "DESCRIBE verification_codes;"
mysql -u verra -p'VerraVoile2024!' verra_voile -e "DESCRIBE users;"
```

### 3. 添加缺失字段

```bash
# 示例：给 verification_codes 添加 type 字段
mysql -u verra -p'VerraVoile2024!' verra_voile -e "ALTER TABLE verification_codes ADD COLUMN type VARCHAR(20) DEFAULT 'sms' COMMENT '验证方式: sms/email' AFTER phone;"

# 示例：给 users 添加 email 字段
mysql -u verra -p'VerraVoile2024!' verra_voile -e "ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE COMMENT '邮箱' AFTER phone;"
```

### 4. 同步更新本地 db.js

确保 `src/db.js` 中的 CREATE TABLE 语句包含新字段，避免新环境部署时遗漏。

### 5. 自查所有 SQL 查询

```bash
# 搜索所有 SQL 语句，逐一核对字段是否存在
grep -rn "SELECT\|INSERT\|UPDATE\|DELETE" src/routes/ src/chat.js
```

### 6. 部署修复

```bash
# 上传修改后的文件
scp src/db.js root@47.99.138.250:/var/www/verra-voile-end/src/
scp src/routes/xxx.js root@47.99.138.250:/var/www/verra-voile-end/src/routes/

# 重启服务
ssh root@47.99.138.250 "pm2 restart verrra-voile-end"
```

### 7. 验证修复

```bash
# 测试接口
curl -s -X POST https://www.europewedding.cn/api/auth/login-by-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
# 应返回业务错误而非 500
```

## 当前数据库表结构

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| phone | VARCHAR(20) UNIQUE | 手机号 |
| email | VARCHAR(255) UNIQUE | 邮箱 |
| password | VARCHAR(255) | 密码（bcrypt） |
| created_at | TIMESTAMP | 创建时间 |

### verification_codes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| phone | VARCHAR(255) | 手机号或邮箱 |
| code | VARCHAR(6) | 验证码 |
| type | VARCHAR(20) DEFAULT 'sms' | 验证方式: sms/email |
| used | TINYINT(1) DEFAULT 0 | 是否已使用 |
| expires_at | TIMESTAMP | 过期时间 |
| created_at | TIMESTAMP | 创建时间 |

### messages 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| user_id | INT | 用户ID |
| sender_type | ENUM('user','admin') | 发送方 |
| content | TEXT | 消息内容 |
| is_read | TINYINT(1) DEFAULT 0 | 是否已读 |
| created_at | TIMESTAMP | 创建时间 |

## 预防措施

1. **代码审查时检查 SQL**：新增字段引用时确认 db.js 已定义
2. **部署清单**：代码部署后检查是否需要数据库迁移
3. **统一字段命名**：phone 字段同时存储手机号和邮箱，考虑重命名为 account

## 服务器连接信息

- IP: 47.99.138.250
- SSH 用户: root
- SSH 密码: TongWei131700
- 数据库用户: verra
- 数据库密码: VerraVoile2024!
- 数据库名: verra_voile
- PM2 进程名: verrra-voile-end（注意是3个r）
