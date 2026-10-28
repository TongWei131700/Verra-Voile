# 项目技能目录

技能唯一来源为 `.agents/skills/<技能名>/SKILL.md`，`.qoder/skills` 是指向同一目录的兼容链接。新技能不再放入 `mySkills`，也不安装到全局。

布局参考 [OpenAI 官方说明](https://developers.openai.com/blog/skills-agents-sdk)。

| 技能 | 入口 |
| --- | --- |
| card-reveal-animation | [SKILL.md](.agents/skills/card-reveal-animation/SKILL.md) |
| deploy-frontend | [SKILL.md](.agents/skills/deploy-frontend/SKILL.md) |
| wedding-expense-parser | [SKILL.md](.agents/skills/wedding-expense-parser/SKILL.md) |

## 项目归属

- 前端页面及 SSG 部署：`../Verra-Voile/.agents/skills/`。
- 后端、数据采集、数据库及服务器：`../Verra-Voile-End/.agents/skills/`。
- 小红书全部技能：`../Xiaohongshu-Studio/.agents/skills/`，原项目不保留技能入口。

## 迁移记录

- 完整备份：`/private/tmp/verra-skills-20261023-222837/before.tar.gz`，仅本机保存。
- 重复的前端 deploy-backend 从活动目录移除，以后端版本为准；旧版保存在备份中。
- 补齐缺失的技能元数据，修正小红书迁移路径；没有重写原工作流程。
- 部署说明仍含历史配置，执行时需核对实际环境。本次未部署或操作数据库。
