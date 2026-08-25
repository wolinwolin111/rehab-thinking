# `scripts` 目录导航

脚本已按运行职责分类。正式命令只引用下表中的新路径；仓库根目录不再放运行脚本。

## 当前分类

| 类别 | 内容 | 目录 |
| --- | --- | --- |
| 质量门禁 | 测试发现、边界、循环、结构、变异、资源和证据汇总 | `scripts/quality/` |
| VPS 发布 | 构建身份、打包、canary、激活、HTTP/资源/恢复检查 | `scripts/deploy/` |
| 数据与迁移 | SQLite 健康、migration 兼容、资料构建 | `scripts/data/` |
| 文档与资产 | 文档构建、Markdown 链接、asset manifest | `scripts/docs/` |
| 历史浏览器走读 | 旧场景诊断脚本，不进入正式发布门禁 | `scripts/legacy-browser/` |

## 使用原则

1. 本地入口优先使用 `package.json` 中的命令；VPS 运维入口统一在 `scripts/deploy/`。
2. 当前浏览器正式门禁只运行 `tests/browser/release/` 中带 `@release` 的 4 条场景；其他 Playwright 和 `real-browser-*.mjs` 只保留为历史诊断工具。
3. 脚本产物写入 `.tmp/` 或带当前构建元数据的 `artifacts/quality/`，不再写到仓库根目录。
4. 脚本移动时必须同步修改 `package.json`、测试合同、文档和发布配置，并扫描旧路径。
5. 任何清理脚本默认 dry-run，不删除数据库、备份、密钥或质量证据。
6. `vps-verify-release.sh` 必须通过 `check-deployed-assets.mjs` 校验真实首页引用的 CSS/JS；只检查首页 HTTP 200 不能作为页面可用证据。
