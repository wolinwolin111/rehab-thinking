# 测试会话交接文档

**会话 ID**：test-session-2026-08-24~26
**当前测试工作树**：`D:\Study\codex\project\rehab-thinking-demo`（branch `main`，当前验证 HEAD `049a21c3b02a0990c0c3212d2615c96019bb82cb`；工作树中的未提交改动均为 QA 文档/测试/巡检脚本及构建生成物，开发生产源码已提交）
**上一轮隔离工作树**：`D:\Study\codex\project\rehabmind-agent`（branch `agent/testing`，commit `a805361`；仅作历史对照）
**前序文档**：`docs/handover/HANDOVER.md`（第一代会话手写）、`docs/quality/test-infrastructure-delivery-2026-08-26.md`（基础设施交付记录）
**创建日期**：2026-08-26
**适用对象**：接替测试窗口

---

## 最新补充：2026-08-27 `049a21c` 最终 QA 基线

### 2026-08-27 `3fe14b3` 肌肉定位图与训练素材回归

已完成生产提交 `3fe14b30fd9f2631413bcc7754767052bf366edd` 的专项回归。旧 `MUSCLE_ZONE_RECTS/atlas-v2` 合同已更新为 v1 底图、连续 SVG path、`data-region-id`、小腿三头肌单块以及训练缺图/有图的正向合同。组件测试 3/3、身体图浏览器合同 3/3、Pixel 5/iPhone 13 移动预览 2/2、视觉基线 3/3 通过；thigh/calf v1 资源 HTTP 200。证据目录：`artifacts/quality/playwright/muscle-target-3fe14b3`、`muscle-mobile-3fe14b3`、`muscle-visual-3fe14b3`。本次未修改生产规则。

本文件上方及后续旧章节记录的是 2026-08-26 测试窗口的历史快照；接替测试时，当前结论以《回归测试总表》的最终收口章节、真实浏览器覆盖矩阵的最终证据索引和同一 buildId 的 manifest 为准。

| 项目 | 最终值 |
|---|---|
| 修复提交链 | `a5774ec`～`bebfb4a`、`8a05742`、`8d62214`、`3764e5d`、`36687e2`、`049a21c`（含前序历史投影修复） |
| 当前 commit | `049a21c3b02a0990c0c3212d2615c96019bb82cb` |
| buildId | `local-049a21c3b02a-dirty-584c11ea5025` |
| 本轮重点 | T-09 四档快照、双侧完整纵向流程、处理后改善/无变化/加重、训练后加重锁定、session 2 反馈绑定、管理员脱敏、runId 清理、固定 seed 真实工作台探索和移动预览 |
| 快速质量门禁 | `npm run test:fast` 通过：architecture boundary、typecheck、build、137 个 Node 测试文件通过 |
| lint | 0 errors、2 个既有 warning：`dispatchPilotSync` 缺依赖、`imaging` 不必要依赖；本轮新增 storage effect warning 已消失 |
| 定向浏览器 | `target-final-049a21c-584c11ea-20260827`：E2E-04 1/1 passed，且服务端无 stage-bypass 告警 |
| 整体浏览器 | `overall-final-049a21c-584c11ea-20260827`：20/20 passed，无 skipped |
| 完整 Edge | `full-final-049a21c-584c11ea-20260827`：48/48 passed，无 skipped |
| Edge release | `release-final-049a21c-584c11ea-20260827`：5/5 passed |
| 其他浏览器 | `mobile-final-049a21c-584c11ea-20260827`：Pixel 5/Chromium、iPhone 13/WebKit 2/2；`firefox-final-049a21c-584c11ea-20260827`：1/1 |
| 本地巡检 | `artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md`：42/42 通过，commit/buildId 已绑定 |

证据入口：`artifacts/quality/playwright/target-final-049a21c`、`overall-final-049a21c`、`full-final-049a21c`、`release-final-049a21c`、`mobile-final-049a21c`、`firefox-final-049a21c`、`explore-final-049a21c`，以及 `artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md`。这些 manifest 均绑定本地实际 commit `049a21c3b02a0990c0c3212d2615c96019bb82cb` 和同一 buildId。

本次没有修改测试断言来制造通过；新增测试严格使用当前真实可见控件、真实 test workbench fixture 和当前正式文案。E2E-01～15 已形成页面证据；当前仅移动原生 M2～M5 为环境未覆盖，移动预览与 Firefox 仍按限定范围报告。

---

## 一、会话定位

本会话任务：**建立测试基础设施 → 守住主线 → 逐批验收开发交付 → 建立双轨防线 → 出具审计报告**。核心产出是可长期运行的测试防线，而非一次性跑完的脚本。

---

## 二、已完成的工作（按时间线）

### 阶段 A：基础设施建立（08-24）

| 批次 | 内容 | 产出 |
|---|---|---|
| A0 | 维护脚本建立 | npm run db:reset / db:reset-production / typecheck / build |
| A0a | 本地 SQLite 重建 | 4 个启动迁移（00-03），可重复执行 |
| 1a | 工作流投影穷举 | 163,840 条投影，4 个变异全杀 |
| 1b | 序列探索 | 200 种子 × 70 动作 = 14,000 序列，3 个变异全杀 |
| 1c | 生产者核查 | 旧死词汇审计（C-1 来源） |
| 1.5 | 渲染行为合同 | SSR 合同模式建立，6 个组件首版 |
| 2 | 快照 fuzz | 3,000 组随机输入，2 个变异全杀 |
| 2b | 真实快照回灌 | IndexedDB 导出 → 迁移 → 入库 → 重启恢复 |
| 3+5 | 双轨巡检 | inspect-local.mjs：6 视口 + 遮挡 + 基线 + axe |
| 4 | 可读性 + 追溯 | 38 条守卫关系双向追溯 |

### 阶段 B：测试窗口守护主线（08-24 ~ 08-26）

| 事件 | 动作 |
|---|---|
| 开发推 P0 修复 | test:fast 全量回归 → 25 组件套件全绿 |
| 浏览器中断故障 | 根因：prebuild 缺少数据库迁移文件（旧 `data/` 被 gitignore）→ 修复后重启 3000 |
| BIL-01 断言回归 | 根因：源码修复了优先级选择逻辑 → 同步合同断言 → 全绿 |
| 巡检工具稳定性 | 截图漂移根因定位（字体/水合晚到）→ networkidle + fonts.ready + animations disabled → 三连稳 |

### 阶段 C：逐批验收与定性转绿（08-25 ~ 08-26）

开发已完成当前批次并停在 `fdaee6f`；我方在 dirty worktree 上执行本轮验收：

| 动作 | 结果 |
|---|---|
| 3 个合同适配（RQ-S4 横幅禁令 + wiring 加固 + 引导卡移除） | test:fast exit=0 |
| 渠道文案跟进（抖音粉丝群 → 抖音） | release specs 5/5 |
| 焦点教程适配（app-shell dismiss + inspect-local dismiss） | 巡检双视口双绿 |
| DEF-CONSENT-01 永久防线（新建 release spec，backdrop=0 断言） | 5/5 全过 |
| 视觉基线稳定性修复（截图 settle 策略） | 三连 exit=0 |
| 主线基线 | main = fdaee6f；当前工作树仍含开发与测试未提交改动 |

### 阶段 D：设计文档审计（08-26）

| 动作 | 产出 |
|---|---|
| 决策引擎可测需求提取 | ~200 条规则（A 安全分流 → M 跨次状态） |
| UI/流程可测需求提取 | 132 条（17 主题组） |
| 质量文档盲区与矛盾分析 | 15 条共同承认盲区 + 10 项文档间矛盾 |
| 缺口清单逐条明细 | 11 条缺口（5 高 + 6 中）+ 整改方案 |

---

## 三、当前状态快照

| 指标 | 值 |
|---|---|
| worktree HEAD | `fdaee6fc5ca3beb246ed5184650540d6a78507a8`（当前 main） |
| 当前 buildId | `local-fdaee6fc5ca3-dirty-085a66c496a1` |
| test:fast | **exit=0，全绿；135 个 node test 文件** |
| lint | **exit=0，0 error / 0 warning** |
| Edge 全量 | **27 pass / 5 fail / 9 skipped；失败为 2 个 UX 风险 + 3 个旧视觉基线** |
| Edge release | **5/5 pass** |
| 移动预览 | **Pixel 5/Chromium + iPhone 13/WebKit：2/2 pass** |
| Firefox 高风险 | **1/1 pass；仅高风险冒烟范围** |
| 固定 seed 探索 | **seed=20260827，真实可见控件探索 pass** |
| 证据道巡检 | **40/42 pass；390px、1440px 建案后入口门浮层未关闭，其他 HTTP/API/布局/运行时/axe/视觉/遮挡通过** |
| 工作树状态 | **dirty；未把生产修复混入本轮测试改动** |

**注意**：当前测试工作树同时包含开发交付和测试侧未提交改动；本轮测试结论绑定 dirty build，不能把它当作干净发布提交。下一轮必须先确认开发提交并重新生成干净 buildId。

---

## 四、测试资产目录

```
tests/
├── unit/domain/          63 个  # 决策引擎核心单测（最强防线）
├── unit/infrastructure/  25 个  # 持久化/同步/迁移/安全
├── unit/features/         3 个  # 移动导航/训练导航/恢复基线
├── unit/quality/         12 个  # 架构边界/发布指纹/审计合同
├── workflow/             18 个  # 投影穷举/序列探索/场景矩阵/不变量
├── component/            17 个  # 源码字符串合同 + SSR 渲染合同
├── integration/          12 个  # SQLite 迁移/HTTP 合同/故障注入/快照回灌
├── browser/release/       5 个  # Playwright 发布门禁（@release）
├── browser/p0/            2 个  # 决策门控 + 持久化（遗留，计数中）
├── browser/divergent/     2 个  # 决策组合 + 肿胀队列
├── browser/known-defects/ 1 个  # UX 回归（当前仍有2项失败）
├── browser/overall/       5 个  # 首次、单膝、恢复、异常路径
├── browser/contracts/     1 个  # 评分滑杆与身体图合同
├── browser/exploration/   1 个  # 固定 seed 真实工作台探索
├── browser/mobile-preview/1 个  # Pixel 5 / iPhone 13 预览
├── browser/firefox/       1 个  # Firefox 高风险预览
├── browser/visual/        1 个  # 关键布局（旧基线待确认）
└── browser/support/       4 个  # 辅助工具

scripts/quality/
├── inspect-local.mjs      # 证据道巡检工具（6 视口 + axe + 创建流程 + 反馈探针）
└── run-browser-tests.mjs  # 浏览器测试运行器
```

---

## 五、关键命令速查

| 命令 | 用途 | 耗时 |
|---|---|---|
| `npm run test:fast` | 逻辑层全量回归（含 workflow + unit + component + integration） | ~3 min |
| `npm run lint` | 静态分析 | ~5s |
| `npm run test:browser:release` | 浏览器发布门禁（5 条 @release 场景） | ~23s |
| `npm run test:browser:full` | Edge 全量页面回归（41 条，含 skipped/expected-fail） | ~3.5 min |
| `npm run test:browser:overall` | 当前整体闭环（13 条，4 pass / 9 skipped） | ~32s |
| `npm run test:browser:mobile-preview` | Pixel 5 + iPhone 13 独立移动预览 | ~43s |
| `npm run test:browser:firefox-risk` | Firefox 高风险流程预览 | ~14s |
| `node scripts/quality/run-browser-tests.mjs exploration-current tests/browser/exploration --project=edge-full` | 固定 seed 真实工作台探索 | ~13s |
| `node scripts/quality/inspect-local.mjs http://localhost:3000 --visual --axe` | 证据道巡检（6 视口 + axe + 视觉基线 + 反馈探针） | ~1 min |
| `start-dev-3001.cmd` | worktree 开发服务器（port 3001） | 手动 |

---

## 六、已修复的缺陷

| 缺陷 | 根因 | 修复者 | 修复方式 |
|---|---|---|---|
| DEF-CONSENT-01 | 同意门浮层建案后不关闭、刷新不消失 | 开发（双层修复）+ 我方（永久防线） | ① localStorage 先于建案 ② 15s 超时竞速 ③ 新增 release spec backdrop=0 断言 |
| C-1 | onboarding-steps.ts 残留死词汇 | 开发 | 删除 |
| C-2 | onboarding-steps.ts 未用导入 | 开发 | 删除 |
| RQ-6a | 步骤进度 aria-label 缺失 | 开发 | 添加 role=img |
| RQ-6b | 欢迎页 footer 对比度不足 | 开发 | 调整颜色 |
| 截图漂移 | 截图早于字体加载/水合落定 | 我方 | networkidle + fonts.ready + rAF + animations disabled |

---

## 七、当前工作树改动（基线 fdaee6f，尚未形成干净验收提交）

| 文件 | 批次 | 内容 |
|---|---|---|
| `src/` 多个工作台/恢复/移动组件 | 开发交付 | 当前实现改动，测试仅做验收，不在本轮修复 |
| `src/domain/rehab/followup/snapshot-freshness-core.ts` | T-09 | 快照陈旧规则实现，浏览器夹具尚未接通 |
| release.generated.ts | 自动 | 构建生成物 |
| `tests/`、`playwright.config.ts`、质量文档 | 本轮测试 | 测试脚本、证据分类和报告更新 |

**本轮未修改生产规则；开发提交后仍需将 dirty build 重新跑成干净 commit/buildId，才能作为发布验收身份。**

---

## 八、缺口清单（历史审计基线 G-01 ~ G-11）

本节保留最初审计时的缺口编号和整改方向，便于追踪，不代表当前状态。当前是否收口，以第十二节、本轮回归总表和同一 buildId 的浏览器证据为准；例如 G-01/G-02 已有测试合同，但完整滑杆交互和人体图跨区域保留仍未全部收口。

### 🔴 高风险——无有效防线

| 编号 | 缺口 | 具体情况 | 整改方案 |
|---|---|---|---|
| G-01 | 评分滑条行为语义裸奔 | 唯一断言在 known-defects（已除名目录）；滑条初始值、松手记录、复测引用分、无基线不出数字卡——全无行为验证 | 新建 `tests/browser/release/scoring-semantics.spec.ts`，4 条用例 |
| G-02 | 人体图交互语义裸奔 | 组件合同只测渲染映射（类名/prop名）；连续多点/取消/跨区确认/冲突保护/字段串写——全无交互验证 | 新建 `tests/browser/release/body-map-interactions.spec.ts`，3 条核心用例 |
| G-03 | 反向承诺零守护 | 设计明文"当前不加摄像头/AI"，测试库 grep「相机/camera」零命中 | 新建 `tests/component/product-scope-guard.test.mjs`，构建产物白名单扫描 |
| G-04 | RET-03 死分支悬置 | 真实走完膝处理队列，复用分支自然前置从未出现；夹具可达但不能当完整 E2E；两个多月无人认领 | 定性请求单：开发二选一（触发序列 or 删除） |
| G-05 | DATA-09 日志出口未取证 | wrangler tail 连接超时；test-plan 已宣布 Cloudflare 不属当前合同——前提可能已消失 | 定性请求单：开发裁定合同状态 |

### 🟡 中风险——"声称 vs 实际"与 oracle 溯源

| 编号 | 缺口 | 具体情况 | 整改方案 |
|---|---|---|---|
| G-06 | 384 权限穷举声称存疑 | pilot-scenario-coverage 声称 384 组有独立产物；当前只有行驱动决策表 | 先查 git 历史；若无 → 补参数化测试 |
| G-07 | internal-logic 14 行部分覆盖 | 正向用例存在但缺变异击杀证据 | 逐行补 1 个最危险变异，优先级：加重停止 > 动态重排 > 返回修改失效 |
| G-08 | 字符串合同结构性弱点 | 17 个 component 合同中多数仍用源码正则；DEF-CONSENT-01 已实锤 wiring 字符串全绿但运行时坏 | 分批 SSR 化：评分滑条、保存状态条、信息密度安全区 |
| G-09 | 文档矛盾 10 项未回写 | 教程步数 5/6/4 互斥、legacy 证据仍标"本轮覆盖"、D1 地位三文打架…… | 定性请求单：开发逐条回写矩阵状态 |
| G-10 | 异常路径设计空白 | 离线 UX、存储禁用降级、多标签并发——设计文档均未定义 | 产品补需求；在此之前加探测 |
| G-11 | G 批次浏览器层零验证 | T-07/T-08（投诉转移/归档会话）领域层有测试，浏览器层无真实 UI 验证 | 新建 1 条二诊冒烟用例（随下批同步窗口做） |

---

## 九、文档资产

| 文档 | 位置 | 用途 |
|---|---|---|
| 定性请求单 | docs/quality/determination-request-2026-08-26.md | 7 个合同红灯的解释请求（已闭合） |
| 定性回复 | docs/quality/determination-response-2026-08-26.md | 开发对红灯的逐条判性 |
| 交付记录 | docs/quality/test-infrastructure-delivery-2026-08-26.md | 双轨防线建立过程 + 批次产出 |
| 缺陷报告 | docs/quality/defect-consent-gate-linger-2026-08-26.md | DEF-CONSENT-01 完整证据包 |
| 本交接文档 | docs/handover/test-session-handoff-2026-08-26.md | 接替者参考 |

---

## 十、协作约定

1. **沟通协议**：开发提出 bug 描述 + 复现步骤 → 我方验证 → 定性请求单（开发判性）→ 我方改合同 → 全绿
2. **主语标注**：所有 commit message 用英文祈使句
3. **提交前必跑**：test:fast + lint + browser release specs
4. **基线原则**：每次交付前重跑 test:fast + lint + release + inspection；本轮 inspection 为 40/42，Edge 全量为 27/5/9，存在失败项，不能写成验收完成
5. **worktree 约定**：`D:\Study\codex\project\rehabmind-agent` 为测试隔离区；主仓库 `D:\Study\codex\project\rehab-thinking-demo` 为开发工作区；merge 只在 worktree 内执行
6. **PowerShell 编码陷阱**：永远不要用 `Get-Content -Raw | -replace` 处理含中文的文件——会把 UTF-8 搅成乱码；改用 Edit 工具

---

## 十一、接替者第一步

1. 确认开发的 H batch 已提交（检查 main log）
2. 在 worktree 执行 `git merge main`
3. 跑 `npm run test:fast && npm run lint && npm run test:browser:release` 确认基线
4. 如果 H batch 有新组件/新行为 → 对照 G-01~G-11 缺口清单，从高风险项开始补建浏览器层测试
5. 如果开发提交了新批次 → 走定性回复 → 改合同 → 全绿循环

---

**上一轮交接字段（历史）**：test-session-2026-08-24~26；HEAD `a805361`；test:fast/lint/release/inspection 当时均记录为通过。当前结论以第十二节和本轮证据 manifest 为准。

---
## 十二、本轮新增执行范围（2026-08-26 修订）

本节是对上方历史交接记录的执行范围修订。它不把计划中的测试写成已通过，也不改变生产规则；接替测试窗口必须以当前主线 commit、buildId 和实际证据产物为准。

### 12.1 当前基线与证据身份

每一轮测试开始前，在测试隔离工作树执行以下核对，并把结果写入本轮报告：

~~~powershell
git status --short --branch
git log -1 --format="%H %cI %s"
git merge --ff-only main
npm run prebuild
~~~

随后读取构建生成的 release manifest，核对至少以下身份字段：commitSha、buildId、appVersion、knowledgeVersion、decisionVersion、ruleVersion、snapshotSchemaVersion。任何证据产物的身份不一致，只能标为 identity_mismatch，不能合并到当前构建结论。

本次修订的文档基线是 fdaee6f。上方“最后已知状态”属于前一轮 a805361 的历史记录；本轮如果没有重新执行，不得把它改写成新的通过证据。

### 12.2 快照陈旧规则（T-09）

快照恢复必须按实际经过时间计算，不使用保存时冻结的“急性/慢性”标签替代时间判断。经过时间以“快照最后一次成功保存/记录时间”到“本次恢复时间”为准；测试夹具必须显式控制这两个时间点。

| 实际经过时间 | 用户可见行为 | 是否阻断 | 需要重新确认的内容 |
| --- | --- | --- | --- |
| < 24 小时 | 不显示陈旧提醒；按原流程恢复 | 否 | 无额外确认 |
| >= 24 小时且 < 7 天 | 显示非阻断提醒，说明距上次记录已过去多久 | 否 | 用户可以继续；不改写原答案 |
| >= 7 天，慢性或非时间敏感案例 | 显示强提醒 | 否 | 提醒重新查看当前状态，但不强制重做 |
| >= 7 天，急性或时间敏感案例 | 显示强提醒并暂停继续入口 | 是 | 必须重新确认当前症状、安全信号和发生时间 |

确认规则：

- 系统不得根据经过时间自动修改用户原来的答案、主诉原话、侧别、位置或历史记录；
- 重新确认产生的是当前恢复上下文，不覆盖原始快照；
- 急性/时间敏感案例在 >= 7 天未完成确认时，不得进入普通评估、处理或训练；
- 慢性案例只提醒、不强制阻断；
- 规则测试验证边界值 23:59:59、24:00:00、6d 23:59:59、7d 0:00:00，浏览器测试验证提醒、阻断和原答案保留。

职责分层：时间差计算和路由属于 domain/workflow 规则测试；提醒与阻断属于真实浏览器场景；快照字段、恢复和历史保留属于 persistence/integration 测试。不要用浏览器穷举替代时间边界组合测试。

### 12.3 整体测试闭环

以下是本轮必须形成真实用户闭环的场景集合。每条场景均需从真实可见控件开始；若因数据前置必须使用正式 API 或隔离快照，报告中要单独标出“边界夹具证据”，不能称为完整用户路径。

| 场景 ID | 整体路径 | 必须覆盖 | 禁止出现 | 证据层 |
| --- | --- | --- | --- | --- |
| E2E-01 | 首次进入 → 来源 → 同意 → 匿名建案 | 来源选择、同意门、匿名案例、教程入口 | 未同意即可使用；同意后遮罩残留 | L6 浏览器 |
| E2E-02 | 单侧膝正常流程 | 主诉、位置、评估、处理复测、训练反馈、总结 | 双侧字段串线；直接跳过评估或复测 | L6 浏览器 |
| E2E-03 | 急性踝扭伤安全停止 | 急性时间、肿胀/骨性风险/安全信号、保存出口 | 继续普通评估、处理或训练 | L6 浏览器 |
| E2E-04 | 双侧优先侧与双侧评估 | 选择优先侧、左右分别评估、左右分别复测 | 用一个侧别覆盖另一侧；只评一侧后进入普通训练 | L6 浏览器 |
| E2E-05 | 没有明确主诉动作 | 保留一般症状、不给虚假动作分数、进入观察/进一步判断出口 | 自动猜测固定动作；生成伪造前后分数 | L6 浏览器 + L2/L3 |
| E2E-06 | 动作无法完成 | 分别验证疼痛、没力/撑不住、害怕、不知道等原因 | 无法完成被当作正常；生成普通完成分数 | L6 浏览器 + L2/L3 |
| E2E-07 | 处理后改善 | 记录处理前后关系并进入下一合法阶段 | 把处理结果误当训练后结果 | L6 浏览器 |
| E2E-08 | 处理后无变化 | 保留无变化、限制进阶、给出观察/复评出口 | 无变化被显示为成功；自动加大训练 | L6 浏览器 |
| E2E-09 | 处理后加重 | 停止当前处理、确认相关变化、聚焦复查或保存结束 | 继续叠加处理、直接训练或总结 | L6 浏览器 |
| E2E-10 | 训练后加重 | 反馈门槛、加重提示、退阶/停止规则 | 未反馈即可结束；无限退阶循环 | L6 浏览器 + L2/L3 |
| E2E-11 | 刷新恢复 | 未完成步骤、原答案、快照和当前阶段恢复 | 回到错误阶段；丢失用户答案 | L6 浏览器 + L5 |
| E2E-12 | 第二次康复与新问题 | 保留历史、追加新记录、新问题触发新路径 | 覆盖第一次康复；把旧问题当成当前主诉 | L6 浏览器 + L5 |
| E2E-13 | 反馈提交 | 当前模块、目标康复记录、提交位置正确绑定 | 反馈在无案例前出现；绑定到错误记录 | L6 浏览器 + L5 |
| E2E-14 | 管理员脱敏 | 匿名编号查询、错误凭据拒绝、响应和日志脱敏 | 令牌、完整主诉、内部堆栈泄露 | L5/L7 |
| E2E-15 | 测试数据清理 | 默认清理本轮创建的数据，保留开关可审计 | 批量删除非本轮案例；失败后遗留不可追踪 | L5/L7 |

本表中的 E2E-01 至 E2E-15 是交接阅读简称；正式 scenarioId 以 tests/workflow/scenario-registry.json 中的完整 ID 为准。

整体闭环不能由 test:fast 单独代替。test:fast 负责规则、workflow、组件和类型/构建防线；整体闭环必须有真实页面证据，服务端隔离、管理员脱敏和清理还需集成/安全层证据。

### 12.4 回归测试总表

缺陷回归统一登记在 [regression-test-register-2026-08-26.md](../quality/regression-test-register-2026-08-26.md)。每条记录必须绑定：缺陷编号、复现步骤、修复提交、测试层、应出现结果、禁止出现结果、当前构建、最后验证时间和证据产物。

至少覆盖以下已修复或待验证问题：

- 同意门：DEF-CONSENT-01；
- 侧别和标记：M-01、M-02、M-04、M-05、M-07；
- 外伤矛盾、安全门和未知/无法完成：M-03、M-06、T-01、T-04；
- 动态队列、处理/训练加重、复测：T-02、T-10、T-11、RET-02、RET-03、RET-06；
- 随访历史和趋势：T-03、T-05、T-06、T-07、T-08；
- 快照陈旧：T-09；
- 保存、同步、冲突、移动弹层：DATA-04、DATA-09、UX-01、TEST-10。

同一缺陷如果有多个修复提交，全部记录；只有在当前构建上重新执行并保存证据后，才可以把状态从“已修复待验证”改成“当前构建已回归”。
### 12.5 TEST-03：纯规则随机 + 真实工作台探索

保留现有纯规则随机测试，不降低其职责：它继续负责组合逻辑、状态不变量和变异测试，使用固定随机种子集合产生可重复结果。

同时新增固定 seed 驱动的真实 RehabMind 工作台探索，要求：

- 每个 seed 生成确定的操作轨迹，并在报告中记录 seed、浏览器项目、commit、buildId；
- 只能点击、填写、选择、拖动真实可见控件；不得直接调用 React state、隐藏字段或复制简化业务模型；
- 失败时保存最小化操作轨迹、最后页面截图、Playwright trace、页面运行时错误、快照/IndexedDB 导出；
- 失败序列必须可重放，并在收缩后登记为固定回归场景；
- 真实页面探索的失败不能被纯规则随机的全绿结果覆盖。

当前脚本：`tests/browser/exploration/real-workbench-seeded-exploration.spec.ts`。本轮 seed=`20260827` 在 Edge 全量中通过；失败分支会保存 seed、操作轨迹、截图和 Playwright trace，当前成功运行的产物在 `artifacts/quality/playwright/full`。它只计为探索证据，不替代规则/流程组合测试。

### 12.6 TEST-10：移动预览，不作为正式发布硬门槛

本轮按主要用户手机端使用场景做独立移动预览，暂不把移动预览设为正式发布硬门槛：

| 浏览器项目 | 设备/引擎 | 本轮职责 |
| --- | --- | --- |
| pixel5-preview | Pixel 5 / Chromium | 主移动预览 |
| iphone13-preview | iPhone 13 / WebKit | iOS 预览 |
| edge-release | 桌面 Edge | 保留当前桌面发布基线 |
| firefox-risk | Firefox | 只跑高风险流程，不做全量兼容门禁 |

移动预览至少覆盖：输入、人体图、滑条、保存与刷新恢复、安全停止、双侧、处理/训练加重、训练反馈、总结、弹层焦点和横向溢出。每个设备项目单独生成结果、截图、trace 和运行时错误摘要；不能用桌面 Edge 结果代替移动结果。

本轮命令与结果：

~~~powershell
npm run test:browser:mobile-preview
npm run test:browser:firefox-risk
~~~

Pixel 5/Chromium 与 iPhone 13/WebKit 本轮 2/2 通过；Firefox 高风险 1/1 通过。当前脚本仍是预览冒烟，尚未覆盖移动端人体图、滑条、保存恢复、安全停止、双侧、加重、训练反馈、总结等专门行为；`npm run test:browser:release` 仍只表示桌面 Edge 发布基线。

### 12.7 每轮测试顺序

固定顺序如下，报告必须绑定本轮版本身份和证据目录：

1. 同步主线，核对 commit/buildId/schema/version；
2. 执行定向回归：对应缺陷编号的规则、workflow、集成和浏览器场景；
3. 执行整体测试闭环；
4. 执行 npm run test:fast、npm run lint；
5. 执行集成、安全和数据健康检查：npm run test:integration、npm run test:vertical、npm run test:security、npm run test:sqlite:health、npm run test:migrations:compat；
6. 执行桌面 Edge 发布基线：npm run test:browser:release；
7. 单独执行移动预览和 Firefox 高风险流程；
8. 执行 node scripts/quality/inspect-local.mjs <base-url> --visual --axe；
9. 写回 scenario registry、真实浏览器覆盖矩阵和回归总表，并保存 manifest、截图、trace、日志和快照。

组合逻辑继续由 domain/workflow 测试负责；浏览器层只验证代表性真实路径、关键反向断言和固定 seed 探索，不穷举所有临床组合。

### 12.8 本轮结果、未覆盖与不得误报为已覆盖的项目

前序失败记录仍保留在下方历史章节，不与当前结果混用。当前 `049a21c` 已在同一 commit/buildId 上完成重绑验证：E2E-04 定向 1/1、整体 20/20、full Edge 48/48、release 5/5、移动预览 2/2、Firefox 高风险 1/1、inspect-local 42/42，均无失败；整体与 full 已无 skipped。

仍不得写成完整覆盖的项目：

- T-09 四档真实快照边界、双侧低负荷 gate、第二次康复/新问题历史投影、网络/超时/本机存储失败页面边界已形成当前浏览器证据；它们不再列为未覆盖。
- E2E-01～15 均已由当前真实页面测试收口；E2E-04 同时覆盖单侧未完成低负荷 gate 和左右分别评估、处理、复测的完整纵向闭环。
- 移动预览已通过，但仍是 Pixel 5/iPhone 13 的 M1 预览；人体图、滑条、保存恢复、安全停止、双侧、加重、训练反馈、总结等移动专门行为尚未形成逐项证据；Android M2～M5 仍无 `adb`、`emulator`、`gradle` 或 APK 证据。
- 本地工作树仍含 QA 未提交改动及生成文件，因此当前 buildId 是可审计的 dirty QA 基线，不是干净发布候选；inspect-local 320px 差异 0.34% 已通过，不登记为生产缺陷。

上述未覆盖只属于 Android M2～M5 缺运行环境/产物；不得用规则层或移动预览结果替代。

### 12.9 需要开发会话补齐的测试接缝

当前没有待开发补齐的业务测试接缝。`049a21c` 已提供并通过双侧纵向、处理、训练、session 2 反馈及管理员/清理接缝；只保留移动原生运行环境边界。

| 项目 | 开发需要提供 | 测试收口标准 |
|---|---|---|
| TEST-10 移动专门行为（环境/测试范围） | 稳定的 Pixel 5/Chromium、iPhone 13/WebKit 前置；若宣称 M2～M5，另提供 emulator/adb/gradle/APK 环境 | 移动专门覆盖输入、人体图、滑条、保存恢复、安全停止、双侧、加重、训练反馈、总结、焦点和横向溢出；独立报告，不冒充 Edge release |

开发回复至少应包含：入口或 fixture 使用方式、稳定的可见文案或 `data-testid`/ARIA、schema/版本影响、提交号、`typecheck` 和 `build` 结果。当前已发送到开发会话 `01a03e75-6982-7a01-a248-0ef50ee3ac56`。

### 12.10 本轮测试提交边界

本轮允许提交测试脚本、测试配置、场景登记、覆盖矩阵、回归总表和证据工具；禁止把快照时间重算、提醒/阻断逻辑、侧别语义或其他生产规则修复混入测试提交。发现生产规则缺陷时，先在回归总表登记复现与预期，再单独进入开发修复提交。
