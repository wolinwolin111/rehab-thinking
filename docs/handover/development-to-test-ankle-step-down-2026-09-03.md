# RehabMind 开发→测试交接：第二批① 踝区下台阶功能项（主诉下楼直接复现）

日期：2026-09-03
基线：main @ `b37d5a0`（上一批移动端 1.5 自检修复）
批次 SHA：本提交
范围：owner 既定方案「选项②：主诉下楼直接复现，不再代换为膝碰墙」落地；第二批其余三项（自定义动作复现、功能分问法、A-3 标注）后续单独开。

## 1. 本批改动（6 源文件）

| # | 文件 | 说明 |
|---|---|---|
| 1 | `full-demo-content.ts` | 踝区 functions 新增 `functional("ankle-step-down", "下台阶", …)`（模板 = 膝区 `knee-step-down` line 279）：观察点改为踝足方向与足弓稳定；tags `["step-down","eccentric","stairs","ankle-control"]`；不可测条件=急性明显肿胀/不能稳定负重/走路仍明显疼 |
| 2 | `function-assessment-plan-core.ts` | (a) `FUNCTION_LOAD_ORDER` 增 `ankle-step-down:2`；(b) `FUNCTION_ACTION_META` 增 `{kind:"task-performance", stage:"progression"}`；(c) `STRUCTURED_ACTION_ASSESSMENTS` 踝区 `functional-step-down`/`functional-stairs` 由 `ankle-knee-wall` 改指 `ankle-step-down`；(d) 关键词映射「下楼/下台阶」由 `ankle-knee-wall` 移出、改推 `ankle-step-down`（膝碰墙仅保留给「膝碰墙/背屈/踝前卡」）；(e) `functionActionIsRelevant`：`ankle-knee-wall` 排除"楼"关键词，新增 `ankle-step-down` 相关性闸门 |
| 3 | `pilot-decision-engine.ts` | `taskPriority` 增 `id==="function:ankle-step-down"` 且主诉含下楼/下台阶 → 80（与膝区同权） |
| 4 | `workbench-support.tsx` | `FUNCTION_COMPENSATIONS` 增 `function:ankle-step-down` 补偿列表；`FRIENDLY_ASSESSMENT_COPY` 增 `ankle-step-down`（标题"下台阶（脚踝）"）；`assessmentTitle` 增 `ankle-step-down` |
| 5 | `pilot-motion-muscle-knowledge.ts` | 专业名映射增 `"ankle-step-down": "踝足下台阶控制检查"` |

## 2. 行为契约变化（给测试侧）

- 踝区主诉含「下楼/下台阶」：评估队列由原来的 `function:ankle-knee-wall`（膝碰墙背屈，代换）改为 `function:ankle-step-down`（下台阶，直接复现）。
- 踝区主诉仅含「踝前卡/背屈/膝碰墙」：仍走 `function:ankle-knee-wall`，不受影响。
- 膝区「下楼/下台阶」：仍走 `function:knee-step-down`，不受影响。
- 新增功能项为**主诉驱动**：用户提到下楼/下台阶才进入候选池；未加入踝区默认渐进路径（returnToSportPath 不变），不改变与下台阶无关的踝区流程。

## 3. 验证

- `npm run typecheck` 干净。
- 纯核心探针（`scripts/tmp-verify-ankle-step-down.mts`，已删）：5 项断言全过——踝区"下楼"→`ankle-step-down`（不含 knee-wall）；踝区"踝前卡"→`ankle-knee-wall`；膝区"下楼"→`knee-step-down`；`ankle-step-down` 对"下楼"为相关；`ankle-knee-wall` 对"下楼"不再相关。
- 组件/契约测试：与批次 1.5 末态一致（`first-use-entry-contract:43` 已知批次 1.5 红 + rendered-html 6 条预存红），**本批 0 新失败**。

## 4. 第二批其余项（未做，后续单开）

- 自定义动作复现项 (a′)：无负重模仿复现 + 负荷/安全闸。
- C-2 功能问法按「距离/幅度类 vs 能力类」分问法。
- A-3 对应主诉标注（待映射修正后再定）。
