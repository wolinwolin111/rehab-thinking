# RehabMind 发布验收报告（2026-08-23）

按 `docs/operations/pilot-release-readiness-execution-runbook.md` §16 格式交付。手册原按 Cloudflare 编写；实际部署已在阶段 1 迁移至 VPS，以下按 VPS 现实等价执行（单环境=试用环境本身，「预览/正式隔离」转化为 DEPLOY-01 开放项记录）。

```text
执行时间：2026-08-23 04:30 ~ 05:40 (UTC+8)
代码版本/commit：1d8059b（构建产物）/ 文档与脚本至 f2878c5
目标环境：formal（VPS 66.154.101.204，试用环境本身）
Worker：无（vinext Node 服务，pm2 托管，nginx 443 反代）
D1：SQLite ~/rehabmind/data/rehabmind.sqlite（迁移 0000-0002 已应用）

本地 test:fast：通过，542/542（较基线 +14：AUDIT-01 加强 1、stage-event-core 4、save-promise-copy 3、REL-01 service/schema 各计）
本地 test:integration：通过，5/5（指向本地 sqlite 服务器；含一次传输层 ECONNRESET 重试加固后稳定两遍）
mutation：通过，12/12 killed
lint：通过，0 errors 0 warnings
生产集成终验：通过，5/5（https://66.154.101.204/RehabMind，真实 TLS 校验）
日志脱敏：通过（本地证据：四类错误请求后日志零令牌/零主诉/零堆栈；意外错误仅记 name+message；VPS pm2 日志同构观察一致）
唯一页面冒烟：通过（scripts/deploy/release-smoke.mjs 对生产——邀请进入、案例编号 G9ASN8RR 可见、保存同步、刷新经康复记录→继续恢复到「确认你的症状信息」、0 运行时错误、测试案例删除 200）
测试数据清理：通过（生产 listCases = 0）

发现的问题：
1. 服务层快照非对象分支抛普通 Error 导致 500（应为 400 validation）——已修复并加集成覆盖（1d8059b）
2. 集成 harness 偶发 undici ECONNRESET——已加传输层单次重试（不掩盖业务状态）
3. 本地全量套件连跑两遍时第二遍被限流器累计拦截（30/分跨运行计数）——已知行为，验收以全新服务器单遍为准

保留的风险：
- DEPLOY-01 环境隔离未做（当前单环境即试用环境；正式开放前建议独立预览实例）
- PRIV-02 定时清理按产品指示挂起；试用结束由产品下令一次性清除
- ARCH-01 主组件 ~8700 行（阶段 C 指导文档就位）
- 人工双视角走读由产品侧执行（本报告不含）
- 密钥明文副本在开发机 .tmp-deploy-secrets.txt，待转移密码管理器

最终结论：允许开放（附上述保留风险与阶段 3 观察项）
```

## 与手册的差异说明

| 手册章节 | VPS 等价处理 |
|---|---|
| §7 Wrangler/D1 预检 | 不适用（CF 弃用）；等价为 SQLite 迁移幂等验证（vps-release.sh 步骤3） |
| §8 Secrets 写入 | `.env` chmod 600（服务器），令牌值不入库不入文档 |
| §9 预览部署 | `scripts/deploy/vps-release.sh` 时间戳目录发布 + 探针 + 自动回滚 |
| §10 wrangler tail | pm2 日志文件扫描（同构格式） |
| §12 正式环境隔离 | 转为 DEPLOY-01 开放项记录；试用数据与验收数据均在本环境，验收案例已清零 |
