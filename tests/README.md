# `tests` 目录导航

测试已按证据职责分类，根目录不再平铺测试文件。Node 测试由 `scripts/quality/run-node-tests.mjs` 递归发现。

## 当前分类

- `tests/unit/domain/`：生产领域纯函数和知识引用一致性。
- `tests/unit/infrastructure/`：同步、来源与知情同意、安全、服务和快照合同。
- `tests/unit/quality/`：质量工具自身的测试，不计业务规则覆盖。
- `tests/workflow/`：生产工作流轨迹、决策表、不变量和有种子状态探索。
- `tests/component/`：React 展示边界、页面适配和接线合同。
- `tests/integration/sqlite-api/`：真实 SQLite + route/service 纵向集成。
- `tests/integration/http-live/`：可选的已运行 HTTP 环境探针，不冒充 SQLite 集成。
- `tests/browser/release/`：当前 4 条最小发布接线，不承担业务组合穷举。
- `tests/browser/p0/`、`divergent/`、`known-defects/`、`visual/`：旧入口时期的诊断和历史证据；未重新校准前不计当前发布通过。
- `tests/browser/drivers/`、`tests/browser/support/`：浏览器驱动和公共工具。
- `tests/support/`、`tests/fixtures/`：统一生产模块加载器和外部定义的场景输入。
- `tests/workflow/scenario-registry.json`：场景编号登记。

## 证据等级

1. 正式生产函数和流程编排器测试是内部业务逻辑的主要证据。
2. SQLite + HTTP 集成测试证明数据和权限合同。
3. 组件测试证明页面适配和本地状态接线。
4. 浏览器只证明真实界面、路由和资源接线，不负责穷举康复组合。
5. 源码字符串、HTML 字符串和简化模型只能作为辅助证据。

## 正式入口

- `npm run test:fast`：边界、typecheck、build、unit、workflow、component。
- `npm run test:integration`：SQLite/API 集成。
- `npm run test:logic:mutations`：定向错误注入。
- `npm run test:browser:release`：4 条当前真实页面接线，覆盖入口、刷新/反馈、App 壳和管理员拒绝。
- `npm run test:summary`：按当前构建身份汇总证据和阻塞项。

## 新测试放置规则

- 领域纯函数：`tests/unit/domain/<area>/`。
- 生产流程轨迹：`tests/workflow/`。
- React 组件和适配器：`tests/component/`。
- SQLite/API：`tests/integration/sqlite-api/`。
- 浏览器：继续位于 `tests/browser/`，按 `smoke/visual/accessibility` 分类。
- 测试夹具：放在 `tests/fixtures/`，不得复制生产业务规则。

测试预期来自正式规则和场景夹具。新增回归必须先证明能在目标错误实现上失败；源码字符串和简化模型不得作为业务正确性的主要证据。
