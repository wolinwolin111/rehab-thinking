# RehabMind 开发→测试交接：方向侧续测补查项静默丢失修复（批 G §7 遗留项）

日期：2026-09-01
基线：main @ `9f9af39`（上一批 UX 文案清理）
批次 SHA：本提交（详见文末）

## 1. 问题

批 G §7 自曝并留作条目：**方向项（motion）经能力闸门裁掉后，用户接受"继续检查这些方向"补查时，该项静默丢失、无提示**。力量侧（`strengthItems`）已在批 G 修（`continuationRoundIds` 旁路），方向侧未修。

测试侧通报确认该缺陷仍开放，本批处理。

## 2. 根因（已逐行核实）

`assessments` 装配里 `motionItems` 有两个 filter：

1. `directionIsRelevant(...) || continuationRoundIds.includes("motion:"+id)` —— **批 G 已修**（续测旁路已存在）。
2. 被动能力闸门：
```ts
.filter((item) => {
  const reviewedAccess = p0AssessmentAccess(`motion:${item.id}`, workflowProfile);
  return reviewedAccess ? reviewedAccess.visible : (item.testMode !== "passive" || canAssessPassive) || continuationRoundIds.includes(`motion:${item.id}`);
})
```
   - 自助模式 `canAssessPassive=false`，`p0AssessmentAccess` 对 P0 表外被动项（如 `knee-patella-*` 髌骨滑动、`knee-scar-mobility` 瘢痕活动）返回 `undefined` → 落入 `item.testMode !== "passive" || canAssessPassive` 分支 → **被裁掉**。
   - 对 P0 表内项（如 `ankle-cuboid-mobility`，A-P0-07 自助 `visible:false`）→ 落入 `reviewedAccess.visible` 分支 → **同样被裁掉**。
   - **两个分支都没有续测旁路**，即使 `continuationRoundIds` 已包含用户接受的方向，该项仍不可渲染 → 静默丢失。

补查建议池 `continuationCandidatePool`（:3522）取区域 directions 全集，被动方向项会被建议；用户接受后 `acceptContinuationSuggestions` 写入 `continuationRoundIds` 并 `setStep(2)` 回到评估，但被动项在装配时被第二个 filter 裁掉。

## 3. 修复（1 个文件：`rehabmind-workbench.tsx:1355-1358`）

第二个 filter 把续测旁路提到整个表达式之后，覆盖 `reviewedAccess` 与 fallback 两个分支：

```ts
.filter((item) => {
  const reviewedAccess = p0AssessmentAccess(`motion:${item.id}`, workflowProfile);
  return (reviewedAccess ? reviewedAccess.visible : (item.testMode !== "passive" || canAssessPassive)) || continuationRoundIds.includes(`motion:${item.id}`);
})
```

- 未接受续测时行为完全不变（被动项仍按能力闸门裁掉）。
- 接受续测后，被动方向项可渲染；被动项评估卡自带「暂不检查｜今天先跳过」出口，自助用户可跳过，不会卡死。

## 4. 验证证据

- `npx tsx` 直测：guided profile 下 4 个方向项
  - `motion:knee-patella-superior` / `motion:knee-scar-mobility` / `motion:ankle-cuboid-mobility`：未接受续测=false（被裁），接受续测=true（可渲染）——修复生效。
  - `motion:knee-extension`（主动项）：两种情况均为 true，不受影响。
- `npm run typecheck` 干净；`rendered-html.test.mjs` 17 pass / 6 fail（基线不变）。

## 5. 断言对照表

| 场景 | 改前 | 改后 |
|---|---|---|
| 自助模式，未接受被动方向补查 | 被动项不可见 | 不变 |
| 自助模式，接受被动方向补查（如髌骨滑动/瘢痕活动） | 接受后仍不可见（静默丢失） | 可渲染，可跳过 |
| 专业模式 / 主动项 | 不受影响 | 不变 |

## 6. 测试侧建议

若契约钉"接受补查必出现"：方向侧现在与力量侧一致，均通过续测旁路保证已接受补查项可渲染。可验证场景：自助模式 → 处理完成主诉未解决 → 建议含被动方向 → 接受 → 回到评估时该项可见且可跳过。
