# RehabMind 内部逻辑覆盖矩阵

更新时间：2026-08-27

## 使用口径

本矩阵只登记不打开真实浏览器即可验证的内部处理逻辑。测试必须调用正式生产模块或由正式生产模块使用的编排函数；源码中出现某段代码、测试专用模型运行结束、页面曾经到达某个标题，都不能单独算作覆盖。

预期结果来自正式产品设计和决策文档。设计没有明确的地方标记为“待确认”，不由测试人员自行推导。

2026-08-27 RMD 整改核验绑定当前 dirty worktree：定向复测、队列、台账/双侧和 workflow 规则通过；unit/integration 的事件重放幂等失败；`test:fast` 被类型错误阻断。以下 RMD 行只记录已有正式测试证据，不把页面计划或源码结构检查升级为逻辑覆盖。

状态含义：

- `已覆盖`：有直接函数或流程轨迹测试，并通过至少一项对应变异验证。
- `部分覆盖`：原子规则已测，但跨模块正式流程仍未提取。
- `待提取`：规则目前主要在页面编排中，尚无独立正式入口。
- `待确认`：设计规则本身尚未明确。
- `界面接线合同（不计逻辑覆盖）`：源码/页面字符串合同只确认模块接线、静态文案或页面结构存在，不证明分支行为；对应规则必须另有正式核心测试。
- `伪证据待迁移`：当前只有源码匹配或简化模型证据，尚未有可接受的正式核心证据。

## 当前矩阵

| 规则/流程 | 生产承载位置 | 当前证据 | 状态 |
| --- | --- | --- | --- |
| 功能评估答案归一化 | `function-assessment-core.ts`、`function-evidence-core.ts` | `function-evidence-core.test.mjs` | 已覆盖 |
| 功能动作首次无法完成时的基线类型 | `function-evidence-core.ts`、`retest-eligibility-core.ts` | `function-evidence-core.test.mjs`、`retest-eligibility-core.test.mjs` | 已覆盖 |
| 功能动作处理后复测门槛 | `function-retest-transition-core.ts` | `function-retest-transition-core.test.mjs` | 已覆盖 |
| 主诉复测历史、最新分数和复查项排除 | `chief-retest-history-core.ts` | `chief-retest-history-core.test.mjs`、局部路径合同 | 已覆盖 |
| 完成状态复测不生成普通疼痛分数 | `function-retest-transition-core.ts`、主流程处理记录 | `function-retest-transition-core.test.mjs`、全量回归 | 部分覆盖 |
| 不同动作不能复用复测结果 | `retest-reuse-core.ts`、`action-identity-core.ts` | `retest-reuse-core.test.mjs`、`action-identity-core.test.mjs` | 部分覆盖 |
| 处理队列生成和候选去重 | `build-trial-targets-core.ts`、`trial-target-core.ts` | 对应 core 测试和组合矩阵 | 部分覆盖 |
| 处理完成后的停止、同目标优先和后续目标定位 | `treatment-queue-core.ts`、`workflow-state-core.ts` | `treatment-queue-core.test.mjs`、`workflow-state-core.test.mjs` | 部分覆盖 |
| 单个处理方向的候选资格规则 | `treatment-queue-direction-core.ts`、主组件适配函数 | `treatment-queue-direction-core.test.mjs`、3 项定向变异 | 已覆盖 |
| 处理队列候选资格与方向/复测结果合并 | `treatment-queue-eligibility-core.ts`、主组件临床方向回调 | `treatment-queue-eligibility-core.test.mjs`、`treatment-queue-core.test.mjs` | 部分覆盖 |
| 动态队列在处理后重排 | `workflow-state-core.ts` 的 `stableQueueTargetKey`、`buildPendingQueueAdvance`、`resolveDynamicQueueAdvanceForTargets`，主组件动态 `trialTargets` | `workflow-state-core.test.mjs`、`treatment-record-ledger-queue-flow.test.mjs`、接线合同 | 部分覆盖 |
| 处理后复测结果写入队列和台账 | `trial-record-builder.ts`、`treatment-record-flow-core.ts`、`treatment-ledger-core.ts`、`treatment-queue-core.ts`、主组件 `finishTrial`/`finishRangeBatch` | `trial-record-builder.test.mjs`、`treatment-record-flow-core.test.mjs`、`treatment-record-ledger-queue-flow.test.mjs`、`treatment-ledger-core.test.mjs` | 部分覆盖 |
| 复测完成后问题是否解决 | `problem-ledger-core.ts`、主组件编排 | `problem-ledger-core.test.mjs` | 部分覆盖 |
| 疼痛变化与活动表现分开处理 | `batch-retest-compute.ts`、`treatment-session-core.ts` | `batch-retest-compute.test.mjs`、系统合同测试 | 部分覆盖 |
| 加重后停止处理 | `treatment-session-core.ts`、`adverse-response-core.ts` | `treatment-session-core.test.mjs`、`adverse-workflow-matrix.test.mjs` | 部分覆盖 |
| 训练进入门禁与阶段状态组合 | `bilateral-flow-core.ts`、`training-feedback-core.ts`、`training-stage-gate-core.ts`、主组件 | 对应 core 测试、`training-stage-gate-core.test.mjs` | 部分覆盖 |
| 返回修改后下游状态失效 | `downstream-invalidation-core.ts`、主组件编排、版本核心 | `downstream-invalidation-core.test.mjs`、`MUT-INV-01/02/03` 定向变异 | 部分覆盖：复诊复查答案的作废判定、本次康复记录过滤和状态组映射已提取并变异验证；主诉变更触发的全量重置仍为页面编排（组清单已在核心定义，待阶段 C 由 `useDecisionEngine` 消费） |
| 后续康复历史和新症状隔离 | `followup-review-core.ts`、会话历史和主组件 | 对应历史测试 | 部分覆盖 |
| RMD-HIST-01/02/03：草稿、稳定 session/thread 身份和跨会话保留 | `session-identity-core.ts`、`session-history.ts`、SQLite snapshot/event | `session-identity-core.test.mjs`、`session-history-contract.test.mjs`、SQLite/API 集成；事件重放关联失败 | 部分覆盖：生命周期和旧记录身份已测，完整事件重建和跨案例归档仍待 fixture 与正式闭环 |
| RMD-HIST-04：事件时间线按身份重建 | `case-service.ts`、`case-contracts.ts`、`case_events` | `pilot-case-service.test.mjs`、SQLite/API 集成 | 部分覆盖：事件 v2 字段和迁移可读；相同 `eventId` 重放当前返回 409，未达到幂等合同 |
| RMD-MARK-01：BodyMark 视角/侧别/来源/失效状态 | `body-mark-core.ts`、人体图接线 | `body-mark-core.test.mjs` 已验证视角、侧别、来源和 zone-only；缺失页面清理/失效证据 | 部分覆盖：需要固定 view/side/mark 清理与历史失效 fixture；页面字符串不能替代 |
| RMD-SCORE-01：ScoreRecord 区分未选、确认 0、不可用和无法完成 | 当前评分/复测记录链 | 当前无独立 ScoreRecord 合同测试 | 待提取：需要先由开发交付稳定记录类型和可复用 fixture |
| RMD-MODE-01/02/03：案例学习关闭、能力变化、旧字段迁移 | `workflow-profile-core.ts`、snapshot boundary | `workflow-profile-core.test.mjs`、snapshot/schema 测试 | 部分覆盖：能力组合和 study 不落生产已通过；生产入口与遗留字段的真实页面/API 闭环待 RMD 批次 |
| RMD-SPECIAL-01/FIELD-01~08：特殊字段与动作归档 | 当前 intake/knowledge/treatment 接线 | 现有规则/组件合同，缺 RMD fixture | 待提取：不得用字段存在或组件渲染代替保存、恢复和归档行为 |
| 保存恢复后的流程状态等价 | `pilot-snapshot-schema.ts`、`pilot-persistence-controller.ts` | 快照和持久化测试 | 部分覆盖 |
| 页面接线与静态内容合同 | `rendered-html.test.mjs`、局部路径合同 | 页面/源码字符串合同；不计内部逻辑覆盖 | 界面接线合同（不计逻辑覆盖） |
| 生产核心随机组合 | `random-state-sequence.test.mjs` | 50,000 次直接调用正式复测、队列、台账、训练门禁和评估证据核心 | 部分覆盖 |

## 本轮已落地的第一条链

```text
功能动作评估
→ 识别 ordinary / completion-status / none 基线
→ 处理后填写能否完成和原因
→ 判断是否需要普通分数
→ 生成可记录/不可记录状态
→ 进入后续处理或训练门禁
```

正式入口是 `resolveFunctionRetestTransition`，组合入口是 `resolveTreatmentRetestGate`。它们已经被处理记录逻辑和处理完成页共同使用，避免两个页面分支各自判断复测是否完成。

本轮新增的跨模块轨迹为 `function-retest-flow.test.mjs`，直接串联评估证据、复测资格和处理后门禁；新增的 `treatment-queue-core.ts` 统一了停止、同目标候选和跨目标定位，`treatment-queue-eligibility-core.ts` 统一了优先类型、已追踪方向、同物理动作复测结果和主诉持续状态的资格合并。

对应变异：

- 删除功能复测就绪判断；
- 删除 completion-status 分支；
- 删除“无法完成必须提供原因”判断。

六项变异均已被 `npm run test:logic:mutations` 捕获，其中第四项专门反转主诉完成状态复测的例外分支，后两项验证问题台账的完成阈值和最新记录覆盖规则。

## 下一条提取链

下一步处理以下范围，暂不标记为已覆盖：

```text
正式评估结果
→ 处理目标生成
→ 处理记录写入
→ 复测动作绑定
→ 动态队列重算
→ 处理完成/继续/停止
```

其中“处理完成/继续/停止”的队列定位已提取为 `resolveTreatmentQueueAdvance`，动态目标身份和待推进状态已提取为 `stableQueueTargetKey`、`buildPendingQueueAdvance`、`resolveDynamicQueueAdvanceForTargets`；问题台账和训练阶段门禁也已有正式核心。单次处理记录和复测绑定已提取为 `resolveTreatmentRecordFlow`，批量活动度记录已提取为 `buildRangeTreatmentRecords`，候选资格合并已提取为 `isTreatmentQueueCandidateEligible`，方向候选规则已提取为 `isTreatmentQueueDirectionCandidateNeeded`，组合测试已将完成、未完成、加重停止、资格过滤和动态重排后的稳定目标定位串起来。剩余的是页面向核心传参的局部接线合同，以及继续清理源码正则型逻辑合同，不能只增加更多 `buildTrialTargets` 单元测试。
