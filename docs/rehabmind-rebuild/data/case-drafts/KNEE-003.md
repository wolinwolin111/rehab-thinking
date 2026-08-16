# KNEE-003｜急性膝外翻后活动受限与腓骨近端反应

```yaml
caseId: KNEE-003
scope: pilot
sourceIds: [COL-AI-RAW, COL-ORG]
sourceFiles:
  - ai资料/2024.7.12治疗记录.txt
  - 康复记录整理/达庆轩.md
sessions: 1
dateRange: 2024-07-12/2024-07-12
reviewStatus: draft
containsInference: false
```

## 1. 原始主诉与机制

- 冲浪时右膝被别到外翻方向；
- 右膝伸直受限；
- 腘窝不适；
- 被动屈膝末端疼痛。

该病例另有既往左踝问题，本次记录把右膝和左踝分开处理，不能合并成一个主诉。

## 2. 处理实验

```yaml
trialId: KNEE-003-T01
targetIssues: [right-knee-terminal-flexion-pain]
primaryTarget:
  target: proximal-fibula-mobility
  targetType: joint
  status: explicit
  selectionReason: 原文明确记录腓骨近端松动后疼痛消失
localizationEvidence:
  type: symptom-modification
  detail: 被动屈膝末端疼痛在腓骨近端松动后消失
supportingInterventions:
  - 右侧股外侧肌松解
  - 右侧小腿三头肌松解
  - 右侧腘肌松解
  - 右膝伸直促进
immediateRetest:
  task: passive-terminal-knee-flexion
  before: 末端疼痛
  after: 疼痛消失
  result: improved
responseAttribution: primary-supported
```

## 3. 可进入候选池的内容

- 急性外翻机制必须先进入受伤情况与必要结构风险确认，不能因为一次症状调整反应就跳过；
- 安全条件允许时，可把腓骨近端活动作为被动屈膝末端痛的一个关节候选；
- 肌肉松解和伸膝促进是同次配合处理，没有各自独立复测，不分别标记有效；
- 伸直受限和腘窝不适在原文中没有明确处理后结果，应继续保留为未复测问题。

## 4. 限制

- 只有一次当场反应；
- 没有特殊测试、影像结果和疼痛分数；
- “疼痛消失”只对应被动屈膝末端，不能自动代表伸直受限和全部日常功能已恢复。
