# RehabMind 开发→测试交接：功能卡贴边与分隔线修复（批 D，移动体验批追加）

日期：2026-09-01
基线：main @ `32085ce`（批 BC）
批次 SHA：本提交

## 1. 批次内容

功能动作卡的问答区（`rm-function-result-stack` 内的 section）此前完全贴卡片边缘且无分隔线：卡片本体的 padding/border-bottom 规则族全部用直接子选择器（`.rm-check-card > section`），而功能卡的 section 嵌套在 stack 里，一条都匹配不上。本批把选择器扩展到 stack 子级并让 stack 布局透明（去 gap/margin）。

## 2. 断言对照表

无用户可见字符串变化；纯 CSS 选择器扩展 + `.rm-function-result-stack` 规则改写（`display:grid;gap:12px;margin-top:14px` → `display:block`）。若契约钉过 stack 的 computed 样式（不太可能），需同步。

## 3. 新场景靶子 id

无。验证用 DOM 注入探针（构造 check-card>stack>section 全链量 inset/分隔线），脚本 `%TEMP%\opencode\verify-function-card.py`。

## 4. 不变式

实测：桌面 section padding 22px/20px、移动 14px/15px；h3 与按钮距卡缘 15–23px；节间 1px 分隔线、末节无线；is-three 桌面三等分/移动 2+通栏（批 BC 规则）不受影响。动作/力量卡（直接子级）样式零变化。

## 5. 非阻塞范围

其他卡片若未来引入同类"包装层"结构，需沿用本批"选择器覆盖嵌套层"的模式；不做全局选择器重构。

## 6. 已知坑

`.rm-check-card > section` 家族是**直接子选择器**——任何往 check-card 里加分组容器的改动都会静默丢样式（padding、分隔线、min-height），必须同步扩展 `.rm-function-result-stack > section` 同款选择器。
