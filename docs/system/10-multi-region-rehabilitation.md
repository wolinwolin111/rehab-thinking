# 10 · 多关节多部位康复·拓展方案

> 文档状态：设计提案（v1，2026-09-06）｜ 作者：开发侧，基于本会话对全库代码的走读实测
> 定位：把"一次会话只处理一个部位一个问题"升级为"一案多链、按链推进、跨链谨慎归因"。本文是架构与实施设计；临床关系素材（CROSS-R01~07，P2 draft）仅作输入，不构成本方案的骨架。
> 关联：02 决策引擎、05 会话编排、06 数据持久化、04 内容目录、09 路线总览。

## 1. 目标与非目标

**目标**
- 一案并存多条问题链（如：膝＋踝、大腿后侧＋小腿后侧、未来的髋＋膝），每条链独立评估/处理/复测/训练状态。
- 跨链共享的功能动作（下蹲、单腿站、走路）只测一次、证据按链分记、归因互不污染。
- 安全与停止信号在病例级生效，但停止范围按"动作依赖"精确计算，不牵连无关链。
- 单部位单问题（现状全部流量）在新模型下是**退化情形**，行为逐字不变。

**非目标**（各自独立路线，见 09）
- AI 主诉收集、视觉评估、动作视频；新部位（颈肩腰等）的临床内容审核——本方案只备好接入接口。

## 2. 现状盘点：多线索子已存在，单区域假设集中在三处

### 2.1 已经天然支持"多"的部分（不需要重造）

| 能力 | 代码证据 |
|---|---|
| 三层身份 caseId/problemThreadId/sessionId，且**禁止由文本或数组位置推导** | session-identity-core.ts:2-7 |
| 快照 identity 段已含 `problemThreads[]` 与 `sessionIndex[]`，跨段校验强制"事实归属 sessionIndex" | snapshot-schema.ts:61-89,325-407 |
| 分数可比性已含 thread 维度（case/thread/action/direction/side/stage/context/scale 全同才可比） | score-record-core.ts:257-269 |
| 物理动作同一性归一（别名表、canonicalActionKey、KINEMATIC_LINKS）——"同一动作多链共享"的现成 join 键 | action-identity-core.ts:6-12,40-53,72-77 |
| 复测义务键已含 sessionId＋episodeId 两段，扩展维度有先例 | retest-ledger-core.ts:91-101 |
| 内容层区域无关：三库按 region 字段组织，helper 全部区域参数化；新部位接入是"填表"（04 §10 清单） | knowledge/actions/types.ts、index.ts |
| 决策核心多为纯函数、以 findings 为输入——链内逻辑可整体复用 | 02 §2 数据流全图 |

### 2.2 单区域假设的真实耦合点（要动的就这三层）

| 层 | 耦合点 | 证据 |
|---|---|---|
| 采集 | `intake.regionId` 单值；inferRegion 返回单一区域（词长加权计分） | workbench-support.tsx:1596；intake-complaint-core.ts:53 |
| 队列 | rankPilotAssessmentIds 内部按 region 分支扩组（踝四方向/膝基础组/大腿小腿象限），一次只跑一个区域的预算 | pilot-decision-engine.ts:215-397 |
| 工作流 | **workflow 段是会话全局**：stage(0-5)、assessmentRevision、treatmentPlanRevision、pendingRetestCount 各只有一个 | snapshot-schema.ts:276-289,401-405；workflow-orchestrator.ts:113-117 |

结论：**不需要重写决策引擎**。工作量集中在"把 workflow 段从会话级降到链级"＋"调度器"＋"采集层多区域化"。

## 3. 核心设计决策（八条）

**D1 链＝problemThread，不引入新身份。** 复用 identity 层已有的 problemThreads；`chainId ≡ problemThreadId`。避免"两套多问题概念"（这正是 08 教训：单一事实源）。

**D2 单链是退化情形，干净切换不迁移。** 新增 `chainId` 维度，缺省值 `"primary"`；现有全部数据/测试/快照在缺省下行为逐字不变。升 v4 合同按 v3 先例：拒绝旧版、不猜测补迁（snapshot-schema.ts:409-437 模式）。

**D3 工作流状态链作用域化。** workflow 段从 `{stage, assessmentRevision, treatmentPlanRevision, pendingRetestCount}` 变为 `chains: Record<chainId, {stage, assessmentRevision, treatmentPlanRevision, pendingRetestCount}>` ＋ 病例级 `{activeChainId, caseSafety}`。跨段不变量改写：`pendingRetestCount(链) = 该链 obligations(required&&pending)`；**activeChainId 必须指向 status=active 的链**。

**D4 共享动作：一次执行，证据分链。** 物理动作归一（canonicalActionKey）作 join 键：下蹲在膝链与踝链同时需要时，队列只出现一张卡；作答产生的 finding 按"位置×链"分别入账（现有 bodyMark/scoreRecord 已带 side 与 thread 维度，天然支持）；复测义务按链各生成一条（键里加 chainId），**一次实测可回填多条义务**（复用 batch-retest-compute 的多义务合成，batch-retest-compute.ts:25-46）。

**D5 跨链归因天花板＝趋势支持。** 继承现有铁律（候选是反应试验不是病因，02 §7；关系最高"趋势支持"），跨链假设只生成"条件性追加检查"，永不改写另一链的结论；两链同动作一好一坏时，禁止合并成单一"加重/改善"（SYS-RESULT-001 的跨链推广）。

**D6 安全病例级，停止按依赖闭包。** 红旗/转介类信号置病例级 `caseSafety`，锁全部链的高风险操作；但"处理加重→停止"只停该动作依赖闭包内的链（用 canonicalActionKey＋KINEMATIC_LINKS 计算），无关链继续。不良事件阶梯（adverse-response-core.ts:48-55）按链触发、病例级汇总。

**D7 调度器是纯函数，放 domain/shared。** `selectActiveChain(chains, caseSafety, lastSession)`：安全未决链＞用户显式优先＞上次未完成的 active 链＞最急性链；一次会话只推进一条主链，其余链状态原样保留。与 rankPilotAssessmentIds 同风格（可穷举、可契约测试）。页面不得自行猜链（05 §1 铁律延伸）。

**D8 内容层零新架构。** 新部位＝04 §10 清单填表；跨链标签膨胀时启用已预留的 `compensationTagsFor(id, region)` 升级（04 §10）；CROSS-R 关系审核通过后作为 pilot-knowledge 的 relation 进入（evidence 上限 P2→按审核结论），sourceCaseIds 溯源沿用 MULTI-001/002。

## 4. 数据模型（快照 v4 草案）

```
identity   + problemThreads[].{site, episodeId, status}      # 链挂部位与事件
domain     + chains: Record<chainId, {                        # 现有各段事实按链归组
             intakeSlice, assessments[], treatments[],
             retests{obligations,records}, training, history })
           + sharedFunctionalTasks[]                          # 跨链动作登记（join 结果，非事实源）
           + crossChainHypotheses[]                           # 关系假设，状态枚举封顶 trend-supported
workflow   + chains: Record<chainId,{stage,assessmentRevision,
             treatmentPlanRevision,pendingRetestCount}>
           + activeChainId + caseSafety
draft      + chainCursors（各链游标）
```

体积对策：1MB 快照上限（case-contracts.ts:267）在多链下会吃紧——链历史满 N 次后按"追加式历史不动、快照只留活动窗口"压缩（沿用 superseded 语义，不删事实）；上限提至 2MB 前先在 CI 加体积回归。

## 5. 决策引擎改造点（按文件）

| 文件 | 改动 | 性质 |
|---|---|---|
| intake-complaint-core / chief-action-core | 解析输出从单 region 改多候选区域（含"不合并、各自成链"判定：不同部位＋不同事件→两链） | 扩展 |
| workbench-support inferRegion | 保留为"首选区域"，新增 `inferChains()` 纯函数 | 扩展 |
| pilot-decision-engine rankPilotAssessmentIds | 入参加 chain 上下文；预算按链计（每链 4/5/6，不共享） | 参数化 |
| function-assessment-plan-core | 计划生成按链；共享动作标记 `sharedWithChains[]` | 参数化 |
| problem-ledger-core | destination 分派按链；新增"跨链假设→条件性检查"出口 | 扩展 |
| build-trial-targets-core | 候选池按链装配；共享动作去重升为病例级（treatmentKey 已含侧，再加链归属标签） | 参数化 |
| retest-obligation/ledger-core | 义务键加 chainId 段（8 段）；一次实测多义务回填 | 扩展 |
| training-progression/stage-gate | 分期按链独立；共享训练项只排一次、完成状态按链分记 | 参数化 |
| adverse-response-core | 病例级汇总＋按动作依赖闭包算停止范围 | 扩展 |
| workflow-orchestrator | 命令联合新增 `select-chain`/`open-chain`/`resolve-case-safety`；导航裁决按 activeChainId | 扩展 |
| downstream-invalidation-core | 18 组失效规则加链维度（上游变更默认只失效本链，共享动作例外扩到相关链） | 扩展 |

## 6. 编排与界面

- **guided**：用户不管理链。进入时调度器定 activeChain，页头一句"本次先处理：右膝下楼痛（另有 1 个问题待安排）"；六步流程即该链的流程；链完成→调度器提示下一链或结束。
- **thinking**：阶段工作台加链列表侧栏（每链 stage/待复测/安全标记），支持手动切换与优先序覆盖（记录 user-explicit）。
- **双侧×多链**：side 语义不变（链内左右），链间不互相"借侧"。
- 命令→页面翻译仍走唯一 adapter（05 §1）；链切换不产生新事实（D2 退化保证）。

## 7. 门禁与验收

- **新不变量（SYS-CHAIN-*）**：①activeChainId 必指向 active 链；②链的 pendingRetestCount 与该链义务一致；③共享动作一次执行多链回填不互相覆盖；④一链加重不停无关链；⑤跨链假设永不写"已证明导致"；⑥单链退化下全部既有断言逐字不变（回归锁）。
- 契约测试：调度器穷举（链状态组合×安全位）、义务键 8 段、失效闭包；变异测试扩到 selectActiveChain。
- 场景：scenario-catalog 增"膝＋踝双链""共享下蹲双链""一链加重他链继续"三场景（复用测试侧已建的 page_boundary 模式）。
- check:catalog/boundaries/golden 全部沿用；新部位内容接入自动被 13 规则码覆盖。

## 8. 分阶段实施（每阶段独立可发布、可回滚）

| 阶段 | 内容 | 退出判据 |
|---|---|---|
| P0 冻结 | 本方案评审＋SYS-CHAIN 不变量先写失败测试（红灯入库） | 红灯清单经 owner 确认 |
| P1 身份与合同 | v4 快照（chainId 缺省 primary）、义务键 8 段、跨段校验改写 | 既有 796 测试全绿＋退化回归 |
| P2 工作流链作用域 | workflow 段链化＋activeChainId＋orchestrator 命令扩展 | 单链行为逐字不变（快照＋浏览器） |
| P3 调度器＋采集多区域 | selectActiveChain、inferChains、guided 页头/思考侧栏 | 双链场景浏览器通过 |
| P4 共享动作与跨链回填 | D4 全链路（队列去重、多义务回填、失效闭包） | SYS-CHAIN-003/004 契约绿 |
| P5 跨链假设与 CROSS-R 上线 | 关系审核→pilot-knowledge 接入→条件性检查生成 | 归因封顶断言绿；临床审核签字 |
| P6 新部位内容 | 按 04 §10 清单接入首个新部位（建议髋：与膝链关系素材最全） | 新部位三件套＋门禁全绿 |

依赖：P1→P2→P3 串行；P4/P5 可并行；P6 只依赖 P1（内容层与链解耦，可提前启动审核）。

## 9. 风险与对策

| 风险 | 对策 |
|---|---|
| 状态空间爆炸（链×stage×revision） | 调度器纯函数＋穷举契约测试；一次只推进一链（D7） |
| 快照超 1MB | §4 压缩策略＋CI 体积回归 |
| 跨链归因越界（把相关说成因果） | D5 封顶＋契约测试锁枚举＋审核门禁（P5 单独出口） |
| 单链回归被破坏 | D2 退化设计＋SYS-CHAIN-006 回归锁＋golden/快照双保险 |
| 双链预算翻倍拖长会话 | 调度器每会话只跑一链；另一链保留待办，不静默合并 |
| 测试侧 B 类断言大面积失效 | 每阶段独立通知档轮次列解钉（沿用 22-29 轮流程） |

## 10. 与现有体系的一致性自检

不新增第二事实源（链＝thread，D1）；不豁免任何边界（domain 仍纯函数，07）；值契约只增不改（义务键加段属新合同 v4，旧值不动，02）；内容层零侵入（D8）；"先补失败测试再改实现"逐阶段执行（08 纪律）。
