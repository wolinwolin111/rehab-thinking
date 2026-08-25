# B0-B6 仓库结构治理验收记录

> 日期：2026-08-24
> 范围：只调整物理边界、导入、测试发现和结构门禁；不修改 UX-DENSITY-01，不替换动作图片，不进行临床内容审核。
> 结论：B0-B6 已全部完成，`ARCH-01 / STRUCT-01` 的本轮结构目标已通过。生产仍保持上一已验证版本，粉丝群开放继续受 A7 人工任务阻塞。

## 1. 分批结果

| 批次 | 状态 | 当前证据 |
| --- | --- | --- |
| B0 稳定基础设施 | 已完成 | 案例、同步、反馈、邀请、版本和同意迁入 `src/infrastructure/pilot/`；领域规则迁入 `src/domain/rehab/`；知识迁入 `src/knowledge/pilot/`；旧运行路径无引用。 |
| B1 UI 与领域切片 | 已完成 | 六个阶段均为真实类型组件，只接收视图状态和事件合同；主工作台由约 8750 行降至 5023 行，另有 2035 行 support。展示层通过 `stage-domain-adapters.ts` 使用领域词汇，不直接依赖领域、数据库或基础设施。 |
| B2 数据库目录 | 已完成 | Repository、SQLite 和 schema 分别位于 `db/repository/`、`db/sqlite/`、`db/schema/`；Drizzle 和生产引用已更新。 |
| B3 测试目录 | 已完成 | 测试按 `unit/domain`、`unit/infrastructure`、`unit/quality`、`workflow`、`component`、`integration/sqlite-api` 分类；Node 运行器递归发现 117 个测试文件。 |
| B4 脚本目录 | 已完成 | 正式脚本进入 `quality/deploy/data/docs`；旧浏览器走读进入 `legacy-browser`，不计发布门禁。 |
| B5 文档与资产 | 已完成 | docs 根目录只保留 README 和四份正式规则；其他资料分类；88 份 Markdown 链接通过；41 个 PNG 全部登记在 asset manifest。动作图仍标记为待替换。 |
| B6 结构收口 | 已完成 | app 只保留路由文件；无模块循环；根临时产物已归档；README、文档和自动结构守卫已更新；严格结构与架构边界门禁均通过。 |

## 2. 结构门禁

新增：

- `npm run check:cycles`：扫描 `app/src/db` 的模块环；当前 141 个文件无循环。
- `npm run check:structure`：检查 app 路由白名单、docs/tests 根目录、旧路径、根临时产物、工作台体积和六个阶段组件。
- `npm run check:docs`：验证 Markdown 本地链接。
- `npm run check:assets`：验证 public 图片与 asset manifest 一一对应。

`check:structure` 当前通过：六个阶段均无 `ReactNode`/`children` 透传，工作台为 5023 行。`check:boundaries` 同时约束阶段组件不得直接导入 `src/domain`、`src/infrastructure`、`app` 或 `db`；领域展示适配统一由 `stage-domain-adapters.ts` 承担。

## 3. 当前验证

- `npm run check:cycles`：通过，141 个文件无循环。
- `npm run check:docs`：通过，88 个 Markdown 文件无断链。
- `npm run check:assets`：通过，41 个 PNG 全部有 manifest 条目。
- `npm run typecheck`：通过。
- `npm run lint`：0 errors、0 warnings。
- `npm run test:fast`：117 个测试文件、627/627 通过，包含边界、typecheck 和 build。
- `npm run test:component`：49/49 通过。
- `npm run test:logic:mutations`：36/36 killed。
- `npm run test:integration`：14/14 通过。
- `npm run test:browser:release`：当前本地版本最小页面接线 6/6 通过，未运行浏览器业务组合走读。
- `npm run build`：通过；仍有客户端 chunk 大于 500KB 的既有警告。

源码接线测试统一通过 `tests/support/read-rehabmind-ui-source.mjs` 读取当前 UI 模块集合。该类测试只证明组件文案和接线存在，不计作业务规则正确性；业务规则仍以生产函数、工作流轨迹、变异和 SQLite/API 为证据。

## 4. 未执行项

- 未部署本轮结构改动，生产环境保持上一已验证版本。
- 未运行 VPS canary 或发布健康检查；结构门禁已通过，但本轮仍未获准部署，生产保持上一已验证版本。
- 动作图片只建立 manifest，没有移动、替换或审核素材。
- 临床内容审核按产品决定暂缓；知识一致性测试不代表临床正确性审核。

## 5. 后续顺序

1. 讨论并整改已记录的 `UX-DENSITY-01`，重做受影响的人工任务验收。
2. 人工任务通过后，再按发布手册执行 VPS canary、健康检查和本轮部署。
3. 动作图片继续按独立素材批次处理，不与本轮结构治理混合。
4. 5023 行工作台仍可在后续按 controller/view-model 继续缩小，但不再是本轮 `STRUCT-01` 红灯。
