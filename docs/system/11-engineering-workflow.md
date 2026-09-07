# 11 · 工程协作与测试体系（Engineering Workflow & Test System）

> 定位：回答"这个项目怎么两个人一起开发、怎么验证、怎么接手干活"。产品/领域/架构真源见 01–10；本文所有测试体系描述的权威来源是 **agent/testing 分支的 `tests/README.md`**（dev 树自带的 tests/ 副本已过期，见 §4）。
> 状态：v1（2026-09-07）。§3/§4 基于开发侧对测试分支的只读观察，已请测试侧校对。

## 1. 双分支协作模型

| 分支 | 归属 | 写入方式 |
|---|---|---|
| `origin/main` | owner | 只有 owner 合并；长期落后属正常 |
| `agent/dev-20260901` | 开发会话 | dev 本地 main 提交后 `git push origin main:agent/dev-20260901`（显式 refspec，禁止裸 push） |
| `agent/testing` | 测试会话 | 测试侧自行推送；dev 只读（`git show origin/agent/testing:<path>`） |

- **文件权属（B 类边界）**：`tests/**`、`docs/quality/**`、`src/infrastructure/pilot/release/release.generated.ts`、`artifacts/`、`scripts/quality/inspect-local.mjs`、`docs/handover/test-session-handoff-*` 归测试侧；开发侧只读不改不提交。其余为 A 类，开发侧负责。详见 07 §5。
- **信息传递**：两个会话不直接通信，**由 owner 转述**。`docs/handover/test-notice-2026-09-01-batch-sha-bindings.md` 是开发侧的轮次制记录档（每轮改动/裁定/解钉项登记于此，供追溯），不是通信通道。
- **解钉流程**：开发侧改动破坏 B 类字面断言时，不自行修测试，而是在通知档登记"解钉项"（文件:行号＋新旧表达式＋行为是否变化），由测试侧按行为迁移断言。

## 2. 开发侧验证纪律（不可协商）

1. **真实浏览器验证**：行为声明必须来自真实页面交互（Playwright 驱动、真实键入触发 React onChange，`fill()` 合成值不算），不接受"代码看起来对"。
2. **等价性验证禁止循环论证**：迁移/重构类改动的"旧值"必须取自 git 基线（`git show <pre-fix-sha>:<file>`），不得从改动后的新位置读取——步骤 1 空数组回归即因此漏检（主控方案 §15.1）。
3. **套件失败集合 stash 前后逐条比对**：改动前后各跑一遍 node 套件，失败集合必须逐条相同（或差异全部可解释）；只看"通过数"会漏。
4. **裁定落地必须验证到活渲染路径**：数据层改完≠用户看到；golden 锁目录输出曾给出"已生效"假象（主控方案 §16.6）。
5. **最小充分**：不发明裁定外的剂量/范围/抽象；有意取舍（如不支持区选择器不收起）必须记录理由。

## 3. 测试体系全景（权威：测试树 tests/README.md）

### 3.1 目录与规模（agent/testing，2026-09-06 实测）

| 目录 | 职责 | 文件数* |
|---|---|---|
| `tests/unit/domain/` | 生产领域纯函数、知识引用一致性 | unit 合计 106 |
| `tests/unit/infrastructure/` | 同步、知情同意、安全、服务、快照合同 | 〃 |
| `tests/unit/quality/` | 质量工具自测（不计业务覆盖） | 〃 |
| `tests/workflow/` | 工作流轨迹、决策表、不变量、种子探索 | 20 |
| `tests/component/` | React 展示边界、页面适配、接线合同 | 15 |
| `tests/integration/sqlite-api/` | 真实 SQLite＋route/service 纵向集成 | （.integration.mjs） |
| `tests/browser/` | 真实界面/路由/资源接线（不穷举康复组合） | 31 spec |
| `tests/support/`、`tests/fixtures/` | 生产模块加载器、场景输入 | — |

\* 按 `*.test.*`/`*.spec.*` 统计，不含 integration 后缀。

### 3.2 证据等级（测试树 README 原文口径）

1. 正式生产函数/流程编排器测试＝内部业务逻辑主要证据；2. SQLite＋HTTP 集成＝数据与权限合同；3. 组件测试＝页面适配与本地状态接线；4. 浏览器＝只证明真实界面接线；5. 源码字符串/HTML 字符串/简化模型＝仅辅助证据。**新增回归必须先证明能在目标错误实现上失败。**

### 3.3 正式入口（测试树）

`test:fast`（边界＋typecheck＋build＋unit/workflow/component）／`test:integration`／`test:logic:mutations`（定向错误注入）／`test:browser:release`（4 条最小发布接线）／`test:summary`（按构建身份汇总证据与阻塞）。开发侧门禁（`check:*` 系列）总表见 07 §3。

### 3.4 场景登记与测试工作台

- `tests/workflow/scenario-registry.json`：**100 条**场景登记（scenarioId/ruleIds/priority/evidenceType/script/status/releaseRequired；status ∈ verified/partial/blocked/failed）。registry 校验门禁 100 ok。
- `src/features/rehabmind/test-workbench/`（A 类，开发侧维护）：`/test` 路由的场景目录 `scenario-catalog.ts`（full_flow/step 直达，仅测试用途，零生产影响）。测试侧新增场景需开发侧复核结构与类型（第 29 轮先例）。
- Playwright：`playwright.config.ts`——`WALKTHROUGH_URL` 默认 `http://localhost:3000/`，浏览器通道默认 **msedge**，产物落 `artifacts/quality/playwright`。

## 4. 套件基线与"过期副本"陷阱（新模型必读）

- **权威基线在 agent/testing**：node 796/0、full 74 passed、registry 100 ok（run reg-20260906065010-13516，verdict=passed）。
- **dev 树自带的 tests/ 是过期副本**：直接 `node scripts/quality/run-node-tests.mjs tests/unit tests/workflow tests/component` 在 dev 树会得到 **58 条预存红**（boundaries/first-use:43/rendered-html 等——对应修复早已落在测试分支）。这 58 条不是回归信号；回归信号是**与改动前失败集合的差集**。
- 结论性口径（第 29 轮裁定）：批次 0–7 在权威测试树上真回归仅 1 条（problem-ledger-core，测试侧已修）。

## 5. 工具链与环境备忘（Windows）

- **PowerShell 内联 `node -e` 含中文/正则/引号必坏**——一律写临时 `.mjs`（`*.tmp.*` 已 gitignore）执行后删除。
- **dev server 只绑 `::1`**：Playwright 用 `http://localhost:3000/` 或 `http://[::1]:3000/`；`127.0.0.1` 会拒绝。
- **禁止把 node_modules 以 junction 接入 git worktree**：`git worktree remove --force` 会沿链接清空真实依赖（§15.2，实际发生过）。
- docx 校验用 `py -3` 且先 `$env:PYTHONUTF8=1`。
- 产品入口链：welcome「开始康复」→ 来源 gate（radio＋继续）→ 知情同意 gate（checkbox＋同意并创建匿名案例）→ 症状输入 `#chief-description`。自动化脚本必须逐 gate 处理，弹窗会拦截 pointer events。

## 6. 文档体系与镜像

- **真源**：`docs/system/01–11`＋`docs/README.md` 索引（冲突裁决序见 README）。历史与裁定依据：`docs/archive/`（决策档案＝主控方案 §10–§16）；溯源终点：`docs/rehabmind-rebuild/data|knowledge`（代码 sourceCaseIds 引用）。
- **镜像**：`outputs/系统文档/`（docx/xlsx，gitignored，供人工评审/打印；**给 AI 模型一律喂 md，不喂镜像**）。生成管线在仓外 `.docgen/`（md2docx／flowchart SVG→PNG／gen-sys*xlsx），md 更新后需重跑，镜像有快照漂移风险。
- 4 份旧正式文档暂留 docs 根（被 B 类测试钉路径），解钉后归档——见 README 与第 28 轮。

## 7. 新会话接手清单（按序）

1. 读 `docs/README.md` → 01（产品）→ 02（决策引擎）→ 07（边界门禁）→ 本文。
2. `git log --oneline -15` ＋ 通知档最后一轮，了解在途状态。
3. 跑 `npm run check:structure`／`check:catalog`／`typecheck`（应全绿）；跑 node 套件时**对照 §4 的 58 条基线**，勿把预存红当回归。
4. 起 dev server，浏览器过三道 gate 走一遍六步流程（01 §流程）。
5. 动 B 类文件前停下：那是测试侧领地，改动走解钉流程（§1）。
