# 05 · 会话编排与状态管理（Session Orchestration）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 事实来源：`src/features/rehabmind/workflow|controllers` 与 workbench 走读（行号截至本日）
> 本文定义"一次康复会话"里谁拥有什么状态、命令如何流动。决策规则见 02，持久化见 06。

## 1. 一句话定位

页面永远不自行裁决业务：UI 事件 → `workflow-orchestrator`（纯函数，唯一决策命令生成者）→ `WorkflowCommand[]`（10 种封闭联合）→ `workflow-command-adapter`（唯一翻译器）→ 页面动作 → domain 纯函数计算事实 → persistence 落盘。

## 2. 编排数据流

```
UI 事件（stage 组件 onXxx 回调）
  ▼
rehabmind-workbench 内层函数（goToStep:3707 / finishTrial / submitCurrentFeedback:6340 …）
  ▼ useWorkflowController（use-workflow-controller.ts:29-31，冻结装配，仅此一处实例化 :159）
workflow-orchestrator（纯决策，无副作用）
  ├─ orchestrateTreatmentRetest(:29)          → {transition, commands, timelineEvents}
  ├─ orchestrateTreatmentQueueRecomputed(:80) → {resolvedIndex, transition, commands}
  ├─ projectWorkflowState(:113)               → 门禁投影（maxUnlocked、pendingRetestCount=0 才算处理完成）
  ├─ resolveWorkflowSafetyGate(:166) / resolveReturnEditGate(:184)
  └─ orchestrateWorkflowNavigation(:191-267)  → 导航/回看/编辑/followup/不良事件 五类事件单一裁决
  ▼ WorkflowCommand[]（workflow-commands.ts:1-11，10 种封闭联合）
workflow-command-adapter.ts(:17-51)  命令→页面动作唯一翻译器（不派生决策）
  ▼ workbench setXxx（setStep/setTransitionTarget/setTrialTargetIndex…）
domain 纯函数（02 章）→ persistence（06 章）
```

## 3. 状态所有者分工

| 状态 | 所有者 | 证据 |
|---|---|---|
| 跨阶段决策/门禁/转移 | workflow-orchestrator.ts（独占） | :29-268；ARCH-02 门禁强制 |
| 决策→页面动作翻译 | workflow-command-adapter.ts | :17-51 |
| 评估页局部状态 | useAssessmentFlow | use-assessment-flow.ts:12-33 |
| 处理/复测局部状态 | useTreatmentFlow | use-treatment-flow.ts:30-81 |
| 训练局部状态 | useTrainingFlow | use-training-flow.ts:16-33 |
| 会话/历史局部状态 | useRehabSession | use-rehab-session.ts:6-43 |
| 功能复测局部状态 | useFunctionRetestState | use-function-retest.ts:24-38 |
| 规则投影缓存 | useDecisionEngine（仅 useMemo，不决策） | use-decision-engine.ts:15-24 |
| 同步状态机 | reducePilotSyncState（纯仲裁，独占） | sync-core.ts:81-133；ARCH-A5 门禁强制 |
| 持久化身份/版本/键 | local-case-store.ts | :1-388 |
| 服务端事实校验 | case-service.ts / case-admin-service.ts | :336-470 |

**组件不得另建平行业务事实状态**（v3 合同控制器边界）；workbench 全部命令执行点经 workflowController（navigate :3712/3741/3779/3840/6065/6154；recordTreatmentRetest :4289/4555；recompute :2602；createPendingQueueAdvance :2642）。

## 4. 命令与导航裁决

- 10 种命令（封闭联合）：navigate / stop-treatment / select-treatment-candidate / select-treatment-target / advance-treatment-target / 等；step 域 0|1|2|3|4|5。
- 导航五事件单一裁决（orchestrateWorkflowNavigation）：navigate-requested(:204) / review-requested(:211) / edit-requested(:224) / followup-started(:237) / adverse-reported(:245)。
- 处理复测编排：停止→stop-treatment(:39)；下一候选→select-treatment-candidate(:42)；下一目标→select-treatment-target(:45-49)；队列重算→advance-treatment-target(:52)。
- 稳定目标键 `id:首候选id`（workflow-state-core.ts:15）；动态推进优先同目标替补候选，找不到从 0 重启而非旧下标猜测（:101-119）。
- 下游失效：18 个状态组（downstream-invalidation-core.ts:13-31）；intake 变化全清，复诊答案变化只清 followup-current-session（:67-70）。

## 5. 测试工作台（独立通道）

`/test` 页与 test-workbench/ 场景目录（scenario-catalog.ts）只注入快照、不走生产 API；page_boundary 模式经 snapshotOverrides 种子化状态——测试侧回归基础设施，不属于生产流程。

## 6. 会话身份

caseId / problemThreadId / sessionId 三层身份**不可由文本或数组位置推导**（session-identity-core.ts:2-7）；legacySessionIdentity 稳定再生（:75-81）；SessionLifecycleStatus（draft/completed/abandoned）与 ProblemThreadStatus（active/resolved/archived/superseded）见 02 值契约表。
