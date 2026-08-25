# A3 架构边界验收

日期：2026-08-24  
范围：后续工作流抽取前的目录、依赖和自动门禁

## 已建立的边界

- `src/domain/**` 只能承载纯业务规则，不得依赖 React、页面、API、数据库、浏览器存储或网络全局对象。
- `src/features/rehabmind/components/stages/**` 只接收状态与命令，不得直接调用领域层、仓储、数据库、浏览器存储或网络请求。
- 新模块统一使用现有 `@/* -> ./*` 别名，因此 `src` 下模块写作 `@/src/...`。
- 尚未有正式模块的目标目录不提前创建，避免空目录和职责占位。

## 自动检查

| 证据 | 结果 |
| --- | --- |
| `node --test tests/architecture-boundaries.test.mjs` | 3/3 通过 |
| 故意在领域层导入 React 并访问 `localStorage` | 被拒绝 |
| 故意在阶段视图导入领域层 | 被拒绝 |
| 纯领域模块和仅使用 props 的阶段视图 | 通过 |
| `npm run check:boundaries` | 通过 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过；保留既有大 chunk 警告 |

边界检查已接入 `test:fast`，后续抽取若引入反向依赖会直接使快速门禁失败。

## 实现位置

- 规则配置：`scripts/architecture-boundaries.json`
- AST 检查器：`scripts/check-architecture-boundaries.mjs`
- 正反测试：`tests/architecture-boundaries.test.mjs`

## A4 入口条件

A3 只定义依赖方向，不宣称主组件已经解耦。A4 必须在这些边界内抽取正式工作流状态、事件、命令和编排器，并用正式生产函数轨迹测试证明行为等价。
