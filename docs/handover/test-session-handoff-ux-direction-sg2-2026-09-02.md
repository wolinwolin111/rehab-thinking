# 测试交接档 · UX 品牌迁移 + 方向续测旁路契约 + SG-2 诊断（2026-09-02）

> 开发基线：`f3ae2c9`（分支 agent/dev-20260901 tip；区间 dc01a10..f3ae2c9 = UX 6258424 + 方向续测 c66b21d+55c726f + 双侧种子 778a7ac + 文档）。
> 测试侧 merge `6a09b8b`。

## 1. UX 品牌统一（6258424）✅ 契约迁移

| # | 文件 | 原断言 | 迁移后 | 依据 |
|---|---|---|---|---|
| 1 | `page-helpers.ts:17` openFreshProduct | body toContain「RehabMind」 | **body toContain「悦舒运动康复」** | 探针证实落地页无可见 RehabMind；顶部品牌按粡由「悦舒运动康复」替换 |
| 2 | `first-use-and-knee.spec.ts:50` | 同上 | 同上 | 同上 |
| 3 | `real-workbench-seeded-exploration.spec.ts:60` | 同上 | 同上 | 同上 |
| 4 | `ux-regression.spec.ts:48` | 教程按钮「关于 RehabMind」 | **「关于悦舒运动康复」** | dev 修改 mobile-app-navigation.tsx + workbench |
| 5 | `mobile-app-shell-contract.test.mjs:21` | /关于 RehabMind/ 正则 | **/关于悦舒运动康复/** | 同上 |
| 6 | 视觉基线（2 png） | 含 RehabMind 截畉 | 已 `--update-snapshots` 重生成 | critical-home + mobile（品牌文字篇幅变化） |

**未迁移（不需要）**：
- `<title>RehabMind｜运动康复思路工作台</title>`（dev 不动资源路径/内部标识原则）
- 路径 `/RehabMind/`、`data-rehabmind-*` 属性、代码内部标识
- 目标文案 `恢复正常生活`（symptom-stage 专业屏仍用 GOALS_PRO，未动）

## 2. 方向续测旁路（c66b21d + 55c726f）✅ 源码契约 + 行为网

批 G §7 自曝的方向侧接受补查丢失缺陷已修复：
- **c66b21d**：motionItems 第二 filter（被功效闸门）加续测旁路
- **55c726f**（复核追修）：旁路加 guard `(item.testMode !== "passive" \|\| canAssessPassive)`，passive-only 项（髌骨滑动/瘢痕活动/骰骨活动）自助模式保持不渲染→不引入空卡不卡流程

**覆盖方式**（B2-5 先例）：
- 源码契约（`rendered-html.test.mjs`）：用正则钉住三个 guard 表达式（directionIsRelevant + continuationRoundIds；strengthIsRelevant + continuationRoundIds；canRender OR (bypass && testMode guard)）
- 行为网（`continuation-chain.spec.ts` C-1 回归）：全链路通过即排除空卡阻断（如果只落 c66b21d 不落 55c726f，被动项渲染空卡会使 C-1 的 completeContinuationAssessmentRound 超时→C-1 红）
- 记录样式：暂无新入口项，registry C-1 notes 追加覆盖说明；无新条码

## 3. SG-2（bilateral-per-side-retest）❌ 仍不可达，退回 dev

含精确诊断（可环比第二次回报）：

**探针实测（`6a09b8b`，dev 三处种子已合入）：**
- 不再落 checkpoint「另一侧针对性评估还未完成」（midpointDecisionDone:true 绕开 ✓）
- 现在落 **完成面板「本轮处理已完成」**（h2「主诉动作已复查」+ 降级行「下楼和下蹲」+ 三出口含「进入训练」）
- `bilateral-retest-ledger` 仍缺席

**根因**：处理队列仍为空（完成面板 = `!trialTargets.length` 分支）。buildTrialTargets(c:DecisionContext) 的 {findings, assessmentResults, kneeDecision} 在当前夹具形状下未生产候选。

**推测断点**（dev 方位验证）：
- 决策引擎 kneeDecision.currentTreatment 已生成（dev npx tsx buildKneeDecision 证实 knee-anterior-thigh-rectus-femoris），但 `buildTrialTargets` 的 `kneeP0EvidenceAllowed(kneeP0Direction, candidate)` / `kneeCandidateBelongsToCurrentDecision(candidate.id, kneeDecision)` 可能在 bilateral 记录形状（bilateralSideResults 非 `active:` 模式）下把候选过滤掉了
- 建议 dev：在 buildTrialTargets 的 filter 链（:223-238 的 .filter 调用）逐一挂牌调试，找出滤掉哪些候选、在哪一滤挂的

**本铺决定**：不钉完成态面板（该面板在台账可达时会消逝，钉它必有回归翻车）。等于 dev 修好 ledger 种子后知会，即补 SG-2。

## 4. 回归（run=reg-20260902-ux，workers=1）

- check:knowledge ok；test:fast 0
- edge-full：**68 passed + 0 skipped**（与上铺持平；brand 改→3 视觉基线更新→视觉重跑 3 绿→复跑全量 68 绿）
- overall 10/10；mobile-preview 2/2；visual 已 `--update-snapshots`（critical-home 桌面+移动）
- registry 91 条（KR-C1 notes 追加方向续测覆盖条目）

## 5. 待 dev

1. SG-2 buildTrialTargets 候选被过滤问题——试在 `build-trial-targets-core.ts` 各 `.filter()` 挂牌，确认 bilateral 记录形状在评估证据门槛（kneeP0EvidenceAllowed / kneeCandidateBelongsToCurrentDecision 等）下被哪一滤挂丢的；修好知会。
2. 方向续测旁路与牌（c66b21d+55c726f）测试侧已源码契约 + C-1 行为网覆盖，无阻塞。