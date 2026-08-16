# 知识关系格式与证据等级

## 1. 关系格式

```yaml
relationId: KNEE-R01
title: null
status: draft | clinical-reviewed | rejected | retired
scope: knee | ankle-foot | cross-region | boundary
relationType: assessment | symptom-modification | treatment-trial | training | follow-up | boundary

trigger:
  symptomSites: []
  symptomQualities: []
  currentTasks: []
  findings: []
  stage: acute | subacute | persistent | unknown | any
  userRole: ordinary | coach | clinician | any

doNotCallWhen: []
requiredBeforeUse: []
suggestedCheck: null

primaryTarget:
  target: null
  targetType: muscle | muscle-region | joint | movement-control | symptom-management | information-gap
  attribution: primary-supported | primary-hypothesis | group-only | uncertain
  localizationEvidence: null

supportingInterventions: []
trial: null
retestTargets: []
successMeaning: null
ifImproved: null
ifUnchanged: null
ifWorse: null
unknownFallback: null

evidence:
  strength: P0 | P1 | P2 | P3
  caseIds: []
  sourceRefs: []
  supportingNotes: []
  contradictingNotes: []

access:
  ordinary: visible | adapted | hidden
  coach: visible | adapted | hidden
  clinician: visible | adapted | hidden
```

## 2. 证据强度

这里的等级只表示“本产品病例库对该候选关系的支持程度”，不是医学指南的证据分级。

| 等级 | 含义 | 产品权限 |
| --- | --- | --- |
| `P3` | 至少两个病例出现同方向的直接处理—复测反应，且暂无重要冲突 | 通过临床审核后可进入正式候选排序 |
| `P2` | 一个病例有清楚的主要目标和直接症状调整，或同一病例多次重复出现 | 通过临床审核后可作为较高优先级试验候选 |
| `P1` | 整组处理后有反应但无法单项归因，或只有纵向反馈/治疗者明确假设 | 只能作为较低优先级组合候选或待区分检查 |
| `P0` | 只有处方、解剖推理或产品流程需要，没有直接反应证据 | 不能声称有效，只能用于补充检查或研究 |

证据强度与审核状态是两个维度。`P3 + draft` 仍不能进入正式普通用户流程。

## 3. 归因类型

- `primary-supported`：主要目标被单独按压、屏蔽、发力、拉伸或动作调整后，原问题直接变化；
- `primary-hypothesis`：主要目标明确，但只在整组处理后复测；
- `group-only`：只能确认这组处理与变化相邻，不能判断主要项；
- `uncertain`：记录不足、结果矛盾或复测对象不清楚。

## 4. 复测对象

关系不能写成“统一复测所有相关动作”。它只生成：

- 本轮优先主诉；
- 处理前已经异常且与主要目标直接相关的 1～2 项活动或发力动作；
- 同一个标准动作只复测一次，同时更新它承载的疼痛、范围和不适性质。

肿胀、单纯力量不足、普通按压痛范围和未建立基线的项目不进入每轮即时复测。

## 5. 主要目标与配合处理

线下记录中的一组处理按以下顺序保存：

1. 原文或症状调整明确指向的主要目标；
2. 为同一动作环境服务的配合处理；
3. 处理前已经做过、但主诉仍存在的历史处理；
4. 完全无法区分主次时才保存为组合目标。

产品再次遇到同一问题时，先复查主要目标，不重做所有配合区域。

## 6. 来源追溯

每条关系至少保留：病例编号、原始文件、具体日期或会话、原文反应摘要。整理 MD 只用于交叉核对，原始 TXT 是主要事实来源。
