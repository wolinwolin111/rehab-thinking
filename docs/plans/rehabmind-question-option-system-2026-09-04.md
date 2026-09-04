# RehabMind 提问与选项体系·现状与目标（批次 3 前审阅版）

> 文档状态：供 owner 审阅，未动任何代码
> 建立日期：2026-09-04
> 范围：应用里所有"用户点按钮作答"的按钮文字、条件追问（无法完成→原因→引导）、以及各层之间的边界
> 关联：docs/plans/rehabmind-action-catalog-execution-master-2026-09-04.md §5（批次 3）

## 0. 这份文档回答什么

"用户在应用里点按钮作答"的全部文字，现在散落在 5 个组件文件里；目录化改造（批次 0–2）已收进一部分。本文档把**完整的分层结构、每一层现在的存放位置、批次 3 要怎么收、收拢后你在哪里审**一次讲清。所有"现状文字"均为代码实测，非推测。

## 1. 三层结构总图（以"膝关节主动屈曲"实拍为例）

```
第 1 层  作答按钮        「接近健侧 / 患侧偏小 / 无法完成 / 暂不判断」
                            │ 用户点「无法完成」
                            ▼
第 2 层  原因追问包      标题「是什么让你停下来？」
                          提示句「如果是因为疼所以不敢继续，选"疼痛或不适"。」
                          「疼或不舒服 / 担心继续会加重 / 不会做或没听懂说明」
                            │ 用户点某个原因
                            ▼
第 2.5 层 引导框（先这样试）  按所选原因给一组"怎么做＋兜底说明"
                            │ 仅当原因=疼
                            ▼
第 3 层  疼痛记录控件    位置图（左/右 · 大腿/膝盖/小腿）＋ 0～10 分滑条
```

## 2. 分层现状账（✅已收进目录 / 🔜批次3收 / ⛔明确不收）

| 层 | 内容 | 状态 | 现在写死在哪 |
|---|---|---|---|
| 一层·作答按钮 | 27 条评估的按动作标签（9 组功能动作＋力量提踵组） | ✅ 数据已入库（批次 2），UI 未接线 | 旧：`activeMotionRangeOptions` 等 8 组＋力量卡 9 组字面 → 新：`option-sets.ts` + 条目 `options` |
| 一层·通用组 | 复测结论五方向词（有好转/差不多/加重/说不清/做不了） | ✅ 已入库（`retest-outcome` base） | 旧：`summary-stage:709/711` 等 → 新：已收 |
| 一层·有意通用 | 红旗、两侧对比、影像医嘱、自定义模仿方式、训练反馈、进退档 | ✅ 已登记"有意不定制"及理由（`GENERIC_REGISTRY` 7 条） | 留在组件 |
| 二层·原因按钮 | 4 套值契约：motion(pain/fear/instruction)、function(pain/weak/fear)、strength(pain/weak/control/no-helper/fear)、special(pain/fear/safety-signal) | 🔜 批次 3（T3-0b） | `assessment-stage:637-641`、`training-stage:202`、`summary-stage:514`、`treatment-retest:368`、力量卡 `:687-692` |
| 二层·提示句 | 「如果是因为疼所以不敢继续，选"疼痛或不适"。」 | 🔜 批次 3 随 base 走 | `assessment-stage:636` |
| 二层·引导框 | 现状 motion 3 套＋strength 5 套；**裁定后仅存 no-helper 1 条**（见 §3.2） | 🔜 批次 3（含 `{how}` 注入） | `workbench-support:2577-2595`（motion）、`:2597-2619`（strength）——7 套删除 |
| 三层·疼痛记录 | 位置图、0～10 分、熟悉的不适 | ⛔ 明确不收——数据采集控件不是文案 | 留在组件（`renderSymptomDetails`） |
| 决策消费 | 原因的**值**驱动：pain≥7→转介、instruction→教学缺口台账、no-helper→缺口补测、weak→力量证据 | ⛔ 值契约锁死，永随决策层 | `assessment-gap-core`、`rehabmind-workbench:3478` 等 |

## 3. 二层"原因→引导"逐项清单（实拍＋代码核对）

### 3.1 值契约 4 套（值锁死；标签批次 3 可在目录改）

| 契约 | 用于 | 值 | 现行标签 |
|---|---|---|---|
| motion | 动作卡「无法完成」 | pain / fear / instruction | 疼或不舒服 / 担心继续会加重 / 不会做或没听懂说明 |
| function | 功能卡、复测、训练反馈、复查看板（4 处共用同一套字面） | pain / weak / fear | 疼或不舒服 / 没力或撑不住 / 担心继续会加重 |
| strength | 力量卡「主要卡在哪里？」 | pain / weak / control / no-helper / fear / instruction | 一用力就不适 / 完全使不上力 / （控制） / 不会做或没听懂说明 / 不敢继续 |
| special | 特殊检查 | pain / fear / safety-signal / cannot-perform | （special-test-record-core） |

### 3.2 引导框处置（owner 裁定 2026-09-04：只留 no-helper 一条）

**裁定过程**：先全量保留（流程核实后推翻了"删掉"的第一判断）→ owner 指出 pain 引导无意义 → 核实代码：引导框是纯展示，**零状态/路由/缺口消费** → 按"无不可替代流程功能即删"统一判据处置。

| 原因 | 原引导（现状原文） | 处置 | 理由 |
|---|---|---|---|
| pain（motion/strength 两处） | 改成坐稳或躺稳，只做不会明显加重的小幅动作…／减小用力，只尝试轻轻保持3秒… | **删除** | 代码零消费；与"如实记录疼痛"的任务相互干扰；改良尝试无 UI 回路兑现 |
| instruction | 先回到起始姿势，只做一小段：{该动作的怎么做} | **删除** | 「怎么做」折叠在同一卡上方，当场重教冗余；缺口台账（motion-instruction）本就会带回该项 |
| weak / control | 先不加阻力，在舒适范围找到位置并保持3秒。 | **删除** | 力量卡上方已有"停住不动，看稳不稳"操作说明；信息无增量 |
| **no-helper** | **改用自助等长：{该动作的怎么做}** | **保留** | **不可替代**——唯一切换测试模式的引导；自助版做法不在当前页面显示，删了检查以"无法判断"结束 |

**收拢后 motion/strength 契约形态一致**：pain→直进疼痛记录；instruction→直进缺口台账；fear→直进待确认；仅 strength 的 no-helper 显示引导框（目录中唯一一条 guidance）。

**原则（判据统一，供未来新增原因时沿用）**：引导只在"离开它就断路"时存在。

### 3.3 原因值的下游（为什么值不能动）

| 值 | 决策层消费 |
|---|---|
| pain（动作＋分≥7） | 高激惹转介（HDUEYFGS 案例） |
| pain（其他） | finding=painful → 处理安排 |
| weak / control | finding=weak → 力量缺口 → 训练 |
| instruction | 缺口 `motion-instruction`/`strength-instruction` → 单项回访 |
| no-helper | 缺口 `strength-no-helper` → 自助版补测 |
| fear / 其他 | finding=not-testable / unclear → 待确认 |

## 4. 批次 3 收拢后的形态

```
src/knowledge/actions/option-sets.ts（新增 4 个 base）
  "unable-reason-motion":   { values, labels, hint }              // pain/instruction 引导按裁定删除，直进下一层
  "unable-reason-function": { values, labels, hint }              // 复测/训练/复查看板 3 处共用；无引导
  "unable-reason-strength": { values, labels, hint,
                              guidance: { no-helper: { action: "改用自助等长：{how}", fallback: "不需要他人按压；仍无法判断就先跳过。" } } }
                                            // ↑ 全应用唯一保留的引导（owner 裁定 2026-09-04：判据=离开它就断路）
  "unable-reason-special":  { values, labels, hint }
src/knowledge/actions/index.ts（对外 API，批次 3 建立）
  renderOptions(id, kind, mode)          ← 一层标签上屏
  unableFollowUp(kind, mode, how)        ← 二层整包：{hint, reasons:[{value,label}], guidanceFor(reason)}
  assessmentTitle(id, mode)              ← 标题双轨合并（AROM 后缀保留，D3-1）
```

- **不改任何显示**：接线后每个字与现状一致（逐字锚定＋结构快照双保险）；
- **改文字只去一个文件**：按钮、提示、引导从此都在 `option-sets.ts`；
- **三层追问不进**：位置图/分数/熟悉的不适留在组件（数据控件）；
- **有意通用登记**：原因选项不按动作定制（owner 裁定），与红旗、两侧对比等并列登记。

## 5. 你审什么、什么时候审

| 时点 | 审什么 |
|---|---|
| 现在（本文档） | 分层边界是否认可；3.2 的引导文字有没有你想改的（改的话批次 3 收拢时一并落）；有意通用清单是否完整 |
| 批次 3 暂停点 | 新旧按钮/追问包逐屏对照（此时才首次可见变化）；AROM 标题保留效果 |
| 每批暂停点（固定） | Excel 审阅表增量（批次 3 会新增「选项标签」「追问包」两个 sheet） |
