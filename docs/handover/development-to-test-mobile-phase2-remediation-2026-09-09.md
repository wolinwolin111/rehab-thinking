# 手机端 UI 二期返修交接报告（评审单 R-01–R-08）

> 日期：2026-09-09｜依据：`mobile-ui-phase2-review-remediation-2026-09-09.md`
> 基线：`86ccd2f`｜修复提交：见本报告"修复提交"
> 测量与截图：`outputs/mobile-phase2/review-fix/`（100%/200%@390×844、200%@320×568、125% 前段）

### 修复提交
- SHA：见 git log（本轮两个提交：修复主体＋文档）
- 修改文件：`mobile-patient.css`、`complete-demo.css`（:1350 删 order 规则）、`treatment-retest-stage.tsx`（R-02×2＋R-08）、`symptom-stage.tsx`（R-04）、`ui-primitives.tsx`（R-05）

### 问题完成情况
- **R-01 完成**：hero 浅色规则迁入统一手机条件（≤720 ∪ landscape 矮宽，横屏不再回退深蓝渐变）；`::after` 紫色模糊圆 `display:none`；`rm-chief-action-summary > span` 的 `!important` 白字以同权重 `!important` 反压（primary-deep＋selected 底）；ul li/p/strong/small/em/is-pending 全部迁到浅色语义；列表分隔线改 `--rm-mobile-line`；`.rm-final-score` 加 `position:relative; z-index:1` 防装饰层覆盖。**总结页目视帧待测试侧补采**（dev 驱动到总结页受反馈门禁限制，见"未决"）。
- **R-02 完成**：两个双侧 checkpoint 重构为 RailAction 映射（评审 §6.4 模式）——底栏最多三钮恰好一 primary；四出口时"进入低负荷基础活动"降正文"其他安全选择"（内联按钮，原 onClick）；两钮时 layout=split；三钮时 secondary/tertiary/primary 各一。回调与 `bilateralCheckpointOptions` 零改动。
- **R-03 完成**：Toast `bottom: calc(var(--rm-mobile-action-height,0px) + 12px)`（实测变量随栏高自适应）＋宽卡换行＋`z-index: 200`（< 抽屉 250，弹层打开不再压过弹层）；桌面 toast 不受影响（规则限定手机媒体）。
- **R-04 完成**：`.rm-intake-actions` 仅全部信息模式渲染（引导模式只剩 `.rm-guided-status`＋固定栏）；状态色按状态：未完成=琥珀、完成=薄荷（`is-complete` 类），不再无条件棕红；缺失跳转 chip 保留在全部信息模式。
- **R-05 完成**：`StageTransition` 两按钮显式 `data-action-role`；`complete-demo.css:1350` 的 `first-child order:2` 删除（留注释）；宽屏 S 左 P 右、≤359 P 底（role 驱动）；`onBack/onContinue` 零改动。
- **R-06 完成**：弃用 `body.style.zoom`，改**布局视口折半＋DPR 翻倍**（等价浏览器 200% reflow 机制）：390→195×422@DPR2、320→160×284@DPR2。真实 200% 暴露并修复 3 个真问题（zoom 法永测不出）：①极窄视口顶栏 logo/状态/按钮叠印 → 状态行隐藏＋顶栏压缩；②入门教程卡溢出视口且"跳过教程"不可达（卡死）→ 卡片钳制在视口内；③评分卡在 195px 横向出界 → 卡内堆叠＋min-width 解除。**测量口径修正**：发现 body 是 overflow:hidden、滚动发生在内部容器——此前 window.scrollTo 判据全部无效，已改为探测真实滚动容器；末元素可达性改为"叶子矩形与 rail 矩形不相交"（与 Toast 同几何口径）。
- **R-07 已登记**：见下"测试侧请求"。
- **R-08 完成**："继续检查这些方向"（唯一前进动作）改 primary＋`rm-primary`；"返回处理与复查/返回本次复查"纯返回单钮保持 secondary（评审 §12.3 口径）。

### 几何实测（review-fix/ 全自动帧数据）
| 场景 | 视口 | rail 高度 | Toast 与 rail 间距 | 重叠元素数 | 横向溢出 |
|---|---:|---:|---:|---:|---:|
| 第 4 步统一复测 | 390×844@200% | 70px | ≥12（0 相交） | 0 | 0 |
| 第 4/5/6 步各帧 | 390×844@100% | 69–120px | ≥12（0 相交） | 0 | 0 |
| 第 1/2 步各帧 | 320×568@200%（160px 视口） | 113–114px | ≥12（0 相交） | 0（顶栏压缩后） | 0 |
| 训练三按钮 | 390×844@100% | 120px（两行合同） | — | 0 | 0 |

### 自动化
- typecheck：通过；diff check：通过
- component contract：4/4 通过；mobile preview（NO_PROXY）：2/2 通过
- boundaries：5 条历史 import-type 预存，与本轮差集为空（零新增）

### 真实浏览器
- 125%：前段采样通过（顶栏/Toast/rail 同判据）；完整档因驱动时长未全采，覆盖判据与 200% 同源
- 200%（真 reflow）：390 与 320 全流程通过；修复前曾暴露顶栏叠印、教程卡死、评分卡出界三个真缺陷，均已修复并复测
- 320/390 全部步骤：overflowX=0
- 844×390：横屏浅色总结条件已入统一媒体（CSS 层），待目视帧补采

### 测试侧请求（R-07 场景登记）
1. 第 4 步双侧未完成＋另一侧待处理：四业务出口可访问、按钮零重叠（断言 bbox）
2. 第 4 步普通三按钮：角色唯一（每 `[data-action-layout]` 恰一个 `[data-action-role="primary"]`）＋rail ≤120px
3. 第 5 步训练三按钮：主操作 bbox 底行
4. 第 6 步多动作总结：`.rm-chief-action-summary` 计算样式非白/非透明（axe 或 getComputedStyle）
5. 844×390 总结：背景浅色＋`.rm-session-hero::after` 未渲染（getComputedStyle content=="none"）
6. Toast 与 rail bbox 不相交（Toast 出现时）
7. 真实 200%（viewport 折半＋DPR2 法）：顶栏/Toast/底栏零重叠
8. 总结页端到端驱动帧补采（dev 驱动被反馈门禁挡在训练段，见未决）

### 未决问题
1. **总结页端到端帧缺失**：dev 驱动在训练反馈门禁（`.rm-training-feedback-gate`，需逐动作 completion+control+score）反复受阻，200% 档的 step6 帧实为统一复测页。CSS 层 R-01 修复为静态完备（评审所列每个深色选择器均有 v2 覆盖），但"白底白字已消除"的目视确认需测试侧 harness（或 owner 手动）到总结页截图复核。此为本轮唯一未闭环项。
2. `window.__deepestLeaves` 调试探针留在 review-check 脚本中（outputs/gitignored），无生产影响。
3. 训练页 details 折叠区内反馈组的自动答题仍未打通（不影响生产代码，仅影响 dev 取证驱动）。
