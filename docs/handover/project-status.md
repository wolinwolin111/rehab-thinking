# RehabMind 项目状态总览

> 更新时间：2026-08-23
> 本文档反映项目当前真实状态，供接手者或决策者快速了解全貌。

---

## 一、产品定位

运动康复思路辅助工具。目标用户：健身教练、康复学习者、普通受伤用户。核心价值：将用户的症状描述转化为低风险评估和可复测的处理方案。**不做诊断**。

## 二、技术栈与部署

| 层面 | 技术 |
|---|---|
| 前端框架 | vinext（Next.js 兼容层）+ React 19 + TypeScript |
| 后端 | Node.js（vinext start 模式）+ API 路由 |
| 数据库 | SQLite（better-sqlite3）+ Drizzle ORM |
| 进程管理 | pm2（ecosystem.config.cjs） |
| 反向代理 | nginx（TLS 终结 + 路由分发） |
| 部署 | VPS `66.154.101.204`（Ubuntu 22.04，2核/969MB） |

**生产入口**：`https://66.154.101.204/RehabMind/`

### 服务器拓扑

```
用户 ──HTTPS 443──> nginx
                     ├── /RehabMind/    → RehabMind (pm2 → Node :3100)
                     ├── /api/pilot/*   → 同上（API 路由）
                     ├── /rehabmind-*   → 同上（定位图 PNG）
                     ├── /clinic/*      → Clinic 系统 (Gunicorn :8080)
                     ├── /mobile/       → 静态站
                     └── /shop/         → RehabGuide (Gunicorn :3098)
```

数据库：`~/rehabmind/data/rehabmind.sqlite`（WAL 模式，每日 03:20 备份至 `~/backups/rehabmind/`）

---

## 三、架构分层

### 设计原则

纯决策逻辑全部提取到独立的 `*-core.ts` 文件，每个文件只依赖输入参数、不读写 state、可独立单测。页面组件只负责收集答案和展示结果。

### 决策核心清单（57 个文件，约 5000 行）

#### 解析与身份
| 核心 | 职责 |
|---|---|
| `intake-complaint-core.ts` | 症状描述分段、当前主诉过滤、优先侧提取 |
| `chief-complaint-rules.ts` | 主诉动作解析、症状性质推断 |
| `action-identity-core.ts` | 同一实际动作的不同叫法合并 |
| `chief-action-core.ts` | 主诉动作→关节方向/功能动作映射 |

#### 工作流与权限
| 核心 | 职责 |
|---|---|
| `workflow-profile-core.ts` | 产品模式、操作对象、能力声明与权限 |
| `workflow-state-core.ts` | 动态处理队列重排和稳定的下一目标 |

#### 评估与记录
| 核心 | 职责 |
|---|---|
| `assessment-answer-core.ts` | 活动、力量、无法完成等答案归类 |
| `assessment-gap-core.ts` | 找出缺失检查并定位补充项目 |
| `muscle-tension-assessment-core.ts` | 统一肌肉紧张度检查 |
| `motion-assessment-core.ts` | 活动度评估规则 |

#### 处理与复测
| 核心 | 职责 |
|---|---|
| `build-trial-targets-core.ts` | 从 findings 构建处理目标队列 |
| `treatment-queue-core.ts` | 处理完成后的队列编排 |
| `treatment-queue-direction-core.ts` | 单方向候选资格规则 |
| `treatment-queue-eligibility-core.ts` | 候选资格合并判定 |
| `treatment-record-flow-core.ts` | 单次处理记录+复测绑定 |
| `treatment-ledger-core.ts` | 问题台账完成阈值 |
| `treatment-session-core.ts` | 阶段结束与复测条件 |
| `treatment-response-core.ts` | 处理反馈角色分类 |
| `treatment-coverage-core.ts` | 组合处理覆盖判定 |
| `retest-routing-core.ts` | 复测结果路由决策 |
| `retest-reuse-core.ts` | 复测结果复用判定 |
| `retest-eligibility-core.ts` | 复测资格门槛 |
| `function-retest-transition-core.ts` | 功能动作复测门槛 |
| `chief-retest-history-core.ts` | 主诉复测历史消费 |

#### 训练与后续
| 核心 | 职责 |
|---|---|
| `training-progression-core.ts` | 训练阶段门禁与进阶 |
| `training-stage-gate-core.ts` | 训练阶段门禁 |
| `next-session-recommendation-core.ts` | 下次复查时间窗口 |
| `followup-review-core.ts` | 第二次及后续康复趋势 |
| `adverse-response-core.ts` | 加重后的停止/聚焦复查 |

#### 安全与合规
| 核心 | 职责 |
|---|---|
| `consent-core.ts` | 知情同意版本管理 |
| `rate-limit-core.ts` | 内存滑动窗口限流器 |
| `restored-position-core.ts` | 刷新后恢复落点推导 |

#### 其他
| 核心 | 职责 |
|---|---|
| `problem-ledger-core.ts` | 问题台账与未路由问题 |
| `finding-groups-core.ts` | 发现问题分组展示 |
| `bilateral-flow-core.ts` | 双侧主诉的优先侧/冲突/训练门控 |
| `downstream-invalidation-core.ts` | 返回修改后的下游失效判定 |
| `stage-event-core.ts` | 阶段推进→事件字典映射 |
| `batch-retest-compute.ts` | 批量复测结果计算 |
| `trial-record-builder.ts` | 试处理记录组装 |
| `score-guide-copy.ts` | 分数引导文案 |
| `special-test-trigger-core.ts` | 专项检查触发条件 |

---

## 四、数据模型

```
PilotCaseRecord          案例主表（匿名，publicCode + accessTokenHash）
  ├─ PilotCaseSnapshotRecord   当前快照（含完整应用状态 JSON）
  ├─ PilotCaseEventRecord[]    事件时间线（16 种类型，不可变）
  └─ PilotCaseFeedbackRecord[] 用户反馈

关键设计：
- 幂等创建（clientCreationId 唯一约束）
- 乐观并发控制（expectedRevision 不匹配返回 409）
- 事件溯源（sequence 单调递增，source 标记 user/system/admin）
- 软删除 + 物理清除端点（PRIV-02）
- 三版本记录（appVersion / knowledgeVersion / decisionVersion）
```

---

## 五、质量基线

| 门禁 | 结果 | 命令 |
|---|---|---|
| typecheck | ✅ 0 errors | `npm run typecheck` |
| 全量测试 | ✅ **542/542** | `npm run test:fast` |
| lint | ✅ 0 errors | `npm run lint` |
| 变异测试 | ✅ 12/12 killed | `npm run test:logic:mutations` |
| D1/API 集成 | ✅ 5/5 | `npm run test:integration` |
| 浏览器场景 | ✅ 11 条全绿 | `scripts/real-browser-*.mjs` |

测试分层：
- **单元/合同测试**（542）：决策核心纯函数测试
- **变异测试**（12）：定向验证测试能捕获错误实现
- **集成测试**（5）：HTTP 合同全覆盖
- **浏览器走读**（28 脚本）：真实页面端到端

---

## 六、功能完成度

### 已上线（生产可用）

| 功能 | 状态 |
|---|---|
| 六阶段流程（症状→确认→评估→处理→训练→总结） | ✅ |
| 自助模式逐题向导 | ✅ |
| 专业模式结构化工作台 | ✅ |
| 双侧主诉（定位→优先侧→独立记录） | ✅ |
| 大腿/膝/小腿/踝足四区域评估与处理 | ✅ |
| 急性扭伤安全分流 | ✅ |
| 组织路径分流（骨应力/肌腱负荷/撞伤） | ✅ |
| 髌骨四方向被动活动单元 | ✅ |
| 功能动作评估（负荷渐进挑选） | ✅ |
| 统一复测（功能+方向分开记分） | ✅ |
| 训练渐进与居家放松 | ✅ |
| 第二次及后续康复（跨次状态传递） | ✅ |
| 处理/训练加重聚焦复查 | ✅ |
| 返回修改下游失效 | ✅ |
| 服务端持久化（案例+快照+事件时间线） | ✅ |
| 知情同意门 | ✅ |
| API 限流 | ✅ |
| 管理员查看/清除 | ✅ |
| 缺失字段高亮跳转 | ✅ |
| 处理撤销（快照回滚） | ✅ |
| 大阶段进度条 | ✅ |
| 处理进度路线图 | ✅ |

### 已明确关闭

- 多关节联合处理
- 骨盆/臀部/腹股沟/髋关节入口
- 上肢和脊柱
- 手机端适配
- 语言 AI / 视觉 AI
- 正式病例管理 / 服务端账户

---

## 七、代码规模

| 维度 | 数量 |
|---|---|
| 决策核心文件 | ~57 个 `*-core.ts` |
| 核心总行数 | ~5000 行 |
| 主组件 | ~8750 行（ARCH-01 待拆分） |
| UI 组件 | `ui-primitives.tsx`（10 组件）+ `next-session-card.tsx` 等 |
| state hook | `use-function-retest.ts` + `use-training-flow.ts` |
| 纯函数 | `trial-record-builder.ts` + `batch-retest-compute.ts` + `stage-event-core.ts` 等 |
| 测试文件 | 90 个（含集成/浏览器子目录） |
| 走读脚本 | 28 个场景脚本 |

---

## 八、已知限制与待办

### P0 遗留（不阻塞开放但需关注）

无——所有 P0 已通过。

### P1 待办

| 编号 | 内容 | 说明 |
|---|---|---|
| DATA-05 | 快照结构深校验 | 版本门禁已做（REL-01）；完整结构校验接入服务层待做 |
| DATA-06 | 冲突差异视图 | 三选项面板已有；差并排对比视图待做 |
| DEPLOY-01 | 预览/正式环境隔离 | 当前单环境即试用环境；正式规模化前需隔离 |
| FEED-01 | 反馈精确关联 | eventId 关联已支持；前端选择器和后台跳转待做 |
| OPS-01 | 错误日志关联 ID | 脱敏关联 ID 贯穿客户端/API/时间线 |
| ARCH-01 | 主组件拆分 | ~8750 行；阶段 C 指导文档已备 |
| CONTENT-01 | 动作素材 | 方案已定（精确插画路线），等产品侧提供素材 |
| TEST 系列 | 测试收尾 | TEST-03/06/07/10/12 等多项整改中 |

### P2

| 编号 | 内容 |
|---|---|
| ADMIN-01 | 管理后台工作台增强 |
| UX-01 | 弹层焦点管理/键盘导航 |

### 挂起项（有触发条件）

| 事项 | 触发条件 |
|---|---|
| PRIV-02 定时清理 | **产品已决定挂起**——试用结束由产品下令后一次性清除 |
| ARCH-01 阶段 C useDecisionEngine | 多关节需求启动时（指导文档已备） |
| 0 分改善文案调整 | 阶段 3 粉丝反馈回来后 |

---

## 九、关键决策记录

| 决策 | 原因 |
|---|---|
| Cloudflare → VPS | workers.dev 大陆不可直连 |
| SQLite 替代 D1 | Repository 接口抽象已就位，只换驱动 |
| 症状性质用方案 B（折叠不改值） | 避免 20+ 处决策逻辑连锁改动 |
| 功能动作负荷排序挑选 | goal 低挑基础动作，goal 高逐步纳入高负荷 |
| GOALS 拆双轨 | 自助大白话 / 专业术语各得其所 |
| 松解重复不自动跳过 | 可能是「没做到位」而非「方向错」，判断权交给康复师 |
| 紧张度出口前置 | 减少两级交互迷失（TENS-01 教训） |
| 训练三帧不用 SVG | 产品要求定位图级精确度 |

---

## 十、常用命令速查

```bash
# 提交前必跑
npm run test:fast              # typecheck + build + 542 测试
npm run lint                   # 0 errors
npm run test:logic:mutations   # 12 变异 killed

# 可选
npm run test:integration       # 需 dev server + D1_TEST_URL
npm run test:browser:p0        # P0 浏览器场景（需 Edge）

# 场景走读
WALKTHROUGH_URL=https://66.154.101.204/RehabMind/ node scripts/real-browser-walkthrough.mjs
```
