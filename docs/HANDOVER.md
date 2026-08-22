# RehabMind 交接文档

> 交接日期：2026-08-22（2026-08-23 更新：阶段1 VPS 迁移完成，正式入口 `https://66.154.101.204/RehabMind/`）
>
> 交接范围：质量整改体系落地、两个 P0 缺陷修复、发布前测试体系、部署评估
>
> 读者：下一位接手的开发者或 AI 执行模型

---

## 1. 项目现状快照

| 维度 | 状态 |
| --- | --- |
| 产品定位 | 运动康复思路辅助工具（健身教练/康复学习者/普通用户），不输出诊断 |
| 技术栈 | vinext（Cloudflare 系全栈框架）+ React 19 + TypeScript + D1/Drizzle |
| 部署现状 | **Cloudflare 方案已放弃**（workers.dev 大陆不可直连）；已选定 VPS：66.154.101.204 |
| 质量基线 | 528 单元/合同测试 ✅ · 12 定向变异 ✅ · 5 D1/API 集成 ✅ · lint 0 errors ✅ |
| 真实浏览器场景 | 11 条全绿（QUEUE×5 · 踝扭伤 · 髌骨专业 · MIX-05 · 同意层 · TIME-01） |
| P0 缺陷 | **0**（SAVE-02 已修 · BIL-01 主断点已修 · TENS-01 误报关闭） |
| 代码 | 9 笔逻辑提交全部落库，工作区干净，HEAD 复验通过 |
| 文档 | 四份正式文档 + 登记表/覆盖矩阵/测试计划/发布手册全部与代码同步 |

## 2. 本轮完成的工作明细

### 2.1 质量体系重建（前期整改的落地）

- **证据标准重建**：建立「内部逻辑覆盖矩阵」（`docs/internal-logic-coverage-matrix.md`），每条规则标注 已覆盖/部分覆盖/待提取/伪证据待迁移；把源码字符串匹配类测试降级为「界面接线合同（不计逻辑覆盖）」
- **变异测试**：`npm run test:logic:mutations`，12 项定向变异全部捕获（覆盖功能复测门槛、台账阈值、队列方向规则、下游失效守卫）
- **历史缺陷回放集**：六类历史人工走查缺陷各有能在错误实现上失败的回归测试
- **伪证据迁移**：`random-state-sequence.test.mjs` 改为直接驱动 6 个真实生产核心（5 万次随机组合）；`rendered-html.test.mjs` 重新归类
- **测试分层执行口径**：真实浏览器不再作为内部逻辑常规门禁；门禁 = 决策规则 + 状态轨迹 + 组合不变量 + 错误注入 + D1/API 集成 + 人工界面验收

### 2.2 决策核心提取链（绞杀者式，行为等价）

本轮新增/提取的正式核心（全部带单测，多数带定向变异）：

| 核心 | 职责 |
| --- | --- |
| `function-retest-transition-core.ts` | 功能动作处理后复测门槛（第一条提取链） |
| `treatment-queue-core.ts` | 处理完成后的队列编排（加重停止/同目标优先/跨目标遍历） |
| `treatment-queue-direction-core.ts` | 单方向候选资格规则 |
| `treatment-queue-eligibility-core.ts` | 候选资格与方向/复测结果合并 |
| `treatment-record-flow-core.ts` | 单次处理记录 + 复测绑定 + 批量活动度记录 |
| `treatment-ledger-core.ts` | 问题台账完成阈值与最新记录覆盖 |
| `training-stage-gate-core.ts` | 训练阶段门禁 |
| `chief-retest-history-core.ts` | 主诉复测历史消费（过滤残余复查项） |
| `downstream-invalidation-core.ts` | 返回修改后的下游失效判定（BIL 配套） |
| `chief-change-explanation-core.ts` | 0 分改善/无变化/加重的总结解释文案 |
| `restored-position-core.ts` | SAVE-02 恢复落点推导 + 确认卡文案 |
| `consent-core.ts` | 知情同意版本管理与快照注入 |
| `rate-limit-core.ts` | 内存滑动窗口限流器（SEC-01） |

### 2.3 两个 P0 缺陷修复

#### SAVE-02：刷新后评估进度回退

- **现象**：7 项评估全部完成后，在阶段过渡页刷新 → 回退到评估第 1 项重走
- **根因**：快照只存 step/index，无「评估已完成」状态；恢复后直接渲染清单
- **修复**：恢复时按派生队列推导作答进度（`restored-position-core.ts`）——完成→直达处理复测；部分→定位首个未答项；配恢复确认卡文案（报数字/位置/下一步）
- **验证**：官方走读 `WALKTHROUGH_TIME01=1` 刷新后落在「针对性处理」，到达总结页，0 错误

#### BIL-01：双侧主诉优先侧题卡死路

- **现象**：双侧定位完成后，「本次先处理哪一侧」选择题永不渲染，下一步禁用
- **根因**：`bilateralPriorityChoice` 组件被嵌在位置选择器的三元表达式内（条件 `showIntakeQuestion("不舒服的位置")`），与自身渲染条件（指针流转到「本次优先侧」）互斥 → 死代码
- **修复**：移出为独立兄弟块（主组件约 6640 行处，带注释）
- **附带缺口（未修，登记在案）**：解析层未从「右侧更明显」类主诉自动提取 complaintPrioritySide

### 2.4 误报关闭

- **TENS-01**（双侧紧张度出口锁死）：判定为误报关闭。三层测试脚手架假象叠加：走读器重复 toggle 同一按钮 + BEFORE/AFTER 实验的 `.first()` 在按钮文本变化后偏移到另一实例 + NEXT 正则缺「查看评估结果」。DOM 全量扫描证明按钮切换正常、出口正常解锁

### 2.5 隐私与安全合规

- **PRIV-01 知情同意**：`consent-core.ts` + `pilot-consent-gate.tsx` 弹层（定稿文案约 100 字）；未同意不创建远端案例；同意信息注入快照可追溯；真实浏览器验证通过
- **SEC-01 基础限流**：`rate-limit-core.ts` + create(30/分)/save/feedback(60/分) 路由接入，429+retry-after；管理员密钥可信旁路；集成测试含活体 429 断言
- **PRIV-02 物理清除**：`POST /api/pilot/admin/purge`（deletedBeforeDays/createdBefore 双条件），显式多表删除（不赌外键级联——本地实测外键无 ON DELETE 子句会 FK 报错）；集成测试覆盖软删→清除→管理员 404

### 2.6 真实浏览器场景验证（11 条全绿）

QUEUE-01 常规 / QUEUE-02 无变化 / QUEUE-03 活动↑痛不变 / QUEUE-04 痛↓活动↓ / 处理加重聚焦复查 / 急性踝扭伤+肿胀 / 髌骨专业模式 / MIX-05 返回修改失效（子代理完成，0 泄漏）/ 同意层三路径 / TIME-01 刷新恢复（修复后）

### 2.7 工程收口

- 删除 9 个无引用旧模块（约 5300 行）
- 9 笔逻辑提交（见 git log f8876b3..a61e994 + b12e646），每笔可追溯
- 走读脚本统一加同意层处理（`agreePilotConsent` helper）+ try/finally 强制关浏览器
- 发布手册基线数字同步（528/528、12 变异、5 集成）

### 2.8 部署评估（VPS 66.154.101.204）

- SSH 已验证可连：`ssh -i ~/.ssh/id_ed25519 rehabdeploy@66.154.101.204`（有 sudo）
- 资源：2 核 / 969MB 内存（可用 504MB）/ 磁盘剩 12G / Ubuntu 22.04 —— **足够**
- 已有服务：nginx(80/443)、gunicorn(8080)、python(3098) —— 部署需避开，用 nginx 加 server block 反代新端口
- 大陆直连可达（443/80 全通），无 workers.dev 阻断问题
- **注意**：曾因多次 SSH 尝试触发防爆破封禁，重试需间隔

## 3. 缺陷与事项账本（当前状态）

| 编号 | 状态 | 说明 |
| --- | --- | --- |
| SAVE-02 / PRIV-01 / SEC-01 | ✅ 已通过 | 证据见登记表 |
| TENS-01 | ✅ 已关闭 | 误报（详见登记表关闭说明） |
| BIL-01 | 🟡 部分修复 | 主断点已修；解析层「更明显侧」提取未做（增强项） |
| PRIV-02 | 🟡 部分完成 | purge 端点就绪；到期定时执行器待新环境落地 |
| TENS-01 衍生 UX 观察 | 🟢 | 紧张度选择器可发现性（区域卡→侧别按钮的交互层级） |
| DATA-03/05/06、ARCH-01、TEST-03/12 等 P1 | 整改中 | 详见登记表批次顺序 |
| CONTENT-01 动作图片 | 待整改 | 素材在产品侧，发布前需逐张验收 |
| UX-01 可访问性 | 待整改 | 弹层焦点管理 |

## 4. 后续工作路线图（按依赖顺序）

### 阶段 1：数据层迁移到 VPS ✅ 已完成（2026-08-23）

**正式入口：`https://66.154.101.204/RehabMind/`**（裸根 `/` 已改为 308 跳转到此——单一内容入口，老书签不断；`/assets/` 与 `/api/pilot/` 管线直通保持不变）

> 前缀实现说明：vinext 的 `basePath` 只烙进资产清单、路由挂载未实现（前缀页面 404），因此前缀由 nginx 完成——`location /RehabMind/ { proxy_pass http://127.0.0.1:3100/; }` 剥前缀转发，应用的根级绝对引用（/assets/、/api/pilot/、favicon/og 图）由同名 location 直通，两个入口均完整可用。

实际落地形态（与原计划差异见括号）：

1. ~~better-sqlite3 新实现~~ ✅ `db/sqlite-pilot-case-repository.ts`，与 D1 版同一接口；原生模块经 `createRequire` 运行时加载（绕开打包器内联 .node 失效问题）
2. ~~env 解耦~~ ✅ `app/api/pilot/_shared.ts#getPilotEnv`：Workers 读 bindings / Node 读 process.env，动态 specifier 防打包解析
3. **运行方式**：pm2 托管 `npm run start`（vinext Node 模式），应用监听 127.0.0.1:3100；ecosystem.config.cjs 自读 `.env`
4. **nginx**：四服务共存于同一 IP 证书站点——RehabMind 占根跳转与 `/RehabMind/` 后缀入口（Node 3100）；RehabGuide shop 于 `/shop/`（Gunicorn 3098，2026-08-23 短暂下线后恢复）；Clinic 于 `/clinic/`（8080）与静态 `/mobile/`；`location /api/pilot/` 最长前缀代理避开 Clinic 的 `/api/` 重定向；`client_max_body_size 4m` 让大载荷守卫在应用层按合同返回 413 JSON。裸根 `/` 为 308 跳转，唯一内容入口是 `https://66.154.101.204/RehabMind/`
5. **Secrets**：`~/rehabmind/app-src/.env`（chmod 600），含 PILOT_INVITE_TOKEN / PILOT_ADMIN_KEY / PILOT_INVITE_EXPIRES_AT(90天) / PILOT_SQLITE_PATH / PORT=3100；本地副本在开发机 `%TEMP%` 外的 `D:\Study\codex\project\.tmp-deploy-secrets.txt`——**请转移进密码管理器**
6. **验证**：集成套件 5/5 全绿指向 https://66.154.101.204 （真 TLS 校验，无豁免）；页面 SSR 标题与六步导航正常；Clinic(/clinic/) 与 /mobile/ 未受影响

部署脚本存档：`scripts/vps-recon*.sh`、`vps-deploy-setup.sh`（解包+npm ci+迁移）、nginx 配置以服务器 `/etc/nginx/sites-enabled/combined.conf.bak-*` 与仓库内 `docs/HANDOVER.md` 本节描述为准。

### 阶段 2：发布验收（半天）

1. 按发布手册（`docs/pilot-release-readiness-execution-runbook.md`）在新环境重跑全部阻断项
2. 人工走读 ×2（普通用户 + 专业人员视角）
3. 双侧全链路回归：mix10 走读需先补 TENS-01 相关交互处理（见 §6 已知问题）
4. 测试数据清点（admin purge 可用）

### 阶段 3：开放粉丝群 + 观察

- 观察 SAVE-02 恢复确认卡的实际感受
- 观察 0 分改善用户的留存（总结文案已加解释）
- 反馈面板 kind 分布

### 阶段 4：开放后迭代（不阻塞）

- MIX-04/09/10 浏览器证据、解析层优先侧提取、ARCH-01 阶段 C（useDecisionEngine，等多关节触发）、视觉 AI、管理后台增强

## 5. 关键文件与命令速查

```bash
# 质量门禁（提交前必跑）
npm run test:fast              # typecheck + build + 528 测试
npm run lint                   # 0 errors（仅 2 条 .wrangler 生成文件警告可容忍）
npm run test:logic:mutations   # 12 项变异全部 killed
npm run test:integration       # 本地需先起 dev server，设 D1_TEST_URL
npm run test:browser:p0        # 可选：P0 浏览器场景（需 Edge）

# 场景走读（真实业务回归）
$env:WALKTHROUGH_TIME01='1'; node scripts/real-browser-walkthrough.mjs
$env:WALKTHROUGH_WORSEN='1' / NO_CHANGE / ACTIVITY_BETTER / MIXED_WORSEN 同理
node scripts/real-browser-walkthrough-ankle.mjs / -patella.mjs

# VPS 访问
ssh -i ~/.ssh/id_ed25519 rehabdeploy@66.154.101.204   # 有 sudo
```

关键文件：

| 文件 | 说明 |
| --- | --- |
| `docs/rehabmind-quality-remediation-register.md` | 34+2 项缺陷/事项账本（状态权威来源） |
| `docs/internal-logic-coverage-matrix.md` | 规则↔证据覆盖矩阵 |
| `docs/rehabmind-test-plan.md` | 测试分层与执行口径（§11 整改方案） |
| `docs/pilot-release-readiness-execution-runbook.md` | 发布执行手册（含禁止开放条件） |
| `app/rehabmind-complete-demo.tsx` | 主组件（约 8700 行，阶段 C 重构指导见 `docs/refactor-use-decision-engine.md`） |

## 6. 已知问题与坑（重要！）

1. **双侧肌肉紧张度页的走读交互未完全自动化**：walker 在该页的选项定位需用 `.rm-muscle-location-picker` 作用域 + `button:has-text("两侧感觉接近")`（可见性过滤）；`.rm-muscle-location-card` 是 article 容器无 handler，点它无效。TENS-01 实验代码留在 `.tmp-real-case-walk.mjs` 死循环分支可参考
2. **本地 D1 外键无 ON DELETE 子句**：删除案例必须显式多表删除（参照 `hardDeleteCases` 顺序：叶子→根）
3. **PowerShell 编辑含中文/模板字符串的文件**：`-replace` + `WriteAllText` 会搞坏编码和转义——改代码一律用 Edit 工具或 Node fixer 脚本
4. **SSH 防爆破**：连续失败会封 IP；用对密钥一次连成
5. **`.first()` 匹配器偏移**：按钮点击后文本变化（如 反应更明显→更明显）会让同选择器匹配到另一实例——BEFORE/AFTER 对比实验必须锚定同一元素
6. **主组件 8700 行**：改前先读目标区域上下文；行号会随编辑漂移，用唯一文本锚点
7. **vinext 部署**：`wrangler deploy` 直接从源码打包会失败（virtual module）；正确流程 = `REHABMIND_CLOUDFLARE_DEPLOY=1 npm run build` 后 `npx wrangler deploy`（不带 --config，跟随 `.wrangler/deploy/config.json` 重定向）。VPS 部署则完全不用 wrangler
8. **测试基线数字**：当前 528 单测 / 12 变异 / 5 集成；新增测试后记得同步 runbook 与登记表数字

## 7. 给产品侧的待确认项

1. ~~双侧解析增强：「双/都…X侧更明显」→ 自动填 complaintPrioritySide~~ ✅ 已实现（2026-08-23 产品确认）：`intake-complaint-core.extractComplaintPrioritySide` 提取当前主诉中的单侧比较表述（更明显/严重/厉害；重/疼需带「更」），进入双侧模式时预填优先侧、可改。历史从句不参与。
2. ~~肌肉紧张度选择器的交互层级是否需要简化~~ ✅ 已做出口前置（2026-08-23 产品确认选 A）：区域卡上方新增显眼出口条「两侧差别不大？直接选：」（没有明显差别 / 两侧感觉接近 / 暂不判断），与选择器内部选项共用同一 toggle 状态；层级本身暂不再简化。
3. 0 分改善解释文案的措辞 → 产品同意挂到阶段 3 开放后按粉丝反馈观察，现在不改。

---

历史讨论与旧版长文档在 `docs/archive/`，不参与当前决策。
