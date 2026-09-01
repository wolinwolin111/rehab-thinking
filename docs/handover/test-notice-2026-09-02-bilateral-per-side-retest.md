# RehabMind 测试知会：种子② 双侧逐侧复测夹具修复（2026-09-02）

## 范围：dev 分支 agent/dev-20260901（基线 `f3ae2c9`，本批追加「台账真正渲染」修复）

| # | SHA | 说明 |
|---|---|---|
| 1 | `778a7ac` | fix(fixture): bilateral-per-side-retest 三处种子修复 |
| 2 | `7ae44fb` | docs: development-to-test-bilateral-per-side-retest-fix-2026-09-02.md |
| 3 | 本提交 | fix(fixture): 改为专业模式 + 中文触诊 + 补全被动记录，`bilateral-retest-ledger` 实测渲染 |

## 已按 test-session-handoff-seed-gap-targets-2026-09-02.md §2 落地

1. `withCompletedBilateralComparisons` 扩到 motion 项（含被动项补双侧 normal）；
2. `motion:knee-extension` 双侧 limited + `active/discomfort/pairedStrength` 补齐；
3. `motion:knee-flexion` 双侧 normal + 补齐；
4. `midpointDecisionDone: true`（绕开 checkpoint）；
5. `readyToRetest: true`（进 showingRetest）。

## 已验证

- tsx 直测 `bilateralAssessmentGate` → `{complete:true}`（全部评估项双侧完成）；
- tsx 直测 `buildKneeDecision` → `currentTreatment` 生成 + problems（chief-symptom / motion-range）；
- 浏览器实测：**不再落 checkpoint**（原「另一侧针对性评估还未完成」）。

## 更新（同批次追加）：台账已真正渲染

上一节「三处种子」后 `bilateral-retest-ledger` 仍未渲染。深查后**根因不是** `pilotTreatmentUnits`/`matchedCandidateGroups` 缺种子，而是：

1. **自助模式结构性不可达**：膝伸直前侧 `knee-extension-anterior-lateral` 是 released P0 单元，`buildTrialTargets` 的 P0 lineage 门槛要求 `passive:"limited"`，而 `p0AssessmentEvidenceForDecision` 对自助 profile 剥离 passive → 候选被丢 → `trialTargets` 空 → 落完成面板。逐侧复测台账在自助模式**按设计拿不到**。
2. **夹具共享触诊用了英文 id**：`KNEE_PAGE_ASSESSMENTS` 的 tensionLocations 写 `"thigh-anterior"`，生产写中文标签「大腿前侧」，膝决策 `anteriorThighEvidence` 按中文匹配 → 单元不生成。

**修复**：把该夹具改为生产真实可达路径——「康复思路·给别人」专业模式（`snapshotOverrides.intake`，能力位仅开 `passiveRange`+`palpation`），共享触诊改中文「大腿前侧」，`motion:knee-extension` 补 `active:"both-limited"`（映射「两侧异常」→ 台账列左右两行）+ `passive:"limited"` + `passiveDiscomfort:"no"`（专业被动记录完整），`bilateralTreatmentSides` 键对齐 `target:motion:knee-extension`。

**浏览器实测确认**：`bilateral-retest-ledger` 渲染，h2「分别记录左右两侧处理后的变化」，`bilateral-retest-left`/`bilateral-retest-right` 各 pending + better/same/worse 三按钮，`data-priority-side="右侧"`，主按钮「确认双侧复测」。typecheck / eslint 干净。

## 给 SG-2 的口径

- 本夹具现为**专业模式**，SG-2 断言以此为准；fixtureNote 已更新为实际渲染。
- 若需**自助模式**逐侧复测台账：膝伸直前侧走 P0 不可达；要覆盖自助逐侧复测需换非 P0 靶点（如膝内侧松解），属夹具语义变更，请开条目确认。
- 详见 `development-to-test-bilateral-per-side-retest-ledger-2026-09-02.md`。
