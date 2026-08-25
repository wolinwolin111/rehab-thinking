# `app` 目录导航

`app/` 只保留 vinext 路由约定文件。产品实现已经迁入 `src/`，不要把领域规则、服务或复用组件放回路由目录。

## 页面路由

- `page.tsx`：RehabMind 工作台入口。
- `admin/page.tsx`：试用管理后台入口。
- `decision-lab/page.tsx`：受保护的决策实验页入口。
- `layout.tsx`、`globals.css`：应用布局和全局样式入口。

## API 路由

- `api/pilot/cases/`：案例创建、读取、保存和反馈。
- `api/pilot/trial-events/`：试用运营事件。
- `api/pilot/admin/`：管理员会话、案例、指标和物理清除。
- `api/pilot/_shared.ts`：仅供 route handler 使用的请求级公共适配。

## 实现位置

- 页面组件：`src/features/rehabmind/components/`
- 页面控制器与工作流适配：`src/features/rehabmind/controllers/`、`src/features/rehabmind/workflow/`
- 领域规则：`src/domain/rehab/`
- 产品知识：`src/knowledge/pilot/`
- API、持久化、反馈和管理服务：`src/infrastructure/pilot/`
- Repository 与 SQLite：`db/`

依赖方向和迁移状态见[仓库结构整理方案](../docs/plans/repository-structure-refactor-plan.md)及[当前整改执行方案](../docs/plans/rehabmind-current-remediation-execution-plan.md)。
