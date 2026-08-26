# RehabMind 回归测试总表

更新时间：2026-08-27  
适用基线：本轮低层核验为 `fdaee6fc5ca3` + `local-fdaee6fc5ca3-dirty-085a66c496a1`；历史浏览器证据主要来自 a805361，不能与本轮证据相互替代。当前工作树未通过 `test:fast`，本轮没有新增有效浏览器/移动 runId。

## 使用规则

每条缺陷都必须绑定：缺陷编号、复现步骤、修复提交、测试层、应出现结果、禁止出现结果、当前构建、最后验证时间和证据产物。已修复待验证不等于当前构建通过；只有当前构建的真实命令和证据产物齐全，才能改为当前构建已回归。

证据层含义：

- L2/L3：domain/workflow 规则、状态转移、组合和变异；
- L5：SQLite、快照、同步、管理员和安全；
- L6：真实页面可见控件、页面状态和浏览器运行时；
- L6-preview：移动预览，独立于桌面发布门禁；
- L7：部署、健康检查、备份和恢复。

## 当前登记

| 缺陷编号 | 复现步骤 | 修复提交 | 测试层 | 应出现 / 禁止出现 | 当前构建 | 最后验证 | 状态与证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEF-CONSENT-01 | 首次建案时观察同意门；建案完成后检查遮罩；刷新页面 | 4aff9d8、5423d80；测试加固 a805361 | L6 + L5 | 应关闭同意门并保留草稿；禁止遮罩残留、永远创建中或刷新复现 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:38 | 当前构建已回归；`release-20260826183809-12860`、`full-20260826183247-19260` |
| M-01/M-02 | 主诉侧与肿胀/压痛/感觉标记侧不一致；删除一个标记再刷新 | 1dbf5fb、ab3d99a、92fc130 | L2/L3 + L6 | 应保留独立侧别和标记，删除一个不误删另一个；禁止静默改侧或串标记 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前构建已回归；`full-20260826183247-19260` 中 BODY-MAP-UI-01 通过 |
| BODY-MAP-UI-02 | 已有标记后切换主要大部位 | 当前实现待修；测试合同已加入 | L6 | 应保留旧标记并要求显式清理；禁止切换区域静默清空 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 未通过；expected-fail 截图/trace 在 `artifacts/quality/playwright/full/test-results/contracts-score-body-map-*` |
| M-03/M-04 | 外伤原话与选择矛盾；主诉侧与力量较弱侧不一致后查看结果 | ab3d99a；M-04 未提交 | L3 + L6 | 应出现矛盾提示并展示真实较弱侧；禁止吞掉矛盾或固定写“患侧力量偏弱” | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 规则/快速层通过；当前浏览器缺独立 oracle，未判定通过 |
| M-05/M-07 | 修改侧别、完成双侧评估和复测 | d3621ce、92fc130 | L2/L3 + L6 | 应清理失效标记、保留左右结果并选择优先侧；禁止旧标记/旧计划泄漏 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 整体双侧场景 skipped；当前未覆盖 |
| M-06/T-01 | 不形成固定主诉动作；动作选择无法完成并注明原因 | ab3d99a | L2/L3 + L6 | 应进入观察/进一步判断并保留无法完成原因；禁止生成伪造分数或按正常完成 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 规则层有证据；整体页面场景 skipped，当前未覆盖 |
| INT-05/INT-07 | 明确主诉动作；再加入多个功能动作 | 多批次修复 | L2/L3 + L6 | 应先独立检查主诉，再显示独立队列；禁止提前递进或合并动作/分数 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前构建已回归；`full-20260826183247-19260`，P0 与发散路径通过 |
| SAFE-02/SAFE-04/MIX-03 | 急性风险、麻电/感觉变化、疼痛+肿胀+麻电组合 | 多批次修复 | L2/L3 + L6 | 应安全停止或进入专业确认并保留保存出口；禁止继续普通处理/训练 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前构建 P0/Edge 代表场景已回归；急性踝完整闭环仍 skipped |
| T-02/T-10/T-11/RET-06 | 处理后改善、无变化、加重；训练留空反馈或训练后加重 | ab3d99a | L2/L3 + L6 | 应记录真实反应、加重停止并有限退阶；禁止空反馈完成、加重后继续或无限循环 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 规则/部分历史证据；当前整体浏览器场景 skipped，未闭环 |
| RET-02/RET-03 | 两个活动动作分别处理复测；同一物理动作消费最近合法结果 | 多批次修复 | L2/L3 + L5/L6 | 应按动作身份隔离或复用且不新增记录；禁止串用最近结果 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | RET-02 当前 P0 通过；RET-03 仍缺纯用户自然前置 |
| T-03/T-05/T-06/T-07/T-08 | 第二次康复、趋势矛盾、新问题和历史记录 | 3c0dc7d、d3621ce、878a822 | L3 + L5 + L6 | 应追加当前复查、保留历史和新问题；禁止覆盖第一次康复或静默合并趋势 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前整体随访历史场景 skipped，未覆盖 |
| T-09 | 构造保存后 23:59:59、24h、7d 的急性/慢性快照并恢复 | 当前实现已有规则层，浏览器夹具待补 | L2/L3 + L5 + L6 | <24h 无提醒；>=24h 非阻断；急性 >=7d 强提醒并重新确认；慢性只提醒；禁止自动改答案 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | domain/workflow 规则测试通过；浏览器 `test.fixme`，缺 UI 快照夹具 |
| DATA-04/DATA-09/OPS-04 | 断网、超时、保存冲突、错误凭据、管理员读取和脱敏 | 数据/安全批次；当前提交需继续绑定 | L5/L7 + L6 | 应保留本机草稿、拒绝旧 revision、错误可追溯且脱敏；禁止丢数据、覆盖新快照或泄露秘密 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | integration/security/release 通过；多标签页冲突为 expected-fail，管理员/清理整体场景 skipped，部分覆盖 |
| UX-01 | 首次完成/跳过教程；点击首页入口重新打开；检查关键 CTA 尺寸 | a805361 等；当前需开发修复 | L6 | 应可重新打开聚焦教程，关键入口高度≥44、宽度≥96；禁止入口不可用或尺寸不足 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前构建失败 2 项：聚焦教程不能重新打开；“帮我整理”宽 74px。截图/trace 在 `artifacts/quality/playwright/full/test-results/known-defects-ux-*` |
| VISUAL-BASELINE-01 | Edge 桌面首页、评估队列、390px 首页截图比对 | 当前设计基线待确认 | visual | 当前实现应与已批准基线一致；禁止未经确认刷新截图掩盖结构变化 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 3 条视觉基线失败：尺寸/文案/页面高度与旧基线不符；`artifacts/quality/playwright/full/test-results/visual-critical-layout-*` |
| INSPECT-ENTRY-GATE-01 | 390px、1440px 建案后继续视口巡检；观察入口门是否关闭 | 当前实现待修；场景登记 `INSPECT-entry-gate-after-create` | L6 inspect | 应在建案完成后关闭入口门并继续检查；禁止浮层残留导致巡检中断 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:40 | 当前构建失败；`artifacts/quality/inspect-local/2026-08-26T18-40-45-221Z/report.md`，390px 与 1440px 各 1 项 |
| TEST-03 | seed=20260827 驱动真实工作台，仅操作可见控件 | 测试基础设施 | L6 exploration | 应可重放并记录 seed/轨迹；失败需截图、trace、快照；禁止复制简化业务模型 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:32 | 当前构建通过；`full-20260826183247-19260`，脚本成功；失败证据分支已实现 |
| TEST-10 | Pixel 5/Chromium、iPhone 13/WebKit；Firefox 高风险流程 | 测试基础设施 | L6-preview + L6 | 移动预览应独立报告；禁止用 Edge 结果冒充移动通过 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 02:39 | `mobile-preview-20260826183850-23340` 2/2、`firefox-risk-20260826183918-23120` 1/1 通过；当前脚本覆盖仍是预览冒烟，人体图/滑条/保存恢复/安全停止/双侧/加重/总结等专门行为未齐 |
| DATA-REPLAY-01 | 创建案例；保存带固定 `eventId` 的事件；完全重放同一请求 | 待开发修复 | L5 + unit/integration | 应返回原成功结果、revision 不增加、事件不重复；禁止因服务端重新生成 envelope 时间而返回 409 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 03:23 | 当前失败：unit `pilot-case-service.test.mjs:226`、integration `pilot-vertical-flow.integration.mjs:78`；均为 `Event id has already been used for different content`/409；详见 `test-execution-report-2026-08-27.md` |
| BUILD-TYPE-01 | 执行 `npm run test:fast` | 待开发修复 | L0 | 应完成 typecheck/build 并进入后续浏览器门禁；禁止编译错误时产出发布证据 | fdaee6f / `local-fdaee6fc5ca3-dirty-085a66c496a1` | 2026-08-27 03:23 | 当前阻塞：`rehabmind-workbench.tsx:1328`，`SimpleAnswer \| undefined` 不能赋给 `StrengthAnswer`；因此 Edge/mobile/Android 本轮未启动；详见 `test-execution-report-2026-08-27.md` |
| TEST-FIXTURE-MIGRATION-01 | 集成 fixture 应应用当前 drizzle migration 全集后再创建案例 | 测试侧已同步 | L5 test infrastructure | 应包含 0009 clinical event identity；禁止用旧 schema 运行当前 service 造成假失败 | 当前测试改动 | 2026-08-27 03:04 | 已修复测试 fixture；本次 13 条 schema 假失败消失，保留真实事件重放失败 |

## 本轮新增固定回归脚本（已落地与未覆盖边界）

下列路径已创建；“已通过”只表示对应当前证据，`test.fixme` 或未实现 oracle 的场景仍不得标为完整覆盖：

- tests/browser/overall/first-use-and-knee.spec.ts：E2E-01、E2E-02；
- tests/browser/overall/safety-bilateral-and-unable.spec.ts：E2E-03 至 E2E-06；
- tests/browser/overall/retest-training-followup.spec.ts：E2E-07 至 E2E-12；
- tests/browser/overall/feedback-admin-cleanup.spec.ts：E2E-13 至 E2E-15；
- tests/browser/exploration/real-workbench-seeded-exploration.spec.ts：TEST-03；
- tests/browser/mobile-preview/mobile-preview.spec.ts：TEST-10 Pixel 5 / iPhone 13；
- tests/browser/firefox/high-risk.spec.ts：TEST-10 Firefox 高风险流程；
- tests/workflow/snapshot-freshness-policy.test.mjs：T-09 时间边界和慢性/急性路由；
- tests/unit/domain/session-identity-core.test.mjs：RMD-HIST-01/02/03 稳定身份和会话生命周期；
- tests/unit/domain/body-mark-core.test.mjs：RMD-MARK-01 视角、侧别、来源和 zone-only 标记合同；
- tests/integration/sqlite-api/real-snapshot-recovery.integration.mjs：真实快照恢复与原答案保留；没有独立快照时间边界集成脚本。

## 证据目录最低要求

每次执行使用独立 runId，至少保存：

~~~text
artifacts/quality/<runId>/
├── manifest.json
├── results.json
├── report/
├── test-results/
├── screenshots/
├── traces/
├── snapshots/
└── logs/
~~~

报告中必须能从缺陷编号反查场景 ID、脚本、命令、提交、buildId 和产物路径；失败 seed 不得只写在终端输出里。
