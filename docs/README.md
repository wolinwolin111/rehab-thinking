# RehabMind 文档中心

当前规则只认以下四份正式文档。新增结论必须改进原章节，不在文件末尾追加“补充规范”或并列新版本。

| 正式文档 | 唯一职责 |
| --- | --- |
| [产品规范](./rehabmind-complete-product-design.md) | 产品范围、用户流程、页面和记录 |
| [决策引擎规范](./rehab-decision-framework.md) | 信息怎样转成检查、处理、复测和训练 |
| [膝踝首发知识库](./knee-ankle-pilot-knowledge.md) | 膝、踝、大腿和小腿的具体临床候选 |
| [首发场景验收](./pilot-scenario-coverage.md) | 必须通过的流程场景和回归条件 |

四份文档的优先级：冲突时依次按安全规则、决策规则、产品流程、临床内容和验收用例处理。

## 实现文件

| 模块 | 文件 |
| --- | --- |
| 页面流程 | `app/rehabmind-complete-demo.tsx` |
| 通用内容 | `app/full-demo-content.ts` |
| 膝踝关系 | `app/pilot-knowledge.ts` |
| 首发决策 | `app/pilot-decision-engine.ts` |
| 膝专项决策 | `app/knee-decision-core.ts` |
| 大腿/小腿局部决策 | `app/local-limb-decision-core.ts` |
| 主诉子句与否定解析 | `app/intake-complaint-core.ts` |
| 下次康复时间建议 | `app/next-session-recommendation-core.ts` |
| 桌面样式 | `app/complete-demo.css` |

## 支撑资料

- `rehabmind-rebuild/data/`：匿名病例、来源目录和结构模板。
- `rehabmind-rebuild/knowledge/`：可追溯关系、证据等级和审核状态。
- `rehabmind-rebuild/work/`：代码走读和实施记录，不重复定义正式规则。
- `rehabmind-rebuild/09-visual-assessment-plan.md`：视觉 AI 预留方案，当前不接入。
- `rehabmind-rebuild/10-knee-ankle-action-image-prompts.md` 与 `11-action-image-inventory.md`：动作图资产。
- `real-browser-coverage-matrix.md`：设计规则、真实场景、当前证据和覆盖缺口矩阵，不定义新的产品规则。
- `rehabmind-test-plan.md`：当前测试分层、组合场景、执行节奏和发布门槛总计划。
- `rehabmind-quality-remediation-register.md`：设计、实现、测试与部署问题的整改编号、优先级、验收标准和状态。
- `rehabmind-quality-remediation-implementation-plan.md`：全部整改项的施工步骤、依赖、迁移、测试、验收和交接要求。
- `clinical-record-joint-map.md`、`remaining-joint-record-map.md`：原始资料总结，仅用于追溯候选来源。
- `archive/`：旧版长文档和讨论历史，不参与当前决策。

## 当前范围

- 正式验证：桌面端、单一主要问题、大腿至足部入口、膝与踝足功能、本地规则引擎、首次与后续康复。
- 暂不开放：多主诉联合处理、骨盆及上肢、手机端、语言模型、视觉 AI、正式视频和服务端账户。

## 维护规则

1. 一条规则只在一份正式文档中完整定义，其他文件只链接引用。
2. 审核结论直接替换原规则；旧内容需要追溯时移入 `archive/`。
3. 代码、正式文档和验收用例必须同步修改。
4. 病例经验只生成候选和排序，不能直接变成固定处方或诊断。
5. 当前默认只维护桌面端，除非用户明确要求手机端适配。
