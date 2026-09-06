# 开发→开发交接：RehabMind 接手指南（2026-09-01，交接人 = 前任会话）

> 读者是**接手开发的模型/人**。先读 §2 硬规矩和 §7 待办队列，再按需查 §3 架构地图。本文档与 `development-to-test-*` 系列同为权威输入；冲突时以更新日期新者为准。

## 1. 产品与现状一句话

悦舒运动康复（RehabMind）：**自助运动康复决策应用**。用户描述症状 → 六步流程（症状信息→关键确认→评估检查→处理与即时复测→训练居家→康复总结）→ 确定性规则产出评估队列、处理候选、训练方案。**无 AI 决策**——全部决策在 `src/domain/rehab/` 约 80 个纯函数核心里。四份正式文档是产品权威（`docs/rehabmind-rebuild/` 下的 product-design、decision-framework、knee-ankle-pilot-knowledge、pilot-scenario-coverage）。

当前 main @ `450a18e`，工作树干净（除生成文件 release.generated.ts，见 §2）。产品已交付批次 A→K-lite（§8 批次日志），测试侧 agent/testing 已绑定至批 I/J-1，批 J/K/种子在途绑定中。

## 2. 硬规矩（违反即事故）

1. **绝不提交 B 类文件**：`tests/**`、`docs/quality/**`、`scripts/quality/inspect-local.mjs`、`src/infrastructure/pilot/release/release.generated.ts`、`artifacts/`——这些归测试侧或生成流程。**只 `git add` 显式列出的文件**，永远不 `git add -A`/`git add .`。
2. **绝不 push origin/main**：GitHub main 停在 08-23 旧历史且无共同祖先。推送只用显式 refspec 到 `agent/dev-20260901`：`git push origin <sha|main>:refs/heads/agent/dev-20260901`。
3. **每个功能批次 = 一个提交 = 一份 `docs/handover/development-to-test-<主题>-<日期>.md`**（同提交内）。文档含：批次内容、断言对照表（测试侧契约迁移说明）、不变式、验证证据、已知坑。
4. **先提交后通知**：测试侧按 SHA 合入（merge 单个 SHA 进 agent/testing，绝不 merge main）。通知用汇总档 `test-notice-2026-09-01-batch-sha-bindings.md`（追加式），**必须显式列出全部提交含打包祖先**——测试侧吃过"通报 5 实为 9"的对账亏。
5. **文档所有权**：`docs/quality` 测试文档、`docs/handover/test-*` 归测试侧；`development-to-test-*` 归开发；`docs/README.md`/`HANDOVER.md`/`project-status.md` 归产品/开发。测试侧活文档白名单 5 份见其 `test-workflow-continuation-handoff.md` §8——开发**只读**它们（尤其 §6.2 待办/回退点）。
6. **知识数据是临床内容**：`src/knowledge/pilot/` 的增删改需产品/临床签字（本轮多批次是先给 owner 审核表、拿到"1干3撤/可以"类裁定后才动代码）。软件一致性 ≠ 临床审核。
7. **确定性规则，无 AI 决策**：任何新决策逻辑都进 `src/domain/rehab/**` 纯函数核心，UI 只消费投影。

## 3. 架构地图（改哪里之前先看这里）

```
src/domain/rehab/            纯决策核心（无 React/网络/DB，可 tsx 直测）
  intake/                    症状解析、workflow-profile（guided/thinking×能力）
  assessment/                function-assessment-plan-core（功能计划）、continuation-planner-core（续测）
  treatment/                 candidate-order-core（候选排序）、trial-record-*（处理记录）、treatment-session-core
  retest/                    retest-eligibility-core（复测资格——动了会影响成果面板/最终复测，慎重）
  shared/                    pilot-decision-engine（规则引擎，含 availableIds 守卫）、knee-decision-core、
                             local-limb-decision-core、knee-workflow-adapter、bilateral-flow-core
  safety/                    postop-routing-core（批K术后分流）、tissue-pathway-core
  training/                  training-progression-core（INITIAL_TRAINING_PRIORITY 地基卡）
src/knowledge/pilot/         临床知识数据（full-demo-content 9区域、local-limb-regions 大腿/小腿、
                             pilot-knowledge 病例规则 ANKLE-R*/KNEE-R*、pilot-motion-muscle-knowledge 专业名映射）
src/features/rehabmind/
  components/workbench/rehabmind-workbench.tsx   主装配（~7000行）；关键锚点：
                             assessments useMemo ~:1330（评估队列；strengthIsRelevant 闸门、同动作去重、
                             续测旁路 continuationRoundIds、continuationCandidatePool ~:3530 取区域全集）
                             exercises useMemo ~:2960（训练装配；pilotOnlyTrainingIds 规则后门闸）
                             workflowProjection ~:3495（maxUnlocked 来源；intakeComplete ~:3397）
  components/workbench/workbench-support.tsx     IntakeState、FRIENDLY_ASSESSMENT_COPY、
                             strengthIsRelevant（力量闸门）、adaptExerciseForCurrentStage
  components/stages/         六步 UI（confirmation 含术后分流、assessment、treatment-retest、training、summary）
  workflow/                  workflow-orchestrator（RETURN-EDIT-GATE/step-jump；导航被拒=静默，改流程先读它）
  test-workbench/scenario-catalog.ts             测试场景/夹具（fixtureKind 机制；开发可加场景）
src/infrastructure/pilot/    SQLite 持久化 + API；snapshot-schema.ts 快照校验（intake 白名单在 validateIntake）
```

**三条最重要的不变式**：
- **队列裁剪必须有续测旁路**：任何"按主诉裁掉默认队列项"的闸门（方向/力量）都要 `|| continuationRoundIds.includes(前缀:id)`——续测池取区域全集，被裁项被用户接受后必须可渲染，否则静默丢失（批 G §7 的教训，方向/力量两侧都已修）。
- **决策核消费评估项都有 availableIds 守卫**：裁掉条目不会崩，但要看决策核意图是否被静默丢弃（批 G 修复过腘绳触发词口径不一致——闸门与决策核点名同一批条目）。
- **功能计划是动态的**：`selectFunctionAssessmentPlan` 按 firstResults 递进扩展；对它做去重/联动时记住队列是实时重算的（useMemo 依赖 assessmentResults），已完成项不回溯。

## 4. 文案分层（产品规范，多次踩坑后确立）

- **标题（评估/训练卡）两种模式统一用专业名**（`PROFESSIONAL_ASSESSMENT_TITLES` 映射，缺省回落 raw title）。
- **专业词保留 + 歧义处加短括号**（"站立屈髋（臀部向后）"），通俗化只进 how/observe/purpose。
- 训练卡必有 `purpose`（一句大白话"为什么练这个"，四区 53/53 已全覆盖）；FRIENDLY_ASSESSMENT_COPY 是自助模式评估文案覆盖层。
- **命名契约脆弱**：测试侧曾两轮迁移标题契约。新改文案时在交接档给精确旧→新对照，并建议测试侧契约钉卡 id 弱断言标题。

## 5. 调用开发的工作流（每批次）

1. 从用户/测试侧输入整理候选改动 → 零临床争议的列清单给 owner 拍板（说人话，别贴代码）→ 拿到逐条裁定。
2. 动手前先 kill dev server（见 §9 EBUSY），编辑 → typecheck → **tsx 直测纯核心**（`npx tsx scripts/tmp-verify-*.mts`，跑完删）→ 组件基线（`node --test tests/component/rendered-html.test.mjs`，当前 6 个既有红=基线，零新增即可）→ 起 dev server 用 Playwright 打 `/test/` 场景实测落点。
3. 提交（显式 add + 交接档）→ 推 `agent/dev-20260901` → 追加汇总通知档（含打包祖先）→ commit + push 通知档。

## 6. 验证速查

```powershell
npm run typecheck                       # 必绿
npx tsx scripts/<probe>.mts             # 纯核心直测（Windows 绝对路径 import 会挂，放 scripts/ 下用相对路径）
node --test tests/component/rendered-html.test.mjs   # 17 pass / 6 fail = 基线
npm run dev                             # :3000；编辑 src 前必须停（EBUSY 杀 watcher）
playwright 场景实测                       # /test/ → 页面定向 → 场景；python -c 用 py（python 是空壳 9009）
```
测试侧回归用 **3001** 端口 + worktree（见其 handoff §1.4）；开发侧 3000 常驻不冲突。

## 7. 待办队列（按优先级）

1. **Phase 4.2（测试侧 §6.2 转办）**：
   - ③ 处理完成态靶子修复：根因与合法修复路径已完全写明（`development-to-test-seed-gaps-2026-09-01.md` §4）——outcome 场景 `baselineScoreConfirmed:false` 破坏 intakeComplete→maxUnlocked=0→出口死锁；修复=保 true + 多主诉动作种子（reportedActions×2 → not-comparable → 降级行保留），先探 `ReportedAction` 形状。
   - 方向侧续测旁路已修（批 K 同车）；通知载体改进已落实。
2. **临床签字待办**（owner 未裁，别擅动）：无——原审计四项已全部落地（批 I/J）。新审计发现随时走 §5.1 流程。
3. **落地缓冲卡后续**：`knee-drop-landing` 已入列（批 J），观察真实使用后是否需要 4.5 中间档。
4. **推迟项**（owner 明确说不急）：移动端深度适配；臀桥三副本合并（判定不值得）。
5. **测试侧在途**：批 J/K/种子契约绑定（通知已发）；其 §6.2 "完成面板出口必须产生导航"通用契约候选——等 ③ 修好后加才有意义。

## 8. 批次日志（SHA 索引）

| 批 | SHA | 一句话 |
|---|---|---|
| A~E | aaf136e/32085ce/977eb64/ad04092 | 恐动追问退役/移动toast/功能卡内嵌/评估卡节奏（详见各自 development-to-test 档） |
| G | 8411e33 | 膝/大腿/小腿力量闸门（strengthIsRelevant 补齐，膝核心两项恒留）+ 两闭链标题重名修正 |
| H | fff8951 | 训练卡 purpose 行 + pilotOnlyTrainingIds 规则后门闸（仅规则来源卡需发现支持） |
| G复核 | 0c9ce2c | 续测旁路（力量）+ 腘绳触发词对齐决策核 |
| I | a9a6b04 | 跟腱等长5s→30s、删足趾主动控制、新增台阶边缘缓慢下落（跟腱路径第2会话双卡） |
| J-1 | f5be546 | 删踝区内翻与足弓控制卡（"疼≠练那"指征错误） |
| J | 5f12b4c | 命名回改+purpose全覆盖+可行性文案+四裁决（见 §4/§7） |
| K-lite | e11b081 | 术后分流转介（postop-routing-core，AAOS 书证阈值）+ 方向侧补查旁路 |
| 种子 | 00e417a | worse 停止面板靶子 + 双侧逐侧复测靶子；③根因存档 |

## 9. 环境陷阱（Windows/本机，全踩过）

- **vite EBUSY**：dev server 运行时编辑 src（原子改名写入）会杀 watcher → 后续连片 ERR_CONNECTION_REFUSED。顺序永远是：停服→编辑→起服→验证。清理 `src/**/*.tmpdir` 残留。
- **python 是 WindowsApps 空壳**（exit 9009）：一律用 `py`。
- **pwsh 陷阱**：`git merge-base --is-ancestor` 成功时无 stdout——判断用 `$LASTEXITCODE` 不用 `if(git ...)`；中文字符串 grep/内联 python 用文件不用命令行；npm/npx 的 warn 走 stderr 造成假 exit 1（判绿看 passed/failed 行）。
- **无浏览器桥**：本会话 browser_* 全不可用；UI 验证走 `py` + playwright 直连 localhost。视觉 OCR（扫描版 PDF）用 `npx @liustack/modlens analyze -i <png>`，provider 上限 max_tokens=1024——整页转录必截断，**三等分裁片**后逐片提取（见 docs/research/postop-timeline-verification 的方法备忘）。
- **工作区 tests/ 与 agent/testing 双轨**：本地 tests/ 是陈旧副本（6 红基线），权威在 agent/testing 分支的 worktree；别试图在 dev 侧修它们的测试。

## 10. 与用户协作的方式（前任经验）

- 用户是产品 owner（康复背景），要求**说人话**：方案列"改前→改后"表格 + 理由，临床判断项明确标注"需你点头"，别替临床拍板。
- 用户会从受伤用户视角挑战每个动作（"这个练的是啥？"）——训练卡 purpose 行和可行性自查锚点就是为此而生；新增内容先过"做完会不会改变接下来怎么办"这一刀。
- 批复习惯短句（"1干3撤"、"可以"）——给他的选项必须编号、可单选。
- 大批次拆独立提交；每批先给方案后动手；复核自己的改动时用挑刺模式（批 G 复核抓出 2 个真回归）。
