# RehabMind 回归测试总表

更新时间：2026-08-27 18:55（Asia/Shanghai）
适用基线：开发最终修复提交链以 `049a21c` 收口；当前验证 commit=`049a21c3b02a0990c0c3212d2615c96019bb82cb`，buildId=`local-049a21c3b02a-dirty-584c11ea5025`。下方旧批次记录保留作历史审计；QA 工作树仍 dirty，但生产源码无待提交改动。

## 2026-08-27 049a21c 最终复测收口

### 2026-08-27 `3fe14b3` 肌肉定位图与训练素材回归

生产提交 `3fe14b30fd9f2631413bcc7754767052bf366edd`，buildId=`rehabmind-pilot-app-0.1.0+local-3fe14b30fd9f-dirty-d2f719128104.3fe14b30fd9f`。旧 `MUSCLE_ZONE_RECTS/atlas-v2` 测试合同已更新为 v1 底图、连续 SVG path、`data-region-id`、小腿三头肌单块和训练缺图/有图分支。

| 缺陷编号 | 复现步骤 | 修复提交 | 测试层 | 应出现 / 禁止出现 | 当前构建 | 最后验证 | 状态与证据 |
|---|---|---|---|---|---|---|---|
| MUSCLE-VISUAL-01 | 进入肌肉定位；检查大腿/小腿各视角；移动端打开；进入训练缺图和有图动作 | `3fe14b3`；QA 合同更新 | component + L6 preview + visual | 应使用 v1 底图、连续区域、`data-region-id`，小腿后侧为一块；缺图只显示文字，有图显示 `.rm-action-reference`；禁止 atlas、矩形分割、旧视频占位 | `3fe14b3` / `rehabmind-pilot-app-0.1.0+local-3fe14b30fd9f-dirty-d2f719128104.3fe14b30fd9f` | 2026-08-27 18:55 | component 3/3；浏览器身体图 3/3；移动预览 2/2；视觉 3/3；thigh/calf v1 资源 HTTP 200 |

本次以本表为主任务单，针对 `a5774ec`～`049a21c` 开发链重新执行定向、整体、完整浏览器和质量门禁。QA 没有修改生产规则；测试侧仅新增/维护真实页面场景、断言、证据脚本和文档。

- `TEST-2b` / `RMD-HIST`：真实 v1 快照迁移、新建/归档补建线程和 session index 的 v2 可选字段形状通过；不放宽 schema。
- 当前页面边界：T-09 四档、双侧低负荷 gate、双侧完整纵向流程、第二次康复/新问题历史、网络/超时/本机存储失败均由真实 test workbench fixture 验证。
- 相邻固定回归：`test:fast`、full Edge、Edge release、移动预览、Firefox 高风险和 inspect-local 均按本地实际 commit/buildId 重新绑定。
- 既有已修复项继续保持：教程/入口、身体图保留清理、多标签页冲突、固定 eventId 重放和视觉基线未回退。

本次开发修复提交链：`a5774ec`、`41b5032`、`e638887`、`eb1a216`、`39f40c1`、`5a455d6`、`f42a7d4`、`f191976`、`bebfb4a`、`8a05742`、`8d62214`、`3764e5d`、`36687e2`、`049a21c`；前序历史投影修复为 `b60f68a`、`ab218d4`、`66c5675`、`0728f82`。

最终浏览器结果：E2E-04 定向 1/1、整体 20/20、full Edge 48/48、release 5/5、移动预览 2/2、Firefox 高风险 1/1、inspect-local 42/42，均无失败；整体与 full 无 skipped。`npm run test:fast` 通过；`npm run lint` 为 0 error、2 个既有 Hook warning。E2E-01～15 当前均已收口。

当前证据目录：`artifacts/quality/playwright/target-final-049a21c`、`overall-final-049a21c`、`full-final-049a21c`、`release-final-049a21c`、`mobile-final-049a21c`、`firefox-final-049a21c`、`explore-final-049a21c`；本地巡检为 `artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md`。这些 manifest 均绑定本地实际 commit/buildId。

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
| DEF-CONSENT-01 | 首次建案时观察同意门；建案完成后检查遮罩；刷新页面 | 4aff9d8、5423d80；测试加固 a805361 | L6 + L5 | 应关闭同意门并保留草稿；禁止遮罩残留、永远创建中或刷新复现 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | full/release 已回归；`full-final-049a21c-584c11ea-20260827`、`release-final-049a21c-584c11ea-20260827` |
| M-01/M-02 | 主诉侧与肿胀/压痛/感觉标记侧不一致；删除一个标记再刷新 | 1dbf5fb、ab3d99a、92fc130 | L2/L3 + L6 | 应保留独立侧别和标记，删除一个不误删另一个；禁止静默改侧或串标记 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | full Edge 身体图契约 3/3 通过；`full-final-049a21c-584c11ea-20260827` |
| BODY-MAP-UI-02 | 已有标记后切换主要大部位 | `f4c7b393500ac85c830ea15ff609f7027ba70688` | L6 | 应保留旧标记并要求显式清理；禁止切换区域静默清空 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | full Edge 3/3 通过；`full-final-049a21c-584c11ea-20260827` |
| M-03/M-04 | 外伤原话与选择矛盾；主诉侧与力量较弱侧不一致后查看结果 | ab3d99a；M-04 未提交 | L3 + L6 | 应出现矛盾提示并展示真实较弱侧；禁止吞掉矛盾或固定写“患侧力量偏弱” | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 规则/快速层通过；浏览器仍缺独立 oracle，不升格为页面覆盖 |
| M-05/M-07 / E2E-04 | 修改侧别；只答右侧后检查门禁；再完成左侧、按右→左处理并分别复测 | d3621ce、92fc130、8a05742、8d62214、3764e5d、36687e2、049a21c | L2/L3 + L5 + L6 | 应保留左右独立结果和右侧优先顺序，单侧未完成禁止推进；阶段事件/快照应同版；禁止单侧冒充完成或产生 stage-bypass 告警 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | `target-final-049a21c-584c11ea-20260827` 1/1；overall 20/20、full 48/48；通过态 `trace.zip` 与 `assessment-completed-readback.json` 证明 step=3、两侧 limited、safetyComplete=true |
| M-06/T-01 | 不形成固定主诉动作；动作选择无法完成并注明原因 | ab3d99a | L2/L3 + L6 | 应进入观察/进一步判断并保留无法完成原因；禁止生成伪造分数或按正常完成 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | E2E-05/06 通过；E2E-06 已覆盖疼痛、没力、害怕、说明不清 |
| INT-05/INT-07 | 明确主诉动作；再加入多个功能动作 | 多批次修复 | L2/L3 + L6 | 应先独立检查主诉，再显示独立队列；禁止提前递进或合并动作/分数 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | full Edge P0 与发散路径通过；`full-final-049a21c-584c11ea-20260827` |
| SAFE-02/SAFE-04/MIX-03 | 急性风险、麻电/感觉变化、疼痛+肿胀+麻电组合 | 多批次修复 | L2/L3 + L6 | 应安全停止或进入专业确认并保留保存出口；禁止继续普通处理/训练 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 急性踝安全停止、P0 麻电组合通过；其余发散组合按矩阵记录 |
| T-02/T-10/T-11/RET-06 | 处理后改善、无变化、加重；训练留空反馈或训练后加重 | `f42a7d4`、`f191976` | L2/L3 + L6 | 应记录真实反应、加重停止并有限退阶；禁止空反馈完成、加重后继续或无限循环 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | E2E-07～10 4/4 通过；`overall-final-049a21c-584c11ea-20260827` |
| RET-02/RET-03 | 两个活动动作分别处理复测；同一物理动作消费最近合法结果 | 多批次修复 | L2/L3 + L5/L6 | 应按动作身份隔离或复用且不新增记录；禁止串用最近结果 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | RET-02 full Edge/P0 通过；RET-03 仍缺纯用户自然前置 |
| T-03/T-05/T-06/T-07/T-08 | 第二次康复、趋势矛盾、新问题和历史记录 | 3c0dc7d、d3621ce、878a822、b60f68a、bebfb4a | L3 + L5 + L6 | 应追加当前复查、保留历史和新问题；禁止覆盖第一次康复或静默合并趋势 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | v2 历史、第二次/新问题及 session 2 服务投影通过；趋势矛盾仍单列证据 |
| T-09 | 构造保存后 23:59:59、24h、7d 的急性/慢性快照并恢复 | `snapshot-freshness.spec.ts` / test workbench fixture | L2/L3 + L5 + L6 | <24h 无提醒；>=24h 非阻断；急性 >=7d 强提醒并重新确认；慢性只提醒；禁止自动改答案 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 4 档真实页面通过；`overall-final-049a21c-584c11ea-20260827` |
| DATA-04/DATA-09/OPS-04 | 断网、超时、保存冲突、错误凭据、管理员读取和脱敏 | `39f40c1`、`bebfb4a`；QA fixture | L5/L7 + L6 | 应保留本机草稿、拒绝旧 revision、错误可追溯且脱敏；禁止丢数据、覆盖新快照或泄露秘密 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 多标签页、故障、管理员脱敏、session 2 反馈及 runId 清理均通过 |
| UX-01 | 首次完成/跳过教程；点击首页入口重新打开；检查关键 CTA 尺寸 | `f4c7b393500ac85c830ea15ff609f7027ba70688` | L6 | 应可重新打开聚焦教程，关键入口高度≥44、宽度≥96；禁止入口不可用或尺寸不足 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | full Edge 相关回归通过；`full-final-049a21c-584c11ea-20260827` |
| VISUAL-BASELINE-01 | Edge 桌面首页、评估队列、390px 首页截图比对 | `42c0efb1c85f2a1f6d6d2e512bcdba9f04b435d1`（确认设计后更新基线） | visual | 当前实现应与已批准基线一致；禁止未经确认刷新截图掩盖结构变化 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 当前 full Edge 视觉 3/3 通过；`full-final-049a21c-584c11ea-20260827` |
| INSPECT-ENTRY-GATE-01 | 390px、1440px 建案后继续视口巡检；观察入口门是否关闭 | `f4c7b393500ac85c830ea15ff609f7027ba70688` | L6 inspect | 应在建案完成后关闭入口门并继续检查；禁止浮层残留导致巡检中断 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 巡检 42/42 通过；`artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md` |
| TEST-03 | seed=20260827 驱动真实工作台，仅操作可见控件 | 测试基础设施 | L6 exploration | 应可重放并记录 seed/轨迹；失败需截图、trace、快照；禁止复制简化业务模型 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 1/1 通过；`explore-final-049a21c-584c11ea-20260827`；失败证据分支已实现 |
| TEST-10 | Pixel 5/Chromium、iPhone 13/WebKit；Firefox 高风险流程 | 测试基础设施 | L6-preview + L6 | 移动预览应独立报告；禁止用 Edge 结果冒充移动通过 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | 移动 2/2、Firefox 1/1；仍仅预览/高风险范围 |
| DATA-REPLAY-01 | 创建案例；保存带固定 `eventId` 的事件；完全重放同一请求 | `f4c7b393500ac85c830ea15ff609f7027ba70688` | L5 + unit/integration | 应返回原成功结果、revision 不增加、事件不重复；禁止因服务端重新生成 envelope 时间而返回 409 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | `test:fast`、integration 通过；同一请求不重复追加事件 |
| BUILD-TYPE-01 | 执行 `npm run test:fast` | `f4c7b393500ac85c830ea15ff609f7027ba70688` | L0 | 应完成 typecheck/build 并进入后续浏览器门禁；禁止编译错误时产出发布证据 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | architecture/typecheck/build/137 个 Node 测试文件通过 |
| TEST-FIXTURE-MIGRATION-01 | 集成 fixture 应应用当前 drizzle migration 全集后再创建案例 | 测试侧已同步 | L5 test infrastructure | 应包含 0009 clinical event identity；禁止用旧 schema 运行当前 service 造成假失败 | `049a21c` / `local-049a21c3b02a-dirty-584c11ea5025` | 2026-08-27 18:32 | migration 10、issues 0；integration 17/17 通过 |

## 本轮新增固定回归脚本（已落地与未覆盖边界）

下列路径已创建；“已通过”只表示对应当前证据，条件性 `test.skip` 或未实现 oracle 的场景仍不得标为完整覆盖：

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
