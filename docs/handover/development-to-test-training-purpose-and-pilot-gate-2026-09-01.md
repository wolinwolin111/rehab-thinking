# RehabMind 开发→测试交接：训练卡目的行 + 规则注入发现校验（批 H）

日期：2026-09-01
基线：main @ `8411e33`（批 G）
批次 SHA：本提交

## 1. 批次内容

回应产品 owner 对"基础动作看着没意义"的质疑，审计结论落地两件事：

**H1 训练卡目的行**（full-demo-content.ts + training-stage.tsx）：
- `FullExercise` 新增可选字段 `purpose`；`exercise()` 助手新增第 11 个可选参数（tags 之后）。
- 膝区 15 张训练卡全部补齐一句大白话目的（"为什么练这个"）。其余区域暂缺省——缺省时该行不渲染，无占位。
- 渲染：训练卡"怎么做"之前插入 `<dt>为什么练这个</dt>`（自助）/ `<dt>训练目的</dt>`（思考模式），复用现有 dl 样式，零新增 CSS。
- 顺带完成可读性三张红名（仅膝区）：
  - `knee-hamstring-isometric` 脚跟后拉发力 → **大腿后侧绷紧保持**
  - `knee-supine-ankle-press` 仰卧下压脚背 → **仰卧绷脚背**
  - `knee-standing-hip-flexion` 站立屈髋 → **站立折髋（臀向后）**
  - 同步标签映射：knee-workflow-adapter / knee-decision-core / knee-decision-lab 的 `"hip-hinge": "站立屈髋"` → `"站立折髋"`，及 adapter 内一处指令文案。
  - 踝区 `ankle-standing-hip-flexion`、大腿区 `thigh-hip-hinge` 仍叫"站立屈髋"——留给可读性整批，勿误判为漏改。

**H2 规则注入发现校验**（rehabmind-workbench.tsx exercises useMemo）：
- 新增 `pilotOnlyTrainingIds`：仅由 pilot 规则 trainingIds 注入、且不属于 relevant/effective/kneeCore/direction/recordPattern/foundation 任一来源的训练卡。
- 这类卡必须命中本次评估发现的标签才进入队列。堵的是"膝内侧用户没测出足弓问题却收到仰卧足弓控制卡"这类规则后门（KNEE-R07 等病例规则写死的 trainingIds 此前无条件注入）。
- 有其它合法来源的卡完全不受影响；`INITIAL_TRAINING_PRIORITY`（脚跟滑动、臀桥地基卡）不走此闸门，维持其独立门控（kneeSharedControlAllowed 等）。

## 2. 断言对照表

| 受影响断言 | 旧 | 新 |
|---|---|---|
| 训练卡 DOM 结构 | `.rm-exercise-detail dl` 仅 1 个 div（怎么做） | 有 purpose 的卡为 2 个 div（为什么练这个 → 怎么做）；钉过 `dl > div` 数量或 `dt === "怎么做"` 首子的契约需更新 |
| 钉 `脚跟后拉发力` / `仰卧下压脚背` / `站立屈髋`（膝区）字符串 | 命中 | 改为 §1 新名；`hip-hinge` 动作标签显示名同步为"站立折髋" |
| pilot 规则 trainingIds → 训练页必现的覆盖断言 | 规则命中即发卡 | 规则命中且对应发现阳性才发（重点：膝区足弓、勾脚抬脚趾两张卡） |

## 3. 新场景靶子 id

无。验证用既有 `training-worse`（落训练页）：实测首卡臀桥带目的行、`为什么练这个/怎么做` 双 dt、无足弓卡、无 pageerror。

## 4. 不变式

- `purpose` 为可选字段：踝/大腿/小腿区数据未补时渲染层自动跳过，不出现空行。
- `adaptExerciseForCurrentStage` 用对象展开，降级/半程改编保留 purpose。
- H2 只收紧"规则后门唯一来源"的卡；处理有效标签（effectiveIds）、发现标签（relevantIds）、决策核心（kneeCoreTrainingIds）来源的卡一律照旧。
- 康复总结页训练列表（summary-stage）不渲染 purpose，维持紧凑。

## 5. 验证证据

- `npm run typecheck` 干净。
- `node --test tests/component/rendered-html.test.mjs` 与干净 HEAD 基线同为 6 个既有失败，零新增。
- Playwright `training-worse`：训练页 3 卡、目的行文案完整、足弓卡缺席、无 JS 错误（截图 `%TEMP%\opencode\batchH-training.png`）。

## 6. 已知坑（结转，非本批引入）

- **`outcome-panel-chief-action-line` 夹具的出口按钮是死的**：该场景内"进入训练""查看评估记录"点击无响应——种子记录满足组件层完成判定（面板渲染），但不满足 workflow 投影的解锁条件（`maxUnlocked` 停在 3），navigate 被 RETURN-EDIT-GATE/step-jump 拒绝且无提示。测试侧若要用该夹具测跨阶段出口，需补投影所需的种子字段，或改用 `training-worse` 测训练页。真实用户路径（逐步完成处理）不受影响，但"面板可点却不动"若出现在生产同样不可接受——建议测试侧加一条"完成面板出口按钮必须产生导航"的通用契约。
- 工作区 `tests/` 在 HEAD 上自带 6 个红（与 src 现状漂移），合并本 SHA 时勿归因批 H。
- 待临床签字项不变：跟腱等长 5s→30-45s、删踝区足趾控制、加 Alfredson 离心、落地控制过渡卡；可读性其余 5 项改名与踝/大腿/小腿 purpose 补写为下一批。
