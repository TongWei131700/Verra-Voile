# 数据库与文件系统破坏性操作安全规范

## 背景

本规范源于一次灾难性数据丢失事故：用户仅要求删除两张照片（cns-019.jpg 和 cns-017.jpg），但因上下文误读，AI 将后续消息误判为新的删除指令，连锁执行了约 20 个场地的 `DELETE FROM crawled_venues` 和 `rm -rf` 操作，导致数据库从约 30 条记录降至 9 条，20 个图片目录被永久删除。

## 核心原则

**任何破坏性操作（DELETE / DROP / TRUNCATE / rm -rf）都是不可逆的。执行前必须完成以下全部步骤，缺一不可。**

---

## 第一步：复述并确认用户意图

在执行任何删除操作之前，必须向用户明确复述操作内容和范围：

```
确认模板：

"您要求执行以下操作：
- 操作类型：[删除文件 / 删除数据库记录 / 删除整个场地]
- 目标：[具体文件名 / slug / 表名]
- 影响范围：[X 个文件 / X 条记录]

⚠️ 此操作不可逆，执行后无法恢复。

请确认是否继续？(是/否)"
```

**只有用户明确回复"是"后才可执行。绝不允许假设用户意图。**

---

## 第二步：自动备份目标数据

### 数据库备份

在执行 DELETE 之前，先将目标数据导出备份：

```bash
# 备份单条记录
mysqldump -u root verra_voile crawled_venues --where="slug='目标slug'" > /tmp/backup_目标slug_$(date +%Y%m%d_%H%M%S).sql

# 备份整张表（推荐定期执行）
mysqldump -u root verra_voile crawled_venues > /tmp/backup_crawled_venues_$(date +%Y%m%d_%H%M%S).sql
```

### 文件备份

在删除文件之前，先确认文件存在并记录清单：

```bash
# 列出即将删除的文件（先看不删）
ls -la /path/to/target/files/

# 如果需要备份
cp -r /path/to/target/files/ /tmp/backup_files_$(date +%Y%m%d_%H%M%S)/
```

---

## 第三步：最小范围执行

- **只删除用户明确指定的内容**，不扩大范围
- 删除文件 ≠ 删除数据库记录 ≠ 删除整个场地
- 如果用户说"删两张照片"，就只删两张照片，不动数据库
- 如果用户说"删数据库记录"，就只删记录，不动图片文件（除非用户明确要求）

---

## 第四步：执行后验证

操作完成后立即验证：

```bash
# 数据库验证
node -e "const mysql=require('mysql2/promise'); (async()=>{ const c=await mysql.createConnection({host:'localhost',user:'root',password:'',database:'verra_voile'}); const [r]=await c.query('SELECT COUNT(*) as cnt FROM crawled_venues'); console.log('当前记录数:', r[0].cnt); await c.end(); })()"

# 文件验证
ls /path/to/directory/ | wc -l
```

向用户报告操作结果。

---

## 定期自动备份机制

### 每日全量备份（推荐）

创建 cron job 或手动定期执行：

```bash
# 全量数据库备份
mysqldump -u root verra_voile > /Users/hongli/WorkSpace/Verra-Voile-End/backups/db_$(date +%Y%m%d).sql

# 确保 backups 目录存在
mkdir -p /Users/hongli/WorkSpace/Verra-Voile-End/backups/
```

### 操作前快照（强制）

每次执行批量数据操作（爬取入库、批量更新等）前，自动执行一次全量备份：

```javascript
// 操作前备份伪代码
async function safeDatabaseOperation(operation) {
  // 1. 备份
  await exec(`mysqldump -u root verra_voile > /tmp/pre_operation_backup_${Date.now()}.sql`);
  
  // 2. 执行操作
  try {
    await operation();
  } catch (error) {
    // 3. 失败时提示用户可从备份恢复
    console.error('操作失败，可从备份文件恢复:', backupPath);
    throw error;
  }
}
```

---

## 软删除策略（长期改进）

对于 `crawled_venues` 表，建议添加软删除字段：

```sql
ALTER TABLE crawled_venues ADD COLUMN is_deleted TINYINT(1) DEFAULT 0;
ALTER TABLE crawled_venues ADD COLUMN deleted_at TIMESTAMP NULL;
```

- 删除操作改为 `UPDATE crawled_venues SET is_deleted=1, deleted_at=NOW() WHERE slug=?`
- 查询时加 `WHERE is_deleted=0`
- 30 天后由清理脚本真正删除
- 用户可随时恢复误删数据

---

## 绝对禁止的行为

1. **禁止在没有用户明确确认的情况下执行 DELETE FROM**
2. **禁止在没有备份的情况下执行 rm -rf**
3. **禁止将对话历史中的 URL 或截图引用误判为新的操作指令**
4. **禁止在一条消息中同时执行多个不同场地的删除操作**
5. **禁止将"删除图片"理解为"删除整个场地"**

---

## 事故复盘清单

当发生数据丢失时，按以下顺序处理：

1. **立即停止所有操作**
2. **评估损失**：查询当前数据库记录数、检查文件目录状态
3. **检查备份**：查看是否有可用的 mysqldump 备份文件
4. **检查生产服务器**：API 是否还有数据、图片是否还能下载
5. **制定恢复计划**：从备份恢复 / 从生产服务器同步 / 重新爬取
6. **执行恢复**：按优先级逐步恢复
7. **验证恢复结果**：确认数据完整性和图片可访问性

---

## 总结

**删除操作必须显式确认范围。宁可多问十句，不可少问一句。**

用户说"删两张照片" → 只删两张照片文件 + 更新 gallery_images 数组
用户说"删这个场地" → 先备份数据库记录 → 再确认是否同时删图片 → 用户确认 → 执行
用户说"清空数据库" → 先全量备份 → 三次确认 → 执行

**永远假设用户可能改变主意，永远保留回退的可能。**
