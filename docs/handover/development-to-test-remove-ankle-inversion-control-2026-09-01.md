# RehabMind 开发→测试交接：删除踝区内翻与足弓控制训练卡（批 J-1）

日期：2026-09-01
基线：main @ `a9a6b04`（批 I）
批次 SHA：本提交

## 内容

产品 owner 判定"内翻与足弓控制"训练卡指征逻辑不成立（触发词是主诉位置=疼，而疼不构成训练理由；真实指征"内翻肌无力+足弓塌陷"在自助人群罕见且需监督剂量）。删除：

- `ankle-inversion-control` 训练卡（full-demo-content.ts，踝区 15→14 张）。
- pilot-knowledge.ts 三处 trainingIds 引用：ANKLE-R03、ANKLE-R04（清空）、控制回退规则。

**保留**：`motion:ankle-inversion` / `strength:ankle-invertor` 评估项（仍能发现真问题）；ANKLE-R04 处理候选 `ankle-medial-control`（当场松解→复测闭环，自证有效性）。

## 断言对照

- 钉 `内翻与足弓控制` / `ankle-inversion-control` 的契约删除；踝区 exercises 数量 15→14；ANKLE-R04 `trainingIds` 现为空数组。
- 库完整性契约（"九区域全量"类）若钉过踝区卡数需同步。

## 验证

typecheck 干净；`ankle-inversion-control` 全库零残留（Get-ChildItem+Select-String 实测）。
