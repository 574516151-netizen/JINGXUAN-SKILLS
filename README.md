# 精选 Skill 目录

Cockpit 助手的在线资源目录，提供中文用途、完整安装使用说明、调用提示词、结果检查和来源依据。

新版目录共 90 项：80 项精选资源，10 项免费条件待确认；全部实际来源仓库至少 5000 GitHub Star。79 项许可允许下载，11 项提供来源入口。

[新版目录 JSON](catalog/skills-v2.json) · [旧版兼容目录](catalog/skills.json) · [收录规则](SELECTION-POLICY.md) · [扩充核对记录](catalog/expansion-audit.json) · [来源核对及移除清单](catalog/selection-audit.json)

2026-10-13 新增 41 项，涵盖 Three.js 材质、天空、水体和漫游，UI 规范、加载和滚动动效、网页审查、参考提取，SVG 插画、数据分析、办公和开发工作流。40 项允许下载，按固定来源的入口与递归引用保留必需 Skills、脚本、配置和资料，已在隔离库完成加入、导出、解包与原始文件字节对比。Figma 官方设计系统采用特殊条款，未确认再分发许可和服务免费范围，仅保留官方来源安装入口，归入免费条件待确认。现有写作计划和执行计划工作流补齐原文明示的 brainstorming 配套。

新版采用 schemaVersion 2 和 skills-v2.json，需要更新应用代码中的引用解析器和内置双语说明。v1.0.37 及以前客户端仍读取 skills.json 的 49 项兼容目录，避免旧下载器误判新精简范围。旧目录本轮不增加新条目，不覆盖用户个人资源；本轮没有生成新安装包。

2026-10-12 已取消旧条目的低 Star 保留例外，移除 24 项（23 项低 Star 标准 Skill 和 1 项无实际来源仓库的本地提示词）。Blender 系列和图片转可编辑分层 PSD 等低 Star 来源已移出精选；已加入个人库的副本完整保留。后续新增、维护和发布均执行全量 5000 Star 门槛。

保留资源的必要关联 Skills、脚本、素材与许可证仍完整提供。Star 代表来源仓库关注度，不代表单条 Skill 的使用量、下载量或效果保证。免费条件与许可限制继续单独标明。

客户端每天检查一次，也可在 Skill 管理中手动检查更新。新版客户端会清除不符合门槛的旧目录记录，不影响个人资源。旧安装包不含此次缓存合并优化，更新应用后才完整应用该逻辑。

发布前运行 node scripts/validate-catalog.cjs，同时验证新版和旧版目录。重新核对来源及预览清理用 node scripts/prune-skill-catalog.cjs，默认处理新版 skills-v2.json；追加 --legacy 处理旧版，追加 --apply 才写入对应目录及核对记录。新增配套或解析规则改变时，先在应用项目完成下载导出检查，再同步新版；两份目录都执行 5000 Star 门槛。维护仅处理公开目录，不访问用户个人数据。


2026-10-14 新增独立[专项推荐目录](catalog/specialist-skills.json)，与两份严格精选源分开。首套 Blender 完整建模与渲染工作流提供 30 个配套 Skills、120 个必需文件及五类场景提示词，来源 Star 90。商品样例通过 Blender 5.2 MCP 分阶段执行、两视角渲染及工程/模型回读；自动发现、其他场景和版本未验证。参见[专项规则](SPECIALIST-POLICY.md)及[样例记录](https://github.com/574516151-netizen/QDZS/blob/main/docs/verification/blender-workflow/README.md)。既有 90 项严格精选仍全部 ≥5000 Star，49 项旧版兼容源保持；新客户端才显示专项入口。

发布前另运行 `node scripts/validate-specialist-catalog.cjs` 和 `node tests/specialist-catalog.cjs`。专项文件、校验和缓存独立，主目录维护与清理不处理它；来源提交或入口哈希变化后不得沿用旧样例记录。
