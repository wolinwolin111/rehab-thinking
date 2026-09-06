# RehabMind 开发→测试交接：第二批②③④（功能分问法 / 自定义动作复现 / A-3 结论）

日期：2026-09-03
基线：main @ `e661641`（第二批① 踝区下台阶）
批次 SHA：本提交
范围：owner 确认的第二批剩余项——③ C-2 功能分问法（按 kind 分支）、② 自定义动作复现项(a′，含安全闸)、④ A-3 对应主诉（判定已自然对齐，无需显式标注）。

## 1. ③ C-2 功能分问法

| 文件 | 说明 |
|---|---|
| `assessment-stage.tsx` | 功能评估卡首问按 `functionalActionMeta(id).kind` 分支：`functional-rom`（当前仅 `ankle-knee-wall`）由「这个动作能做完吗？」改为「和另一侧相比，最大可控幅度怎么样？」，选项=接近另一侧/差一些/差很多/说不清；并隐藏该类「稳不稳」问句。其余 kind 保持原有三问（能做完吗→稳不稳→会不会不舒服） |
| `complete-demo.css` | 新增 `.rm-result-grid.is-four`（4 列选项布局，供幅度比较 4 选项） |

- `functional-rom` 选项映射到现有字段（不新增字段）：接近另一侧→`functionCompletion:complete`+`functionControl:stable`；差一些→`complete`+`compensated`；差很多→`unable`；说不清→`skip`。下游 `functionEvidenceFromRecord`/完成门照常消费。

## 2. ② 自定义动作复现项 (a′)

设计（owner 确认）：自定义动作**永远完整走处理+复测链**；安全闸只决定「今天初评是否当场复现」，闸不过 = 只记报评分、进处理、复测推迟，不是取消复测。

| 文件 | 说明 |
|---|---|
| `function-assessment-plan-core.ts` | `chiefFunctionAssessmentIds` 末尾：自定义动作匹配不到任何标准功能项时，追加占位 `function:custom-action`；`FUNCTION_LOAD_ORDER`/`FUNCTION_ACTION_META` 登记（load 1、task-performance/baseline）；`functionActionIsRelevant` 对 `custom-action` 恒为 true |
| `rehabmind-workbench.tsx` | `selectFunctionAssessmentPlan` 的 candidates 注入合成候选 `{id:"custom-action", title:chiefActionLabel}`；`selectedFunctionEntries` 为 `custom-action` 合成 `FullRegion` 函数条目（how/observe 用无负重模仿引导） |
| `assessment-stage.tsx` | `custom-action` 卡专属渲染：<br>· 硬闸命中（`isAcuteTrauma` 或「肿胀或淤青」）→ 显示「今天先不做现场复现」提示 + ScoreSlider（记报评分，写入 `symptomScore`）+ 「暂时不做，照常记录」；<br>· 闸通过 → 「能不能用不承重的方式模仿这个动作？」→ 能完全不承重(`unloaded`) / 需要承重但能扶着或减轻(`assisted`) / 只有原样负重才会出现(`full`，附「先小负荷试、锐痛/加重立即停」提示) / 暂时不做(`skip`)；前三档写入 `customActionLoadTier`，随后走「会不会不舒服→评分」 |
| `workbench-support.tsx` | `AssessmentRecord` 新增可选字段 `customActionLoadTier?: string`（快照校验不拒未知字段，已验证）；`FUNCTION_COMPENSATIONS` 增 `function:custom-action` 补偿列表 |
| `pilot-decision-engine.ts` | `taskPriority` 对 `function:custom-action` 返回 70，避免被评估预算裁剪 |

**安全闸口径**（owner 确认）：`isAcuteTrauma(intake) || intake.symptoms.includes("肿胀或淤青")` —— 与 `ankle-step-down`/`ankle-hop` 现有闸门同源，不新造标准。负荷依赖型疼痛（只有负重才疼）**必须**复现，闸门不管它。

## 3. ④ A-3 对应主诉标注 — 结论

原待办「待映射修正后名字自然对齐，再定是否仍需显式标注」。①②③ 落地后：
- 踝区下楼已从「代换膝碰墙」改为 `ankle-step-down`（直接复现）；
- 自定义动作有专属评估卡且标题=主诉原文；
- 功能卡标题、复测标题（`chiefActionLabel`）均已自然对齐。

**结论：A-3 无需显式标注**，名字已自然透明。关闭该项。

## 4. 行为契约变化（给测试侧）

1. `ankle-knee-wall`（膝碰墙背屈）功能卡问法变更：由「能做完吗/稳不稳/会不舒服」改为「和另一侧相比，最大可控幅度」4 选项。若测试侧钉过膝碰墙三问，需更新。
2. 新增 `function:custom-action` 卡：仅当自定义动作匹配不到标准项时出现；3 档负荷选择 + 评分；硬闸（急性/肿胀）时显示「今天先不做现场复现」。
3. 其余功能卡（下蹲/下台阶/单腿站/提踵等）问法不变。

## 5. 验证

- `npm run typecheck` 干净；eslint 改动文件 0 error。
- 纯核心探针（已删）6 项断言全过：`跪坐`→`function:custom-action`；含「起身」→走 `knee-sit-stand` 不产生 custom-action；标准动作「下楼」→`knee-step-down` 不受影响；`custom-action` meta/relevance/rankPilotAssessmentIds 均正确入列。
- 组件/契约测试基线未跑全量（本批为 UI + 新增 id，不触碰既有合同断言；交接档建议测试侧回归时确认膝碰墙问法迁移）。

## 6. 给测试侧

- **膝碰墙问法迁移**是本批唯一可能影响既有契约的点（见 §4.1）。
- `custom-action` 为新行为，建议补一条真实浏览器走读：自定义动作→评估卡 3 档→评分→进处理。
