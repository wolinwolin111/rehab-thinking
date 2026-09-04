# RehabMind 动作库重构·完整执行方案（批次 0–7 主控文档）

> 文档状态：执行方案定稿（主控）；批次 0＋1 的逐步任务细节见 batch0-1 实施计划
> 建立日期：2026-09-04
> 前置文档：方案（rebuild）、终态架构（target-architecture）、批次 0＋1 计划（batch0-1）
> 用法：执行每一批之前读"总则＋该批章节"；每批结束走 §1.3 固定收尾流程。

## 1. 总则

### 1.1 执行模型

- **一批一暂停点**：每批完成并验收后停在 owner 面前看效果（界面实测＋Excel 审阅表增量），点头才开下一批。批次 1 之后是第一个硬暂停。
- **每批自带验收与回滚**：不通过不前进，不调口径迁就失败。
- **决策点前置**：每批列出的 owner 决策必须在写代码前回答（§10 汇总）。没有未决决策才开工。

### 1.2 统一验收口径（每批相同）

1. `npx.cmd tsc --noEmit` 无输出。
2. `npm run check:catalog` 绿（golden 随批追加，历史 golden 永不删改）。
3. `npm run check:knowledge`、`npm run check:boundaries`、`npm run check:structure` 无 error。
4. `npm run snapshot:render -- before/after`：DOM 结构逐字节一致（STRUCTURE IDENTICAL），只有文字可变。
5. 12 场景 innerText 抽查：本批"预期差异清单"逐条命中、"禁止残留清单"零命中。
6. 可见文字差异必须逐条对应该批"owner 已批决策"，未批的一律视为缺陷回滚。

### 1.3 每批固定收尾流程

1. 提交代码（一批可含多个原子 commit）。
2. 生成/更新 Excel 审阅表增量（`.docgen\gen-xlsx.cjs` 扩展对应 sheet）。
3. 通知档（docs/handover/test-notice-2026-09-01-batch-sha-bindings.md）追加一轮：本批 SHA、"会破的断言清单"、勿钉字面提醒。
4. `git push origin main:agent/dev-20260901`。
5. 向 owner 交暂停点简报（改了什么、界面哪几屏变了、下批需要什么决策）。

### 1.4 工具链（批次 0 建立后全程复用）

| 工具 | 用途 |
|---|---|
| `scripts/knowledge/capture-action-baseline.mjs` | 每批开工前抓"该批条目"迁移前成品基线（参数化 family） |
| `npm run check:catalog` | 词根/指向/access/剂量-in-句/例外/golden 校验 |
| `npm run snapshot:render -- <label>` | DOM 结构快照（仓库外 .txt） |
| `.docgen\gen-xlsx.cjs / gen-docx*.cjs` | 生成 owner 审阅用 Excel/Word |

## 2. 批次总览

| 批次 | 内容 | 条数(估) | 前置 | owner 决策点 | 暂停点 |
|---|---|---|---|---|---|
| 0 骨架 | terms/types/resolve/validate/bridge/golden/check:catalog/快照工具 | — | — | — | — |
| 1 提踵族 | 评估6＋处理2＋训练6＋复测指向＋剂量收敛#1–#4 | 14＋golden20 | 0 | **#5 自助5次 vs 专业10个** | ★硬暂停 |
| 2 功能动作族 | 走路/下蹲/坐站/上下台阶/单腿站/小跳落地；症状页动作选择器；空态文案 | 约20条评估＋8条训练 | 1 | 走路剂量口径（10米 vs 一小段） | ★ |
| 3 活动度方向族 | 膝屈伸/髌骨4/踝四方向/足趾/屈膝位背屈；professionalAssessmentTitle 合并 | 约15条 | 2 | guided 的 AROM 后缀保留？ | ★ |
| 4 力量等长族 | 夹枕/推墙/勾脚/内外翻/脚跟拖地/足部小肌群 | 约14条 | 3 | 等长句式模板；足部小肌群换踮脚尖（已批 B 思路） | ★ |
| 5 处理候选族 | candidateGroups 56＋pilot-knowledge 14；kneeTreatmentInstruction 删除；温和活动兜底→custom | 约70条 | 4 | 兜底卡「轻轻活动」actionLabel 用词 | ★ |
| 6 训练动作族 | exercise 53 全量；体位显式化；肌肉映射只按 tags | 53 | 5 | 训练 purpose 是否拆双语域 | ★ |
| 7 删旧层收尾 | plain()/FRIENDLY/kneeTreatmentInstruction/kneeRetestInstruction/resultOptions/bridge；选项组迁 option-sets；boundaries 规则固化 | — | 1–6 全绿 | — | 终验 |

## 3. 批次 0＋1（已定稿，按既有计划执行）

任务级细节以 `rehabmind-action-catalog-batch0-1-2026-09-04.md` 为准（T1–T10）。本主控只列锚点：

- 唯一未决：**收敛 #5**（knee-calf/ankle-calf/ankle-heel-raise 自助「做5次」vs 专业「10个」）。回答"统一到 10"或"保留 5"后开工。
- 批次 1 交付物除代码外：`capture-action-baseline.mjs` 参数化（`--family heel` → 后续 `--family gait` 等）、审阅表 Excel 首版、通知档第 15 轮。
- 回滚点：T7/T8/T9 各自独立 commit；任一验证失败回滚该 commit 即可，批次 0 产物不动。

## 4. 批次 2：功能动作族

**目标**：消灭"走路 4 份、下蹲 4 份、坐站 3 份、台阶 4 份、单腿站 8 处、小跳 2 份"的重复；症状页动作选择器与空态文案进库。

**前置**：批次 1 验收通过；决策点 D2-1 已答。

**任务**：
- T2-1 `capture-action-baseline.mjs` 参数化：`--family gait` 输出走路/下蹲/坐站/台阶/单腿站/小跳相关条目（评估+训练+症状选择器）基线。
- T2-2 terms.ts 增词根：`walk`、`squat`、`sit-to-stand`、`step-up`、`step-down`、`single-leg-stand`、`hop-landing`、`hip-hinge`（含白话/专业；专业名取自现文）。
- T2-3 评估库增条目（按基线逐字）：knee-gait、ankle-weight-bearing、thigh-walk、calf-walk、knee-squat、ankle-squat、knee-sit-stand、thigh-sit-stand、knee-step-up、knee-step-down、ankle-step-down、knee-single-leg、ankle-single-leg、thigh-single-leg、calf-single-leg、knee-single-leg-squat、thigh-single-leg-squat、knee-hop-landing、ankle-hop、calf-jog、thigh-jog（引用型条目只登记，不强行改句）。
- T2-4 训练库增条目：knee-step、knee-standing-hip-flexion、ankle-standing-hip-flexion、thigh-hip-hinge、ankle-gait-weightshift、thigh-lateral-step 等"位置/台阶/走路"类 exercise（按基线逐字＋剂量字段）。
- T2-5 症状页动作选择器：`workbench-support.tsx:1743-1746` 髋四方向 label 改词根插值（这是第一批真正使用词根 token 的句子——措辞变化经 owner 在暂停点过目）。
- T2-6 `custom.ts` 建"no-finding"模板；`problem-ledger-core.ts:86` 改 `customHint("no-finding")`。
- T2-7 golden 追加＋全量验收（§1.2）＋收尾流程。

**决策点**：
- D2-1 走路口径：膝"自然走10米"、踝"走一小段"、局部"以平时速度走一小段"——评估统一成"固定距离"还是保留部位差异？（建议：评估统一 10 米，功能复测沿用原句；需 owner 一句话）**→ 已定：保留部位差异，不改现文（2026-09-04）。**
- D2-2 症状页选择器措辞变化（髋四方向改词根叫法）是否接受。**→ 已定：接受（2026-09-04）。**

## 5. 批次 3：活动度方向族

**目标**：方向类评估进库；`professionalAssessmentTitle` 合并为 `assessmentTitle(id, mode)`；FRIENDLY 中方向类条目收编；ACTION_ALIASES 旧标题别名兜底。

**批次 2 审核新增范围（owner 2026-09-04 确认方向）**：
- T3-0a **选项接线**：批次 2 已入库的按动作作答标签上屏——`renderOptions` + 评估卡选项换源（首批可见变化）。
- T3-0b **追问包收拢**：二层"无法完成→原因"结构进 option-sets，4 套 base（`unable-reason-motion`：pain/fear/instruction；`-function`：pain/weak/fear；`-strength`：pain/weak/control/no-helper/fear；`-special`：pain/fear/safety-signal），每组含提示句＋按原因引导模板（`{how}` 注入动作怎么做）；`unableFollowUp(kind, mode, how)` API；5 处硬编码换源（`assessment-stage:636-651`、`workbench-support:2577/2597`、`training-stage:202`、`summary-stage:514`、`treatment-retest:368`）。原因选项为**有意通用**档，不按动作定制（owner 砍复测提示同理）；pain 分支直进疼痛记录（不再插引导框）。
- T3-0c **三层追问划界**：pain 后的位置图/0～10 分/熟悉的不适为记录控件，留在组件，不进目录。

**任务**：
- T3-1 terms 增：`knee-bend/knee-straighten/patella-glide-*/ankle-dorsiflexion/ankle-plantarflexion/ankle-inversion/ankle-eversion/toe-extension/toe-flexion/knee-to-wall` 等。
- T3-2 评估库增方向类条目（`full-demo-content.ts:256-261、379-385` 按基线逐字）；骰骨/瘢痕两条 therapist+passive 不迁（终态架构 §6 已判"自助不可见"，保留原处）。
- T3-3 `index.ts` 增加 `assessmentTitle(id, mode)`：plain 取 FRIENDLY title 或 plain 后标题，pro 取 PROFESSIONAL_ASSESSMENT_TITLES；`assessment-stage:396/6263`、`summary-stage`、`treatment-retest-stage`、`rehabmind-workbench:1806/2927` 换调用（消费方只换函数名，不改组件）。
- T3-4 `legacy-ids.ts` 加旧标题别名，`knee-decision-core` 的 `actionFromAssessment` 匹配串加别名兜底（`knee-workflow-adapter.ts:194` 路径）。
- T3-5 golden 追加；验收含"评估卡标题逐屏抽查"。

**决策点**：
- D3-1 guided 的活动度标题现在显示「膝关节主动屈曲（AROM）」——AROM 缩写保留还是去（plain 版可用「主动活动度」）？

## 6. 批次 4：力量/等长族

**目标**：力量类评估进库；完成 how 与 dose 的正式拆分（本批句子允许首次成段改写——每条过 owner）。

**任务**：
- T4-1 terms 增：`isometric-hold`、`resist-*`（勾脚/内翻/外翻/伸膝/屈膝抗阻）、`wall-push`、`pillow-squeeze`、`heel-drag`。
- T4-2 评估库增条目：knee-quadriceps、knee-hamstring、knee-posterior-chain、knee-adductor-pes、knee-glute、knee-calf(已入)、knee-foot-arch(已入)、ankle-dorsiflexor、ankle-evertor、ankle-invertor、ankle-intrinsic、thigh-front/back/medial/lateral-strength、calf-dorsiflexor/invertor/evertor-strength（按基线逐字）。
- T4-3 how/dose 拆分清单：本批每条模板把次数/秒数移入 dose；等长秒数按例外名单处理。
- T4-4 `ankle-intrinsic`（足部小肌群）句内「缩短脚掌、轻抬足弓」→ 换已批动作「踮脚尖」句式（owner 已批 B 思路）。
- T4-5 golden 追加；验收。

**决策点**：
- D4-1 等长句式模板：「保持5秒，左右比较」在膝/踝/大腿各条统一成一个模板吗？（建议统一，逐条在审阅表给前后对照）
- D4-2 膝·腘绳肌自助句维持现 FRIENDLY 版「像要把脚跟向椅子下面拖，但不要真的移动」——确认不再改。

## 7. 批次 5：处理候选族

**目标**：处理文字单源；删除 kneeTreatmentInstruction/kneeRetestInstruction；温和活动兜底进 custom.ts。

**任务**：
- T5-1 terms 增处理侧词根（松解/关节松动/神经滑动/肿胀管理等叫法）。
- T5-2 `treatment.ts` 收编：candidateGroups 56 条（四部位）＋pilot-knowledge 14 条上屏路径（knee-*-control/joint/swelling），do 模板＋dose 字段；`retestOf` 全部指向评估库 id。
- T5-3 `build-trial-targets-core.ts:176` 改 `renderTreatment`；`:604-616` 温和活动兜底改 `custom.ts` 模板（title 纯动作名、actionLabel「轻轻活动」）。
- T5-4 `rehabmind-workbench` 换 `renderRetest`（kneeRetestInstruction 调用点）；`treatment-retest-stage.tsx:833/841` 复测标题/选项改 `renderRetest`；`summary-stage:709/711` 复测选项改 `renderRetest`。
- T5-5 `pilot-decision-engine.ts` 确认不再读 action 文字（只留信号字段）。
- T5-6 golden 追加；验收含"处理卡/复测卡逐屏抽查"。

**决策点**：
- D5-1 兜底卡「现在做：轻轻活动」用词确认（批次 1 已改「轻轻活动」，此处沿用即默认通过）。

## 8. 批次 6：训练动作族

**目标**：exercise 53 条全量进库；体位显式化；肌肉映射去标题化。

**前置（顺序不可倒）**：
- T6-0a `full-demo-content.ts` 的 `exercise()` 增加可选 `position` 显式参数，53 条**先补显式值**（值=当时推断结果，用脚本逐条 dump 生成），推断正则保留一个批次作影子校验（显式值≠推断值时报警）。
- T6-0b `local-limb-regions.ts:14` exercise 已有显式参数，无需改。
- T6-0c `home-relaxation-core.ts` `EXERCISE_MUSCLE_RULES` 标题匹配路径删除，改为只按 tags；`站立屈髋` 两条补 `glute` 标签（终态架构 §6-11 风险）。

**任务**：
- T6-1 training.ts 增余下全部条目（按基线逐字；`startPosition` 用显式值）。
- T6-2 `training-stage.tsx` 数据源换 bridge→index（组件不改渲染逻辑）。
- T6-3 `summary-stage` 训练摘要 label 换 `renderTraining`。
- T6-4 影子校验通过后删除推断正则；golden 追加；验收。

**决策点**：
- D6-1 训练 purpose 当前单轨（两模式同文）——是否拆双语域？建议本批不拆（避免新增文案量），留到内容优化阶段。

## 9. 批次 7：删旧层与收尾

**任务**：
- T7-1 删 `assessmentCopy()` 与 `plain()`（workbench-support.tsx:2304-2316）——前提：所有调用点已换 `renderAssessment`。
- T7-2 删 `FRIENDLY_ASSESSMENT_COPY`、`friendlyTitle`——调用点已换。
- T7-3 删 `kneeTreatmentInstruction/kneeRetestInstruction`（knee-workflow-adapter）——调用点已换。
- T7-4 删知识文件里 `resultOptions` 死字段（full-demo/local-limb 各 assessment helper）。
- T7-5 `pilot-motion-muscle-knowledge.ts` 删 userAction/controlTitle/controlInstruction 字段（保留区域/角色）。
- T7-6 8 组选项函数迁 `option-sets.ts`（workbench-support 保留转发导出一批后删）。
- T7-7 删 `bridge.ts`；消费方 import 全部指向 `index.ts`。
- T7-8 `check-boundaries` 增规则：`src/knowledge/actions/**` 禁止 import actions 目录外文件（types/terms 自家除外）；domain 层 import actions 仅允许 index.ts。
- T7-9 全量验收＋终版 Excel/Word＋通知档终轮（全部 SHA 汇总）。

## 10. owner 决策点汇总（必须在对应批次开工前回答）

| # | 决策 | 影响批次 | 建议答案 |
|---|---|---|---|
| #5 | 评估自助 5次 vs 专业 10个 | 1 | 统一 10 |
| D2-1 | 走路评估口径（10米 vs 一小段） | 2 | **已定：保留部位差异**（原建议统一 10 米被否） |
| D2-2 | 症状页选择器改词根叫法 | 2 | **已定：接受**（暂停点过目） |
| D3-1 | guided 标题 AROM 后缀去留 | 3 | 保留（名称栏专业） |
| D4-1 | 等长句式统一模板 | 4 | 统一，逐条对照审 |
| D4-2 | 腘绳肌自助句维持现文 | 4 | 维持 |
| D5-1 | 兜底「轻轻活动」用词 | 5 | 沿用 |
| D6-1 | 训练 purpose 是否拆双语域 | 6 | 本批不拆 |

## 11. 风险登记与回滚

| 风险 | 触发批 | 预案 |
|---|---|---|
| 体位推断静默变化 | 6 | T6-0a 显式化＋影子校验；不符即回滚该 commit |
| 居家放松肌肉映射静默丢失 | 6 | T6-0c 先行并单独验收（放松卡数量前后一致） |
| ACTION_ALIASES 匹配失效（评估标题变更） | 3 | legacy-ids 别名兜底＋knee 流程 E2E（决策实验室/场景）抽查 |
| golden 与基线不符（模板抄错） | 每批 | 修模板不改 golden；golden 永不追溯修改 |
| 结构快照不一致 | 每批 | 整批回滚，重新切分提交粒度 |
| 测试侧断言破口扩大 | 每批 | 通知档逐轮列清；坚持结构断言口径 |

## 12. 里程碑

| 里程碑 | 内容 | 依赖 |
|---|---|---|
| M1 | 批次 0＋1 完（提踵族单源、剂量收敛落地、工具链就绪） | #5 决策 |
| M2 | 批次 2–3 完（功能+方向类单源、assessmentTitle 统一） | M1＋D2/D3 |
| M3 | 批次 4–5 完（全部评估/处理单源、复测单源） | M2＋D4/D5 |
| M4 | 批次 6 完（训练单源、体位/肌肉映射去标题化） | M3＋D6 |
| M5 | 批次 7 完（旧层删除、boundaries 固化）＝终态达成 | 全部 |
