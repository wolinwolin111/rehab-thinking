# 结构化病例模板与审核规则

## 1. 模板目的

模板用于把格式不一致的线下记录变成可追溯数据。它不要求每个病例信息完整，也不允许根据常识补齐空白。

## 2. 字段状态

每个字段都使用以下状态之一：

- `explicit`：原文明确写出；
- `explicit_negative`：原文明确否定；
- `unknown`：原文表示不知道；
- `not_recorded`：原文没有记录；
- `inferred_low`：整理者从其他内容推断，证据低；
- `conflict`：不同记录相互冲突；
- `not_applicable`：该病例不适用。

禁止用空字符串同时表示未知、否定和未记录。

## 3. 病例头部

```yaml
caseId: ANKLE-001
scope: pilot | boundary | research
sourceIds: []
sourceFiles: []
sessions: 0
dateRange: null
reviewStatus: draft | clinical-reviewed | rejected
containsInference: true | false
```

## 4. 一次康复记录

每次会话独立保存：

```yaml
sessionId: ANKLE-001-S01
date: null
sessionType: first | followup | assessment-only
rawComplaint: null
symptomSites: []
mechanism: null
currentProvokingTasks: []
injuryEventTasks: []
functionalLimits: []
goal: null
symptomQuality: []
baselineScore: null
imaging: null
medicalRestrictions: null
assessments: []
findings: []
interventions: []
retests: []
exercises: []
nextFocus: []
unknowns: []
```

## 5. 症状位置

```yaml
- siteId: site-01
  side: left | right | bilateral | unknown
  region: thigh | knee | lower-leg | ankle | foot | unknown
  surface: anterior | posterior | medial | lateral | plantar | dorsal | unknown
  detail: "用户原始描述"
  quality: []
  status: explicit
  sourceRef: "原文件与会话位置"
```

位置不自动转换成组织诊断。

## 6. 检查与发现

```yaml
- assessmentId: ankle-dorsiflexion-active
  userFacingAction: "脚背向上勾"
  result: limited | similar | painful | unable | unknown
  side: right
  comparison: left
  discomfortSite: null
  discomfortQuality: null
  score: null
  status: explicit
  sourceRef: null
```

检查结果与问题解释分开。原文写“背屈受限”可以记录 finding，但不能自动确定肌肉或关节原因。

## 7. 处理实验与复测

```yaml
- trialId: trial-01
  targetIssues: []
  primaryTarget:
    target: null
    targetType: muscle | muscle-region | joint | movement-control | symptom-management | unknown
    status: explicit | inferred_low | unknown
    selectionReason: null
  localizationEvidence:
    type: symptom-modification | palpation | stretch | resisted-action | therapist-explicit | repeated-pattern | none
    detail: null
    sourceRef: null
  supportingInterventions: []
  immediateRetest:
    task: null
    before: null
    after: null
    result: improved | unchanged | worse | unknown
  delayedFeedback: null
  responseAttribution: primary-supported | primary-hypothesis | group-only | uncertain
  sourceRef: null
```

### 主处理目标和配合处理

线下的一组处理并不表示每个部位权重相同。病例转换必须尽量保留康复师当时的主次关系：

- `primaryTarget`：本轮最主要怀疑和希望验证的肌肉、区域、关节或控制方向；
- `localizationEvidence`：为什么把它放在主要位置；
- `supportingInterventions`：为了改善相关张力、动作或关节环境而顺带完成的配合处理。

### 反应归因

- `primary-supported`：按住、屏蔽、单独发力、拉伸或调整主要目标后，原症状/动作直接发生变化；之后整组处理有效时，主要记在该方向；
- `primary-hypothesis`：原文明确写出主要目标，但只在整组处理后复测；保留主要候选，不能声称已经单独证明；
- `group-only`：原文只有一串处理和整组后的结果，完全没有主次或定位依据；
- `uncertain`：记录不足、反应矛盾或无法判断。

配合处理只记录“参与本轮处理”，不分别生成有效标签。只有原文没有主次依据时，才按组合处理记录；不能因为同组有多个项目就抹掉明确的主要目标。

项目排列顺序本身不能自动证明第一项就是主要目标，除非原文、定位检查或重复反应支持。

## 8. 训练

```yaml
- exerciseId: null
  originalName: null
  intendedCapacity: null
  sets: null
  reps: null
  stage: basic | daily-life | sport | high-intensity | unknown
  firstSetFeedback: null
  progression: null
  status: explicit
```

记录出现某动作，不自动证明某块肌肉一定弱；只有原文检查明确或有清晰上下文时才建立能力差距关系。

## 9. 候选知识关系

病例转换后可以提出候选关系，但不能直接发布：

```yaml
relationId: REL-ANKLE-001
triggerEvidence: []
candidateFactor: null
suggestedCheck: null
possibleTrial: null
retestTargets: []
supportingCases: []
contradictingCases: []
evidenceLevel: A | B | C | D | E
reviewStatus: draft
```

## 10. 审核清单

每个病例完成前逐项确认：

- 原始主诉是否保留；
- 受伤动作和当前诱发动作是否分开；
- 多个症状位置是否全部保留；
- 左右侧是否没有被改写；
- 未记录内容是否仍为未记录；
- 反推内容是否标为 `inferred_low`；
- 是否保留了原文明确的主要处理目标和定位依据；
- 配合处理是否没有被错误标记为分别有效；
- 完全没有主次依据的组合处理是否保持 `group-only`；
- 跨次改善是否没有错误归因于某一项处理；
- 训练是否没有反推出不存在的力量结论；
- 病例是否属于首发范围或边界范围；
- 所有结论是否能追溯到原文。
