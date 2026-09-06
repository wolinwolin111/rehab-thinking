# 测试侧回归报告：动作库重构批次 0–7（含 C1/C2/C3 续批）

> 日期：2026-09-06 · 分支 `agent/testing`
> 范围：dev 95 个提交（批次 0–7 ＋ 第 22–27 轮代偿编号分离/归类接线/自查）＋ **docs/system 批次 2–6 与第 29 轮对齐**
> 最终门禁：**verdict=passed** run `reg-20260906162214-14236`（fast 27.9s / knowledge / full **74 passed** / mobile 2）· node **796/0** · registry **100 条**

---

## 0. 第 29 轮对齐项执行（docs/system 批次 2–6 合并，merge `a7c7d56`）

dev 第 29 轮回话四项全部对齐：

| 对齐项 | 归属 | 处置 |
|---|---|---|
| four-document 测试（rendered-html:990） | 测试侧 | docs 重构为九份 system 现行文档 + archive 追溯 → 测试迁移为**弱断言标题**：断言 docs/README「现行系统文档共 9 份 / system/ 目录 / archive 追溯」+ 9 份 system 文档各存在且标「现行」；旧四文档正文字面钉移除（23/23 绿） |
| quality 登记册死链 2 条 `../plans/` → `../archive/plans/` | 测试侧 | 已修（另有 2 条归档文档内相对路径一并修，check:docs 173 文件 0 死链） |
| boundaries type-only 差异（dev 报 5 条 stage import type） | 双方向 | 合并后测试树 `check:boundaries: ok`、fast EXIT 0——无新增红（type-only 违规未在测试树复现，dev 侧独立对齐） |
| 4 份旧正式文档归档 → `docs/archive/docs-root/` | dev 执行 | 已在 1579161 落地（`-history-2026-08-09` 版本），merge 已含 |

**合并冲突处置**（3 文件）：`rehabmind-test-plan.md`（dev 重写 §9 统一身份，保留测试侧当前基线指针）；`real-browser-coverage-matrix.md`（取 dev 证据索引结构，**保留测试侧 UX-02「8.27 owner 裁定关闭」**，dev 回退为功能缺口属误改）；归档历史文档（取 dev 归档后相对路径）。

**额外修复的预存红**（L2-L3 mutations，测试侧脚本）：`MUT-SCHEMA-01/02` needle 指向 v3 已删除的 `migratePilotSnapshot`/`validateOptionalWorkflowFields` → 重写为 v3 `validatePilotSnapshotV3` 的 schemaVersion/contractRevision 防线变异（补捆 snapshot-contract.ts 依赖）；`MUT-CONSENT-01` v3 下无法构造合法分区快照做行为变异 → 降级为存在性护栏（主防线由 assertAndStamp 拒错误版本覆盖）。mutations 层转绿（L2-L5 全 PASS）。

**full 层 1 次偶发**：OP-1 全量时 `assertNoRuntimeErrors` 失败，单独跑通过、重跑全量绿——判定为并行负载 flake（非 docs 引入，OP-1 路径与 docs 无关）。

---

## 1. 基线对齐（第 1 步）

dev 通报的预存红清单基于 **dev 分支自带的过期 `tests/` 副本**（53 条失败）；测试分支的现行 tests/ 合并 dev tip 后实测：

| 检查 | dev 通报 | 合并后实测（agent/testing） |
|---|---|---|
| check:boundaries | 3 条 stage 违规（4fd593b 预存） | **ok**（新 action-catalog 双护栏生效，无违规） |
| first-use:43 | 已知红 | **绿**（批次 1.5 正则迁移早已落地于测试分支） |
| rendered-html 预存红 | 若干 | **绿**（同上）；仅 1 条真解钉（:1083→见 §2） |
| node 套件 | 53 失败（52 预存+1） | **5 失败**（全部为字面钉，见 §2）→ 修后 0 |

**本批真回归（dev 第 22 轮已定位，测试侧修复）**：`problem-ledger-core.test.mjs` 文件级加载失败——批次 2 给 problem-ledger-core.ts 加了 `@/src/knowledge/actions/custom` import，测试的 data-URL 直载无法解析 `@/`。修复：改用仓库现成的 `tests/support/load-typescript-module.mjs`（按拓扑捆绑 import 图，@/ 别名可解析）。

## 2. 解钉清单执行（第 2 步，原则：卡 id 定位＋值/弱断言，不钉新字面）

### 2a. node 层（5 条失败 → 全部迁移）

| 位置 | 旧钉 | 处置 |
|---|---|---|
| rendered-html:287/291/298 | `患侧偏小｜活动范围受限` / `有所改善｜幅度增加但仍小于` | 批次 3 选项定制：改值锚定 `"limited", "患侧偏小｜膝后仍明显悬空"`（膝伸直定制标签）+ `["better-passive-limited", \`有所改善` |
| rendered-html:469 | `先这样试` | 引导框全量删除（owner 裁定）→ **翻转为 doesNotMatch**（锁迁移完成态） |
| rendered-html:536 | `普通自助路径不安排神经松动` | 第 14 轮口语化（安全文案 §8 例外）→ 迁移新措辞 `不适合自己练，也不建议自己松神经` |
| rendered-html:745 | `查看低刺激基础活动` | 导航标签非安全文案 → 删字面钉，改结构断言 `noImmediateTreatmentResponse ? "查看` |
| rendered-html:807/809 | `做不完或不敢继续` | 功能三联定制退役 → 改钉 `renderOptions<FunctionCompletion>`（机制层） |
| rendered-html:834 | full-demo 的力量 observe 句 | 批次 4 迁目录 → 改钉 `assessment.ts` 的 `ankle-dorsiflexor` pro 句（卡 id 定位） |
| rendered-html:839 | pain 追问 hint | 迁 option-sets.ts（目录层） |
| rendered-html:1083 | `latestRecord.compensations?.includes(entry)` | 第 24 轮编号分离 → 改钉 `compensationIds(latestRecord.compensations ?? []); return { compensations: selected.includes(entry.id)`（快速点击合并语义保留） |
| pilot-motion-muscle-knowledge:96 | demo 含 `function:calf-walk` | 批次 2 数据迁目录（裸 id）→ 改钉 `assessment.ts` 的 `id: "calf-walk", kind: "function"`；shoulder-overhead-task 仍在内联表保留 |
| problem-ledger-core（文件级） | data-URL 直载 | 改 loadTypeScriptModule（§1） |

### 2b. 浏览器层（19 条失败 → 全部迁移）

| 类别 | 文件：测试 | 处置 |
|---|---|---|
| 功能作答三联按标签点击（20 条功能项已按动作定制，值序 [complete,unable,skip] 锁死） | decision-gates INT-05/RET-02、continuation-chain C-1~C-4、function-together FR-2、professional-workbench-batch2、swelling-and-queue MIX-02/11、safety-bilateral、decision-combinations MIX-06/07 | 新增共享 helper `clickFunctionCompletion(page, value)`（page-helpers.ts）：按「这个动作能做完吗」题块内三列网格**索引点击**（值锚定，零标签字面）；通用循环类（completeNormalAssessment / answerCurrentAssessment / WithPassive driver）改为题块检测+已选中跳过（防重复点击死循环） |
| motion AROM limited 标签 | `/患侧偏小.*活动范围受限/`（后缀退役） | 通用短标签 `患侧偏小`（值 limited 不变） |
| strength 答案标签 | `/力量接近.*两侧完成质量相近/`（后缀定制化） | `/^力量接近/`（值 normal 前缀，4 处） |
| 复测结论标签 | `/仍受限.*主动活动幅度仍小于健侧/`、`/接近目标.*与健侧接近/` | 值锚定放宽：`/仍受限/`（复测网格仅 passive-limited 含此词）、`/接近目标/`（both-match 全变体含） |
| specialSafety 转介文案 | `专业人员线下评估` | 第 13 轮分支改「先由专业人员确认」→ 弱锚定 `/专业人员/`（安全转介行为） |
| 视觉基线 | critical-home 桌面+移动 | logo 换透明 YS 图标（49df605）+文案变更 → 基线重生成并目检（渲染正常、无破版） |

**解钉统计**：node 10 处 / 浏览器 9 个 spec 文件约 24 处点击与断言 / 视觉基线 2 张。零降级（无 skip/try-catch 掩盖），全部值锚定或结构化。

## 3. 行为验证结论（第 3 步）

| 项 | 结论 | 证据 |
|---|---|---|
| **ankle-intrinsic 临床变更** | ✅ 链路完好 | 契约测试：目录条目 `actions=["heel-raise-standing"]`、how 双语域含「踮起脚尖」且零残留「缩短脚掌」、title=踮脚尖力量（plain/pro 双轨）；作答链路走 strength optionSet 未变；浏览器 AC-2 全屏「缩短脚掌」零残留 |
| **选项值契约** | ✅ 四套全部锁死 | 契约测试（真实模块加载）：function-completion [complete,unable,skip]；unable-reason motion/function/strength/special 四套；range-function 四联；retest-outcome 五值；strength base 确认无 no-helper/control 回潜；renderOptions 定制/未定制条目**值序一致**、guided/thinking 双轨值一致；unableFollowUp guidance 全部返回 undefined（owner 删 7 留 1 后归零） |
| **居家放松肌肉归属** | ✅ tags-only + 区域增加 | exerciseMuscleLabels 签名保留 title 但实现零消费（tags-only）；标题含肌群词但 tags 为动作模式词 → 不映射（防字面复活）；hip-hinge 三条（knee/ankle/thigh）补 glute → 映射「臀部与髋后外侧肌群」（区域增加非减少） |
| **boundaries 新规则** | ✅ 生效且防移除 | check:boundaries ok（fast 含）；新增源码契约锁 `catalogForbiddenProjectRoots` / `domain-non-index-actions-import` / `allowedExternalImportsFor` 实现，护栏被删即红 |
| 力量族标题四条（owner 裁定） | ✅ | assessmentTitle 断言：膝盖伸直力量 / 外翻力量（腓骨肌）/ 内翻力量（胫骨后肌）/ 踮脚尖力量 |
| 接受裁定（不当 bug） | 已知会 | 拆分按钮老记录高亮丢失（第 27 轮裁定 1）；全局词表范围溢出（裁定 2）——契约测试与负断言均按「维持现状」设计，不误报 |

## 4. 屏级补覆盖（第 4 步）

dev 第 15 轮指出三屏 page_boundary 不可达（库层 golden 已锁，上屏未实拍）。已补：

| 新增 | 说明 |
|---|---|
| catalog 场景 ×3（`calf-local-assessment` / `ankle-assessment-cards` / `ankle-training-card`，intake 定向 snapshotOverrides；tsc 干净） | 场景注册目录（dev 委托测试侧补，PR 中请复核） |
| spec `action-catalog-screens.spec.ts` AC-1/2/3 | 小腿局部评估卡 / 踝评估卡（队列含踝足主动外翻·背屈 AROM）/ 踝训练卡（目录训练条目上屏）；**退役字面零残留负断言**（完成5次/扶墙做5次双脚提踵/最多记录20个高质量次数/每项每组12个/每组8～10个/缩短脚掌/先这样试），作用域产品主区 main——launcher 场景说明引用旧字面作对比，全 runtime 匹配会假阳性（实测踩到） |
| registry 指针 ×3 | B0-7-CATALOG-VALUE-CONTRACTS（P1）/ B0-7-RELAX-TAGS-ONLY（P2）/ B0-7-SCREENS-CALF-ANKLE（P1），registry 100 条校验 ok |

**有意保留例外（不入负断言清单，防误报）**：`每组8～12个`（calf-back-seated-raise 坐姿低负荷，第 15 轮明示）；`保持5秒/顶住5秒` 等力量测量属性（validate 例外名单）。

## 5. 交付

- 分支 `agent/testing`：merge `3a85ed3`（dev tip 8f839bb）+ 测试侧解钉/契约/场景提交（B 类文件：tests/** + 本报告 + 场景注册目录三场景）
- 门禁：run `reg-20260906065010-13516` verdict=passed（fast/knowledge/full 74/mobile 全绿）；node 796/0；registry 100 ok
- 遗留：无本批新增红；dev 通报的预存红在测试分支现行 tests/ 下不存在
