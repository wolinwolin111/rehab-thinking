# 测试交接档 · 批 G/H/G修复/I/J-1 绑定轮（2026-09-01）

> 冻结证据链，只追加不改写。当前口径见 `test-workflow-continuation-handoff.md` §6。

## 1. 本轮范围与结果

按开发侧汇总通知（`255f724`，分支 `agent/dev-20260901`——**新的通知载体形态**：汇总档+专用分支，非逐批 development-to-test 通报）绑定 5 个通报 SHA。merge tip `f5be546` → merge commit `35c405a`，契约迁移 `b355f90`。回归 run=`reg-20260901091214-24388` **verdict=passed**：full **67 passed + 0 skipped**（基线保持）、overall 10/10、mobile 2/2、fast/knowledge PASS。

## 2. ⚠️ 范围事实：合入的是 9 个提交，不是 5 个

merge-base（`7d5cc7e`）到 `f5be546` 之间 main 上有 **9 个提交**；通知档只列了 5 个。另外 4 个（`aaf136e` 恐动追问退役、`ad04092` 评估卡节奏、`977eb64` 功能卡内嵌、`32085ce` 移动/toast 样式）是 `8411e33` 的祖先——git 上不可绕开，且每个自带 development-to-test 文档、不在"在途勿等"清单，按交接处理。**测试侧已按 9 批迁移契约；请开发后续通知档把这类"打包祖先"显式列入**，避免测试侧每次做范围对账。

## 3. 契约迁移明细（6 处）

| 测试 | 变更 | 依据批次 |
| --- | --- | --- |
| rendered-html.test.mjs | `站立屈髋` → `站立折髋（臀向后）`（ID 不变；踝/大腿区仍留旧名勿误改） | 批 H |
| function-together FR-2 重写 | Q2 追问退役：钉 `.rm-fear-together` 不出现 + 问句串消失；恐动作主因可提交。下游低负荷提示（stoppedFromFear）需完成态靶子，并入 Phase 4.2 请求 | 批 A（aaf136e） |
| continuation-chain C-1/C-4 | 接受补查 toast `已加入继续检查的方向` → `已加入补查方向`（32085ce 缩短 toast） | 32085ce |
| continuation-chain C-3 | 成果面板按钮 `重新确认剩余问题` → `重新确认评估答案` | 批 A |
| professional-evidence-loop | 同上按钮改名（OR 正则同步） | 批 A |
| visual 基线 | `critical-home-mobile` 重生成（32085ce 移动网格/toast pill；溢出断言通过=纯样式漂移非破版；已目检确认） | 32085ce |
| registry | FR-2 titlePattern 对齐新标题；删过时 unableFearTogether notes | 批 A |

未受影响：批 G 力量队列裁剪（膝 7→2~4、大腿/小腿 4→1）——我的驱动按卡名条件点击、不钉队列数，实测无断；批 I/J-1 删除项（足趾主动控制/内翻与足弓控制/5秒→30秒）无测试钉。

## 4. 批 A 裁定存档（回答了我方开放问题）

**有效处理行标签维持现状**：肌肉行=肌群名、控制行=动作名（actionLabel）；治疗名只出现在处理卡与记录。OP-1 钉「训练股四头末端控制」正确，开放问题关闭。

## 5. 批 G §7 既有缺陷（dev 自曝，建议开条目）

**方向侧接受补查静默丢失**：补查建议池取区域方向全集，但装配经 `directionIsRelevant`/能力闸门过滤——用户接受被裁掉的方向补查时不出现且无提示（踝区早于批 G 存在；批 G 已修力量侧同类问题，方向侧未修）。本轮 C-1/C-4 未被它打断（toast 修复后全绿），但这是真实缺陷，**建议开发开条目修复**。

## 6. 夹具坑（通知档 §6 确认）

`outcome-panel-chief-action-line` 场景内"进入训练/查看评估记录"点击无响应（种子未满足工作流投影解锁）；测训练页用 `training-worse`。开发建议加"完成面板出口必须产生导航"通用契约——**测试侧认同，列为后续契约候选**。

## 7. 在途（勿等）

批 J 剩余（A 改名 7 条/B"骨盆不歪"/C 37 张 purpose/D 小腿区标题/E 可行性文案）、批 K-lite（术后转介）。完成后另行 SHA 通知。
