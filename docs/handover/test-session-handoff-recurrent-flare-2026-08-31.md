# RehabMind 测试会话交接：症状收集「最近一次出现时间」

> 日期：2026-08-31（会话结束）
> 测试分支：`agent/testing`（worktree `D:\Study\codex\project\rehabmind-agent`）
> 开发基线：`1806d9f`（含 `e3b9359` + `d9e8f2a` + `1806d9f`，已合并）
> 上一份交接：`docs/handover/test-session-handoff-professional-batch2-2026-08-31.md`

---

## 验收结论

- **R-1 专业面板条件题**通过：onset=反复出现 → 「最近一次出现」字段出现；切离反复出现 → 字段隐藏 + 值清除；专业面板「还需补充」清单含字段名「最近一次出现」。
- **R-2/R-3/R-4 已固化并通过**（dev `663c6c8` 定向场景，安全确认边界 step 1）：
  - R-2（反复+今天内+崴伤）→ 关键确认出现「骨性风险」阶段
  - R-3（反复+一周以上+崴伤）→ 无「骨性风险」无骨性问答（窗口外不判急性）
  - R-4（反复+今天内+没有明确受伤）→ 无「骨性风险」无骨性问答（无外伤不判急性）

## 本轮全部关闭

## 本批次新增场景（registry 80→84）

| id | 断言 | 文件 | 状态 |
|---|---|---|---|
| R-1 专业面板条件题 | onset=反复出现→lastEpisode 出现；切离→隐藏+清除；footer 还需补充含「最近一次出现」 | `tests/browser/scenarios/recurrent-flare-intake.spec.ts` | passed |
| R-2 急性再发踝→骨性问答 | 反复+今天内+崴伤→骨性风险阶段出现 | 同上 | passed |
| R-3 对照：一周以上→无骨性问答 | 反复+一周以上+崴伤→无骨性风险问答 | 同上 | passed |
| R-4 对照：无外伤→无骨性问答 | 反复+今天内+没有明确受伤→无骨性风险问答 | 同上 | passed |

## 关键知识（点击即得）

- 字段：`IntakeState.lastEpisodeOnset?`（可选）；`LAST_EPISODE_ONSETS = ["今天内","1～3天前","4～7天前","一周以上","说不清"]`。
- 必答条件：`intake.onset === "反复出现" && !intake.lastEpisodeOnset` 进 `intakeMissingFields`（清单显示「最近一次出现」）。
- 切换清除：专业面板 onset onChange `lastEpisodeOnset: 反复出现 ? 保留 : undefined`（L341）。
- 消费：`isAcuteTrauma` 扩展——7 天内，或 反复 + 最近一次∈{今天内,1～3天前}；且机制∈{扭转或崴伤,跌倒或碰撞,跑跳或拉伤} → 急性链生效（Ottawa 骨性问、低刺激提示、跑跳限制）。自发再发（无受伤/逐渐出现）不判急性。
- 机制题相关性（1806d9f）：`mechanismQuestionRelevant` 增加「反复 + 最近一次∈{今天内,1～3天前}」条件。
- 快照：`lastEpisodeOnset` 可选，旧快照缺省兼容，不 bump 版本。

## 待开发补充（已交付，已完成）

- dev `663c6c8` 提供 `recurrent-flare-acute` / `recurrent-flare-chronic` / `recurrent-flare-no-trauma` 三个 page_boundary 定向场景（step 1 安全确认边界，播种 onset+lastEpisodeOnset+mechanism 绕开解析层）。R-2/R-3/R-4 据此固化并通过。
- ⚠️ 注：这三个场景 step:1 是目录中首例（此前 page_boundary 均 step 3/4），本次验证通过，无恢复链路意外。

## 回归记录

- test:fast EXITCODE 0；R-1 定向 7.3s 通过。
- 证据绑定 `1806d9f` + 本会话提交。
