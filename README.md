# RehabMind

RehabMind 是悦舒运动康复的确定性运动康复思路辅助工具。它通过固定、可追踪的产品规则组织症状信息、评估、处理、复测、训练和后续康复记录，不使用 AI 生成康复决策，也不替代诊断或线下医疗检查。

## 当前范围

- 正式范围：桌面网页、320 至 430px 手机网页、单一主要问题、大腿至足部入口、膝和踝足功能、首次与后续康复。
- 当前模式：自助康复、康复思路·自己、康复思路·别人；案例学习模式本期不开放。
- Android 交付：手机网页与 VPS 验收通过后构建并开放 WebView APK；APK 与网页共用同一业务实现。
- 暂不开放：多主诉联合处理、骨盆和上肢、语言或视觉 AI、服务端账户、支付和额外原生能力。
- 生产入口：`https://66.154.101.204/RehabMind/`。
- Android 外壳：[`mobile/rehabmind-mobile`](./mobile/rehabmind-mobile/README.md)，Debug 先连本地手机网页，Release 再注入正式 HTTPS 域名。

## 文档入口

- [文档中心](./docs/README.md)：正式产品、决策和场景文档的唯一索引。
- [项目状态](./docs/handover/project-status.md)：当前技术栈、部署和已知限制。
- [当前整改执行方案](./docs/plans/rehabmind-current-remediation-execution-plan.md)：现行整改顺序、测试、发布和开放门槛。
- [仓库结构整理方案](./docs/plans/repository-structure-refactor-plan.md)：目标目录、依赖边界和迁移批次。

## 当前目录

| 目录 | 职责 | 说明 |
| --- | --- | --- |
| `app/` | 页面和 API 路由约定文件 | 产品实现不得放回路由目录 |
| `src/domain/` | 康复领域规则和工作流状态转换 | 不依赖 React、网络、存储或数据库 |
| `src/features/` | RehabMind 页面、控制器和展示工作流 | 六个阶段视图已提取，主工作台负责装配与状态协调 |
| `src/infrastructure/` | API 客户端、持久化、服务、管理和遥测 | 适配运行环境和外部边界 |
| `src/knowledge/` | 首发知识数据与一致性检查 | 软件一致性不等同于临床审核 |
| `db/` | Repository、SQLite 实现和 schema | 已按 `repository/sqlite/schema` 分类 |
| `drizzle/` | 只向前执行的数据库 migration | 不修改已经发布的 migration |
| `tests/` | 单元、流程、集成和浏览器测试 | 具体分类见 `tests/README.md` |
| `scripts/` | 质量、发布、数据构建和历史浏览器脚本 | 具体分类见 `scripts/README.md` |
| `public/` | 生产静态图片和站点资源 | 图片迁移需同步修改 URL 和 nginx |
| `docs/` | 正式规则、整改、状态、研究和交接文档 | 正式规则优先级见文档中心 |
| `artifacts/` | 自动化测试与质量证据 | 不作为源代码，证据必须绑定构建版本 |

当前唯一运行与发布路径为 VPS + Node.js + SQLite。Cloudflare Worker、D1、Wrangler 和旧 Sites 打包入口已经退出当前代码，不再作为开发、测试或部署前提。

## 本地开发

要求 Node.js `>=22.13.0`。

```bash
npm ci
npm run dev
```

默认本地地址由 vinext 输出；当前常用开发入口为 `http://localhost:3000`。

## 常用验证

```bash
npm run typecheck
npm run lint
npm run build
npm run test:unit
npm run test:logic:mutations
npm run test:integration
npm run test:release
npm run test:summary
```

`npm run test:fast` 包含边界、typecheck、build 和 L0-L4 测试，但不代表 SQLite/API、部署或人工任务通过。`npm run test:release` 运行当前自动化发布门禁，`npm run test:summary` 再核对绑定当前 buildId 的 L0-L7 与人工证据。

## 开发约束

1. 产品和决策预期来自四份正式文档，不从现有代码输出反推规则。
2. 页面只收集用户意图和展示结果，流程决策逐步迁入正式生产编排器。
3. 领域核心不能依赖 React、DOM、网络、SQLite 或浏览器存储。
4. 案例、康复记录、事件、请求和 revision 必须显式传递，不从全局数组猜测。
5. 新缺陷先建立会失败的复现，再修改实现。
6. 不提交管理员密钥、案例访问令牌或真实健康信息。
7. 结构调整必须保持行为不变，每批完成边界、类型、目标测试和构建验证。
