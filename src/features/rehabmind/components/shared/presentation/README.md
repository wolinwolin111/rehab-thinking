# Presentation 组件层（ui-presentation-consolidation 产物）

一个组件的外观、内部排布与状态样式由**一个所有者**维护：本目录的 `.module.css`＋`presentation-tokens.css`。台账与迁移状态见 `docs/handover/ui-presentation-consolidation-ledger-2026-09-09.md`。

## 新增按钮/入口该用什么

| 需求 | 用 | 禁止 |
|---|---|---|
| 主操作/次操作/安静/危险按钮 | `ActionButton`（variant + size="compact" 表示非关键紧凑） | 页面里裸写 `<button>` 再补 CSS 尺寸 |
| 答案选项（单选/多选） | `ChoiceButton`＋`ChoiceGroup`（问题已可见时传 `labelVisible={false}`） | 按钮组＋`is-selected` 只靠颜色 |
| 折叠辅助内容 | `Disclosure`（管理区/更多操作用默认 boxed） | 新的 `<details>` 无样式三角 |
| 状态提示 | `StatusNotice`（tone 驱动配色；重要失败不得只发 Toast） | 每页手写提示条 |
| 底部固定操作栏 | `ActionRail`（actions 数组，容量 3、槽位唯一；超容量放正文替代出口） | 手拼 `rm-page-actions` 容器 |
| 步骤标题 | `StepHeading`（ui-primitives 转接 TaskHeading） | 新写 `.rm-heading` 类 |
| 问答卡外框 | `TaskCard` | 每卡渐变/彩顶边 |

## 布局改动去哪里

- 组件内部排布 → 对应 `*.module.css`（媒体查询只改排列；皮肤在所有视口生效）。
- 页面区块顺序/间距 → 页面组件的布局层。
- 底栏固定框架/测量 → `action-rail.module.css`＋workbench 唯一测量者（勿建第二 observer）。
- 统一视口条件：≤359 / 360–720 / landscape(≤1024×≤600) / 桌面回归区；断点过渡检查 721/820/1024。

## 禁止

- 新 CSS 用 `!important`；选择器超过组件类＋状态/直接子类。
- `nth-child`/`first-child` 判断动作语义（用 `data-action-role`）。
- 页面穿透改组件皮肤（布局除外，且需说明）。
- 给未迁移元素套新组件类再叠加旧类"双保险"——迁移按原子单元完成并登记台账。

## 稳定定位

迁移组件输出 `data-present="action-button|choice-button|choice-group|task-card|task-heading|status-notice|disclosure|action-rail|stage-transition"`：CSS 装甲（:not 排除）与测试定位共用这一属性；`data-rehabmind-test`、`data-answer-id` 契约保留。
