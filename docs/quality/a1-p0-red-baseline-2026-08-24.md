# A1 P0 历史缺陷红灯基线（2026-08-24）

## 范围

本批次只建立 oracle、机器可读矩阵、合法夹具和修复前失败证据，不以旧实现输出定义预期，也不移动生产文件。

## 资产

- `tests/workflow/p0-rule-matrix.json`：11 项 A1 P0 的设计规则、合法/禁止出口、状态副作用、生产入口和证据类型。
- `tests/workflow/decision-tables/p0-gates.json`：安全停止、复测、处理队列、训练、权限和返回修改的第一版决策表。
- `tests/fixtures/workflow/p0-minimal-case.json`：通过生产快照 schema、只使用公开事件词汇的版本化正常夹具。
- `tests/p0-remediation-matrix.test.mjs` 与 `tests/fixtures-workflow.test.mjs`：矩阵和夹具自检。
- `artifacts/quality/a1-20260823/red-before-fix.tap`：修复前稳定红灯原始输出。

## 修复前结果

定向运行 22 条检查：12 通过、10 失败。失败准确命中：

1. `CASE-01`：阶段事件按记录顺序选择旧案例。
2. `AUDIT-03`：进入下一阶段时记录了下一阶段完成事件。
3. `AUDIT-04`：阶段事件未提交去重状态，事件 ID 未包含事件类型。
4. `FEED-02`：反馈打开时没有冻结案例、模块和事件上下文。
5. `SCHEMA-01`：服务端仅校验 schema 版本，部分快照可入库。
6. `SYNC-01`：旧保存完成可把更新一代状态错误标为已保存。
7. `SEC-02`：调用方可用转发头选择限流身份。
8. `TEST-14`：过期 Playwright 结果可满足当前质量汇总。
9. `TEST-15`：Playwright 基址丢失部署路径。

主组件内尚未提取的案例/事件/反馈接线在修复前只记为临时 wiring 证据；A2 已将规则收进现有生产核心，并用行为测试替换临时源码检查。

## 边界

决策表在 A1 固定输入和出口；其中仍嵌在页面内的安全与返回修改门禁，要到 A4 由生产 orchestrator 执行后，才能关闭 `TEST-17/TEST-19` 的最终证据缺口。
