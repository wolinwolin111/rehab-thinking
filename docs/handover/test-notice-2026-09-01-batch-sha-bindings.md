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



