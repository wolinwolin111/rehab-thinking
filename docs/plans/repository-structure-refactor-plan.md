# RehabMind 仓库结构整理方案

> 状态：已完成。B0-B6 全部通过（2026-08-24）；生产是否部署由 A7 人工任务与发布门禁另行决定。
> 日期：2026-08-23
> 原则：先建立边界，再移动文件；新代码直接进入目标目录，旧代码按整改批次迁移。

> 执行顺序说明：本文中的 A-G 用于描述结构任务类别，不代表实际施工先后。最终施工分为“先达到小范围试用标准的 A0-A7”和“再完成全面结构治理的 B0-B6”，以[当前整改优化执行方案中的具体执行计划](./rehabmind-current-remediation-execution-plan.md#仓库结构具体执行计划)为准。已知 P0 必须先写失败测试并在原路径修复，行为稳定后才允许单独移动文件。

## 1. 当前问题

当前仓库的“乱”来自不同问题，不能用一次批量移动解决：

1. 仓库根目录存在约 159 个被 Git 忽略的截图、日志、探查脚本和发布压缩包，约 149MB。
2. `app/` 根目录平铺约 103 个源码和样式文件，路由、UI、领域核心、同步和服务层混在一起。
3. `tests/` 有 102 个文件，大量单元测试平铺，且 SQLite 集成仍使用 `d1` 历史目录名。
4. `scripts/` 有 49 个脚本，正式质量工具、VPS 发布、数据构建和历史浏览器走读没有目录边界。
5. `docs/` 根目录同时放正式规则、当前状态、整改方案、研究资料、会话和交接材料。
6. 根 README 仍是 vinext starter 说明，无法帮助接手者理解项目。
7. 源码和测试约有 484 处相对路径引用，一次全量搬迁会产生高风险机械修改。

## 2. 目标目录

```text
rehab-thinking-demo/
├── app/                         # vinext 路由层，只保留路由约定文件
│   ├── api/
│   ├── decision-lab/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── src/
│   ├── features/rehabmind/
│   │   ├── components/
│   │   │   ├── stages/
│   │   │   ├── feedback/
│   │   │   ├── onboarding/
│   │   │   └── shared/
│   │   ├── controllers/
│   │   ├── workflow/
│   │   └── styles/
│   ├── domain/rehab/
│   │   ├── intake/
│   │   ├── assessment/
│   │   ├── treatment/
│   │   ├── retest/
│   │   ├── training/
│   │   ├── followup/
│   │   ├── safety/
│   │   └── shared/
│   ├── knowledge/pilot/
│   └── infrastructure/pilot/
│       ├── api/
│       ├── persistence/
│       ├── feedback/
│       ├── invite/
│       └── release/
├── db/
│   ├── repository/
│   ├── sqlite/
│   └── schema/
├── tests/
│   ├── unit/domain/
│   ├── workflow/
│   ├── component/
│   ├── integration/sqlite-api/
│   ├── browser/
│   └── fixtures/
├── scripts/
│   ├── quality/
│   ├── deploy/
│   ├── data/
│   ├── docs/
│   └── legacy-browser/
├── public/
│   └── assets/
│       ├── brand/
│       ├── anatomy/
│       └── rehab-actions/
├── docs/
│   ├── README.md
│   ├── <四份正式文档>
│   ├── plans/
│   ├── quality/
│   ├── operations/
│   ├── handover/
│   ├── research/
│   └── archive/
└── artifacts/                  # 构建和测试证据，不参与源码依赖
```

目录是责任边界，不是文件数量配额。只有一个文件时可以暂时留在上级目录，不创建无意义的多层文件夹。

## 3. 依赖方向

```text
app routes
  → features/rehabmind
      → domain/rehab
      → knowledge/pilot
      → infrastructure/pilot
infrastructure/pilot
  → domain contracts
  → db repository
db
  → SQLite/Drizzle
```

禁止反向依赖：

- `domain` 不得导入 React、`app/`、数据库、HTTP 或浏览器存储；
- `knowledge` 不得导入页面组件；
- `db` 不得导入页面或康复流程；
- UI 组件不得直接导入 SQLite repository；
- API route 不得直接实现业务状态迁移；
- 测试夹具不得成为生产代码依赖。

新代码使用 `@/src/...`、`@/db/...` 绝对导入。迁移期间允许旧相对路径存在，但修改到的模块应顺手改成目标导入方式。

## 4. 文件分类规则

### 4.1 `domain/rehab`

放置不依赖运行环境的康复领域纯函数、类型和不变量。例如评估答案、处理队列、复测身份、训练门禁和后续康复趋势。

判断标准：给定同样输入始终得到同样输出，不读取 React state、系统时间、随机数、网络或存储。

### 4.2 `features/rehabmind`

放置产品特有的页面组件、流程控制器和工作流编排。它可以组合领域函数，但不直接操作 SQLite。

正式 `dispatchWorkflowEvent`、阶段组件和 React controllers 都属于此目录。

### 4.3 `knowledge/pilot`

放置膝踝试点知识数据、动作映射和内容数据。规则来源仍由正式文档控制，目录移动不改变临床或产品含义。

### 4.4 `infrastructure/pilot`

放置 API client、本地存储、同步控制器、反馈、邀请、版本和外部适配器。此层执行流程命令，但不决定康复去向。

### 4.5 `db`

保留为服务端独立目录。Repository 接口、SQLite 实现和 schema 分目录后，API service 只能依赖接口，不依赖具体文件路径细节。

## 5. 迁移批次

### 批次 A：导航和根目录卫生

- 重写根 README；
- 增加 `app/tests/scripts` 导航；
- 所有新运行产物改写到 `.tmp/` 或 `artifacts/quality/<run-id>/`；
- 将未被当前文档引用的根目录临时文件归档进 `.tmp/root-legacy-<date>/`；
- 密钥不随普通产物移动或提交，由独立凭据管理流程处理。

验收：根目录只长期保留配置、入口 README、本地环境文件和少量明确的构建元数据。

### 批次 B：新流程核心直接进入目标目录

- 创建 `src/features/rehabmind/workflow/`；
- 将新 `WorkflowState/Event/Command/Orchestrator` 直接放入目标目录；
- 主组件通过绝对路径调用；
- 不先移动全部旧 core。

验收：不存在一份旧编排和一份新编排并行运行。

### 批次 C：同步和案例基础设施

- 迁移 `pilot-case-*`、`pilot-sync-*`、`local-case-*`、feedback、invite、release；
- service 和 API route 使用稳定出口文件；
- 移动后更新测试、package scripts 和 source-contract 测试。

验收：typecheck、同步竞态、SQLite/API 和构建通过。

### 批次 D：阶段 UI

- 按症状、确认、评估、处理复测、训练和总结拆组件；
- 将 pickers、onboarding、feedback 和 shared UI 放入明确子目录；
- 样式先按 feature 集中，不在同一批重做视觉。

验收：组件 props 清楚，页面没有业务规则副本，关键组件和最小浏览器接线通过。

### 批次 E：领域核心

按领域逐批移动，每批只移动一组：

1. intake；
2. assessment；
3. treatment；
4. retest；
5. training/followup；
6. safety/shared。

每批使用 TypeScript/AST 或 IDE rename 更新 import，不用全仓库盲目字符串替换。测试与生产文件在同一批迁移。

验收：该领域 typecheck、单元、变异、工作流和 build 通过后才进行下一领域。

### 批次 F：测试和脚本

- 将测试运行器改成递归发现后，再移动根目录单元测试；
- 将 D1 历史目录更名为 `sqlite-api`；
- 将脚本按 quality/deploy/data/docs/legacy-browser 分类；
- 更新 `package.json`、文档和脚本合同中的路径。

验收：所有正式命令从干净检出可运行，旧路径不存在隐藏依赖。

### 批次 G：文档和 public 资产

- 四份正式文档和 `docs/README.md` 保持文档根目录，避免权威入口变化；
- 整改、测试和执行方案迁入 `quality/` 或 `plans/`；
- 会话和交接迁入 `handover/`；
- 原始研究资料迁入 `research/`；
- public 图片只有在建立资产 manifest 后才移动，避免 URL、快照和 nginx 同时失效。

验收：内部 Markdown 链接、图片 URL、nginx 资源路径、浏览器快照和文档索引全部通过。

## 6. 每批完成定义

一次文件迁移必须同时满足：

1. 使用 `git mv` 或等价可追踪移动，避免删除后重新创建丢失历史；
2. 只迁移一个责任边界；
3. 导入路径使用稳定绝对别名；
4. 没有新增循环依赖；
5. typecheck、目标测试和 build 通过；
6. `rg` 确认旧路径没有残留运行引用；
7. package scripts、部署脚本和文档同步；
8. 不移动 `.env`、`.dev.vars`、访问令牌、数据库和备份；
9. 可通过单独提交回退该批次；
10. 目录 README 或文档中心同步更新。

## 7. 当前建议

稳定基础设施、领域、数据库、测试、脚本和文档已完成物理迁移，根目录与循环依赖已收口。症状、确认、评估、处理复测、训练、总结/后续康复六个阶段已完成真实提取；严格状态见[B0-B6 结构治理验收记录](../quality/b0-b6-structure-governance-2026-08-24.md)。

任务级文件映射、提交顺序、逐步测试和退出条件统一见[当前整改优化执行方案中的“仓库结构具体执行计划”](./rehabmind-current-remediation-execution-plan.md#仓库结构具体执行计划)。本文负责目标结构和分类规则，主整改文档负责实际施工顺序。

不建议当前直接执行以下动作：

- 一次移动 88 个 `app/*.ts`；
- 单独整理测试目录但不修改测试发现规则；
- 先移动 public 图片再逐个修补硬编码 URL；
- 删除 Cloudflare 历史目录而不先确认构建和部署引用；
- 把所有临时证据移动到会被 Git 跟踪的目录；
- 使用新的 `utils/`、`common/` 或 `misc/` 目录继续堆放无法归类的代码。
