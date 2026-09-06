# RehabMind 整改测试执行报告

最终执行时间：2026-08-27 18:32（Asia/Shanghai）
执行口径：以《回归测试总表》为主任务单，并对照测试会话交接文档、真实浏览器覆盖矩阵、产品主规范和决策引擎规范。
当前验证提交：`049a21c3b02a0990c0c3212d2615c96019bb82cb`
本次开发修复链：`a5774ec`、`41b5032`、`e638887`、`eb1a216`、`39f40c1`、`5a455d6`、`f42a7d4`、`f191976`、`bebfb4a`、`8a05742`、`8d62214`、`3764e5d`、`36687e2`、`049a21c`（含前序 `b60f68a`、`ab218d4`、`66c5675`、`0728f82`）
当前 QA buildId：`local-049a21c3b02a-dirty-584c11ea5025`
snapshot schema：`2`

工作树当前包含 QA 测试合同/巡检脚本、文档和生成 release 文件；开发生产源码已提交。浏览器证据最初曾使用不一致的全长 commit 值，已全部用本地实际 commit 重新绑定；当前报告只计入重新生成的 manifest/trace/快照。

## 一、最终结论

本轮针对 `a5774ec`～`049a21c` 开发链重新验证：T-09 四档真实快照、双侧低负荷 gate、双侧完整纵向评估/处理/复测、历史投影、network/timeout/storage、处理后改善/无变化/加重、训练后加重锁定，以及 session 2 反馈/管理员/清理均通过。没有修改生产规则，也没有用放宽 schema 或删除断言制造通过；测试侧只维护测试合同、真实页面场景和证据脚本。

最新完整 Edge 套件 48/48、整体闭环 20/20、Edge release 5/5，均无 skipped/failed；E2E-04 最终定向 1/1。Pixel 5/iPhone 13 2/2、Firefox 高风险 1/1、固定 seed 探索 1/1 均在同一 buildId 上重跑。E2E-01～15 业务闭环均已收口；Android M2～M5 仍属于环境未覆盖。

## 二、定向回归

| 缺陷/范围 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| TEST-2b | `node --test tests/integration/sqlite-api/real-snapshot-recovery.integration.mjs` | 2/2 passed | 命令输出；同一测试在 `npm run test:integration` 中再次通过；5a 为 hook 依赖变更，功能链保持 |
| E2E-04 双侧完整纵向流程 | `run-browser-tests.mjs` + `safety-bilateral-and-unable.spec.ts --grep "双侧按优先侧" --trace on` | 1/1 passed；服务日志无 `INV-WORKFLOW-STAGE-BYPASS` | `artifacts/quality/playwright/target-final-049a21c`；`trace.zip`；`assessment-completed-readback.json` |
| T-09 / bilateral gate / history / save faults | `npm run test:browser:overall` | 5/5 passed | `artifacts/quality/playwright/overall-final-049a21c` |
| E2E-03/E2E-05/E2E-06 | 同上 | 3/3 passed | E2E-06 四类真实可见原因均通过 |
| E2E-07～10 | 同上 | 4/4 passed | 改善、无变化、处理加重、训练加重均通过 |
| E2E-13～15 | 同上 | 3/3 passed | session 2 反馈绑定、管理员脱敏和 runId 隔离清理均通过 |
| 受影响逻辑/数据回归 | `npm run test:logic:retest`、`npm run test:logic:ledger`、`npm run test:vertical`、`npm run test:security`、`npm run test:sqlite:health`、`npm run test:migrations:compat` | 34/34、39/39、2/2、13/13；health/migration 通过 | 命令输出，绑定当前 commit/buildId |
| Edge release | 最终 release 命令 | 5/5 passed | `release-final-049a21c-584c11ea-20260827` |
| 整体闭环 | 最终 overall 命令 | 20/20 passed | `overall-final-049a21c-584c11ea-20260827` |
| TEST-03 / 全量 Edge | 最终 full 命令 | 48/48 passed | `full-final-049a21c-584c11ea-20260827` |
| TEST-10 移动预览 | 最终 mobile-preview 命令 | Pixel 5/Chromium、iPhone 13/WebKit 各 1/1 | `mobile-final-049a21c-584c11ea-20260827` |
| TEST-10 Firefox 高风险 | 最终 firefox-risk 命令 | 1/1 passed | `firefox-final-049a21c-584c11ea-20260827` |
| INSPECT-ENTRY-GATE-01 / 本地巡检 | `node scripts/quality/inspect-local.mjs http://localhost:3000 --visual --axe` | 42/42 passed；320px 差异 0.34% | `artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md` |

## 三、完整测试与质量门禁

| 测试层 | 命令 | 结果 |
| --- | --- | --- |
| 完整真实浏览器 | 最终 full 命令 | 48/48 passed，无 skipped/failed |
| 快速门禁 | `npm run test:fast` | 通过：architecture boundaries、typecheck、build、137 个 Node 测试文件全部通过 |
| 构建 | 当前 commit 的 `npm run build` | 通过；buildId=`local-049a21c3b02a-dirty-584c11ea5025` |
| lint | `npm run lint` | 0 error、2 个 Hook warning |
| 巡检 | `node scripts/quality/inspect-local.mjs http://localhost:3000 --visual --axe` | 320/360/390/412/430/1440px 全部通过；HTTP/API、运行时、布局、遮挡、axe、视觉均通过 |

完整浏览器证据：`artifacts/quality/playwright/full-final-049a21c`；本轮浏览器 manifest 均绑定当前本地 commit/buildId。

## 四、已修复的实现要点

- 入口闸门在匿名建案成功后按状态关闭，刷新后不残留遮罩，入口巡检可以继续。
- 教程的完成/跳过状态与重新打开动作分离，首页入口能够重新打开聚焦教程；关键 CTA 通过最小尺寸约束。
- 身体图把“主要大部位”和具体左右标记分开保存，切换区域不会静默丢掉旧标记，清理行为必须由用户主动确认。
- 本机草稿使用 tab 身份、版本信号和草稿指纹做跨标签页检测；发现交错修改时显示冲突操作，让用户重新加载或保留当前内容。
- 多个功能动作按独立身份进入评估队列，排序不会丢掉第二个及后续功能动作；处理/复测仍按动作身份隔离。
- 固定 `eventId` 的完全重放复用原事件时间和成功结果，不新增 revision 或重复事件。
- v1 历史迁移以及 v2 新建/归档补建路径统一省略空的 `regionId`、`location` 等可选字段，不放宽 v2 schema；真实快照恢复 2/2、全量集成 17/17。
- `bilateral-longitudinal` 以真实膝伸活动度项完成左右分别评估、优先右侧处理和左右分别复测；阶段事件使用当下快照和同版投影，服务端不再产生虚假的阶段绕过告警。

## 五、当前阻塞与明确保留的非阻塞范围

开发会话已交付至 `049a21c`，当前 QA 已按最终 HEAD 重新生成统一 buildId 的浏览器证据。

当前整体与 full 已无 skipped，E2E-01～15 均已收口。Pixel 5/iPhone 13 仍属于移动预览，不等同于 Android 真机 APK 全量验证，M2～M5 本轮仍无环境/产物证据。

## 六、历史失败记录

此前 `66c5675` 之前的 `TEST-2b` 空可选字段失败，以及 `f42a7d4`/`f191976` 修复前的无变化误报和训练加重未锁定，均为历史失败，不能与当前 build 混用。最终 inspect-local 首跑出现 360px 3.01% 瞬态差异，立即复跑归零，不登记为产品缺陷。
