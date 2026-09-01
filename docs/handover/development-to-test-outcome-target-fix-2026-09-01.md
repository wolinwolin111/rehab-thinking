# RehabMind 开发→测试交接：处理完成态靶子修复（Phase 4.2 ③）

日期：2026-09-01
基线：main @ `10ff663`（上一批 dev→dev 接手指南）
批次 SHA：本提交（详见文末）

## 1. 问题

`outcome-panel-chief-action-line` 场景（C-2/C-4 边界、FR-2 下游低负荷提示的靶子）出口全死：面板能渲染，但「进入训练」「查看评估记录」点击无效。测试侧 §6.2 已登记，根因在 `development-to-test-seed-gaps-2026-09-01.md` §4 存档。

## 2. 根因（已逐行核实，非猜测）

1. 夹具种子 `intake.baselineScoreConfirmed: false` → `intakeComplete = false`（workbench :3397 要求 `!baselineScoreApplicable || baselineScoreConfirmed`，该 intake 有明确主诉动作且 goal=3，baseline 必适用）；
2. → `maxUnlocked = 0`（orchestrator :128）；
3. → 面板照常渲染（落点走 snapshot.step 直达，不经 maxUnlocked），但 `goToStep(4)` 被 workflow 控制器 `navigate-requested` 判定 `targetStep <= maxUnlocked` 拒绝（静默）——即测试侧报的死按钮。

修复路径有两条（seed-gaps §4 已列），本次采用**推荐的第一条：多主诉动作**。

## 3. 修复内容（仅 1 个文件：`src/features/rehabmind/test-workbench/scenario-catalog.ts`）

`outcome-panel-chief-action-line` 场景的 `snapshotOverrides` 三处改动：

1. **`baselineScoreConfirmed: true`** —— 让 `intakeComplete` 成立，`maxUnlocked` 不再被压到 0。
2. **种入 `reportedActions` 两条（下楼、下蹲）+ 清空 `customAction`/`reproduction`** —— `reportedActionSummary().length === 2` → `hasReportedChiefAction = false`（workbench :2779 要求 `length === 1`）→ `retestEligibility` 返回 `not-comparable`（retest-eligibility-core :33）→ `chiefScoreComparable = false` → 面板仍走**降级行**（`rm-chief-action-line` 显示「主诉动作：下楼、下蹲」），不会切到分数行；同时 `reportedActions` 使 `intakeComplete` 里的 `reportedActionSummary(intake).length > 0` 分支成立。
3. **trialRecords 首条加 `chiefRetested: true`** —— 避免 `retestSignals`（workbench :2483）因 `chiefCanBeCompared && actualTreatments.length && !chiefAlreadyRecorded && !chiefConfirmedOutsideTrials` 生成 **pending 主诉义务**，否则 `pendingRequiredCount > 0` → `treatmentComplete = false` → `maxUnlocked = 3` → 训练仍锁死。加 `chiefRetested:true` 后 `chiefAlreadyRecorded` 为真，不生成 pending。

## 4. 验证证据（Playwright 实测通过）

- typecheck 干净；`rendered-html.test.mjs` 17 pass / 6 fail（与交接档 §6 基线一致，零新增）。
- 场景落点：
  - 面板标题 = 结论句「主诉变轻」（`chiefImprovedDuringTreatment` 为真）；
  - 降级行「主诉动作：下楼、下蹲」存在；
  - 清单表（有效处理：训练股四头末端控制；活动范围变化：膝关节主动伸直（AROM）有改善，仍小于健侧）正常；
  - rail「5 训练居家」状态 = **可进入**（修复前为待解锁）；
  - 点击「进入训练」→ 成功导航到「05 下一阶段 · 处理复测完成 → 开始训练」过渡页；
  - 零 pageerror；`data-pending-count` 属性为 0（无待办复测）。

## 5. 断言对照表（测试侧契约迁移说明）

| 断言点 | 修复前 | 修复后 |
|---|---|---|
| rail「5 训练居家」 | 待解锁 | **可进入** |
| 「进入训练」按钮 | 可见但点击无效（workflow 拒绝） | 点击进入训练过渡页 |
| 「主诉动作：下楼、下蹲」降级行 | 存在 | 存在（不变） |
| `data-pending-count` | 1（pending 主诉义务） | 0 |
| 结论句标题 | 主诉动作清单 | 结论句（本次为「主诉变轻」） |

测试侧钉该场景时，断言应改为：进入训练可导航 + rail 训练可进入 + 降级行存在 + pending-count 为 0。

## 6. 已知坑（给后续）

- **不可比性的来源转移**：不再靠 `baselineScoreConfirmed:false`（会毁 intakeComplete），而是靠多主诉动作 → `not-comparable`。任何想造「不可比成果面板」的夹具都应沿用此形状。
- `reportedActions` 的 `raw` 字段即展示文本（`reportedActionSummary` 取 `raw || label`）；id/kind 需要真实存在于 `reportedActionOptions(regionId)`（下楼=`functional-step-down`、下蹲=`functional-squat`），否则与 UI 选项不一致。
- 若未来在种子加「主诉已复测」而忘了 `chiefRetested:true`，会重新踩 pending 义务死锁——这是本批修复的最隐蔽一环。
