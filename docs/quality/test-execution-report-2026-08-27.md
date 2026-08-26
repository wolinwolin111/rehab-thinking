# RehabMind 整改测试执行报告

执行时间：2026-08-27 03:23（Asia/Shanghai）  
执行口径：`docs/handover/development-to-test-remediation-handoff-2026-08-27.md`  
当前 commit：`fdaee6fc5ca3beb246ed5184650540d6a78507a8`  
当前生成 buildId：`local-fdaee6fc5ca3-dirty-085a66c496a1`  
snapshot schema：`2`  
工作树：dirty，开发整改仍在进行。

## 结果

| 测试层 | 命令 | 结果 |
| --- | --- | --- |
| L2/L3 定向 | `test:logic:retest` / `queue` / `ledger` | 34/34、37/37、39/39 通过 |
| L2/L3 变异 | `test:logic:mutations` | 所列门禁变异全部 killed |
| RMD-HIST/MARK | `session-identity-core.test.mjs`、`body-mark-core.test.mjs`、快照陈旧测试 | 11/11 通过 |
| unit | `npm run test:unit` | 575/576；1 失败 |
| workflow / component | `npm run test:workflow` / `test:component` | 119/119、76/76 通过 |
| L5 integration | `npm run test:integration` | 16/17；1 失败 |
| security / health / migration | 对应 npm 命令 | 通过；migration 10 个、issues 0 |
| dependencies / performance | 对应 npm 命令 | 通过 |
| L0 | `npm run test:fast` | 阻断：`rehabmind-workbench.tsx:1328` 的 `TS2322` |
| lint | `npm run lint` | 0 error、4 个 Hook warning |

## 当前失败

`DATA-REPLAY-01`：在 `tests/unit/infrastructure/pilot-case-service.test.mjs:226` 和 `tests/integration/sqlite-api/pilot-vertical-flow.integration.mjs:78`，首次保存成功后，用同一 `eventId` 完全重放请求，预期原成功结果、revision 不增加、事件不重复；实际返回 409 `Event id has already been used for different content`。当前实现重放时重新生成包含新 `occurredAt` 的事件 payload，导致内容比较不相等。该项交由开发修复，测试侧不改生产逻辑。

## 测试侧同步

- 集成 fixture 已加入 `drizzle/0009_clinical_event_identity.sql`，消除了旧 schema 导致的 13 条假失败；
- 旧 schema v1/无稳定身份断言已按现行 schema v2、`problemThreadId`、`sessionId` 合同更新；
- 新增 `tests/unit/domain/session-identity-core.test.mjs`、`tests/unit/domain/body-mark-core.test.mjs`；
- 已回写测试计划、内部逻辑覆盖矩阵、scenario registry、真实浏览器覆盖矩阵和回归总表；本轮未修改 `src/` 生产逻辑。

## 未启动项

因 `test:fast` 未通过，本轮不产生新的 Edge release、移动预览或 Android 证据；旧浏览器证据仍保留为上一轮历史基线。Android 当前环境未发现 `adb`、`emulator`、`gradle` 或 APK，因此 M2～M5 尚不能执行。
