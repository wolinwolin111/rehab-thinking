# 测试会话交接文档

**会话 ID**：test-session-2026-08-24~26
**工作树**：`D:\Study\codex\project\rehabmind-agent`（branch `agent/testing`，commit `a805361`）
**基线仓库**：`D:\Study\codex\project\rehab-thinking-demo`（main @ `a805361`，worktree clean）
**前序文档**：`docs/handover/HANDOVER.md`（第一代会话手写）、`docs/quality/test-infrastructure-delivery-2026-08-26.md`（基础设施交付记录）
**创建日期**：2026-08-26
**适用对象**：接替测试窗口

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

开发推了 9 个提交（B~G 批次 + DEF-CONSENT-01 修复），我方执行：

| 动作 | 结果 |
|---|---|
| 3 个合同适配（RQ-S4 横幅禁令 + wiring 加固 + 引导卡移除） | test:fast exit=0 |
| 渠道文案跟进（抖音粉丝群 → 抖音） | release specs 5/5 |
| 焦点教程适配（app-shell dismiss + inspect-local dismiss） | 巡检双视口双绿 |
| DEF-CONSENT-01 永久防线（新建 release spec，backdrop=0 断言） | 5/5 全过 |
| 视觉基线稳定性修复（截图 settle 策略） | 三连 exit=0 |
| 主线 fast-forward 合并 | main = a805361 |

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
| worktree HEAD | `a805361`（agent/testing） |
| main HEAD | `a805361`（rehab-thinking-demo） |
| test:fast | **exit=0，全绿** |
| lint | **0 error, 0 warning** |
| browser release specs | **5/5 pass (23s)** |
| 证据道巡检 | **exit=0（三连验证稳定）** |
| 视觉基线 | **7 张已重建，三连稳定** |
| 3000（主仓库） | 正常运行 |
| 3001（worktree） | 正常运行 |
| 主仓库未提交文件 | 7 个（开发 H batch 进行中） |

**注意**：主仓库有 7 个未提交文件（开发正在进行 H batch）。下次同步时先确认开发提交状态再 merge。

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
├── browser/known-defects/ 1 个  # UX 回归（已除名，待清理）
├── browser/visual/        1 个  # 关键布局
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
| `node scripts/quality/inspect-local.mjs http://localhost:3001 --visual --axe` | 证据道巡检（6 视口 + axe + 视觉基线 + 反馈探针） | ~40s |
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

## 七、开发进行中的修改（截至 a805361）

| 文件 | 批次 | 内容 |
|---|---|---|
| knee-workflow-adapter.ts | H batch (S-01~S-07) | 膝关节逐发现侧别忠实度 |
| build-trial-targets-core.ts | H batch | 评估目标构建 |
| muscle-region-location-picker.tsx | H batch | 肌肉图 atlas 切换 |
| rehabmind-workbench.tsx | H batch | 工作台适配 |
| release.generated.ts | 自动 | 构建生成物 |
| build-trial-targets-scenario.test.mjs | H batch | 新增领域测试 |
| knee-workflow-adapter.test.mjs | H batch | 新增领域测试 |

**下次同步前务必先确认这些文件已提交。**

---

## 八、缺口清单（审计报告 G-01 ~ G-11）

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
4. **基线原则**：每次交付前重跑一次全量回归（test:fast + lint + release + inspection），三连 exit=0 才算完成
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

**交接人**：test-session-2026-08-24~26
**最后验证时间**：2026-08-26 ~20:30 CST
**最后已知 HEAD**：`a805361`
**最后已知状态**：test:fast ✅ lint ✅ release ✅ inspection ✅
