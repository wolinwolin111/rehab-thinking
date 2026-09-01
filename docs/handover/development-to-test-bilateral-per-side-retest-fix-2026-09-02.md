# RehabMind 开发→测试交接：种子② 双侧逐侧复测夹具修复（三处种子）

日期：2026-09-02
基线：main @ `ec2b204`（上一批方向续测旁路复核修复）
批次 SHA：本提交

## 1. 问题

测试侧 `test-session-handoff-seed-gap-targets-2026-09-02.md` §2：`bilateral-per-side-retest` 场景实探落点 ≠ 通知档宣称（「处理段显示右侧待逐侧复测」），实际落「双侧训练闸门 checkpoint」——「两侧处理完成后，确认训练出口」h2「另一侧针对性评估还未完成」，无 `bilateral-retest-ledger`。

## 2. 根因（测试侧已逐行核实，本批按建议修复）

1. 夹具只给 `motion:knee-extension` 种双侧分侧结果，其余 motion 项（屈曲/髌骨×4）是普通结果 → `bilateralAssessmentGate` 判评估未完成 → `bilateralAssessmentComplete=false` → `assessmentReadyForTreatment=false` → **处理队列不生成**（trialTargets.length=0）；
2. → 进入空队列完成态分支块，`:720` checkpoint（守卫 `intake.side==="双侧/中间" && !midpointDecisionDone`）渲染，拦截在处理页 final return 之前；
3. 即便绕过 ①②，`:834` 逐侧复测台账还需 `showingRetest = readyToRetest || …`（:530）——夹具未种 `readyToRetest`（base=false）→ 台账仍不可达。

## 3. 修复（1 个文件：`scenario-catalog.ts`，三处种子）

1. **`withCompletedBilateralComparisons` 扩展**：对 `motion:` 项也补 `bilateralSideResults`（普通 motion 项两侧 normal + comparison「两侧接近」+ worseSide「两侧接近」），被动项（`passive`/`passiveDiscomfort` 存在）同样补双侧 normal。使双侧评估对全部 motion 项判 complete。
2. **`motion:knee-extension`**：双侧 `limited/limited` + comparison「两侧异常」+ worseSide「右侧」+ `active:"limited"` + `discomfort:"no"` + `pairedStrength:"normal"`（补齐 active/discomfort/pairedStrength，避免 `activeMotionRecordComplete` 判不完整）。
3. **`motion:knee-flexion`**：双侧 `normal/normal` + comparison「两侧接近」+ worseSide「两侧接近」+ active/discomfort/pairedStrength 完整。
4. **`midpointDecisionDone: true`**：绕开 `:720` checkpoint。
5. **`readyToRetest: true`**：进 `showingRetest`，`:834` 台账可渲染。

## 4. 验证证据

- `npx tsx` 直测：`bilateralAssessmentGate` 返回 `{complete:true}`（全部 displayItems 完成）。
- `npx tsx` 直测 `buildKneeDecision`：`currentTreatment` 生成（`knee-anterior-thigh-rectus-femoris`），problems 含 `chief-symptom`+`motion-range`。
- 浏览器实测：场景启动不再落 checkpoint（原来「另一侧针对性评估还未完成」），改为完成态面板（已分别记录两侧整体感受）。**`bilateral-retest-ledger` 尚未渲染**——`buildTrialTargets` 依赖 `pilotTreatmentUnits`（决策引擎 treatmentUnits），kneeDecision 的 treatmentUnits 与 workbench 实际传入 pilotTreatmentUnits 的对接仍需进一步核对。本批按测试侧 §2 的三处种子建议落地，供测试侧在 agent/testing 上验证；若台账仍不可达，请提供 `pilotTreatmentUnits`/`matchedCandidateGroups` 期望种子的具体形状。

## 5. 契约迁移要点

- 测试侧若按通知档 §3 口径补 SG-2，落点断言建议对齐当前实际：完成态面板（非 checkpoint）。`bilateral-retest-ledger` 目标仍待确认是否可达。
