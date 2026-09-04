# RehabMind 开发→测试：2026-09-01 批次 SHA 绑定通知（批 G/H/G修复/I/J-1）

日期：2026-09-01
发送方：开发
接收方：测试（agent/testing）

## 待绑定 SHA（按序合入，均在本地 main，已随分支 `agent/dev-20260901` 推送可达）

| # | SHA | 批次 | 交接文档（同提交内） |
|---|---|---|---|
| 1 | `8411e33` | 批 G：膝/大腿/小腿力量检查按主诉位置裁剪 + 两个闭链检查专业标题重名修正 | development-to-test-strength-gate-and-title-fix-2026-09-01.md |
| 2 | `fff8951` | 批 H：训练卡"为什么练这个"目的行 + pilot 规则注入卡发现校验（含膝区三张红名改名） | development-to-test-training-purpose-and-pilot-gate-2026-09-01.md |
| 3 | `0c9ce2c` | 批 G 复核修复：续测接受项旁路 + 腘绳触发词对齐决策核 | 同上批 G 文档 §7 |
| 4 | `a9a6b04` | 批 I：跟腱等长 5s→30s、删足趾主动控制训练卡、新增台阶边缘缓慢下落离心卡（跟腱路径第 2 会话起双卡） | development-to-test-achilles-dose-eccentric-and-toe-removal-2026-09-01.md |
| 5 | `f5be546` | 批 J-1：删除踝区内翻与足弓控制训练卡及三处规则引用 | development-to-test-remove-ankle-inversion-control-2026-09-01.md |

## 绑定要点（跨批次汇总，细节以各文档 §2 断言对照表为准）

1. **钉字符串契约需更新**：`闭链踝背屈功能检查`/`闭链踝背屈活动度检查`（批 G）、`脚跟后拉发力`/`仰卧下压脚背`/`站立屈髋`（膝区，批 H）、`足趾主动控制`（批 I 删）、`内翻与足弓控制`（批 J-1 删）、`每次保持5秒`→`每次保持30秒`（批 I）。
2. **队列行为变更**：思考模式膝区力量 7→2~4 项、大腿/小腿力量 4→1 项；自助模式与踝区队列实测不变。若契约钉过旧数量，按批 G 文档 §2 更新。
3. **训练卡 DOM**：有 purpose 的卡在"怎么做"前多一个 dt（"为什么练这个"/思考模式"训练目的"）；膝区 15 卡 + 跟腱 2 卡已带，其余暂缺省不渲染。
4. **规则注入卡**：仅由 pilot trainingIds 注入且无其它来源的训练卡需命中发现标签（批 H）；`ANKLE-R04.trainingIds` 现为空数组（批 J-1）。
5. **已知红基线**：工作区 `tests/` 在 HEAD 上自带 6 个既有失败（与 src 漂移），勿归因本五批；以 agent/testing 契约为准。
6. **夹具坑通报**：`outcome-panel-chief-action-line` 场景内"进入训练/查看评估记录"点击无响应（种子未满足工作流投影解锁），测训练页请用 `training-worse`；建议加"完成面板出口必须产生导航"通用契约。

## 在途未提交（勿等）

- 批 J 剩余：A 改名 7 条（标题保专业词+括号补充）、B"骨盆不歪"6 处、C 37 张 purpose、D 小腿区标题、E 可行性文案（含滑跟末端保持剂量稿）。
- 批 K-lite：术后转介（一题+转介卡+术式时长查表分流，阈值正对照 AAOS 术后康复书逐术式核实中）。

以上完成后另行 SHA 通知。

---

# 追加通知（2026-09-01 第二轮）：批 J / 批 K-lite / 种子缺口①②

按 §6.2 通知载体改进要求，本轮**显式列出全部提交（含打包祖先）**。

## 范围事实：本轮 6 个提交，其中 2 个为文档类打包祖先

基线 = 上一轮 tip `f5be546`（已绑定）。`f5be546..255f724+` 区间共 6 提交：

| # | SHA | 性质 | 内容 |
|---|---|---|---|
| 1 | `6bd1832` | **打包祖先（纯文档）** | docs/research：术后阈值逐术式 AAOS 书证（半月板缝合 4月→6月修正） |
| 2 | `d1cbf15` | **打包祖先（纯文档）** | docs/research：PCL 站点核对补记 + 执行清单 |
| 3 | `5f12b4c` | **功能** | 批 J：命名回改（标题保专业词+短括号，批 H 三张回改）、53 卡 purpose 全覆盖、可行性文案（滑跟末端保持/屈髋碰墙/足弓收短/步态两段/单腿拍视频锚点）、四项裁决（删膝足弓卡+KNEE-R07 引用、力量/功能同动作去重、砍抬脚趾半段、新增低台阶落地下定卡） |
| 4 | `e11b081` | **功能** | 批 K-lite：术后分流（确认步三题组仅自助、术式阈值查表转介 RehabGuide、refer 态封锁继续入口、proceed-recorded 放行记录）+ **方向侧接受补查旁路修复**（§6.2 转办项，能力闸门独立保留） |
| 5 | `00e417a` | **测试靶子** | 种子缺口①②：`treatment-worse-stop`（worse 记录→停止面板）+ `bilateral-per-side-retest`（双侧逐侧复测态） |

分支 `agent/dev-20260901` 已快进到 `00e417a`，全部可达。

## 契约迁移要点（每批详表见各自 development-to-test 文档）

1. **批 J**（development-to-test-batch-j-copy-and-adjudications-2026-09-01.md）：批 H 轮钉的 `站立折髋（臀向后）`/`大腿后侧绷紧保持`/`仰卧绷脚背` 需再迁移为 `站立屈髋（臀部向后）`/`大腿后侧等长保持（脚跟轻拉地面）`/`仰卧踝跖屈（绷脚背）`；`勾脚与抬脚趾控制`→`踝背屈控制（勾脚）`；`knee-supine-arch-control` 删除；膝区训练卡数仍 15（删足弓+加落地卡）、四区总数 54→**53**（purpose 全覆盖）；思考模式同动作去重（外侧膝+单腿站计划→队列无臀肌力量卡）。**建议**：契约改用卡 id 定位、标题只做弱断言——命名本批已二次迁移。
2. **批 K-lite**（development-to-test-batch-k-postop-routing-2026-09-01.md）：新 testid `surgery-question`/`postop-referral`/`postop-referral-open`/`postop-recorded-note`/`surgery-had-*`/`surgery-procedure-*`/`surgery-timing-*`；新记录状态"术后转介专项指导站"；新场景 `postop-referral`；专业模式与旧快照行为不变。
3. **种子缺口**（development-to-test-seed-gaps-2026-09-01.md）：新场景 `treatment-worse-stop`、`bilateral-per-side-retest`（落点已实测）；**③ 根因已定位未修**——outcome 场景 `baselineScoreConfirmed:false` 破坏 intakeComplete→maxUnlocked=0→出口死锁，合法修复路径（多主诉动作→not-comparable）与风险已写入文档 §4，Phase 4.2 执行。
4. **回归基线**：typecheck 干净；工作区 tests 6 既有红不变；测试侧 agent/testing 契约由本轮三份 development-to-test 文档驱动迁移。

---

# 追加通知：2026-09-01 第三轮——③ 处理完成态靶子修复（Phase 4.2）

## 范围：实际 3 个提交，含 2 个打包祖先（文档类）

分支 `agent/dev-20260901` 快进范围 `00e417a..a2fcaf7`：

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `450a18e` | **打包祖先（文档）** | 第二轮 SHA 通知档（已单独同步过，随本次一并可达） |
| 2 | `10ff663` | **打包祖先（文档）** | dev→dev 接手指南（硬规矩/架构/待办/批次索引/环境陷阱） |
| 3 | `a2fcaf7` | **代码** | ③ 处理完成态靶子修复：outcome 场景 `baselineScoreConfirmed:false` 死锁解除 |

## ③ 修复要点（详表见 development-to-test-outcome-target-fix-2026-09-01.md）

- 根因链：`baselineScoreConfirmed:false` → `intakeComplete=false` → `maxUnlocked=0` → 「进入训练/查看评估记录」被 workflow 静默拒绝（死按钮）。
- 修复（仅 `scenario-catalog.ts` 一个文件）：① 保 `baselineScoreConfirmed:true`；② 种 `reportedActions` 两条（下楼、下蹲）→ `reportedActionSummary().length===2` → `not-comparable` → 降级行「主诉动作：下楼、下蹲」保留、intakeComplete 成立；③ 首条 trialRecord 加 `chiefRetested:true` → 不生成 pending 主诉义务 → `pendingRequiredCount=0` → `treatmentComplete=true` → `maxUnlocked=4`。
- 实测：rail「5 训练居家」=**可进入**；点击「进入训练」→ 进入训练过渡页；`data-pending-count`=0；零 pageerror；`rendered-html` 17 pass / 6 fail（基线不变）。
- 测试侧钉该场景：断言改为「进入训练可导航 + rail 训练可进入 + 降级行存在 + pending-count 为 0」。

---

# 追加通知：2026-09-01 第四轮——UX 文案清理（品牌统一 + 目标文案断裂）

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `6258424` | 代码 | UX 文案清理：品牌统一（悦舒运动康复）+ getGoalLabel 按模式返回（选 A 显示 A） |

## 要点

1. **品牌统一**：顶部栏/移动端「关于 RehabMind」→「关于悦舒运动康复」；教程弹窗「RehabMind 入门」→「入门指南」。欢迎页本来就是「悦舒运动康复」，现全程一致。
2. **目标文案断裂修复**：自助用户选「先消肿止痛/疼痛明显减轻/恢复日常活动」，案例栏/记录页/保存记录此前显示 PRO 版（急性反应减轻等），现已按模式返回对应文案。专业模式不受影响。
3. **测试影响**：现存测试用目标选择按钮（SELF 版）定位，不受影响；rendered-html 17/6 基线不变。
4. **仍开放**：批 G §7 方向侧接受补查丢失缺陷（测试侧建议开条目，本批未涉及）。

---

# 追加通知：2026-09-01 第五轮——方向侧续测补查项静默丢失修复

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `c66b21d` | 代码 | 批 G §7 遗留：方向侧续测补查项静默丢失修复（被动能力闸门加续测旁路） |

## 要点

1. **根因**：`assessments` 装配 `motionItems` 第二个 filter（被动能力闸门）无续测旁路。自助模式 `canAssessPassive=false`，P0 表外被动方向项（髌骨滑动 `knee-patella-*`、瘢痕活动 `knee-scar-mobility`）与 P0 表内 `ankle-cuboid-mobility` 均在 `p0AssessmentAccess` 返回 undefined 或 `visible:false` 时被裁掉；用户接受补查后 `continuationRoundIds` 已写入，但装配仍不可渲染 → 静默丢失。
2. **修复**：`rehabmind-workbench.tsx:1355-1358` 把 `continuationRoundIds.includes("motion:"+id)` 旁路提到整个 filter 表达式之后，覆盖 `reviewedAccess` 与 fallback 两个分支。未接受续测时行为不变；接受后被动方向项可渲染（评估卡自带「暂不检查｜今天先跳过」出口，自助用户可跳过，不卡死）。
3. **验证**：npx tsx 直测 4 方向项（未接受=false/接受=true），主动项不受影响；typecheck 干净；rendered-html 17/6 基线不变。
4. **契约提示**：若测试侧钉"接受补查必出现"，方向侧现在与力量侧一致（均经续测旁路保证已接受项可渲染）。详细见 development-to-test-direction-continuation-bypass-2026-09-01.md。

---

# 追加通知：2026-09-01 第六轮——方向续测旁路复核修复

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `55c726f` | 代码 | 对抗性复核发现 c66b21d 续测旁路可能让自助用户接受被动-only 方向补查后渲染空卡 → 卡流程；加 guard 限制旁路仅对自助用户可完成的项生效 |

## 要点

1. **根因**：c66b21d 的续测旁路 `(reviewedAccess ? ... : ...) || continuationRoundIds.includes()` 会绕过被动能力闸门，自助用户接受被动-only 方向（如髌骨滑动、瘢痕活动、骰骨活动）后，渲染空卡无法完成。
2. **修复**：guard 条件 `(item.testMode !== "passive" || canAssessPassive)`，被动项续测旁路受限（不渲染，不卡流程），主动/combined 项续测旁路不变。
3. **验证**：npx tsx 直测 5 方向项；typecheck 干净；rendered-html 17/6 基线不变。
4. **c66b21d 已推送**，55c726f 为 fix-forward 提交，不 amend 已推送历史。

---

# 追加通知：2026-09-03 第七轮——踝区下台阶功能项（第二批①）

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | 本提交 | 代码 | 踝区下台阶功能项：主诉「下楼/下台阶」直接复现，不再代换为膝碰墙 |

## 要点

1. **行为契约变化**（详见 development-to-test-ankle-step-down-2026-09-03.md §2）：踝区主诉含「下楼/下台阶」时，评估队列由 `function:ankle-knee-wall`（膝碰墙背屈）改为 `function:ankle-step-down`（下台阶直接复现）。踝区「踝前卡/背屈/膝碰墙」与膝区「下楼/下台阶」均不受影响。
2. **契约提示**：若测试侧钉过「踝区下楼→膝碰墙」队列，需迁移为「踝区下楼→下台阶」；建议用卡 id 弱断言标题（`ankle-step-down` 友好标题「下台阶（脚踝）」）。
3. **验证**：typecheck 干净；纯核心探针 5 项断言全过；组件/契约测试与批次 1.5 末态一致（first-use:43 批次 1.5 已知红 + rendered-html 6 条预存红），本批 0 新失败。
4. **第二批其余**：自定义动作复现项(a′)、C-2 功能分问法、A-3 对应主诉标注——后续单开。

---

# 追加通知：2026-09-03 第八轮——第二批②③④（功能分问法 / 自定义动作复现 / A-3 结论）

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | 本提交 | 代码 | ② 自定义动作复现项(a′，含安全闸) + ③ C-2 功能分问法 + ④ A-3 结论 |

## 要点（详见 development-to-test-function-questions-and-custom-action-2026-09-03.md）

1. **③ 行为契约变化**：`ankle-knee-wall`（膝碰墙背屈）功能卡问法由「能做完吗/稳不稳/会不舒服」改为「和另一侧相比，最大可控幅度」（接近另一侧/差一些/差很多/说不清），并隐藏该类「稳不稳」。其余功能卡（下蹲/下台阶/单腿站/提踵等）问法不变。
2. **② 新行为**：自定义动作（匹配不到标准功能项时）新增 `function:custom-action` 评估卡：3 档负荷选择（完全不承重/需承重但可扶/只能原样负重，附锐痛即停提示）+ 评分；硬闸（急性外伤或肿胀淤青）时显示「今天先不做现场复现」+ 记报评分。「稳不稳」对该卡隐藏。
3. **安全闸口径**：`isAcuteTrauma(intake) || symptoms含「肿胀或淤青」`——与 ankle-step-down/ankle-hop 现有闸门同源。负荷依赖型疼痛（只有负重才疼）**必须**复现，不被闸门拦。自定义动作处理/复测走 target:chief 链（chiefActionLabel），不依赖此卡。
4. **④ A-3 关闭**：①②③ 落地后动作名已自然对齐，无需显式标注。
5. **验证**：typecheck 干净；纯核心探针 6 项断言全过（跪坐→custom-action、起身→knee-sit-stand 不产生 custom-action、下楼→knee-step-down 不受影响、meta/relevance/rank 正确）；组件/契约测试基线 18/7 不变（0 新失败）；子代理挑刺复核无阻塞项、snapshot 兼容（customActionLoadTier 为可选字符串，validateAssessmentResults 不拒未知字段）。
6. **契约提示**：若测试侧钉过膝碰墙三问，需迁移为幅度比较四选项。


# 追加通知：2026-09-03 第九轮——回应测试侧 app-shell-layout 移动端回归（pointer-events 修复）

## 范围：实际 1 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `2fbce9c` | 代码 | app-shell-layout 移动端 hit-test 拦截修复：`.rm-brand` + `.rm-floating-hint` 加 `pointer-events:none` |

## 回应测试侧反馈（app-shell-layout 移动端回归）

确认你方 Playwright hit-test 判定：批 1.5 C-1 把 `.rm-brand` 从 `<button>` 改成 `<span>` 后**未加 `pointer-events:none`**，配合 B-2/C-2 的浮动案例编号提示（`position:fixed; top:68px; z-index:160`），两者在移动端拦截 stagebar「查看阶段」按钮点击（20s 超时）。这是真实回归，同意你方判定。

## 修复做法

`src/features/rehabmind/styles/complete-demo.css` 两处：

1. `.rm-brand` 加 `pointer-events: none`——C-1 后它已是非交互品牌（span），不再承担点击，不该挡控件。
2. `.rm-floating-hint` 加 `pointer-events: none`（信息性浮层不挡控件），**并单独保留内部关闭按钮可点**（`.rm-floating-hint > button { pointer-events: auto }`），避免把「关闭」按钮一起失效。

## 验证

- typecheck 干净。
- 影响面：纯 CSS（`.rm-brand` 在 C-1 后已无 onClick；`.rm-floating-hint` 只在移动端 top:68 悬浮）。桌面端 `.rm-context-hints` 非 fixed 位置不受影响。
- 请求测试侧：重新跑 app-shell-layout 移动端回归，确认「查看阶段」按钮可点、brand/hint 不再拦截。
- **未用 workaround 掩盖**：无测试侧 workaround 被依赖；本修复直接消除拦截层。

## 测试侧已跟随迁移（确认收到）

你方所述"其余迁移（2 正则 + B-5 四态 + 视觉基线 + ankle 路由）已全部跟随，无阻塞"——收到，感谢。本批无额外依赖你方更新项。

---

# 追加通知：2026-09-03 第十轮——边界违规修复（d33c874，回应你的阻塞项）+ custom-action catalog 靶子

## 范围：实际 2 个提交

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `d33c874` | 代码 | **你方阻塞项的修复**：`functionalActionMeta` 经 stage-domain-adapters 再导出（并入既有 `skippedChiefActionTitles` 导出行），assessment-stage.tsx 改从适配层 import。与同文件其余 4 个 domain 函数口径一致 |
| 2 | `0e9cc34` | 测试靶子 | 新增 `custom-action-assessment` page_boundary 场景（回应你方建议 #4） |
| 3 | `1b55396` | 测试靶子 | 新增 `custom-action-deferred` page_boundary 场景（硬闸分支独立靶子） |

## 回应你方回话

1. **app-shell 回归验证 ✅ 收到**，2fbce9c 重跑绿（14.5s）确认。
2. **batch2 node 层 787/0 ✅ 收到**，你方补的 2 条 custom-action 逻辑单测也收到。
3. **边界违规**：同意判定，已在 `d33c874` 按你方给的一行修法落地——`stage-domain-adapters.ts` 再导出 + assessment-stage 改走适配层。typecheck/eslint 干净。**你方可直接合并推绿。**
4. **custom-action 靶子**：新增场景 `custom-action-assessment`（page_boundary / step 2 / 评估边界）：
   - intake 覆盖 `customAction: "跪坐"`（无标准功能项匹配词）→ 评估段自然落出 `function:custom-action` 卡（标题=主诉原文「跪坐」，未记录态）；
   - 默认非急性 → 卡显示「能不能用不承重的方式模仿这个动作？」四档（unloaded/assisted/full/skip）；
   - **硬闸分支**：独立场景 `custom-action-deferred`（`1b55396`）——intake 同时命中急性（onset 今天或昨天 + mechanism 扭转或崴伤）与肿胀（symptoms 肿胀或淤青），卡显示「今天先不做现场复现」+ 记报评分 + 暂时不做，不渲染四档；
   - 无需新 fixtureKind（纯 intake 覆盖），`launchWorkbenchScenario` 用 `custom-action-assessment` / `custom-action-deferred` 两个场景 id 分别钉两分支。

---

# 追加通知：2026-09-03 第十一轮——C-3 绑定确认收到 + b4acfe4 补通报（你方下一批需含）

## C-3 绑定（你方 8e26a1e）确认

- `b67ee5e`/`228a9aa` 合并无破损、`data-overlay-review` 接线四小腿圈 reviewed（只锁 calf 不锁 thigh）——方案一致，收到。path 几何不做像素锁的口径同意：视觉验收已由 dev 侧无头渲染 PNG 逐卡判读闭环（照片垫底 + 组件同款 viewBox/裁切），机器锁像素没有增益。

## b4acfe4 补通报（你方尚未绑定，下一批需含）

你方合并窗口在 `228a9aa`，其后还有一个提交：

| SHA | 内容 | 测试影响 |
|---|---|---|
| `b4acfe4` | ① 图1 回归修复：`rm-visual-theme` 移动端 `.rm-app img {width:auto;height:auto}`（特异性更高、后加载）把 `.rm-brand-mark` 顶回 160px 自然尺寸，撑破顶栏溢出到 stagebar（owner 移动端实测图1）。修复 = `.rm-app .rm-brand-mark` 以同特异性后序钉回 40px（桌面）/34px（移动）② 图3：完成面板「还没有得到解释」的顿号长串改 `<ul class="rm-outcome-unexplained-list">` 分点列表 | ① 若钉过顶栏几何/`.rm-brand-mark` 尺寸需复核（恢复正常 34px）；② 新增 `.rm-outcome-unexplained-list`（li 分点），若钉过该面板的顿号串联文案需迁移 |

## owner 图2（后内侧水滴圈）结论存档

owner 在 3000 本地看到「小腿后内侧」仍为宽水滴。已三层验证当前产物为窄带：(a) 3000 编译模块实测 `IS_NARROW_BAND:true`；(b) dev 渲染 harness 照片垫底读图确认；(c) 全仓/全分支 grep 旧 path（M350 778）零命中。旧水滴是 `9a2309c`（08-29）之前的形态，与任何含 YS LOGO（09-02+）的构建不可能共存。结论：owner 看到的是浏览器残存旧标签页/旧缓存，需硬刷新复核；此条仅存档，无代码动作。

---

# 追加通知：2026-09-03 第十二轮——C-3 终态（owner 亲手描摹笔画制全区落地）+ 图2 真因更正 + 契约迁移

## 范围：实际 7 个提交（你方已绑 `228a9aa`，以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `b4acfe4` | 修复 | 图1 回归：`rm-visual-theme` 移动端 `.rm-app img` 通配把 LOGO 顶回 160px（撑破顶栏/压 stagebar）→ `.rm-app .rm-brand-mark` 同特异性后序钉回 34px；图3 完成面板顿号长串改分点 `<ul>` |
| 2 | `2999181` | 样式 | complete-panel 头部居中保留、内容卡（力量交接/待解释方向）左对齐 |
| 3 | `f490361` | 样式 | 待解释方向三方向升级为序号条目卡（主词加粗+肌群注次级灰），渲染层拆 title 不改数据 |
| 4 | `df4613c` | 修复 | **图2 真因**：`resolveRegionId` 返回第一个 alias 命中，`calf-posterior` 的 `/小腿后/` 先于 `calf-medial` 的 `/小腿后内/`，label「小腿后内侧」被误解析为 posterior → 渲染后侧水滴图。修复 = calf-medial alias 条目前移（具体优先于宽泛） |
| 5 | `0bafb04` | 修复 | 后侧/外侧两圈按网格校准重新锚定（照片实测腿中轴 x~720/腓骨头 (500,850)） |
| 6 | `d7a0bc3` | **架构** | **肌肉高亮改 owner 亲手描摹笔画制**：`MUSCLE_ZONE_PATHS` 增可选 `strokes`（d/width/color/opacity），渲染层 stroke+共享 feGaussianBlur（userSpaceOnUse 全画布）；无 strokes 条目回落 fill 轮廓。四个小腿区落地 owner 笔迹；新增 `/c3-trace` 描摹工作台（保留） |
| 7 | `95ca239` + `9bd2fbf` | **架构** | **大腿四区全部迁移 owner 笔迹**（前侧3/后侧2/内侧3(重描)/外侧2 笔），八区 17 条笔画；内侧 5→3 重描为 owner 二次修正 |

## 图2 结论更正（撤销第十一轮的"旧缓存"判断）

第十一轮存档的"owner 看到旧缓存"**判断错误**。真因是 `df4613c` 所述的 alias 优先级 bug——owner 截图正是该 bug 的真实渲染（"小腿后内侧"标题 + 后侧水滴图）。`/c3-probe` 临时诊断路由已用于复现并修复，验证后删除。

## ⚠️ 契约迁移（muscle-region-location-picker.test.mjs，你方所有）

1. 八个区域条目断言 `new RegExp(`"${id}":[\\s\\S]*?path:`)` → 大腿后侧、小腿四区现为 **`strokes:`**；大腿前侧也是 `strokes:`；仅 `thigh-medial`……**全部八区均为 `strokes:`**（`path:` 字段仅存于 `plantar` 与回落渲染分支）。建议断言改为 `"${id}":[\\s\\S]*?(path|strokes):`。
2. `styles` 断言 `rgba(91, 170, 146, .32)`（is-selected 高亮填充色）——笔画制下 is-selected 改为笔画透明度提升（`.rm-floating-hint` 无关），该样式断言需按新选中态更新。
3. `walkthrough` 依赖的 `scripts/legacy-browser/real-browser-walkthrough.mjs` 仍缺失（文件级 ENOENT 基线红），与本批无关。

## 建议测试点（非阻塞）

- 紧张度页/处理卡八区笔画渲染存在（`svg path[stroke='#3565c4']` 计 17）。
- 「小腿后内侧」卡标题与图内容一致（窄定位带，非水滴）——图2 回归哨兵。
- 完成面板「还没有得到解释」分点列表渲染。
- 移动端顶栏 LOGO 34px 不溢出（图1 回归哨兵）。

## 当前阻塞

**无**。C-3 全区闭环（owner 描摹 → dev 落地 → 双端渲染验证）。描摹工作台 `/c3-trace` 保留（后续换照片/调区域 owner 自助）。


# 追加通知：2026-09-04 第十三轮——LOGO 透明化 + 评估转介文案准确性（HDUEYFGS 根因）+ specialSafety/stop-and-refer 分支

## 范围：实际 3 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `49df605` | 资源 | public/logo-mark.png 换 owner 选定素材（黑底转透明+居中裁方 160×160，Playwright canvas 像素处理）；旧版含烘焙文字噪点 |
| 2 | `16c80c6` | 修复 | 顶栏移除副标题「康复思路工作台」（只留品牌名）；转介卡新增 highIrritabilityReferral 分支（能完成但疼痛≥7 不再误显示「无法完成」）；新增测试场景 high-irritability-completed-painful |
| 3 | `e196817` | 修复 | 转介卡再补 specialSafetyReferral 独立分支（结构性筛查阳性不再落「无法完成」兜底）；stop-and-refer 面板区分神经 vs 持续加重两分支；清理 .rm-brand > span / .rm-brand small 死 CSS |
| 4 | `016096b` | 文案 | 转介/stop-and-refer 文案口语化：去掉泄露的内部阈值「7 分及以上」→「疼得比较厉害」；「结构性筛查/异常信号/加强刺激」→「针对骨骼或肌腱的检查/需要重视的情况/加压」；去公文腔。**测试侧勿钉这些字面**（按「不断言用户可见字面」原则） |

## HDUEYFGS 根因（owner 报「每项都选能完成却显示无法完成」）

非误判：三个功能项（上/下台阶、下蹲）选「能做完」但追问「会不会不舒服」选「会」+8 分 → 命中 workbench:3480「painful 且 ≥7」→ 3 条 severe → guided 模式 highIrritabilityReferral 转介。转介方向正确，**旧文案只有「无法完成」一个兜底分支**，与「能完成但疼」不匹配。修复=补分支文案，不改阈值。

## ⚠️ 契约变化（AssessmentStage props，你方若渲染该组件需同步）

1. 新增必填 prop `specialSafetyReferral: boolean`（workbench 传 `specialSafetyReferral`）。
2. 新增必填 prop `highIrritabilityReferral: boolean`（16c80c6 引入；workbench 传 `highIrritabilityReferral && !neural && !sharp && !specialSafety`，语义=「当前生效的是疼痛型转介」）。
3. 转介卡标题三元链顺序：neural > sharp > specialSafety > high > 兜底「无法完成」。

## 待测试侧补场景覆盖（dev 未构造，逻辑已审查+tsc+high 分支 E2E 回归过）

- specialSafety 独立触发文案：需 operationTarget=other + specialTest 能力 + 踝区 ankle-thompson（access=coach，safety 类）阳性，且无 neural/sharp/high。构造成本高，交你方场景注册表。
- stop-and-refer 两分支：neuralOrWeakness=yes → 「停止后出现新的麻、电感或无力」；persistentIncrease && afterScore>=7 → 「停下来仍持续加重」（016096b 口语化，勿钉旧「7 分及以上」字面）。

## 验证（dev 侧）

- typecheck 干净。
- high-irritability-completed-painful 场景 E2E（真实浏览器补答屈曲卡→紧张度→总结）：新 high 标题/正文出现、specialSafety 文案不误触发、旧「无法完成」消失、出口「保存并结束本次」在、`.rm-brand small`=0。
- LOGO 三场景对比（顶栏/白底/深底）owner 确认。

## 当前阻塞

无。








# 追加通知：2026-09-04 第十四轮——自助模式对外文案全阶段口语化（owner 逐档复核后落地）

## 范围：1 个提交（待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `28fd9ca` | 文案 | 14 文件、93 行原地替换（无增删行）。分五组：A 名称栏、B 删冗余副提示、C 解释栏白话、D 死代码、档③ 写坏提示语 |

**本轮无契约变化、无逻辑变化**（`tsc --noEmit` 干净；93+/93- 证明纯行内替换）。

## ⚠️ 会打破的既有断言（9 处，请解钉或改选择器）

| 文件:行 | 旧断言 | 现状 |
|---|---|---|
| `tests/browser/divergent/swelling-and-queue.spec.ts:166` | `/接近健侧.*两侧幅度相近/` | 副提示已删 → 用 `/^接近健侧$/` |
| 同上 `:169` | `/未见异常反应.*没有出现提示信号/` | 同上 → `/^未见异常反应$/` |
| `tests/browser/p0/decision-gates.spec.ts:120` | `/患侧偏小.*活动范围受限/` | 同上 → `/^患侧偏小$/` |
| 同上 `:123` | `/未见异常反应.*没有出现提示信号/` | 同上 |
| 同上 `:128` | `/力量接近.*两侧完成质量相近/` | 同上 → `/^力量接近$/` |
| `tests/component/rendered-html.test.mjs:258` | `/患侧偏小｜活动范围受限/` | 字面已不存在 |
| 同上 `:482` | `/普通自助路径不安排神经松动/` | 改为「这种情况不适合自己练，也不建议自己松神经。」 |
| 同上 `:668` | `/查看低刺激基础活动/` | 改为「查看低强度活动」 |
| 同上 `:832` | `/温和活动/` | 兜底卡 actionLabel 改「轻轻活动」，title 改纯动作名 |

`decision-combinations.spec.ts:65/69/116`、`swelling-and-queue.spec.ts:105/182`、`safety-bilateral-and-unable.spec.ts:179` 用了 alternation 或名称栏前缀，**未破**，无需改。

## 有意保留（不是漏改，别当 bug 报）

- 选项「｜」**前**的名称全部保留专业说法：接近健侧 / 患侧偏小 / 抗阻接近 / 角度基本正常 / AROM 标题 / roleLabel / controlTitle / 退阶·进阶按钮 / B 类训练动作名（提踵、侧卧髋外展、外翻控制、重心转移与步态滚动、分腿蹲与减速、仰卧夹枕）。
- 有信息量的副提示保留：`无法完成｜疼痛、担心或不会做`、`暂不判断｜今天先跳过`、`患侧偏弱｜加一点阻力就撑不住`、`接近健侧｜两侧膝后压平程度相近`、`保持稳定｜抬起后膝盖仍笔直`、髋四方向 `髋关节屈曲｜把大腿向腹部方向抬`。
- 自助不上屏的未动：被动/PROM 选项（`workbench-support.tsx:2646-2650`）、professional 分支（`:2493/2504`）、被动与混合复测（`:2682-2685`、`:2694-2698`）、coach/therapist 候选、`TreatmentActionCard` 不渲染的 observe/retest/note 字段。
- owner 明确裁定不改：ScoreSlider「拖动后松手即可记录」、居家放松 3/10 与血肿/骨性压痛点/肌腹、自定义动作卡的承重/负重/小负荷/复测提示、松解卡 do、评估 observe 折叠里的跛行/步幅/髋膝踝联动。
- `站立屈髋（臀部向后）`（`full-demo-content.ts:362`、`:608`）**故意保留括号**：`home-relaxation-core.ts:118` 的 `EXERCISE_MUSCLE_RULES` 会按标题里的「臀」映射肌肉标签，而该动作 tags 无 glute，删括号会静默少一项居家放松。
- `full-demo-content.ts:266`「坐姿脚跟踩地向后拉但不移动」是**评估项** how（改了会换测量目标），未动，待 owner 定。

## 临床内容变更（不只是文案，回归时请注意）

- `local-limb-regions.ts:51` 大腿后侧发力：等长「脚跟向后轻拉」→ **臀桥**（2 组 ×6～8）。
- `local-limb-regions.ts:99`、`full-demo-content.ts:311/566/598`、`local-limb-regions.ts:108`：「抬起足弓」→ **踮脚尖 / 脚趾抓毛巾**。
- `full-demo-content.ts:337`：「在现有被动范围内做…终末伸膝」→「仰卧，腿伸直，绷紧大腿前侧做膝后下压，压到最直的位置停2秒」（保留「膝后下压」字样以免破坏 `canonicalKneeAction` 别名匹配）。
- 动作改名：`脚跟滑动与膝后下压`→`膝盖弯曲和伸直训练`；`低台阶落地下定`→`低台阶踏下停 2 秒`。`exercise()` 的 `startPosition` 由 `${title} ${how}` 正则推断，how 未变 → 体位推断结果不变（已实测训练卡仍显示「仰卧」）。

## 验证（dev 侧）

- `tsc --noEmit` 干净。
- Playwright（`http://[::1]:3000/test`，页面定向）12 场景载入 + 7 场景多步走查：新文案按可达路径实测出现，旧文案 0 残留，无空白/报错屏。
- 局部肢体控制卡与兜底「轻轻活动」卡未实拍到（无对应 page_boundary 场景），但走的是同一 `TreatmentActionCard` 渲染路径，且 `build-trial-targets-core.ts:181` 对 `type !== "muscle"` 跳过区域归一化 → 无逻辑面。

## 当前阻塞

无。


# 追加通知：2026-09-04 第十五轮——动作库批次 0＋1（骨架＋提踵族）落地

## 范围：10 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `bcacf65` | 骨架 | src/knowledge/actions/{terms,types}.ts：词根表（5 条提踵族词根）＋三库记录类型 |
| 2 | `06923b9` | 骨架 | resolve.ts：词根插值＋剂量占位（{dose.*}），语域 plain/pro |
| 3 | `a93d224` | 骨架 | validate.ts：词根存在/复测指向/access/剂量不进句/例外名单（ankle-achilles-isometric 等长 30 秒） |
| 4 | `5e968f7` | 数据 | assessment 6 / treatment 2 / training 6 条目（模板=迁移前基线逐字＋{dose.*}）；capture-action-baseline.mjs ESM 化 |
| 5 | `bf096c8` | 骨架 | bridge.ts（旧形状适配器）＋ golden.ts 20 条成品锁＋ check-action-catalog.ts ＋ npm run check:catalog |
| 6 | `6b6bd59` | 工具 | snapshot-render.mjs：12 场景 DOM 结构快照（输出仓库外） |
| 7 | `395fa38` | 接线 | 评估 6 条改 assessmentPro() 取值；FRIENDLY_ASSESSMENT_COPY 删 3 条手写（knee-calf/ankle-calf/ankle-heel-raise）改目录展开供给 |
| 8 | `e6e024c` | 接线 | 训练 6 条改 trainingCopy() 取值；TrainingEntry.startPosition 定为必填（full-demo 三条记推断值作文档，调用方不传） |
| 9 | `40b0f72` | 接线 | 处理 2 条候选 do 改 treatmentDo() 取值 |
| 10 | `16ef35b` | 决策#5 | 评估自助版踮脚尖次数 5→10（knee-calf/ankle-calf/ankle-heel-raise），golden 同步新基线 |

## 剂量收敛落地（全部为 owner 已批决策）

| # | 内容 | 状态 |
|---|---|---|
| 1 | ankle-calf 单脚 20→10 | 已落地 |
| 2 | knee-heel-raise / calf-heel-raise-strength / calf-heel-raise 次数 5→10 | 已落地 |
| 3 | calf-back-standing-raise / ankle-band-heelraise / calf-medial-arch → 每组10～15 | 已落地 |
| 4 | 剂量不进句子 | 已落地（a70af60＋本批校验规则 CAT-DOSE-IN-SENTENCE） |
| 5 | 评估自助版 5→10 | 已落地（16ef35b） |

**有意保留**：calf-back-seated-raise 每组8～12（坐姿低负荷）；ankle-achilles-isometric 保持30秒/保持10秒/每组5次（等长动作属性，校验例外）。

## ⚠️ 断言影响（比照第 14 轮口径继续解钉）

- `rendered-html.test.mjs` / 单测中凡钉下列字面者需更新：`完成5次`（knee-heel-raise）、`扶墙做5次双脚提踵`（calf 两条）、`最多记录20个高质量次数`（ankle-calf）、`每组8～12个`（calf-back-standing-raise）、`每项每组12个`（ankle-band-heelraise）、`每组8～10个`（calf-medial-arch）、`小腿三头肌` 作为 knee-calf 标题出现在自助渲染的（自助标题现为「踮脚力量」，专业仍「小腿三头肌」）。
- 纯专业模式渲染的 knowledge how/observe 文字未变（pro 逐字保留）——只钉专业字面的断言不受影响。

## 验证（dev 侧）

- `tsc --noEmit` 干净；`check:catalog` 绿（assessment=6, treatment=2, training=6, golden=20）；`check:knowledge` ok；`check:structure` ok。
- 结构快照 before/after **STRUCTURE IDENTICAL**（12 场景逐字节，含 #5 调整后复验）。
- 文字实测：12 场景可达屏旧值残留 0。**屏级缺口**：小腿局部评估卡、踝训练卡在现有 page_boundary 场景中不可达，新值上屏未实拍（库层 golden 已逐字锁定该文字）——请测试侧在场景注册表补小腿局部/踝评估场景。
- `check:boundaries` 报 2 条 stage/forbidden-project-import（summary-stage:32、treatment-retest-stage:9）——经 git log -L 确认为 2026-08-28 `4fd593b` 预存，非本批引入，本批不修，请知悉。

## 架构说明（供后续批次）

- 内容层 `src/knowledge/actions/`：types→terms→resolve→三库→legacy-ids/validate/golden→index（未建）＋bridge（过渡期）。消费方仅 import bridge（过渡期出口，批次 7 删）。
- 消费方组件零改动；批次 2（功能动作族）将按同口径迁移，基线工具已参数化预留 `--family`。
- 完整执行方案：docs/plans/rehabmind-action-catalog-execution-master-2026-09-04.md。

## 当前阻塞

无。下一批（批次 2 功能动作族）开工前需 owner 答 D2-1（走路评估口径）与 D2-2（症状页选择器措辞）。


# 追加通知：2026-09-04 第十六轮——动作库批次 2（功能动作族）落地＋选项定制体系

## 范围：5 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `041b8fc` | 数据 | 评估库 +21 条（功能动作族：走路/下蹲/坐站/上下台阶/单腿站/浅蹲/小跳/慢跑，四部位）；types+option-sets 落地**按动作定制作答标签**（值契约锁死） |
| 2 | `7479276` | 数据 | 训练库 +6 条（knee-step、站立屈髋×3、ankle-gait-weightshift、ankle-single-leg-step）；terms +9 词根（功能动作＋髋四方向）；custom.ts 模板 |
| 3 | `b9e572c` | 接线 | 症状页髋四方向标签改词根插值（拼装结果与原文字面逐字一致）；problem-ledger 空态文案改 customHint；workbench-support import termText |
| 4 | `682e253` | 数据 | golden 锁定至 **68 条**（27 评估×2＋2 处理＋12 训练），gait 48 条与基线逐字锚定 |
| 5 | `dee001f` | 决策 | D2-1 保留部位差异（走路：膝10米/踝·局部一小段）、D2-2 接受词根叫法 |

## 新增决策落地：选项标签分层定制（owner 2026-09-04）

- **值契约永久锁死**（same/limited/unable/…、better/same/worse/… 为决策层输入），标签文案按动作定制。
- 批次 2 起功能动作的作答三联按动作写（走路→「能走完/走不了或不敢走」、单腿站→「能站稳/站不稳或不敢单脚站」…）；复测结论五值按动作写（走路→「有改善｜步子和承重比上次稳」…）。
- 有意通用登记表（option-sets.ts GENERIC_REGISTRY）：安全红旗、两侧对比、加重处置、影像医嘱、自定义模仿方式、训练反馈、进退档——判定为"与动作无关"，不定制。
- **UI 尚未消费这些定制标签**（数据先行）；评估作答/复测的选项接线在批次 3（renderOptions＋assessment-stage/summary-stage 换源）。届时才可见。

## 剂量漂移登记（未决，待 owner）

- **单腿站时长**：膝专业版 20 秒 vs 膝自助版/踝/大腿/小腿 10 秒——同动作跨模式/跨部位漂移。本批按"逐字保真"保留原样。建议：统一 10 秒（与已批 #2/#5 方向一致），待 owner 一句话。
- **站立屈髋组次**：膝/踝 每组10个 vs 大腿局部 每组8～10个——同动作跨部位漂移。建议统一 10。

## 断言影响

- 功能动作的评估 how/observe 文字**未变**（逐字保真），仅 kne-squat 等含"3次"的句子改为剂量插值后成品仍逐字一致——理论无断言破坏。FRIENDLY_ASSESSMENT_COPY 中功能类条目（knee-squat/ankle-squat/knee-step-up/knee-step-down/ankle-step-down/knee-single-leg/ankle-single-leg/knee-single-leg-squat/ankle-weight-bearing）已被目录展开替代但值相同；测试若钉这些字面不受影响。
- 症状页髋四方向标签字面不变（插值=原文）。

## 验证（dev 侧）

- tsc 干净；check:catalog 绿（assessment=27, treatment=2, training=12, golden=68）；check:knowledge/structure ok。
- 结构快照 before/after **STRUCTURE IDENTICAL**（12 场景）。
- check:boundaries 3 条 stage 违规均为 4fd593b（08-28）预存，非本批引入。

## 当前阻塞

无。批次 3（活动度方向族）开工前需 owner：**D2-3** 单腿站时长统一（建议 10 秒）；**D2-4** 站立屈髋组次统一（建议 10）；**D3-1** guided 的 AROM 后缀去留（建议保留）。


# 追加通知：2026-09-04 第十七轮——动作库批次 3（方向族＋选项/追问接线）落地

## 范围：9 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `7fbd048` | 数据 | 评估库 +13 条方向族（膝伸直/屈曲/髌骨四向/踝背屈/屈膝位背屈/跖屈/内翻/外翻/跖趾背伸/足趾，双语域逐字保真）；unable-reason 4 套 base；terms +16 词根 |
| 2 | `9785dfb` | 骨架 | index.ts：`assessmentTitle(id,mode)` 双轨＋`unableFollowUp(kind,mode,how)` 追问包 API |
| 3 | `0f0fe8d` | 接线 | 功能动作作答三联换 renderOptions（按动作标签首次上屏）；function 原因按钮换 unableFollowUp |
| 4 | `6c193d0` | 接线 | motion 原因按钮＋提示句换源；**删除全部 3 处引导框**（见下） |
| 5 | `bdb9fe3` | 修正 | strength base 收敛为界面真实 4 值（no-helper/control 为类型遗留、UI 无入口）；主力量卡原因按钮换源 |
| 6 | `ea14fcc` | 数据+接线 | range-function 四联（接近另一侧/差一些/差很多/说不清）进 base（族级一套）并接线 |
| 7 | `20215f2` | 决策落地 | 单腿站 20秒→10秒（D2-3）；站立屈髋 8～10→10（D2-4） |
| 8 | `dd477f0`/`32c857a`/`fe08597`/`5e3d6c4`/`1786e3a`/`cd74d05`/`9494a1d` | 决策文档 | 引导裁定（删7留1）、fear 下游证据、weak 终点确认等全部归档 |

## ⚠️ 用户可见变化（⑦口径：详列）

1. **功能动作卡作答按钮按动作定制**（走 20 个功能项）：走路→「能走完/走不了或不敢走/暂时不走」；下蹲→「能蹲下去再站起来…」；单腿站→「能站稳/站不稳或不敢单脚站」…（全部对照见《选项定制成果预览》）。旧三联「可以做完/做不完或不敢继续/暂时不做」在这些条目上消失。
2. **引导框全量消失**（评估动作卡/力量卡/配对力量卡的「先这样试」框不再出现）。删掉的 7 条原文见《提问与选项体系-审阅表-v2》「引导框裁定」sheet。
3. **pain 原因选中后直进疼痛记录**（位置图+0～10 分），中间不再插引导框。
4. **单腿站检查时长**：膝专业版 20 秒→10 秒（与自助版统一）。
5. **其余全部逐字不变**：方向族 13 条（标题/怎么做/观察点双语域）、力量/配对卡原因按钮 4 值、range-function 四联、复测方向词。

## 新增机制（对测试侧的接缝）

- `renderOptions(id, base, mode)`：一层作答按钮统一入口（条目 labels 覆盖→base 默认）。
- `unableFollowUp(kind, mode, how)`：原因追问包（reasons+hint+guidanceFor）。**guidance 现全空**（唯一历史 no-helper 引导按裁定随 UI 遗留值一并移除；缺口台账逻辑未动）。
- 值契约新增锁定：unable-reason-motion(pain/fear/instruction)、-function(pain/weak/fear/instruction)、-strength(界面 4 值)、-special、range-function 四联、function-completion 三联、retest-outcome 五值。

## 验证（dev 侧）

- tsc／check:catalog（assessment=40, golden=68）／check:knowledge／check:structure 全绿；check:boundaries 3 条为 4fd593b 预存。
- 结构快照 before/after **IDENTICAL**（引导框只在交互后渲染，静态快照不含；引导消失已交互实拍确认）。
- 交互实拍：motion 追问链（原因→疼痛记录）正常、引导框 0 命中；踝走路功能卡新三联上屏、旧文案 0 残留。

## 决策归档（本轮 owner 裁定汇总）

引导删7留1（判据=离开它就断路）；weak 为有效终点无三层；fear 维持现状（下游两消费点已登记）；D3-1 AROM 保留；D2-3 单腿站 10 秒；D2-4 屈髋 10 个；D4-1/2、D5-1、D6-1 均已定（详见主控方案 §10）。

## 当前阻塞

无。批次 4（力量等长族，~14 条＋等长句式统一模板逐条对照）待 owner 暂停点审核后开工。


# 追加通知：2026-09-04 第十八轮——动作库批次 4（力量等长族）落地

## 范围：3 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `5c04c3a` | 数据 | 评估库 +13 条力量族（膝3＋踝4＋大腿3＋小腿3，双语域逐字保真）；ankle-intrinsic「缩短脚掌、轻抬足弓」→「轻轻踮起脚尖再放下」（唯一文字变化） |
| 2 | `efa8529` | 骨架 | terms +1 词根（pillow-squeeze）；validate 例外名单扩展至全部力量检查条目（保持N秒/压住N秒/顶住N秒/夹住N秒属测量动作属性，非处方剂量） |
| 3 | `32c857a` | 决策 | D4-1 等长句式统一（事实：13 条现文已高度一致，无需模板化）；D4-2 腘绳肌维持；D5-1 折中案；D6-1 3 条负荷词改（归批次 6 执行） |

## 用户可见变化

- **ankle-intrinsic（足部小肌群）作答/检查方式改变**：「尝试缩短脚掌、轻抬足弓」→「轻轻踮起脚尖再放下」。这是临床动作变更（不可执行动作→可执行），非纯文案。
- **其余 12 条逐字不变**：来源从知识文件换到目录（`assessment.ts`），显示效果一致。

## 例外名单说明（供测试侧理解）

力量族评估的「保持5秒」「顶住5秒」「夹住5秒」等是**检查动作的定义属性**（保持多久是这个检查怎么做的一部分），与训练处方剂量不同。validate 例外名单已覆盖全部 13 条。

## 验证（dev 侧）

- tsc／check:catalog（assessment=53）／check:knowledge／check:structure 全绿。
- 前后对比表：`outputs/RehabMind-批次4前后对比-2026-09-04.xlsx`。

## 当前阻塞

无。批次 5（处理候选族）待 owner 暂停点审核后开工。


# 追加通知：2026-09-04 第十九轮——动作库批次 5（处理候选族前半＋D5-1 兜底折中）落地

## 范围：4 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `478dd41` | 数据 | treatment.ts +11 条膝部 self 候选（muscle 5/control 3/swelling 1/…），逐字保真＋剂量字段提取＋retestOf 映射 |
| 2 | `d065595` | 修正 | knee-anterior-control dose.reps 去掉单位后缀（防止「5～8个个」叠加） |
| 3 | `f9721b6` | 决策 | 松解时长 30～60秒→60～90秒（owner 裁定：30-60 太少），影响全部 5 条松解类候选 |
| 4 | `4c1d34f` | 数据+接线 | treatment.ts +6 条踝部 self 候选（muscle 3/swelling 1/control 2）；D5-1 兜底卡折中案（标签=动作名、how 去重） |

## 用户可见变化

1. **兜底处理卡**（无候选时才出现）：「现在做」标签从「轻轻活动」→ **显示具体动作名**（如「膝关节主动屈曲」）；「怎么做」句去掉重复的动作名→「在不明显增加不适的范围内，缓慢完成5～8次。」
2. **松解类候选时长**：所有含「30～60秒」的候选 →「60～90秒」（共 5 条松解类）。
3. **其余候选文字逐字不变**。

## 验证

- tsc／check:catalog（treatment=18）／check:structure 全绿。结构快照 IDENTICAL。
- 审核表：`outputs/RehabMind-批次5处理候选审核-2026-09-04.xlsx`。

## 当前阻塞

无。批次 6（训练全量＋体位显式化＋肌肉映射去标题化＋D6-1 3 条负荷词）待 owner 审核后开工。


# 追加通知：2026-09-04 第二十轮——动作库批次 6（训练全量＋映射去标题化）落地

## 范围：4 个提交（以下全部待绑定）

| # | SHA | 类别 | 说明 |
|---|---|---|---|
| 1 | `2195252` | 数据 | training.ts +41 条（训练全量 53 条完成），体位：fd 推断、ll 显式；D6-1 负荷词改（加练/强度×2） |
| 2 | `95ce3f5` | 修正 | knee-heel-slide-quad-set 加入剂量例外（停10～15秒＋保持5秒是动作协议） |
| 3 | `a19b73c` | 架构 | exerciseMuscleLabels 去掉标题匹配（只按 tags）；hip-hinge 3 条补 glute 标签 |
| 4 | `f523005..c004ef3` | 修复 | 4 条力量族标题（quadriceps/evertor/invertor/intrinsic，owner 裁定） |

## 用户可见变化

1. **ankle-intrinsic** 标题→「踮脚尖力量」＋动作改为踮脚尖（原「缩短脚掌、轻抬足弓」不可执行）。
2. **4 条力量标题**：膝盖伸直力量／外翻力量（腓骨肌）／内翻力量（胫骨后肌）／踮脚尖力量。
3. **D6-1 三条负荷词**：ankle-achilles-eccentric-drop「加练动作」；thigh-run-return「一次只加一样强度」；calf-step-single-leg「送回高强度场景」。
4. **居家放松标题匹配已删**——放松区域由 tags 驱动，hip-hinge 类新增 glute 标签，放松区域不变或增加（glute）。
5. **其余全部逐字不变**。

## 验证

- tsc／check:catalog（training=53）／check:knowledge／check:structure 全绿。结构快照 IDENTICAL。
- 体位推断 vs 显式：fd 保留推断（但目录已存显式值作文档），ll 显式直传。

## 当前阻塞

无。批次 7（删旧层）待 owner 审核后开工。
