# A4 正式工作流编排器验收

日期：2026-08-24  
范围：安全、处理复测、动态队列、训练门禁、阶段导航、回看编辑、后续康复和异常入口

## 生产结构

- 状态：`src/features/rehabmind/workflow/workflow-state.ts`
- 事件：`src/features/rehabmind/workflow/workflow-events.ts`
- 命令：`src/features/rehabmind/workflow/workflow-commands.ts`
- 唯一编排入口：`src/features/rehabmind/workflow/workflow-orchestrator.ts`
- 共享不变量：`src/features/rehabmind/workflow/workflow-invariants.ts`
- React Controller：`src/features/rehabmind/controllers/use-workflow-controller.ts`
- 页面命令适配器：`src/features/rehabmind/controllers/workflow-command-adapter.ts`

现有 `app/*-core.ts` 继续负责已经稳定的单项规则。编排器通过 `@/app/...` 组合它们，页面不再直接组合处理队列、动态重算、训练门禁和安全门禁。

## 已迁移行为

1. 处理完成并记录复测后，编排器统一返回 `ruleIds`、状态转换、命令和时间线事件。
2. 动态队列只按稳定目标身份重算；页面执行命令，不读取数组位置猜测下一项。
3. 队列完成、训练开放/阻断、训练关闭和总结解锁由同一投影计算。
4. `goToStep`、只读回看、明确编辑、后续康复和异常反应入口统一经过导航决策。
5. 安全门禁从主组件迁出，医学许可约束由生产函数直接执行。

## 本轮发现的真实冲突

底层队列在结果加重时已经返回 `stopped=true`，但旧页面只读取 `nextCandidateIndex`，随后仍可能推进内部目标索引。界面通常会被全局加重提示覆盖，因此旧走读不容易发现内部状态已经变化。

整改后页面执行 `stop-treatment` 命令；合同测试证明停止命令不会串到候选选择、目标推进或训练入口。

## 测试证据

| 证据 | 结果 |
| --- | --- |
| 修复前工作流测试 | 正式入口不存在，按预期红灯 |
| P0 决策表 | 7 张表逐行调用真实生产函数通过 |
| 处理/复测/队列/训练轨迹 | 通过 |
| Controller/页面命令合同 | 通过 |
| 工作流不变量正反夹具 | 通过 |
| 固定种子状态探索 | 120 个种子 × 80 次事件，共 9600 次通过；失败信息包含可缩减轨迹 |
| 旧逻辑回流夹具 | 故意把已迁移判断写回主组件时边界检查失败 |
| 定向变异 | 26/26 被杀死，其中工作流 5 项 |
| `npm run test:fast` | 581/581 通过，已包含 `tests/workflow/` |
| typecheck / build | 通过；保留既有大 chunk 警告 |

快速测试改用 dot reporter，减少无失败时的大量日志；失败仍输出具体测试和断言。

## 证据清理

删除了 `rendered-html.test.mjs` 中要求旧条件、旧函数名和旧注释必须存在的断言。这些断言会阻止正确抽取，也不能证明行为可达；对应规则现在由生产函数直测、页面命令合同、边界检查和变异测试证明。

## 已知非 A4 问题

- lint 仍为 A0 基线的 4 个错误、8 个告警；本轮没有新增项。错误位于历史 `.tmp-smoke` 和 `ecosystem.config.cjs`，另有既有 Hook 与未使用类型告警。
- 主客户端 chunk 仍超过 500 kB，按 B2-B5 垂直切片继续处理。
- 本轮未使用真实浏览器；A4 的业务逻辑由生产入口直接验证，界面发布验收仍按 A7 保留少量执行。
- 未修改临床知识结论和动作图片。
