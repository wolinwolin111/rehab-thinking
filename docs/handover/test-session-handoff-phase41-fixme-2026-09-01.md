# 测试交接档 · Phase 4.1 fixme 转化轮（2026-09-01）

> 冻结证据链，只追加不改写。当前口径见 `test-workflow-continuation-handoff.md` §6。

## 1. 本轮目标与结果

把瘦身清单阶段 4.1 的 9 个 `test.fixme` 壳清零。结果：**6 转真 + 3 删壳转显式缺口**。基线 Edge full 61+9 → **67 passed + 0 skipped**；overall 4 → **10/10**；registry 93 → **90**。回归 run=`reg-20260901004537-19680`（verdict=passed，workers=2）。

## 2. 转化的 6 条（靶子全部来自既有 catalog 种子，纯测试侧，未改 dev 契约）

| 测试 | 文件 | 靶子 | 驱动方式 |
| --- | --- | --- | --- |
| 急性踝扭伤安全停止并保留保存出口 | overall/safety-bilateral-and-unable.spec.ts | 真实引导流（复用 D-2 proven 序列） | 安全信号「有」→ 骨性三题 → 影像「没有做影像」→ 钉 `.rm-route-note.is-waiting`「先完成针对性医学评估」+「保存本次信息」+「开始评估检查」禁用 + toast「本次信息已保存，可在完成医学评估后继续」 |
| 双侧选择优先侧、分别评估和分别复测 | 同上 | bilateral-longitudinal（页面定向） | 伸直卡逐侧「受限或代偿」→ 只完成一侧钉「另一侧尚未完成」+ 下一个检查禁用 → 两侧齐备「左右均已记录·优先侧仍为右侧」→ 两侧偏小+没有不适 → 侧栏「活动受限」发现 |
| 没有明确主诉动作时不生成伪造动作分数 | 同上 | assessment-all-normal（页面定向） | 空态出口下钉 `.rm-final-score`=0、无 range 滑条、无「主诉动作 N/10」 |
| 动作无法完成的不同原因分别保留并阻止误判正常 | 同上 | 真实专业多动作流 | 下蹲→没力或撑不住(weak)→「当前无法完成」；下台阶→担心继续会加重(fear→skip)→「暂时没判断清楚」；两条分别保留、条目均不含「正常」 |
| 处理后加重和训练后加重必须进入独立的停止与聚焦复查证据 | overall/retest-training-followup.spec.ts | training-worse + treatment-worse（页面定向） | 训练页「做完更不舒服」→ `[data-testid=training-worsening-warning]`「后不适更重」+「处理这次加重」+「保存并结束」；反向钉 treatment-worse 无训练警告（独立性） |
| T-09 快照按实际经过时间提醒 | overall/snapshot-freshness.spec.ts | snapshot-fresh-under-24h / stale-24h-acute / stale-7d-acute / stale-7d-chronic（页面定向） | 四边界：无提醒 / 恢复记录提醒+回看当前情况 / 继续前先更新情况+重新确认后继续 / 慢性只提醒 |

## 3. 删除的 3 壳（转显式缺口，登记于 coverage-matrix）

`tests/browser/overall/feedback-admin-cleanup.spec.ts` 整文件删除（git rm）。三条（反馈绑定/管理员脱敏/测试数据清理）需服务器案例、隔离测试服务凭据、独立 runId 夹具——浏览器测试侧无法诚实覆盖，从「假绿 fixme 壳」转为文档显式缺口。registry 对应 E2E-13/14/15 三条删除。

## 4. 驱动层改动

`tests/browser/drivers/pilot-flow.ts` 新增 `driveGuidedAcuteAnkleToSafetyConfirmation(page)`——把 safety-blocking.spec.ts 里 D-2 的本地 `runGuidedAcuteAnkleToSafety` 序列上移为共享驱动（proven 逻辑原样搬移），D-2 与新踝测试共用。D-2/D-3 回归确认未破坏。

## 5. 复核出的种子缺口（转 dev，Phase 4.2 候选）

- **treatment-worse 种子不足以钉处理加重停止**：`treatmentMustStop(trialRecords)` 需 result=worse 或 activityWorsened 的 trialRecord；现有种子只设 postScore=7、无 trialRecords，落「还有问题需要补充检查」继续排查面板。要钉处理加重停止面板需 dev 补带 worse trialRecord 的靶子。E2E-09 保持 blocked。
- **双侧处理段无逐侧复测控件**：bilateral-longitudinal 逐侧记录伸直受限后，处理段落「双侧处理顺序→两侧处理完成后确认训练出口→进入正常训练」完成面板，未出现逐侧复测控件（因仅伸直一项受限）。本轮双侧测试覆盖评估段逐侧记录（逐侧复测的前置），处理段逐侧复测待 dev 靶子。

## 6. 踩坑记录（供后续复用）

- **工作台工具栏渲染 fixtureNote 原文**：`launchWorkbenchScenario` 返回的 runtime 容器含 `.rm-test-fixture-note`，其文本含「恢复记录提醒」「回看当前情况」等字样。断言陈旧提醒/加重文案必须作用域收到 `.rm-test-product`，否则 fixtureNote 假阳性（T-09 首跑即栽在此）。
- **full_flow 种子描述含「肿」触发肿胀定位子屏**：ankle-sprain full_flow 描述「外踝肿痛」使引导流多出一个肿胀位置屏，硬编码位置段不适配；踝安全停止改用真实产品流（无「肿」字描述）更稳。
- **对比/不适按钮可访问名含副标签**：如「两侧偏小 两侧都受限」，`getByRole(exact:"两侧偏小")` 不命中，须用正则 `/两侧偏小/`。
- **侧栏发现文本多处出现**：`getByText("膝关节主动伸直（AROM）")` 命中 4 处触发严格模式，用 `.first()`。
- **疼(pain)无法完成原因触发完整症状采集**（定位+性质+分数），比 weak/fear 深得多；本轮 action-unable 用 weak+fear 这对简单原因达成「不同原因分别保留」。
- **编辑既有文件会崩运行中的 vite**（watcher EBUSY）：确立「停服务→编辑→起服务→跑」节奏。
