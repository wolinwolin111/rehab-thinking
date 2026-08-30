# RehabMind 测试会话交接：专业模式批次 1

> 日期：2026-08-31（会话结束）
> 测试分支：`agent/testing`（worktree `D:\Study\codex\project\rehabmind-agent`）
> 开发基线：`effeb36`（专业模式批次 1，已合并）
> 上一份交接：`docs/handover/test-session-handoff-knowledge-refactor-2026-08-30.md`（缺陷全关闭）
> 前置确认：开发工作区 `tests/` 为 8.26 旧版与 src 不匹配；**后续回归一律以 `agent/testing` 的 `tests/` 为准，开发侧不触碰 `tests/`**。

---

## 验收结论

- **批次 1 全部通过**：案例栏、四区布局、集中记录、可追加检查、完成态折叠均已实装，B1-1~B1-4 新场景 + 既有 43 条全绿（full 49/49）。
- INT-07 未受影响（旧 h1「按阶段查看这次康复」保留）。
- 新增视觉基线：`tests/browser/visual/critical-layout.spec.ts-snapshots/critical-assessment-queue-edge-full-win32.png`（工作台四区布局截图已更新）。

## 本批次新增场景（registry 71→75）

| id | 断言 | 文件 |
|---|---|---|
| B1-1 案例栏内容与修改主诉入口 | `case-summary-bar` 主诉原话 + facts（部位/性质/时间/安全/目标）+「修改主诉」回症状信息（专业集中填写页） | `tests/browser/scenarios/professional-workbench-batch1.spec.ts` |
| B1-2 集中记录写入后逐项卡状态同步 | `.rm-batch-record` 选主动「患侧偏小」→「未记录」→「需逐项补充」→ 返回再进保持（面板 span 文案） | 同上 |
| B1-3 可追加检查权限显示 | `.rm-workbench-appendable` + `rm-workbench-capability` 徽标（已开放/按权限/未开放）+ 无专项空态 | 同上 |
| B1-4 台账待复查列 | `rm-workbench-module` 待复查项目 + 空态文案 | 同上 |

## 关键知识（点击即得）

- 案例栏：`case-summary-bar.tsx`，`data-testid="case-summary-bar"`，facts 为部位/性质/时间/安全/目标五元组；修改主诉按钮 `onEditComplaint` → 回症状信息（专业模式为集中填写 01-07 页，**无** `#chief-description` textarea）。
- 集中记录：`.rm-batch-record`，文案「集中记录 / 活动度检查一屏录入主动范围」，底部「只记主动范围；需要追问不适或力量的项目，回到逐项检查补全」。选项来自 `activeMotionRangeOptions`；逐项卡状态 `record.active ? 需逐项补充 : 未记录`（**只测主动，缺不适/被动/力量等后续**）。
- 可追加检查：`.rm-workbench-appendable`，徽标 `canRunSpecialTest ? 已开放 : canAssessEndFeel ? 按权限 : 未开放`；无专项时空态「当前主诉没有需要追加的专项检查」。
- 台账待复查列：`.rm-workbench-module`（待复查项目）+ `.rm-workbench-retest-row`（label + kindLabel ± side）；pending 数量来自 `retestLedgerItems.filter(pending)`。
- 主动答案变化连带清除链：`workbench-support.tsx` `motionActiveAnswerPatch`（主动→清被动/力量/不适等，逐项卡与批量面板共用）。

## 已知边界（批次 1 设计如此）

- 集中记录第一版只覆盖**活动度主动范围**；被动、不适、力量需回逐项检查补全。
- **自查模式膝伸直特殊项不进批量面板**（`item.id === "motion:knee-extension"` 且 `!canAssessResistance` 排除）。
- 慢性无外伤主诉无可追加专项（空态）；专项触发需急性外伤机制（见知识重构交接 §4）。

## 回归记录

- test:fast EXITCODE 0；Edge full **49/49**（B1-1~4 + visual）；overall 4/4；移动预览 2/2。
- 证据绑定 `effeb36` + 本会话提交。

## 移交开发（后续批次注意事项）

1. 后续回归以 `agent/testing` 的 `tests/` 为准；开发工作区 `tests/` 若为旧版会误报失败（RET-02 已破案），建议开发忽略本地 `tests/`。
2. 集中记录目前只覆盖主动范围；批次 2 若扩展（被动/力量入批量面板），需同步 `batchItems` 过滤与 `motionActiveAnswerPatch` 清除链，并新增对应场景。
3. 案例栏 facts 的「安全」值依赖 `canContinueSafety/assessmentNeedsReferral`；后续安全链路变更可能影响该列文案。
