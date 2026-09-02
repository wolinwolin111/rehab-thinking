# RehabMind 开发→测试交接：移动端体验整改第 1 批（UI/文案）

日期：2026-09-02
基线：main @ `138e2b1`（上一批 C1 哨兵统一 + K-P0-06 注释）
批次 SHA：本提交
范围：owner 移动端实测反馈（图1–图8）中的 UI/文案类；知识合同层（踝下台阶项、自定义动作复现、功能分问法）留第 2 批。

## 1. 本批改动（10 源文件 + 1 资源）

| # | 项 | 文件 | 说明 |
|---|---|---|---|
| A-1 | 转介/警示卡次级按钮不可见 | `rm-visual-theme.css` | `.rm-route-note .rm-page-actions > button:not(.rm-primary)` 显式深色字+白底+可见描边（原 `.rm-route-note button` 强制白字 + 视觉主题改浅底 → 白字浅底看不见） |
| A-2 | 点"做过手术"清空上方已选 | `rehabmind-workbench.tsx` | `applyIntakeChange` 加 `preserveConfirmation` 选项；手术三题 handler 传它，跳过 `setSafety({})/setSafetyStage(0)/setBoneRisk({})/setImaging(...)` 重置 |
| A-2b | 手术问题答完不折叠 | `confirmation-stage.tsx` + `complete-demo.css` | 答完收敛为一行"已确认：做过·术式·时长"+「修改」按钮（点修改清空重展开）；`.rm-surgery-confirmed` 样式 |
| B-1 | 顶栏 RM → LOGO | `rehabmind-workbench.tsx`、`rehabmind-onboarding.tsx`、`complete-demo.css`、`public/logo-mark.png` | 两处 `<b>RM</b>` → `<img class="rm-brand-mark" src="/logo-mark.png">`；源图压缩到 160px/17KB；`.rm-brand-mark` 样式 + 移动端缩放 |
| B-2 | 案例编号提示悬浮+自动消失 | `once-hint.tsx`、`rehabmind-workbench.tsx`、`rm-visual-theme.css` | OnceHint 加可选 `autoDismissMs`（保留关闭按钮+localStorage，仅新增定时隐藏）；case-code 提示传 `autoDismissMs={3200}` + `className="rm-floating-hint"`；移动端把该子元素 `position:fixed` 悬浮（父容器 `.rm-context-hints` 保持 static，不破既有契约） |
| B-3 | 移动端首屏提示换行 + 部位chips | `symptom-stage.tsx`、`complete-demo.css` | label 加 `.rm-entry-hint` 类，移动端 `word-break:keep-all + text-wrap:balance + 13px`；部位 chips 移动端收紧 padding（`.rm-compact-atlas-nav button`） |
| B-4 | 补问文案精简 | `symptom-stage.tsx`、`lower-limb-location-picker.tsx` | "只补充最关键的信息"→"先补最关键的几项"；"一次只评估一个大部位…"→"先选一个大部位，可标记多个位置" |
| B-5 | "主诉动作已复查"三态 | `stage-outcome-sections.tsx`、`treatment-retest-stage.tsx` | ChiefOutcomeSummary 加 `chiefRetested` 入参：真复查没变→"主诉动作已复查，没有明显变化"；本次没测→"主诉动作本次未单独复查"；变轻→"主诉变轻"。两处调用点传 `chiefRetestCompletedDuringTreatment` |

## 2. 契约测试影响（重要）

本批刻意**不破坏任何 QA 源码契约测试**。落地前用 stash 对比验证：改动前后 `tests/unit tests/workflow tests/component` 失败集合**完全一致（47 条，均为预存基线红，与本批无关）**，即本批引入 0 新失败。

- B-2 特意保留 OnceHint（而非改 toast），以维持 `contextual-tip-contract`（`active={!testContext`、"反馈问题时…告诉我们。"、once-hint 内部 localStorage/关闭按钮）与 `mobile-app-shell-contract`（`.rm-context-hints … position: static`）两条契约——悬浮只作用在子元素 `.rm-floating-hint`，父容器仍 static。
- B-3 特意保留 label 纯文本串"不适部位 · 出现时间 · 受影响动作 · 恢复目标"，以维持 `first-use-entry-contract` 对该串的断言；换行只用 CSS 修。

## 3. 验证

- `npm run typecheck` 干净；`eslint` 改动文件 0 error（仅 1 条 `<img>` warning，与既有 3 处 `<img>` 风格一致，项目不用 next/image）。
- 逻辑/组件/单元全量：与基线差异为空（0 新失败）。
- 浏览器实测（dev :3000）：顶栏 `img.rm-brand-mark` 存在且 `naturalWidth>0`（/logo-mark.png 正常加载），品牌文字无残留 "RM"。

## 4. 待第 2 批（知识/评估合同层，未做）

- 踝区补"下台阶"功能项（选项②：主诉下楼直接复现，不再代换为膝碰墙）。
- 自定义动作复现项 (a′)：无负重模仿复现 + 负荷/安全闸。
- C-2 功能问法按"距离/幅度类 vs 能力类"分问法。
- A-3 对应主诉标注：待映射修正后名字自然对齐，再定是否仍需显式标注。

## 5. 给测试侧

- 本批无行为契约变更（刻意保持），若有移动端视觉回归请以实际 DOM 断言。
- B-5 若测试侧此前钉过旧标题"主诉动作已复查"，需按三态更新（本次未测→"主诉动作本次未单独复查"）。
