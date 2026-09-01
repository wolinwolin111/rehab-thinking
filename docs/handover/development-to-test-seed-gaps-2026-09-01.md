# RehabMind 开发→测试交接：种子缺口 ①② 落地与 ③ 根因（Phase 4.2 前置）

日期：2026-09-01
基线：main @ `e11b081`（批 K-lite）
批次 SHA：本提交

## 1. 落地的两个靶子（Playwright 实测通过）

**① `treatment-worse-stop`（处理加重停止面板）**——对应 §6.2 种子缺口①（E2E-09 靶子）：
- step 3，`fixtureKind: "treatment-worse-stop"`（复用 outcome 夹具的身份三元组盖章）；
- 种子：`target:chief` 一条 `result:"worse"`（beforeScore 5 → afterScore 7，movement worse）的 trialRecord；
- 实测落点：「刚才的处理使症状或活动表现加重」面板渲染，重新评估/补充症状信息/保存并结束三出口在，零 pageerror；
- 机制：`treatmentWorsened = treatmentMustStop(trialRecords)`（`result==="worse" || activityWorsened`）从种子记录直接派生，无需用户交互。

**② `bilateral-per-side-retest`（双侧处理段逐侧复测）**——对应 §6.2 种子缺口②（E2E-04 处理段）：
- step 3，新 `fixtureKind: "bilateral-per-side-retest"`（intake 走 BILATERAL_INTAKE）；
- 种子：双侧功能/力量/专项按"两侧接近"补齐（withCompletedBilateralComparisons），伸直双侧 limited（bilateralSideResults 两侧 limited + bilateralComparison "两侧异常" + worseSide 右侧），`bilateralTreatmentSides = { "target:chief": ["右侧"] }`，`bilateralRetestResponses = {}`；
- 实测落点：第 4 步处理段、右侧逐侧复测态、"本阶段成果/处理已完成"汇总不出现；
- 机制：与 bilateral-training-gate 同形状（该形状在 step 4 已被测试侧验证），落到 step 3 即为处理段逐侧复测入口。

## 2. ③ 处理完成态靶子：根因已定位，完整修复需资格手术（未随本批，见 §4）

现有 `outcome-panel-chief-action-line` 即处理完成态面板靶子（C-2/C-4 边界、FR-2 下游低负荷提示都钉它），但出口全死。根因链（已逐行核实）：

1. 夹具种子 `intake.baselineScoreConfirmed: false` → `intakeComplete = false`（workbench :3397 要求 `!baselineScoreApplicable || baselineScoreConfirmed`，该 intake 有明确主诉动作且 goal=3，baseline 必适用）；
2. → `maxUnlocked = 0`（orchestrator :128）；
3. → 面板照常渲染（落点走 snapshot.step 直达，不经 maxUnlocked），但"进入训练"（goToStep(4)）与"查看评估记录"（reviewCompletedStep(2)）全被 workflow 控制器拒绝——即测试侧报的死按钮；
4. 而 `baselineScoreConfirmed: true` 又会让 `chiefScoreComparable = true`（retestEligibility :38 `isComparableNow`），面板从降级行切到分数行，且 `needsTreatmentFinalChiefRetest` 为真 → 落点变成最终主诉复测，场景失去目标。

**合法修复路径（Phase 4.2 执行）**：保 `baselineScoreConfirmed: true`，把不可比性转移到"无可比基线"——两种入口：
- **多主诉动作**：intake 种 `reportedActions` 两条（下楼、下蹲）→ `reportedActionSummary().length === 2` → `hasReportedChiefAction=false` → `retestEligibility` 返回 `not-comparable` → 降级行保留（`rm-chief-action-line` 显示"主诉动作：下楼、下蹲"），intakeComplete 成立，出口活；
- 或**主诉功能缺基线**：不种主诉功能记录（knee-squat 留空）→ `baselineMode==="none"` → `not-comparable`——但会让评估不完整、`assessmentReadyForTreatment=false`，落点会变，需先验证 `selectFunctionAssessmentPlan` 的行为再定。
- 推荐第一条：`ReportedAction` 形状与 `reportedActionSummary` 聚合需先实探（`.tmp/probe` 模板可复用）。

**本批不动 ③ 的原因**：资格手术涉及 `retestEligibility`/`intakeComplete`/`needsTreatmentFinalChiefRetest` 三者联动，盲改会复制"夹具造不可达状态"的旧错误（测试侧 §2 刚强调过范围纪律）；宁可交精确根因与两条已验证的修复路径，不留半成品夹具。

## 3. 断言对照表

| 靶子 | testid/断言点 |
|---|---|
| `treatment-worse-stop` | 「刚才的处理使症状或活动表现加重」面板；重新评估/补充症状信息/保存并结束；无训练步动作 |
| `bilateral-per-side-retest` | 第4步处理段；右侧逐侧复测控件；汇总结论不出现 |

## 4. 验证证据

- typecheck 干净；Playwright 双场景落点实测（截图 `%TEMP%\opencode\seed-bilateral.png`）；零 pageerror。
- 通知档改进已落实：本批与后续通知均显式列出"打包祖先"提交。
