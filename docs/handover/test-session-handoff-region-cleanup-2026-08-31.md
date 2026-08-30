# RehabMind 测试会话交接：非生产区域清理回归

> 日期：2026-08-31（会话结束）
> 测试分支：`agent/testing`（worktree `D:\Study\codex\project\rehabmind-agent`）
> 开发基线：`7c3e734`（含 `46cf0dc` 前置重构 + `4f8a67d` 删除 + `7c3e734` 注释对齐，已合并）
> 上一份交接：`docs/handover/test-session-handoff-recurrent-flare-2026-08-31.md`

---

## 验收结论（删除后全绿）

- `rendered-html.test.mjs` 契约已按删除后口径修正并转绿（23 pass，0 fail）：
  - 生产 4 区域（thigh-local/knee/calf-local/ankle-foot）齐全（knee/ankle-foot 在 full-demo-content，thigh/calf 在 local-limb-regions）
  - 7 非生产区不在 FULL_REGIONS 装配；`UNSUPPORTED_REGION_NAMES` 覆盖 7 区（名称表驱动提示）
  - `DIRECTION_CHAINS` 导出断言已销账（candidate-order-core 用私有副本）
  - hip/lumbar 删除内容断言已改负断言（`lumbar-hip-hinge`/`hip-sit-stand-hinge` 不存在），knee 哨兵（`knee-standing-hip-flexion`）保留
  - 旧快照恢复安全降级断言：`restoreRecord` 用 `isPilotRegion` 过滤 bodyLocations 非生产 regionId
- **提肩/提颈提示**：`暂不支持肩关节与肩胛/颈部，现在只开放大腿至足部`（46cf0dc 名称表驱动生效）
- **check:knowledge**：ok（cases=8/episodes=11/findings=22/treatments=14/retests=14），与 dev 复核一致
- **test:fast**（含 typecheck 编译连带兜底）EXITCODE 0

## 本批次场景（registry 84→88）

| id | 断言 | 文件 | 状态 |
|---|---|---|---|
| KR-CONTRACT-prod-region-only | 生产 4 区齐全 + 7 非生产区不在 FULL_REGIONS + UNSUPPORTED 覆盖 + DIRECTION_CHAINS 销账 | `tests/component/rendered-html.test.mjs` | passed |
| U-1 | 提肩→暂不支持肩关节与肩胛 | `tests/browser/scenarios/unsupported-region-hint.spec.ts` | passed |
| U-2 | 提颈→暂不支持颈部 | 同上 | passed |
| U-3 | 旧快照非生产 regionId 恢复安全降级（isPilotRegion 过滤） | `tests/component/rendered-html.test.mjs` | passed |

## 关键知识（点击即得）

- 名称表：`workbench-support.tsx` `UNSUPPORTED_REGION_NAMES`（7 区域 id→名称），「暂不支持」提示只依赖它。
- `FullRegionId` 收窄为 4 值；`FULL_REGIONS` 装配只含生产区（thigh-local/calf-local 经 local-limb-regions 导入，knee/ankle-foot 对象定义在 full-demo-content）。
- 删除导出：`DIRECTION_CHAINS`/`getFullRegion`/`getFullExercises`/`matchFullCandidateGroups`/`FULL_REGION_BY_ID` 均可回归时确认无引用（candidate-order-core 用私有 DIRECTION_CHAINS 副本）。

## 回归记录

- test:fast EXITCODE 0；`check:knowledge` ok；Edge full **57 passed + 9 skipped**；overall 4/4；移动预览 2/2。
- 证据绑定 `7c3e734` + 本会话提交。
