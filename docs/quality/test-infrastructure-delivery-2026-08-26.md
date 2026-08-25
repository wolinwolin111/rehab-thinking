# RehabMind 测试体系建设记录（批次 1–5 全量交付）

交付日期：2026-08-26
执行角色：测试会话（隔离工作副本 `D:\Study\codex\project\rehabmind-agent`，分支 `agent/testing`）
代码基线：`cf47910`（与当日主线一致）；合并提交：`f74dd55`（fast-forward 进入 main，24 文件 / +1719 行）
门禁状态：lint 0 错误；test:fast 129 个测试文件，失败仅为既有同 4 条文案红灯（见 §6），新增内容零失败零回归

## 1. 背景与问题定义

本轮建设针对的现象：**自动化测试全绿，但真实浏览器体验中仍频繁发现各类毛病**。对历史逃逸缺陷逐例归因后确认，病灶集中在三层：

| 逃逸层 | 历史例证 | 原有盲区 |
| --- | --- | --- |
| 组件与决策核之间的接线/渲染条件 | BIL-01 双侧优先侧题死代码、"未保存"误显示 | L4 只有源码字符串合同，字符串存在 ≠ 会渲染 |
| 持久化保真度 | SAVE-02 刷新回退 | 纵向集成用手写夹具，非真实页面产出的快照形状 |
| 机械布局（遮挡/溢出/触达） | 案例编号提示遮挡查看阶段 | 无像素级自动检测 |

约束：不允许恢复全量浏览器穷举（资源开销过大）。因此本体系的原则是**把贵的和便宜的分层**：纯 JS 毫秒级检查进常规门禁，真浏览器操作归入证据道异步运行。

## 2. 协作与运行架构（方案 B 双轨）

### 2.1 角色分工

| 角色 | 职责 |
| --- | --- |
| 测试会话 | 在隔离 worktree + 本地 3001 窗口跑测试、造数据、发现并报告缺陷、回归验证 |
| 开发会话 | 在主仓库修复测试会话报告的问题 |
| 产品使用者 | 人工体验验收；视觉基线首建确认；巡检问题裁决 |

### 2.2 双轨命令

| 轨道 | 命令 | 时长 | 何时跑 |
| --- | --- | --- | --- |
| 阻塞道（发布门禁） | `npm run test:release` | 约 13–17 分钟 | 发版前 |
| **证据道（新增）** | `node scripts/quality/inspect-local.mjs http://localhost:3001 --visual --axe` | 约 40 秒–2 分钟 | 每次合入后 / 定期 |
| 定向回归 | 各新套件单独 `node --test <file>` | 秒级 | 日常窄改动 |

发布时 `test:summary` 应校验证据道报告新鲜度（≤24h 且代码指纹一致），过期不得采信。

### 2.3 主线同步流程（测试会话视角）

```text
主线有新提交 → git merge main --no-edit（在 worktree 内）
→ 仅当 package.json 变化时 npm ci --ignore-scripts
→ 重跑 test:fast + lint（旧绿灯作废）→ 在新版上执行定向回归与证据道
```

未提交的主仓库改动对 worktree 不可见；合并冲突时停止并上报裁决，不擅自选边。

### 2.4 版本关系（每轮测试开始前必须核对）

| 层 | 版本锚点（本次交付时） | 说明 |
| --- | --- | --- |
| 被测代码内容 | 主线 HEAD = `cf47910` | 测试所验证的代码与主线完全一致（0 提交差异） |
| 测试载体 | 隔离 worktree + 本地 `localhost:3001` 窗口 | 同一份提交的独立检出，产出先落分支 `agent/testing` |
| 未覆盖层 | VPS 旧构建（基于更早的 `5af6280` 脏树） | 本体系不测 VPS 部署层；发版时由 release 脚本另行出证 |

核对命令：`git rev-list agent/testing..main --count` 与反向计数均为 0 才算两边一致；否则先按 §2.3 完成同步再开测。本次交付的实测链路：主线 `cf47910` → 分支新增测试 `f74dd55` → fast-forward 回主线。

### 2.5 新增测试内容入线流程

```text
① 在 worktree 开发新测试：新文件优先，尽量少改既有文件（降低合并冲突面）
② 分支内自验：定向跑绿 → test:fast 无新增失败 → lint 0 错误
③ 提交到 agent/testing 分支；排除项：.tmp/、artifacts/、
   src/infrastructure/pilot/release/release.generated.ts、本地启动脚本等不入库产物
④ 主线合并：
   - main 无新提交时：git checkout main && git merge agent/testing（fast-forward，零冲突）
   - main 已领先时：先在自己分支 git merge main 解决好冲突并重跑门禁，再让主线合并
⑤ 可移植性验证：在主仓库目录直接 node --test <新文件> 全绿，方视为入线完成
```

纪律两条：

1. 涉及生产代码的清理或修复（如删除死词汇命令）**不得随测试批次直接入线**，必须按缺陷/清理清单转交开发会话处置后回归；
2. 合并进主线后如需修订文档，同一次提交内完成索引更新（`docs/README.md`），保持文档中心单一入口。

## 3. 新增防线地图

| 批次 | 能力 | 兜住的问题类别 | Oracle 来源 | 实测耗时 | 抓错证明 |
| --- | --- | --- | --- | --- | --- |
| 1a 投影穷举 | `tests/workflow/workflow-projection-exhaustive.test.mjs`：2^14×队列网格=163,840 投影；解锁阶梯/训练门三态/不变量完备性×6 步/单调性/早收判定 | 组合逻辑死角、非法跳转 | 场景验收文档六阶段门禁 + INV-* 定义 | 2.6s | 4 变异全杀 |
| 1b 序列探索 | `orchestrator-sequence-exploration.test.mjs` + `tests/support/orchestrator-exploration-core.mjs`：200 种子×70 动作全链路流，失败自动收缩最小序列 | 卡死、历史污染、队列重复/跳过、加重不停 | SYS-S02/S03、SYS-QUEUE-001、INV 两级 | 0.6s | 3 变异全杀 |
| 1c 生产者核查 | 全仓审计结论：`enter-training`/`remain-in-treatment` 为死词汇，无旁路，A4 前提成立 | 架构假设验证 | 源码审计（§5 C-1 转清理项） | — | — |
| 1.5 渲染行为合同 | `tests/component/stage-render-contract.test.mjs`（vite ssrLoadModule + renderToStaticMarkup）：同意门三态阻断语义、来源门、引导卡、阶段抽屉（含随访限制）、更多菜单、8 种同步态文案 | 条件渲染死代码、状态→界面映射断裂 | ONBOARD-01、SAVE-01、抽屉可用性设计 | 1.3s | — |
| 2 快照 fuzz | `tests/unit/infrastructure/pilot-snapshot-fuzz.test.mjs`：3000 组结构化变异永不抛异常、ok 结果必携当前 schemaVersion、循环引用/超深嵌套专项 | 损坏快照崩溃、半条数据、版本漂移 | SCHEMA-01/REL-01 合同 | 0.9s | 2 变异全杀 |
| 2b 真实快照回灌 | 导出器 `tests/browser/support/export-real-snapshot.mjs` + `real-snapshot-recovery.integration.mjs`：真实页面草稿 → 迁移 → 入库 → 重启恢复原文一致 + 凭证隔离 | 夹具能过、真数据不能 | TEST-18 纵向合同延伸 | 6.6s | — |
| 3+5 双轨巡检 | `scripts/quality/inspect-local.mjs`：HTTP/API/SSR 层 + `--visual` 六视口溢出/console/遮挡/视觉基线比对 + `--axe` 弹层扫描；markdown 报告落盘 `artifacts/quality/inspect-local/` | 页面级回归、资源断裂、权限合同退化、布局遮挡、可访问性回归 | 测试计划 L6/L7 + DEPLOY-02 探针思想 | ~40s | 首轮即产出 F-1~F-3 |
| 4 可读性+追溯 | `tests/support/source-contract-assert.mjs`（精准 diff 替代 29 万字符转储）；`sys-invariant-traceability.json/.test.mjs`（38 条守护关系双向校验：无孤儿不变量、无僵尸编号、锚点实存） | 排查成本、防线静默丢失 | 场景验收文档为唯一编号来源 | ~2s | 锚点缺失即红 |

新增依赖（devDependencies，已随合并入库）：`pixelmatch@5`、`pngjs@7`、`axe-core@4`。

## 4. 入库文件清单

新增（21）：上表全部测试与支撑文件、`scripts/quality/inspect-local.mjs`、`tests/fixtures/real-snapshot-sample.json`、`tests/browser/inspection-baselines/home-{320,360,390,412,430,1440}.png`。
改造（3）：`save-promise-copy` / `first-use-entry-contract` / `muscle-region-location-picker` 三个合同测试改用精准 diff 断言，**断言语义不变、红绿集合不变**。

## 5. 首轮巡检发现与转交清单（待开发会话处置）

| 编号 | 类型 | 内容 | 建议处置 |
| --- | --- | --- | --- |
| F-1 | 待定性 | SSR 首屏 HTML 不含「你的线上康复助手」（cf47910 后）。需产品确认是文案有意迁移还是回归 | 对照首发文案表定性后修一侧 |
| F-2 | 待定性 | 「问题反馈」入口 1440px 可见但点击命中失败（疑似被覆盖或滚出视口）；390px 首屏不存在（可能设计上收入抽屉） | 确认交互层级意图；若为缺陷按 UX 布局修复 |
| F-3 | 缺陷 | 来源门弹层 axe serious 违规 `aria-prohibited-attr(1)`（详见 inspect 报告 JSON/summary） | 按 axe 文档移除禁止属性 |
| C-1 | 清理 | 删除死命令词汇 `enter-training`/`remain-in-treatment`（类型定义 + adapter case + 对应测试行） | 约 15 分钟 |
| C-2 | 清理 | `onboarding-steps.ts:15` 未用导入 `CSSProperties`（lint 唯一警告来源） | 删除该导入 |
| E-1 | 环境项 | 本地 3001 未配 `PILOT_ADMIN_KEY`，管理员探针返回 503 属预期；VPS 上必须保持 401 | 无需改动，知悉即可 |

另：既有的 4 条文案红灯（first-use 文案、肌肉区域选择器、保存承诺两条）维持搁置待定性状态，与本轮无关、未被本轮回归扩大。

## 6. 使用速查

```powershell
# 单套件定向回归（秒级）
node --test tests/workflow/workflow-projection-exhaustive.test.mjs
node --test tests/component/stage-render-contract.test.mjs
node --test tests/unit/infrastructure/pilot-snapshot-fuzz.test.mjs

# 证据道巡检（默认只打本地窗口）
node scripts/quality/inspect-local.mjs http://localhost:3001 --visual --axe

# 重新导出真实快照夹具（UI 大改后建议重做一次）
node tests/browser/support/export-real-snapshot.mjs http://localhost:3001

# 视觉基线重拍：删除 tests/browser/inspection-baselines/*.png 后重跑巡检即为首建
```

## 7. 坑位实录（后来者必读）

1. **vinext 单实例锁**：同一目录只能起一个 dev server（`.vinext/dev/lock.json`）。多窗口必须用 git worktree 另起目录。
2. **better-sqlite3 安装**：install 脚本强制 node-gyp 编译，机器无 VS Build Tools 会失败；包内自带全平台 prebuilds，用 `npm ci --ignore-scripts` 安装即可运行时加载。
3. **PowerShell 中文管道损耗**：含中文的脚本经 stdin 管道喂给 node 会把非 GBK 字符变成 `?`。诊断脚本一律先用工具落盘再执行，不走管道。
4. **SSR 渲染产物含 `<!-- -->` 注释分隔符**：动态文本节点之间会被 React 插入注释，DOM 内容断言前必须先剥离。
5. **node:test 中使用 vite server 必须在 `after()` 钩子关闭**，否则事件循环不排空，进程挂起到超时。
6. **loadTypeScriptModule 无法解析 `react/jsx-runtime`**（data-url 母体限制），加载 TSX 一律走 `tests/support/load-tsx-module.mjs`（内联最小 vite 配置，`configFile:false` + `@/` alias）。
7. **dev 模式下 CSS 资源以 JS 形式返回属正常现象**（vite 注入式样式），巡检对 CSS MIME 的断言已兼容；生产构建才是 text/css。
8. **场景编号有两种形态**：不变量三位数字（SYS-EVIDENCE-001）、场景两位数字（SYS-S01），提取正则必须兼容（`SYS-[A-Z]+(?:-[A-Z]+)*-?\d{2,3}`）。
9. **探索器建模边界**：完成布尔撤销与坏信号出现伴随页面级路由（返回修改门/聚焦复查），不在纯推进模型内，统一以「翻转后越权则跳过」守卫处理。

## 8. 明确边界与后续路线

**边界（本体系不证明的事）**：
- 临床内容正确性（独立临床审核暂缓，产品决定）；
- VPS 部署层（nginx/MIME 等，由发版脚本在发版时兜底）；
- 真实用户主观体验（信息密度类，永久保留人工验收）。

**后续路线（按价值排序，均已在登记表或本文留痕）**：
1. F-1~F-3 与 C-1/C-2 由开发会话处置后，测试会话 merge 回归；
2. 6 条业务深度走查（膝正常/踝急性/双侧/返回修改/刷新恢复/第二次康复）：待这轮 UI 大改稳定后基于现行选择器补建，避免立即过时；
3. 视觉基线目前 7 张为首建快照，需产品过目确认一次，之后任何漂移自动变红；
4. `knee-decision-core` 内部治疗单元推导仍未做行级走读，如需新增该层用例须先补读；
5. 后续一切新增测试内容一律按 §2.5 入线流程执行；每轮开测前按 §2.4 核对版本关系。

**禁止沿用的口径**：
- 「129 个测试文件全绿」不含既有 4 条红灯的现状描述必须如实带出；
- 视觉基线未经产品确认前，比对通过不等于显示合格；
- 证据道报告超过 24h 或代码指纹不一致时，不得作为发布采信依据。
