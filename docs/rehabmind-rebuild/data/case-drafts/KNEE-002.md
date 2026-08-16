# KNEE-002｜屈膝末端内侧痛与腓骨近端调整反应

```yaml
caseId: KNEE-002
scope: pilot
sourceIds: [COL-AI-RAW, COL-ORG]
sourceFiles:
  - ai资料/2024.11.3治疗记录.txt
  - 康复记录整理/小美.md
sessions: 1
dateRange: 2024-11-03/2024-11-03
reviewStatus: draft
containsInference: false
```

## 1. 原始主诉

- 左膝内侧疼痛；
- 屈膝到末端会疼；
- 长时间屈膝后再走路会不舒服。

## 2. 明确检查

- 膝关节触诊无疼痛；
- 半月板测试阴性；
- 下蹲时身体会向右侧偏；
- 记录还包括右侧骨盆活动、右侧腰大肌与腰方肌、腘肌等发现，但没有记录它们对左膝主诉的直接改变。

## 3. 处理实验

```yaml
trialId: KNEE-002-T01
targetIssues: [left-knee-terminal-flexion-pain]
primaryTarget:
  target: proximal-fibula-mobility
  targetType: joint
  status: explicit
  selectionReason: 原文直接记录腓骨近端松动及其后变化
localizationEvidence:
  type: symptom-modification
  detail: 松动后屈膝角度更大且不疼
supportingInterventions: []
immediateRetest:
  task: knee-terminal-flexion
  before: 屈膝末端疼痛
  after: 屈膝角度更大且不疼
  result: improved
responseAttribution: primary-supported
```

## 4. 可进入候选池的内容

- 对“膝内侧痛 + 屈膝末端痛”，腓骨近端活动可以作为一个需要验证的关节候选，而不是固定原因；
- 处理前后同时比较原主诉和屈膝范围；
- 触诊无痛和半月板测试阴性属于本病例的反对/排除证据，不能被处理反应覆盖；
- 下蹲偏移尚无处理复测，不能直接生成训练结论。

## 5. 限制

- 只有一次记录；
- 没有疼痛分数；
- 没有后续随访；
- 不能由一个病例推出所有膝内侧痛都应做腓骨近端松动。
