# DEF-RETEST-01 处理复测结果行文案与台账原始 id 泄漏

> 日期：2026-08-30
> 批次：知识库重构批次（92fc130..8150b06）测试会话
> 基线：worktree `agent/testing` @ fca0f71（dev 基线 8150b06 + 测试侧适配提交）
> 严重级别：中（文案合同不符 + 展示信息泄漏，不阻塞数据完整性）
> 状态：**已修复（`5db4aca`）并复测通过**——`passive-limited` 文案统一为「仍受限，未明显改变」；
> 台账 range 义务 label 经 `professionalAssessmentTitle` 映射，`knee-extension` 泄漏消除。
> RET-02 断言已收紧为 `toContainText("仍受限，未明显改变")` + `not.toContainText("knee-extension")`。

## 现象

### 缺陷 A：复测结果行文案不符对照表 #7

在专业模式（康复思路模式 + 自我检查）完整评估后进入处理复测，把主诉方向
（膝关节主动伸直 AROM）的复测幅度记录为「仍受限」：

- **预期**（交接文档第二部分对照表 #7、第四部分不变式）：
  结果行显示「**仍受限，未明显改变**」；
  旧行为（把"仍受限"写成"范围改善"）已由 8.27 批次修复，本批次不得回潮。
- **实际**：复测面板底部「复测结果」行显示「**仍偏小**
  （膝关节主动伸直（AROM）仍偏小）」。

位置：处理复测批量复测面板 → 复测结果行。
相关代码：`src/features/rehabmind/components/stages/treatment-retest-stage.tsx`
L421-422 已有 `better-passive-limited → 范围改善，仍受限`、
`passive-limited → 仍受限，未明显改变` 的文案映射；本例（主动幅度仍受限）
落到第三个结果 id，未命中任何文案映射，回退为「仍偏小」。

### 缺陷 B：复查台账泄漏原始评估 id

同一面板的「复查台账 · 处理后仍需确认的项目」出现原始评估 id
「**knee-extension**」而非中文标题（应显示「把膝盖绷直」或
「膝关节主动伸直（AROM）」）：

```
复查台账 处理后仍需确认的项目 3 项待完成
下蹲功能动作 待复查 / 下台阶功能动作 待复查 / knee-extension 活动范围 待复查
```

## 证据

- 复现路径：tests/browser/p0/decision-gates.spec.ts `RET-02 不同活动动作分别完成处理后复测 @p0`
  （主诉：右膝内侧疼 3 个月；动作：下蹲 + 下楼或下台阶；评估：下蹲/台阶做不完（没力或撑不住）→
  伸直/屈曲活动受限；处理完成后批量复测，伸直幅度记录「仍受限」）。
- 错误上下文（2026-08-30 全量回归 run full-20260830033657 前）：
  `artifacts/quality/playwright/test-results/p0-decision-gates-P0-固定决策门禁-RET-02-*/error-context.md`
- 页面快照关键字段：
  `复测结果 膝关节主动伸直（AROM）仍偏小`、
  `knee-extension 活动范围 待复查`。

## 测试侧处理

- RET-02 当前断言放宽为 `/仍受限，未明显改变|仍偏小/` 并附注释指向本档案；
  开发修复后请收紧为 `toContainText("仍受限，未明显改变")`。
- 对照表 #7 的其余文案（终局面板按方向显示、无「使用同一个复测结果」）
  已由 RET-02 其余断言覆盖且通过。

## 建议修复方向（供开发参考）

1. 为主动幅度仍受限的结果 id 补充文案映射，指向「仍受限，未明显改变」。
2. 复查台账渲染处对原始评估 id 走 `professionalAssessmentTitle(id, title)`
   （workbench 已有现成函数）。

## 开发侧补充定位（2026-08-30 复测轮，8191fb0 基线复核）

### 期望 vs 实际对照（缺陷 A）

| 项目 | 文案 | 出处 |
| --- | --- | --- |
| 期望（对照表 #7 + 复测字典） | **仍受限，未明显改变** | `treatment-retest-stage.tsx` L422：`passive-limited → 仍受限，未明显改变` |
| 实际 | **仍偏小**（页面呈现 `膝关节主动伸直（AROM）仍偏小`） | 未命中映射表 fallback，回落到原文案 |
| 期望（台账 label） | **膝关节主动伸直（AROM）** 等「动作 + 范围偏小」结构 | `professionalAssessmentTitle(id, title)`（同文件 L375 已有正确用法） |
| 实际（台账 label） | **knee-extension**（原始域 id 直接渲染） | 见缺陷 B |

### 缺陷 B 精确组件定位（8191fb0 基线）

- **构造点**：`src/features/rehabmind/components/workbench/rehabmind-workbench.tsx` L6225
  `professionalRetestItems = activeRetestLedger.obligations.filter(...).map((item) => ({ ...item, kindLabel, statusLabel }))`
  —— 仅映射了 `kindLabel/statusLabel`，**`label` 原样透传 obligation 的原始域 id**。
- **渲染点**：同文件 L6831 `<strong>{item.label}</strong>`，容器：
  `<section className="rm-aside-retest-ledger" data-testid="retest-ledger-summary">`（L6819-6821），
  每条目带 `data-obligation-id=...` 属性，DevTools 可直接定位。
- **修复参考**：同文件 L2907 已有正确用法
  `professionalAssessmentTitle(`motion:${directionId}`, directionId)`；在 L6225 的 map 中对
  `label` 做同款映射即可。

### 复现命令（dev 本地）

```bash
npm run dev                      # 8191fb0 起 dev 已前置幂等迁移
npx playwright test tests/browser/p0/decision-gates.spec.ts --project=edge-full -g "RET-02"
```

复测记录：本会话 `8191fb0` 基线上 RET-02 宽松断言通过
（`/仍受限，未明显改变|仍偏小/`），「仍偏小」与 `knee-extension` 泄漏**仍在**（缺陷未修复，
RET-02 无法按原计划收紧为 `toContainText("仍受限，未明显改变")`）。
