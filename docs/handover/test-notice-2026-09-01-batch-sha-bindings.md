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

