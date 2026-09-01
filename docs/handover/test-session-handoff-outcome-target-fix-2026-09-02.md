# 测试交接档 · ③处理完成态靶子修复绑定轮（2026-09-02）

> 开发基线：`dc01a10`（分支 `agent/dev-20260901` tip；核心修复 `a2fcaf7`，随批 J 文案/批 K postop-routing/种子①② `00e417a` 一起合入）。
> 测试侧 merge `c42a529`，OP-1 重写 + hip-flexion 契约改名 + registry 对齐，回归全绿后推送。

## 1. dev 修复内容（a2fcaf7）

`outcome-panel-chief-action-line` 死出口，根因链（dev 通知档 §2）：
1. fixture `baselineScoreConfirmed:false` → `intakeComplete=false` → `maxUnlocked=0`；
2. 面板照常渲染（snapshot.step 直达不查 maxUnlocked），但 `goToStep(4)` 被 workflow 控制器 `navigate-requested` 判 `targetStep <= maxUnlocked` 拒绝（静默）——即测试侧报告的死按钮。

修复采用 seed-gaps §4 两条路线的第一条：**多主诉动作**：
- `reportedActions` 两条（下楼/下蹲）→ `reportedActionSummary().length===2` → `hasReportedChiefAction=false` → `retestEligibility=not-comparable` → `chiefScoreComparable=false` → 面板仍走**降级行**；
- 同时 `reportedActions` 让 `intakeComplete` 成立 → `maxUnlocked` 不再被压 0；
- trialRecords 首条加 `chiefRetested:true` → 不生成 pending 主诉义务 → `pendingRequiredCount=0` → `treatmentComplete=true` → `maxUnlocked=4`。

## 2. 契约迁移（测试侧 3 处）

| # | 位置 | 修复前 | 修复后 |
|---|---|---|---|
| 1 | `outcome-panel-slim.spec.ts` OP-1 | h2「主诉动作已复查」；降级行「主诉动作：下楼和下蹲」 | **h2「主诉变轻」**（chiefRetested+afterScore<beforeScore→chiefImproved）；**降级行「主诉动作：下楼、下蹲」**（raw 顿号拼接）；+ 新增四靶心：rail「训练居家」可进入（enabled）、「进入训练」点击→「05 处理复测完成/开始训练」过渡页、`[data-pending-count]` 非 0 计数=0（guided 模式不渲染台账，负断言兜底）、无 runtime errors |
| 2 | `rendered-html.test.mjs` L476 | `exercise("knee-standing-hip-flexion", "站立折髋（臀向后）"` | `exercise("knee-standing-hip-flexion", "站立屈髋（臀部向后）"`（批 K-lite knowledge 文案统改，踝区同步「站立屈髋（臀部向后）」，`how` 统一「背对墙站立约一脚距离…轻碰墙面」；ID 不变） |
| 3 | registry OP-1 | notes/titlePattern 按旧形态 | notes 重写为修复后四靶心形态；titlePattern +「训练交接」 |

## 3. 回归（run=reg-20260902，workers=1）

- check:knowledge ok（cases=8/episodes=11/findings=22/treatments=14/retests=14）
- test:fast EXITCODE 0（含 hip-flexion 契约改名后）
- edge-full：**68 passed + 0 skipped**（67→68：合入带进新用例，Total 以 `--list` 为准 68）
- overall 10/10；mobile-preview 2/2

首轮 full 曾报 1 failed（R-4 `page.goto` 30s 超时）——**环境性假失败**：手动 3001 dev server 与 config 自动 3000 webServer 并行抢 vite 编译资源。单跑 R-4 4.4s 绿；JSON 全量重跑 68/0/0。教训已入 continuation-handoff §6：**全量回归时禁止并行手动 dev server**。

## 4. 种子缺口①②（00e417a 随批合入）

dev 已落 catalog 靶子 `treatment-worse-stop`（处理后加重停止面板）+ `bilateral-per-side-retest`（双侧逐侧复测控件），registry 尚无条目、测试侧未挂正式断言——候选下一轮（`launchWorkbenchScenario` 直接可用）。

## 5. 证据绑定

- merge `c42a529`（tip `dc01a10`）+ 测试侧提交（本档）。
- 断言作用域 runtime 容器防 launcher 假阳性（踩坑通报 #1）继续有效。
