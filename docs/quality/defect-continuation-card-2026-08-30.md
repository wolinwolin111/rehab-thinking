# DEF-CONTINUATION-CARD：继续排查卡在已文档化流程中不可达

- 日期：2026-08-30
- 状态：待开发确认（浏览器层无法复现卡片出现）
- 关联：8150b06 fix(rehabmind): show continuation card on completed panel and reset per session；
  开发侧交接第三部分 C-1~C-4
- 测试侧代码：`tests/browser/scenarios/continuation-chain.spec.ts`（C-1/C-2/C-3/C-4 标记 fixme）

## 现象

按开发交接 C-1 描述的决策链（主诉"下蹲疼" → 首轮查完/处理复查完成、分数未降 →
处理完成面板出现"XX还没有得到解释——还可以检查：…"），在浏览器中以三种口径驱动
专业模式（康复思路·自我检查，右膝内侧，单动作下蹲）：

| 口径 | 评估 | 处理/复测 | 结果 |
|---|---|---|---|
| A | 下蹲功能=做不完/没力，伸直/屈曲受限，内侧力量正常 | 批量复测：伸直受限+下蹲能完成 | 面板停在终局分支；复查台账"下蹲 功能动作 1项待完成"；无卡片 |
| B | 同 A | 伸直接近目标（义务闭合）+ 分数维持 5 | 复查台账 0 项待完成；面板仍带「重新确认剩余问题」；无卡片 |
| C | 下蹲功能=可以做完/稳定/不会（走"分数未降"路径，基线 5/10 确认，终末复测分数维持 5） | 处理+复测全部闭合 | 面板（本阶段成果/蹲起）仍带「重新确认剩余问题」；无卡片 |

三种口径均未出现 `.rm-stage-outcome-track` 内的"还没有得到解释"卡片。

## 初步定位（测试侧静态分析，供开发参考）

1. 卡片渲染条件（`treatment-retest-stage.tsx:737`）：
   `treatmentComplete && completedTreatmentAttempt && continuationSuggestions.length`。
2. `continuationSuggestions` 依赖 `chiefStillSymptomatic`（分数未降或主诉动作异常）与
   `planContinuationAssessments`（域逻辑单测已覆盖，触发条件本身可满足）。
3. 三种口径下完成面板均渲染为带「重新确认剩余问题」的终局分支（893 行附近），
   而卡片位于 `completedTreatmentAttempt` 分支（724~756 行）。
   疑点：存在未闭合的投影状态使流程始终落入终局分支，或 `treatmentComplete`
   投影与"复查台账 0 项待完成"的界面状态不一致。
4. 观察到的矛盾：复查台账显示"0 项待完成"、训练居家"可进入"，但面板仍出现
   「重新确认剩余问题」入口。

## 请求开发

- 提供卡片出现的一次可复现操作序列（或指认上述三种口径中哪一步的答案是错的）。
- 确认「重新确认剩余问题」入口与卡片互斥是否为预期。

## 影响与回归计划

- C-1（完整链路）、C-2（跳过）、C-3（收敛）、C-4（会话隔离 reset per session）四条
  浏览器场景已写好断言骨架并标记 fixme；修复后去 fixme 即可回归。
- C-5（主诉未解决时不得出现"继续"类误导入口）已在 MIX-02 覆盖并通过。
