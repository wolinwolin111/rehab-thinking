# A6 邀请与最小运营闭环验收

日期：2026-08-24  
基线提交：`5af6280c6f60f3236363dac6150a6e4ddef550d6`（工作树含 A0-A6 未提交整改）  
构建标识：`rehabmind-pilot-app-0.1.0+local-5af6280c6f60-dirty.5af6280c6f60`

## 结论

A6 已完成。邀请次数与来源、反馈上下文、管理员短会话和运营工作台、首次使用顺序、最小试用指标、运行时业务不变量、管理审计及知识引用的软件一致性均已落到生产入口，并通过直接生产函数、route 和真实临时 SQLite 验证。

本结论不表示可以开放粉丝群。A7 仍须完成 lint 清零、当前运行证据清单、安全响应头、依赖与资源基线、VPS 备份/迁移/canary/回滚，以及约六条最小浏览器接线和一次人工任务验收。动作图片和独立临床审核不在本批范围内。

## 生产行为整改

| 编号 | 已落地行为 | 主要生产入口 |
| --- | --- | --- |
| `INVITE-01` | 邀请支持 hash、有效期、撤销、最大使用次数、来源批次和并发原子扣减；幂等创建不重复消耗次数 | `src/infrastructure/pilot/invite/invite-authorization.ts`、`app/api/pilot/_shared.ts`、两套 repository |
| `FEED-01` | 反馈分别记录目标案例/康复记录/模块/可选事件，以及提交时所在记录/模块/事件；越界记录和跨案例事件被拒绝 | `src/infrastructure/pilot/services/case-service.ts`、反馈 API、管理员工作台 |
| `ADMIN-01/02` | 管理员使用 15 分钟 HttpOnly 短会话；可筛选案例、查看完整上下文、处理反馈、写备注、删除和脱敏导出 | `app/admin/page.tsx`、`src/infrastructure/pilot/admin/admin-session.ts`、admin routes/service |
| `OPS-03` | 对跳过复测、队列提前结束、训练门禁绕过、时间线断序、revision 倒退、删除后恢复和无效反馈引用产生固定脱敏代码 | `workflow-invariants.ts`、`PilotCaseService`、管理员指标 |
| `KNOW-01` | 校验知识关系引用、部位、动作、权限和版本一致性；删除失效引用并修正关节权限映射 | `src/knowledge/pilot/knowledge-consistency.ts` |
| 首次使用与试用指标 | 首次进入严格按教程再同意、再工作区；记录邀请访问、教程/同意、恢复、保存失败/冲突及最小转化指标 | `src/infrastructure/pilot/telemetry/first-use-core.ts`、trial event route/service |

## 数据、权限与隐私边界

- 新增 `0003_operational_invites.sql`、`0004_feedback_operations.sql`、`0005_trial_operations.sql` 和 `0006_admin_audit.sql`，旧 `0000` 数据库可连续升级并保持可读。
- 管理员长密钥只用于换取短会话；浏览器不持久化长密钥。短会话 cookie 为 `HttpOnly`、`Secure`、`SameSite=Strict`，路径限定在 `/api/pilot/admin`。
- 管理员查看、备注、反馈状态、导出和删除均写入管理审计；备注、健康原文、反馈正文和凭据不进入审计载荷。
- 试用事件仅保存事件类型、首次使用 flow ID、可选案例 ID、邀请来源、版本和时间，不保存症状或反馈正文。
- 技术不变量告警只包含固定代码及 request/case/session 关联 ID，不包含健康原文、邀请令牌、案例访问令牌或管理员密钥。
- 公开案例编号不能读取数据；邀请令牌、案例访问令牌和管理员凭据不能互相升级。

## 测试有效性

- 36/36 个定向变异被杀死；A6 新增教程顺序、跳过复测告警、知识缺失引用、管理员会话过期、邀请次数边界和反馈记录边界六类变异。
- 邀请集成覆盖并发争抢最后一次名额、幂等重放不重复计数、来源落库、过期/撤销和权限隔离。
- 管理集成覆盖历史模块反馈、跨案例事件拒绝、非法记录号拒绝、筛选/损坏游标 400、状态流转、备注、脱敏导出、删除和审计。
- 运行时不变量集成验证错误实现会产生固定代码，同时日志序列化中不存在测试注入的健康正文和凭据。
- 知识一致性测试只证明软件引用关系完整，不证明临床建议正确、安全或已通过专业审核。

## 当前运行证据

| 命令 | 当前结果 |
| --- | --- |
| `npm run test:fast` | 通过；架构边界、typecheck、build 和 610/610 条快速测试通过 |
| `npm run test:logic:mutations` | 36/36 killed |
| `npm run test:integration` | 连续两轮均为 14/14，使用生产 route/service 与真实临时 SQLite |
| `npm run test:vertical` | 2/2；首诊、重启恢复和后续康复纵向轨迹通过 |
| `npm run typecheck` | 通过，0 error |
| `npm run build` | 通过；仍有既有主 chunk 超过 500 kB 告警 |
| `npm run lint` | 未通过：4 errors、8 warnings，与 A0 基线位置和数量一致，A6 无新增 |

本批没有运行真实浏览器。业务组合、权限、HTTP、SQLite 和恢复由 L0-L5 承担；A7 仅保留最小界面接线和真实发布验收。

## 配置

VPS 环境在既有密钥外增加以下可选配置，密钥值不得进入仓库：

| 变量 | 用途 |
| --- | --- |
| `PILOT_INVITE_MAX_USES` | 当前邀请令牌允许成功创建的新案例上限；不设置表示不按次数限制 |
| `PILOT_INVITE_SOURCE` | 邀请来源或批次，例如粉丝群批次；随案例和匿名运营指标落库 |

## 剩余风险与下一步

1. lint 的历史 4 errors、8 warnings必须在 A7 正式门禁中清零。
2. 当前构建仍提示主客户端 chunk 超过 500 kB；A7 建立预算和进程基线，B1 再通过垂直切片降低主组件负担。
3. A6 只证明知识引用的软件一致性，独立临床审核仍为明确暂缓项。
4. 管理工作台已具备小数据量试用所需操作，不等于完整用户账户或专业病例管理系统。
5. 下一批严格进入 A7；在 A7 开放门槛全部通过前不得向粉丝群开放。
