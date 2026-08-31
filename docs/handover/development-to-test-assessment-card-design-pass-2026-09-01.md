# RehabMind 开发→测试交接：评估卡问答区审美重排（批 E，纯样式）

日期：2026-09-01
基线：main @ `977eb64`（批 D）
批次 SHA：本提交

## 1. 批次内容

针对用户反馈"问题和选项排版丑"的审美 pass，纯 CSS、零 DOM/字符串/类名变更：

1. **选项按钮统一语言**：圆角 10→12px；背景从半透明白（在白卡上≈不可见）改实心浅灰 `#f8fafc`（可点击感）；min-height 56/60→52/54px（去松垮）；移动端字号 13→14px。
2. **追问区内嵌面板化**：`is-followup` 从"通栏背景与分隔线打架"改为带边距+自身边框+14px 圆角的内嵌面板（桌面 margin 6/18/18 + padding 16；移动 margin 2/10/12 + padding 13/12）。分组线索唯一化：主问题之间用分隔线，追问用面板。
3. **问题层级**：主问题 h3 桌面 19px/移动 17px；追问 h3 降为 17px/16px + 次级色 `#3d4443`——不再四道等权标题刷墙。
4. **节奏**：网格 gap 7→8px；问题与选项间距 13→10px。

## 2. 断言对照表

无字符串/类名/DOM 变更。受影响的是 computed 样式：视觉回归套件（@visual）需重新基线；若有契约钉过按钮 min-height/字号/圆角（预期没有），按上表更新。

## 3. 新场景靶子 id

无。前后对比截图：`%TEMP%\opencode\card-before.png` / `card-after.png`（390px，注入真实结构）；几何探针 `verify-function-card.py` 实测：追问面板 h3 内缩桌面 36px/移动 24px，主问题 23/15px，is-three 桌面 406×3、移动 177+通栏不变。

## 4. 不变式

- 主按钮蓝色不受影响：`.rm-page-actions > button.rm-primary`（主题 :384）优先级高于共享背景规则（:292），已验证。
- 共享按钮规则族（rm-options/rm-region-grid/rm-safety-list/rm-trigger-grid/rm-imaging/rm-page-actions）同步获得 12px 圆角与实心浅灰底——系统一致性是本批目的，非误伤。
- 动作/力量卡（直接子级 section）padding 与分隔线维持批 D 行为。

## 5. 非阻塞范围

- 错误/冲突 toast 内联化（批 BC 档 §5 结转）。
- 评估卡若引入图标化选项/进度点，属交互设计变更，需产品另行立项。

## 6. 已知坑

- 主题文件在基础样式表之后加载：改按钮类样式必须动 `rm-visual-theme.css` 的共享规则族（:288-297），只改 complete-demo.css 会被覆盖（本批两处都改了，保持双文件同步）。
- 追问面板的 `border` 简写会替换掉 section 的 `border-bottom` 分隔线——这是设计意图；若未来给 is-followup 加回分隔线会造成双线。
