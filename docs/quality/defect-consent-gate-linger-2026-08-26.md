# 缺陷报告 DEF-CONSENT-01：建案成功后同意门浮层不关闭，首次使用被完全阻断

发现日期：2026-08-26
发现者：测试会话（证据道巡检 + A/B 对照实验）
严重级：**P0**（首次使用主路径完全阻断；粉丝群开放场景下用户 100% 卡死）
环境：本地 3001（worktree @ e7dec2c，数据库已重建迁移）；桌面 1440 与移动 390 均复现

## 现象

新用户走完「开始康复 → 引导卡 → 来源门 → 同意门勾选 → 同意并创建案例」后：

1. 服务端**创建成功**：`POST /api/pilot/cases → 201`，返回合法 caseId/publicCode/accessToken，无任何用户可见错误（`.rm-consent-error` 为空）；
2. 页面已推进到工作台症状阶段：`[data-rehabmind-tutorial="symptom-input"]` 可见、自动保存草稿已写入 IndexedDB；
3. **但同意门浮层 `.rm-entry-sheet-backdrop`（标题「开始前，请确认数据使用方式」）仍全屏打开**，遮挡工作台，用户无法操作；
4. **刷新后浮层依旧**（刷新后浮层数=1，门后 h1=「请描述你的问题」）——刷新不能自救，用户被永久卡死。

## 复现步骤（100% 复现）

```text
1. 清空 localStorage → 打开 /
2. 点击「开始康复」→ 跳过引导卡
3. 来源门选任一渠道 → 继续
4. 同意门勾选「我已了解并同意以上内容」→ 点击「同意并创建案例」
5. 观察网络：POST /api/pilot/cases = 201；观察页面：症状输入可见但被浮层遮挡
6. 刷新 → 浮层仍在
```

已排除变量：axe 注入（A/B 对照均复现）、数据库状态（空库/已迁移库均复现）、视口宽度（390/1440 均复现）。

## 关键证据

| 证据 | 值 |
| --- | --- |
| 建案 API | `201`，`versions.appVersion=rehabmind-pilot-app-0.1.0+local-e7dec2c68ec1-dirty-...` |
| 用户可见错误 | 无（consentError 为空） |
| 建案后浮层数 | 1 |
| 刷新后浮层数 | 1（h1=请描述你的问题，症状输入可见但被遮） |
| 弦外之音 | `first-use-entry-contract` 的 wiring 断言（源码含 `setPilotConsentGateOpen(false)` 等）**仍然通过**——再次证明源码字符串合同不保证运行时行为 |

## 嫌疑范围（供定位参考，非结论）

- 引入嫌疑：`6f30920 feat(ui): welcome copy grid, consent and source simplification...` 的 onboarding/引导卡重构。cf47910 时代导出器可正常走完（未验证浮层），08-25 release 规格通过为 **cf47910 之前**的代码。
- 矛盾点：`handlePilotConsentAgree` 源码中 `setPilotConsentGateOpen(false)` 字符串存在且在其后（wiring 合同通过），但运行时门不关——请排查该 state 是否仍绑定当前渲染的浮层实例（重构后可能存在双状态/条件渲染分叉），或 `GuideCards`/`DevToolbar` 新状态机与 consent gate 的互斥逻辑。
- 附带观察：`tests/browser/release/minimal-wiring.spec.ts` 第 2 条在此缺陷下**仍可能通过**（`toBeEditable` 不检测遮挡），建议在该 spec 增加断言「创建后 `.rm-entry-sheet-backdrop` 数量为 0」，把本缺陷纳入永久防线。

## 验收标准

1. 新用户完整首次流程后，同意门浮层关闭（backdrop 数量 0），可直接操作工作台；
2. 刷新后不复发；
3. `minimal-wiring.spec.ts` 增加上述 backdrop=0 断言并在缺陷修复前先红；
4. 修复后：定向 spec + `test:fast` + 证据道巡检（--visual --axe）全绿，由测试会话回归确认。

## 测试会话同步动作

- 本缺陷导致 release 浏览器规格暂缓执行（其现有断言无法暴露此缺陷，跑通无意义）；
- RQ-1/RQ-S1/S2/S3 的合同预期更新已完成并随本批提交；`test:fast` 在合并后代码上已**首次全绿**（逻辑层收敛达成）；
- 逻辑层全绿 + 浏览器 P0 阻断并存，正是双轨体系要抓的缝——本例为首个实锤案例。

---

## 修复方案（2026-08-26 开发会话定稿，暂缓执行——排在 D/A/B/C 批之后）

**静态排查结论**：agree 链路（关门→写存储→建案）自 cf47910 以来字节级未变（6f30920 仅加 `mode="welcome"` prop，diff 证实）；各环节代码正确。症状组合（201 已到 + 无错误 + 门不关 + 同意未持久化 + 刷新重开门）唯一自洽解释：**agree 异步链在 201 响应之后、`setPilotConsentGateOpen(false)`（workbench:488）之前挂起且永不落定**。嫌疑收敛：`await persistLocalRecords`（IndexedDB 写，`openDatabase` 缺 `onblocked` 处理）或 `await createPilotCase` 尾段。静态无法再定位，需运行时埋点。另需排查 dev(:3001) vs build 维度——08-25 全流程通过是在生产构建上验证的。

### 执行步骤

1. **埋点定位**：agree 链路 4 节点 console.debug（before-create / after-create / after-persist / gate-closed）→ 复现矩阵（:3000/:3001 × dev/build）→ 精确挂起点
2. **分支修复**：A（`openDatabase` 补 `onblocked` 处理 + `saveLocalCaseRecords` 加 3s 超时降级 localStorage）或 B（API 尾段对应点，按定位结果）
3. **加固一（根因无关）**：`createInitialPilotCaseRecord` 整体加 15s 超时（Promise.race）→ 超时转错误提示、按钮复位可重试，消灭"永远正在创建"
4. **加固二（保守版，待最终确认）**：`writePilotConsent` + 清拒绝标记前置到建案 await 之前，关门时机不变（建案成功才关）——同意事实先落盘，挂起/失败后刷新不再二次卡门；执行时验证自愈路径（同步队列自动补建案例）的请求携带 consent
5. **永久防线（测试会话）**：`tests/browser/release/minimal-wiring.spec.ts` 增加「创建后 `.rm-entry-sheet-backdrop` 数量=0」断言，先红后绿
6. **回归**：定向 spec → test:fast → 证据道（--visual --axe）→ 测试会话按上述 4 条验收标准确认

⚠️ 暂缓期约束：本缺陷为 P0 首次使用主路径阻断，修复落地前不得向任何真实用户分发产品入口。

**补充复现证据（2026-08-26 D 批回归时）**：证据道巡检（inspect-local --visual --axe，主仓库 :3000 @ D 批工作树）新增的建案后浮层探针在 **390px 与 1440px 双视口均报「建案后仍有入口门浮层未关闭：开始前，请确认数据使用方式」**——证实缺陷在主仓库 HEAD 代码上 100% 复现，与 worktree/环境无关；同轮其余检查（布局/控制台/axe/视觉基线 0.00%）全部通过。
