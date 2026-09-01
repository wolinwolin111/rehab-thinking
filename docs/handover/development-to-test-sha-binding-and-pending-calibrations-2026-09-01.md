# RehabMind 开发→测试交接：SHA 绑定协议生效与本批遗留口径

日期：2026-09-01
持有者：开发会话（本文件由 dev 侧维护，测试侧读后在 QA 文档回写结论）
基线：本地 main @ `7d5cc7e`；agent/testing @ `1d44857`（含 `f397c28` merge）

## 0. 本文件替代人工转发的约定

自本批起，dev→test 的批次交付、契约迁移说明、待裁定项一律写入本目录
`development-to-test-*.md`（一批一份），测试侧按 SHA 异步回归后在
`docs/quality/*` 或 `test-session-handoff` 回写。产品裁定类事项仍由用户转达。

## 1. 协议三点（测试侧已确认生效，此处存档）

1. dev 每批自验（typecheck + 场景落点）通过即提交 main 并通报 SHA，工作树不冻结、随即开下一批。
2. 测试侧对提交 SHA 回归（merge 进 agent/testing），推送用显式 SHA/refspec，勿整推 main。
3. 回归红 → dev fix-forward 补提交，只复跑受影响项。

## 2. 需测试侧回话的一项：origin/main 分叉

`git fetch` 实测：origin/main 尖端停在 8/23 的 `ed3af73`，与本地 main 分叉 49/187；
本轮绑定实际只落了 agent/testing。请确认正式线口径：

- 若正式线 = agent/testing：建议显式废弃或归档 origin/main，防止有人从旧线拉出鬼分支；
- 若仍需 main 远端线：请给出推送方式（本地 main 领先 187 笔，且远端有 49 笔本地没有，直接推会被拒）。

## 3. 上轮问题③（有效处理行标签）——dev 侧结论：维持现状

| 行类型 | 显示 | 来源 |
| --- | --- | --- |
| 有效处理·肌肉 | 肌群名（大腿前侧肌群） | `candidateMuscleFocus().label` |
| 有效处理·控制 | 动作名（训练股四头末端控制） | `candidate.actionLabel \|\| title` |
| 治疗名（XX松解） | 只出现在处理卡与记录，成果行从不使用 | — |

该取法是本轮之前的原始设计，两轮重构未动标签源，非缺陷；契约按现状钉。
若产品后续裁定改治疗名，dev 另开小批（改 `rehabmind-workbench.tsx:2896-2903`）并通报 SHA。

## 4. 环境与纪律存档

- dev server 由开发侧管理；改源码前先停服（Windows vite watcher 对编辑器同目录 tmp 文件会 EBUSY 崩服）。
- 定向场景断言请作用域到工作台根节点：launcher 的场景描述文本含「本轮处理已完成」等同样字样，全页 body 匹配会假阳性。
- 带 `trialRecords` 的种子必须走 `fixtureKind: "outcome-panel-records"` 身份盖章通道（服务端快照合同要求 treatmentRecordId + 身份三元组 + assessmentRevision 且与包装器一致）。
- 继续排查池 = 区域方向+力量全集（不过滤 access）；膝场景种子需含 `motion:knee-scar-mobility` 才能落 :746 面板。

## 5. 本批（54b2b8e + 7d5cc7e）契约迁移说明补记

- 「仍有待处理」行已删（裁定 B）：`仍有待处理`、`可重新确认或先进入训练`、`unresolvedImmediateLabels` 在 stage 文件中不复存在；`problem-ledger-core` 的空态标题「仍有待处理问题」是另一出口，仍可达，勿误撤。
- 结论句三分支与降级行字符串位于 `stage-outcome-sections.tsx`（`ChiefOutcomeSummary`），不再在 `treatment-retest-stage.tsx` 内。
- :954 guided 面板 h2 不再取 `chiefComplaintLabel`；双侧特例「已分别记录两侧的整体感受」保留。
- 场景靶子 `outcome-panel-chief-action-line` 同时钉：结论句之一、`p.rm-chief-action-line`、`rm-stage-outcome-table` 结构。
