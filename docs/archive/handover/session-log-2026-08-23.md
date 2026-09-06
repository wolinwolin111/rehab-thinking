# RehabMind 会话工作日志（2026-08-23）

> 执行模型：DeepSeek（ox-alpha）
> 代码仓库：`D:\Study\codex\project\rehab-thinking-demo` → GitHub `wolinwolin111/rehab-thinking`
> 会话范围：普通用户 UX 审查修复 → 专业模式差异化 → 功能动作评估重构 → VPS 迁移验证 → P0 整改批次 → 阶段 2 发布验收
> 最终状态：**允许开放** · 生产入口 `https://66.154.101.204/RehabMind/`

---

## 一、时间线总览

| 批次 | 内容 | 提交数 |
|---|---|---|
| UX 文案与交互 | 症状性质折叠、GOALS、活动度/控制、训练折叠、进度条、Roadmap | 7 |
| 功能动作评估 | 强制纳入 + 负荷排序挑选 + 统一复测拆分 | 2 |
| P0 整改 | AUDIT-01/02 + SAVE-01 + REL-01/02 + 既往处理提示 + 高亮跳转 | 6 |
| VPS 迁移验证 | SQLite 仓储 + env 解耦 + 发布脚本 + 定位图修复 + 髌骨 URL | 5 |
| 阶段 2 验收 | 多场景走读 + §11 冒烟 + 报告 | 2 |
| **合计** | | **22 个本地提交，全部已推送** |

---

## 二、普通用户 UX 审查与修复

### 审查方法

以「什么也不懂的受伤用户」视角走完全部六阶段流程，按不耐烦情绪、输出可读性、流程合理性、软件通用审查项（一致性/反馈/容错/效率/帮助/可访问性/空状态）逐维度打分。

### 落地改动

| # | 问题 | 修复 | 提交 |
|---|---|---|---|
| 1 | 症状性质 10 个选项吓退用户 | 方案 B：`symptomType` 值不变，UI 改 4 个 `<details>` 折叠大类（疼痛/其他异常感觉），默认展开「疼痛」 | `38849b6` |
| 3 | 恢复目标 5 级太学术 | 拆 `GOALS_SELF`（先消肿止痛→…→恢复高强度与对抗）+ `GOALS_PRO`（急性反应减轻→…），按模式选择 | `7d85280` |
| 4 | 「转到最大范围」不通用 | 统一改「活动到最大范围」；observe 同步 | `af4c05c` |
| 4b | 「保持 3~5 秒看力量」测不出力量（自助无抗阻仅 3 级） | 改「停住不动，看稳不稳」；功能动作补「能否完成」追问 | `7d85280` |
| 5a | 「你更接近哪一种感觉」与「最接近哪种感觉」重合 | 删除冗余追问，`needsPainQuality` 恒 false | `4831fcd` |
| 5b | 刺痛范围追问与轻按反应重叠 | 删除刺痛范围追问，保留轻按反应 | `4831fcd` |
| 6 | 训练三段式信息量爆炸 | 默认只显「怎么做」；「做不了/太轻松」用 `<details>` 折叠 | `3495a83` |
| 7 | TreatmentRoadmap 排版拉跨 | 三行纯文本→对勾列表+高亮卡+编号列表；复测阶段当前处理计入已完成；摘要同行内联 | `15f7790` `3495a83` |
| 8 | 放松文案「肌腹位置」不通俗 | 改「紧绷或发酸的地方，避开骨头关节缝肿胀中心刺痛点」 | `1d458cc` |
| — | StepHeading 加六格进度条 | 从 eyebrow 解析「第 X 步」自动渲染 | `2aa5598` |
| — | 评估结果页加「修改评估」入口 | 三列布局加按钮 | `4671a53` |

---

## 三、专业用户审查与差异化

### 发现

本轮普通用户优化（折叠、大白话）误伤专业模式——专业用户需要一眼看到全部选项和精确术语。

### 修复

| 问题 | 修法 |
|---|---|
| 症状性质折叠拖慢专业录入 | 专业模式平铺展开（`is-flat`），自助保持折叠 |
| GOALS 大白话不精确 | 拆 `GOALS_SELF` / `GOALS_PRO`；专业模式恢复目标/记录展示/训练阶段线全用 `GOALS_PRO` |
| 术语无解释 | 「代偿」加 `.rm-term` 虚线 hover |
| 可访问性 | `--rm-muted` 加深至 `#4c5a60`；`:focus-visible` 蓝色焦点环 |
| 文案分层无约定 | 新建 `docs/plans/copy-layering-convention.md`（自助 vs 专业规则+检查清单） |

---

## 四、功能动作评估重构

### 问题

用户勾选了「上下楼」「下蹲」等功能动作，但评估阶段没有对应检查——自助模式 `selectedFunctionEntries` 只取评分前 2~3 个，主诉功能动作被截断。

### 修复

1. **`chiefFunctionAssessmentIds`**（复数）：返回所有主诉功能动作 ID（不再只返回第一个）
2. **`FUNCTION_LOAD_ORDER`**：21 个功能动作的负荷强度分级（走路=1 → 跑跳=5）
3. **挑选逻辑**：主诉功能动作按负荷强度升序挑前 N（goal≥4 取 3，否则取 2），空位按评分补基础动作

效果：
- goal=1 + 勾选上下楼/下蹲 → 两个都纳入
- goal=1 + 勾选跑跳/上下楼/走路/下蹲 → 按负荷排序取走路+上下楼，跑跳被跳过
- goal=4 → 逐步纳入更高负荷

### 统一复测主诉拆分

原来方向动作和功能动作共用一个 `postScore`。拆为：

- **功能动作**：能否完成（复用 `functionRetestCompletion`）+ 疼痛分（`postScore`）
- **方向动作**：疼痛分（新增 `directionChiefRetestScore` state）

---

## 五、VPS 迁移（阶段 1）

### 背景

Cloudflare 方案已弃用（workers.dev 大陆不可直连），选定 VPS `66.154.101.204`。Repository 接口已抽象，迁移只动边界。

### 实现

| 层面 | 文件 | 说明 |
|---|---|---|
| SQLite 仓储 | `db/sqlite/sqlite-pilot-case-repository.ts` | better-sqlite3，与 D1 版同接口（13 方法），事务原子写，冲突语义一致 |
| 原生模块加载 | 同上 | `createRequire` 运行时加载（绕开打包器内联 .node 失效） |
| 环境解耦 | `app/api/pilot/_shared.ts` | `getPilotEnv()`：Workers 读 bindings / Node 读 process.env |
| 迁移脚本 | `scripts/data/migrate-sqlite.mjs` | 幂等，处理 drizzle statement-breakpoint |
| 发布脚本 | `scripts/deploy/vps-release.sh` | 时间戳目录+迁移+健康探针失败自动回滚+仅留3版 |
| 备份 | `/etc/cron.d/rehabmind-backup` | 每日 03:20，.backup API，保留 7 份 |
| 进程管理 | pm2 + ecosystem.config.cjs | 自读 .env，max_memory_restart 400M |
| nginx | 四服务共存 | RehabMind 占根跳转+后缀入口；Clinic/Mobile/Shop 共存 |

### 生产拓扑

```
用户 ──HTTPS 443──> nginx
                     ├── /              → 308 → /RehabMind/
                     ├── /RehabMind/    → RehabMind (pm2 → vinext, 127.0.0.1:3100)
                     ├── /api/pilot/    → 同上（最长前缀代理）
                     ├── /rehabmind-*.png → 同上（定位图）
                     ├── /clinic/       → Clinic (Gunicorn 8080)
                     ├── /mobile/       → 静态站
                     └── /shop/         → RehabGuide (Gunicorn 3098)
```

---

## 六、P0 整改批次

### AUDIT-01：事件来源可伪造

**修复**：复核确认 `PilotCaseService` 各方法已硬编码 source（create=system、progress/delete=user、feedback=in_app+timeline=user），路由层零直通。新增全生命周期 source 清白测试。

### AUDIT-02：操作时间线不完整

**修复**：新增 `stage-event-core.ts`（阶段完成→字典事件映射），主组件阶段推进时经既有推送链路发射并带全量快照。核心 4 单测 + 接线合同测试。

### SAVE-01：自动保存承诺不符

**修复**：教程文案改为「本机浏览器自动保存；按保存才同步服务器」双触发点表述。`tests/component/save-promise-copy.test.mjs` 三断言防回潮。

### REL-01：版本治理

**修复**：`PILOT_SNAPSHOT_SCHEMA_VERSION` 唯一事实来源移至 contracts；服务层 `assertAndStampPilotSnapshotSchemaVersion` 拒绝不兼容版本并入库补烙；appVersion 与 package.json 漂移由单测锁定。

### REL-02：可复现发布

**修复**：`scripts/deploy/vps-release.sh` 时间戳目录+迁移+探针失败自动回滚；备份/pm2/ecosystem 配置入库；**干净检出演练通过**（worktree → npm ci → typecheck → build → 以其产物真实发布并探针全绿）。

---

## 七、验收过程中发现并修复的真 bug

| bug | 根因 | 修复 | 发现方式 |
|---|---|---|---|
| 快照非对象返回 500 | helper 形状分支抛普通 Error | 改抛 `PilotCaseValidationError` → 正确映射 400 | 集成测试第 3 条 |
| 集成偶发 ECONNRESET | 本地服务器逐请求关连接 vs undici 连接复用竞态 | harness 加传输层单次重试 | 全量套件偶发失败 |
| 髌骨走读 4 秒崩 | URL 硬编码 localhost:3000 未走 WALKTHROUGH_URL | 改用 `pilotScenarioUrl()` | 对生产重跑 |
| 定位图全灭 | nginx 兜底 `/` 改 308 后根级 PNG 无代理规则 | 加 `location /rehabmind-` 前缀代理 | 用户截图报告 |
| MIX 同意层拦截 | 脚本缺 `agreePilotConsent` | 补上 | 对生产重跑 |

---

## 八、验证矩阵（最终）

| 项 | 结果 |
|---|---|
| typecheck | ✅ 0 |
| test:fast（typecheck+build+测试） | ✅ **542/542** |
| lint | ✅ 0 errors 0 warnings |
| 变异测试 | ✅ 12/12 killed |
| 本地集成（SQLite 新库） | ✅ 5/5 |
| **生产集成终验（真 TLS）** | ✅ **5/5** |
| 日志脱敏 | ✅ 四类错误请求零泄漏 |
| §11 页面冒烟 | ✅ 通过（含刷新恢复） |
| 数据清点 | ✅ listCases = 0 |

### 多场景真实浏览器走读

| 场景 | 结果 |
|---|---|
| QUEUE-基线 / 加重 / 无变化 / 活动改善 / 混合加重 | ✅ 5/5 |
| TIME01-刷新恢复 | ✅ |
| MIX-双侧症状（同意层修复后） | ✅ |
| 髌骨专业模式 | ✅ PASS |
| 踝扭伤+肿胀 | ⏳ 已知限制（紧张度页两级交互 walker 不适配） |
| 数据清点 | ✅ listCases = 0 |

---

## 九、最终结论与遗留

### 结论

**允许开放**。P0 全部已通过，生产环境功能正常，自动化验收全绿。

### 遗留待办（不阻塞开放）

| 项 | 说明 |
|---|---|
| 人工双视角走读 | 普通用户+专业人员各一遍，由产品侧执行 |
| DEPLOY-01 | 预览/正式环境隔离（P1） |
| DATA-05/06 | 快照结构深校验 + 冲突差异视图（P1） |
| ARCH-01 | 主组件 ~8750 行拆分（阶段 C 指导文档已备） |
| FEED-01 / OPS-01 | 反馈定位 + 日志关联（P1） |
| TEST 批次收尾 | TEST-03/06/07/10/12 等 |
| CONTENT-01 | 动作素材——方案已定（精确插画路线），等图像生成管线 |
| UX-01 | 弹层焦点管理（P2） |
| ADMIN-01 | 管理后台工作台（P2） |
| PRIV-02 定时清理 | **按产品指示挂起**——试用结束由产品下令后一次性全量清除 |
| 密钥副本 | `D:\Study\codex\project\.tmp-deploy-secrets.txt` 待转移密码管理器 |
| 踝扭伤走读 | 紧张度页两级交互 walker 不适配（产品功能正常） |

### 挂起（有明确触发条件）

| 事项 | 触发条件 |
|---|---|
| PRIV-02 全量清除 | 试用结束日，产品明确下令 |
| ARCH-01 阶段 C | 多关节需求启动 |
| 0 分改善文案调整 | 阶段 3 粉丝反馈 |
| 视觉 AI / 手机端 | 需产品重新开口 |

---

## 十、关键文件索引

| 文件 | 说明 |
|---|---|
| `docs/handover/HANDOVER.md` | **当前唯一权威交接文档**（部署拓扑/路线图/已知坑） |
| `docs/quality/rehabmind-quality-remediation-register.md` | 质量登记表（34+2 项状态权威来源） |
| `docs/quality/release-acceptance-report-2026-08-23.md` | 本次发布验收报告 |
| `docs/plans/copy-layering-convention.md` | 自助/专业文案分层约定 |
| `docs/plans/refactor-use-decision-engine.md` | 阶段 C 重构指导（等多关节触发） |
| `docs/plans/nrs-anchor-requirement.md` | 分数锚点需求文档（等 GPT 返回） |
| `scripts/deploy/vps-release.sh` | VPS 发布脚本（服务器侧执行） |
| `scripts/deploy/vps-backup-sqlite.sh` | SQLite 备份脚本 |
| `scripts/data/migrate-sqlite.mjs` | SQLite 迁移执行器 |
| `db/sqlite/sqlite-pilot-case-repository.ts` | SQLite 仓储实现 |
| `src/features/rehabmind/workflow/stage-events.ts` | 阶段事件映射核心 |
| `src/domain/rehab/intake/intake-complaint-core.ts` | 主诉解析核心（含优先侧提取） |
