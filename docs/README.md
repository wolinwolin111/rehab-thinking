# RehabMind 文档中心

当前规则只认以下四份正式文档。新增结论必须改进原章节，不在文件末尾追加“补充规范”或并列新版本。

| 正式文档 | 唯一职责 |
| --- | --- |
| [产品规范](./rehabmind-complete-product-design.md) | 产品范围、用户流程、页面和记录 |
| [决策引擎规范](./rehab-decision-framework.md) | 信息怎样转成检查、处理、复测和训练 |
| [膝踝首发知识库](./knee-ankle-pilot-knowledge.md) | 膝、踝、大腿和小腿的具体临床候选 |
| [首发场景验收](./pilot-scenario-coverage.md) | 必须通过的流程场景和回归条件 |

四份文档的优先级：冲突时依次按安全规则、决策规则、产品流程、临床内容和验收用例处理。

## 实现文件

| 模块 | 文件 |
| --- | --- |
| 页面流程 | `src/features/rehabmind/components/workbench/rehabmind-workbench.tsx` |
| 通用内容 | `src/knowledge/pilot/full-demo-content.ts` |
| 膝踝关系 | `src/knowledge/pilot/pilot-knowledge.ts` |
| 首发决策 | `src/domain/rehab/shared/pilot-decision-engine.ts` |
| 膝专项决策 | `src/domain/rehab/shared/knee-decision-core.ts` |
| 大腿/小腿局部决策 | `src/domain/rehab/shared/local-limb-decision-core.ts` |
| 主诉子句与否定解析 | `src/domain/rehab/intake/intake-complaint-core.ts` |
| 下次康复时间建议 | `src/domain/rehab/followup/next-session-recommendation-core.ts` |
| 桌面与移动样式 | `src/features/rehabmind/styles/complete-demo.css`、`src/features/rehabmind/styles/rm-visual-theme.css` |
| 移动导航 | `src/features/rehabmind/components/navigation/` |
| 康复记录 | `src/features/rehabmind/components/records/` |

## 支撑资料

- `rehabmind-rebuild/data/`：匿名病例、来源目录和结构模板。
- `rehabmind-rebuild/knowledge/`：可追溯关系、证据等级和审核状态。
- `rehabmind-rebuild/work/`：代码走读和实施记录，不重复定义正式规则。
- `rehabmind-rebuild/09-visual-assessment-plan.md`：视觉 AI 预留方案，当前不接入。
- `rehabmind-rebuild/10-knee-ankle-action-image-prompts.md` 与 `11-action-image-inventory.md`：动作图资产。
- `quality/real-browser-coverage-matrix.md`：设计规则、真实场景、当前证据和覆盖缺口矩阵，不定义新的产品规则。
- `quality/rehabmind-test-plan.md`：当前测试分层、组合场景、执行节奏和发布门槛总计划。
- `quality/rehabmind-quality-remediation-register.md`：设计、实现、测试与部署问题的整改编号、优先级、验收标准和状态。
- `plans/rehabmind-app-experience-optimization-plan.md`：当前施工主计划；网页第 1 至第 10 步和 VPS 发布已完成，VPS 人工任务验收与 Android APK 待执行。
- `plans/rehabmind-current-remediation-execution-plan.md`：A0-B6 历史结构与质量整改计划；冲突时不得覆盖当前 App 计划。
- `quality/app-experience-local-acceptance-2026-08-25.md`：当前本地网页实现、测试结果、实际发现的问题和证据边界。
- `quality/app-experience-vps-acceptance-2026-08-25.md`：当前 VPS canary、迁移、健康、回滚和发布缺陷证据。
- `handover/rehabmind-handover-2026-08-25.md`：2026-08-23 至 25 日工作、当前事实、未完成项和后续严格顺序的现行交接入口。
- `plans/repository-structure-refactor-plan.md`：仓库目标目录、依赖方向、文件分类规则和分批迁移顺序。
- `quality/b0-b6-structure-governance-2026-08-24.md`：本轮结构迁移、门禁证据、未完成阶段和继续顺序。
- `quality/a0a-baseline-2026-08-23.md`：A0a 当前提交、结构、测试、构建、生产资源和 SQLite 恢复基线。
- `quality/a0b-navigation-2026-08-23.md`：A0b 根目录、导航、链接、历史证据和敏感文件边界验收。
- `quality/a1-p0-red-baseline-2026-08-24.md`：A1 机器规则矩阵、有效夹具和修复前历史缺陷红灯证据。
- `quality/a2-p0-data-security-remediation-2026-08-24.md`：A2 案例、事件、反馈、快照、同步、安全与测试证据边界整改验收。
- `quality/a3-architecture-boundaries-2026-08-24.md`：A3 领域层、阶段视图和依赖方向的自动边界门禁验收。
- `quality/a4-production-workflow-orchestrator-2026-08-24.md`：A4 唯一生产编排器、页面命令合同、P0 决策表、状态探索和变异验收。
- `quality/a5-sync-sqlite-vertical-2026-08-24.md`：A5 同步状态机、完整快照校验、邀请权限、版本、SQLite 事务与纵向恢复验收。
- `quality/a6-invite-operations-2026-08-24.md`：A6 邀请次数与来源、反馈上下文、管理员运营、试用指标、业务不变量和知识引用一致性验收。
- `quality/a7-release-gates-2026-08-24.md`：A7 当前证据、VPS 发布恢复、资源基线与人工任务失败结论。
- `plans/rehabmind-quality-remediation-implementation-plan.md`：历史 34 项整改手册；保留旧编号和证据，执行顺序与当前主计划冲突时以当前主计划为准。
- `clinical-record-joint-map.md`、`remaining-joint-record-map.md`：原始资料总结，仅用于追溯候选来源。
- `archive/`：旧版长文档和讨论历史，不参与当前决策。

## 当前范围

- 当前本地已验证范围：桌面与 5 个手机宽度、单一主要问题、大腿至足部入口、膝与踝足功能、来源/同意/匿名案例、受保护测试工作台、首次与后续康复。
- 下一批施工：VPS 网页用户任务验收；通过后才建立 Android WebView APK。
- 暂不开放：多主诉联合处理、骨盆及上肢、语言模型、视觉 AI、正式视频和服务端账户。

## 维护规则

1. 一条规则只在一份正式文档中完整定义，其他文件只链接引用。
2. 审核结论直接替换原规则；旧内容需要追溯时移入 `archive/`。
3. 代码、正式文档和验收用例必须同步修改。
4. 病例经验只生成候选和排序，不能直接变成固定处方或诊断。
5. 桌面和 320 至 430px 手机网页都是当前维护范围；APK 外壳在网页确认后单独维护。
