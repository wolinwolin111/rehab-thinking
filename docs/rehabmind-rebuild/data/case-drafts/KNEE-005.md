# KNEE-005｜膝内侧与承重症状的踝足控制线索

```yaml
caseId: KNEE-005
scope: pilot
sourceIds: [COL-AI-RAW, COL-ORG]
sourceFiles:
  - ai资料/2024.7.28治疗记录.txt
  - ai资料/2024.7.30治疗记录.txt
  - ai资料/2024.10.31治疗记录.txt
  - 康复记录整理/李宁玥.md
sessions: 3
dateRange: 2024-07-28/2024-10-31
reviewStatus: draft
containsInference: false
```

## 1. 三次直接反应

### 2024-07-28

- 左膝承重时有胀感；
- 激活左侧胫骨前肌和趾长伸肌后缓解；
- 两块肌肉同时激活，原文没有区分主次，保持 `group-only`。

### 2024-07-30

- 左膝伸直时有刮擦感；
- 松解并激活左侧趾长伸肌后缓解；
- 同一目标同时使用松解与主动发力，记为趾长伸肌方向的 `primary-supported`，不拆成两条独立有效处理。

### 2024-10-31

- 左膝伸直下压时内侧疼痛；
- 促进足外翻后再次下压，疼痛消失；
- 这是足外翻控制对膝内侧症状的直接调整证据；
- 后续腓骨远端、股直肌及其他区域处理没有逐项复测，不分别标记有效。

## 2. 结构化处理实验

```yaml
- trialId: KNEE-005-T01
  primaryTarget:
    target: anterior-lower-leg-control-group
    targetType: muscle-region
    status: unknown
  localizationEvidence:
    type: symptom-modification
    detail: 胫骨前肌和趾长伸肌同时激活后承重胀感缓解
  responseAttribution: group-only
  immediateRetest:
    task: knee-weight-bearing
    result: improved

- trialId: KNEE-005-T02
  primaryTarget:
    target: extensor-digitorum-longus
    targetType: muscle
    status: explicit
  localizationEvidence:
    type: symptom-modification
    detail: 松解并激活趾长伸肌后膝伸直刮擦感缓解
  responseAttribution: primary-supported
  immediateRetest:
    task: active-knee-extension
    result: improved

- trialId: KNEE-005-T03
  primaryTarget:
    target: ankle-eversion-control
    targetType: movement-control
    status: explicit
  localizationEvidence:
    type: symptom-modification
    detail: 促进外翻后再次伸膝下压，内侧疼痛消失
  responseAttribution: primary-supported
  immediateRetest:
    task: knee-extension-press
    result: improved
```

## 3. 可进入候选池的内容

- 膝内侧或承重症状不一定只调用膝局部内容；如果踝足控制调整能直接改变原症状，可把相应控制方向升为主要候选；
- 先做症状调整测试，再决定是否追加踝足评估，不能把所有膝内侧痛固定扩展成完整踝足检查；
- 趾长伸肌同次既松解又激活时，应作为同一目标的两种处理手段，不重复生成；
- 有效控制方向可转为居家训练；是否还需要居家放松，应结合紧张度和当次反应决定。

## 4. 限制

- 三次症状表现并不完全相同，不能把它们合并成一个固定病因；
- “外侧筋膜链影响内侧”是原记录解释，产品中应保留为候选解释，不直接展示为确诊；
- 原文没有统一量表和长期效果数据。
