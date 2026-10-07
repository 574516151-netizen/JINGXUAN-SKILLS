# 图片批量压缩：免费本地实测

状态：候选，未通过完整验收。

固定来源版本：`1567581c26ec29f4216c6e6835415bf30343b0e3`。环境：Windows, Node v20.17.0, esbuild TypeScript compilation without semantic edits, local Sharp。测试没有调用收费API。

| 任务 | 结果 |
| --- | --- |
| single-keep | 通过，退出码 0 |
| recursive-batch | 通过，退出码 0 |
| invalid-quality | 通过，退出码 1 |
| corrupt-single | 通过，退出码 1 |
| mixed-batch-must-report-failure | 未通过，退出码 0 |

正常任务产物：1024×768 WebP，17760 字节（输入 2363954 字节）；原PNG保留。该缩减幅度仅针对低复杂度合成渐变图，不代表真实图片表现。

问题：批量目录包含损坏图片时，`--json` 静默跳过失败文件并返回成功，无法可靠判断全部文件是否处理完成。

限制：未验证官方 Bun 启动、复杂照片、透明图、不同系统或全部格式，不标为精选。

记录：[result.json](../artifacts/image-compression/result.json)。
