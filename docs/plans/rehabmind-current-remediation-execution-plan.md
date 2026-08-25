# RehabMind 当前整改优化执行方案

> 文档状态：当前整改施工主计划
> 基线日期：2026-08-23
> 当前运行环境：VPS + Node.js + SQLite
> 适用范围：现有膝踝试点产品、邀请试用、案例持久化、反馈与管理
> 暂缓事项：动作图片替换、独立临床内容审核、新身体部位、账户与支付
> 最近更新：2026-08-24，A0-A6 已完成，下一步严格进入 A7 试用发布门禁

## 1. 文档定位

本文把近期代码审查、业务讨论和测试复盘整理为一套可以逐步执行、逐步验收、随时停止并安全交接的整改方案。

本文只规定整改顺序、架构边界、测试方法、数据迁移、发布和验收要求，不新增康复决策或临床规则。产品行为仍以文档中心列出的四份正式文档为准：

1. [产品规范](../rehabmind-complete-product-design.md)
2. [决策引擎规范](../rehab-decision-framework.md)
3. [膝踝首发知识库](../knee-ankle-pilot-knowledge.md)
4. [首发场景验收](../pilot-scenario-coverage.md)

本文是当前 VPS + SQLite 架构下的执行顺序来源。旧版[全项目整改执行手册](./rehabmind-quality-remediation-implementation-plan.md)继续保留历史整改编号和已完成工作，但其中 Cloudflare、D1、浏览器三轮门禁及旧发布流程不再覆盖本文的新结论。

冲突时按以下顺序处理：

1. 安全与数据不丢失要求；
2. 四份正式产品与决策文档；
3. 本文的当前施工顺序和完成定义；
4. 质量整改登记中的状态；
5. 历史测试报告、会话总结和旧执行手册。

## 2. 本轮目标和非目标

### 2.1 必须达到的目标

1. 当前案例、康复记录、事件和反馈之间不会串线。
2. 评估、处理、复测、队列重算和训练门禁使用同一份可直接测试的生产流程。
3. 本地草稿与服务器快照有明确同步状态，不因重试、乱序、刷新或切换案例静默丢数据。
4. SQLite/API 能拒绝损坏快照、处理并发冲突并保持连接和事务稳定。
5. 邀请、案例编号、访问凭据和管理员权限具有独立边界。
6. 测试直接经过页面使用的生产规则和生产编排器，先证明能抓到错误，再作为发布证据；旧产物不能证明新版本通过。
7. 发布过程可以确认数据库可用、版本一致、日志脱敏，并能恢复上一兼容版本。
8. 主页面逐步退化为装配层，不再同时承担业务决策、持久化和界面展示。
9. 路由、产品功能、领域核心、基础设施、测试、脚本和文档形成可识别的物理目录边界，新代码不再继续堆入平铺目录。
10. 规则、页面适配、HTTP、SQLite、恢复和后续康复之间形成一条不依赖浏览器的纵向验证链，关键状态在试用期可被脱敏监测。

### 2.2 本轮不做

1. 不扩展膝踝试点之外的正式身体部位。
2. 不引入 AI 生成康复决策。
3. 不建立复杂用户账户、支付、社区或消息系统。
4. 不一次性重写 8750 行主组件。
5. 不为了测试复制一套简化工作流。
6. 不以增加测试总数、行覆盖率或浏览器脚本数量作为主要目标。
7. 动作图片继续保留为独立素材任务。
8. 独立临床内容审核暂不作为当前施工门禁，但状态必须保持“待审核”，不得宣传为已完成临床验证。
9. 不使用自动化测试证明文案一定易懂、图片一定合适或所有未知用户行为均已覆盖；这些仍保留少量人工任务验收和真实试用观察。

### 2.3 交付效果、里程碑和证据边界

本文中的“预计效果”不是写入文档后自动成立，必须由对应里程碑和证据确认：

| 里程碑 | 完成后应产生的实际效果 | 必须提供的证据 | 仍不代表 |
| --- | --- | --- | --- |
| A7 小范围试用就绪 | 用户可以受邀请创建案例，流程不会已知地串案例/记录/动作，保存恢复、反馈、案例编号和错误提示形成闭环 | P0 矩阵、L0-L5、最小 L6、SQLite 恢复、邀请/权限、脱敏日志和 VPS canary | 所有未知缺陷已消失、临床内容已审核、所有界面体验都最佳 |
| A7 运营可定位 | 管理员能按案例编号找到记录、时间线、反馈、版本和技术异常，粉丝群反馈不再依赖猜测 | 管理检索、反馈上下文、事件时间线、版本回读和业务不变量告警 | 已建成完整专业管理平台或用户账户体系 |
| A7 发布可恢复 | 发布、迁移、备份和回滚有明确入口，失败版本不会只靠人工记忆处理 | 干净构建、migration 兼容、备份恢复、PM2 reload、canary 和回退记录 | 零停机、零数据风险或无限容量承诺 |
| B6 结构治理完成 | 主组件退化为装配层，流程、领域、基础设施、测试和脚本边界清楚，后续修改影响范围更可控 | 依赖边界、垂直切片测试、循环依赖检查、typecheck、build 和路径收口 | 新功能自动正确或以后不再需要回归测试 |

状态用语固定为：

- **计划内**：只有方案和执行位置，没有完成证据；
- **待验证**：实现已存在，但完成定义尚未全部满足；
- **已通过**：对应整改编号满足第 8 节全部条件；
- **小范围试用就绪**：A7 和第 9 节门槛全部通过；
- **结构治理完成**：B0-B6 完成，不得用 A7 代替。

因此，本轮整改能够显著降低已知业务流程、数据、接线和发布风险，但不使用“彻底解决所有问题”“全部质量已验证”等无法由当前证据支持的表述。

## 3. 当前基线与证据修正

### 3.1 当前技术基线

| 项目 | 当前情况 |
| --- | --- |
| 前端 | vinext + React 19 + TypeScript |
| 服务端 | vinext Node.js API |
| 数据库 | better-sqlite3 + Drizzle + SQLite WAL |
| 生产入口 | `https://66.154.101.204/RehabMind/` |
| 服务器 | Ubuntu 22.04，2 核，约 969MB 内存 |
| 主组件 | `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx`，约 8750 行、约 85 个 `useState` |
| 已提取核心 | 约 57 个 `*-core.ts` 文件 |
| 当前快速测试 | `npm run test:fast`，最近复核 542/542 通过 |
| 定向变异 | `npm run test:logic:mutations`，最近复核 12/12 killed |
| lint | 最近复核仍有错误和警告，不能沿用“0 errors”结论 |
| 浏览器汇总 | 当前汇总会读取旧产物，未与当前提交和构建绑定 |
| 正式流程编排器 | 尚未建立；当前没有 `src/` 目录，主流程仍部分隐含在主组件中 |
| 场景登记 | `scenario-registry.json` 当前主要登记 17 条浏览器/视觉场景，尚未统一登记 L2-L5 内部证据 |
| 页面适配器测试 | 尚无组件级 DOM 测试工具和生产事件接线合同 |
| 当前集成入口 | `test:integration` 仍指向历史 D1 目录，尚未证明 VPS 的 SQLite + HTTP 链路 |
| 发布测试命令 | 计划中的 `test:workflow/test:vertical/test:release` 尚未在 `package.json` 落地 |

### 3.2 旧证据不得继续直接使用的情况

以下结果只能作为历史参考：

- 只匹配源码字符串或渲染 HTML 字符串的测试；
- 只运行简化状态模型、没有调用生产编排代码的随机测试；
- 直接注入 IndexedDB 后宣称完成全流程 E2E 的测试；
- 未绑定 `commitSha/buildId/appVersion/ruleVersion` 的浏览器报告；
- Cloudflare D1 集成结果用于证明当前 SQLite 路径；
- 只验证无邀请创建返回 403、没有实际读取 SQLite 的健康检查；
- 旧状态文档中的“所有 P0 已通过”或“lint 0 errors”。
- 核心函数单独通过，但没有证明页面调用同一函数且未保留双份判断；
- 编排器测试和 API 测试分别通过，但没有经过“编排命令到 SQLite 再恢复”的纵向流水线；
- 只使用成对组合证明由三个以上条件共同决定的 P0 门禁；
- 夹具未经过正式 schema 或公开业务事件构造，却被用作正常用户流程证据；
- 场景到达正确终点，但没有证明实际命中目标规则、转换和禁止出口。

### 3.3 开工时必须重新打开的结论

质量登记中与下列问题相关的“已通过”状态，实施开始时必须改为“整改中”或“待验证”，直到新证据完成：

- `AUDIT-02`：阶段事件语义、去重和案例归属仍有缺口；
- `REL-01`：发布版本仍存在硬编码或不可区分情况；
- `SEC-01`：代理地址信任边界仍需修复；
- `REL-02`：部署可复现不等于数据库迁移可回滚、依赖一定更新或健康检查有效；
- `TEST-01/05/11`：测试入口、SQLite 集成和证据版本绑定仍未闭环。

## 4. 目标架构

### 4.1 分层结构

```text
Stage Views
    ↓ user intent
Workflow Controller
    ↓ domain event
Workflow Orchestrator (pure)
    ├── next state
    ├── domain/timeline events
    └── commands
           ↓
Local Store / Sync Controller / Feedback Controller
           ↓
Pilot HTTP API
           ↓
PilotCaseService
           ↓
PilotCaseRepository
           ↓
SQLite
```

每层职责：

| 层 | 允许做的事 | 禁止做的事 |
| --- | --- | --- |
| Stage Views | 展示当前状态、收集用户意图 | 推导下一阶段、直接保存、读取其他案例 |
| Workflow Controller | 调用编排器、执行命令、连接 React | 自行复制康复规则 |
| Workflow Orchestrator | 根据状态和事件计算下一状态 | React、DOM、网络、数据库、读取系统时间 |
| Sync/Feedback Controller | 异步协调、重试、取消、冲突和界面状态 | 推导临床流程 |
| API Service | 权限、schema、事务、事件来源 | 接受客户端伪造的系统或管理员身份 |
| Repository | SQLite 持久化和查询 | 推断页面或临床行为 |

### 4.2 生产流程接口

目标接口不要求一次完成全部迁移，但最终只能保留一个正式入口：

```ts
type WorkflowResult = {
  nextState: WorkflowState;
  commands: WorkflowCommand[];
  timelineEvents: TimelineEventDraft[];
};

function dispatchWorkflowEvent(
  state: WorkflowState,
  event: WorkflowEvent,
  dependencies: WorkflowPureDependencies,
): WorkflowResult;
```

纯依赖包括时钟值、ID 工厂结果和规则版本，由调用者显式传入，禁止纯函数内部读取 `Date.now()`、随机数、localStorage 或网络。

### 4.3 领域身份

所有跨模块操作必须显式携带：

```ts
type WorkflowIdentity = {
  localCaseId: string;
  pilotCaseId?: string;
  publicCaseCode?: string;
  sessionId: string;
  requestId?: string;
  revision: number;
};
```

约束：

- `publicCaseCode` 只用于展示、沟通和管理员检索；
- `publicCaseCode` 不能作为读取或修改数据的凭据；
- `accessToken` 只用于对应案例的访问，不授予管理员权限；
- `inviteToken` 只授权创建案例，不自动授予已有案例访问权；
- `adminToken` 与邀请和案例访问凭据完全独立；
- `sessionId` 唯一标识一次康复记录，复测和反馈不得跨记录复用。

### 4.4 同步状态机

```text
local_only → dirty → syncing → synced
                  ↘ failed
                  ↘ conflict
synced → deleting → deleted
```

每次远程保存必须携带 `caseId/sessionId/baseRevision/requestId`。响应只有在身份和请求仍匹配当前操作时才能落地。删除后的旧响应不得恢复案例。

### 4.5 测试闭环架构

测试不另造一套产品模型，统一沿以下证据链验证：

```text
正式文档和安全约束
    ↓ executable rule/transition matrix
生产核心函数和 Workflow Orchestrator
    ↓ WorkflowEvent / WorkflowCommand / TimelineEventDraft
页面 Controller 与适配器
    ↓ 同一批生产 commands
Service → HTTP Route → SQLite Repository
    ↓ 保存后重新读取
Snapshot 恢复 → Orchestrator 继续后续康复
    ↓
试用期脱敏业务不变量监测
```

约束：

1. 测试和页面必须调用同一个 `dispatchWorkflowEvent`，页面不得保留复测、队列或训练的第二套判断。
2. 规则预期来自版本化正式文档、安全约束和数据合同，不从当前实现输出反推。
3. 每个 P0 场景必须证明实际命中目标规则和状态转换，不能只检查最终页面。
4. 纵向流水线必须使用生产 service、真实 HTTP route 和临时 SQLite，不用 mock repository 代替。
5. 浏览器只验证真实控件、路由前缀、布局和用户可理解性，不承担业务组合穷举。
6. 临床审核虽暂缓，动作、部位、侧别、权限、知识 ID 和版本之间的软件一致性仍必须自动检查。

## 5. 当前整改问题清单

| 编号 | 优先级 | 问题 | 主要位置 | 退出条件 |
| --- | --- | --- | --- | --- |
| `CASE-01` | P0 | 阶段事件可能查找到旧远程案例 | 主组件、持久化控制器 | 两个同内容案例连续操作仍完全隔离 |
| `AUDIT-03` | P0 | 进入阶段与完成阶段语义混淆 | `stage-event-core.ts` | 事件只在真实业务时点发出 |
| `AUDIT-04` | P0 | 事件去重未生效，ID 可能跨类型冲突 | 主组件、timeline、repository | 重试幂等，不同事件不冲突 |
| `FEED-02` | P0 | 案例切换后反馈可能绑定旧模块或旧事件 | feedback panel/context、主组件 | 反馈上下文来自打开时不可变快照 |
| `SCHEMA-01` | P0 | 快照仅做浅校验 | snapshot schema、service、client recovery | 不完整快照不能入库或进入页面 |
| `SYNC-01` | P0 | 保存、切换、删除和迟到响应缺少统一状态机 | persistence controller、local store | 所有竞态有确定结果且不丢数据 |
| `DB-01` | P0 | Repository 按请求打开连接且缺少明确关闭策略 | API shared、SQLite repository | 连接生命周期固定并通过压力检查 |
| `INVITE-01` | P0 | 邀请、案例编号和访问权限需形成完整边界 | invite、client、API | 公开编号不能越权，邀请可撤销且不泄漏 |
| `SEC-02` | P0 | 限流信任可伪造代理地址 | rate limit、nginx 配置 | 只信任受控代理传递的客户端地址 |
| `REL-03` | P0 | 版本记录不能唯一定位实际发布 | release contracts/build | 数据和证据记录真实构建与规则版本 |
| `TEST-14` | P0 | 测试汇总可使用过期产物 | quality summary、artifacts | 报告严格绑定当前提交和构建 |
| `TEST-15` | P0 | Playwright 基址丢失 `/RehabMind/` 前缀 | Playwright config、browser helpers | 正式发布冒烟访问真实规范路径 |
| `TEST-16` | P0 | 缺少可执行状态转换矩阵和目标分支命中证据 | rule matrix、workflow tests | 每条 P0 合法/禁止出口、状态副作用和实际轨迹均有当前证据 |
| `TEST-17` | P0 | 页面与核心函数之间缺少适配器合同，可能继续执行双份逻辑 | controller、stage adapters、component tests | 用户意图、生产事件、命令和页面状态逐项对应，旧判断已删除 |
| `TEST-18` | P0 | 编排器、HTTP、SQLite 和恢复分别测试，缺少纵向完整流水线 | workflow、service、routes、SQLite | 完整案例保存、重启恢复并继续后续康复，状态和时间线一致 |
| `TEST-19` | P0 | 高风险多条件门禁和测试夹具缺少独立有效性证明 | decision tables、fixtures、schema | P0 门禁满足 MC/DC 或等效条件独立性，正常夹具均可由公开事件建立 |
| `ARCH-02` | P1 | 生产流程仍由超大页面隐式编排 | 主组件、workflow cores | 核心轨迹脱离页面运行 |
| `STRUCT-01` | P1 | `app/tests/scripts/docs` 大量文件平铺，运行产物堆在根目录 | 全仓库 | 按责任边界分批迁移且所有正式命令通过 |
| `SYNC-02` | P1 | 冲突有检测但缺少完整差异与解决闭环 | conflict panel、sync core | 用户选择不静默覆盖且可追溯 |
| `ADMIN-02` | P1 | 管理能力偏 API，难以运营小规模案例 | admin routes/UI | 可检索、定位、分流、备注、删除、导出 |
| `OPS-02` | P1 | 请求、案例、记录、事件和错误缺少统一关联 ID | client/API/logging | 脱敏日志可以还原技术链路 |
| `OPS-03` | P1 | 试用期缺少对不可能业务状态的自动发现 | timeline、logging、admin metrics | 跳过复测、跨案例绑定、revision 倒退等异常产生脱敏告警 |
| `KNOW-01` | P1 | 临床审核暂缓时仍缺少知识条目和流程引用的一致性门禁 | knowledge、workflow outputs、content contracts | 所有引用存在且部位、侧别、权限和版本关系有效，不把该结果表述为临床审核 |
| `REL-04` | P1 | 数据库迁移先于代码切换且回滚不完整 | release script、migrations | 迁移和 N/N-1 代码兼容，可恢复演练 |
| `PERF-01` | P1 | 主包较大，低内存 VPS 缺少资源基线 | build、PM2、nginx | 包体和进程内存有预算、监控和告警 |
| `DOC-01` | P1 | 状态、测试、Cloudflare 和 VPS 文档互相冲突 | docs | 当前入口、命令、状态和门禁只有一套口径 |

这些编号在第一批施工时同步写入[质量整改登记](../quality/rehabmind-quality-remediation-register.md)，状态只能使用“待整改、整改中、待验证、已通过、接受风险”。

## 6. 分批施工方案

### 批次 0：固定基线和校准证据

**进入条件**：无。
**预计工作量**：1 至 2 天。

实施步骤：

1. 记录 Git 提交、工作树、Node/npm 版本、生产构建版本和 SQLite migration。
2. 对生产 SQLite 做备份并在临时数据库完成一次恢复读取。
3. 重新运行 typecheck、build、lint、核心测试、变异和 SQLite/API 集成。
4. 将测试产物写入 `artifacts/quality/<commit-sha>/`，不再扫描所有历史目录。
5. 将本节新增编号登记到质量整改表。
6. 将旧的“P0 全部通过”“lint 0 errors”降为历史快照，不继续作为发布判断。
7. 建立规则覆盖矩阵字段：规则编号、设计来源、生产入口、正向断言、反向断言、状态断言、变异结果、证据版本、当前状态。

验收：

- 能用一份基线报告准确说明运行了哪些测试、没有运行哪些测试；
- 生产数据库有可验证的恢复副本；
- 当前缺陷状态不再被旧报告覆盖。

回退：本批只修改文档、测试元数据和备份流程，不改变产品行为。

### 批次 1：历史缺陷回放和测试有效性

**进入条件**：批次 0 完成。
**预计工作量**：2 至 3 天。

必须先增加失败测试：

1. 两个案例先后保存，第二个案例的阶段事件不能写入第一个案例。
2. 同一快照依次产生不同事件类型，事件 ID 不得相同。
3. 同一事件重试，服务端返回已有结果而不是产生重复或异类冲突。
4. 切换案例后打开反馈，默认案例、记录、模块和事件都属于新案例。
5. `{schemaVersion: 1, step: 4}` 之类不完整快照必须被拒绝。
6. 保存请求未完成时切换案例，旧响应不能修改新案例状态。
7. 删除后迟到的保存响应不能恢复已删除案例。
8. 条款版本提升后，旧同意记录不能自动放行。
9. 伪造 `X-Forwarded-For` 不能绕过限流。
10. 当前构建没有新浏览器结果时，`test:summary` 必须报告未运行或失败，不能复用旧绿灯。
11. 必须复测、队列继续、训练门禁和返回修改的目标分支被删除或反转时，流程测试必须失败。
12. 页面适配器发送错误事件、没有发送事件或仍执行旧判断时，组件合同必须失败。

测试要求：

- 预期来自正式文档和数据安全约束，不从当前实现复制；
- 第一版规则/状态转换矩阵明确合法出口、禁止出口、状态副作用和生产入口；
- 每项至少包含正向、反向、实际分支命中和最终状态断言；
- 正常夹具通过生产 schema，不能由公开事件建立的夹具不得冒充用户路径；
- 在修实现之前能稳定失败；
- 对事件类型、案例选择、revision 判断和同意版本做定向变异，测试必须变红。

验收：所有上述缺陷都有可重复失败证据，且没有使用源码字符串证明行为正确。

### 批次 2：原地修复数据、事件、反馈与安全 P0

**进入条件**：批次 1 已为相关 P0 建立失败测试。
**预计工作量**：2 至 4 天。

本批先消除已知数据污染风险，不移动文件、不拆页面，也不等待完整编排器完成。

实施步骤：

1. 用显式 `WorkflowIdentity` 替换通过数组、文本或 `ref` 推断当前案例的代码。
2. 明确阶段进入与阶段完成的发射时点，页面渲染或恢复不得自动重发完成事件。
3. 事件 ID 由案例、记录、事件类型和稳定业务键组成。
4. 服务端将相同幂等键和相同载荷视为成功重试；不同载荷返回明确冲突。
5. 删除无效的 `stageEventSeenRef`，或改成由真实事件仓储结果驱动的去重机制。
6. 创建、恢复、切换和删除案例时重置事件与反馈上下文。
7. 打开反馈时创建不可变 `FeedbackContext`，包含案例、记录、默认模块、可选事件和版本。
8. 允许用户选择以前的康复记录和模块；任何选择都重新过滤可绑定事件。
9. 后台返回反馈时同时返回可定位的上下文摘要，不暴露访问令牌。
10. 拒绝明显不完整快照，并修复当前同意版本和代理地址信任边界。
11. 先处理保存乱序、切换案例和删除迟到响应中会造成数据污染的路径；完整同步状态机在批次 4 收口。
12. 每个行为修复独立提交，禁止在本批夹带 `git mv`、CSS 或视觉修改。

验收：

- 两个案例、两个康复记录和两个相同动作的组合不会交叉；
- 事件顺序单调、重试幂等、来源可信；
- 反馈可以绑定当前或历史模块，但永远属于选中的案例和记录；
- SQLite 时间线能够复原关键操作顺序；
- 明显损坏快照、旧同意版本和伪造代理地址不能继续通过；
- 已知的保存乱序、切换和删除竞态不再污染其他案例；
- 错误实现的定向变异能够被测试捕获。

### 批次 3：建立边界并提取正式流程编排器

**进入条件**：批次 2 的已知数据、事件、反馈和安全 P0 已原地修复并通过验证。
**预计工作量**：4 至 7 天。

实施步骤：

1. 建立 `src/features/rehabmind/workflow/` 和最小依赖边界，禁止 `src/domain` 导入 React、HTTP、数据库或浏览器存储。
2. 清点主组件状态，按症状、确认、评估、处理复测、训练、总结、案例同步、反馈和纯 UI 分类。
3. 标记每个状态的唯一所有者、写入点和失效条件。
4. 定义 `WorkflowState`、`WorkflowEvent`、`WorkflowCommand` 和 `TimelineEventDraft`。
5. 先提取处理完成到复测、复测到队列重算这一条高风险链路。
6. 再提取评估到处理、队列结束到训练、训练到总结。
7. 最后提取返回修改、后续康复和异常加重链路。
8. 每提取一段，主组件改为发送事件并消费返回值，不保留双份逻辑。
9. 时钟、ID 和版本通过纯依赖注入，保证测试可重复。
10. 页面适配器合同验证用户操作、`WorkflowEvent`、返回命令和显示状态一一对应。
11. P0 复合门禁完成决策表和条件独立性测试；状态探索直接驱动生产 orchestrator。
12. 不在本批搬动全部旧 core、拆 CSS 或重做页面视觉。

目标文件边界：

- `src/features/rehabmind/workflow/workflow-orchestrator.ts`：唯一生产编排入口；
- `src/features/rehabmind/workflow/workflow-state.ts`：领域状态和不变量；
- `src/features/rehabmind/workflow/workflow-events.ts`：业务事件类型；
- `src/features/rehabmind/workflow/workflow-commands.ts`：副作用命令类型；
- `src/features/rehabmind/controllers/use-workflow-controller.ts`：React 与纯编排器连接；
- 现有 `*-core.ts`：暂时保留原位，继续承担已提取的单一规则。

验收：

- 正式流程轨迹无需浏览器即可运行；
- 页面与测试调用同一个编排入口；
- 每条目标轨迹记录实际命中的规则、转换、命令和 timeline 事件；
- 删除、反转或交换关键分支时，对应轨迹测试失败；
- 主组件不再直接决定处理后的复测和训练去向；
- 原有有效测试继续通过。

回退：每条链路单独提交；如提取产生行为差异，只回退该链路，不回退已验证的前序修复。

### 批次 4：快照、同步状态机与 SQLite/API

**进入条件**：案例和事件身份稳定。
**预计工作量**：3 至 5 天。

实施步骤：

1. 使用项目现有结构化校验能力；没有合适工具时再引入 Zod。
2. 建立唯一 `PilotSnapshotSchema`，客户端恢复、API 保存和 migration 共用。
3. 为每个必要字段定义类型、范围、默认值和可迁移规则。
4. 保留原始损坏数据的脱敏诊断摘要，页面进入明确恢复路径。
5. 定义 `local_only/dirty/syncing/synced/failed/conflict/deleting/deleted` 状态。
6. 所有保存请求携带 `baseRevision/requestId/caseId/sessionId`。
7. 同一案例保存串行；不同案例可并行但各自独立。
8. 响应落地前核对操作身份；迟到响应只写技术日志，不修改当前状态。
9. 冲突界面支持加载远端、保留本地副本、另存新案例；不提供静默覆盖。
10. SQLite Repository 改为明确的进程级生命周期或可靠关闭策略。
11. 快照、revision 和时间线事件在同一事务中提交。
12. 将 `tests/integration/d1/` 迁移或重命名为 SQLite/API 语义，避免名称继续误导。
13. 增加 migration 前后读取、旧快照升级、非法快照拒绝和连接压力测试。
14. 增加生产编排器到 service、HTTP、临时 SQLite、重新读取、恢复和继续后续康复的纵向流水线。
15. 注入事件/快照事务中断、SQLite busy、响应丢失和部分 migration 失败，验证原子性和恢复策略。

验收：

- 创建、保存、刷新、恢复、冲突、重试、删除和迁移全部使用真实 SQLite；
- 保存中刷新、切换、删除和请求乱序不丢数据、不串案例；
- 不完整或未来版本快照不能进入页面；
- 完整案例保存后能够从 SQLite 恢复同一状态和时间线，并继续正确的下一次康复；
- 连续请求不会无界增加 SQLite 连接或文件句柄。

数据库回退：

- migration 前完成 SQLite 在线备份和校验；
- 优先采用 expand/migrate/contract，先增加兼容字段，再迁数据，最后在后续版本收缩；
- 当前代码和上一版代码至少共同兼容一个数据库过渡版本；
- 未完成恢复演练前不得修改生产 schema。

### 批次 5：邀请、案例访问和最小运营闭环

**进入条件**：API 身份、schema 和 revision 稳定。
**预计工作量**：2 至 4 天。

邀请机制：

1. 邀请令牌服务端只存哈希。
2. 支持有效期、最大使用次数、撤销、来源批次和创建时间。
3. 原始令牌不进入 URL 之外的持久日志；进入页面后尽快从可见地址移除。
4. 邀请只授权创建案例，不能读取其他案例或进入管理员接口。
5. 未邀请用户仍可按产品决定使用本地模式，但不能创建远程案例。

首次使用路径：

1. 固定为“邀请链接 → 产品介绍 → 聚焦式教程 → 数据同意 → 创建案例 → 完成流程 → 保存 → 展示案例编号”；
2. 默认突出普通用户引导模式，专业模式作为明确的次入口；
3. 首页说明产品用途、使用方式、停止条件和能力边界，不使用诊断或疗效保证表述；
4. 教程完成、跳过和再次打开都不应改变业务状态；
5. 记录首次创建、各阶段进入、退出、完成和保存结果，用于判断流程摩擦，不用于证明临床效果。

案例访问：

1. 页面持续显示可复制的匿名案例编号。
2. 案例访问凭据只保存在本机安全存储，不显示在群聊文本中。
3. 仅凭案例编号不能读取、保存或删除案例。
4. 清理浏览器数据后的恢复限制需要明确告知。
5. 试用期数据保留策略按当前产品决定执行；若暂不自动清理，必须记录人工清理责任人、触发时间和可验证的 purge 流程。

最小管理员工作台：

1. 按案例编号、康复记录、版本和反馈状态检索；
2. 查看时间线、快照摘要、反馈和技术错误关联；
3. 标记待处理、已确认、已修复、无法复现；
4. 添加不向用户展示的内部备注；
5. 删除、清除和导出操作需要二次确认并记录管理员事件；
6. 导出默认脱敏，不包含访问令牌和邀请令牌。

试用指标：

- 邀请访问到创建案例的转化；
- 首次流程完成率和阶段退出率；
- 保存、恢复和冲突率；
- 后续康复记录创建率；
- 反馈提交率和可复现率；
- 各构建版本的错误率。

试用期质量监测：

1. 对跳过必需复测、队列提前结束、跨案例/记录/动作绑定、revision 倒退和删除后恢复产生脱敏异常代码。
2. 监测只用于发现实现错误，不参与康复决策。
3. 自动校验流程引用的动作、处理、训练和知识 ID 存在且版本可对应；该结果不得写成临床审核。
4. 管理员可按关联 ID 查看最小技术轨迹，日志不得包含症状原文、访问令牌或管理员凭据。

验收：公开案例编号可用于管理员定位，但不能成为用户访问凭据；粉丝群反馈可以由管理员根据编号补录并定位到具体康复记录；试用期异常流程能够产生脱敏技术告警，知识引用一致性有自动证据但不冒充临床审核。

### 批次 6：测试体系和发布证据收口

**进入条件**：核心架构和 API 合同稳定。
**预计工作量**：5 至 8 天，规则矩阵、历史缺陷和分层测试随批次 1 至 5 同步建立，最终在本批收口。

本批目标不是继续增加测试数量，而是证明以下四件事：

1. 预期来自正式规则，而不是当前实现；
2. 测试调用页面实际使用的生产入口；
3. 局部规则、完整轨迹、页面接线和数据落库之间没有证据断点；
4. 对应错误重新出现时，至少一条当前测试会稳定失败。

测试层级：

| 层级 | 内容 | 主要目的 | 常规时机 |
| --- | --- | --- | --- |
| L0 | 正式规则、规则编号、决策表、状态转换矩阵、夹具与版本 | 确定可执行 oracle | 规则或数据合同变更时 |
| L1 | lint、typecheck、build、依赖、schema | 工程可交付 | 每次提交 |
| L2 | 生产核心函数、P0 决策表、边界、性质、不变量、内容一致性和变异 | 证明局部规则有效 | 每次相关修改 |
| L3 | 生产编排器完整轨迹、状态转换、命令、时序、并发和错误注入 | 证明业务流程正确 | 流程修改、提交前 |
| L4 | Controller、页面适配器、组件状态、本地存储和 IndexedDB | 证明用户操作正确接入生产流程 | UI/同步修改 |
| L5 | 生产编排器到 service/HTTP/SQLite/恢复的纵向流水线，以及权限、迁移、反馈和删除 | 证明真实业务和数据链闭合 | API、数据或流程修改 |
| L6 | 少量浏览器、视觉、可访问性、人工任务 | 证明真实界面可用 | UI 修改、发布前 |
| L7 | VPS canary、健康、回滚、备份恢复和脱敏业务不变量监测 | 证明可安全运行并发现未知异常 | 每次发布及试用期 |

#### 6.1 规则、决策表和状态转换矩阵

建立机器可读注册表，至少包含：

```text
ruleId / designSource / ruleVersion / risk
productionEntry / preconditions / inputEvent
legalExits / prohibitedExits / stateEffects / commands
fixtureIds / scenarioIds / evidenceLayers / mutationIds
commitSha / buildId / schemaVersion / currentStatus
```

执行要求：

1. P0 规则的每个合法出口、禁止出口和状态不变量必须有证据；P1 使用风险筛选，未覆盖项必须明确记录。
2. 安全停止、是否处理、是否复测、队列继续、训练门禁、权限和返回修改失效范围建立完整决策表。
3. 三个以上条件共同决定的 P0 门禁使用 MC/DC 或等效条件独立性测试，证明每个条件能够独立影响判断；不能只靠成对组合。
4. 场景执行时记录实际命中的 `ruleId`、转换、命令和事件类型；没有命中目标分支的场景不得登记为覆盖。
5. 设计文档之间存在冲突或无法确定预期时，测试保持待定并阻断对应 P0，不由测试作者从实现中自行补规则。

组合策略：

1. 从规则矩阵提取等价类和边界，不执行无意义的全部笛卡尔积。
2. P0 分支要求每个合法出口、禁止出口和状态不变量都有证据。
3. P0 复合门禁先执行决策表和条件独立性测试；P1 再使用成对组合覆盖症状、动作结果、处理响应、复测结果和队列状态之间的主要交互。
4. 对少数明确存在三方交互风险的组合增加定向三元场景，不把所有输入扩展成笛卡尔积。
5. 使用固定种子直接驱动生产编排器进行状态探索，失败保存种子、操作轨迹和自动缩减后的最小序列；禁止另写简化状态模型。
6. 对案例选择、动作身份、复测复用、权限撤销、revision、删除和返回修改分支做定向变异。
7. 新测试只有在对应历史错误或定向变异上失败，才可登记为缺陷防护证据。

#### 6.2 核心性质和时间序列

除固定场景外，生产编排器必须满足：

- 相同状态、事件和版本产生相同结果；
- 相同幂等事件重复提交不会重复处理；
- 修改案例 A 不改变案例 B，修改一次康复记录不改变其他记录；
- 同名动作、左右侧动作和不同 session 的处理及复测不能互相复用；
- 状态序列化后恢复，领域状态、队列和身份保持一致；
- 返回修改只清除规则规定的下游数据，所有受影响结果必须重算；
- 处理队列项目不会无故丢失、重复、越序或在停止条件后继续；
- 必须复测的处理未取得复测结果前不能进入训练；
- 后续康复使用对应历史基线，不回退到首诊临时值；
- 时钟、ID 和版本全部注入，跨日、同毫秒事件和服务器 UTC 不造成身份碰撞。

#### 6.3 页面适配器和组件合同

增加轻量 DOM/组件测试环境，不启动完整浏览器，按垂直切片验证：

```text
可见用户操作
→ Controller 收到的 WorkflowEvent
→ 生产 orchestrator 返回的 state/commands/events
→ 页面显示、按钮状态和下一步入口
```

要求：

1. 测试使用稳定角色、标签和业务 ID，不依赖 `.first()` 或宽泛文本循环。
2. 每个关键动作同时检查发送事件和返回状态，防止按钮传错值、没有 dispatch、禁用条件写反或显示旧状态。
3. 增加依赖边界检查，禁止 stage view 直接导入临床规则、repository、HTTP client 或自行推导复测和训练去向。
4. 每段逻辑迁入 orchestrator 后，使用静态依赖检查和行为测试证明主组件旧判断已删除。
5. 组件测试证明页面接线，不用于证明临床规则正确；视觉间距、图片表达和文案理解仍由 L6 处理。

#### 6.4 纵向真实业务流水线

在单进程测试中使用临时 SQLite、生产 service 和真实 route handler，至少固定以下轨迹：

1. 普通用户受邀请创建案例，完成一条首诊主流程，保存、关闭、重新加载并继续后续康复。
2. 多个动作分别评估、处理和复测，队列重算后进入正确训练出口。
3. 无法完成、未知、无变化、改善和加重分别进入允许出口，禁止出口始终不可达。
4. 返回修改上游答案后，旧处理、复测、训练和总结按规则失效并重新产生。
5. 两个案例、两个康复记录和相同动作 ID 交错操作，SQLite 中的快照、事件和反馈完全隔离。
6. 保存乱序、重复请求、旧 revision、删除后迟到响应及服务重启后恢复均保持确定结果。
7. 反馈可绑定当前或历史记录和模块，管理员按公开案例编号定位，但编号不能读取或修改用户数据。
8. 旧 schema 快照经过真实 migration 恢复；未来版本、不完整和损坏快照被拒绝且不污染原数据。

每条轨迹同时断言：最终领域状态、实际转换、命令、timeline 顺序、SQLite 行、revision、版本和恢复后的下一合法操作。只断言 HTTP 状态码或最终总结页不算通过。

#### 6.5 夹具和知识一致性

1. 正常流程夹具必须通过生产 schema，并优先由公开 `WorkflowEvent` 序列建立。
2. 直接构造不可能状态的夹具只能用于损坏数据、安全或恢复测试，并明确标记 `invalidFixture`。
3. 每个夹具记录适用的 schema、规则和知识版本；版本不匹配时测试必须失败或执行明确迁移。
4. 固定保留至少一个当前版本、每个受支持旧版本和一个未来版本快照样本。
5. 自动检查所有流程输出引用的动作、处理、训练和知识 ID 存在，且部位、侧别、模式、能力和版本关系有效。
6. 该检查只证明软件引用一致，不得写成临床内容已审核。

必须覆盖的错误注入：

- 请求超时、断网、429、409 和 500；
- 保存响应乱序、重复响应和旧 revision；
- 损坏 localStorage、IndexedDB 和不完整服务器快照；
- 重复事件 ID、相同幂等键不同载荷；
- 保存中切换案例、删除后迟到响应、反馈打开后切换记录；
- schema 版本过旧、过新和 migration 中断；
- 应用版本与服务端记录版本不一致。

还必须覆盖事务中间失败：事件写入成功但快照失败、快照成功但响应丢失、migration 应用部分语句后中断、SQLite busy/磁盘写入失败。测试应证明事务回滚、幂等重试或明确可恢复状态，不允许半条时间线静默留存。

#### 6.6 试用期业务不变量监测

以下异常只用于质量告警，不参与康复决策：

- 需要复测却直接进入训练或总结；
- 队列未结束却生成训练计划；
- 处理目标、复测目标、案例或 session 身份不一致；
- revision 倒退、删除案例被恢复或同一幂等键出现不同载荷；
- 反馈引用不存在或不属于对应案例的事件；
- 客户端、服务端、规则、知识或 schema 版本无法对应。

告警只记录脱敏关联 ID、规则/版本、异常代码和时间，不记录用户症状原文、访问令牌或管理员凭据。每个线上异常都必须能够导出最小技术轨迹，进入历史缺陷回放集后再修复。

#### 6.7 最小真实界面验证

最小浏览器集合：

1. 普通用户完成一条膝部主流程；
2. 踝足急性或安全停止路径；
3. 专业模式权限和普通模式边界；
4. 保存、刷新和恢复；
5. 两个案例切换与隔离；
6. 生产 `/RehabMind/` 前缀、资源、API 和基础布局。

浏览器不再穷举所有康复组合。成功时只输出单行摘要；失败时才保存 DOM、控制台、网络、trace 和截图。人工任务验收用于判断文案、布局、可理解性和操作反馈，不能被 DOM 全量扫描替代。

人工验收只执行任务清单，不重复业务组合：首次接触者能否理解产品用途和下一步、普通用户能否完成一次流程、专业入口是否不会误导普通用户、错误和保存状态是否可理解、案例编号和问题反馈是否容易找到。发现问题后先补最小可失败证据，再修实现。

#### 6.8 测试有效性和证据汇总

证据汇总整改：

1. `playwright.config.ts` 保留完整 `/RehabMind/` 基础路径，不再只取 URL origin；
2. 每次运行先创建当前 `runId`，汇总器只读取该运行清单中的产物；
3. 产物记录 `commitSha/buildId/appVersion/ruleVersion/schemaVersion`；
4. 发布门禁中 `not_run`、版本不匹配、缺脚本和过期结果都判定失败；
5. `test:preview` 改为真实部署合同检查或更名，不能只检查环境变量后宣称预览通过；
6. `rendered-html` 和源码字符串类测试保留时只算结构辅助证据，不计入规则行为覆盖。
7. `scenario-registry` 扩展到 L2-L7，不再只登记浏览器场景；每条 P0 规则能够反查生产入口、测试、变异和当前证据。
8. 测试必须断言目标转换或规则确实被命中，防止夹具失效后测试仍空跑全绿。
9. 核心测试默认零重试；偶发失败不得通过自动重试隐藏，必须固定时钟、ID、数据库和异步调度后处理。

目标测试命令：

```text
npm run test:affected       # 修改相关的 L1-L4
npm run test:fast           # 提交门禁，不包含浏览器
npm run test:workflow       # 正式全流程轨迹与错误注入
npm run test:component      # Controller、页面适配器和轻量 DOM 合同
npm run test:integration    # SQLite + HTTP 数据合同
npm run test:vertical       # 编排器→HTTP→SQLite→恢复的纵向流水线
npm run test:browser:smoke  # 约 6 条真实接线场景
npm run test:release        # L0-L5 + 证据汇总
npm run test:summary        # 只汇总当前 commit/build 产物
```

命令名称可以结合现有脚本调整，但输出必须明确包含和排除的层级。

效率预算：

- 修改相关的定向测试目标在 60 秒内给出结果；
- 非浏览器提交门禁目标在 5 分钟内完成；
- workflow 和 component 各自在 3 分钟内完成；
- SQLite/API 与纵向流水线合计目标在 7 分钟内完成；
- 非浏览器发布门禁目标在 12 分钟内完成；
- 最小浏览器集合目标在 10 分钟内完成；
- 超出预算时先定位慢测试、重复构建和无效等待，不通过减少关键断言掩盖问题。

#### 6.9 具体产物、工具和批次责任

目标产物不是建议清单，必须由对应批次创建并纳入正式命令：

| 产物 | 目标位置 | 责任批次 | 验收方式 |
| --- | --- | --- | --- |
| 规则、状态转换和证据注册表 | 扩展 `tests/workflow/scenario-registry.json`，或迁移为同职责的机器可读文件 | A1 建立，A4-A7 持续更新 | P0 规则可反查设计来源、生产入口、场景、变异和当前证据 |
| P0 决策表 | `tests/workflow/decision-tables/` | A1 定义，A4 执行 | 合法/禁止出口完整，复合门禁满足 MC/DC 或等效条件独立性 |
| 历史缺陷回放 | `tests/workflow/known-defects/` 及相关集成目录 | A1 | 错误实现稳定失败，修复后通过 |
| 生产编排器轨迹和性质测试 | `tests/workflow/` | A4 | 直接调用唯一生产 orchestrator，记录实际转换、命令和事件 |
| 页面适配器合同 | `tests/component/` | A4 | 用户操作、`WorkflowEvent`、返回状态和显示逐项对应 |
| 版本化夹具 | `tests/fixtures/workflow/`、`tests/fixtures/snapshots/` | A1/A5 | 通过生产 schema，旧版本可迁移，未来/损坏版本被拒绝 |
| SQLite/API 与纵向流水线 | `tests/integration/sqlite-api/` | A5 | 使用生产 service/route、临时 SQLite、重新读取和恢复继续流程 |
| 业务不变量定义与告警测试 | `src/features/rehabmind/workflow/workflow-invariants.ts` 及对应测试 | A4 定义，A6 接入 | 测试和试用日志使用同一异常代码，告警脱敏且不参与决策 |
| 当前运行证据清单 | `artifacts/quality/<runId>/manifest.json` | A7 | 绑定 commit/build/app/rule/schema，旧产物和 `not_run` 不能通过 |
| 最小浏览器与人工任务记录 | `tests/browser/`、当前运行证据目录 | A7 | 只验证界面接线、部署路径和理解性，不冒充业务组合覆盖 |

工具约束：

1. L2、L3 和大部分 L5 继续使用 Node `node:test`，避免并存两套核心测试运行器。
2. L4 使用 Vitest 处理 TSX/Vite 转换，并采用 `@testing-library/react`、`@testing-library/user-event` 和 `jsdom`；该运行器只负责组件合同，不复制 L2/L3 业务测试。
3. L3 状态探索默认使用 `fast-check` 生成并缩减事件序列，但每一步都调用生产 orchestrator，并根据当前生产状态约束下一合法事件；不建立测试专用状态机。
4. L5 的 route 合同使用生产 `Request/Response` 和临时 SQLite；另保留一条对构建后服务发起真实 HTTP 请求的发布冒烟，覆盖中间件和 `/RehabMind/` 前缀。
5. 变异工具可以继续使用当前定向脚本；只有覆盖面扩大到值得维护时才引入通用变异框架。

批次与证据的固定交付顺序：

```text
A1：L0 矩阵 + 历史错误红灯 + 有效夹具
→ A2：原地修复已知 P0，L2/L5 定向回归
→ A3：依赖边界和双份逻辑防线
→ A4：唯一 orchestrator + L2/L3 + 页面适配器 L4
→ A5：同步/权限/真实 SQLite + 纵向 L5
→ A6：管理员定位 + 知识一致性 + 运行时不变量
→ A7：正式命令、证据清单、最小 L6、VPS L7 和开放判断
```

任何批次不能把自己的缺失证据推迟到 A7 临时补写；A7 只负责统一运行、核验版本和做发布判断。

### 批次 7：安全、性能和 VPS 发布

**进入条件**：数据与 API 合同稳定，发布测试可运行。
**预计工作量**：2 至 3 天。

安全整改：

1. nginx 覆盖客户端地址，应用只信任受控代理传入的地址头。
2. 邀请、案例、管理员和清除接口分别执行权限检查。
3. 限制创建、保存和反馈请求大小与频率。
4. 当前同意版本变化时要求重新确认。
5. 错误响应不返回堆栈、数据库路径、令牌或完整健康文本。
6. 增加 CSP、`frame-ancestors`、Referrer Policy 和必要安全响应头。
7. 保护、移除或设置 noindex 的 `/decision-lab`。
8. 评估并处理生产依赖审计中的高危项。

性能与资源：

1. 记录空闲、一次完整流程、并发保存和备份时的 Node/SQLite 内存。
2. 建立 PM2 内存上限和重启策略。
3. 配置日志轮转、磁盘阈值和 SQLite/WAL 文件监控。
4. 分析主包体，优先按阶段和仅管理员功能懒加载。
5. 不在约 969MB VPS 上永久运行两个完整预览进程，除非资源测量证明可行。

发布顺序：

1. 干净检出并按锁文件安装依赖；
2. typecheck、build、L0-L5 门禁；
3. 备份 SQLite 并验证备份可读取；
4. 执行 migration 兼容检查；
5. 上传带 `commitSha/buildId` 的发布目录；
6. 运行 migration；
7. 使用 PM2 reload 或经资源验证的短时 canary；
8. 验证首页、真实 SQLite 读取、邀请边界、保存和版本；
9. 切换正式流量并观察错误和资源；
10. 保留上一兼容版本和对应数据库备份。

回滚要求：代码回滚前确认数据库仍兼容上一版。若 migration 不可逆，必须通过前置备份恢复，不得只切换代码软链接。

### 批次 8：按垂直切片拆分主组件并迁移领域文件

**进入条件**：流程、同步和反馈控制器均有可靠测试，且批次 7 已达到小范围试用发布门槛。
**预计工作量**：5 至 8 天。

本批不阻塞已经满足门槛的小范围试用。拆分按业务垂直切片进行，不采用“先拆完全部 UI，再搬全部 core”的二次修改方式：

1. 症状与确认页面，同时迁移 intake 和 action identity 核心；
2. 评估页面，同时迁移 assessment、motion、muscle tension 和专项检查核心；
3. 处理复测页面，同时迁移 candidate、treatment、trial、retest 和 ledger 核心；
4. 训练、总结与后续页面，同时迁移 training、followup、home relaxation 和 adverse 核心；
5. 最后收口 `CaseHeader`、`FeedbackPanel` 和共享 UI。

拆分规则：

- 阶段组件只接收当前阶段数据、允许的操作和回调；
- 不直接读取 SQLite/API/IndexedDB；
- 不读取其他阶段的可变状态；
- 不在组件内部计算下一阶段；
- 共享状态优先进入领域状态，不用新增全局 Context 掩盖依赖；
- 不为降低文件行数制造大量一行包装组件；
- 行为提取和纯文件移动使用不同提交；
- 教程、反馈和冲突弹层补齐焦点限制、键盘关闭和焦点恢复；
- 桌面目标视口检查动态文案、计数和按钮不会重叠；手机端仍标记为非正式支持。

验收不使用固定行数，而检查：

- 主组件只负责路由、控制器装配和当前阶段渲染；
- 业务状态具有唯一所有者；
- 阶段 props 可以清楚表达输入和输出；
- 阶段组件测试不需要启动完整页面；
- `src/domain` 没有 React、HTTP、数据库或浏览器存储依赖；
- 已通过的业务轨迹没有变化。

### 批次 9：文档、试用准备和阶段验收

**进入条件**：P0 整改和发布门禁通过。
**预计工作量**：1 至 2 天。

实施步骤：

1. 更新 `project-status.md`，只写当前提交实际验证过的状态。
2. 更新质量登记、覆盖矩阵、测试计划和发布运行手册。
3. 将 Cloudflare/D1 文档明确标记为历史或本地 harness。
4. 更新根 README 的启动、测试、部署和恢复入口。
5. 形成当前版本发布说明和已接受风险列表。
6. 先邀请 3 至 5 名内部用户，再邀请 10 至 20 名熟悉粉丝。
7. 每批记录版本、人数、完成率、退出点、反馈和暂停条件。

验收：任何接手者能在不阅读会话记录的情况下完成本地运行、测试、部署、回滚、案例查询和反馈定位。

### 仓库结构整理与整改批次对应关系

仓库物理整理不作为独立的大搬迁执行，而是嵌入上述整改批次。详细目录、依赖方向和文件分类以[仓库结构整理方案](./repository-structure-refactor-plan.md)为准。

目标顶层边界：

```text
app/                       vinext 路由和 API 路由入口
src/features/rehabmind/    页面组件、控制器和生产工作流
src/domain/rehab/          不依赖运行环境的领域纯函数
src/knowledge/pilot/       膝踝试点知识和内容数据
src/infrastructure/pilot/  API client、本地存储、同步、反馈和邀请
db/                        Repository、SQLite 和 schema
tests/                     unit、workflow、component、integration、browser
scripts/                   quality、deploy、data、docs、legacy-browser
docs/                      正式文档、计划、质量、运维、交接和研究资料
```

批次对应关系：

| 结构任务 | 最终执行位置 | 具体动作 | 验收 |
| --- | --- | --- | --- |
| 导航与根目录卫生 | A0 | 重写根 README；增加 `app/tests/scripts` 导航；未引用临时产物归档到 `.tmp/` | 根目录无未解释运行产物，入口文档可定位全部职责 |
| P0 行为保护 | A1 至 A2 | 先建立失败测试并原地修复案例、事件、反馈和安全缺陷，不移动文件 | 数据风险先消除，测试能在错误实现上失败 |
| 工作流目标目录 | A3 至 A4 | 建立依赖边界；新编排器直接进入 `src/features/rehabmind/workflow/` | 页面和测试使用同一入口，没有新旧双实现 |
| 案例与同步基础设施 | A2/A5 修行为，B0 迁文件 | 先原地修复 case、sync、local store、timeline、feedback、invite、release，发布门槛后再纯迁移 | 行为修复提交与文件移动提交分开，SQLite/API 通过 |
| 试用运营与发布 | A6 至 A7 | 邀请、管理员、证据门禁、安全、备份、canary 和回滚 | 达到小范围试用门槛，不等待完整目录搬迁 |
| 阶段 UI 与领域核心 | B1 | 按症状、评估、处理复测、训练总结四个垂直切片同步移动 | 每个切片只修改一次 import，并独立验证 |
| db、测试与脚本 | B2 至 B4 | 三个责任边界分别迁移，不放在同一提交 | 所有正式命令和发布入口从干净检出可运行 |
| 文档与静态资产 | B5 及后续素材批次 | 四份正式文档留在根索引；其他文档分类；图片建立 manifest 后再移动 | Markdown、资源 URL、nginx 和快照无断链 |

执行规则：

1. 使用 `git mv` 或等价可追踪移动，保留文件历史。
2. 新模块直接放在最终目录，避免先放 `app/` 再搬一次。
3. 每次只迁移一个责任边界，不把目录移动、规则修改和视觉重做混在同一提交。
4. 新代码使用 `@/src/...` 或 `@/db/...` 绝对导入；迁移旧文件时同步更新其生产和测试引用。
5. 领域层不得导入 React、DOM、HTTP、SQLite 或浏览器存储。
6. UI 不得直接访问 repository，API route 不得实现康复状态迁移。
7. 测试运行器支持递归发现前，不单独移动根目录测试文件。
8. public 图片建立资产 manifest 前不移动，避免硬编码 URL、nginx 和视觉快照同时失效。
9. `.dev.vars`、邀请令牌、管理员密钥、案例访问令牌、SQLite 和备份不参与普通目录整理。
10. 每批完成后用 `rg` 确认旧路径没有运行引用，并执行 typecheck、目标测试和 build。

当前已完成 A0 的根目录导航部分：根 README、目录导航和结构方案已经建立；137 个未被当前文档引用的临时产物已归档到 `.tmp/root-legacy-2026-08-23/`，没有删除文件。被历史文档引用的证据和敏感文件暂未移动。

### 仓库结构具体执行计划

最终执行分成两个里程碑：A0 至 A7 先达到小范围试用标准，B0 至 B6 再完成全面结构治理。不得为了目录整齐推迟 P0 数据修复，也不得把行为修改和文件移动放进同一个提交。

#### 步骤 A0a：冻结当前结构基线

**预计时间**：0.5 天。

执行：

1. 记录当前 commit、工作树和现有未提交文档改动。
2. 导出 `app/tests/scripts/docs/public` 文件清单及数量。
3. 记录当前相对 import 数量、循环依赖扫描结果和构建产物大小。
4. 运行 `typecheck`、`test:unit` 和 `build`，保存基线摘要。
5. 在质量登记新增 `STRUCT-01`，状态设为“整改中”。

退出条件：基线可复现；当前代码、测试和构建均有结果；没有把旧测试全绿写成业务质量结论。

当前状态：已于 2026-08-23 完成，证据见[A0a 基线记录](../quality/a0a-baseline-2026-08-23.md)。基线保留 lint 失败、依赖风险、循环依赖和历史 D1 集成入口等真实缺口，不作为质量通过证明。

#### 步骤 A0b：完成根目录卫生和导航

**预计时间**：0.5 天，当前已完成主要部分。

执行：

1. 根 README 指向项目状态、正式文档、整改计划和结构计划。
2. `app/tests/scripts` 分别具有职责索引。
3. 未引用临时产物移入 `.tmp/root-legacy-2026-08-23/`，不删除。
4. 保留被历史文档引用的证据；后续证据统一进入 `.tmp/` 或版本化 `artifacts/quality/`。
5. `.tmp-deploy-secrets.txt`、`.dev.vars` 和 `.preview-admin-key` 不作为普通文件整理对象，单独进入凭据治理。

退出条件：根目录长期文件均有明确职责；本地链接、typecheck、542 条单元测试和 build 通过。

当前状态：已于 2026-08-23 完成，证据见[A0b 导航与根目录验收](../quality/a0b-navigation-2026-08-23.md)。22 个仍被历史文档引用的根目录临时文件继续保留，待 B5 建立完整引用检查后再迁移。

#### 步骤 A1：建立 P0 历史缺陷失败测试

**预计时间**：2 至 3 天。

执行：

1. 为 `CASE-01/AUDIT-03/AUDIT-04/FEED-02/SCHEMA-01/SYNC-01/SEC-02/TEST-14/TEST-15/TEST-16/TEST-19` 固定正确预期。
2. 测试直接调用当前生产函数、service、repository 或真实流程入口，不复制简化模型。
3. 建立第一版机器可读规则/状态转换矩阵，写明设计来源、合法出口、禁止出口、状态副作用和生产入口。
4. 为安全停止、复测、队列、训练、权限和返回修改建立 P0 决策表，并标出需要条件独立性测试的复合判断。
5. 每项至少包含正向、禁止出口、实际分支命中和最终状态断言。
6. 正常夹具通过生产 schema；不能由公开事件建立的状态不得冒充正常用户流程。
7. 在修改实现前保存稳定红灯证据。
8. 对案例选择、事件类型、事件 ID、复测门禁、队列、revision、同意版本和限流地址做定向变异。

本步骤不移动生产文件，不创建新目录层级，不修改产品规则。

退出条件：每个 P0 缺陷都能被自动化稳定捕获；目标规则和转换确实被命中；错误实现、无效夹具和关键条件反转不能继续全绿。

当前状态：已于 2026-08-24 完成修复前红灯、规则矩阵、决策表和有效夹具，证据见 [A1 P0 历史缺陷红灯基线](../quality/a1-p0-red-baseline-2026-08-24.md)。决策表接入唯一生产 orchestrator 的最终证据仍按 A4 执行。

#### 步骤 A2：原地修复 P0 数据和安全缺陷

**预计时间**：2 至 4 天。

执行顺序：

1. 修复当前案例与远程案例的显式映射，停止从记录数组猜测案例。
2. 修复阶段进入/完成语义、事件 ID 和幂等去重。
3. 修复案例切换后的反馈模块和事件上下文。
4. 修复快照最低完整性、同意版本和代理地址信任边界。
5. 处理最危险的保存乱序、切换和删除迟到响应。

每个缺陷使用独立 `fix(...)` 提交。此时文件继续保留原路径，只改变行为；完成定向测试后再运行受影响的 L2-L5。

退出条件：P0 数据污染和越权风险已经在当前结构中消除，后续架构提取不再携带已知错误行为。

当前状态：已于 2026-08-24 完成，证据见 [A2 P0 数据与安全整改验收](../quality/a2-p0-data-security-remediation-2026-08-24.md)。`test:fast` 557/557、21 项变异和 HTTP+D1 连续两轮 5/5 已通过；页面适配器与 SQLite 纵向流水线继续按 A4/A5 完成。

#### 步骤 A3：建立目标目录和导入约束

当前状态：已于 2026-08-24 完成，证据见 [A3 架构边界验收](../quality/a3-architecture-boundaries-2026-08-24.md)。边界正反测试、当前仓库检查、类型检查和构建均通过。

**预计时间**：0.5 至 1 天。

创建：

```text
src/features/rehabmind/{components,controllers,workflow,styles}
src/domain/rehab/{intake,assessment,treatment,retest,training,followup,safety,shared}
src/knowledge/pilot
src/infrastructure/pilot/{api,persistence,feedback,invite,release}
```

执行：

1. 确认 `@/*` 能解析仓库根目录，并以 `@/src/...` 作为新模块导入格式。
2. 增加最小边界检查：`src/domain` 禁止导入 React、`app/`、`db/`、HTTP 和浏览器存储。
3. 增加 stage/controller 边界：stage view 不得直接导入领域规则、repository 或 HTTP，也不得自行推导复测、队列和训练去向。
4. 边界检查覆盖“旧判断回流”：新 orchestrator 生效后，主组件不得保留同一规则的另一份条件分支。
5. 不创建通用 `utils/common/misc` 目录；无法归类的模块先保留原位。
6. 新目录只在有第一个正式模块时创建，不提交空目录。

验证：边界检查自身应有一条故意违规夹具证明能失败；typecheck 和 build 通过。

#### 步骤 A4：新建正式工作流，不移动全部旧 core

当前状态：已于 2026-08-24 完成，证据见 [A4 正式工作流编排器验收](../quality/a4-production-workflow-orchestrator-2026-08-24.md)。七张 P0 决策表、生产轨迹、页面命令合同、9600 次状态探索、26 项定向变异和 581 条快速测试均通过。

**预计时间**：4 至 7 天，与整改批次 2 和测试批次 6 同步。

目标文件：

```text
src/features/rehabmind/workflow/workflow-state.ts
src/features/rehabmind/workflow/workflow-events.ts
src/features/rehabmind/workflow/workflow-commands.ts
src/features/rehabmind/workflow/workflow-orchestrator.ts
src/features/rehabmind/controllers/use-workflow-controller.ts
```

执行顺序：

1. 先为处理完成、复测、队列重算和训练门禁建立决策表、失败测试和实际转换命中断言。
2. 从主组件提取这一条链路到 orchestrator，并记录 `ruleId/state transition/commands/timeline events`。
3. 再提取评估进入处理、队列完成进入训练、训练进入总结。
4. 最后提取返回修改、后续康复和异常加重。
5. 使用固定种子直接驱动 orchestrator 探索合法事件序列，失败自动保留并缩减最小轨迹。
6. 对 P0 复合门禁执行 MC/DC 或等效条件独立性测试，对其他交互执行边界、成对和定向三元组合。
7. 每条链路切换成功后删除主组件中的旧判断，不保留双份实现。
8. 增加 Controller/页面适配器合同，证明可见操作发出正确业务事件并呈现返回状态。
9. 现有 `*-core.ts` 暂留原位，通过绝对导入供 orchestrator 组合。

每条链路独立提交，例如：

```text
refactor(ARCH-02): extract treatment and retest transition
refactor(ARCH-02): extract training and summary transition
```

退出条件：页面和测试使用同一生产入口；P0 决策表、完整流程轨迹、页面适配器合同、状态探索、定向变异、typecheck 和 build 通过；主组件不存在已迁移规则的双份判断。

#### 步骤 A5：整改同步、API client、邀请和版本基础设施

当前状态：已于 2026-08-24 完成，证据见 [A5 同步、SQLite 与纵向流水线验收](../quality/a5-sync-sqlite-vertical-2026-08-24.md)。当前生产入口、真实 SQLite、重启恢复、30 项定向变异和 599 条快速测试均已通过；lint 保持 A0 基线的 4 errors、8 warnings，留待 A7 正式门禁收口。

**预计时间**：4 至 7 天，与整改批次 4 至 6 同步。

本步骤先稳定以下模块的行为和公开合同：

- `pilot-persistence-controller.ts`、`pilot-sync-core.ts`；
- `local-case-store.ts`、`pilot-snapshot-schema.ts`；
- `pilot-case-client.ts`、`pilot-case-contracts.ts`；
- `pilot-invite.ts`、`pilot-invite-client.ts`；
- `pilot-release.ts`、`consent-core.ts`、`rate-limit-core.ts`。

`pilot-case-service.ts` 和 `pilot-case-admin-service.ts` 暂时保留靠近 API 路由，直到 API service 与 repository 边界稳定，再迁入 `src/infrastructure/pilot/api/server/`。

在当前路径完成同步状态机、完整 schema、连接生命周期、事务、邀请和权限整改，并通过竞态及 SQLite/API 测试。随后建立“生产 orchestrator → service → route → 临时 SQLite → 重新读取 → 恢复并继续”的纵向测试，不使用 mock repository 代替。发布门槛前不搬动这些稳定模块；纯路径迁移统一放在 B0。

退出条件：同步竞态、schema、邀请、权限、SQLite/API 和纵向业务流水线通过；完整案例可以保存、重启恢复并继续后续康复；package scripts 和源码合同没有旧 D1 入口冒充当前集成证据。

#### 步骤 A6：完成邀请与最小运营闭环

当前状态：已于 2026-08-24 完成，证据见 [A6 邀请与最小运营闭环验收](../quality/a6-invite-operations-2026-08-24.md)。邀请次数/来源、反馈上下文、管理员短会话与操作台、首次使用顺序、运营指标、管理审计、运行时不变量和知识引用一致性均已通过生产函数及真实 SQLite/API 验证；A6 未运行浏览器，也不代表已完成临床审核。

**预计时间**：2 至 4 天。

执行：

1. 分离邀请令牌、公开案例编号、案例访问凭证和管理员凭证。
2. 完成邀请有效期、次数、撤销和来源批次。
3. 反馈绑定案例、康复记录、模块、可选事件和版本。
4. 管理端能够按案例编号查看记录、时间线、反馈状态、备注、删除和脱敏导出。
5. 固定首次使用路径和最小试用指标。
6. 增加脱敏业务不变量监测，至少覆盖跳过复测、队列提前结束、跨案例/记录/动作绑定、revision 倒退、删除后恢复和无效反馈引用。
7. 增加知识与流程引用一致性检查，但明确不把该检查标记为临床审核。

本步骤只迁移已经在 A5 中稳定的邀请和反馈基础设施，不为了后台界面整齐提前搬动其他领域文件。

退出条件：公开案例编号不能访问数据；邀请不能升级权限；管理员可以定位粉丝反馈对应的完整上下文；异常流程产生不含健康原文和凭据的技术告警。

#### 步骤 A7：建立试用发布门禁

当前状态：自动化与 VPS 发布部分已于 2026-08-24 完成，证据见 [A7 试用发布门禁验收](../quality/a7-release-gates-2026-08-24.md)。当前为 15/16；人工任务反馈产品价值理解不足、流程文案过密，因此 A7 **尚未完成且不得开放粉丝群**。修复具体高密度页面并重做人工任务后才能关闭 A7。

**预计时间**：4 至 6 天。

执行：

1. 落地 `test:workflow/test:component/test:integration/test:vertical/test:release`，命令输出明确实际运行和未运行层级。
2. 当前提交的 L0-L5 全部通过，内部规则、轨迹、页面适配和纵向 SQLite 证据均绑定 commit、build、应用、规则和 schema 版本。
3. 将 `scenario-registry` 扩展到 L2-L7，旧产物、未运行、版本不匹配和未命中目标分支都不能显示绿色。
4. 修复 Playwright `/RehabMind/` 前缀和过期产物汇总问题。
5. 运行约六条最小浏览器接线场景和一次人工任务验收。
6. 完成日志脱敏、安全响应头、依赖风险、业务不变量告警和真实 SQLite 健康检查。
7. 完成 VPS 备份恢复、migration 兼容、canary、PM2 reload 和代码/数据库回滚验证。

退出条件：达到第 9 节粉丝群开放门槛。完成 A7 后可以决定是否小范围开放，不需要等待 B0 至 B6 的完整目录治理。

#### 步骤 B0：纯迁移已经稳定的基础设施模块

**预计时间**：2 至 3 天，不阻塞已经满足门槛的小范围试用。

前置条件：相关模块已在 A2 和 A5 完成行为修复，当前路径下的案例隔离、事件、反馈、同步、schema、邀请和权限测试均已通过。

目标映射：

| 当前文件或文件组 | 目标位置 |
| --- | --- |
| `pilot-feedback-context.ts` | `src/infrastructure/pilot/feedback/feedback-context.ts` |
| `pilot-feedback-panel.tsx` | `src/features/rehabmind/components/feedback/feedback-panel.tsx` |
| `pilot-timeline.ts` | `src/infrastructure/pilot/persistence/timeline.ts` |
| `stage-event-core.ts` | `src/features/rehabmind/workflow/stage-events.ts` |
| `local-case-identity.ts`、`local-case-store.ts` | `src/infrastructure/pilot/persistence/` |
| `pilot-persistence-controller.ts`、`pilot-sync-core.ts` | `src/infrastructure/pilot/persistence/` |
| `pilot-snapshot-schema.ts` | `src/infrastructure/pilot/persistence/snapshot-schema.ts` |
| `pilot-case-client.ts`、`pilot-case-contracts.ts` | `src/infrastructure/pilot/api/` |
| `pilot-invite.ts`、`pilot-invite-client.ts` | `src/infrastructure/pilot/invite/` |
| `pilot-release.ts` | `src/infrastructure/pilot/release/release-version.ts` |
| `rehab-session-history.ts` | `src/features/rehabmind/workflow/session-history.ts` |

执行只允许使用 `git mv`、AST/IDE import 更新和必要的出口文件，不改变任何业务判断。每个责任目录使用独立 `chore(STRUCT-01)` 提交。

退出条件：旧路径无运行引用；案例、事件、反馈、同步、SQLite/API、typecheck 和 build 结果与移动前一致。

#### 步骤 B1：按垂直业务切片拆分 UI 与领域核心

**预计时间**：5 至 8 天，与整改批次 6 和领域文件迁移同步。

不再采用“先拆完六个 UI，再统一移动所有领域 core”的顺序。实际按四个垂直切片执行：

| 顺序 | 页面切片 | 同批领域模块 | 同批测试 |
| --- | --- | --- | --- |
| 1 | 症状、关键确认 | intake、action identity、chief complaint | intake 单元、症状流程、组件适配 |
| 2 | 评估 | assessment、motion、muscle tension、patella、special test | assessment 单元、评估轨迹、组件适配 |
| 3 | 处理与复测 | candidate、treatment、trial、retest、ledger | 处理复测单元、队列轨迹、变异 |
| 4 | 训练、总结与后续 | training、followup、home relaxation、next session、adverse | 训练后续单元、完整轨迹、组件适配 |

每个切片内部顺序固定为：组件边界特征测试 → 提取组件 → 迁移该切片领域文件和测试 → 更新 import → 运行该切片 L2-L4 → typecheck → build。完成一个切片后才进入下一个。

目标组件：

```text
src/features/rehabmind/components/stages/symptom-stage.tsx
src/features/rehabmind/components/stages/confirmation-stage.tsx
src/features/rehabmind/components/stages/assessment-stage.tsx
src/features/rehabmind/components/stages/treatment-retest-stage.tsx
src/features/rehabmind/components/stages/training-stage.tsx
src/features/rehabmind/components/stages/summary-stage.tsx
```

各切片需要时同步移动：

| 当前文件 | 目标目录 |
| --- | --- |
| `rehabmind-onboarding.tsx` | `components/onboarding/` |
| `pilot-consent-gate.tsx` | `components/onboarding/` |
| `pilot-conflict-panel.tsx` | `components/feedback/` 或 `components/shared/` |
| 两个 location picker | `components/assessment/` |
| `stage-outcome-sections.tsx`、`next-session-card.tsx` | `components/stages/shared/` |
| `ui-primitives.tsx` | `components/shared/` |
| `use-function-retest.ts`、`use-training-flow.ts` | `controllers/` |
| feature 样式 | `styles/` |

每次只拆一个阶段或迁移一个领域文件组。行为提取提交与纯路径移动提交仍然分开；禁止在同一提交重做视觉、文案和业务规则。

退出条件：组件只接收数据和事件回调；不直接保存、访问 repository 或决定下一阶段；组件、流程、typecheck、build 和 1 条目标界面验收通过。

#### B1 领域文件映射清单

以下文件组随对应垂直切片迁移，不再作为拆完 UI 之后的独立阶段：

| 顺序 | 目标目录 | 当前文件组 |
| --- | --- | --- |
| 1 | `domain/rehab/intake/` | `intake-*`、`chief-complaint-*`、`chief-action-*`、`action-identity-*` |
| 2 | `domain/rehab/assessment/` | `assessment-*`、`function-assessment-*`、`motion-assessment-*`、`muscle-tension-*`、`patella-*` |
| 3 | `domain/rehab/treatment/` | `candidate-*`、`build-trial-targets-*`、`treatment-*`、`trial-*` |
| 4 | `domain/rehab/retest/` | `retest-*`、`function-retest-*`、`chief-retest-*`、`batch-retest-*` |
| 5 | `domain/rehab/training/`、`followup/` | `training-*`、`home-relaxation-*`、`followup-*`、`next-session-*`、`adverse-response-*` |
| 6 | `domain/rehab/safety/`、`shared/` | `tissue-pathway-*`、`special-test-trigger-*`、`problem-ledger-*`、`finding-groups-*`、`bilateral-flow-*` |

知识数据另迁入 `src/knowledge/pilot/`：`pilot-knowledge.ts`、`pilot-motion-muscle-knowledge.ts`、`full-demo-content.ts`、`first-batch-modules.ts` 和区域数据。

每组的纯移动提交执行：`git mv` → AST 更新 import → 同批迁移对应测试 → `rg` 查旧路径 → 领域测试 → 相关 workflow → 变异 → typecheck → build。

退出条件：`src/domain` 没有运行环境依赖；每个目录有清楚职责，不产生新的循环依赖。

#### 步骤 B2 至 B4：分别整理 db、测试和脚本

**预计时间**：2 至 4 天，与整改批次 7 至 8 同步。

三个责任边界不得放进同一提交：

1. **B2 数据库目录**：在 DB-01、schema 和 migration 行为已经通过后，将 Repository 接口、SQLite 实现和 schema 分别迁入 `db/repository/`、`db/sqlite/` 和 `db/schema/`；同步更新 drizzle 配置。
2. **B3 测试目录**：先让测试运行器支持递归发现，再迁入 `unit/domain`、`workflow`、`component`、`integration/sqlite-api`；`tests/integration/d1` 更名时同步修改 package scripts 和文档。
3. **B4 脚本目录**：先完成发布与质量脚本整改，再迁入 `quality/deploy/data/docs/legacy-browser`；正式命令只引用新路径，历史脚本不进入发布门禁。

退出条件：从干净检出运行所有正式命令成功；旧 `d1` 测试名称和旧脚本路径没有运行引用。

#### 步骤 B5：整理文档和静态资产

**预计时间**：1 至 3 天，动作图片不包含在当前工期。

执行：

1. 四份正式文档和 `docs/README.md` 保留在 docs 根目录。
2. 当前计划迁入 `plans/` 前，先让所有引用使用可批量验证的 Markdown 链接检查器。
3. 质量登记、测试和报告进入 `quality/`；部署运行手册进入 `operations/`；会话交接进入 `handover/`；原始资料进入 `research/`。
4. 移动后运行全量 Markdown 本地链接检查。
5. public 图片先建立 `asset-manifest`，记录逻辑 ID、URL、用途和版本；动作图片生成与审核完成后再移动。
6. 修改图片 URL 时同步验证 nginx、构建、页面资源和视觉基线。

退出条件：文档中心仍是唯一入口；内部链接无断链；生产静态资源无 404。

#### 步骤 B6：结构收口

**预计时间**：0.5 至 1 天。

执行：

1. 扫描 `app/`，确认只保留路由约定文件和暂时无法迁移的明确例外。
2. 扫描相对 import、循环依赖、旧路径、D1 名称和根目录临时输出。
3. 运行 L0-L5、最小浏览器接线、VPS canary 和发布健康检查。
4. 更新根 README、目录 README、项目状态和质量登记。
5. 将 `STRUCT-01` 从“待验证”改为“已通过”，并保存当前目录树证据。

退出条件：新文件有明确落点，旧文件不存在无主目录，所有正式开发和发布入口可被新接手者找到并执行。

当前状态（2026-08-24）：B0-B6 已全部完成。六个阶段均已按视图状态/事件合同提取，阶段不直接依赖领域、基础设施、数据库或路由；`check:structure`、`check:boundaries`、循环、完整快速测试、变异、SQLite/API 和最小浏览器接线均通过。生产仍保持上一版本，是否执行 canary 和部署取决于 A7 人工任务，不由结构完成自动触发。详细证据见 [B0-B6 仓库结构治理验收记录](../quality/b0-b6-structure-governance-2026-08-24.md)。

## 7. 每项整改统一工作流

每个编号严格执行：

```text
确认设计依据
→ 在规则/状态转换矩阵登记合法出口、禁止出口和副作用
→ 建立失败复现
→ 证明测试会红且实际命中目标规则/转换
→ 小范围修改生产实现并独立提交
→ 定向测试
→ 相关 L2/L3/L4/L5 回归
→ 行为稳定后以独立 chore 提交移动文件和更新 import
→ 再次执行目标测试、typecheck 和 build
→ 必要时执行 1 条目标浏览器验收
→ 更新证据和整改状态
```

禁止：

- 先改代码再按新实现写断言；
- 用源码中存在某字符串作为规则通过证据；
- 用 mock repository 替代 SQLite 后宣称数据链路通过；
- 只让编排器和 API 分别通过，却没有执行保存、落库、恢复和继续流程；
- 用页面到达总结页代替中间状态和禁止出口断言；
- 用成对组合代替 P0 复合门禁的条件独立性测试；
- 使用页面无法产生或未经 schema 校验的夹具证明正常流程；
- 测试没有命中目标规则或转换却仍登记为覆盖；
- 用旧报告补当前版本缺失的测试；
- 将多个高风险数据迁移和 UI 重构混在同一次提交；
- 将行为修复和大批量文件移动混在同一次提交；
- 为通过测试在测试目录复制生产业务规则。

## 8. 完成定义

一个整改编号只有满足以下全部条件才能标记“已通过”：

1. 有正式规则、安全约束或数据合同作为预期来源；
2. 有能在错误实现上失败的复现；
3. 规则/状态转换矩阵登记了生产入口、合法出口、禁止出口、状态副作用和实际命中证据；
4. 生产实现已修改，页面和测试使用同一入口且没有双份逻辑；
5. 正向、反向、实际转换、最终状态、命令和必要记录断言通过；
6. P0 复合门禁完成 MC/DC 或等效条件独立性测试，关键项的定向变异能被捕获；
7. 正常夹具通过生产 schema，并能由公开业务事件或明确迁移建立；
8. 涉及跨层行为时，通过生产编排器、service、HTTP、真实 SQLite、重新读取和恢复的纵向验证；
9. 数据变更通过真实 SQLite、事务中断和 migration 验证；
10. 用户可见变化完成页面适配器组件合同；涉及布局、文案理解或视觉时再完成人工任务验收；
11. 软件引用一致性通过，且没有将其表述成独立临床审核；
12. 证据绑定 `commitSha/buildId/appVersion/ruleVersion/schemaVersion`；
13. 日志、告警和测试产物不包含真实健康信息或凭据；
14. 质量登记、覆盖矩阵和状态文档同步更新；
15. 有明确回退方式；
16. 没有新增未解释的控制台错误、lint 错误或依赖风险；
17. 文件发生迁移时，旧运行路径、package scripts、部署脚本和文档引用已同步清理。

## 9. 粉丝群开放门槛

开放前必须满足：

- `CASE-01/AUDIT-03/AUDIT-04/FEED-02/SCHEMA-01/SYNC-01/DB-01/INVITE-01/SEC-02/REL-03/TEST-14/TEST-15/TEST-16/TEST-17/TEST-18/TEST-19` 全部通过；
- `OPS-03/KNOW-01` 达到试用范围内的退出条件；
- 当前版本 L0-L5 全部通过；
- P0 状态转换矩阵无未说明空白，复合门禁条件独立性和关键变异通过；
- 至少一条完整首诊到保存、SQLite 恢复、后续康复的纵向轨迹通过；
- 最小浏览器集合通过一次，不要求重复三轮；
- 完成一次人工任务式验收；
- SQLite 备份与恢复演练通过；
- 管理员可以根据案例编号定位完整记录和反馈；
- 邀请可撤销，公开案例编号不能读取或修改数据；
- 当前版本、规则版本和 schema 版本可从后台记录中回读；
- 日志脱敏、安全响应头和磁盘/内存监控有效；
- 未完成项有明确风险说明，不使用“全部质量已验证”等过度表述。

不要求在首轮粉丝群开放前完成：

- 主组件所有 JSX 全部拆完；
- 完整专业管理平台；
- 动作图片全部替换；
- 新身体部位；
- 账户、支付和消息提醒；
- 独立临床内容审核。

## 10. 工作量和时间安排

| 范围 | 有效工作量 | 单人连续执行 |
| --- | --- | --- |
| 粉丝群开放所需 A0-A7 | 85 至 135 小时 | 14 至 22 个工作日 |
| 全部当前优化计划，含 B0-B6 目录治理 | 145 至 230 小时 | 24 至 36 个工作日 |

建议节奏：

| 时间 | 主要批次 |
| --- | --- |
| 第 1 至 3 天 | 基线、登记、历史缺陷失败测试、第一版规则和状态转换矩阵 |
| 第 4 至 7 天 | 原地修复案例、事件、反馈、快照和安全 P0 |
| 第 8 至 13 天 | 建立依赖边界，提取正式编排器，完成 P0 决策表和页面适配器合同 |
| 第 14 至 18 天 | 同步状态机、schema、SQLite/API、纵向恢复流水线、邀请和管理闭环 |
| 第 19 至 22 天 | 测试证据收口、运行时不变量、安全、备份、canary 和发布验收 |
| 第 23 至 26 天 | 纯迁移已经稳定的案例、反馈和同步基础设施 |
| 第 27 至 33 天 | 按垂直切片拆主组件并迁移对应领域文件 |
| 第 34 至 36 天 | db、测试、脚本、文档分类收口和完整复盘 |

目录迁移与功能整改同步进行，因此不是把两份计划的工时简单相加。新增工时主要来自 P0 决策表、页面适配器合同、纵向 SQLite 流水线、夹具治理和试用期不变量监测。工期不包含 public 动作图片迁移、独立临床审核、新范围开发和真实用户观察周期。主要不确定性来自主组件隐式状态、历史快照格式、异步竞态、旧测试可能继续暴露的新缺陷，以及历史脚本对旧路径的隐藏依赖。

## 11. 阶段检查点

### 检查点 A：允许开始改生产流程

- 基线已固定；
- 历史缺陷测试会失败；
- 正式规则和安全预期可定位；
- P0 规则已经进入第一版状态转换/决策矩阵；
- 正常夹具通过生产 schema，目标测试能够证明实际分支命中；
- 数据备份可恢复。

### 检查点 B：允许开始改 SQLite/API

- 案例和记录身份已稳定；
- 流程编排器能够产生保存命令和事件；
- 页面和测试使用同一个生产编排入口；
- schema 和 migration 方案已书面确认。

### 检查点 C：允许拆页面

- 生产流程轨迹通过；
- P0 决策表、条件独立性和页面适配器合同通过；
- 同步和反馈控制器通过竞态测试；
- 页面拆分不会同时改变业务规则。
- 新阶段组件直接进入 `src/features/rehabmind/` 目标目录，不继续扩张 `app/` 平铺文件。

### 检查点 D：允许部署

- 当前提交 L0-L5 全绿；
- 纵向首诊、SQLite 恢复和后续康复轨迹通过；
- 数据备份可读取；
- 发布版本唯一；
- 回滚兼容性已确认。

### 检查点 E：允许开放粉丝群

- 第 9 节门槛全部满足；
- 试用批次、负责人、反馈入口和暂停条件明确；
- 当前未完成项已如实告知，不扩大产品承诺。

## 12. 执行记录模板

每个整改提交或工作日使用以下模板：

```text
日期：
当前 commit：
整改编号：
设计依据：
错误复现：
修改文件：
生产行为变化：
运行测试层：
未运行测试层：
命中规则/状态转换：
纵向流水线结果：
变异结果：
夹具/规则/schema 版本：
数据迁移/回退：
证据目录：
剩余风险：
下一步：
```

此模板用于防止“代码已经改了，但没有证据、状态和交接说明”的情况再次出现。
