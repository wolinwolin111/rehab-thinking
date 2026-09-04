# RehabMind 动作库终态架构设计（重构完成后应长成什么样）

> 文档状态：终态设计定稿（描述目标，不含迁移步骤；迁移见批次 0＋1 实施计划）
> 建立日期：2026-09-04
> 前置文档：docs/plans/rehabmind-action-catalog-rebuild-2026-09-04.md（方案）、rehabmind-action-catalog-batch0-1-2026-09-04.md（批次 0＋1 计划）
> 消费方清单来源：对 src/ 全量 import 扫描的实测结果，非推测。

## 1. 一句话定位

把"动作怎么叫、怎么做、做几个、谁能做"从 7 个分散来源收进一个单向依赖的内容层；决策逻辑与持久化一行不改，只换供水的管子。

## 2. 分层与依赖方向（铁律）

```
L0  types.ts                 类型
L1  terms.ts                 词根（叫法唯一所有者）
L2  resolve.ts               插值 / 语域选择
L3  assessment.ts | treatment.ts | training.ts | custom.ts     三库＋自定义模板
L4  legacy-ids.ts | validate.ts | golden.ts                     兼容映射 / 校验 / 黄金锁
L5  index.ts                  新形状查询 API（终态唯一对外入口）
    bridge.ts                 旧形状适配器（过渡期出口，批次 7 删除）
```

规则：

1. 依赖只能从上往下（L0 → L5），任何反向 import 都算架构违规。
2. 内容层不 import 任何消费方、不做任何决策、不知道"当前该显示哪张卡"。
3. 消费方只允许 import `index.ts`（终态）或 `bridge.ts`（过渡期）。
4. 运行时零解析：所有插值在模块求值期完成，对外暴露的都是成品字符串。

## 3. 终态文件结构

```
src/knowledge/
├── actions/                        ★ 新内容层（本设计主体）
│   ├── types.ts                    Register/LocalizedText/三库 Entry/Access/RegionId
│   ├── terms.ts                    动作词根（约160条；plain+pro 叫法）
│   ├── resolve.ts                  renderHow / fillTemplate / render(entry, mode)
│   ├── assessment.ts               评估库（79项；复测也引用它）
│   ├── treatment.ts                处理库（56候选＋14条 pilot-knowledge 收编）
│   ├── training.ts                 训练库（53项）
│   ├── custom.ts                   自定义动作模板 + 通用提示（含「查看低强度活动」等空态文案）
│   ├── option-sets.ts              结果选项组（AROM/力量/功能/特殊/复测），记录维度不属于动作
│   ├── legacy-ids.ts               id→词根映射；旧标题别名（供 ACTION_ALIASES 类匹配兜底）
│   ├── validate.ts                 校验规则（词根存在/复测指向/access/剂量不进句/例外名单）
│   ├── golden.ts                   各语域成品字符串锁（每迁移一批追加一批）
│   ├── bridge.ts                   旧形状适配器（过渡期；批次7删除）
│   └── index.ts                    对外 API：renderAssessment / renderTreatment /
│                                   renderTraining / renderRetest / assessmentTitle /
│                                   optionSet / regionEntries / lookup(id)
├── pilot/
│   ├── full-demo-content.ts        终态只剩"结构骨架"：region→条目id列表、关系与匹配规则
│   ├── local-limb-regions.ts       同上（并入 full-demo 的 region 骨架）
│   ├── pilot-knowledge.ts          保留：决策关系表（locationTokens/treatmentCandidates 信号）
│   ├── pilot-motion-muscle-knowledge.ts   保留：区域关系/角色（agonist 等）与肌肉区域解析；
│   │                                     userAction/controlTitle/controlInstruction 文案字段删除
│   └── knowledge-consistency.ts    保留：关系一致性校验
└── rehab/                          保留不动（P0/P1 规则发布与权限表）
```

**pilot 目录的取舍原则**：`pilot/` 里属于"决策关系"的部分（哪些症状匹配哪些评估、哪些评估支撑哪些处理、区域角色）全部保留——那是决策引擎的输入，不是文案；属于"内容文字"的部分全部搬走。终态判断口诀：**改一句话要不要动两处？要动两处的内容就归 actions，只动一处的归原文件。**

## 4. 对外 API（index.ts，终态唯一入口）

| API | 返回 | 替代的旧来源 |
|---|---|---|
| `renderAssessment(id, mode)` | `{ title, how, observe, caution? }` 成品 | 知识库 how/observe ＋ `assessmentCopy()` 的 FRIENDLY 查找＋`plain()` 运行时替换 |
| `renderTreatment(id, mode)` | `{ site, title, actionLabel, do, observe? }` | candidate.do ＋ `kneeTreatmentInstruction` 19条 ＋ pilot-knowledge action 兜底 |
| `renderTraining(id, mode)` | `{ title, how, purpose, observe, easier, harder, sets, reps, position }` | exercise 字段直出 |
| `renderRetest(id, mode)` | `{ title, options }`（指向评估库同 id） | `kneeRetestInstruction` ＋ `retestPlans.userAction` ＋ summary-stage 复测选项手写 |
| `assessmentTitle(id, mode)` | 成品标题 | `professionalAssessmentTitle` 映射表 |
| `optionSet(name, ctx)` | 结果选项数组 | `activeMotionRangeOptions` 等 8 组（收进 option-sets.ts 统一维护） |
| `customHint(kind, ctx)` | 自定义动作模板成品 | 散落在 assessment-stage/custom-action 分支的提示句 |
| `regionEntries(regionId)` | 该部位的条目 id 清单（评估/处理/训练） | FULL_REGIONS 里嵌套的完整内容对象 |
| `lookup(id)` | 跨库条目查询（处理 retestOf、训练 tags、词根） | 各处自行查找 |

## 5. 引用结构总图

```
                     ┌──────────── 持久层（快照/历史/复测记录，只存 id）────────────┐
                     │                                                            │
┌────────────────────┼── 决策层（不改）────────────────────┐                       │
│ pilot-knowledge    │  pilot-decision-engine   knee-decision-core │              │
│ (关系/信号)         │  candidate-safety-core   bilateral-flow-core │             │
└─────────┬──────────┴───────────────┬──────────────────────┘              │
          │ 关系命中→候选信号           │ 负荷/安全/复测义务                    │
          ▼                          ▼                                     │
┌─ 内容层 src/knowledge/actions ────────────────────────────┐                │
│ terms → resolve → {assessment, treatment, training, custom} │               │
│        option-sets / legacy-ids / validate / golden         │               │
│                 对外：index.ts（+过渡期 bridge.ts）           │◄── id 兼容 ───┘
└───────┬──────────────────────────────────────────────────┘
        │ 成品文字（按 mode 出水）
        ▼
┌─ UI 层（只渲染，不产文字）───────────────────────────────────────┐
│ assessment-stage   ← renderAssessment/assessmentTitle/optionSet │
│ treatment-retest   ← renderTreatment/renderRetest               │
│ training-stage     ← renderTraining（workbench 传入）            │
│ summary-stage      ← renderTraining/renderRetest/assessmentTitle │
│ workbench-support  ← TreatmentActionCard 渲染 + optionSet        │
│ symptom-stage      ← customHint（自定义动作提示）                 │
└─────────────────────────────────────────────────────────────────┘
```

依赖方向断言：`actions/*` 不出现上面三个框之外任何文件的 import；UI→actions 单向；domain→actions 仅经 index.ts 取文字（domain 内部关系匹配仍用自己的表）。

## 6. 消费方逐个关系（实测 14 处 → 终态）

| # | 消费方 | 现在从哪取内容 | 终态从哪取 | 切换批次 |
|---|---|---|---|---|
| 1 | `rehabmind-workbench.tsx` | FULL_REGIONS / FullCandidate / FullExercise；`kneeTreatmentInstruction`、`kneeRetestInstruction`、KNEE_CORE_CANDIDATE_IDS；`professionalAssessmentTitle`、pilotMotionKnowledge | `regionEntries` / `renderTreatment` / `renderRetest` / `assessmentTitle`；KNEE_CORE_CANDIDATE_IDS 保留在 knee-workflow-adapter（决策映射，非文案） | 5–6 |
| 2 | `workbench-support.tsx` | FULL_REGIONS；`controlPlansForMotions`（controlTitle/controlInstruction）；FRIENDLY_ASSESSMENT_COPY；`plain()`；8 组选项函数 | `renderTreatment` / `renderAssessment` / `optionSet`；FRIENDLY 与 plain() 删除 | 7（选项组 3） |
| 3 | `assessment-stage.tsx` | 知识项直渲染；`professionalAssessmentTitle`；custom-action 提示句 | `renderAssessment` / `assessmentTitle` / `customHint` | 3 |
| 4 | `treatment-retest-stage.tsx` | candidate 渲染；`professionalAssessmentTitle`；复测标题/选项手写 | `renderTreatment` / `renderRetest` | 5 |
| 5 | `training-stage.tsx` | exercise 对象直渲染（title/how/purpose/easier/harder/sets/reps） | 不改组件，改传入的 exercise 由 bridge→index 供给 | 6 |
| 6 | `summary-stage.tsx` | 复测选项手写（709/711）；`professionalAssessmentTitle`；训练摘要 label | `renderRetest` / `assessmentTitle` / `renderTraining` | 5–6 |
| 7 | `symptom-stage.tsx` | actionOptions 标签（含髋四方向「专业名｜白话」）；custom 提示 | 词根表插值（髋四方向是词根首批成员）；`customHint` | 2 |
| 8 | `build-trial-targets-core.ts` | `kneeTreatmentInstruction(unit)` 注入 do；温和活动兜底硬编码 | `renderTreatment(unit→id)`；兜底进 `custom.ts` 模板 | 5 |
| 9 | `pilot-decision-engine.ts` | pilot-knowledge treatmentCandidates（含 action 文字） | 只用候选信号（id/kind/retestIds）；action 文字不再被引用 | 5 |
| 10 | `knee-decision-core.ts` | ACTION_ALIASES 正则（匹配用户文本/评估标题） | 保留；`legacy-ids.ts` 提供旧标题别名兜底 | 3 |
| 11 | `home-relaxation-core.ts` | EXERCISE_MUSCLE_RULES 按 tags＋标题正则映射肌肉 | 训练库 tags 补齐后**只按 tags**；标题匹配路径删除 | 6 前置 |
| 12 | `problem-ledger-core.ts` | 空态文案「查看低强度活动」硬编码 | `customHint("no-finding")` | 2 |
| 13 | `scenario-catalog.ts` / test workbench | 按 id 构造 fixture | 不动（id 永久保留；legacy-ids 保证解析） | — |
| 14 | `muscle-region-location-picker.tsx` | `normalizePilotMuscleRegion` | 不动（区域解析属 domain，不属动作库） | — |

## 7. 各屏数据流（终态）

| 屏 | 数据流 |
|---|---|
| 评估卡 | workbench 组队列（决策）→ `renderAssessment(id, mode)` 出 title/how/observe → `optionSet(kind, ctx)` 出选项 → assessment-stage 渲染。改叫法=terms.ts 一处；改观察点=assessment.ts 一处 |
| 处理卡 | 决策层出候选信号（id+retestIds）→ `renderTreatment(id, mode)` 出 site/actionLabel/do（剂量从 dose 字段插值）→ TreatmentActionCard 渲染。`kneeTreatmentInstruction` 与 pilot-knowledge action 文字不再是来源 |
| 训练卡 | workbench 从 `regionEntries` 拿训练 id → `renderTraining(id, mode)` → training-stage 渲染。组次在卡头（字段），句子无数字（校验器保证） |
| 复测卡 | `retestOf` 指向评估库 → `renderRetest(retestOfId)` 出标题与选项。复测与评估天然同词同句，漂移在结构上不可能再发生 |
| 自定义动作 | 用户原话不入库 → `customHint` 通用模板包裹；"承重/复测"等措辞后续在 custom.ts 一处审 |
| 居家放松 | 训练库 tags → `exerciseMuscleLabels(tags)`（标题匹配删除）→ 放松卡。加新动作天然带出放松映射 |
| 总结/成果 | `assessmentTitle`/`renderTraining` 出名称（名称栏保留专业叫法） |

## 8. 明确不动的部分

1. **决策与安全**：candidate-safety-core 的 access 过滤、pilot-decision-engine 的关系命中、bilateral-flow-core 的侧别规则、复测义务计算、转介阈值。
2. **pilot-knowledge 的关系表**：locationTokens/assessmentIds/treatmentCandidates 信号、trainingIds、evidence/status——它们是决策输入；终态只是不再从它取文字。
3. **区域与肌肉解析**：normalizePilotMuscleRegion、regionRelationForMotion、控制/拮抗角色表。
4. **持久化契约**：快照 schema、案例历史、`retestIds`、跨会话 id——全部按现有 id 运转。
5. **权限表**：knowledge/rehab/p0-assessment-access.ts 的 owner 已确认权限（含 ankle-cuboid 等 hidden 项）。

## 9. 兼容与持久化

1. **id 即合同**：164 个 id 永不改名。库内新增 `key` 字段表达"这是哪个动作"，id 只作历史引用与查表键。
2. `legacy-ids.ts` 提供：id→key 映射、旧标题别名（供 ACTION_ALIASES 类匹配、测试场景字面、旧快照 title 反查）。
3. golden 每迁移一批追加一批，历史批次的成品串不删——它们是回归基线，也是"当时界面长什么样"的存证。
4. 若未来决定合并 id（如 knee-bridge/ankle-bridge→bridge），那是独立一轮：先加 alias 再改存储，本架构已为其留好唯一改动点（legacy-ids.ts）。

## 10. 旧来源 → 终态归属对照（批次 7 删除清单的另一半）

| 旧来源（批次 7 删） | 行数 | 终态归属 |
|---|---|---|
| `assessmentCopy()` 的 13 条 replaceAll | 13 | plain 语域字段（L3） |
| `FRIENDLY_ASSESSMENT_COPY` 71 条手写 | 71 | `assessment.ts` 的 how/observe plain ＋ title plain |
| `kneeTreatmentInstruction` 19 条 | 19 | `treatment.ts` do+dose（14 条上屏路径） |
| `pilot-knowledge` 40 条 action | 40 | 14 条上屏者入 treatment.ts；26 条保留为决策元数据不搬 |
| `pilot-motion-muscle-knowledge` userAction/controlTitle/controlInstruction | 28 | userAction→terms/复测；controlTitle→treatment.ts；controlInstruction→treatment.ts |
| `kneeRetestInstruction` 与 summary 复测选项手写 | — | `renderRetest`（引用评估库） |
| 8 组选项函数里的字面（1284–1297 等） | — | `option-sets.ts`（名称栏保留专业、解释栏双语域） |
| `resultOptions` 死字段 | — | 直接删（无接替者） |

终态自检题（每条都必须能回答"是"）：

1. 把「提踵」改成「踮脚尖」——是否只改 terms.ts 一行？
2. 把某个评估的观察点改一句话——是否只改 assessment.ts 一处？
3. 新增一个部位——是否只写 id 清单＋剂量，不抄任何动作句子？
4. 把某训练的组次从 3×12 改 3×10——是否找不到第二个数字？
5. 删掉 src/knowledge/actions/——编译是否立刻全面报错（证明没有暗依赖）？
