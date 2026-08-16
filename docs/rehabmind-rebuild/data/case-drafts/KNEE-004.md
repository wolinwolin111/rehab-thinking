# KNEE-004｜下蹲刮擦感、弹响与两类症状调整

```yaml
caseId: KNEE-004
scope: pilot
sourceIds: [COL-AI-RAW, COL-ORG]
sourceFiles:
  - ai资料/2024.8.8治疗记录.txt
  - 康复记录整理/张鹏宇.md
sessions: 1
dateRange: 2024-08-08/2024-08-08
reviewStatus: draft
containsInference: false
```

## 1. 原始主诉任务

- 下蹲时右膝有刮擦感；
- 同时有弹响。

刮擦感和弹响必须分成两个表现，因为第一次处理后两者变化不同。

## 2. 处理前已经完成的内容

- 右侧阔筋膜张肌、髂胫束、腰大肌和股外侧肌松解；
- 完成后仍记录到下蹲刮擦感和弹响，因此这些内容不能被标记为已经解决本次主诉。

## 3. 处理实验一：腓骨关节组合

```yaml
trialId: KNEE-004-T01
targetIssues: [squat-scraping, squat-clicking]
primaryTarget:
  target: proximal-and-distal-fibula-mobility
  targetType: joint
  status: unknown
  selectionReason: 两处连续处理，没有记录哪一处是主要目标
localizationEvidence:
  type: none
  detail: 无法在腓骨近端与远端之间单独归因
supportingInterventions: []
immediateRetest:
  task: squat
  before: 刮擦感并有弹响
  after: 刮擦感消失，弹响仍存在
  result: improved
responseAttribution: group-only
```

## 4. 处理实验二：下蹲轨迹调整

```yaml
trialId: KNEE-004-T02
targetIssues: [squat-clicking]
primaryTarget:
  target: frontal-plane-knee-control
  targetType: movement-control
  status: explicit
  selectionReason: 手抵膝外侧再次下蹲时弹响改善
localizationEvidence:
  type: symptom-modification
  detail: 外侧手动支持改变弹响
supportingInterventions: []
immediateRetest:
  task: squat-with-lateral-knee-support
  before: 下蹲仍有弹响
  after: 弹响改善
  result: improved
responseAttribution: primary-supported
```

原文将该反应解释为髋外展能力不足、起身时习惯性膝内扣，并安排屈髋侧移和单髋支撑。产品可把它作为训练候选，但“髋外展不足”仍需检查支持，不能只凭弹响改善直接确诊。

## 5. 可进入候选池的内容

- 同一个下蹲任务中的不同症状可以对不同处理有不同反应；
- 首次复测后，只继续处理仍存在的弹响，不重复处理已经消失的刮擦感；
- 腓骨近端和远端连续处理只能先记为组合方向，不能虚构主要部位；
- 手动轨迹调整对弹响有效时，可进入髋—膝控制检查与训练候选；
- 前面已经做过但主诉仍存在的肌肉区域，不应在后续步骤重复生成。

## 6. 限制

- 没有分数；
- 腓骨近端与远端未分别复测；
- 轨迹调整只说明可改变症状，不等于已经证明单一病因。
