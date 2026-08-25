# RehabMind 当前项目状态

更新时间：2026-08-25

## 1. 当前结论

RehabMind 是悦舒运动康复的线上康复助手。它根据明确的康复规则记录用户问题、引导评估、安排后续康复与复测、形成训练和多次康复记录；系统不使用 AI 做康复决策。

当前代码已经完成 App 体验优化方案第 1 至第 10 步，本地实现、网页门禁、文档收口以及 VPS canary、迁移、健康和回滚往返均已通过。尚未完成 VPS 网页用户任务验收，也未创建 Android APK，因此当前状态是“VPS 网页候选版本”，不是“已开放试用版本”。

动作图片替换和独立临床内容审核按产品决定不在本轮范围内。

## 2. 当前运行架构

```text
网页 / 未来 Android WebView
        ↓
Node.js + vinext
        ↓
正式 route / service
        ↓
SQLite
```

唯一部署目标是 VPS `66.154.101.204`，使用 nginx、PM2、Node 和 SQLite。

以下方案已经退出当前路径：

- Cloudflare Worker、D1 和 Wrangler；
- workers.dev 预览环境；
- 邀请链接和邀请码创建门；
- 拒绝数据同意后继续使用的“仅本机模式”；
- 五步聚焦教程。

历史文档中出现这些内容只代表当时方案，不能作为当前操作指令。

## 3. 已完成的本地批次

1. 固定 App 入口、移动体验、测试入口和数据字段合同；
2. 构建链切换为纯 Node/VPS，并清理 Cloudflare、D1、Wrangler 运行依赖；
3. 取消邀请门，改为来源渠道、数据同意和匿名案例创建；
4. 建立受保护测试工作台、测试案例隔离和按 runId 清理；
5. 重做产品价值页、来源、数据说明和问题描述入口；
6. 完成六阶段信息减负和就地一次性提示；
7. 完成移动顶部栏、阶段抽屉、本次记录底部抽屉、独立康复记录页和底部入口；
8. 完成本地生产构建、内部逻辑、SQLite/API 和最小网页验收。
9. 完成正式规范、测试计划、场景注册表、发布门禁和运维交接的当前口径收口。
10. 完成 VPS canary、SQLite 备份迁移、真实 HTTP 健康检查和上一版/当前版回滚往返。

## 4. 当前用户流程

```text
产品价值页
→ 选择来源渠道
→ 数据使用说明
→ 同意并创建匿名案例
→ 描述问题
→ 关键确认
→ 评估检查
→ 后续康复与复测
→ 康复训练
→ 康复总结
→ 后续康复
```

案例编号公开显示，但不能单独读取记录。当前设备保存独立访问凭证。一个案例可以包含多次康复；康复记录页按案例和康复次数分层展示。

## 5. 代码边界

- `src/domain/rehab/`：决策、队列、复测、安全和训练纯逻辑；
- `src/features/rehabmind/workflow/`：状态、事件、命令和 orchestrator；
- `src/features/rehabmind/components/stages/`：六个阶段视图；
- `src/features/rehabmind/components/navigation/`：移动端导航展示与纯状态映射；
- `src/features/rehabmind/components/records/`：独立康复记录页；
- `src/infrastructure/pilot/`：案例、同意、来源、同步、反馈、管理和持久化；
- `db/sqlite/` 与 `drizzle/`：SQLite repository 和向前迁移；
- `app/api/pilot/`：HTTP 边界；
- `tests/`：unit、workflow、component、integration、browser 分层。

主工作台当前约 5235 行，继续承担状态协调、持久化和流程命令。六阶段视图、移动导航和康复记录已提取；本轮不做一次性大重构。新增展示组件只接收数据和回调，不拥有业务决策。

## 6. 当前测试基线

| 门禁 | 结果 |
| --- | --- |
| `npm run test:fast` | 通过；123 个测试文件、架构边界、typecheck、build |
| `npm run test:integration` | 15/15 |
| `npm run test:migrations:compat` | 9 个 migration，问题 0 |
| `npm run test:sqlite:health` | integrity `ok`、外键失败 0、缺表 0 |
| `npm run lint` | 0 error、0 warning |
| `npm run test:browser:release` | 4/4，约 19 秒 |

当前浏览器门禁只检查入口、刷新恢复、反馈、移动布局和管理员拒绝访问，不承担评估/处理组合穷举。内部业务由生产纯函数、决策表、orchestrator 轨迹、状态探索、定向变异和 SQLite 纵向集成负责。

本轮最小浏览器测试实际发现并修复：

- 手机提示遮挡“查看阶段”；
- 已创建案例存在时刷新不恢复本机草稿；
- 未操作状态误显示为“已保存”；
- 后加载主题覆盖新手机安全区域和旧横向布局。

## 7. 尚未完成

### 开放粉丝群前必须完成

1. 在 VPS 网页进行一次人工任务验收：产品价值、信息密度、保存恢复、案例编号/反馈和手机布局；
2. 人工确认通过后再建立 `rehabmind-mobile` WebView 外壳、签名和构建；
3. APK 只验收安装、启动、系统返回、断网、软键盘、外链和版本标识。

## 8. 当前非阻塞范围

- 动作图片生成、授权和动作准确性审核；
- 独立临床内容审核；
- 多关节、上肢、脊柱和骨盆入口；
- 账号体系和跨设备恢复码；
- 大规模浏览器业务分支走读。

“非阻塞”不等于“已完成”。动作图片交付后仍需单独验收并接入。

## 9. 下一执行顺序

```text
VPS 网页人工任务
→ 产品确认
→ Android WebView APK
→ APK 专项验收
→ 粉丝群小范围开放
```

网页未确认前不得提前构建 APK。

## 10. 事实来源

- 当前施工顺序：[App 入口、移动体验与测试效率优化方案](../plans/rehabmind-app-experience-optimization-plan.md)
- 当前测试方法：[当前测试计划](../quality/rehabmind-test-plan.md)
- 本地验收：[App 体验本地网页验收](../quality/app-experience-local-acceptance-2026-08-25.md)
- VPS 操作：[试用发布执行手册](../operations/pilot-release-readiness-execution-runbook.md)
- 产品与规则：[完整产品设计](../rehabmind-complete-product-design.md)、[膝踝知识库](../knee-ankle-pilot-knowledge.md)
