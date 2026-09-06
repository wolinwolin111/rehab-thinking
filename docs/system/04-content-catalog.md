# 04 · 动作内容目录（Content Catalog）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 事实来源：`src/knowledge/actions/` 代码实测（行号截至本日）
> 本文是内容文案层的唯一完整定义。决策规则见 02，临床候选内容见 03，渲染消费路径见 01/05。

## 1. 一句话定位

把"动作怎么叫、怎么做、做几个、谁能做、勾了什么代偿"从 7 个分散来源收进一个单向依赖的内容层 `src/knowledge/actions/`；决策逻辑与持久化不改，只换供水的管子。

**为什么必须这样**（重构前实测）：346 条文案分散 7 个来源、归一后只有 164 个动作、平均每个动作被重写 2.1 遍。后果是三类结构缺陷：改一处漏多处、同动作剂量不一致、剂量与句子混写自相矛盾。

## 2. 分层与依赖方向（铁律）

```
L0  types.ts          类型（LocalizedText 双语域、三库 Entry）
L1  terms.ts          词根＝叫法唯一所有者（31 条）
L2  resolve.ts        {dose.*} 插值 / 语域选择 / termText
L3  assessment.ts | treatment.ts | training.ts | custom.ts   三库＋自定义模板
L4  option-sets.ts | compensations.ts | validate.ts | golden.ts   选项库 / 代偿词表 / 校验 / 黄金锁
L5  index.ts          新形状查询 API（终态唯一对外入口）
    bridge.ts         旧形状适配器（过渡期出口，未来部位入库后删除）
```

规则（由 `scripts/quality/check-architecture-boundaries.mjs` 强制，配置 `architecture-boundaries.json` actionCatalogRules）：

1. 目录内**禁止 import 任何消费方**（app/db/src/features/src/infrastructure/src/domain）。
2. domain 层 import 目录仅限白名单：`index.ts` / `bridge.ts` / `custom.ts`。
3. 消费方（features 层）可直连目录（如 workbench-support 引 index）。

## 3. 库与规模（以 `npm run check:catalog` 实跑为准）

| 库 | 文件 | 规模 | 内容 |
|---|---|---|---|
| 词根 | terms.ts | 31 | 动作叫法＋肌肉标签；如 `heel-raise`、`pillow-squeeze` |
| 评估库 | assessment.ts | **53**（方向 13＋力量 16＋功能 24） | title/how/observe 双语域、optionSet、compensations、bilateralObserve、dose |
| 处理库 | treatment.ts | **18**（膝 11＋踝 7）＋20 条 knee 指令常量 | doText、retestOf 指向评估库、剂量字段 |
| 训练库 | training.ts | **53** | 五阶段、体位（full-demo 推断/局部显式）、tags 驱动肌肉映射 |
| 自定义模板 | custom.ts | 1 函数 | 自定义动作不入库（owner 裁定：用户原话＋通用模板） |
| 选项库 | option-sets.ts | 8 base＋19 条有意通用登记 | 值契约锁死、标签按动作/语域覆盖 |
| 代偿词表 | compensations.ts | 48 编号（27 已接归类） | 编号存储、措辞显示、归类认编号 |
| 黄金锁 | golden.ts | **68** 条成品字符串 | 渲染结果逐字锚定 |

## 4. 双语域与渲染路径

每个文本字段是 `LocalizedText = { plain, pro }`：

- **guided（自助）** 取 `plain`：白话（"把脚背向上勾"）；
- **thinking（专业）** 取 `pro`：临床术语（"踝背屈（AROM）"）。

分流点（代码）：`index.ts` 的 `assessmentTitle(id, mode)`、`renderOptions(id, base, mode)`、`unableFollowUp(kind, mode)`、`compensationLabel(id, mode)`；旧形状经 `bridge.ts`（`assessmentPro` / `assessmentFriendly` / `treatmentDo` / `trainingCopy`）供 pilot 装配层取值——`full-demo-content.ts` 17 处、`local-limb-regions.ts` 12 处调用。

**剂量是数据不是句子**：模板含 `{dose.reps}` 等占位，`resolve.ts` 按语域插值；`CAT-DOSE-IN-SENTENCE` 禁止数字留在句内（15 条例外名单：等长保持秒数属检查协议属性）。

## 5. 选项定制体系（提问与作答）

三层结构：

1. **值契约（永久锁死）**：决策层输入，永不改。如 `unable-reason-motion`（pain/fear/instruction）、`unable-reason-function`（pain/weak/fear/instruction）、`range-function` 四联、`function-completion` 三联、`retest-outcome` 五值、`strength-answer` 五值。
2. **标签按动作覆盖**：`AssessmentEntry.options = { base, labels? }`，`renderOptions` 合成；值不变、叫法随动作（走路→"能走完"，单腿站→"能站稳"）。
3. **有意通用登记**：`GENERIC_REGISTRY`（19 条）记录"与动作无关、故意不定制"的组及裁定理由，防止将来被当漏项误定制。

## 6. 代偿编号体系（本层最新演化）

`compensations.ts` 四件事：

1. **编号＝存储值**（`record.compensations` 存 `knee-valgus` 这类 id，永不改）；**措辞＝显示层**（plain/pro 双轨，随时可改不碰逻辑）。
2. **legacy 归一**：旧记录里的中文原文读取时映射回编号（`compensationIdFor`），高亮/归类/摘要全部兼容。
3. **归类认编号**：每个编号可带 `tags`（如 knee-valgus→adductor+hip-abduction+glute-med），决策层 `compensationTagsFor` 查表；未入库部位的旧表文字走关键词兜底，与词表同一指向。
4. **跨池约束**：候选打分只在当前部位池内做标签交集——标签必须落在宿主卡所属部位的候选池里才生效（多部位扩展必读）。

三层降级（按钮列表）：目录条目 `compensations` → 旧表 `FUNCTION_COMPENSATIONS`（28 键，未入库部位）→ `COMPENSATION_GENERIC`（4 编号）。

## 7. 校验与黄金锁（全部规则码）

`validate.ts`（目录内）：`CAT-BAD-REGION`、`CAT-BAD-ACCESS`、`CAT-MISSING-TERM`、`CAT-DUPLICATE-ID`、`CAT-BAD-OPTION-BASE`、`CAT-BAD-OPTION-VALUE`、`CAT-OPTION-LABEL-INCOMPLETE`、`CAT-BAD-COMPENSATION-ID`、`CAT-DOSE-IN-SENTENCE`、`CAT-BAD-RETEST-REF`。

`scripts/knowledge/check-action-catalog.ts`（目录外，可读消费方）：`CAT-DEAD-COMPENSATION-TAG`（归类标签必须真实存在于候选标签全集——防"半空转"）、`CAT-BAD-GENERIC-COMPENSATION-ID`、`CAT-GOLDEN-MISMATCH`（68 条成品逐字比对）。

任何一条违反 → `npm run check:catalog` 非零退出 → 构建门禁拦截。

## 8. 旧层残留清单（过渡态，如实记录）

以下仍在消费方文件里，**删除条件＝对应部位条目入库**：

| 残留 | 位置 | 剩余规模 | 删除条件 |
|---|---|---|---|
| FRIENDLY_ASSESSMENT_COPY 手写覆盖 | workbench-support.tsx:2170 起 | 68 条 | 颈/肩/腰/胸/肘/腕/髋入库后 |
| plain() 运行时替换链 | workbench-support.tsx:2281 | 8 规则 | 同上 |
| friendly 兜底标题表 | workbench-support.tsx:2261 起 | 19 条 | 同上 |
| FUNCTION_COMPENSATIONS 旧表 | workbench-support.tsx:1213 起 | 28 键 | 同上 |
| BILATERAL_OBSERVE 旧表 | workbench-support.tsx | 1 键（knee-posterior-chain） | 同上 |
| TENSION_LOCATION_OPTIONS | workbench-support.tsx | 21 键（运动知识 id，非评估条目） | 对应方向入库时 |
| bilateralAssessmentCopy 替换链 | workbench-support.tsx | 10 规则（实测仅 3 处真实生效） | 未来部位入库后另批 |
| bridge.ts 旧形状适配 | actions/bridge.ts | 5 导出 | 消费方全部换新 API 后 |
| knee-workflow-adapter 指令函数 | domain | 2 函数（数据已收编目录） | 决策层改读目录后 |

## 9. 演化决策记录（指针）

批次 0–7（骨架→提踵→功能→方向→力量→处理→训练→缩减删旧）、C1/C2 续批（代偿/双侧观察入库、紧张位置与双侧化链经实测裁定跳过）、编号分离与归类接线（含两处修正与两项"接受"裁定）。全部决策与理由：`docs/plans/rehabmind-action-catalog-execution-master-2026-09-04.md` §10/§13/§14/§15；过程与解钉：`docs/handover/test-notice-2026-09-01-batch-sha-bindings.md` 第 15–27 轮。

**已固化的过程教训**（详见 08）：等价性验证禁止循环论证（旧值必须取自 git 基线）；先抓基线再估工；以界面现实为准不以类型定义为准；比较类判断不预填表现。

## 10. 新部位接入清单（扩展接口）

未来部位（如颈椎）入库时按此顺序，**零组件改动**：

1. `types.ts` PilotRegionId 联合＋`validate.ts` REGION 集合各加一个值；
2. `assessment.ts`/`treatment.ts`/`training.ts` 加条目（双语域逐字、optionSet、compensations 用编号或新增编号）；
3. 代偿：复用全局编号，新概念加新编号（tags 按宿主池选择，护栏自动校验）；
4. 该部位旧层残留（FRIENDLY/plain()/旧表对应键）删除；
5. `check:catalog`＋结构快照＋前后对照表。

若同概念标签跨池膨胀，把 `tags` 升级为按部位分组（`compensationTagsFor(id, region)`）——结构已预留，向后兼容。
