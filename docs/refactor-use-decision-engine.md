# 主组件编排层重构指导：useDecisionEngine（阶段 C）

> 本文是「主组件降耦合」系列重构的第三阶段指导。前两阶段（抽纯 UI 组件、抽 hook、抽纯函数）已完成，本阶段尚未启动。**只有在明确需要多关节扩展时才启动本阶段**，不要在无需求时「为重构而重构」。

## 1. 背景与目标

`app/rehabmind-complete-demo.tsx` 是康复应用的主组件（约 7600 行），把 UI、状态、事件、决策编排四类东西耦合在一起。前面的重构已经把它拆掉了一部分：

- **决策层**：38 个 `*-core.ts` 纯函数文件（已解耦，可单测）。
- **UI 层**：`ui-primitives.tsx`、`next-session-card.tsx`、`stage-outcome-sections.tsx`、`lower-limb-location-picker.tsx` 等纯展示组件。
- **hook 层**：`use-function-retest.ts`、`use-training-flow.ts`（训练/功能复测的 state）。
- **纯函数层**：`trial-record-builder.ts`（`buildTrialRecords`）、`batch-retest-compute.ts`（`computeBatchResult`）。

**仍未解耦的核心痛点**：主组件里散落着约 8 个决策 useMemo，它们之间隐式互相依赖、靠 useMemo 依赖数组手动维护。这是多关节扩展的最大障碍——多关节要从「单 region」重构成「多 region 编排」，而决策编排还散在主组件里，改不动。

本阶段的目标：把这些 useMemo 收拢成一个 `useDecisionEngine` hook，让多关节扩展时只改这一个 hook 的输入/输出。

## 2. 已完成的重构（阶段 1 / 2 / A / B）

| 阶段 | 内容 | 成果 |
|---|---|---|
| 阶段 1 | 抽 8 个纯 UI 组件 | `ui-primitives.tsx`、`next-session-card.tsx` |
| 阶段 2 | 抽 2 个 state hook | `use-function-retest.ts`、`use-training-flow.ts` |
| 阶段 A | 抽 `buildTrialRecords` 纯函数 + 共享类型 | `trial-record-builder.ts`、`trial-record-types.ts` |
| 阶段 B | 抽 `computeBatchResult` 纯函数 | `batch-retest-compute.ts` |

阶段 A/B 是「局部抽取」（1 个函数 + 几个小类型），行为等价、风险低。本阶段 C 是「全局收拢」（8 个 useMemo + 2 个大类型），性质不同、风险高。

## 3. 阶段 C 的目标

把以下 8 个决策 useMemo 收拢成 `useDecisionEngine`：

1. `kneeDecision`（约 3069 行）
2. `localLimbDecision`
3. `trialTargets`（约 3430 行）
4. `problemLedger`（约 3604 行）
5. `exerciseStage`（约 3588 行）
6. `exercises`（约 3614 行）
7. `followupCandidates`（约 3779 行）
8. `homeRelaxationTargets`（约 3768 行）

收拢后的形态：

```ts
const decision = useDecisionEngine({
  region, intake, findings, assessments, assessmentResults,
  trialRecords, followupTrialRecords, tissuePathway, followupMode,
  sessionNumber, sessionHistory, // ... 其余输入
});
// decision.trialTargets / decision.kneeDecision / decision.exerciseStage / ...
```

## 4. 类型迁移清单（最大的成本项）

`useDecisionEngine` 的输入输出依赖以下大类型，它们目前在 `rehabmind-complete-demo.tsx` 里定义，需要先迁到共享类型文件：

| 类型 | 主组件位置 | 字段规模 | 迁移到 |
|---|---|---|---|
| `IntakeState` | 193 行 | 100+ 字段 | `intake-types.ts` |
| `Finding` | 345 行 | 几十字段 | `finding-types.ts`（或并入 trial-record-types） |
| `AssessmentRecord` | 已存在 | 几十字段 | 已在某处，需确认 |
| 十几个子类型 | 散落 | 各 3-10 字段 | 跟随主类型一起迁 |

**迁移风险**：`IntakeState` 被主组件几百处引用，迁移后主组件要加 import、删本地定义；其依赖的子类型（ChiefActionAnalysis、FunctionControl、FamiliarSymptomAnswer 等）要一起迁，否则类型引用断裂。

## 5. useMemo 依赖清单（显式化的关键）

收拢前，必须逐个列清每个 useMemo 的输入依赖（这是最容易漏、最容易出 bug 的地方）：

| useMemo | 输入依赖（读） | 备注 |
|---|---|---|
| `kneeDecision` | region、kneeWorkflowAssessments、intake、trialRecords | 依赖 `kneeDecisionInputFromWorkflow` |
| `trialTargets` | region、findings、assessmentResults、intake、trialRecords、tissuePathway、kneeDecision、localLimbDecision、matchedPilotRelations、canAssessPassive、canMobilizeJoint、swellingGuidance、assessments | 依赖链最长，输入最多 |
| `exerciseStage` | intake、findings、noImmediateTreatmentResponse、imaging、followupMode、followupScore、sessionEndScore、followupTrends、sessionNumber、latestOutcomeForDirection | `latestOutcomeForDirection` 是 useCallback，要作为参数传入 |
| `exercises` | region、findings、intake、exerciseStage、effectiveTreatmentCandidates、assessmentResults、noChiefActionAndNoAssessmentProblem、pilotTrainingIds、kneeDecision、followupMode、followupKneeDecision、localLimbDecision、tissuePathway、sessionHistory、sessionNumber | 依赖 `exerciseStage`（useMemo 间依赖） |
| `problemLedger` | treatmentProblems、routedProblemIds、completedProblemIds、tissuePathway、assessmentEvidenceInsufficient | |
| `followupCandidates` | region、tissuePathway、findings、trialRecords、followupTrialRecords、sessionNumber、followupKneeDecision | |
| `homeRelaxationTargets` | tissuePathway、intake、tensionLabels、effectiveMuscleLabels、exercises | 依赖 `exercises` |

**关键注意**：`trialTargets` 依赖 `kneeDecision`/`localLimbDecision`，`exercises` 依赖 `exerciseStage`，`homeRelaxationTargets` 依赖 `exercises`——这些 useMemo 之间的依赖链必须在 `useDecisionEngine` 内部按顺序计算（先算被依赖的），不能并行。

## 6. 分步实施计划（每步 commit + 测试）

建议按「先迁类型 → 再逐个收拢 useMemo → 最后组装 hook」的顺序，每步独立验证：

1. **迁移 `IntakeState` + 子类型** 到 `intake-types.ts`（改动最大，独立提交）。
2. **迁移 `Finding` + 子类型** 到共享类型文件。
3. **抽 `computeExerciseStage` 纯函数**（最独立、单测价值高）。
4. **抽 `computeProblemLedger` 纯函数**（`buildProblemLedger` 已在 core，收拢主组件的调用）。
5. **逐个收拢其余 useMemo**：kneeDecision → localLimbDecision → trialTargets → exercises → followupCandidates → homeRelaxationTargets。
6. **组装 `useDecisionEngine` hook**，主组件只调用 hook 解构。

每步完成后：`typecheck` + `node --test --experimental-test-isolation=none "tests/*.test.mjs"` + 双走读（自助、髌骨）全绿，再 commit。

## 7. 风险与验证策略

**最大的风险**：useMemo 依赖链漏一项，会在特定场景才崩——而复诊、双侧、局部肢体、多关节这些场景，当前的走读脚本（只覆盖「自助膝前痛」「髌骨专业」）覆盖不到。

**验证策略**：

- 纯函数（computeExerciseStage 等）用单元测试锁定边界。
- 每个 useMemo 收拢后，除双走读外，**至少补一个针对该 useMemo 特殊场景的浏览器走读**（如复诊场景、双侧场景），否则等于裸奔。
- 阶段 C 完成后，建议补充一条「多关节」的冒烟走读，验证 useDecisionEngine 的输入输出在多 region 下不崩。

## 8. 触发条件

**只有满足以下任一条件时才启动阶段 C**：

1. 明确要开发「多关节处理」功能；
2. 主组件里 useMemo 的数量进一步膨胀到不可维护（比如新增 3+ 个相互依赖的 useMemo）；
3. 需要把决策编排开放给外部（如 API 化、服务端渲染）。

在此之前，保持现状。阶段 A/B 已经落地了「计算与状态更新分离」这个降耦合里性价比最高的一步，阶段 C 的边际收益递减、风险递增，不急于做。

---

## 附：关键文件清单

| 文件 | 作用 |
|---|---|
| `app/rehabmind-complete-demo.tsx` | 主组件（约 7600 行，待继续瘦身） |
| `app/trial-record-types.ts` | 共享类型（TrialRecord、TrialResult、YesNo 等） |
| `app/trial-record-builder.ts` | `buildTrialRecords`、`resultFromScore` 纯函数 |
| `app/batch-retest-compute.ts` | `computeBatchResult` 纯函数 |
| `app/use-function-retest.ts` | 功能复测 state hook |
| `app/use-training-flow.ts` | 训练 state hook |
| `app/ui-primitives.tsx` | 8 个纯展示组件 |
| `app/next-session-card.tsx` | 下次康复卡片组件 |
