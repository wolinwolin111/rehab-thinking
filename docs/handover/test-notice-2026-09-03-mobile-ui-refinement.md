# RehabMind 测试知会：移动端体验整改第 1.5 批（品牌安全 / 布局修正 / 密度收紧，2026-09-03）

## 范围：dev 分支 agent/dev-20260901（基线 `dd43ec6`，本批 = 本提交）

| # | SHA | 说明 |
|---|---|---|
| 1 | `dd43ec6` | feat(ui): 移动端体验整改第 1 批（上一批） |
| 2 | 本提交 | feat(ui): 移动端体验整改第 1.5 批（品牌安全 / 布局 / 密度） |

## 本批内容（详见 development-to-test-mobile-ui-refinement-2026-09-03.md）

- C-1 品牌（顶栏 LOGO）不可点：不再触发一键清空重来；开新案例走「开始康复 / 康复记录→新建案例」。
- C-2 案例编号提示加 `!onboardingOpen` 门控：引导页关闭后才出现。
- C-3 图3：部位范围提示从页脚移到顶部（`.rm-location-scope`，独立一行）。
- C-4 图2：atlas 两行按钮高度统一（42px；≤560px 统一 40px）。
- C-5 图4：≤560px 全局密度收紧（症状输入卡 / 收集卡 / 肌肉紧张度题 / 评分卡 / 按钮）。
- C-6 图5：症状输入标题改为 flex 不可断词单元，单词不破、仅在"·"间整齐换行。

## ⚠️ 契约测试需测试侧同步（本批唯一）

图5 标题由单文本串改为 `<span>` 单元结构，破坏两条 QA 源码契约断言，**请测试侧更新为正则**（owner 已确认方案 A）：

- `tests/component/first-use-entry-contract.test.mjs:43` 与 `tests/component/rendered-html.test.mjs:112`
- 旧：`/不适部位 · 出现时间 · 受影响动作 · 恢复目标/`
- 新：`/不适部位[\s\S]*·[\s\S]*出现时间[\s\S]*·[\s\S]*受影响动作[\s\S]*·[\s\S]*恢复目标/`

预期：`first-use-entry-contract` 测试 1 转红（行 43）；`rendered-html` 失败子测试集合不变（仍 6 条预存红，其中「keeps NRS history…」的失败点由行 933 提前到行 112）。更新断言后恢复。

## 验证

typecheck 干净；eslint 0 error；Playwright（Pixel 5）实测图1 顶部 topbar/stagebar 几何不重叠、图5 flex 换行符合预期。

## 第 2 批预告（未做）

踝区下台阶项、自定义动作复现项(a′)、功能分问法(C-2)、A-3 对应主诉——知识/评估合同层，单开。
