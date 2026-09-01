# 测试交接档 · 种子①②靶子正式断言轮（2026-09-02）

> 开发基线：`dc01a10`（分支 `agent/dev-20260901`，同 ③靶子修复轮 merge `c42a529`；种子①②来自 `00e417a`）。
> dev 回话确认四靶心绑定一致后，按「种子①②待测试侧挂正式断言」开工。结果：**①落地（SG-1）；②被夹具缺陷挡住，退回 dev**。

## 1. SG-1 处理后加重停止面板 ✅（`tests/browser/scenarios/treatment-worse-stop.spec.ts`）

钉 `treatment-worse-stop`（page_boundary / step 3 / fixtureKind `treatment-worse-stop`）：target:chief 一条 `result:"worse"`（5→7）trialRecord → `treatmentWorsened=treatmentMustStop(trialRecords)` 直派，落 treatment-retest-stage.tsx :650 停止面板。

**断言（实际渲染，probe 实测后落笔）**：
- `.rm-complete-panel.is-referral` + span「刚才的反应」+ h2「症状或活动表现变差」（5→7 纯变重，非混合分支）
- p「先停止刚才的处理。接下来只确认症状变化和直接相关的检查，不会返回整套评估。」
- 三出口：**确认加重后的变化**（主按钮，beginAdverseReassessment）/ 补充症状信息 / 保存并结束
- 面板无「训练」按钮；无「本轮处理已完成」面板；rail 处理复测=进行中、训练居家/康复总结=待解锁；零 runtime errors；无横向溢出

**契约迁移注记**：dev seed-gaps 通知档 §3 与 catalog fixtureNote 写的「刚才的处理使症状或活动表现加重 + 重新评估/补充症状信息/保存并结束」是**旧口径**——实际渲染已是批 J 后的不良反应重评流文案（「刚才的反应/症状或活动表现变差/确认加重后的变化」）。行为本质（加重停止、三出口、无训练入口）一致，测试侧按实际 DOM 断言。**catalog fixtureNote 建议随下批更新**（dev 所有）。

## 2. SG-2 双侧逐侧复测 ❌ 夹具缺陷，退回 dev

`treatment-per-side-retest` 实探落点 ≠ 通知档宣称（「处理段显示右侧待逐侧复测控件」）。实际落点：**双侧训练闸门 checkpoint**——「两侧处理完成后，确认训练出口」面板，h2「另一侧针对性评估还未完成」，无 `bilateral-retest-ledger`（探针 8s 等待内台账从未出现，非渲染时序）。

**机制链（已逐行核实，非猜测）**：
1. 夹具只给 `motion:knee-extension` 种了双侧分侧结果；其余 motion 项（屈曲/髌骨×4）是普通结果 → `bilateralAssessmentGate` 判评估未完成 → `bilateralAssessmentComplete=false`（rehabmind-workbench.tsx :3444-3455）→ `assessmentReadyForTreatment=false` → **处理队列不生成**（trialTargets.length=0，与 :3454 注释口径一致）；
2. → 进入空队列完成态分支块（treatment-retest-stage.tsx :694），其中 :720 checkpoint（守卫仅 `intake.side==="双侧/中间" && !midpointDecisionDone`）渲染，拦截在处理页 final return 之前；
3. 即便绕过 ①②，:834 逐侧复测台账还需 `showingRetest = readyToRetest || …`（:530）——夹具未种 `readyToRetest`（base=false）→ 台账仍不可达。

**dev 修复建议（catalog 三处种子）**：① 其余 motion 项补双侧分侧结果（或 withCompletedBilateralComparisons 扩到 motion）；② `midpointDecisionDone: true`（绕开 :720 checkpoint；否则即使评估补齐也停在完成态分支）；③ `readyToRetest: true`（进 showingRetest，台账才渲染）。修好后测试侧按通知档 §3 口径补 SG-2。

**注**：checkpoint 分支是历史提交 `9df84b4` 的老逻辑（`f5be546..dc01a10` 区间 treatment-retest-stage.tsx 零改动）——不是本批回归；是夹具（`00e417a`）与该分支的预设状态不匹配。

## 3. 回归（run=reg-20260902-seeds，workers=1）

见 continuation-handoff §6（唯一权威）。本轮：knowledge ok / fast 0 / full **68 passed + 0 skipped**（67 真实 + SG-1；订正：上档「68 含合入新用例」系把临时探针误计，实际合并前后套件均 67）/ overall 10/10 / mobile 2/2。registry **91 条**（+SG-1；SG-2 未挂不计数）。

## 4. 待 dev 清单（增量）

1. `bilateral-per-side-retest` 夹具三处种子（§2），修好知会即补 SG-2 断言；
2. `treatment-worse-stop` fixtureNote 与 seed-gaps 通知档 §3 文案按实际渲染更新（非阻塞）。
