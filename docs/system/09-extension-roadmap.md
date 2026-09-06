# 09 · 拓展路线（Extension Roadmap）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 来源：session-kernel 计划、archive/rebuild/09/10/11/12、archive/knee-decision-core/04、research 系列＋当前代码预留接口实测
> 本文只定"往哪扩、按什么顺序、接口在哪"。各方案全文在归档中（指针见附表）。

## 1. 当前未开放清单

多主诉联合处理、骨盆及上肢（颈/肩/腰/胸/肘/腕/髋）、语言模型、视觉 AI、正式视频、服务端账户。恢复目标已定但运动项目回归标准未细化；训练组次仍需真实用户反馈校准。

## 2. 会话内核重构（最大一项，状态：待规则审核后启动）

**问题**：过去重构降了静态耦合，但运行时多事实源未消除——页面状态、动态队列、复查台账、历史投影、保存快照仍各自解释同一事实。

**七条完成标准**（不是"文件变短"）：①一项操作只有一个命令入口；②一类业务事实只有一个所有者；③页面只显示聚合根的 ScreenModel；④处理队列只排顺序不拥有事实；⑤保存/恢复/刷新不产生新事实不改确认时间；⑥会话固定规则发布版本，规则升级不静默重算历史；⑦迁移一个切片后删除旧路径，**禁止长期双写**。

**目标架构**：`Command → RehabSessionAggregate（追加 Facts／Task Projection／Safety Invariants／Decision Trace）→ ScreenModel → React 只展示与收集草稿`＋规则侧 Rule Release（结构化规则包＋编译执行器＋schemaRevision＋bundleHash＋审核发布记录）。

**路径**：阶段 0 冻结边界→1 聚合根与事实合同→2 规则包执行器→3 问诊安全评估接入→4 处理复测训练接入→5 总结保存恢复→6 删旧路径评估扩展；**第一纵向切片＝大腿＋膝**。停止/继续硬门槛与工作量估算见归档原文。

**与现有体系关系**：05 的 orchestrator 独占原则是它的过渡形态；02 的复测义务台账（retest-ledger）已是"唯一事实源"的落地样板。

## 3. 多部位·多问题链（rebuild/12，状态：预研）

- 数据结构：RehabCase（episodes[]/problemChains[]/relationships[]/sharedFunctionalTasks[]）；ProblemChain 每链独立评估/处理/复测状态，**禁止全局 assessmentIndex**。
- 四种归组：一位多置（一条链）／同事件多问题（两链串行）／异时可能代偿（待筛查关系＋短筛查）／异时无关联（保持独立；首批最多两条链）。
- 调度：五级优先序，一次只跑一条主链；相邻关节只做条件性筛查。
- 代偿验证三窗口：当场可观察／当天至次日／多次趋势（2~4 次）；关系状态最高只到"趋势支持"，**永不写"已证明导致"**。
- AI 主诉收集边界：AI 只产候选（explicit/inferred/uncertain/missing/conflict），confirmed 只能由用户确认写入；管线 AI Parser→Schema Validator→User Confirmation→Case Builder→规则引擎；失败降级＝人体图＋最少固定问题。
- 分阶段 A~E＋12 条验收场景见归档原文。

## 4. 视觉评估（archive/rebuild/09＋archive/knee-decision-core/04，状态：方案定稿未接入）

- 定位：辅助记录检查结果，不新增治疗逻辑；能算完成度/左右差/分段异常/晃动，**不能算疼痛、触诊、被动末端、组织损伤、真实肌力**。
- 技术：设备端 MediaPipe Pose（33 关键点）优先；原始视频默认不上传；不用通用大模型算角度。
- 合同：`VisualAssessmentEvidence`（quality/metrics/observations/confidence/confirmedByUser）；高置信预填待确认、低置信＝暂未判断（不当正常不锁流程）；疼痛永不自动填；结果转现有 finding 进决策引擎。
- 阈值：每关节每方向独立（膝 5°/10°；踝 MDC ~2cm 不得照搬膝）；测量模块 knee-vision-assessment.ts 已落库未启用。
- 分阶段 0~3：引导回放→膝四动作→台阶/单腿/提踵/走路→跑跳变向；逐动作先采样后定阈。

## 5. 动作图与演示（rebuild/10/11＋motion-demo-system-plan）

44 张动作图提示词为唯一现行版（旧写实/双版本/解剖小窗/图内文字全废）；**业务动作 ID→素材 ID 映射，禁止拼文件名**；11 号清单"待生成"状态列已过期需刷新。视频演示系统属后续素材方案（Demo 仅留接口）。

## 6. 新部位接入（内容目录已备好接口）

按 04 §10 清单执行：region 联合＋校验集合各加一行→三库加条目→代偿复用/新增编号（护栏自动校验）→删该部位旧层残留→快照与对照表。跨池标签膨胀时把 tags 升级为按部位分组（结构已预留）。其余关节的原始资料提炼见 research/clinical-record-joint-map 与 remaining-joint-record-map（参考来源，不是现行规则）。

## 7. 已完成项（勿再当 TODO）

疼痛评分动态锚点文案（score-guide-copy.ts）、双侧分侧复测台账、专业模式一页式工作台、动作库内容目录化（批次 0-7＋C1/C2）、代偿编号分离与归类接线。
