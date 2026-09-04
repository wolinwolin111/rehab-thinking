# RehabMind 动作库与评估/处理/训练内容重构方案

> 文档状态：方案已定稿，待出实现计划
> 建立日期：2026-09-04
> 适用范围：RehabMind 自助模式与专业模式的全部对外内容文案（评估、处理、训练、复测、自定义动作）
> 开发与测试边界：本文只定义目标结构、数据合同、迁移批次和验收口径；QA 断言、证据与执行由独立测试会话自行判断。

## 1. 执行结论

当前 346 条内容文案分散在 7 个来源，归一后只有 164 个不同动作，平均每个动作被重写 2.1 遍。这不是文案质量问题，是**结构缺陷**：没有"动作"这个概念的所有者，所以每个部位、每个阶段、每种模式都各自抄一遍。

后果已经实测到三类：

1. **改一处漏多处**。2026-09-04 文案口语化批次（`28fd9ca`）按部位扫描，"提踵"只覆盖到 4 处，漏了 `full-demo-content.ts:392`、`:400`、`local-limb-regions.ts:90`、`:94` 共 4 处，至今解释栏仍有 28 处"提踵"残留。
2. **同一动作剂量不一致**。提踵在 6 个评估/训练条目里分别是 5 次 / 10 个 / 20 个，臀桥分别是 10～12 / 10 / 8～10，owner 已确认属漂移而非临床设计。
3. **剂量与句子混写导致自相矛盾**。`local-limb-regions.ts:108` 组数字段是「3组 · 每组8～10个」，同一条的"怎么做"句内又写「做2组，每组6～8次」，训练卡同时显示两个剂量（`a70af60` 已单独修掉句内那份）。

重做方式：**建立"动作词根"共享层 + 按用途分三库（评估库、处理库、训练库）**，复测引用评估库，自定义动作单独走模板。真源仍是 TS（由编译器兜住引用完整性），另配导出脚本生成 xlsx 供 owner 审阅。

本方案不以"文件变少"或"抽象层数变多"为成功标准。完成标准只有三条：

1. 一个动作的叫法只在一处定义；改叫法不需要碰任何部位表。
2. 一个动作的剂量是数据字段，不是句子里的数字；同词根不同部位的剂量差异能被列表比较。
3. 复测不再产生第二套说法；`plain()` 运行时替换、`FRIENDLY_ASSESSMENT_COPY` 手写覆盖、`kneeTreatmentInstruction` 硬编码指令三处旧层删除。

## 2. 现状盘点（实测）

| 来源 | 条数 | 性质 |
|---|---|---|
| `src/knowledge/pilot/full-demo-content.ts` 评估项 `direction/strength/functional/special` | 79 中占 51 | 膝、踝各一份 |
| `src/knowledge/pilot/local-limb-regions.ts` 评估项 `assessment` | 28 | 大腿、小腿各一份 |
| `full-demo-content.ts` + `local-limb-regions.ts` 训练动作 `exercise` | 53 | 四套动作列表 |
| `full-demo-content.ts` + `local-limb-regions.ts` 处理候选 `candidateGroups` | 56 | 四套候选 |
| `src/knowledge/pilot/pilot-knowledge.ts` `treatmentCandidates` | 40 | 同一动作的第二套定义（action 文字） |
| `src/domain/rehab/shared/knee-workflow-adapter.ts:57-78` `kneeTreatmentInstruction` | 19 | 同一动作的第三套定义（硬编码 id→指令） |
| `src/knowledge/pilot/pilot-motion-muscle-knowledge.ts` `userAction/controlTitle/controlInstruction` | 28 | 同一动作的第四套定义 |
| `src/features/rehabmind/components/workbench/workbench-support.tsx:2241` `FRIENDLY_ASSESSMENT_COPY` | 71 | 同一动作的第五套定义（guided 覆盖层） |

**去括号归一后的不同动作名：164。**

同一动作被写满五遍的实例（膝主动屈曲）：

| 位置 | 说法 |
|---|---|
| `full-demo-content.ts:257` | 仰卧，双侧脚跟分别向臀部滑动，骨盆保持稳定。 |
| `pilot-motion-muscle-knowledge.ts:88` | 慢慢弯膝盖（userAction） |
| `pilot-motion-muscle-knowledge.ts:97` | 仰卧，脚跟贴着床面，缓慢把膝盖弯起来，再主动控制着回到起点。 |
| `knee-workflow-adapter.ts:71` | 同上＋先做6～10次 |
| `workbench-support.tsx:2241` | 仰卧，脚跟贴着床面。先做没有不适的一边，再慢慢弯另一边膝盖。 |

## 3. 边界

### 3.1 本轮改变

- 新增动作词根表，作为"动作叫什么"的唯一所有者。
- 评估、处理、训练各自成库，字段贴合各自用途。
- 复测改为引用评估库条目，删除独立的复测文案来源。
- 剂量从句子提升为结构化字段，允许按模式覆盖。
- 删除三处旧文案层（见 §9）。

### 3.2 本轮不改变

- **不合并动作 id。** 现有 164 个 id 已进入历史记录、`retestIds`、`scenario-catalog.ts` 和测试场景注册表。id 全部保留为别名，新增 `id → 词根` 映射表。合并 id 是独立议题，风险另评。
- **不改决策逻辑。** 候选排序、安全过滤（`candidate-safety-core.ts:37-42` 的 access 过滤）、转介阈值、复测义务计算全部不动。本方案只动"内容怎么存、怎么说"。
- **不改界面结构。** 卡片、按钮、分栏、翻页顺序不变，由 §10 的结构快照强制。
- **不引入运行时解析。** 词根插值在构建期完成，运行时读到的是成品字符串常量。

## 4. 目标结构

```
src/knowledge/actions/
  terms.ts          动作词根表：叫法唯一所有者（约 160 条）
  assessment.ts     评估库：怎么做 + 观察点 + 结果选项 + 触发 + access
  treatment.ts      处理库：怎么做 + 剂量 + 目标区域 + retestOf + access
  training.ts       训练库：怎么做 + 为什么练 + 组次 + 阶段 + 退阶/进阶
  custom.ts         自定义动作模板：不入库，用户原话套模板
  legacy-ids.ts     id → 词根 映射（兼容历史记录与复测指向）
  resolve.ts        渲染解析器：模式分叉只在这里发生一次
  index.ts          对外导出与查询（按 id、按部位、按词根）

scripts/knowledge/
  export-catalog.mjs   生成 outputs/catalog-review.xlsx（6 sheet，供 owner 审阅）
  check-catalog.mjs    构建期校验（见 §8）
```

**为什么分三库而不是一个库**：评估需要结果选项与观察点，训练需要组次/阶段/退阶进阶，处理需要剂量与复测指向。合成一个库会让每条记录带一堆用不上的字段，且"这个字段在评估里是什么意思"会变成新问题。分库后各表字段干净；跨库共享的只有词根叫法。

**为什么整句留在各库、只共享词**：评估的"怎么做"必须带比较语（"先做没有不适的一边，再…"），训练的"怎么做"必须带节奏（"停1秒再缓慢落下"）。用途不同，句子确实该不同；但句子里的动作名不允许再手写。

## 5. Schema

### 5.1 词根表 `terms.ts`

```
词根 key        稳定标识，kebab-case，永不改名
plain           自助模式叫法
pro             专业模式叫法
```

示例：

```
heel-raise-standing  站着踮脚尖      立位提踵
heel-raise-seated    坐着踮脚尖      坐位提踵
heel-raise-single    单脚踮脚尖      单腿提踵
heel-raise-hold      踮到最高处停住  提踵等长保持
heel-raise-fast      快速踮脚尖      快速提踵
knee-bend            弯膝盖          膝关节屈曲
```

**粒度线（owner 已确认）**：怎么做这句话的文字会变 → 独立词根；只有次数/秒数/组数变 → 同一词根、不同剂量参数。因此坐姿提踵与扶墙站姿提踵是两个词根。

### 5.2 评估库 `assessment.ts`

```
id            沿用现有 id（legacy 兼容）
region        knee | ankle-foot | thigh-local | calf-local | spine
kind          direction | strength | function | special
access        self | coach | therapist
title         { plain, pro }
action        词根 key（可多个，主词根必填）
how           模板串，用 {词根key} 插值，不含剂量
observe       { plain, pro }
options       结果选项组名（引用统一选项集，不再各写一份）
caution       可选，安全提示
trigger       可选，何时进入本检查
```

### 5.3 处理库 `treatment.ts`

```
id / region / access 同上
type          muscle | control | joint | swelling | symptom-management
title         { plain, pro }
action        词根 key
do            模板串，剂量用 {dose.*} 占位，不写死数字
dose          { sets, reps, holdSeconds, side }，可选 thinking 覆盖
targetRegion  目标肌肉/关节区域标识
retestOf      指向评估库某条 id（复测即重做该评估）
```

### 5.4 训练库 `training.ts`

```
id / region / access 同上
stage         1..5（恢复目标阶段）
title         { plain, pro }
action        词根 key
how           模板串，不含剂量
purpose       { plain, pro }
dose          { sets, reps, holdSeconds }，可选 thinking 覆盖
easier        模板串
harder        模板串
tags          沿用现有 tags（居家放松映射依赖它，见 §11 风险）
```

### 5.5 剂量规则（owner 已确认）

1. 剂量是对象字段，不是句子里的数字。界面文字由模板生成，显示效果与现在一致。
2. 允许按模式覆盖：`dose: { sets: 3, reps: "10～15", thinking?: { reps: "20" } }`。不填则两模式共用。
3. 同词根的剂量差异必须能在导出表里按列比较，用于持续发现漂移。

## 6. 语域规则

一条记录带 `plain` / `pro` 两套文案，**不建两个库**。理由：两种模式做的是同一件事，只是说法不同；分库必然重现漂移。

真正"做的事不同"的（被动活动度、关节松动、Thompson、前抽屉等）用 `access` 挡，不用语域挡——现有 `candidate-safety-core.ts:37-42` 的 access 过滤机制保留不变。

模式分叉只在 `resolve.ts` 发生一次：

```
render(entry, mode):
  t = (key) => TERMS[key][mode === "guided" ? "plain" : "pro"]
  return { title: entry.title[mode], how: fill(entry.how, t, entry.dose), observe: entry.observe?.[mode] }
```

现有 `docs/plans/copy-layering-convention.md` 的分层约定继续有效，本方案是它的实现载体。

## 7. 复测与自定义动作

**复测**：不再单独建库、不再单独写文案。`treatment.retestOf` 指向评估库条目，复测卡标题与选项直接取该条目的 `title` / `options`。删除以下四处独立来源：

| 位置 | 现在写的是什么 |
|---|---|
| `knee-workflow-adapter.ts:80+` `kneeRetestInstruction` | id→复测动作名 19 条硬编码 |
| `pilot-motion-muscle-knowledge.ts:88` `userAction` | 复测提示语 |
| `summary-stage.tsx:709、711` | 复测结果选项手写 |
| `treatment-retest-stage.tsx:841` | 复测卡标题 |

**自定义动作**：不进词根表（用户原话无法预定义）。`custom.ts` 只提供模板与通用提示，句子里出现的"再试一次""这个动作"等固定词从词根表取。当前自定义动作卡的"承重/负重/小负荷"提示语 owner 已裁定本轮不改，迁移时保持原文，只换来源。

## 8. 构建期校验与导出

`npm run check:catalog` 必须覆盖：

1. `action` 引用的词根在 `terms.ts` 中存在。
2. `retestOf` 指向的评估 id 在 `assessment.ts` 中存在。
3. `access`、`kind`、`type`、`region`、`stage` 取值合法。
4. `how` / `do` / `purpose` 模板里出现的 `{...}` 占位符都能解析（词根或剂量字段）。
5. 句子中不得再出现剂量数字（正则查 `\d+\s*(个|次|秒|组)`），防止剂量重新写回句子。
6. 同一 `region` + 同一 `action` + 同一 `kind` 不得重复定义。
7. `dose` 与同词根其他条目差异超过阈值时输出警告清单（供 §5.5 的漂移比较）。

`npm run export:catalog` 生成 `outputs/catalog-review.xlsx`，6 个 sheet：词根表、评估库、处理库、训练库、自定义模板、id 兼容表。owner 在表里审阅、排序、查重；**表是产物不是真源**，改动一律回到 TS，由 `check:catalog` 兜引用完整性。

## 9. 要删除的旧层

| 位置 | 内容 | 删除理由 |
|---|---|---|
| `workbench-support.tsx:2305-2313` | `assessmentCopy()` 内 13 条 `replaceAll` 运行时翻译 | 打补丁式改写法；已产生反向 bug（原 `:2314` 把"没受伤的那边"替换成"健侧"，已在 `28fd9ca` 删除）。语域改由 `plain/pro` 字段承担后不需要运行时字符串替换 |
| `workbench-support.tsx:2241` 起 | `FRIENDLY_ASSESSMENT_COPY` 71 条手写覆盖 | 第五套真相；改为从评估库生成 |
| `knee-workflow-adapter.ts:57-78` | `kneeTreatmentInstruction` 19 条 id→指令 | 第三套真相；改为处理库 `do` + `dose` |
| `full-demo-content.ts` 各 `resultOptions` | 不参与渲染的死字段 | 实测 UI 用 `activeMotionRangeOptions` 等，改它无效 |

删除必须排在迁移最后（§10 批次 7），且只在结构快照全绿后执行。

## 10. 迁移批次与验收

每批独立提交、独立可回滚，验收口径统一为：`tsc --noEmit` 干净 ＋ `check:catalog` 干净 ＋ 结构快照一致 ＋ Playwright 场景实测无空白/无报错。

| 批次 | 内容 | 为什么这个顺序 |
|---|---|---|
| 0 | 建 `terms.ts` + `resolve.ts` + `check-catalog.mjs`，只放提踵族 5 个词根 | 先立骨架和校验，不接渲染 |
| 1 | 提踵族全量迁移（评估 6 ＋ 处理 2 ＋ 训练 6 ＋ 复测指向），含 §12 的 4 条剂量收敛 | 重复最多、争议最小，用来验证 schema 是否够用 |
| 2 | 功能动作族：走路、下蹲、坐站、上下台阶、单腿站、小跳落地 | 剂量差异小，纯文案重复 |
| 3 | 活动度方向族：膝屈伸、踝四方向、髋四方向、足趾 | 涉及 `professionalAssessmentTitle` 与 AROM 标题合并 |
| 4 | 力量/等长族：夹枕、推墙、勾脚、内外翻、脚跟拖地 | 需要拆 how 与 dose，最费人工 |
| 5 | 处理候选族：`candidateGroups` 56 条 ＋ `pilot-knowledge` 40 条 | 牵 `build-trial-targets-core.ts:176` 的指令注入 |
| 6 | 训练动作族：`exercise` 53 条 | 风险最高，见 §11 |
| 7 | 删除 §9 四处旧层 | 只有前六批全绿才能删 |

## 11. 已知风险与对策

1. **`exercise()` 的体位推断**（`full-demo-content.ts:235-244`）用正则匹配 `${title} ${how}` 决定 `startPosition`。迁移后 how 变成模板串，若推断发生在数据定义期，插值结果必须与现在逐字一致，否则体位标签会错。对策：批次 6 前先把推断改为显式 `position` 字段，再迁句子。
2. **居家放松的标题映射**（`home-relaxation-core.ts:109-119`）按 `tags` 与**标题文本**双路匹配。`站立屈髋（臀部向后）` 的括号是"臀"标签的唯一来源，删括号会静默少一项放松区域（本轮文案批次已因此撤回该处改动）。对策：批次 6 把该映射改为只依赖 `tags`，并补齐缺失的 glute 标签，之后才允许动标题。
3. **动作别名匹配**（`knee-decision-core.ts:148-161` `ACTION_ALIASES`）作用于用户文本与评估标题，不作用于处理指令；但 `knee-workflow-adapter.ts:194` 会拿评估标题去匹配。对策：迁移评估标题时保留 `legacy-ids.ts` 的旧标题别名，匹配函数同时接受新旧。
4. **测试侧字面断言**。`28fd9ca` 已打破 9 处断言并写入通知档第 14 轮。本重构会持续改变可见文字。对策：每批提交后在通知档追加"本轮新破断言清单"，并重申按结构断言、不钉文案字面。
5. **人工文案量**。164 动作 × 2 语域 × (怎么做＋观察点) ≈ 650 条。对策：`pro` 版全部沿用现有专业文案（零新写）；`plain` 版从 `assessmentCopy()` 13 条替换与 `FRIENDLY_ASSESSMENT_COPY` 71 条覆盖中提取术语表（约 60 条）机械生成，只有生成后仍含表外术语的条目需要 owner 过目，预计 80 条以内。

## 12. 已锁定的决定

**结构类**

- 分库：词根表 ＋ 评估库 ＋ 处理库 ＋ 训练库 ＋ 自定义模板 ＋ id 兼容表。
- 复测引用评估库，不单独建库。
- 一条记录带 `plain`/`pro` 双语域，不分两库；"做的事不同"用 `access` 挡。
- 粒度线：怎么做文字会变＝独立词根；只有次数变＝参数。
- 剂量结构化，允许按模式覆盖。
- id 全部保留为别名，本轮不合并。
- 真源 TS ＋ xlsx 导出审阅；构建期插值，运行时零解析。
- 双写期跑结构快照，结构不一致即回滚。

**临床类（owner 已裁定）**

| # | 决定 | 影响条目 |
|---|---|---|
| 1 | 评估单脚踮脚尖上限 20 → 10 | `ankle-calf` |
| 2 | 评估踮脚尖次数 5 → 10（owner 确认非有意区分） | `knee-heel-raise`、`calf-heel-raise-strength`、`calf-heel-raise` |
| 3 | 训练站姿双脚提踵统一 3组×10～15 | `calf-back-standing-raise`、`ankle-band-heelraise`、`calf-medial-arch` |
| 4 | 剂量不得写在句子里 | `calf-medial-arch` 已单独修（`a70af60`） |
| 5 | 大腿后侧发力由"脚跟拖地等长"改为臀桥 | `local-limb-regions.ts:51`（已在 `28fd9ca` 落地） |
| 6 | "抬起足弓"类不可执行动作统一改为踮脚尖／脚趾抓毛巾 | `full-demo-content.ts:311、566、598`、`local-limb-regions.ts:99、108`（已落地） |

## 13. 待决事项

1. `full-demo-content.ts:266` 膝·腘绳肌评估仍是"脚跟踩地向后拉但不移动"。它是**检查**不是训练，改成臀桥会换测量目标。批次 4 前需 owner 定：保留等长检查但把句子讲清（"像要把脚跟往椅子底下拖，但别真动"），还是换测量动作。
2. `full-demo-content.ts:262`（术后瘢痕活动）与 `:386`（骰骨与足外侧柱活动）的 `access` 是 `self`，但正文写"由专业人员……"，自助用户会看到自相矛盾的说明。批次 3 前需 owner 定：改 access 还是改正文。
3. `pilot-knowledge.ts` 的 40 条 `treatmentCandidates.action` 与 `candidateGroups` 的 56 条是否同一批动作的两套真相——需在批次 5 前确认前者是否有任何渲染路径，若无则并入，若有则定优先级。

## 14. 关联提交

| SHA | 内容 |
|---|---|
| `28fd9ca` | 自助模式全阶段文案口语化（本方案的动因与临时补丁） |
| `a5c2324` | 通知档第 14 轮：9 处待解钉断言与有意保留清单 |
| `a70af60` | 修 `calf-medial-arch` 句内剂量与组数字段矛盾 |
