# RehabMind 设计—实现—数据整改执行方案

更新日期：2026-08-27  
适用角色：产品设计、开发、临床规则维护  
测试执行：由测试会话独立负责；本文只定义开发交付物和验收接口

测试会话如何调整计划、执行节奏及使用内部工作台，见 `docs/handover/development-to-test-remediation-handoff-2026-08-27.md`。

## 1. 文档定位

本文把 2026-08-27 开发侧全链路走读发现的问题转成可直接排期、编码和交接的整改任务。范围覆盖正式设计与当前生产实现之间的差距、数据采集后未进入业务的问题、错误字段接线、历史记录完整性、模式权限和内部场景工作台。

本文不新增康复诊断规则。安全、决策、产品流程和场景口径仍以文档中心列出的四份正式文档为准。本文中的“建议数据结构”属于实现合同；若实施时发现它会改变临床含义，必须先修改相应正式文档，再继续编码。

本文使用新的 `RMD-*` 编号，避免与历史 `DATA-01～09`、`ARCH-01/02`、`DOC-01` 混淆。历史整改项已经解决的是同步冲突、案例身份、快照结构校验等基础设施问题；本轮重点是临床记录语义和正式设计落地。

已确认的产品裁定（2026-08-27）：案例学习模式本期不开放；“显示学习解释”只作为康复思路实际操作模式的可选说明；手机网页需要正式支持，并在网页/VPS 验收后构建和开放 Android APK。

## 2. 总体结论与整改原则

当前单次膝踝流程已经能够完成症状收集、评估、处理、复测、训练和保存。主要风险不在“页面完全不能用”，而在以下四点：

1. 当前快照能恢复页面，但不能可靠表达不可改写的长期临床历史；
2. 人体标记、评分和专项检查的数据精度低于正式设计；
3. 康复思路模式仍同时受新能力模型和旧职业字段控制；
4. 一部分字段只写入快照、被压平成字符串，或在派生链中被丢弃。

整改遵守以下原则：

- **先保历史，再重做界面**：任何 UI 优化不得先于稳定 `problemThreadId/sessionId` 和草稿/完成记录边界。
- **不伪造旧数据**：旧快照缺少坐标、来源或评分上下文时标记为 `legacy-summary` 或 `unknown`，不能补猜。
- **已完成记录追加保存**：编辑产生新版本、失效或更正关系，不删除旧观察。
- **页面显示状态与业务状态分开**：按钮是否选中不能代替 `confirmed/superseded/not-applicable` 等业务状态。
- **权限只认工作流配置**：新代码不得再根据职业名称直接开放检查或手法。
- **读兼容先于写升级**：数据合同升级必须先发布兼容读取，再启用新写入。
- **每批可独立回退**：热修、数据合同、模式权限、内部场景工具、旧代码清理和 Android 外壳分批提交。

## 3. 编号总表

| 编号 | 优先级 | 状态 | 问题 | 目标批次 |
| --- | --- | --- | --- | --- |
| RMD-HIST-01 | P0 | 开发完成，待测试会话 | 草稿保存被当作完成会话 | A/B |
| RMD-HIST-02 | P0 | 开发完成，待测试会话 | 缺少稳定 sessionId 和 problemThreadId | B |
| RMD-HIST-03 | P0 | 开发完成，待测试会话 | 历史归档必须由问题线程持久化承载，不能依赖页面内存状态 | A/B |
| RMD-HIST-04 | P0 | 开发完成，待测试会话 | case_events 不能重建临床历史 | B |
| RMD-MARK-01 | P0 | 开发完成（合同、快照投影、总结消费），待测试会话 | BodyMark 合同缺失、切换大部位立即清点 | B |
| RMD-SCORE-01 | P0 | 开发完成，待测试会话 | 评分缺少 ScoreRecord 身份和版本 | B |
| RMD-SPECIAL-01 | P1 | 开发完成（基础合同），待测试会话 | 专项检查记录缺少触发、能力快照和停止原因 | C/D |
| RMD-WIRE-01 | P1 | 开发完成，待测试会话 | 配对力量 finding 读取错误字段 | A |
| RMD-WIRE-02 | P1 | 开发完成，待测试会话 | 看过医生被当成医生有限制 | A |
| RMD-FIELD-01 | P2 | 开发完成，待测试会话 | professionalNotes 只存原始快照 | C |
| RMD-FIELD-02 | P2 | 开发完成，待测试会话 | passiveMeasuredAngle 采集后不参与结果和历史 | C |
| RMD-FIELD-03 | P1 | 开发完成（结构消费，保留字符串兼容），待测试会话 | sensoryLocations 被压平成字符串 | B/C |
| RMD-FIELD-04 | P1 | 开发完成，待测试会话 | palpation 能力没有实际门控作用 | C |
| RMD-FIELD-05 | P1 | 开发完成，待测试会话 | learningExplanation 没有入口和消费端 | C |
| RMD-FIELD-06 | P2 | 开发完成（基础追踪），待测试会话 | sourceCaseIds 生成后丢失 | C/D |
| RMD-FIELD-07 | P2 | 开发完成，待测试会话 | AssessmentItem.explain/Finding.note 生成后丢失 | C |
| RMD-FIELD-08 | P2 | 开发完成（deprecated），待测试会话 | FIRST_BATCH_MODULES 为无运行时消费者的旧知识 | E |
| RMD-MODE-01 | P1 | 开发完成，待测试会话 | 本期不开放案例学习；正式口径已更新，代码入口与保存边界待收口 | C |
| RMD-MODE-02 | P0 | 开发完成，待测试会话 | 修改能力会删除已完成记录 | B/C |
| RMD-MODE-03 | P1 | 开发完成（兼容读取保留），待测试会话 | userRole/examSetup 仍直接控制生产流程 | C |
| RMD-PRO-01 | P2 | 开发完成（轻量工作台），待测试会话 | 原专业工作台方案超出内部场景走读用途，需要降级为轻量测试支撑 | D |
| RMD-DOC-01 | P2 | 开发完成，待测试会话 | 位置“最多 3 个”与“不设硬上限”冲突 | A |
| RMD-DOC-02 | P1 | 开发完成（Debug 壳 + unsigned Release candidate），待测试验收与正式签名 | 手机网页与 Android APK 口径已统一，正式 APK 仍需验收后签名交付 | A/F |
| RMD-DOC-03 | P1 | 开发完成，待测试会话 | 双侧页面提示与正式流程冲突 | A |
| RMD-ARCH-01 | P1 | 部分完成（合同/历史投影已提取，stage 边界已修复；主组件进一步拆分待后续） | 主组件仍承担过多状态与记录语义 | B～E |

## 3.1 本批开发已落地内容（2026-08-27）

以下内容已经进入代码，状态表示“开发侧已完成”，不等于测试会话已经通过：

- 会话身份与生命周期：新增 `sessionId`、`problemThreadId`、`draft/completed/abandoned`，普通保存不再写完成时间；旧快照按兼容规则读取。
- 历史与持久化：快照升级到 v2，保留旧版本读取；服务器事件增加身份列和临床事件包络，草稿同步不计入完成会话。
- 临床记录合同：新增 BodyMark、ScoreRecord、SpecialTestRecord、ProfessionalNoteRecord、DecisionTrace 和被动活动度结构，并接入本地快照与同步事件。
- 字段接线：修复配对力量字段读取、医生就诊与医生限制混淆、触诊/被动活动/专项检查能力门控、学习解释入口，以及处理记录的 `sourceCaseIds` 追踪。
- 案例学习模式：本期生产入口关闭；旧 `study` 快照在规范化和服务端保存边界拒绝写入。
- 能力切换：变更检查能力时只重算待执行评估/处理路径，保留已经发生的检查、处理、复测、评分和会话历史，并记录能力快照编号。
- 内部工作台与手机载体：工作台继续加载正式 `RehabMindCompleteDemo`，增加场景隔离和 JSON 复现包导出；仓库新增 Android Debug WebView 壳及构建工作流。
- 历史投影收口：移除工作台运行时 `archivedSessions` 内存篮子，使用 `ProblemThreadRecord` 与 `SessionIndexRecord` 持久化问题线程/会话索引；旧 `archivedSessionHistory` 只保留迁移兼容，记录页按“案例 → 问题线程 → 会话”展示，归档追加 `problem_thread_archived` 事件。
- BodyMark 消费收口：当前结构化标记从工作台统一生成并写入快照/同步事件，在总结阶段按症状类型、人体标签和坐标完整性展示；展示层通过 `stage-domain-adapters` facade 引用类型，避免 stage 直接跨层导入 domain 实现。

本批开发会话只做类型检查和静态复核，没有代替测试会话执行整体回归、浏览器矩阵、真机或 APK 验收。当前开发侧仍需后续批次处理主工作台进一步拆分、正式 APK 签名交付和少量“只记录但未形成产品消费”的字段；测试会话负责按回归总表确认本批代码的行为结果。

### 3.2 本批提交与开发侧证据

| 提交 | 内容 | 开发侧检查 |
| --- | --- | --- |
| `b60f68a` | 将问题线程和会话索引正式投影到快照、保存记录和记录页；归档写入追加事件；移除运行时 `archivedSessions` 事实源。 | `npm run typecheck` 通过；测试契约由测试会话独立更新和执行。 |
| `977caa4` | 将结构化 BodyMark 接入当前快照/同步事件，并在总结阶段按症状类型和位置完整性只读展示。 | `npm run typecheck`、此前开发构建通过。 |
| `ab218d4` | 修复 stage 架构边界：`summary-stage` 通过 `stage-domain-adapters` 引用 `BodyMark` 类型，不直接导入 domain 实现。 | `npm run typecheck` 通过；等待测试会话重新执行 architecture boundary 和回归。 |

### 3.3 数据消费收口说明

本批已经把以下数据从“只写入或只存在内存”推进到可解释的消费链：

| 数据 | 当前写入位置 | 当前消费位置 | 仍需后续处理 |
| --- | --- | --- | --- |
| `problemThreads` / `sessionIndex` | 本地快照、保存记录、同步事件 | 记录页线程/会话树、归档事件 | 测试会话验证刷新、跨案例、归档/恢复和迁移兼容。 |
| `BodyMark` | 当前快照、保存记录、同步事件 | 总结阶段位置记录；结构化区域仍供既有安全/专项检查链路使用 | 继续把更多页面的字符串展示替换为统一投影；不能在未确认临床语义前扩大规则含义。 |
| `ScoreRecord`、专项检查、专业备注、`DecisionTrace` | 临床记录合同、快照/事件 | 现有流程结果、历史/同步和只读追踪链路 | 补齐完整记录页的版本比较和审计展示。 |
| 被动活动度、`sourceCaseIds`、`explain/note` | 评估/处理记录和决策追踪 | 结果、复测或追踪链路中的兼容投影 | 继续清理仍只有存储没有明确用户可见消费的字段。 |

因此，“整改方案完成”在开发侧的含义是：合同、写入边界、核心消费端和回退兼容已经落地；并不把测试会话的浏览器/整体/真机结论提前写成通过，也不把正式签名 APK 伪装成已交付。

---

## 4. 历史、会话与事件整改

### RMD-HIST-01：分离当前草稿与已完成会话

**通俗解释**

现在用户在中途点“保存”，系统就可能把它写成“第 1 次康复已完成”。整改后，“我先存一下”和“我正式结束了这次康复”必须是两件完全不同的事。

**专业定义**

建立 `SessionLifecycle = draft | completed | abandoned`。`session_draft_saved` 只更新当前草稿；只有明确的阶段结束动作才能产生 `session_completed`。`completedAt` 不得由通用保存函数自动生成。

**目标合同**

```ts
type RehabSession = {
  sessionId: string;
  problemThreadId: string;
  sessionNumber: number;       // 只用于显示顺序
  status: "draft" | "completed" | "abandoned";
  startedAt: string;
  lastDraftSavedAt?: string;
  completedAt?: string;
  assessmentRevision: number;
  dataCompleteness: "full" | "legacy-summary";
};
```

**实施步骤**

1. 将现有 `saveRecord` 拆成 `saveSessionDraft`、`completeSession`、`saveCaseForReferral` 三个明确命令。
2. 顶部“保存”、断网自动保存和“稍后继续”只调用草稿命令，不写 `completedAt`，不增加完成次数。
3. 总结页“保存本次记录”或明确的“保存并结束”调用完成命令。
4. 医学转诊可以结束当前会话，但必须保存 `completionReason=medical-referral`，不能伪装成完整康复完成。
5. 康复记录页分别显示“进行中的草稿”和“已完成的康复”，次数只统计完成会话。
6. 同一个已完成会话重复提交必须幂等返回原完成版本；需要更正时走 `supersededBySessionVersionId`，不得覆盖。

**旧数据迁移**

- 旧 `sessionHistory` 中有 `completedAt` 的条目迁移为 `legacy-summary` 完成会话。
- 只有当前快照、没有明确完成证据的记录迁移为草稿。
- 无法判断时宁可标记“历史摘要，完成状态不确定”，不能自动补成已完成。

**开发完成定义**

- 任意阶段普通保存后，`completedAt` 和完成次数不变化；
- 只有明确结束动作产生完成会话；
- 草稿恢复落点、待复测状态和未提交输入完整保留；
- 记录页不再把中途保存显示为已完成康复。

**测试会话验收接口**

开发交付稳定的命令/事件名称、快照示例和迁移夹具。测试会话据此覆盖中途保存、总结完成、转诊结束、重复提交和刷新恢复。

### RMD-HIST-02：引入稳定 sessionId 和 problemThreadId

**通俗解释**

“第 2 次”只是给人看的序号，不能当数据库身份证；同一个案例换了新部位或新伤，也不能继续沿用旧问题的评分。

**专业定义**

案例、问题线程和康复会话形成 `caseId → problemThreadId → sessionId` 三层身份。`sessionNumber` 是派生显示值，不参与唯一性、同步、反馈和冲突判断。

**目标合同**

```ts
type ProblemThread = {
  problemThreadId: string;
  caseId: string;
  regionGroup: string;
  chiefComplaintKey?: string;
  status: "active" | "resolved" | "archived";
  createdAt: string;
  closedAt?: string;
  supersedesProblemThreadId?: string;
};
```

**实施步骤**

1. 新案例创建时生成第一个 `problemThreadId` 和 `sessionId`，使用 UUID，不从部位或文本推导。
2. 开始下一次康复时生成新的 `sessionId`；重复打开同一草稿继续使用原 ID。
3. 新部位、新受伤或性质明显改变时创建新问题线程；仅修改错别字、目标或补充描述不新建线程。
4. 反馈、异常反应、评分、BodyMark、处理记录和远端保存全部携带真实 `sessionId/problemThreadId`。
5. 删除 `${identity}:session-${sessionCount}` 拼接逻辑和 API 的 `session-${number}` 默认回退。
6. 服务端拒绝 session 与 case/problemThread 不匹配的请求。

**迁移与兼容**

- 首次读取 v1 快照时，为每条旧摘要生成并持久化一次稳定 ID；以后不得重复生成。
- 旧会话缺少问题线程信息时归入 `legacy-primary-thread`，并标记 `dataCompleteness=legacy-summary`。
- 旧反馈只绑定 `sessionNumber` 时保留原字段，同时补 `legacySessionReference`，不强行绑定可能错误的 ID。

**开发完成定义**

- 同一草稿多次保存 ID 不变；下一次康复 ID 必变；
- 两个问题线程不能互相读取评分、标记或复测结果；
- 所有同步、反馈和事件不再以 `sessionNumber` 作为关联键。

### RMD-HIST-03：修复历史归档丢失与跨案例串显示

**通俗解释**

旧实现把“历史档案”放在页面内存里的临时篮子中：刷新就没了，新建案例时还可能把上一案例的篮子带过来。

**专业定义**

禁止组件级非持久化状态承载临床归档。历史归属必须由 `caseId/problemThreadId` 明确表达；创建新案例必须清除所有旧案例的派生展示状态。

**开发实现（批次 A/B）**

1. 已移除组件运行时 `archivedSessions` state；它不再承担任何临床历史事实。
2. 使用 `ProblemThreadRecord.status=archived` 表达线程归档，归档只更新线程状态，不移动、复制或删除完成会话。
3. 当前快照和保存记录携带 `problemThreads`、`sessionIndex`；旧 `archivedSessionHistory` 只在迁移层保留兼容读取。
4. 记录页按“案例 → 问题线程 → 会话”展示；归档写入 `problem_thread_archived` 追加事件。
5. 新建/恢复案例时由 `caseId/problemThreadId` 重新建立当前投影，禁止旧案例的页面派生状态继续显示。

**开发完成定义**

- 刷新前后历史数量一致；
- 新案例看不到旧案例历史；
- 修改备注或补充症状不会删除已完成会话；
- 页面关于历史保存的每一句文案都可由持久化数据证明。

测试会话需要重点验证上述行为；开发会话不代替刷新、跨案例切换、归档和恢复的整体回归。

### RMD-HIST-04：让 case_events 能重建临床历史

**通俗解释**

现在事件表只记“用户保存过”，没记“当时具体保存了什么”。整改后，事件本身要能回答某次康复发生了什么。

**专业定义**

将 `case_events` 从技术操作日志升级为“技术元数据 + 结构化临床事件”。当前快照只负责恢复当前草稿和投影；完成会话、观察、更正和失效必须存在不可改写事件。

**建议事件类型**

- `problem_thread_started`
- `session_draft_saved`
- `session_completed`
- `observation_added`
- `assessment_recorded`
- `treatment_completed`
- `score_recorded`
- `record_superseded`
- `capability_profile_changed`

**实施步骤**

1. 定义带版本的事件 envelope：`eventSchemaVersion/caseId/problemThreadId/sessionId/occurredAt/source/payload`。
2. `session_completed` 事件携带完成会话的完整不可变摘要，而不是只有 `sessionNumber`。
3. 评分、标记、能力快照和处理记录使用稳定 ID，可被完成事件引用。
4. 服务端保存进度时校验事件身份与快照身份一致；同一事件 ID 不同内容继续返回冲突。
5. 后台详情增加“临床时间线”和“当前快照”两个区域，避免把当前 JSON 当成历史。
6. 当前 `timeline.ts` 继续验证序列完整性，并增加 session/thread 引用完整性验证。

**部署顺序**

1. 先发布可读取 v1/v2 事件的服务端；
2. 再发布写 v2 事件的客户端；
3. 观察一个发布周期后才停止写旧摘要字段；
4. 不修改既有事件，只在读取时标记其为 `technical-only`。

**回滚**

回滚版本必须仍能忽略未知 v2 事件并读取当前快照；因此 writer 开启前必须先完成 reader 兼容。

---

## 5. 核心临床数据合同整改

### RMD-MARK-01：实现正式 BodyMark

**通俗解释**

人体图上的一个点不能只剩“右侧膝内侧”这句话。系统还要知道它是什么症状、在哪个视角、谁确认的、什么时候建立、后来是否被改掉。

**目标合同**

```ts
type BodyMark = {
  markId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  symptomKind: "complaint" | "swelling" | "bruise" | "tenderness" | "sensory";
  side: "left" | "right" | "midline" | "bilateral";
  regionId: string;
  areaId: string;
  surface: "front" | "back" | "medial" | "lateral" | "dorsal" | "plantar";
  xNormalized?: number;
  yNormalized?: number;
  zoneId?: string;
  humanLabel: string;
  source: "user" | "parser-suggestion" | "legacy-migrated";
  status: "suggested" | "confirmed" | "invalidated";
  createdAt: string;
  confirmedAt?: string;
  invalidatedAt?: string;
  invalidatedByMarkId?: string;
};
```

**实施步骤**

1. 位置组件回传 `BodyMarkDraft`，不再自行拼接业务 ID。
2. 解析器建议写 `source=parser-suggestion/status=suggested`，只有用户确认后才进入 confirmed 集合。
3. 主诉、肿胀、淤青、压痛和麻电使用同一实体、不同 `symptomKind`，页面仍可分标签显示。
4. 删除标记改为 `invalidated`；当前视图过滤失效项，历史仍可回放。
5. 切换主要大部位时展示“保留哪些、失效哪些、新建问题线程还是取消”，用户确认前不修改数据。
6. 同一主要大部位不设硬数量上限；后续检查和处理按标准区域去重，不按点数膨胀。
7. `BodyMark` 进入安全、膝决策、总结和后续康复，不再只传压平字符串。

**旧数据迁移**

- 旧 `LowerLimbLocationSelection` 转成 `source=legacy-migrated/status=confirmed`；
- 已知 zone 时保存 `zoneId`，没有真实点击坐标时保持坐标为空并标记 `coordinateCompleteness=zone-only`，不得伪造中心点；
- 旧肿胀/压痛/麻电数组分别映射对应 symptomKind。

**开发完成定义**

- 解析建议和用户确认可区分；
- 换侧、换视图和重渲染不丢点；
- 换大部位必须二次确认；
- 删除后可从事件历史看见原标记及失效时间；
- 同区域多点不会生成重复处理卡。

### RMD-SCORE-01：实现 ScoreRecord

**通俗解释**

一个数字“5”本身没有意义，必须知道它是哪个动作、哪一侧、什么时候、在处理前还是处理后记录的。

**目标合同**

```ts
type ScoreRecord = {
  scoreRecordId: string;
  caseId: string;
  problemThreadId: string;
  sessionId: string;
  assessmentRevision: number;
  scoreState: "unselected" | "confirmed" | "superseded" | "not-applicable";
  value?: number;
  actionId?: string;
  directionId?: string;
  side?: "left" | "right" | "bilateral" | "midline";
  stage: "intake" | "assessment" | "treatment-retest" | "training-retest" | "followup";
  context: string;
  scaleVersion: "nrs-0-10-v1";
  source: "user" | "professional" | "legacy-migrated";
  recordedAt: string;
  supersedesScoreRecordId?: string;
};
```

**实施步骤**

1. 保留 `ScoreSlider` 的 `selected` 交互，但提交时生成 ScoreRecord，而不是只更新 number。
2. 当前页面可缓存 `latestScoreByContext`，缓存不是事实源。
3. 评分比较统一调用 `isComparableScorePair`，严格核对问题线程、动作、方向、侧别、场景和量表版本。
4. 双侧、无固定动作、无法完成和未测试写状态，不生成虚假的整体数字变化。
5. 修改评分生成新记录并 supersede 旧记录；旧值留在历史。
6. `TrialRecord` 引用 `beforeScoreRecordId/afterScoreRecordId`，不复制缺少上下文的裸数字作为唯一依据。
7. 会话摘要的开始/结束分改为 ScoreRecord 引用或明确的派生展示，不再作为原始事实。

**旧数据迁移**

- `confirmed=true` 转 confirmed；未确认数字转 unselected；
- 历史摘要里的数字标记 `context=legacy-session-summary`，缺少动作/侧别时不参与正式趋势；
- 旧 0 分只有确认标记存在时才迁移为 confirmed 0。

**开发完成定义**

- 0 分与未选择在数据层完全不同；
- 修改评分不覆盖旧记录；
- 不同动作、侧别或方向不显示数值趋势；
- 每个页面展示的前后变化都能回指两个 ScoreRecord ID。

### RMD-SPECIAL-01：补齐专项检查记录合同

**通俗解释**

专项检查不能只存“阳性/阴性”。还要知道为什么做、谁能做、是否做完、是否出现平时熟悉的症状，以及为什么停下。

**目标合同**

```ts
type SpecialTestRecord = {
  specialTestRecordId: string;
  assessmentId: string;
  triggerSnapshot: { ruleId: string; matchedEvidenceIds: string[] };
  operationTarget: "self" | "other" | "study";
  capabilitySnapshotId: string;
  result: "negative" | "positive" | "painful-indeterminate" | "not-tested" | "stopped";
  familiarSymptom: "yes" | "no" | "unsure" | "not-applicable";
  stopReason?: "pain" | "fear" | "cannot-perform" | "safety-signal" | "equipment" | "other";
  note?: string;
  recordedAt: string;
};
```

**实施步骤**

1. 生成专项检查时保留 trigger rule 和命中的证据 ID，不在映射到 AssessmentItem 时丢弃。
2. 页面显示类别、专业名称、适用前提、结果用途和停止出口。
3. `skip` 拆成未测试及具体原因；疼痛无法判断不得按阳性或阴性进入决策。
4. 完成记录绑定当时能力快照；后续修改能力不改变历史记录。
5. 只有与主诉高相关且权限满足的专项检查进入建议/可选队列。
6. 任何单项阳性仍只生成“提高检查优先级”，不直接生成结构诊断。

**开发完成定义**

- 每条专项结果具备触发证据、能力快照、结果和停止原因；
- 未测试不会被当作阴性；
- 修改能力后旧结果仍可读，新候选按当前能力重新生成。

---

## 6. 明确接线错误整改

### RMD-WIRE-01：配对力量 finding 使用自身症状字段

**问题**

配对力量已采集 `pairedStrengthLocations/type/score`，但 finding 使用了活动检查的 `discomfortLocation/type/symptomScore`。

**实施步骤**

1. 新建纯函数 `pairedStrengthFindingFromRecord`，输入只允许 pairedStrength 字段。
2. finding 的 detail、score、tags 和 side 全部从配对力量记录生成。
3. 膝工作流适配器与通用 finding 复用同一个转换函数，删除两套映射。
4. 若配对力量复用活动不适，必须显式保存 `symptomSourceRecordId`，不能通过字段回退猜测。
5. 旧快照只有普通不适字段时保持“历史详情不完整”，不复制成配对力量事实。

**开发完成定义**

- 结果页、问题台账和膝决策显示相同的位置、性质和分数；
- 修改活动不适不再改变已记录的配对力量不适；
- 配对力量位置可进入相关训练/处理依据，但不会生成重复疼痛目标。

### RMD-WIRE-02：区分既往就医与医生限制

**问题**

“看过医生”只是既往经历；“医生限制负重或活动”才是当前约束。两者合并会无条件压低训练阶段。

**目标字段**

```ts
type MedicalGuidance = {
  reviewedByClinician: boolean;
  restrictionState: "none-reported" | "restricted" | "cleared" | "unknown";
  restrictionDetails?: string;
  source: "user-report" | "imaging-selection" | "legacy-migrated";
};
```

**实施步骤**

1. `priorCare.includes("看过医生")` 只设置 reviewedByClinician。
2. 训练门控只认明确 `restricted`，`unknown` 显示补问，不自动当限制也不自动当放行。
3. “医生已允许按建议康复”映射 cleared；“医生有限制”映射 restricted。
4. 有限制时要求用户选择或填写负重、活动范围、动作和期限，至少允许“不清楚具体限制”。
5. 总结和后续康复继续展示限制状态，直到用户明确更新。

**开发完成定义**

- 单纯看过医生不再强制训练阶段 1；
- 明确限制仍能可靠阻止进阶；
- 限制来源和更新时间可追溯。

---

## 7. 已采集但未有效消费的字段整改

### RMD-FIELD-01：让 professionalNotes 可找回、可版本化

**定位**

专业备注不是决策事实，不应直接改变候选；但它也不能只埋在管理员原始 JSON 中。

**实施步骤**

1. 将备注从 IntakeState 普通字符串升级为 `ProfessionalNoteRecord`，包含 noteId、sessionId、authorType、createdAt、updatedAt 和 supersedesNoteId。
2. 康复思路工作台右侧增加“专业备注”区；总结详细记录和恢复案例时可查看、追加和更正。
3. 备注与患者原话、确认事实、系统推断分栏显示。
4. 备注不得进入 finding 或候选排序；若用户希望把假设变成检查事实，必须通过正式检查记录。
5. 导出继续脱敏自由文本，后台完整查看保留审计。

**完成定义**：用户保存、恢复和进入下一次康复后都能找到原备注；修改产生版本，不改变既有临床事实。

### RMD-FIELD-02：处理 passiveMeasuredAngle 黑洞

**决策**

保留该字段，但从自由字符串改为结构化角度记录；如果本期不准备做趋势，界面应明确“仅本次参考”并在总结中显示，不能采集后完全消失。

**目标合同**

```ts
type RangeMeasurement = {
  measurementId: string;
  actionId: string;
  side: string;
  mode: "active" | "passive";
  valueDeg: number;
  method: "estimated" | "goniometer" | "other";
  recordedAt: string;
};
```

**实施步骤**

1. 输入限制为 0～360 的数字，角度符号只负责显示。
2. finding 详细信息、评估总结和下一次同方向比较显示主动/被动角度。
3. 趋势只比较同动作、同侧、同模式和同测量方法。
4. 旧字符串尝试安全解析；无法解析时保留 legacyRaw，不参与计算。

**完成定义**：填写被动角度后，当前结果、保存恢复和对应方向后续比较都可见。

### RMD-FIELD-03：保留 sensoryLocations 的结构信息

**问题**

当前麻电标记最终主要压成一段文字，侧别、区域和视角没有完整进入安全与后续观察。

**实施步骤**

1. sensoryLocations 迁移为 symptomKind=sensory 的 BodyMark 集合。
2. 安全分流和专项触发接收结构化标记，同时保留文字用于搜索和展示。
3. 后续康复比较标准区域集合的扩大、缩小、近端化和远端化，不只比较字符串是否相等。
4. 新发或向远端扩大的麻电写 observation event，并触发停止规则。
5. 双侧麻电按侧分别保存，不合并成一个全局结论。

**完成定义**：每个麻电区域都能按侧追踪；字符串变化不再导致结构信息丢失。

### RMD-FIELD-04：让基础触诊能力真正参与权限

**问题**

用户可以勾选“基础触诊”，领域核心也生成 `canPalpate`，但生产流程没有读取它。

**整改方案**

1. 不继续使用含义模糊的单一 `canPalpate`，改成 `palpationMode = none | self-light | professional-basic`。
2. 自助和“康复思路·自己”默认只允许低风险自我轻按；不要求声明专业触诊能力。
3. “康复思路·别人”只有声明基础触诊时开放专业触诊记录和肌张力比较。
4. 没有专业触诊能力时，相关项目显示“需要另一位人员协助”或允许跳过，不阻塞其他评估。
5. 任何刺痛、麻电、循环变化或安全风险继续覆盖触诊权限。

**完成定义**：勾选和取消触诊能力会改变对应字段和候选，但不会删除历史，也不会影响低风险自我轻按。

### RMD-FIELD-05：接通 learningExplanation

**目标**

学习解释只改变文字，不改变检查、权限、排序和结果。

**实施步骤**

1. 在“康复思路·自己/别人”的工作台设置中增加“显示学习解释”开关，默认关闭；该开关不依赖、也不重新开放案例学习模式。
2. 建立纯展示函数 `buildLearningExplanation(decisionTrace)`，输入只读当前已生成证据和下一步。
3. 只在顺序难理解、分支变化、改善但不能结束、肌肉转关节/训练或证据不足时显示。
4. 解释不参与任何 useMemo 决策依赖，不写回 finding，不改变版本。
5. 保存开关作为用户展示偏好；解释文本本身不作为临床事实写历史。

**完成定义**：开关前后所有按钮、候选、顺序、评分和停止条件完全一致，只有解释文字变化。

### RMD-FIELD-06：保存 sourceCaseIds 和规则来源

**定位**

`sourceCaseIds` 是内部可追溯性，不应直接把病例编号堆给普通用户，但必须进入决策追踪和后台审查。

**实施步骤**

1. 新建 `DecisionTrace`，保存 findingIds、relationIds、ruleIds、sourceCaseIds、knowledgeVersion 和 decisionVersion。
2. TrialTarget、最终选中候选和 TrialRecord 都引用 traceId。
3. 普通用户只看到“依据当前活动/症状/复测”；康复思路模式在用户开启学习解释后可看到压缩来源类型；管理员可查看完整内部 ID。
4. 完成会话保存当时 trace，不根据新知识版本重新解释旧记录。

**完成定义**：任一已执行处理都能回指当时的 finding、规则、关系和知识版本。

### RMD-FIELD-07：消费 explain/note，而不是生成后丢弃

**实施步骤**

1. 明确 `AssessmentItem.explain` 属于知识层说明，`Finding.note` 属于派生展示，两者不能同时作为事实源。
2. 统一为 `explanationKey` 或结构化 explanation template，由学习解释展示函数按需读取。
3. 默认模式不显示长解释；康复思路工作台只在用户开启学习解释且满足 RMD-FIELD-05 条件时显示一句。
4. 未被任何正式场景引用的 explain 条目进入内容清理清单。

**完成定义**：代码中不再存在写入 Finding.note 后无消费者的链路；解释开关关闭时不影响决策。

### RMD-FIELD-08：清理 FIRST_BATCH_MODULES 旧知识

**问题**

该文件定义整套旧模块和 `inferModule`，当前运行时只有类型被引用，容易让维护者误以为它仍是正式知识源。

**实施步骤**

1. 将仍需要的 `ModuleId/TreatmentCandidate` 类型迁到中立类型文件。
2. 对比旧模块与 `full-demo-content`、膝踝正式知识，确认没有独有且仍有效的首发内容。
3. 有价值但未迁移的内容先进入知识审核清单，不直接复制进生产。
4. 标记文件 deprecated 一个发布周期；确认无运行时和测试消费者后删除或移入 archive。
5. 文档中心只列唯一正式知识实现文件。

**完成定义**：生产构建不包含旧模块数据；类型不再从旧知识文件导入；不存在两套可被误编辑的膝踝知识。

---

## 8. 模式与能力整改

### RMD-MODE-01：本期关闭案例学习模式并封堵遗留路径

**产品裁定**

本期不开放案例学习模式。生产只保留“自助康复”“康复思路·自己”“康复思路·别人”三种可达工作流。`learningExplanation` 是康复思路模式中的展示开关，不等于案例学习模式。

**通俗解释**

既然这期不让用户进入“拿案例练习”，代码里也不能留一条半开半关的暗门。否则以后某个入口、旧链接或旧快照误把它打开，学习数据可能被当成真实健康记录保存。

**实施步骤**

1. 删除或隐藏所有案例学习入口、路由、菜单、引导文案、开发工具入口和对外可构造的 query 参数。
2. `WorkflowProfile` 的生产可选值不再包含可进入的 `study`；若为了读取旧数据暂时保留该枚举，必须标记 deprecated，且只能进入“不支持此旧模式”的只读恢复页。
3. 清理仅为案例学习准备、且没有其他消费者的页面分支、state 和保存逻辑，避免长期存在不可达代码。
4. 持久化边界继续保留防御性保护：任何遗留 `study/canRecord=false` 输入都不得创建 case、problemThread、session、反馈、复诊日期或远端进度。
5. 旧学习草稿如实际存在，迁移为独立的 `unsupported-study` 非临床数据；不自动转换成真实案例。确认没有用户数据后才可删除该命名空间。
6. 将正式产品文档中的案例学习入口移到“未来候选能力”，不得出现在本期导航、发布说明和用户帮助中。
7. 保留 RMD-FIELD-05 的学习解释功能，但入口只位于两种康复思路实际操作模式中，且只改变文字说明。

**回滚边界**

本项不设置“重新开放案例学习”的运行时开关。若未来要开放，应重新立项，补齐独立数据空间、案例来源、保存策略和发布验收，不能简单恢复旧入口。

**完成定义**：生产 UI 和公开路由无法进入案例学习；遗留 study 输入在本地仓储、SQLite、反馈、同步和复诊五个边界均拒绝写入；康复思路的学习解释仍可独立按需开启。

### RMD-MODE-02：能力变化只失效未执行方案

**通俗解释**

用户改成“这次不能做被动检查”时，不应该把已经完成的检查和处理全部抹掉；只应停止接下来不再有权限做的内容。

**专业方案**

1. 每次能力声明生成不可变 `CapabilitySnapshot` 和 snapshotId。
2. AssessmentRecord、SpecialTestRecord、TrialRecord 保存完成时的 capabilitySnapshotId。
3. 修改能力生成 `capability_profile_changed` 事件，增加 planRevision，但不删除已完成记录。
4. 尚未执行的评估和处理重新计算；旧计划标记 `invalidated` 并保存 invalidationReason。
5. 已完成证据继续作为历史事实；当前是否允许继续操作只看新能力。
6. 若用户表示“之前的能力声明填错了”，提供单独更正流程，显式 supersede 受影响记录，不能普通切换时自动删除。

**开发完成定义**

- 取消关节能力后未执行关节候选立即消失；
- 已完成 PROM/处理记录仍可查看并保留旧能力快照；
- 不相关的主动活动、评分和训练反馈不受影响。

### RMD-MODE-03：移除 userRole/examSetup 的生产控制权

**实施步骤**

1. `candidateIsAvailable` 改接收 WorkflowProfile/CapabilityPolicy，不再接收 role 字符串。
2. AssessmentStage 的选项、专业文案和检查方式只根据 productMode、operationTarget 和 capabilities 派生。
3. `userRole/examSetup` 只在 `normalizeLegacyIntake` 中读取；新快照不再写入或标记 deprecated。
4. 为候选 access 建立明确映射：self、professional-basic、professional-advanced，而不是 general/coach/rehab。
5. 增加架构边界检查：生产页面和领域决策不得直接读取 legacy role 字段；测试执行由测试会话完成。

**迁移**

旧 general/coach/rehab 按当前兼容函数一次性转换成 WorkflowProfile，并保存 migrationSource；无法确定的能力默认关闭。

**完成定义**：除迁移文件外，生产代码搜索不到以 userRole/examSetup 决定候选、字段或手法权限的逻辑。

---

## 9. 内部场景工作台整改

### RMD-PRO-01：停止专业生产工作台扩建，保留轻量场景走读工具

**产品定位**

该工作台的首要使用者是项目负责人，目的是选择场景并亲自走完整流程、复现问题和观察分支，不是当前对外开放的专业批量评估产品。因此不建设三栏专业生产工作台、AssessmentBatch、自定义专业检查和另一套高密度评估页面。

**当前已有基础**

现有内部测试工作台已经复用真实 `RehabMindCompleteDemo`，提供 14 个批准场景起点，并区分 `full_flow` 与 `page_boundary`。它还具备测试批次、场景 ID、测试数据隔离、重新开始、复制场景、清除草稿、复制案例编号、打开后台记录和按批次删除等能力。继续建设应在这些能力上补缺，不应另起一套业务 UI。

**保留整改的实际意义**

轻量整改仍有意义，但目标是让“发现问题后能稳定复现和交给开发”，不是提高专业临床录入效率：

1. 场景启动后必须进入真实生产工作台和真实 orchestrator，测试工具不得复制简化规则。
2. 完整流程场景从合法起点开始；页面边界场景明确标记为预置状态，不能冒充纵向流程证据。
3. 测试案例使用独立 case identity、存储命名空间、`testRunId/scenarioId` 和服务器标记，不污染正式案例和运营指标。
4. 工具栏显示当前场景、运行批次、应用版本、快照版本和当前阶段，便于截图和复现。
5. 增加“导出复现包”：包含脱敏快照、场景 ID、版本、当前阶段、最近命令/事件和错误信息；不得包含访问凭证。
6. 增加只读决策追踪入口，查看当前 finding、候选、过滤原因、排序依据和复测去向；不允许在追踪面板中直接篡改生产状态。
7. 保留重新开始、复制和按批次清理；任何清理操作只能作用于当前 `testRunId`。
8. 工作台可在手机网页和调试 APK 中打开，用同一场景复查真实触摸、软键盘、返回键、恢复和 WebView 存储行为。

**明确不做**

- 不建设面向外部专业用户的三栏工作台；
- 不新增批量专业评估、自定义检查和专业版候选规则；
- 不让场景目录成为第二套业务真相；
- 不把测试预置快照当成完整纵向流程证据；
- 不由开发会话执行测试结论，开发只提供稳定工具和修复缺陷。

**开发完成定义**

- 项目负责人能选择场景并进入真实生产流程；
- 任一发现都能导出不含凭证的复现包；
- 测试数据与正式数据、指标和普通用户入口隔离；
- 同一场景可在桌面网页、真实手机浏览器和调试 APK 中复用；
- 不新增专业生产工作台及其独立业务规则。

---

## 10. 文档和文案整改

### RMD-DOC-01：统一位置数量规则

**裁定建议**

以优先级更高、内容更具体的决策规则为准：同一主要大部位内精确位置不设 UI 硬上限，后续按标准处理单元去重。产品设计开头“最多三个”改成“首屏可折叠展示，继续添加不丢点”。

**实施步骤**

1. 修改产品设计第 15 行；
2. 保留 picker 默认无限制，删除仍传 `maxSelections=3` 的生产调用；
3. 位置较多时只优化展示，不截断数据；
4. 多主要大部位仍建立独立 problemThread，不混入同一处理队列。

**完成定义**：四份正式文档、页面文案和生产行为只剩一套数量口径。

### RMD-DOC-02：统一手机端支持范围

**产品裁定**

手机端需要正式开放。交付范围同时包含 320、360、390、412、430px 手机网页，以及可安装的 Android WebView APK。最终签名 APK 仍在网页和 VPS 验收后交付，但不能等到最后才第一次进入 WebView：手机网页基本布局稳定后即建立内部调试壳，用真实 Android WebView 提前发现外壳问题。

**目标形态**

- 手机网页继续承担全部康复业务、数据保存和版本升级；
- Android App 使用独立纯壳 WebView，不复制一套康复决策代码；
- App 名称为 `RehabMind 康复助手`，包名为 `com.yueshu.rehabmind`；
- 首页加载正式 VPS 的 `/RehabMind/` 路径；
- 当前不承诺 iOS App，也不借 APK 立项扩展摄像头、推送或其他原生能力。

**APK 交付前的分层兜底**

| 层级 | 载体 | 主要发现的问题 | 不能替代什么 |
| --- | --- | --- | --- |
| M1 | 浏览器 320/360/390/412/430px 视口 | 横向溢出、断点、抽屉遮挡、按钮尺寸和信息密度 | 不能证明 Android 系统、真实触摸、输入法和 WebView 行为 |
| M2 | Android Emulator 的目标系统版本 | Android 分辨率、系统字体、旋转、软键盘、Chrome/WebView 基础行为和多系统版本组合 | 不能证明真机性能、厂商系统差异、实际触摸和弱网波动 |
| M3 | 真实 Android 手机 Chrome 访问测试/VPS 网页 | 触摸、长页面、软键盘、系统字体、旋转、弱网和浏览器存储 | 不能证明 App 返回键、进程恢复和 WebView 外链策略 |
| M4 | 真实 Android 手机上的内部 debug WebView 壳 | 系统返回、Cookie/IndexedDB、杀进程重开、外链、下载、断网、加载失败、状态栏和软键盘 | 不能证明正式签名、覆盖安装和发布升级 |
| M5 | release candidate 签名 APK | 安装、覆盖升级、签名、versionCode、正式域名和发布配置 | 这是交付前最后外壳确认，不能省略 |

浏览器模拟只能兜住布局，Android Emulator 能扩大系统版本覆盖，但两者都不能等价于真实手机。要在最终 APK 交付前把 App 特有问题尽量前置，M4 调试壳必须早建；仍无法承诺“百分之百无设备差异”，最终至少要在目标 Android 版本和一台真实常用设备上确认 release candidate。

**实施步骤**

1. 根 README、文档中心、产品设计和发布说明统一写明：手机网页属于正式维护范围，Android APK 在手机网页和 VPS 人工验收通过后构建并开放。
2. 完成手机网页的顶部上下文、阶段抽屉、单列正文、本次记录抽屉和底部当前操作；主要操作不得依赖横向滚动。
3. 手机网页基本布局稳定后立即在独立 `rehabmind-mobile` Android 工程建立 debug build variant；调试壳允许配置受控测试地址，用于真实 Android/WebView 走读，不对外分发。
4. release build 固定包名、图标、启动画面、正式首页和最小 Android 版本，只允许正式可信地址。
5. WebView 只允许可信主机和 RehabMind 路径留在 App 内；外部链接交给系统浏览器。
6. 支持系统返回键、Cookie、IndexedDB、文件下载、软键盘、断网与加载失败页面、重新打开恢复和版本标识。
7. 建立独立签名密钥管理、versionCode/versionName 规则和自动构建产物；签名材料不得提交仓库。
8. 网页业务更新不要求重发 APK；只有包名、权限、图标、原生行为或最低外壳版本改变时更新安装包。
9. VPS 人工任务验收通过后，将调试壳切换为 release candidate，使用正式域名、正式签名和正式版本执行最后外壳确认，再产生对外交付 APK。
10. 页面关于视频、视觉 AI、推送和其他原生能力继续保持未开放口径，不能把“有 APK”等同于“已具备全部原生能力”。

**开发完成定义**

- 320～430px 手机网页属于正式发布路径；
- 最终交付前已有可在真实 Android 手机上运行的内部调试壳，App 特有问题不集中到最后才发现；
- 能生成带版本、可安装、可升级的签名 APK；
- APK 与网页共用同一业务实现和正式数据接口；
- 断网、加载失败、系统返回、外链、软键盘和恢复均有明确外壳行为；
- README、文档中心、产品设计、发布说明和安装包版本页对交付范围表述一致。

**开发实施与手机验证交接**

1. 以现有 `clinic-mobile` 为参考新建独立 `rehabmind-mobile`，复用 WebView、HTTPS、Cookie/DOM Storage、下载、断网页和系统返回的成熟结构，但不直接共用包名、首页、资源或签名。
2. 建立 `debug/release` 两套配置：debug 只允许受控测试地址并开启 WebView 远程调试；release 固定正式 HTTPS 主机和 `/RehabMind/` 路径，关闭远程调试和任意地址输入。
3. 可信导航同时校验 scheme、host 和 path。可信 RehabMind 页面留在 App 内，其他 HTTPS 链接交给系统浏览器，非 HTTPS 和无法处理的 scheme 明确拒绝。
4. App User-Agent 追加不含个人信息的 `RehabMindApp/<shellVersion>`，网页版本页同时显示 shellVersion、webVersion 和 snapshotSchemaVersion，便于截图定位版本。
5. debug 壳提供诊断日志：启动、主框架加载、网络错误、导航拦截、下载、返回和恢复；日志不得记录案例正文、访问凭证、Cookie 或完整快照。
6. 实现 `WebView.saveState/restoreState` 与业务草稿恢复的边界：WebView 历史只负责页面导航，真实康复进度仍由网页本地草稿和服务器快照恢复，二者不能互相冒充。
7. 内部场景工作台保持权限保护，但可在 debug 壳中打开；场景 ID、testRunId、版本和当前阶段进入脱敏复现包，使桌面发现的问题可以在同一场景下用真机复查。
8. 开发先交付可构建、可安装、可启动和可诊断的载体，以及环境配置和行为合同；场景执行、设备覆盖和回归结论由测试会话负责。

**交给测试会话的最小设备与场景矩阵**

- 模拟器：最低支持系统、一个中间系统和当前目标系统；至少覆盖约 360px 与 412/430px 两类宽度。
- 真实设备：最低门槛为一台实际常用 Android 手机；正式开放前建议一台较旧/中低性能设备加一台较新设备。设备不足时必须在报告中保留厂商和系统覆盖风险，不能用浏览器模拟冒充真机结论。
- 关键场景：首次启动与建案、人体标记与长表单输入、软键盘和底部操作、保存后切后台/杀进程恢复、处理—复测—训练、断网保存与恢复同步、系统返回、外链与下载、WebView 更新、旧版覆盖安装后数据保留。
- 每个失败证据至少携带设备/系统/WebView 版本、shellVersion、webVersion、场景 ID、当前阶段、操作步骤和脱敏复现包。

**残余风险说明**

上述方案能显著前置问题，但不能承诺覆盖所有 Android 厂商、系统定制、WebView 版本和极端网络组合。正式开放门槛是“目标设备矩阵内没有阻断问题，矩阵外风险被明确记录”，不是“浏览器模拟无报错即视为手机端完成”。

### RMD-DOC-03：修正双侧提示

**问题**

页面提示用户另一侧另开评估，但正式设计和现有双侧核心要求同一主要大部位左右同时保留、同流程分别评估。

**实施步骤**

1. 将提示改为：“同一问题可同时标记左右两侧，并选择本次优先侧；不同大部位另建问题。”
2. 删除“双侧完整流程正在试用，受阻改为单侧”的降级文案；真实未支持的边界应精确说明，不让用户自行拆错历史。
3. 双侧 prioritySide 只决定顺序；对侧异常由项目级记录保存，不静默替换主诉优先侧。
4. 记录页和总结继续禁止生成单侧式总分变化。

**完成定义**：输入提示、评估、处理、复测、训练和总结对双侧语义一致。

---

## 11. 架构整改

### RMD-ARCH-01：按临床记录边界继续拆主组件

**关系说明**

本项是既有 `ARCH-02` 的开发侧细化，不重新否定已经完成的阶段组件拆分。当前问题是主组件仍拥有 5000 余行状态、finding 生成、会话历史、持久化和模式权限，导致上述数据合同难以安全落地。

**目标边界**

- `session-controller`：草稿、完成、观察、问题线程和恢复；
- `clinical-record-builders`：BodyMark、ScoreRecord、AssessmentRecord、TrialRecord；
- `workflow-profile-policy`：模式、对象、能力和候选权限；
- `finding-projection`：评估记录转 finding，解决配对力量双映射；
- `persistence-adapter`：本机/远端命令，不理解临床判断；
- 页面组件：展示和派发明确命令。

**实施顺序**

1. 先提取新数据合同和纯 builder，不改变 UI；
2. 再提取 session controller，替换 saveRecord/invalidateAfterIntake 的大清空逻辑；
3. 再统一 WorkflowProfile 权限；
4. 最后让内部场景工作台只通过公开 controller/command 驱动生产流程，删除对页面内部 state 的直接依赖。

**约束**

- 不进行一次性全文件重写；
- 每次只迁移一个事实源，旧路径在新路径接管后立即删除；
- 不为了测试复制简化业务模型；
- 不让页面组件直接操作 SQLite 或拼临床事件 JSON。

**完成定义**：页面不再负责构造会话身份、临床事件和权限规则；同一业务事实只有一个生产 builder/controller。

---

## 12. 数据版本、迁移与发布方案

### 12.1 快照版本

新增 `snapshotSchemaVersion=2`，至少包含：

- caseIdentity；
- problemThreads；
- activeSessionDraft；
- completedSessionIndex；
- BodyMark/ScoreRecord/CapabilitySnapshot 引用；
- 当前工作流投影和恢复位置；
- legacyMigrationMetadata。

### 12.2 四阶段发布

1. **Reader 版本**：能读 v1/v2，仍写 v1；
2. **Migration 版本**：本机和服务端读取 v1 后生成可重复、幂等的 v2，保留原始备份；
3. **Writer 版本**：新案例写 v2，新事件写结构化 payload；
4. **Cleanup 版本**：观察期后停止写 deprecated 字段，但继续读旧记录。

### 12.3 迁移纪律

- 迁移前备份 SQLite，并实际读取备份；
- 每条旧记录保存 migrationVersion、migratedAt 和原 schemaVersion；
- 旧数据缺失的信息使用 completeness 标记，不补猜；
- 迁移失败保留原记录和可导出入口，不覆盖；
- 数据库 migration 只新增，不修改已执行 SQL；
- 回滚前确认旧应用能忽略新增字段和事件类型。

## 13. 分批施工顺序

### 批次 A：立即热修与口径清理

包含：RMD-WIRE-01、RMD-WIRE-02、RMD-HIST-03 热修、RMD-DOC-01/02/03。

退出条件：不存在已知错误字段接线；新案例不显示旧案例历史；文档与双侧/手机/位置规则一致。

### 批次 B：身份和临床数据底座

包含：RMD-HIST-01/02/03/04、RMD-MARK-01、RMD-SCORE-01、RMD-MODE-02、RMD-ARCH-01 前两阶段。

退出条件：草稿和完成分离；稳定 session/thread 身份；旧历史不被覆盖；标记和评分有版本；事件可还原完成会话。

### 批次 C：模式、能力和字段消费

包含：RMD-MODE-01/03、RMD-FIELD-01～07、RMD-SPECIAL-01 基础合同。

退出条件：案例学习入口和遗留分支已关闭，遗留 study 输入无法写真实记录；权限只认 WorkflowProfile；已采集字段都有明确消费者或明确删除决定。

### 批次 D：内部场景工作台轻量支持

包含：RMD-PRO-01，以及 RMD-FIELD-06 的只读决策追踪入口。RMD-SPECIAL-01 的正式记录 UI 在批次 C 随现有评估页面完成，不等待新的专业批量界面。

退出条件：场景仍进入真实生产流程；测试数据隔离；复现包和只读决策追踪可用；同一场景可在桌面、真实手机网页和调试 APK 中走读；没有新增专业生产工作台。

### 批次 E：旧代码与知识清理

包含：RMD-FIELD-08、legacy role 字段停止写入、旧 builder 和重复映射删除、ARCH-02 收口。

退出条件：生产只剩一套知识、权限、会话和 finding 来源。

### 批次 F：Android APK 交付

包含：F0 内部 debug WebView 壳，以及 F1 正式签名、版本、自动构建和安装包发布。F0 在手机网页基本布局稳定后开始；F1 前置为本地发布门、VPS canary 和 VPS 人工任务验收均完成。

退出条件：生成正式签名、可安装、可升级的 APK；只加载可信 RehabMind 地址；系统返回、外链、断网、加载失败、软键盘、Cookie/IndexedDB、恢复和版本标识具备确定行为；APK 与网页共用同一业务代码和数据接口。

## 14. 文件级施工矩阵与交接边界

本节把前面的业务方案落到代码层。表中“主改文件”是当前走读确认的首选落点，不表示只能修改这些文件；实际提交若增加其他文件，必须在提交说明中补齐。新增领域文件应放在 `src/domain/rehab` 下，页面不得临时定义另一套同名合同。

### 14.1 批次 A：热修与口径

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-WIRE-01 | `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx`、`stage-domain-adapters.ts`、`src/domain/rehab/shared/knee-workflow-adapter.ts`；新增 `src/domain/rehab/assessment/paired-strength-finding-core.ts` | 先固定配对力量输入合同，再替换两处 finding 映射；不得顺带调整候选排序权重。 | 纯映射提交可单独回退。交付一组固定输入/输出夹具，包含“活动不适与力量不适故意不同”的样例，测试会话验证显示与决策使用的是力量字段。 |
| RMD-WIRE-02 | `confirmation-stage.tsx`、`training-stage.tsx`、`src/domain/rehab/training/training-stage-gate-core.ts`、`rehabmind-workbench.tsx`、`snapshot-schema.ts` | 先增加 `MedicalGuidance` 兼容读取，再替换 `priorCare` 的布尔推断；不得放宽明确医生限制和安全信号。 | 保留旧字段 reader 一个版本，writer 可由开关退回旧 UI，但不能删除已写新字段。交付 `none/restricted/cleared/unknown` 四类合同样例和训练门控结果。 |
| RMD-HIST-03（热修） | `rehabmind-workbench.tsx`、`components/records/rehab-records-page.tsx`、`workflow/session-history.ts` | 先停止跨案例串显示和静默清历史，再由正式问题线程投影承载归档事实；不再保留独立内存档案篮子。 | 热修与正式投影均可独立回退；测试会话负责刷新、建新案例、恢复案例、归档和线程树验证。 |
| RMD-DOC-01 | `docs/rehabmind-complete-product-design.md`、`docs/rehab-decision-framework.md`、`lower-limb-location-picker.tsx`、相关页面文案 | 只统一为“同一主要大部位不设硬上限、后续按标准区域去重”，不改变多大部位拆线程规则。 | 文档与调用参数同提交回退。交付最终文案和大于 3 个标记时的稳定 UI 标识。 |
| RMD-DOC-02（口径） | 根 `README.md`、`docs/README.md`、正式产品设计与发布说明 | 区分手机网页、Android APK、其他原生能力；明确手机网页和 APK 都是本轮交付，APK 在网页/VPS 验收后执行。 | 纯文档/文案提交可回退。交付支持矩阵：320～430px 手机网页正式维护、Android APK 待网页验收后构建、iOS 与额外原生能力未纳入。 |
| RMD-DOC-03 | `symptom-stage.tsx`、`src/domain/rehab/shared/bilateral-flow-core.ts`、总结与记录页文案 | 只修正提示和优先侧语义，不把两个不同大部位合并。 | 文案提交和逻辑提交分开，便于回退。交付左右标记、prioritySide 与总结投影的合同样例。 |

### 14.2 批次 B：身份、历史与核心记录

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-HIST-01 | `workflow/session-history.ts`、`workflow/workflow-commands.ts`、`controllers/workflow-command-adapter.ts`、`persistence/persistence-controller.ts`、`snapshot-schema.ts`、`components/records/rehab-records-page.tsx` | 先定义生命周期和三条命令，再改按钮调用；禁止继续用一个 `saveRecord` 同时表达草稿、完成和转诊。依赖 RMD-HIST-02 的稳定身份合同。 | Reader 保持 v1/v2；writer 通过功能开关切换。交付三条命令、幂等键、事件名称及草稿/完成/转诊夹具。 |
| RMD-HIST-02 | `local-case-identity.ts`、`snapshot-schema.ts`、`api/case-contracts.ts`、`feedback/feedback-context.ts`、`db/schema/pilot-schema.ts`、新增 Drizzle migration、案例 API/服务/SQLite repository | 身份必须由 UUID 生成并持久化，不能从序号或文本推导；数据库只新增迁移，禁止改已执行 SQL。 | 先 reader 后 writer；关闭新 writer 时旧应用仍能忽略新增列。交付同草稿重复保存、下一会话、新问题线程和身份不匹配四类 API 样例。 |
| RMD-HIST-03（正式） | `src/domain/rehab/history/session-identity-core.ts`、`workbench-support.tsx`、`rehabmind-workbench.tsx`、`rehab-records-page.tsx`、`snapshot-schema.ts`、`case-contracts.ts` | 依赖 problemThread；归档改变线程状态，不移动、复制或删除会话；旧 `archivedSessionHistory` 仅作迁移兼容。 | 回滚只关闭归档入口，已写线程/事件继续可读。交付 active/archived/resolved/superseded 线程合同、线程/会话索引投影和归档事件。 |
| RMD-HIST-04 | `db/schema/pilot-schema.ts`、新增 migration、`sqlite-pilot-case-repository.ts`、`case-service.ts`、`persistence/timeline.ts`、`app/api/pilot/cases/[caseId]/progress/route.ts`、后台详情页 | 事件 envelope 先版本化；当前快照是投影，不替代完成历史。依赖 HIST-01/02、MARK-01、SCORE-01 的稳定引用。 | Reader 必须先接受未知 v2 事件；writer 开关可停写新事件，但绝不删除已写事件。交付事件 JSON Schema、事件序列夹具和投影重建说明。 |
| RMD-MARK-01 | `lower-limb-location-picker.tsx`、`symptom-stage.tsx`、`rehabmind-workbench.tsx`、`summary-stage.tsx`、`snapshot-schema.ts`；`src/domain/rehab/records/body-mark-core.ts` 和 builder | UI 只产生 draft，再由领域 builder 生成身份和状态；不得给旧 zone-only 数据伪造坐标。当前工作台负责统一写入，Summary 负责只读消费；stage 通过 facade 引用类型。 | 保留旧数组读取和新旧双投影一个版本；关闭新 writer 后新标记仍可降级显示 humanLabel。交付五种 symptomKind、建议/确认/失效和 zone-only 迁移夹具。 |
| RMD-SCORE-01 | `components/shared/ui-primitives.tsx`、各评分阶段、`trial-record-builder.ts`、`trial-record-types.ts`、`snapshot-schema.ts`；新增 `src/domain/rehab/records/score-record.ts` | 先建立 0 与未选择的状态差异，再替换裸数字比较；趋势比较必须经过统一可比性函数。 | 旧数字字段保留只读投影一个版本；新 record writer 可停，但不得覆盖已写版本。交付 0/unselected/not-applicable、跨侧不可比和 supersede 样例。 |
| RMD-MODE-02 | `src/domain/rehab/shared/downstream-invalidation-core.ts`、`workflow/workflow-commands.ts`、`workflow-orchestrator.ts`、`rehabmind-workbench.tsx`、`snapshot-schema.ts`；新增 capability snapshot 合同 | 依赖稳定记录 ID；只重算未执行计划，完成记录不可进入普通清空集合。 | 先保留旧 invalidation 适配器但默认关闭；出现问题可切回旧计划投影，不得恢复删除历史的行为。交付能力变更前后 planRevision、已完成记录和未执行候选的快照差异。 |
| RMD-ARCH-01（阶段 1/2） | `rehabmind-workbench.tsx`、`components/workbench/stage-domain-adapters.ts`、`controllers/*`、`workflow/*`；新增/复用 `session-controller`、`clinical-record-builders`、`finding-projection` | 只提取纯合同、builder、投影和会话命令，不在同一提交重做 UI；每次迁移一个事实源。已完成历史/BodyMark 投影和 stage facade 边界修复，主组件继续分批拆分。 | 每个提取提交都保持旧 UI 可运行并可独立回退。交付公开函数签名、状态机命令和禁止页面直接构造临床事件的边界清单。 |

### 14.3 批次 C：字段消费、模式与能力

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-FIELD-01 | `rehabmind-workbench.tsx`、`summary-stage.tsx`、`rehab-records-page.tsx`、`snapshot-schema.ts`；新增 note record builder | 备注只进入展示和审计，不进入 finding、排序或自动结论；编辑产生 supersede。 | UI 可关闭，底层记录继续读取。交付追加、更正、恢复三种 note record 样例和脱敏投影。 |
| RMD-FIELD-02 | `assessment-stage.tsx`、`stage-domain-adapters.ts`、`motion-assessment-core.ts`、`summary-stage.tsx`、`snapshot-schema.ts` | 结构化角度只与同动作、同侧、同模式、同方法比较；本项不新增未经设计确认的医学阈值。 | 新输入 UI 可退回只读展示；legacyRaw 永久保留。交付可解析/不可解析旧值、主动/被动不可比和同条件趋势样例。 |
| RMD-FIELD-03 | `lower-limb-location-picker.tsx`、`symptom-stage.tsx`、`special-test-trigger-core.ts`、`snapshot-schema.ts`，复用 BodyMark | 依赖 MARK-01；安全规则消费标准区域集合，不再解析展示字符串。 | 可回退安全消费者到兼容投影，但结构化标记继续保存。交付左右侧、远端扩大、近端化和旧字符串迁移样例。 |
| RMD-FIELD-04 | `workflow-profile-core.ts`、`assessment-stage.tsx`、`muscle-tension-assessment-core.ts`、候选可用性核心、`rehabmind-workbench.tsx` | 使用 `palpationMode`，自我轻按和专业触诊分开；安全信号优先级始终高于能力。 | 能力入口可关闭，默认降级为最小权限。交付三种 palpationMode 对字段、候选和跳过原因的矩阵。 |
| RMD-FIELD-05 | `workbench-support.tsx`、`assessment-stage.tsx`、`summary-stage.tsx`；新增 `learning-explanation-core.ts` | 解释函数只读 DecisionTrace，不进入决策依赖；它是康复思路模式的展示偏好，不是案例学习模式。 | 可整体关闭解释 UI，不影响记录和候选。交付相同业务输入下开/关解释的领域输出必须相同，以及五类允许展示场景。 |
| RMD-FIELD-06 | `build-trial-targets-core.ts`、`trial-target-types.ts`、`trial-record-builder.ts`、`trial-record-types.ts`、`pilot-knowledge.ts`、`snapshot-schema.ts`；新增 DecisionTrace 合同 | 依赖稳定 finding/relation/rule ID；旧记录缺来源时标记 unknown，禁止用当前知识反推。 | 普通 UI 可隐藏 trace，存储不可丢；新 writer 可停。交付 traceId 到 finding/rule/sourceCase/knowledgeVersion 的完整引用样例。 |
| RMD-FIELD-07 | `pilot-decision-engine.ts`、`knee-workflow-adapter.ts`、`stage-domain-adapters.ts`、`workbench-support.tsx`、`full-demo-content.ts` | 明确知识解释和事实 note 的所有权；只保留一个解释模板来源。 | 展示层可关闭，决策输出不变。交付一条 explanationKey 从知识到 UI 的完整路径和无消费者清单。 |
| RMD-MODE-01 | `workflow-profile-core.ts`、`rehabmind-workbench.tsx`、`persistence-controller.ts`、`local-case-store.ts`、`api/case-client.ts`、相关入口/路由/开发工具 | 删除本期案例学习入口和死分支；遗留 `study/canRecord=false` 在所有持久化边界拒写。`learningExplanation` 继续作为康复思路模式的独立展示开关。 | 不提供重新开放的运行时开关；未来开放需重新立项。交付公开入口清单、遗留 study 恢复策略，以及本地、SQLite、同步、反馈、复诊五个拒写接口。 |
| RMD-MODE-03 | `workflow-profile-core.ts`、`assessment-stage.tsx`、`pilot-decision-engine.ts`、候选可用性核心、`snapshot-schema.ts`；新增 legacy normalizer | 先建立 WorkflowProfile 唯一入口，再逐个删除 role 分支；未知能力按最小权限。 | 保留仅用于读取的 legacy normalizer；新 writer 停写旧字段后不回退。交付旧 general/coach/rehab 到新 profile 的迁移矩阵。 |
| RMD-SPECIAL-01（合同与现有页面） | `special-test-trigger-core.ts`、`assessment-stage.tsx`、`full-demo-content.ts`、`snapshot-schema.ts`；新增 special-test record builder | 在现有评估页面完成正式记录 UI，不依赖新的专业批量界面；未测试、疼痛难判断、停止必须分开。 | 新字段可暂时只读，底层 reader 保持兼容。交付阳性/阴性/疼痛难判断/未测试/停止五类记录和能力快照引用。 |

### 14.4 批次 D：内部场景工作台轻量支持

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-PRO-01 | `src/features/rehabmind/test-workbench/pilot-test-workbench.tsx`、`scenario-catalog.ts`、测试命名空间 persistence/API、后台测试案例详情 | 继续复用真实 `RehabMindCompleteDemo` 和生产 orchestrator；只补版本上下文、复现包、只读 trace 和跨载体场景入口，不新增 AssessmentBatch 或专业生产 UI。 | 内部工具功能可独立关闭，不影响普通用户流程。开发交付场景元数据合同、脱敏复现包结构和 trace 只读接口；测试执行仍由测试会话负责。 |
| RMD-FIELD-06（内部追踪入口） | 测试工作台只读 trace 面板、后台测试案例详情 | 只展示生产 DecisionTrace 投影，不允许编辑 finding、候选、排序或流程状态；复现包删除访问凭证和不必要健康文本。 | 面板可关闭，trace 存储不回退。交付 trace 投影和脱敏规则。 |

### 14.5 批次 E：旧知识与架构收口

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-FIELD-08 | `src/knowledge/pilot/first-batch-modules.ts`、`full-demo-content.ts`、所有类型导入点、`docs/README.md` | 先迁类型、再做知识差异清单、经过一个发布周期无消费者后才删；不可把旧内容无审核复制到正式知识。 | 删除前保留归档或 git 可追溯提交；若发现遗漏，只恢复经过审核的单条知识。交付运行时引用清单、差异清单和唯一知识源声明。 |
| RMD-ARCH-01（阶段 3/4） | `rehabmind-workbench.tsx`、`controllers/*`、`workflow/*`、内部测试工作台适配器、架构边界配置 | 在 B/C 的 controller、policy、builder 已稳定后收口；内部工具也只能调用公开命令，不能读取页面私有 state。目标是删除重复事实源，不追求文件数量指标。 | 小步提交逐个回退；旧路径仅在新路径接管后删除。交付页面禁止项、领域公开 API 和重复 builder 清零清单。 |

### 14.6 批次 F：Android APK

| 编号 | 主改文件 | 前置条件与实施边界 | 回滚方式与测试会话接口 |
| --- | --- | --- | --- |
| RMD-DOC-02（F0 调试壳） | 独立 `rehabmind-mobile` Android 工程 debug variant、受控测试地址和 debug-only 网络配置 | 手机网页基本布局稳定即可开始；只供内部真实设备/WebView 走读，不对外分发，不使用正式签名，不复制领域逻辑。 | 调试壳可随时停用。开发交付可安装 debug 包、允许地址、版本和返回/外链/断网/软键盘/恢复行为说明。 |
| RMD-DOC-02（F1 正式 APK） | release variant、正式签名与构建配置、版本说明；网页侧版本/恢复页面 | 前置为网页和 VPS 人工验收通过；只允许正式可信地址，不借机增加摄像头、推送等原生范围。 | APK 回滚以 versionCode 和上一签名构建为单位，网页业务按 VPS 版本独立回滚。开发交付正式安装包、版本信息和外壳行为说明；外壳验证由测试会话执行。 |

### 14.7 状态流转规则

每项只允许按以下状态推进：`待实施 → 开发中 → 开发完成待测试 → 测试发现问题/测试通过 → 已关闭`。开发会话负责前三个状态和缺陷修复；测试会话负责测试结论。若某项因为产品裁定改变而取消，状态写为“已取消”，并必须附正式裁定文档，不能直接从总表删除。

开发把某项标记为“开发完成待测试”前，至少需要提交：数据合同或命令签名、旧数据兼容说明、用户可见变化、稳定 fixture、功能开关或回滚说明。测试会话不应从开发内部 state 名称猜业务结果，也不负责替开发补数据合同。

## 15. 每项开发交付模板

每个整改提交必须记录：

```text
整改编号：
设计依据：
当前错误行为：
目标行为：
修改文件：
新增/变更数据合同：
旧数据迁移：
用户可见变化：
不会改变的临床规则：
开发自检结果：
交给测试会话的场景和稳定接口：
回滚方式：
剩余风险：
```

## 16. 全部整改完成定义

只有同时满足以下条件，本文才能标记完成：

1. 草稿、完成会话、后续观察和问题线程身份真实分离；
2. 完成记录、评分和人体标记不因编辑静默覆盖或删除；
3. 任一已执行处理可回指证据、能力快照、规则和知识版本；
4. 案例学习模式本期没有可达入口，遗留 study 输入不会写入真实案例；
5. 生产权限不再直接依赖 userRole/examSetup；
6. 所有采集字段有明确的决策、展示、历史或审计用途；无用途字段已删除或归档；
7. 内部场景工作台继续复用真实生产流程，并具备测试数据隔离、脱敏复现包、只读决策追踪和桌面/手机/debug APK 场景复用；
8. 正式文档、README、页面文案和实现不再互相冲突；
9. 数据升级可迁移、可恢复、可回滚；
10. 开发将稳定合同、夹具和验收接口交付测试会话，测试结果由测试会话独立记录。
11. 手机网页进入正式维护范围，并完成与同一网页业务共源的 Android 签名 APK 交付。
