# RehabMind 开发→测试交接：种子② 双侧逐侧复测台账真正渲染（根因修正）

日期：2026-09-02
基线：main @ `f3ae2c9`（上一批 fixtureNote/seed-gaps 口径更新）
批次 SHA：本提交
取代：`development-to-test-bilateral-per-side-retest-fix-2026-09-02.md` §4「台账尚未渲染」的遗留结论

## 1. 结论先行

`bilateral-per-side-retest` 场景现已渲染 `bilateral-retest-ledger`（浏览器实测确认）。上一批按测试侧 §2 三处种子修复后仍不落台账，**根因不是** `pilotTreatmentUnits`/`matchedCandidateGroups` 对接缺种子，而是两处更深的夹具/设计事实：

1. **自助模式按 P0 设计拿不到膝伸直前侧处理单元**：`knee-extension-anterior-lateral` 是 released P0 单元，`buildTrialTargets` 的 P0 lineage 门槛（`build-trial-targets-core.ts:201-210` → `kneeP0LineageFromAssessmentRecord`）要求 `passive:"limited"`；而 `p0AssessmentEvidenceForDecision`（`p0-assessment-access.ts:92-105`）对自助 profile 剥离 passive（K-P0-03 ordinary=hidden）。故自助模式下该候选必被丢弃 → `allCandidates` 空 → `trialTargets` 空 → 落完成面板。逐侧复测台账在自助模式**结构性不可达**。
2. **夹具共享触诊用了英文区域 id**：`KNEE_PAGE_ASSESSMENTS` 的 `[SHARED_TENSION_ASSESSMENT_ID].tensionLocations` 写成 `"thigh-anterior"`，而生产 `tensionLocationOptions` 写入的是中文标签（`pilotMuscleRegion.label`，如「大腿前侧」）；膝决策 `anteriorThighEvidence` 按中文正则匹配（`knee-decision-core.ts:458`），英文 id 匹配不到 → 处理单元不生成。

## 2. 修复（1 个文件：`scenario-catalog.ts`）

把该夹具改为**生产真实可达路径**——「康复思路·给别人」专业模式，并补齐专业评估记录完整性：

1. **场景 `snapshotOverrides.intake`**：`productMode:"thinking"` + `operationTarget:"other"` + `examSetup:"professional-other"` + `userRole:"rehab"` + 全能力位（passiveRange/resistedStrength/endFeel/palpation/specialTest/jointMobilization）。使 `canAssessPassive=true`，P0 被动证据不被剥离。
2. **共享触诊改中文标签**：`[SHARED_TENSION_ASSESSMENT_ID]: { tensionChecked:true, tensionLocations:["大腿前侧"] }`（覆盖 KNEE_PAGE_ASSESSMENTS 的英文 id 默认值，仅本夹具，不动全局）。
3. **`motion:knee-extension` 补全专业被动记录**：`active:"both-limited"`（→ `bilateralSideForMotionAnswer` 映射「两侧异常」→ `activeTargetSides` 双侧，台账才列左右两行）+ `passive:"limited"`（P0 lineage 命中）+ `passiveEndFeel:"firm"` + `passiveDiscomfort:"no"`（`passiveMotionRecordComplete` 在 requireEndFeel 下判完整，否则 motion finding 不生成）。
4. **`bilateralTreatmentSides` 键对齐真实靶点**：`{"target:motion:knee-extension":["右侧"]}`（原 `"target:chief"` 与实际活动靶点不符）。
5. 顺带修 `withCompletedBilateralComparisons` 里遗留的 `(record as any)` lint 错误（`AssessmentRecord` 本就含 `bilateralSideResults`）。

## 3. 验证证据（浏览器实测，dev server :3000）

- `bilateral-retest-ledger` 渲染：h2「分别记录左右两侧处理后的变化」，`data-priority-side="右侧"`。
- 左右两行 `bilateral-retest-left` / `bilateral-retest-right`，各 `data-status="pending"`，各含 `bilateral-retest-{left,right}-{better,same,worse}` 三按钮。
- `bilateral-treatment-order`：右侧 completed、左侧 current。
- 主按钮「确认双侧复测」；无完成面板、无 checkpoint。
- `npm run typecheck` 干净；`eslint scenario-catalog.ts` 干净。

## 4. 给测试侧的 SG-2 落点口径

- 本夹具现为**专业模式**（康复思路·给别人）。SG-2 断言请以此为准；fixtureNote 已更新为实际渲染（左右两行 + 三按钮 + 确认双侧复测）。
- 若测试侧需要**自助模式**下的逐侧复测台账：当前产品对膝伸直前侧走 P0（需被动证据），自助不可达；要覆盖自助逐侧复测，需换一个自助可产生处理单元的靶点（如膝内侧松解 `knee-medial-*`，非 P0），这属于夹具语义变更，请开条目确认后再做。
