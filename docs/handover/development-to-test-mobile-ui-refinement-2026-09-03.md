# RehabMind 开发→测试交接：移动端体验整改第 1.5 批（品牌安全 / 布局修正 / 密度收紧）

日期：2026-09-03
基线：main @ `dd43ec6`（上一批移动端第 1 批）
批次 SHA：本提交
范围：owner 对第 1 批的复查反馈（品牌点击危险、案例编号提示时机、图1–图5 布局/密度问题）。

## 1. 本批改动（5 源文件 + 2 样式）

| # | 项 | 文件 | 说明 |
|---|---|---|---|
| C-1 | 品牌不可点 | `rehabmind-workbench.tsx` + `complete-demo.css` | `.rm-brand` 由 `<button onClick={resetDemo}>` 改为 `<span>`（保留 `data-rehabmind-tutorial="brand"` 供教程定位，去 `cursor:pointer`）。`resetDemo` 仍由 onboarding「开始康复」使用，开新案例入口保留在「开始康复/康复记录→新建案例」。品牌不再承担"一键清空重来" |
| C-2 | 案例编号提示时机 | `rehabmind-workbench.tsx` | 提示 `active` 条件加 `!onboardingOpen`：只在引导页关闭后（且已有案例编号）出现，不再与引导页同屏 |
| C-3 | 图3：部位范围提示上移 | `lower-limb-location-picker.tsx` + `complete-demo.css` | 页脚「目前开放大腿、膝盖、小腿、脚踝和足部…」移到顶部 `.rm-location-picker-head` 内 `.rm-location-scope`（flex 独立一行，整行文本，不再与侧别胶囊挤在同一行） |
| C-4 | 图2：atlas 两行按钮统一高度 | `complete-demo.css` | 第一行（左/右侧）按钮 `min-height 46px` → `42px`（与第二行一致）；≤560px 两行统一 `40px`（修正原 560 规则特异性不足、第一行仍被 46px 覆盖的问题） |
| C-5 | 图4：移动端密度收紧 | `complete-demo.css` | 新增 ≤560px 密度块：`rm-hero-input`（label 14px / textarea 170px min-height / 内边距 12px）、`rm-collected` 卡、`rm-assessment-feeling`（肌肉紧张度题 select 46px/14px）、`rm-familiar-symptom-question`、`rm-shared-tension-check`、`rm-score`（output 34px/scale 11px）、`rm-label`、分页按钮（44px）统一收紧 |
| C-6 | 图5：症状输入标题→不可断词单元 | `symptom-stage.tsx` + `complete-demo.css` | label 由单文本改为 flex 结构：`不适部位` `·` `出现时间` `·` `受影响动作` `·` `恢复目标` 各为 `<span>`（`white-space:nowrap`），`flex-wrap` 只在分隔符处整齐换行，任何单个词不被切断 |

## 2. 契约测试影响（重要，需测试侧同步）

本批为得到图5 的"单词不破、仅在分隔符换行"，**刻意改动了症状输入标题的字面结构**，破坏两条 QA 源码契约断言（owner 已确认方案 A：改结构 + 通知测试侧更新断言）：

| 文件 | 行 | 现断言 | 需改为 |
|---|---|---|---|
| `tests/component/first-use-entry-contract.test.mjs` | 43 | `assert.match(symptom, /不适部位 · 出现时间 · 受影响动作 · 恢复目标/)` | `assert.match(symptom, /不适部位[\s\S]*·[\s\S]*出现时间[\s\S]*·[\s\S]*受影响动作[\s\S]*·[\s\S]*恢复目标/)` |
| `tests/component/rendered-html.test.mjs` | 112 | 同上字面串 | 同上正则 |

- 预期影响：`first-use-entry-contract` 测试 1 由绿转红（行 43）；`rendered-html` 的「keeps NRS history…」子测试原本在行 933 已红，现提前在行 112 红（失败子测试集合不变，仍 6 条，均为预存基线红）。
- 其余文案/结构未动：`请说明不适部位、出现时间、受影响的动作和恢复目标。`（步骤标题 note）、占位符示例、"不清楚的内容可以写不清楚"等均保留，相关断言不受影响。

## 3. 验证

- `npm run typecheck` 干净；`eslint` 改动文件 0 error（仅 1 条 `<img>` warning，与基线一致的既有风格）。
- 组件/契约测试：`first-use` 除上述行 43 外全部绿；`rendered-html` 失败子测试集合与基线一致（6 条预存红，无新增失败子测试）。
- Playwright（Pixel 5，393×851）实测：
  - **图1 顶部**：`.rm-topbar`（0–58px）与 `.rm-mobile-stagebar`（滚动钉住 y=58）几何不重叠（overlap = 0.0px）。实测确认无碰撞。
  - **图5 label**：flex 结构生效，四个词完整不破，仅在"·"之间整齐换行（"受影响动作 · 恢复目标"落到第二行，属预期）。
  - 浮动案例编号提示 `top:64px` 在 stagebar 钉住区（58–129px）会短暂压住进度条，已下调为 `top:68px` 减轻（`rm-visual-theme.css`）。

## 4. 未做 / 待复查

- 图1 顶部：实测无几何重叠。若 owner 在真机上仍见视觉"碰撞"，多半是顶栏半透明白 + 渐变细线与 stagebar 白底同色系造成的视觉贴合感，需 owner 提供新截图或文字描述再定。
- 第 2 批（知识/评估合同层）未动：踝区下台阶项、自定义动作复现项(a′)、C-2 功能分问法、A-3 对应主诉标注。

## 5. 给测试侧

- **必须更新**上表两条契约断言为正则（否则该两条测试持续红）。这是本批唯一需要测试侧同步的变更。
- 本批无其他行为契约变更；移动端视觉请以实际 DOM/几何断言（如各标题词 `span.rm-entry-hint > span` 的存在）。
