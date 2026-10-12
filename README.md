# 精选 Skill 目录

Cockpit 助手的在线资源目录，提供中文用途、完整安装使用说明、调用提示词、结果检查和来源依据。

当前共 49 项：40 项精选资源，9 项免费条件待确认；全部实际来源仓库至少 5000 GitHub Star。39 项许可允许下载，其余提供来源入口。

[目录 JSON](catalog/skills.json) · [收录规则](SELECTION-POLICY.md) · [本次来源核对及移除清单](catalog/selection-audit.json)

2026-10-12 已取消旧条目的低 Star 保留例外，移除 24 项（23 项低 Star 标准 Skill 和 1 项无实际来源仓库的本地提示词）。Blender 系列和图片转可编辑分层 PSD 等低 Star 来源已移出精选；已加入个人库的副本完整保留。后续新增、维护和发布均执行全量 5000 Star 门槛。

保留资源的必要关联 Skills、脚本、素材与许可证仍完整提供。Star 代表来源仓库关注度，不代表单条 Skill 的使用量、下载量或效果保证。免费条件与许可限制继续单独标明。

客户端每天检查一次，也可在 Skill 管理中手动检查更新。新版客户端会清除不符合门槛的旧目录记录，不影响个人资源。旧安装包不含此次缓存合并优化，更新应用后才完整应用该逻辑。

发布前运行 node scripts/validate-catalog.cjs；重新核对所有来源及预览清理用 node scripts/prune-skill-catalog.cjs，确认后用 --apply 更新。维护仅处理公开目录，不访问用户个人数据。
