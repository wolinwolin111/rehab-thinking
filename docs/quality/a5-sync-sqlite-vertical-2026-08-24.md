# A5 同步、SQLite 与纵向流水线验收

日期：2026-08-24  
基线提交：`5af6280c6f60f3236363dac6150a6e4ddef550d6`（工作树含 A0-A5 未提交整改）  
构建标识：`rehabmind-pilot-app-0.1.0+local-5af6280c6f60-dirty.5af6280c6f60`

## 结论

A5 已完成。同步、API client、快照 schema、邀请与权限、版本、SQLite 连接/事务/migration 和纵向流水线均已在当前生产入口上验证。旧 D1 live HTTP 测试已改为可选 live HTTP 冒烟，不能再冒充当前 SQLite 集成证据。

本结论不表示可以开放粉丝群。邀请次数与来源、管理员运营闭环、运行时不变量、日志、安全响应头和 VPS 发布门禁仍由 A6-A7 完成；动作图片不在本批范围内。

## 生产行为整改

| 编号 | 已落地行为 | 主要生产入口 |
| --- | --- | --- |
| `SCHEMA-01` | 必填结构、嵌套评估/处理/复测/后续字段、分值、枚举、深度和循环引用统一校验；损坏本机数据不删除原文并返回脱敏诊断 | `src/infrastructure/pilot/persistence/snapshot-schema.ts`、`src/infrastructure/pilot/persistence/local-case-store.ts` |
| `SYNC-01` | 每个案例具有独立同步状态机；保存操作携带 case/session/request/base revision；迟到、跨案例、删除后响应被忽略 | `src/infrastructure/pilot/persistence/sync-core.ts`、`src/infrastructure/pilot/persistence/persistence-controller.ts`、`src/infrastructure/pilot/api/case-client.ts` |
| `DB-01` | 同一进程和数据库路径复用单一 SQLite repository；可显式关闭重开；多表写入、反馈、删除和 migration 具有事务边界 | `app/api/pilot/_shared.ts`、`db/sqlite/sqlite-pilot-case-repository.ts`、`scripts/sqlite-migration-core.mjs` |
| `INVITE-01` | 邀请只允许创建案例；支持只配置 SHA-256 hash、过期和撤销；URL 捕获后移除邀请参数；公开编号不能读取案例 | `src/infrastructure/pilot/invite/invite-authorization.ts`、`src/infrastructure/pilot/invite/invite-client.ts`、pilot API routes |
| `REL-03` | 构建前生成 commit/build/app/knowledge/decision/schema 身份，service 与事件使用同一版本清单 | `scripts/generate-pilot-release.mjs`、`app/pilot-release.generated.ts`、`src/infrastructure/pilot/release/release-version.ts` |
| `TEST-18` | 首诊经生产 orchestrator、service、route 和真实 SQLite 保存；关闭 repository 模拟重启；恢复后继续后续康复并再次落库 | `tests/integration/sqlite-api/pilot-vertical-flow.integration.mjs` |

## 修复时发现的实际缺陷

1. SQLite repository 曾按请求打开且没有统一关闭入口。
2. 物理清除把案例 ID 当作事件 ID 删除，可能留下事件；知识缺口清除也使用了错误引用字段。
3. `deletedBeforeDays=0` 使用严格小于边界，刚删除案例无法按同一时刻清除。
4. 保存请求缺少完整操作身份，客户端不能可靠判断响应是否仍属于当前案例和当前康复记录。
5. 页面分别维护保存状态，缺少统一仲裁，迟到响应与删除竞态的结果不确定。
6. 损坏的 localStorage JSON 与“没有记录”共用同一返回值，且 IndexedDB 连接未在每次操作后明确关闭。
7. migration 以文件名作为唯一应用身份且多语句失败缺少独立验证。
8. 原 `tests/integration/d1` 实际是对已运行服务的 HTTP 测试，未证明 D1 或 SQLite 内部链路。
9. 冲突只有检测，没有差异范围和“另存为新案例”路径。

## 测试有效性

- 30/30 个定向变异被杀死；A5 新增变异覆盖迟到响应被错误接受、嵌套 schema 被绕过、邀请 hash 比较被绕过和请求身份被移除。
- SQLite 错误注入覆盖“写快照后失败”“写反馈后失败”和 `SQLITE_BUSY`，均证明 revision、事件和反馈不会部分提交。
- migration 测试覆盖重复执行、多语句中途失败回滚，以及仅有 `0000` 的旧库升级到当前版本后仍可读取。
- 100 个并发 repository 请求返回同一实例；关闭后旧连接关闭，新请求得到新实例。
- API client 合同覆盖 timeout、network、409、429、500，并验证底层异常和非 JSON 错误正文不会泄漏到客户端提示。
- 冲突副本不继承远端 case ID、public code、访问令牌、revision、版本或冲突快照；原案例保持不变。

## 当前运行证据

| 命令 | 当前结果 |
| --- | --- |
| `npm run test:fast` | 通过；边界、typecheck、build 和 106 个文件中的 599/599 条测试通过 |
| `npm run test:logic:mutations` | 30/30 killed |
| `npm run test:integration` | 连续两轮均为 9/9，通过时间约 3.6 秒/轮 |
| `npm run test:vertical` | 2/2，通过时间约 3.0 秒 |
| `npm run typecheck` | 通过，0 error |
| `npm run build` | 通过；仍有既有主 chunk 超过 500 kB 告警 |
| `npm run check:boundaries` | 通过；页面不能重新持有同步仲裁或原始保存队列 |
| `npm run lint` | 未通过：4 errors、8 warnings，与 A0 基线位置和数量一致，本批无新增 |

没有运行真实浏览器。A5 验证的是业务、同步和持久化内部行为，浏览器只在 A7 承担最小接线和发布验收。

## 数据与回退

- 本批没有新增业务表或不可逆 migration。
- migration runner 改为内容 hash + 事务，同时兼容已按旧文件名登记的 migration。
- 回退代码前不需要回退数据库结构；如回退到旧 runner，现有三份 migration 仍保持已应用状态。
- 本地损坏数据不会被自动清除，用户仍可保留原始浏览器副本进行恢复或导出。

## 剩余风险与下一步

1. lint 的历史 4 errors、8 warnings必须在 A7 正式门禁前清零。
2. 主客户端 chunk 超过 500 kB，按 `PERF-01` 和后续垂直切片处理。
3. `SYNC-02` 已有差异范围、远端查看、本机导出、稍后处理和另存新案例，但冲突操作日志与弹层可访问性仍需 A6/B1 收口。
4. 邀请有效次数、来源批次和运营管理不属于静态 token 基础合同，由 A6 完成。
5. 下一批严格进入 A6，不提前执行 B0 文件迁移。
