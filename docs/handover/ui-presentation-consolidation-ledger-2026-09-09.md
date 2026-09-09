# UI 表现层整理·三张台账（样式所有权 / 行为等价性 / 验收）

> 方案：`ui-presentation-consolidation-plan-2026-09-09.md`（P0→P6 分批实施）。
> 基线：`06799fe`。本台账随批次滚动更新；每批结束追加该批结果，不重写历史行。
> 结果取值只用：未实施、实现待验、通过、失败、阻塞、负责人批准延期。

## 已知失败登记（P0 量化基线，全部实测于 06799fe）

| 编号 | 失败 | 基线实测 | 证据 |
|---|---|---|---|
| F-1 | 桌面过渡卡按钮过大（方案 §3：约 289px） | complete-demo.css:86 三行网格 `auto 1fr auto`＋按钮 58px min-height；rm-visual-theme.css:753-766 再覆盖 | outputs/presentation/baseline-06799fe/（desk1280 全流程 13 帧） |
| F-2 | 横屏反馈门按钮退回默认尺寸 | land844 实测 `.rm-training-feedback-gate button` h=30、w=681、font 16px（mobile-patient.css:745 规则在 `@media (max-width:720px)` 块 :410–831 内，844 宽不命中） | baseline-land844/metrics.json |
| F-3 | 记录管理入口 summary 过小 | desk1280 实测 `.rm-records-manage summary` h=25、font 17px（无任何专属规则） | baseline-desk1280/metrics.json |
| F-4 | 总结"已复查"一律成功色 | `.rm-function-action-summary li.is-retested em` = rgb(35,122,104) mint（mobile-patient.css:869-871 只按 is-retested/is-pending 二分，不区分改善/未变/加重） | baseline-*/metrics.json summaryTone |
| F-5 | 答案选中只有外观类无语义 | confirmation-stage.tsx:79,84 仅 `is-selected` 类，无 aria-pressed（实测 ariaPressed=0） | 源码断言＋baseline |

## A. 样式所有权

> 迁移每格一行：组件 → 消费者 → 旧选择器 → 新所有者 → 兼容项 → 删除项 → 证据。

| 组件 | 消费页面/模式 | 原选择器和文件 | 新所有者 | 兼容项 | 删除项 | 验证证据 |
|---|---|---|---|---|---|---|
| ActionButton | 训练反馈门跳转按钮（training-stage.tsx:286，guided 双模式） | `@media≤720 .rm-training-feedback-gate button`（mobile-patient.css:745-755，横屏/桌面不命中=F-2） | action-button.module.css＋presentation-tokens.css | `data-present="action-button"` 作测试定位；旧 ambient 元素 reset（font:inherit 等）保留 | mobile-patient.css 门按钮补丁整块删除 | p1-verification 四视口 h=44（原 844 横屏 h=30） |
| ActionButton | 记录页：新建/复制编号/继续/删除案例/清空本机（rehab-records-page.tsx） | complete-demo.css:2077(header,42px)、:2100(footer)、:2102(.rm-record-delete)、:2105-2107(footer 页脚) | 同上 | :2077/:2100/:2105-2107 改 `:not([data-present="action-button"])` 保留排除壳；`.rm-page button` 字号规则两处（mobile-patient.css:273/1105）加 :not | :2102 `.rm-record-delete` 整行删除（零消费者） | p1-verification desk1280：复制编号 44、继续 52、新建 52、删除(展开) 44、清空 44 |
| Disclosure | 记录页"更多操作"、"记录管理"（rehab-records-page.tsx） | 无专属规则（F-3：summary 默认 25px@desk）；ambient `.rm-app details{radius:12px}`（rm-visual-theme.css:63） | disclosure.module.css | `data-present="disclosure"`；模块根选择器 (0,2,0) 压回 ambient | 无（原本无规则） | p1-verification desk1280 manageSummary h=44（原 25） |
| StatusNotice | 无消费者（P3/P4 接入答案反馈/门禁提示） | — | status-notice.module.css | `data-present="status-notice"` | — | 组件已建，验收延后至首个消费者 |
| 模块选择器装甲 | 全部三个组件 | rm-visual-theme.css:57-67 `.rm-app button/article/section/details{radius:12px}` (0,1,1) 曾压过模块 (0,1,0) | 模块根选择器统一 `[class][data-present]` (0,2,0) | — | — | 设计决策；四视口实测未回退 |
| StageTransition | rehabmind-workbench.tsx:6904（唯一消费者，六步共享） | complete-demo.css:86-94（三行网格=F-1）＋rm-visual-theme.css:753-766＋mobile-patient.css:873-882/928-931 | stage-transition.module.css（ui-primitives.tsx 原签名转接） | `data-present="stage-transition"`；导出名 StageTransition 是测试钉（rendered-html.test.mjs:311-312），保持 | 三份 CSS 全部旧规则删除（src 类名零命中后执行） | p2-verification：desk1280 按钮 253/354×52（原 ~289px 伸展）、m390 115/161×52、m320 纵排 216×52；回调链 continueStageTransition 实测到第 3 步 |
| ActionRail | treatment-retest-stage.tsx 双侧 checkpoint 两处（R-02 §6.4/状态B/C） | 局部 `rm-page-actions three/split` 渲染（仍受 mobile-patient.css 权威 rail 块控制） | action-rail.module.css＋RailAction 合同（容量3、槽位重复 dev 报错） | `data-present="action-rail"`；测量者选择器同批扩展（workbench:6806），无第二 observer | 两处局部 RailAction 类型与手工布局 IIFE 删除 | p2-rail 驱动：checkpoint 渲染 split fixed h=69、按钮 52px、runway=69px（唯一测量者消费）、主按钮回调 goToStep(4)→训练过渡卡 |
| ActionRail（其余 24 处 rail） | 其余 stage 页面 | rm-page-actions/guided-nav/one-action＋mobile-patient.css 权威块 | 待后续批次逐页迁移（组件已就绪） | 旧规则全部保留 | 无 | 未迁移——不宣称完成 |
| ChoiceButton/ChoiceGroup | confirmation-stage 安全 5 题＋骨性 3 题＋影像多选＋手术 3 组（先安全后检查的第一步） | complete-demo.css:292-300（safety article 两列桌面格）/:305-311（bone 1fr 260px）/:317（imaging）＋rm-visual-theme.css:270-271/811/924＋mobile-patient.css:459-535（v2 皮肤） | choice-button.module.css | 全部旧规则加 :not([data-present="choice-button"])/:not([data-present="task-card"]) 排除；data-rehabmind-test 全保留 | 无删除 | p3-verification：aria-pressed 全覆盖（13/13）、选中 ✓＋边框、320 单列 244px/390 双列 153px、48px |
| TaskHeading | 全部 stage（StepHeading 转接，签名不变） | complete-demo.css rm-heading 15 规则＋rm-visual-theme 15＋mobile-patient 9（全删） | task-heading.module.css | data-rehabmind-tutorial 锚点保留；进度徽章从"2/4"数字改为"当前第2项／共4项"带标签（§7.5 获准变更） | 三份 CSS rm-heading/rm-step-progress 全部删除（src 零命中后执行） | p3-verification：data-present=task-heading 渲染、进度条/眉标正常 |
| TaskCard | confirmation-stage 安全/骨性卡 | rm-safety-list article 元素规则（桌面 1fr 190px 两列格） | task-card.module.css | data-answer-id/data-answered 保留在卡根（跳转依赖）；列表分隔线归 mp 列表规则 | 无 | p3-verification：alert tone 红边、answered 属性驱动跳转 |
| 缺项定位（§7.8） | confirmation 去补充×2、training 去记录 | document.querySelector 全 document 查询；训练门 setState 后立即查旧节点 | closest(".rm-page") 根内查询＋scrollIntoView＋首个按钮 focus({preventScroll})；训练门 setTimeout(0) 等待新节点提交 | 行为不变、目标更准 | 无 | p3-verification：jump 落点 answerId=shape、inView=true、activeElement=BUTTON |
| 总结结果 tone（F-4/P4） | summary-stage rm-function-action-summary | is-retested 一律 mint（F-4：已复查≠改善） | 展示层 outcome 投影（improved/worse/unchanged/completed/neutral），只消费 retestLabel 生成时已用的同一组分数比较；mixed→neutral | 复测记录/义务（只读投影，无领域改动） | mobile-patient.css mint 一律规则改为 tone 分档 | 逻辑 7/7（outputs/presentation/p4-verification/tone-logic.json）；源码投影逐分支核对；**真实渲染证据：实现待验**（驱动被确认对话/缺口分支阻塞，登记测试侧 RQ-4） |

## B. 行为等价性

> 基线从 `git show 06799fe:<file>` 读取；文案/样式变更与临床行为差异分开记录。

| 场景 | 基线合法出口及回调 | 迁移后出口及回调 | disabled条件 | 数据来源 | 差异说明 |
|---|---|---|---|---|---|
| 反馈门"去记录第一个未反馈动作" | `pendingFeedbackExercises[0]`→`setOpenExercise(id)`→scrollIntoView（06799fe training-stage.tsx:286） | 同回调，包 ActionButton secondary/compact | 无 | 现有组件状态 | 视觉：全视口 44px（原≤720 才有 44px）；回调零改动 |
| 记录页"新建案例" | `onCreate`（06799fe :113） | ActionButton primary | 无 | 同 | 无差异（视觉同 primary） |
| "清空本机记录" | `onClear` disabled=!records.length（06799fe :118） | ActionButton danger/compact，同 disabled | !records.length | 同 | **获准视觉变化**：改 danger 色（危险语义）；确认流程未动 |
| "删除案例" | `onDelete`→workbench window.confirm（06799fe :108） | ActionButton danger/compact 进 Disclosure | 无 | 同 | 确认流程未动（confirm 在 workbench 侧） |
| "复制编号" | `onCopyCaseCode`（06799fe :99） | ActionButton quiet/compact | 无 | 同 | 42→44px |
| "继续草稿/补充影像/继续康复" | `onRestore` disabled=!record.snapshot（06799fe :107） | ActionButton primary/fullWidth，同 disabled | !record.snapshot | 同 | 无差异 |
| records Disclosure 展开 | 原生 details/summary（06799fe :108,:116-119） | 同为原生 details；onToggle 可选 | — | — | 原生展开/焦点行为保持 |
| 双侧 checkpoint 出口（§6.4 状态A） | 返回另一侧评估/继续另一侧处理/低负荷/保存（06799fe :669-690） | 同回调集合，经 ActionRail（placement 映射原 role） | 同（无 disabled 变化） | checkpointOptions | 出口集合与容量逻辑逐条保留；超容量降级"其他安全选择"不变 |
| 双侧 checkpoint 出口（状态B/C） | 返回另一侧评估(条件)/正常训练/低负荷/保存（06799fe :750-771） | 同上 | 同 | checkpointOptions＋bilateralAssessmentComplete | 同上；primary 唯一性保持 |
| StageTransition 返回/继续 | onBack→setTransitionTarget(null)、onContinue→continueStageTransition（06799fe :6904） | 同回调经新组件 | — | STAGE_TRANSITIONS | 文案/按钮名不变；实测 continue 进入第 3 步 |
| 桌面过渡卡（F-1 修复） | 三行网格 min-height 560px（基线截图 desk1280） | 内容驱动 cardH=229，按钮 52px | — | — | **获准视觉变化**（方案 §1.1 明示目标）；文案未动 |

## C. 验收

> 三层证据分开：组件预览（合成 props）／真实场景（受保护工作台或正常交互）／全流程（合法门禁走完）。

| 场景ID | SHA | 模式 | 实际视口/字号方法 | 可见业务标题 | 证据路径 | 代码/组件/流程层级 | 结果 |
|---|---|---|---|---|---|---|---|
| BASE-320 | 06799fe | guided | 320×568@DPR1 | 右小腿主诉全流程 | outputs/presentation/baseline-06799fe/m320-320x568/ | 流程+组件 | 通过（基线留档） |
| BASE-390 | 06799fe | guided | 390×844@DPR1 | 〃 | 〃/m390-390x844/ | 〃 | 通过（基线留档） |
| BASE-LAND | 06799fe | guided | 844×390@DPR1 | 〃 | 〃/land844-844x390/ | 〃 | 通过（基线留档；F-2 在案） |
| BASE-DESK | 06799fe | guided | 1280×800@DPR1 | 〃 | 〃/desk1280-1280x800/ | 〃 | 通过（基线留档；F-1/F-3 在案） |
| P1-GATE-320/390/LAND | 本轮 | guided | 三视口 | 训练反馈门"去记录第一个未反馈动作" | outputs/presentation/p1-verification/ | 组件+真实流程 | 通过（h=44 全视口；F-2 修复） |
| P1-RECORDS-DESK | 本轮 | guided | 1280×800 | 康复记录/记录管理/更多操作 | 〃/p1-desk1280-1280x800/ | 组件+真实流程 | 通过（manage 44；F-3 修复） |
| P1-RECORDS-MOBILE | 本轮 | guided | 320/390/844 | 〃 | — | 组件层级 | 实现待验（驱动未命中移动端更多抽屉入口；组件为跨视口共享同一模块皮肤，桌面证据＋模块无媒体查询支撑；P5 补移动端路径） |
| P2-TRANSITION-DESK | 本轮 | guided | 1280×800 | "症状信息收集完毕"过渡卡 | outputs/presentation/p2-verification/p2-desk1280-1280x800/ | 组件+真实流程 | 通过（F-1 修复：按钮 253/354×52 非卡宽伸展） |
| P2-TRANSITION-390/320 | 本轮 | guided | 390×844 / 320×568 | 〃 | 〃/p2-m390、p2-m320 | 组件+真实流程 | 通过（≥360 横排、≤359 纵排、52px） |
| P2-RAIL-CHECKPOINT-390 | 本轮 | page_boundary(bilateral-longitudinal) | 390×844 | "两侧处理完成后，确认训练出口" | outputs/presentation/p2-verification/rail/ | 组件+真实场景 | 通过（ActionRail fixed h=69、按钮52、runway 同步、主按钮回调进训练；状态B 实测） |
| P2-RAIL-状态A/横屏/桌面rail | 本轮 | — | — | — | — | 流程层级 | 实现待验（状态A 分支与横屏/桌面 rail 几何未采；组件固定框架含 landscape 媒体块；登记 P5 补） |

## 测试侧新增回归请求（登记，未接入）

| # | 请求场景 | 目标错误实现能失败的断言 |
|---|---|---|
| RQ-1 | 横屏（>720 宽）反馈门跳转按钮高度 | h<44 失败（F-2 修复后防回退） |
| RQ-2 | 记录管理/案例更多 summary 命中区 | h<44 失败（F-3） |
| RQ-3 | 安全答案选中态可访问语义 | 选中按钮无 aria-pressed/radio 语义失败（F-5） |
| RQ-4 | 总结结果 tone 与比较事实绑定 | 加重/未变用成功色失败（F-4 修后；投影逻辑单测 7/7，待真实渲染回归） |
| RQ-5 | 桌面过渡卡按钮宽度 | >120px 或伸展成卡失败（F-1 修后） |
| RQ-6 | 迁移组件不被 ambient 规则回退 | 模块根选择器缺 [data-present] 配对时 min-height/皮肤被 .rm-app 元素规则压过即失败 |

## 交付模板（方案 §15，P6 定稿）

### 基线与范围
- 基线 SHA / 当前 SHA：06799fe / 6c85b7f（P0+P1=7d5d9a1、P2s1=8daf229、P2s2=0ab4964、P3=8560f36、P4=6c85b7f）
- 本次实际迁移组件：ActionButton（7 消费者）、Disclosure（2）、StageTransition（1）、ActionRail（2 处 checkpoint）、ChoiceButton/ChoiceGroup（confirmation 全部答案组）、TaskHeading（全部 stage 经 StepHeading 转接）、TaskCard（安全/骨性卡）、presentation-tokens
- 明确未迁移界面：其余 24 处 rm-page-actions/guided-nav/one-action rail（组件就绪待逐页换）、assessment 处理卡图谱、summary 内容层（P4 只做了 tone 投影，信息重排属获准变更另行批次）、记录页内容层、StatusNotice（无消费者，待接入）

### 分批结果
| 批次 | 实现状态 | 验收状态 | 证据 | 未决项 |
|---|---|---|---|---|
| P0 | 完成 | 通过 | baseline-06799fe/ 四视口全流程 13帧/视口＋F-1..F-5 量化 | — |
| P1 | 完成 | 通过（P1-RECORDS-MOBILE 待验） | p1-verification/ 4视口 | 移动端记录页路径截图 |
| P2 | 完成 | 通过（P2-RAIL 状态A/横屏rail 待验） | p2-verification/ | 状态A 分支、横屏 rail 几何 |
| P3 | 完成 | 通过 | p3-verification/ 语义+几何+定位 | 骨性题桌面截图（结构同 safety） |
| P4 | 部分完成（tone 投影） | 实现待验 | tone-logic.json 7/7 | 真实渲染三状态（RQ-4）；信息重排未做 |
| P5 | 部分完成 | 通过（本批范围内） | 各批 verification + 生产构建 CSS 核查 | 全 §11 矩阵未跑全；125/200% 未做 |
| P6 | 完成 | 通过 | 本台账＋src 类名零命中检查＋生产 CSS 无旧规则 | 未迁移面见上 |

### 可维护性结果
- 删除/缩小的旧规则及原消费者：stage-transition 全套（workbench 唯一消费者）、rm-heading/rm-step-progress 全套（StepHeading）、rm-record-delete（零消费者）、safety/bone/imaging 桌面元素格（:not 排除壳）、mobile-patient 反馈门补丁/过渡卡三块
- 每个组件的新唯一所有者：presentation/*.module.css＋presentation-tokens.css（ActionButton/Disclosure/StatusNotice/StageTransition/ActionRail/ChoiceButton/TaskHeading/TaskCard）
- 仍保留的兼容项、原因与删除条件：:not([data-present]) 排除壳（保护未迁移消费者；逐页迁移后删除）、data-rehabmind-test/data-answer-id（测试与跳转定位）
- token 实际消费者及未用项：全部 --present-* 有消费者（模块 CSS）；无空置 token

### 行为保护
- 合法出口、回调、disabled条件前后对照：台账 B 表 8 行逐条（回调集合逐条保留；确认流程未动；窗口 confirm 仍在 workbench 侧）
- 临床/数据/API/身份是否零修改：是（diff 仅 components/styles/handover/app/layout 样式入口）
- B 类文件是否零手工修改：是（git log 无 tests/**、docs/quality/**、release.generated.ts、artifacts/** 改动；vinext build 受控验证后已清理 dist）

### 验收
- 组件预览：合成 props 未建独立预览页（复用 page_boundary 场景替代；如实登记）
- 真实场景：p1/p2/p3 verification（真实流程到达）
- 全流程：baseline 4 视口（基线）＋p2 transition 回调链到第 3 步＋rail checkpoint 回调到训练
- 手机/横屏/桌面/字号/真机：手机✓桌面✓横屏（P1 前 F-2 后通过）；字号 125/200% 未做（U02 口径：另行取证）；真机待真机
- 开发构建与正式发布门禁分别的状态：vinext build 兼容通过（产物含全部模块类＋装甲、无旧规则）；正式发布门禁＝测试侧 test:release，未执行
- 测试侧新增失败差集：0（59 条预存红逐条相同，三轮比对）

### 结论
- 开发实现完成 / 待验 / 验收通过（据实选择）：**开发实现完成（P0–P3 全量、P4 tone 投影、P6 清理）；验收通过限定于已列证据场景；P4 渲染/字号/真机/全矩阵待验**
- 下一位模型必须处理的具体事项：① RQ-1..RQ-6 转测试侧建回归；② P4 真实渲染三状态取证（treatment-improved/same/worse 场景＋dialog.accept 需在 goto 前注册）；③ 其余 24 处 rail 逐页迁移（每处按台账 A 模板记一行）；④ 125%/200% 按 U02 修正口径另行取证；⑤ 移动端记录页与横屏 rail 几何补采
