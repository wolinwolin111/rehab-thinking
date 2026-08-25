# 测试工作台与数据隔离施工记录

日期：2026-08-25

## 完成范围

- 新增本地 `/test`，VPS 通过 `/RehabMind/test` 访问。
- 本地开发直接放行；非开发环境要求有效管理员会话。
- 完整流程只预填问题描述，继续使用正式 RehabMind 工作台。
- 页面定向使用带明确边界标识的起点快照，不计作完整流程证据。
- 决策实验室继续直测生产决策函数，不创建案例。
- 固定 14 个批准的场景起点。
- 提供重新开始、复制场景、清除草稿、复制案例编号、后台记录、按批次删除和版本显示。

## 隔离规则

- 服务器字段：`isTestCase`、`testRunId`、`scenarioId`、`createdBy`。
- 测试来源固定为 `internal_test`，编号以 `TEST-` 开头。
- 用户不能通过普通创建接口伪造测试字段。
- 测试案例默认排除渠道、完成率、反馈率和流程异常等正式指标。
- 管理后台可按用户案例或测试案例筛选，并显示场景和运行批次。
- 本机测试记录使用独立 IndexedDB/LocalStorage 命名空间。
- 删除运行批次只物理删除对应 `testRunId` 的服务器记录；本机清理只移除同批次记录。

## 本地验收

- 完整流程模板恢复到症状信息页，问题原话已预填。
- 页面定向模板恢复到后续康复页，页面明确标记“页面边界测试”。
- 保存生成 `TEST-` 案例编号并同步 SQLite。
- 390px 模拟视口无页面横向溢出。
- 测试运行 `run_8d8e306caefe` 的 1 个服务器案例已通过批次接口清理。

## 验收中发现并修复

页面定向快照曾出现 `readyToRetest=true` 但 `retestPlan=null` 的矛盾状态，工作台直接读取 `candidateId` 后崩溃。现已：

1. 在生产工作台读取复测计划前增加完整空值防御。
2. 起点模板不再写入矛盾复测状态。
3. 页面定向模板提供完整评估账本，由生产选择器决定实际采用的检查项。

## 自动证据

- `tests/integration/sqlite-api/test-workbench-isolation.integration.mjs`
- `tests/component/test-workbench-contract.test.mjs`
- `tests/unit/infrastructure/local-case-store.test.mjs`

页面定向测试只证明页面接线、恢复边界与状态防御，不证明该预置状态经历了完整纵向业务流程。
