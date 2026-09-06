# RehabMind 本轮整改：开发交给测试会话的适配说明

更新日期：2026-08-27  
来源方案：`docs/plans/rehabmind-development-data-remediation-plan-2026-08-27.md`  
职责边界：开发会话提供实现、稳定合同、夹具、构建和复现能力；测试会话维护测试计划、执行测试、保存证据并给出结论。

## 1. 测试会话需要先修改什么

测试会话在开始验证本轮整改前，应更新自己的测试资料，但不得提前把“计划验证”写成“已经通过”。

1. `docs/quality/rehabmind-test-plan.md`：增加 `RMD-*` 整改编号、数据合同 v2、内部场景工作台和 Android 五层载体；明确本期案例学习模式关闭。
2. `docs/quality/regression-test-register-2026-08-26.md`：每个进入“开发完成待测试”的 RMD 项增加回归行，绑定修复提交、buildId、测试层、应出现、禁止出现和证据路径。
3. `docs/quality/real-browser-coverage-matrix.md`：把手机 `L6-preview` 拆成网页视口、Android Emulator、真机 Chrome、debug WebView、release APK；浏览器设备模拟不得记为真机通过。
4. `docs/quality/internal-logic-coverage-matrix.md`：补齐 session/thread/record ID、事件引用、能力快照、失效和迁移不变量。
5. `docs/quality/test-workbench-isolation-2026-08-25.md`：补充复现包、只读 DecisionTrace 和 debug APK 的工作台使用边界。
6. 回归表中的 `UX-02` 不再要求开放案例学习入口；改为“生产入口不可达，遗留 study 输入在所有持久化边界拒写”。`learningExplanation` 另作纯展示不变性验证。

## 2. 测试内容如何重组

### 2.1 按整改合同分层

| 层级 | 验证对象 | 示例 |
| --- | --- | --- |
| L2 领域合同 | 纯数据和规则 | BodyMark、ScoreRecord、MedicalGuidance、CapabilitySnapshot、可比性函数 |
| L3 工作流 | 命令、状态和不变量 | 草稿/完成分离、能力变更只失效未执行计划、案例学习拒写 |
| L5 持久化/API | schema、迁移、SQLite、事件和同步 | v1/v2 读取、稳定 ID、事件引用、冲突与幂等 |
| L6 桌面真实页面 | 可见控件和纵向流程 | 配对力量字段、医生限制、评分、历史、专项检查 |
| M1～M5 手机载体 | 布局、Android、WebView 和安装升级 | 多视口、模拟器、真机 Chrome、debug APK、release APK |
| L7 发布与恢复 | VPS、备份、迁移、回滚 | reader 先行、writer 开关、SQLite 备份和旧版本读取 |

数据合同变化不能只增加页面截图；页面文案变化也不需要虚构新的领域规则测试。

### 2.2 三种测试节奏

1. **单项定向验证**：某个 RMD 项进入“开发完成待测试”后，只跑其合同、直接依赖和一个反向场景。
2. **批次回归**：A～F 每批结束后，重跑该批影响到的既有场景和保存恢复链，不能只验证新增正常路径。
3. **整体回归**：批次 B（数据底座）、批次 C（模式权限）、批次 F（APK）结束后各执行一次完整业务回归；最终发布前再执行同 buildId 的全层门禁。

随机探索只用于补充发现问题。它必须记录 seed、轨迹、版本和快照，不能替代有明确 oracle 的固定回归。

## 3. 各整改批次需要增加的验证内容

### 批次 A：热修和口径

- 配对力量不适与普通活动不适故意填写成不同位置、性质和分数，结果和决策只能使用配对力量字段。
- “看过医生但没有限制”“明确有限制”“已获允许”“不清楚”四种 MedicalGuidance 分开验证。
- 案例 A 有历史后切换案例 B，B 不得显示 A 的 archived/session 信息。
- 双侧、位置数量和手机范围只验证最终批准口径，不继续维护旧文案 oracle。

### 批次 B：身份、历史和临床记录底座

- 普通保存不增加完成次数；明确完成、转诊结束和重复提交分别有稳定结果。
- 同草稿重复保存 sessionId 不变；新会话 ID 改变；新问题线程与旧线程数据隔离。
- v1 快照迁移到 v2 后重复读取结果稳定，不重复生成 ID，不伪造缺失坐标和上下文。
- BodyMark 覆盖建议、确认、失效、换侧、换视图、换大部位确认和 zone-only 旧数据。
- ScoreRecord 覆盖 0、未选择、不可用、修改版本、跨侧不可比、跨动作不可比。
- 能力变化后，未执行候选失效，已完成记录和旧能力快照继续存在。
- 事件序列能够重建完成会话；未知 v2 事件不导致旧 reader 崩溃。

### 批次 C：模式、字段消费和专项检查

- 生产 UI、公开路由和 query 参数均不能进入案例学习；遗留 study 输入不能写本地案例、SQLite、同步、反馈或复诊。
- `learningExplanation` 开关前后候选、顺序、权限、评分和停止条件完全相同，只允许文字变化。
- 除 legacy normalizer 外，userRole/examSetup 不再改变生产候选。
- professionalNotes、被动角度、麻电区域、触诊能力、sourceCaseIds 和 explanationKey 分别有明确消费者和保存恢复证据。
- 专项检查覆盖阳性、阴性、疼痛难判断、未测试和停止；未测试不能当阴性。

### 批次 D：内部场景工作台

- 证明工作台仍加载真实 `RehabMindCompleteDemo` 和正式 orchestrator，没有复制业务模型。
- 完整流程只预填描述；页面边界明确携带预置标记，不能计为纵向流程证据。
- 正式案例与测试案例、本地正式命名空间与测试命名空间、正式指标与 testRunId 数据互相隔离。
- 复现包不含 Cookie、访问凭证、完整令牌或不必要健康原文。
- 只读 trace 不能修改 finding、候选、排序和流程状态。
- 相同 scenarioId 可在桌面网页、手机网页和 debug APK 中启动。

### 批次 E：旧知识和架构收口

- 生产运行时不再引用 `FIRST_BATCH_MODULES` 数据；类型迁移后唯一知识源仍可构建。
- 页面、测试工作台和持久化层都只调用公开 controller/command，不重新拼临床事件或复制 finding builder。
- 架构检查是边界证据，不代替业务回归。

### 批次 F：手机与 Android APK

- M1 浏览器多视口只计布局证据；M2 Android Emulator 记录系统镜像和 WebView 版本；M3/M4 必须记录真实设备；M5 绑定正式签名候选版本。
- 关键场景至少包含首次启动与建案、人体标记、长表单与软键盘、保存后后台/杀进程恢复、处理—复测—训练、断网继续与恢复同步、系统返回、外链/下载和覆盖升级后数据保留。
- debug APK 失败不能用桌面网页通过抵消；release APK 的签名/升级失败也不能用 debug APK 通过抵消。

## 4. 测试会话每轮标准工作流

1. 核对整改编号、开发提交、buildId、合同版本、迁移版本、功能开关、夹具和已知风险。
2. 同步隔离测试 worktree，确认被测代码与开发交付提交一致；不同提交的证据不能混用。
3. 创建独立 runId，选择定向层级和场景，不先跑与改动无关的全部组合。
4. 先跑最低成本的 L2/L3/L5 定向验证；失败时停止进入更昂贵的浏览器或设备验证。
5. 使用测试工作台执行需要真实页面的完整流程或页面边界检查，保存 scenarioId、runId 和版本。
6. 数据底座通过后再进入手机 M1～M5；同一关键场景尽量跨载体复用。
7. 发现问题时保存应出现、实际出现、禁止出现、最短复现步骤、截图/trace/日志和脱敏复现包，转交开发修复。
8. 修复后先复测原失败，再跑其直接回归范围；不能只看代码差异关闭缺陷。
9. 批次完成时更新回归总表和覆盖矩阵；“当前构建已通过”必须绑定当前 buildId 和产物。
10. 证据导出完成后再使用“删除本批次”清理测试数据；删除失败必须保留记录，不能默认已清理。

## 5. 测试工作台具体使用方法

### 5.1 进入工作台

- 本地开发：打开 `/test`，本地测试环境允许直接进入。
- VPS：先登录 `/RehabMind/admin`，再从后台点击“测试工作台”，或访问 `/RehabMind/test`。
- debug APK：使用 debug-only 测试入口打开受保护的 `/RehabMind/test`；仍需管理员权限，不得通过 APK 绕过服务端访问检查。

工作台打开后会在当前浏览器会话生成 `run_<随机值>`。该 runId 是一次测试批次的清理和证据边界，不要在同一 runId 下混入无关版本。

### 5.2 选择三种入口

1. **完整流程**：只预填问题描述，从第 0 步开始，其余全部在真实页面操作。只有这种模式可以形成纵向流程证据。
2. **页面定向**：载入指定阶段和预置快照，用于检查页面接线、错误防御和某个边界。它不能证明前面步骤真实走过。
3. **决策实验室**：直接查看生产决策函数输出，不创建案例。用于理解输入—输出和定位规则，不证明 UI 或保存恢复。

选择场景卡后点击“开始测试”。进入流程后，顶部持续显示模式、场景名称、runId，以及 App、知识和决策版本。

### 5.3 工具栏按钮含义

| 按钮 | 实际行为 | 使用注意 |
| --- | --- | --- |
| 重新开始 | 清除当前测试草稿，用同一场景生成新的本地案例起点 | 已保存到服务器的测试案例不会自动删除 |
| 复制为新案例 | 复制当前测试草稿快照并生成新的 localCaseId | 适合从同一中间状态比较两个分支；不能当成前置步骤真实走过 |
| 清除草稿 | 只清除当前设备测试命名空间里的活动草稿 | 已保存案例不受影响；保存恢复测试中不要提前点击 |
| 复制案例编号 | 复制最近已保存测试案例的公开编号 | 流程至少保存一次后才有编号 |
| 导出复现包 | 导出当前测试案例的场景、runId、版本和最新快照 JSON | 不含访问凭证；应与失败步骤、截图和日志一起交给开发 |
| 后台记录 | 打开管理后台，并按已有案例编号定位 | 用于核对事件、版本和服务器记录，不是用户页面证据 |
| 删除本批次 | 删除当前 runId 的服务器测试案例和本机同批记录，并生成新 runId | 先导出证据；不能清理其他 runId 或正式案例 |
| 切换场景 | 返回场景选择页 | 不等于删除当前批次，旧测试数据仍保留 |

### 5.4 当前场景和稳定入口

完整流程场景仍有 7 个：单侧膝关节动作疼痛、单侧踝扭伤、双侧问题与优先侧、明显肿胀、麻木或力量变化、高不适停止、动作无法完成。它们只预填问题描述，必须按真实页面走症状—确认—评估—处理—复测—训练—总结或安全结束。

页面定向场景现在增加了合法的 v2 快照种子。它们用于把真实页面稳定地放在目标边界，不能写成前序步骤已经被真实操作过：

| 场景卡 `scenarioId` | 用途和页面预期 | 稳定观察点 |
| --- | --- | --- |
| `snapshot-fresh-under-24h` | 23 小时前、时间敏感记录；不应提示陈旧 | `snapshot-freshness-banner` 不存在 |
| `snapshot-stale-24h-acute` | 24 小时后、急性记录；只提醒、不阻断 | `snapshot-freshness-banner`，`data-freshness-band="stale"`，按钮 `snapshot-freshness-review` |
| `snapshot-stale-7d-acute` | 7 天后、急性/时间敏感记录；先确认再继续 | `data-requires-reconfirmation="true"`、按钮 `snapshot-freshness-reconfirm`；对话框 `snapshot-freshness-dialog`，三项复选框分别为 `snapshot-freshness-symptoms`、`snapshot-freshness-safety`、`snapshot-freshness-onset`，最后用 `snapshot-freshness-confirm` |
| `snapshot-stale-7d-chronic` | 7 天后、慢性记录；只提醒、不阻断 | 同一 banner，`data-requires-reconfirmation="false"`；原症状答案不能被改写 |
| `bilateral-priority` | 从描述开始真实建立双侧和优先侧 | 页面应出现“本次优先侧”，并在后续左右分别评估/复测；这是纵向证据入口 |
| `bilateral-training-gate` | 合法 v2 快照：左右标记、右侧优先、另一侧评估未完成 | `bilateral-low-load-gate`；文案“当前只开放低负荷基础活动”，正常进阶不可用 |
| `treatment-improved` / `treatment-same` / `treatment-worse` | 真实进入处理—复测页，分别观察改善、无变化、加重分支 | 复测继续按钮 `data-rehabmind-test="treatment-retest-continue"`；实际分数仍须通过页面的评分控件输入 |
| `training-worse` | 真实进入训练页，记录第一组反馈为“做完更不舒服” | 反馈按钮 `data-rehabmind-test="training-feedback-worse"`；警示区 `training-worsening-warning`，处理加重按钮 `training-worsening-reassess` |
| `second-session` | v2 快照中保留第 1 次已完成会话，再打开第 2 次复查 | 顶部 `records-trigger` 打开记录页；核对旧 `sessionId`、旧线程和当前 `sessionId` 均存在 |
| `new-problem` | 旧膝问题归档，新踝问题追加为新线程 | 记录页必须同时能看到旧线程和新线程；新线程有 `supersedesProblemThreadId`，旧线程内容不得被覆盖 |
| `network-save-failure` / `timeout-save-failure` | 真实本机保存后，分别注入同步网络失败/超时 | 工作台根节点 `data-test-fault-mode` 为 `network`/`timeout`；页面显示“网络断开，正在本机保存”，不得显示已同步 |
| `storage-unavailable` | 读取种子后只阻断后续本机写入 | `data-test-fault-mode="storage"`；页面显示“本机保存失败”，不得把失败写成“已保存到本机” |

每个页面边界场景都会先创建一个真正的测试案例（带 `testRunId/scenarioId`、服务端 v2 快照和访问令牌），再把同一份快照放入测试命名空间。这样“问题反馈”“后台记录”“删除本批次”都指向真实测试案例；不是在浏览器里只塞一份脱离服务的假 JSON。测试工作台根节点为 `test-workbench-runtime`，同时暴露 `data-scenario-id` 和 `data-test-run-id`。

本轮不新增生产快照版本：`schemaVersion` 仍为 v2，问题线程和会话索引继续使用既有 `problemThreads/sessionIndex` 合同；场景的 `restoreAgeMs`、`fixtureKind`、`faultMode` 只存在于测试工作台元数据和 React `testContext`，不会进入正式用户数据。故障注入只在 `testContext` 存在时生效，正式入口没有这条路径。

“导出复现包”只在已经生成当前测试案例快照后可用。它用于缩短开发定位时间，内容包含 `scenarioId`、`testRunId`、发布版本和最新快照，不包含 Cookie、访问令牌或服务端访问凭证；它不能替代测试会话的实际操作证据。

多标签页冲突不另造假状态：打开同一测试案例的两个页面，在一页保存不同版本，另一页使用现有 `重新加载` 或 `保留本页继续`。这是当前正式冲突状态机的真实证据；冲突恢复不应再被 `network`/`storage` 场景重复计数。

### 5.5 推荐操作示例

**完整膝流程**

1. 选择“完整流程 → 单侧膝关节动作疼痛”。
2. 点击“开始测试”，按真实页面完成所有输入。
3. 在关键阶段记录标题、问题、处理和复测对象；保存一次后复制案例编号。
4. 打开后台记录核对 testRunId/scenarioId、版本和事件。
5. 需要比较另一答案时，在分叉前点击“复制为新案例”，分别走 A/B 分支。

**保存恢复**

1. 选择完整流程并走到目标阶段。
2. 保存草稿，记录当前字段、步骤和版本。
3. 刷新、关闭页面、切后台或在 debug APK 中杀进程后重新打开。
4. 核对恢复阶段、未提交输入、待复测状态和同步文案。
5. 此过程中不要点击“重新开始”或“清除草稿”。

**页面边界**

1. 选择“页面定向”和对应场景。
2. 只断言该页面的可见状态、操作出口和防御行为。
3. 报告中标记 `page_boundary`，禁止把预置的评估或历史写成真实前序证据。

**陈旧快照四档**

1. 进入“页面定向”，依次启动 `snapshot-fresh-under-24h`、`snapshot-stale-24h-acute`、`snapshot-stale-7d-acute`、`snapshot-stale-7d-chronic`。
2. 每次先记录症状描述、位置、发生时间和当前步骤，再观察是否出现 banner；这些答案在确认前后都应保持原值。
3. 急性 7 天场景必须打开对话框；未勾选三项时 `snapshot-freshness-confirm` 必须禁用，勾齐后才允许继续。
4. 慢性 7 天场景只验证提醒，不要求完成急性确认；不要用测试脚本直接调用分类函数替代页面证据。

**双侧和处理/训练边界**

1. `bilateral-priority` 用于从真实输入建立左右位置和右侧优先；检查同一处理单元是否显示“左右分别执行”，并分别完成左右复测。
2. `bilateral-training-gate` 用于快速检查另一侧未完成时的安全门；看到低负荷提示后，不要把它记录成正常训练通过。
3. `treatment-*` 从处理复测页面按实际评分控件输入目标结果，再点击带 `treatment-retest-continue` 的继续按钮；`training-worse` 先对当前动作点击 `training-feedback-worse`，再验证停止、重新评估和有限退阶出口。

**反馈、后台、清理和异常**

1. 启动任一页面边界场景后，先用 `feedback-trigger` 打开问题反馈，提交时核对当前案例、目标会话和模块；再用 `test-open-admin` 或 `后台记录` 核对脱敏读取。
2. 证据导出后点击 `test-delete-run`；只允许本轮 `testRunId` 的服务端案例和本机测试记录消失，其他 runId 与正式案例必须保留。
3. 启动 `network-save-failure`、`timeout-save-failure` 或 `storage-unavailable`，执行一次页面保存动作，记录错误提示、本机快照是否保留和服务器是否保持未同步；不要修改生产网络或放宽接口断言。

移动验证复用同一 `scenarioId`：Pixel 5/iPhone 13 预览可启动上述页面入口，仍只能记为移动网页/预览证据。Android M2～M5 必须等真实 emulator/adb/Gradle/APK 环境，不能用 `data-test-fault-mode` 或浏览器视口伪造真机通过。

## 6. 每条测试结果的最低记录格式

```text
整改编号：
开发提交 / buildId：
合同或迁移版本：
测试层：
scenarioId / testRunId：
设备、系统、浏览器或 WebView 版本：
应出现：
禁止出现：
实际结果：
证据路径：
脱敏复现包：
结论：通过 / 失败 / 阻塞 / 未覆盖
```

“页面能打开”“完整流程到达总结”“旧版本曾通过”都不能单独作为整改通过结论。
