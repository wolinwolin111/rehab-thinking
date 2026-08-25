# A2 P0 数据与安全整改验收（2026-08-24）

## 已修复

| 编号 | 实现结果 | 主要行为证据 |
| --- | --- | --- |
| `CASE-01` | 远程记录由显式 `localCaseId` 选择，不再反转记录数组猜测 | `local-case-identity.test.mjs` |
| `AUDIT-03/04` | 记录离开阶段的完成事件；ID 包含事件类型；成功后按案例提交去重状态 | `stage-event-core.test.mjs`、service 幂等测试 |
| `FEED-02` | 打开反馈时冻结案例、康复次数、模块和事件；最后事件改为按案例保存 | `pilot-feedback-context.test.mjs`、反馈 service 合同 |
| `SCHEMA-01` | 服务端复用生产深 schema；创建和进度保存均要求有效 `pilot-consent-v1` | `pilot-snapshot-schema.test.mjs`、`pilot-case-service.test.mjs` |
| `SYNC-01` | 草稿保存增加代次校验；案例记录写串行化；删除 tombstone 阻止新保存和迟到写复活 | `pilot-persistence-core.test.mjs` |
| `SEC-02` | VPS/SQLite 只信 nginx 覆盖的 `x-real-ip`；Cloudflare 模式才信 `cf-connecting-ip` | `p0-known-defects.test.mjs`、代理地址变异 |
| `TEST-14` | 浏览器证据绑定 `runId/commit/buildId`；无 manifest、身份不符和 P0 未运行均失败关闭 | `quality-summary.test.mjs` |
| `TEST-15` | Playwright 保留 `/RehabMind/` 等路径，页面助手使用相对入口 | `playwright-config.test.mjs` |

旧的源码字符串断言曾要求恢复有缺陷的事件 ID 与接线文本，已删除；对应规则由生产函数行为测试和变异测试接管。

## 验证结果

- `npm run test:fast`：通过；类型检查、生产构建和 557/557 单元检查全绿。
- `npm run test:logic:mutations`：21/21 变异被杀，其中 9 项覆盖本轮案例、事件、反馈、同步、revision、schema、同意版本和代理地址。
- `npm run test:integration`：HTTP + 本地 D1 5/5，通过后立即重跑仍为 5/5。
- `npm run build`：通过；仍有主客户端 chunk 超过 500 kB 的既有警告。
- `npm run lint`：仍为 A0a 基线的 4 errors / 8 warnings；错误来自 `.tmp-smoke` 与 `ecosystem.config.cjs`，本轮主组件保留一个既有 hook 依赖警告。lint 治理不冒充 A2 已完成项。

本地开发服务保持在 `http://localhost:3000/`。

## 尚未关闭

- `TEST-17`：页面到生产核心的完整适配器合同，属于 A4。
- `TEST-18`：生产 orchestrator 经过 HTTP/SQLite、重启恢复并继续后续康复的纵向流水线，属于 A5。
- `TEST-19`：决策表已定义且有效夹具已建立；所有表直接驱动唯一生产 orchestrator 后才能最终关闭。
- `DB-01`、`INVITE-01`、`REL-03` 和发布运维门禁按 A3-A7 顺序继续。
