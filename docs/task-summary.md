# RehabMind 任务摘要（当前锚点）

> 本文件是后续执行的**唯一主要依据**。历史讨论中的已废弃方案、已完成的中间步骤、低价值重复输出均不再作为参考。改动前先读本文件。

## 一、项目

- 康复思路助手 RehabMind，代码在 `D:\Study\codex\project\rehab-thinking-demo`。
- 已上传 GitHub `wolinwolin111/rehab-thinking`，main 当前指向 commit `fd93035`。

## 二、当前目标

已完成「普通用户角度」的 UX 审查与修复（症状性质折叠、恢复目标大白话、活动度/控制文案、进度条、TreatmentRoadmap 排版等 7 项）。当前在**从专业用户（康复师/教练）角度审查**流程与界面描述的准确性。

## 三、核心约束（不可违反）

1. **推送**：沙箱拦截 `git push`，必须用 `push-incremental.ps1`（curl 直传 blobs→tree→commit→PATCH ref）。每次改 `parentSha`/`baseTree` 为远程当前值。api.github.com 会偶发 503，**重试即可**。查询远程用 `curl.exe`。
2. **GitHub**：仓库 `wolinwolin111/rehab-thinking`；token 见本地 `push-incremental.ps1`（不入库，建议撤销轮换）。
3. **验证基线**（每次改动后必须全绿）：`npm run typecheck` 0 错、`node --test --experimental-test-isolation=none "tests/*.test.mjs"` 全过（当前 344 项）、两条走读 0 运行时错误。
4. **走读**：`scripts/real-browser-walkthrough.mjs`（自助膝前痛）、`real-browser-walkthrough-patella.mjs`（髌骨专业）；playwright-core 驱动本机 Edge（`channel:"msedge"`，headless）。跑前确认 dev server（`npm run dev`，端口 3000）就绪。
5. **纯核心测试**：`ts.transpileModule` + `data:text/javascript;base64` 导入；多文件用 `loadBundle`（去 export/import、拓扑序）。
6. 本地 git commit SHA 与远程（API 生成）不同是正常的。

## 四、已确认决策（临床/UI）

### 复测与文案

1. **复测分工**：处理阶段只复测疼痛（方向动作加范围）；训练阶段完整复测（功能动作「能否完成+稳不稳+疼痛」、方向动作疼痛确认）。
2. **活动度 ≠ 控制**：活动度是「活动到最大范围，看活动幅度」，控制是「停住不动，看稳不稳」（自助保持只能测 3 级左右控制，不叫「力量」）。文案用「活动到最大范围时」vs「在能不疼的最大范围处停住」区分。
3. **稳定性只在训练后复测**。
4. **「能否完成」**：有代偿也算完成；「仍不能」追问疼/没力/害怕，疼/害怕→结构性风险提示。
5. **配色**：主诉 badge 琥珀橙 `#b45309`；放松标题深蓝 `#1d4e89`；总结卡片中性灰蓝 `#64748b`。

### 普通用户 UX（本轮确认）

6. **症状性质方案 B**：`symptomType` 值不变（10 个），UI 改成 4 个折叠大类（疼痛 / 麻电感 / 无力不稳 / 说不清）。
7. **恢复目标大白话**：先消肿止痛 → 疼痛明显减轻 → 恢复日常活动 → 恢复中低强度运动 → 恢复高强度与对抗。
8. **训练三段式折叠**：默认只显「怎么做」，「做不了/太轻松」用 `<details>` 折叠。
9. **大阶段进度条**：StepHeading 从 eyebrow 解析「第 X 步」自动显示 6 格进度条。
10. **处理进度**：TreatmentRoadmap 排版重做（对勾列表 + 高亮卡 + 编号列表），复测阶段「当前处理」计入已完成。
11. **放松文案**：「紧绷/发酸的地方」替代「肌腹位置」。

### 组织路径

12. **骨应力**：不生成普通肌肉松解；力量/控制走低负荷训练；medical-review 文案已改为「不进入普通肌肉松解；训练按低负荷顺序（无痛走路→基础功能负荷）安排」。

## 五、当前进度（已完成的代码结构）

### 解耦与重构

- 决策层：38 个 `*-core.ts` 纯函数文件。
- 前缀归一化治理：`action-identity-core.ts` 的 `canonicalActionIdFromAssessmentId` 循环剥前缀（支持复合前缀 + track:/tension:）；`chiefFunctionActionLabels` 单向匹配。
- 纯 UI 组件：`ui-primitives.tsx`（8 组件）、`next-session-card.tsx`。
- state hook：`use-function-retest.ts`、`use-training-flow.ts`。
- 纯函数：`trial-record-builder.ts`（`buildTrialRecords`/`resultFromScore`）、`batch-retest-compute.ts`（`computeBatchResult`）、`trial-record-types.ts`（共享类型）。
- 阶段 C（`useDecisionEngine`）**未实施**，指导文档在 `docs/refactor-use-decision-engine.md`，触发条件=明确多关节需求。

### 主组件体积

- `rehabmind-complete-demo.tsx` 从约 7800 行减到约 7640 行（净减约 160 行，8 组件 + 2 hook + 2 纯函数移出）。

### 本轮 UX 文案（普通用户审查）

- 症状性质折叠、恢复目标大白话、活动度/控制文案、训练三段式折叠、进度条、TreatmentRoadmap 排版、放松文案，7 项完成并推送（`fd93035`）。

## 六、未解决问题

1. **崴脚场景浏览器走读脚本未修通**：卡在肿胀位置选择器。
2. **分数锚点（点 2）**：需求文档 `docs/nrs-anchor-requirement.md` 已写，等 GPT 改的文案接入 `ScoreSlider`。
3. **阶段 C（useDecisionEngine）**：等明确多关节需求再做。

## 七、下一步计划

1. 从专业用户角度审查流程与界面描述（当前）。
2. 分数锚点文案接入 ScoreSlider（等 GPT 返回）。
3. 修通崴脚走读脚本。
4. 阶段 C（useDecisionEngine）——仅多关节需求时启动。
