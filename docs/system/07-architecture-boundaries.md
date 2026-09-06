# 07 · 架构边界与质量门禁（Boundaries & Gates）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 事实来源：`scripts/quality/`、`scripts/knowledge/`、package.json scripts 实测
> 本文是"什么代码放哪里、什么不许发生、怎么自动拦截"的唯一完整定义。历史治理过程（A0-A7/B0-B6）见 archive。

## 1. 分层与依赖方向

```
app/（路由壳） ──▶ features/rehabmind（UI+编排） ──▶ domain/rehab（纯决策）
                                        │                └──▶ knowledge/actions（内容，白名单 index/bridge/custom）
                                        └──▶ knowledge/pilot（区域装配）＋ knowledge/rehab（P0/P1 证据链）
infrastructure/pilot（持久化/API） ◀── features；domain 禁止反向依赖 features/infrastructure
```

## 2. 边界规则（architecture-boundaries.json，check-architecture-boundaries.mjs AST 检查）

| 规则 | 范围 | 禁止 |
|---|---|---|
| domain 边界 | src/domain | import react/next；import app/db/src-features/src-infrastructure；使用 fetch/localStorage/sessionStorage/indexedDB/window/document/navigator |
| stage 边界 | …/components/stages | import drizzle-orm/better-sqlite3；import app/db/src-domain/src-infrastructure；使用 fetch/localStorage/sessionStorage/indexedDB |
| action-catalog | src/knowledge/actions | 目录内禁止 import 消费方；domain 只能经 index/bridge/custom 导入 |
| ARCH-02-WORKFLOW-OWNER | 独占 workflow-orchestrator.ts | workbench 内不得重复实现 resolveTreatmentQueueAdvance( / resolveDynamicQueueAdvanceForTargets( / resolveTrainingStageGate( / treatmentComplete 判定 |
| ARCH-A5-SYNC-OWNERS | 独占 sync-core.ts | workbench 内不得出现 pilotSaveQueuesRef、setPilotSyncState("syncing"/"synced"/"conflict") |

违反输出 `文件:行号 [boundary/code]` 且退出码 1。**当前已知预存违规 4 条**（stage 文件 import domain，`4fd593b` 08-28 引入，测试回归期间由测试侧与开发共同消化，见 08 未决项）。

## 3. 质量门禁总表（package.json scripts）

| 组 | 门禁 | 拦什么 |
|---|---|---|
| check: | boundaries / cycles / structure / docs / assets / knowledge / catalog | 边界与独占所有者；模块环；app 仅路由文件＋docs 根形态＋tests 形态；markdown 死链；部署资产；膝知识包一致性＋P1 覆盖；**内容目录 13 类规则码＋golden 68 条逐字** |
| test: | unit / workflow / component / security | 分层逻辑测试（node --test） |
| test:logic:* | retest / queue / ledger / mutations | 领域专测＋**变异测试**（对 orchestrator/决策核心注入突变，验证 P0 决策表不被破坏） |
| test:integration / vertical / http:live | SQLite API 纵切 | 服务端校验/幂等/恢复 |
| test:browser:* | target / p0 / full / release / overall / mobile-preview / firefox-risk / visual / explore | Playwright 分层矩阵 |
| test:performance | build 产物预算 | JS 单包 1MB/总 4MB、CSS 256KB |
| test:dependencies | npm audit（omit=dev） | 生产依赖零高危 |
| test:sqlite:health / migrations:compat | 数据健康 | — |
| test:summary / release | quality-summary / run-quality-gates | A7 门禁编排＋manifest 身份（release.generated.ts 指纹） |
| data:v3:reset(:apply) | 审计→执行 | WAL checkpoint＋备份后清运行表 |

## 4. 发布指纹与证据

- release-fingerprint-core：发布指纹**排除**文档与质量报告（不参与运行时身份）。
- quality-run-identity：release.generated.ts＋schema version 组装运行身份；quality-evidence-core 做清单/身份比对与场景 gate 评估。
- inspect-local：HTTP/API/SSR 巡检＋`--visual` 视口溢出＋`--axe` 无障碍。
- 每个真实缺陷必须新增一个带编号的系统场景或不变量（先补测试→修码→全量重跑）——SYS-* 编号体系见 02 §13。

## 5. 开发/测试文件权属（B 类边界）

| 属主 | 文件 |
|---|---|
| dev（可改） | src/**、docs/system/**、docs/handover/test-notice-*、docs/plans/*、scripts（除 B 类列名外） |
| 测试（dev 不碰） | tests/**、docs/quality/**、release.generated.ts、artifacts/、scripts/quality/inspect-local.mjs、docs/handover/test-session-handoff-* |

规则来源：批次 1（2026-09-04）owner 确立；批次 7 落地 boundaries 防再发。例外协调（如阶段文件违规消化）走通知档。
