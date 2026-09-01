# RehabMind 开发→测试交接：UX 文案清理（品牌统一 + 目标文案断裂修复）

日期：2026-09-01
基线：main @ `a2fcaf7`（上一批 ③ 处理完成态靶子修复）
批次 SHA：本提交（详见文末）

## 1. 改动内容（2 个独立修复，一个提交）

### 1.1 品牌统一（3 个文件 + 1 附加）

**问题**：普通用户首次使用会看到三个不同品牌名——欢迎页「悦舒运动康复」、教程弹窗「RehabMind 入门」、顶部栏「RehabMind」、菜单「关于 RehabMind」、logo 只有「RM」。

**修复**：
- `rehabmind-workbench.tsx:6786`：顶部品牌按钮 `<strong>RehabMind</strong>` → `<strong>悦舒运动康复</strong>`
- `rehabmind-workbench.tsx:6788`：「关于 RehabMind」→「关于悦舒运动康复」
- `rehabmind-onboarding.tsx:93`：「RehabMind 入门」→「入门指南」
- `mobile-app-navigation.tsx:108`：「关于 RehabMind」→「关于悦舒运动康复」

**不动**：资产路径 `/rehabmind-region-*`、`data-rehabmind-*` 属性、代码内部标识符——这些不是用户可见文案。

### 1.2 目标文案选 A 显示 B 修复（3 个文件）

**问题**：自助模式用户在 symptom-stage 选择目标时看到的是 `GOALS_SELF` 白话版（「先消肿止痛」「疼痛明显减轻」「恢复日常活动」），但案例栏、记录页、保存记录时 `getGoalLabel` 固定用 `GOALS_PRO` 专业版显示（「急性反应减轻」「基础症状改善」「恢复正常生活」），导致用户选的标题和看到的标题不一致。

**修复**：
- `workbench-support.tsx:1676-1677`：`getGoalLabel(level)` → `getGoalLabel(level, useProfessional = false)`，按模式返回对应文案
- `case-summary-bar.tsx:14`：传 `intake.productMode === "thinking"`
- `rehabmind-workbench.tsx`：5 处调用点均传 `!workflowProfile.isGuided`
- `pilot-test-workbench.tsx:178`：传 `snapshot.intake.productMode === "thinking"`

**影响**：自助模式用户现在看到自己选的「先消肿止痛」而非「急性反应减轻」。专业模式用户不变（仍看 PRO 版）。历史记录中已保存的 goal 字符串不受影响。

## 2. 断言对照表

| 断言点 | 改前 | 改后 |
|---|---|---|
| 顶部品牌按钮文字 | RehabMind | 悦舒运动康复 |
| 教程弹窗标题 | RehabMind 入门 | 入门指南 |
| 移动端「关于」菜单 | 关于 RehabMind | 关于悦舒运动康复 |
| 案例栏目标（自助用户） | 急性反应减轻/基础症状改善/恢复正常生活 | 先消肿止痛/疼痛明显减轻/恢复日常活动 |
| 专业模式案例栏目标 | 不变 | 不变 |

## 3. 测试影响

- 现存测试用 `恢复日常活动`/`恢复正常生活` 点击目标选择按钮（symptom-stage 渲染层用 `GOALS = GOALS_SELF`），**不受影响**。
- `rendered-html.test.mjs` 17 pass / 6 fail（基线不变）。
- 无测试依赖 `getGoalLabel` 输出或 PRO 版目标标题在显示层出现。

## 4. 仍开放

测试侧通报的 **批 G §7 方向侧接受补查丢失缺陷** 未在本批涉及，建议开条目跟踪。