# 02 · 决策引擎（Decision Framework）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 事实来源：`src/domain/rehab/`（75 文件 8128 行）全量走读，行号截至本日
> 本文是决策规则的唯一完整定义。内容文案见 04，临床候选出处见 03，编排与状态见 05。

## 1. 一句话定位

把用户确认过的事实转成"下一步检查什么、处理什么、复测什么、练什么、什么时候再来"——全部为纯函数，无副作用；页面只渲染，不派生业务事实。

## 2. 数据流总图

```
口语主诉 ─intake-complaint-core─▶ 解析候选(须确认) ─chief-action-core─▶ 主诉动作/优先侧
   └─workflow-profile-core─▶ 能力/权限唯一来源
        ▼
评估队列  pilot-decision-engine.rankPilotAssessmentIds(:215) ＋ function-assessment-plan(:339)
   完整性门 assessment-record-complete(:48) ｜ 补缺 assessment-gap(:17)
        ▼
finding    knee-workflow-adapter(:365,218) ｜ local-limb-decision(:149) ｜ tissue-pathway(:40)
        ▼
问题台账   knee-decision-core.buildKneeProblems(:228)＋applyObservationStatuses(:278)
           problem-ledger-core.buildProblemLedger(:24) ｜ finding-groups(:35)
        ▼
处理候选   build-trial-targets-core(:69) ｜ buildKneeTreatmentUnits(:380) ｜ buildPilotTreatmentUnits(:402)
           去重合并 trial-target-core(:35) ｜ 队列推进 treatment-queue-core(:35)
        ▼
复测       retest-obligation-core(:155) ｜ retest-ledger-core(:156,91) ｜ batch-retest-compute(:10)
        ▼
训练       local-limb trainingFor(:127) ｜ training-progression(:53) ｜ stage-gate(:24) ｜ home-relaxation(:62)
        ▼
复诊/总结  next-session-recommendation(:27) ｜ followup-review(:60) ｜ decision-trace(:19)
```

## 3. 主诉解析（intake）

- **分句**：在"但是/但/不过/只是/这次/现在/目前"前强制断句（intake-complaint-core.ts:7）。
- **否定**：症状词前 4 字窗口匹配 `(不|没|没有|并无|无|未)(再|会|是|有)?` 不算症状；允许否定词与术语间隔 ≤2 字（:18,:42）。
- **历史抑制**：含历史词且无当前词且无"一直|仍然|还没|没有恢复|反复"→丢弃（:31）；全部被过滤时返回原文（宁滥勿缺，:38）。
- **优先侧**：只认"X侧…更明显/严重/厉害/重/疼"比较句式，仅作预填可改（:53）。
- **主诉动作**：11 区域口语→方向别名表（chief-action-core.ts:58-111）；"说不清/没有固定动作"不算动作（:24）；forceDirection 只是推断候选（:41）。
- **急性判定**：onset∈{今天或昨天,2～7天} 或（反复出现＋末次 1～3 天内）且机制∈{扭转崴伤,跌倒碰撞,跑跳拉伤}（:146）。
- **机制矛盾**（M-03）：描述含外伤词但手选"没有明确受伤"→非阻断提示（trauma-mechanism-consistency-core.ts:29）；反向不提示。
- **能力画像**：6 能力唯一来源 workflow-profile-core.ts:96；关节处理依赖被动活动度，取消即级联清除（:71,:79-85）；自助/学习模式不产生被动、抗阻、终末感、专项检查、关节处理证据（:107-122）。

## 4. 安全分流

- **术后路由**（postop-routing-core.ts）：8 术式月数阈值（ACL 类 12、半月板缝合 6、跟腱 9、半月板切除 2，:19-28）；仅 guided 生效；时长说不清一律 refer；只默认"做过"绝不默认"没做过"（:52-66）。
- **组织路径**（tissue-pathway-core.ts）：撞伤（直接撞击＋局部肌肉区＋急性或肿/淤/压痛，:42）、骨应力（逐渐＋小腿/踝足＋骨性局限词＋负重词，:80）、肌腱（明确腱文本，或腱位置＋负荷线索，膝内"髌腱区"点击不算，:63）；各路径带 blockedActions 与转介出口。
- **专项检查触发**：触发词必须命中用户明确来源；足底/足跟词只有原话提到才成立（special-test-trigger-core.ts:32）；skip 永不等于 negative（records/special-test-record-core.ts:69）。

## 5. 评估队列

- **预算**：角色映射 4/5/6（pilot-decision-engine.ts:78）；但踝四方向组、膝伸屈基础组用 `Math.max(预算, 组大小)` **可超预算**（:325,:396）——"最多 4 项"的旧说法不完整。
- **排序键**：用户明确主诉动作先于关系分（:296）；location 是硬门槛（:110）；**P0-P3 证据等级不参与排序**（:119，owner 裁定）；足趾局部压制非足趾项 -90；急性踝力量 -55。
- **功能计划**：负荷 1-5 共 27 项排序表（function-assessment-plan-core.ts:61-89）；主诉项先收、按候选补到目标数；同物理动作冲突保留负荷更低者（:357-376）；return-to-sport 需目标≥4＋非急性＋明确跑跳需求（:289）。
- **完整性门**：function 完成需 control＋discomfort；unable 需原因；代偿需列补偿项；疼需位置＋性质＋分数（assessment-record-complete-core.ts:62-75）；双侧逐侧记录后左右缺一不可（:59）。
- **补缺**：一次只回补一项；因疼/无力停止是有效结果不再追问（assessment-gap-core.ts:23-28）。

## 6. finding 与问题台账

- finding 结果值：limited/painful/weak/unstable/normal/unknown/not-testable（knee-decision-core.ts:24）。
- 问题十状态：needs-assessment→confirmed→ready-for-treatment→covered-this-round→improved/resolved/still-present/handoff-to-training/review-later/needs-professional-review（:13-23）。
- **观察状态**（applyObservationStatuses，:278-327）：每指标独立取序列末位有效值；只有主诉/动作症状类允许停在 improved，**活动度/力量任一异常必须 still-present**（:324）。
- **destination 分派**（problem-ledger-core.ts:29-38）：力量/控制→training；肿胀/按压痛→later-review；骨应力→medical-review（覆盖一切）；证据不足→assessment；**routed≠solved**（:45）。
- 肌肉紧张默认必查，仅 4 个窄例外跳过：脊柱、撞伤、骨应力、麻电（muscle-tension-assessment-core.ts:16-21）。

## 7. 处理候选（反应试验）

生成管线（build-trial-targets-core.ts:69 起）：候选池装配→12 连过滤（可用性/K-P0-07/专业门槛/先行肌肉试验/组织路径排除/白名单/能力/锐痛路径，:224-244）→打分→typeOrder 随症状切换（麻电→neural 优先，:406-412）→主诉组 slice(0,3)＋可选组 slice(3,6)（:427）→跨问题按 treatmentKey 合并（trial-target-core.ts:35）。

- **打分**：kneeCore 当前单元 5000/可用 1200；finding 支持 exact 600/组合 180/120；关系分 ×30/×12/×8/×4；触诊肌肉候选前缀 +1000（:405）。
- **去重键**：`muscle:标准区域`；treatmentKey=`侧:dedupKey`（candidate-treatment-core.ts:116-154）；同区域链内 muscleLimit 默认 2＋neural/joint/control/other 各 1（:194-203）。
- **关节松动入口四条件**：rehab 能力＋处理后被动仍受限＋该方向确有肌肉处理记录＋无停止信号（knee-decision-core.ts:538-545）；通用路径另有"初始 PROM=limited 且未复测"放行（build-trial-targets-core.ts:543）——两轨并存，记录在案。
- **髌骨**：四方向一张合并卡（:637-674）。
- **兜底**：无候选时 gentle-motion 控制项，releasedP0 方向除外（:603-616）。
- 候选=反应试验不是病因；动作肌进池、稳定肌需证据；单项阳性不生成结构诊断。

## 8. 复测

- **义务 vs 记录分离**：义务="还欠什么"，记录="实际测到什么"；义务键 7 段 `retest:{sessionId}:r{assessmentRevision}:{kind}:{targetId}:{side}:{episodeId}`（retest-ledger-core.ts:91-101）；义务五态 pending/completed/deferred/cancelled/superseded；低 revision 的 pending 自动 superseded（:325）。
- **队列重排不能抹掉义务**：pendingFunctionRetests 从"未过滤目标＋持久记录"推导（retest-obligation-core.ts:150-179）。
- **聚合**：任一 worse→worse；全 better→better；含 better/partial→partial；否则 same（:96-102）。
- **"加重"四套口径**（必须分清）：

| 场景 | 判定 | 出处 |
|---|---|---|
| 处理即时比较 | 分数任何上升即 worse（无容差） | trial-record-builder.ts:8-12 |
| 复诊跨会话 | 升 >1 分才算 worse（+1 容差） | followup-review-core.ts:43 |
| 功能完成态 | 只有 complete→unable 算加重；首末都做不完记 same | function-retest-transition-core.ts:66-68 |
| 批量复测 | 分数降＋范围差→不折叠，标 activityWorsened | batch-retest-compute.ts:34-46 |

- **归因三套"态"**：TrialResult 四态（better/partial/same/worse）；单元 attribution 三态（primary-supported/primary-hypothesis/group-only）；responseRole 七态（partial-contribution/key-completion/independent-completion/range-contribution/no-change/worsened/not-immediately-testable，treatment-response-core.ts:1-29）。
- retest-only 记录不增加处理序号，但观察必须入序列（knee-workflow-adapter.ts:394-414）。

## 9. 训练分期与进退阶

- **分期公式**：`stageCount = min(目标上限, max(2, 次数+1), 5)`——每次最多开放下一层（local-limb-decision-core.ts:134-137）；急性/撞伤/肌腱只开第 1 项（:131）。
- **进退阶**：沿 5 条训练链 ±1（training-progression-core.ts:8-59）；**退阶只允许一次**的闸门在不良事件层（adverse-response-core.ts:53 `!regressionAttempted`），不在训练核心内——页面/事件状态执行，改编排时勿丢。
- **T-10**：从"加重"改选其他反馈需确认，加重事实以 symptomHistory 追加、不可抹除（training-feedback-core.ts:34-69）。
- **居家放松**：四来源合并、同区域带侧/不带侧互斥归一、风险用"选择性避开"注记不整体隐藏；**不按位置数量硬截断**（home-relaxation-core.ts:62-102，旧文档"最多 2～3 个"已废）。

## 10. 复诊与不良事件

- **窗口分档**（next-session-recommendation-core.ts:27-76）：等待医学许可/加重→无天数；急性或肿胀→2～3 天；有即时处理或未解决活动度→3～7 天；训练且分期≥4→7～14 天；默认约 7 天。
- **不良事件阶梯**（adverse-response-core.ts:48-55）：采集不完整→capture；神经/无力或持续升高且≥7 分→stop-and-refer；训练源＋停止后回落＋位置性质未变＋未退过阶→regress-training；否则 focused-reassessment（≤3 项）。
- 追加式历史：当天晚些/次日加重追加到本次观察，不增加康复次数；连续异常每次评估版本递增，旧版本方案不可跨版本执行（canExecutePlan，:70）。

## 11. 双侧规则

优先侧裁决＝安全＞主诉＞评估，**评估更差侧只能提醒不能静默替换**（bilateral-flow-core.ts:25-54）；双侧评估未完→训练 low-load，安全信号/处理加重→blocked（:83）；单侧完成后出口必须用户选择，不自动跳侧（:101-120）；双侧复测同卡分侧记录，任一侧加重停止同类处理。

## 12. 溯源与知识版本

- 每条处理记录生成 decision trace：findingIds/ruleIds/sourceCaseIds/knowledgeVersion（decision-trace-core.ts:19-42）。
- **knowledgeVersion 双轨**：有关系证据→`REHABMIND-KNEE-ANKLE-KNOWLEDGE-V1:2026-08-29.owner-reviewed`＋decisionVersion `rehabmind-p0-runtime-1`；否则 `pilot-0.1.0`（:35-40）。
- sourceCaseIds 硬编码 16 处（knee-decision-core.ts:407-639）＋关系动态汇聚（build-trial-targets-core.ts:330-335）；KDC-05 指向 knee-decision-core 验收案例；**已知混杂**：个别条目混入中文自由文本（"线下膝伸直受限规则"，:471,:509），与结构化 id 不同源，机器不可校验——留待知识层治理。

## 13. 验收不变量（17 条，源自场景验收规范，测试侧共同基线）

SYS-EVIDENCE-001/002（无证据不生成处理；输出可溯源）、IDENTITY-001/002（同物理动作/同肌肉区域只一个目标）、IMPACT-001（异常不扩散）、BASELINE-001（未完成不造基线）、RESULT-001/002（疼痛/活动/完成分开记；痛降活动差→保留改善并停止）、STATE-001（上游变→下游失效）、QUEUE-001（重排不重不跳）、TRAIN-001（反馈齐才算完成）、SAVE-001（恢复保模式/版本/位置）、BILATERAL-001~004（双侧并立/优先侧/合并卡分侧/任一侧加重即停）、INPUT-001（位置不设硬上限按单元去重）。

完整表＋约 70 行场景验收表＋口语解析夹具见附表 `02-决策引擎-附表.xlsx`。

## 14. 与旧文档的已知出入（以本文为准）

①"普通用户最多 4 项"不完整（扩组可超）；②"加重"有四套口径，旧文档未区分；③归因"四态"实为三套并存；④P0-P3 不再参与排序；⑤放松无截断；⑥"退阶一次"闸门在事件层不在训练核心；⑦义务键含 sessionId＋episodeId 共 7 段（旧文档写 5 要素）。
