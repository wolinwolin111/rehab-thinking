# RehabMind 文档中心

现行系统文档共 11 份，全部在 [`system/`](./system/)，以代码实测为准（每份头部标注事实来源与日期）。本索引之外的一切过程文档均已移入 [`archive/`](./archive/)，仅作追溯，不得引用为当前标准。

## 现行文档

| # | 文档 | 一句话职责 |
|---|---|---|
| 01 | [产品设计与用户流程](./system/01-product-design.md) | 范围、双模式权限、六步/五阶段流程、交互契约 |
| 02 | [决策引擎](./system/02-decision-framework.md) | 信息怎样变成检查、处理、复测、训练、复诊（含 17 条验收不变量） |
| 03 | [首发临床知识库](./system/03-clinical-knowledge-base.md) | 膝踝大腿小腿的临床候选、专项库、归因模型与溯源体系 |
| 04 | [动作内容目录](./system/04-content-catalog.md) | 词根/三库/选项库/代偿词表/golden 的内容层架构与校验 |
| 05 | [会话编排与状态](./system/05-session-orchestration.md) | 命令流、状态所有者分工、会话身份 |
| 06 | [数据来源与持久化](./system/06-data-and-persistence.md) | 快照四段合同、版本号、同步状态机、API 与匿名安全 |
| 07 | [架构边界与质量门禁](./system/07-architecture-boundaries.md) | 依赖方向、独占所有者、门禁总表、B 类权属 |
| 08 | [设计原则与决策档案](./system/08-design-principles.md) | 为什么是这个形状；裁定索引与未决事项 |
| 09 | [拓展路线](./system/09-extension-roadmap.md) | 各拓展项的顺序与接口总览 |
| 10 | [多关节多部位康复·拓展方案](./system/10-multi-region-rehabilitation.md) | 一案多链的架构设计（v1 提案）：八条决策、六阶段实施 |
| 11 | [工程协作与测试体系](./system/11-engineering-workflow.md) | 双分支权属、验证纪律、测试体系全景、接手清单 |

**阅读路径**：新读者 01→02→03；查"为什么长这样"08；改文案 04；改决策 02＋03；改状态/存储 05＋06；提 PR 前 07；规划下一步 09（多区域细节看 10）；**接手干活/新会话起步 11**。

**冲突裁决序**：安全规则 ＞ 决策规则（02）＞ 产品流程（01）＞ 临床内容（03）＞ 内容叫法与剂量（04）＞ 验收用例（02 §13）。

## 支撑资料（非叙述文档）

- `rehabmind-rebuild/data/`：匿名病例草稿与来源目录——**代码 sourceCaseIds 的溯源终点，不可删**。
- `rehabmind-rebuild/knowledge/`：关系定义与审核记录（KNEE-R/ANKLE-R/CROSS-R）。
- `research/`：原始资料提炼与术后时间线验证（代码注释引用）。
- `operations/`：发布运行手册。
- `quality/`：测试侧体系（B 类，测试会话所有）。
- `handover/test-notice-2026-09-01-batch-sha-bindings.md`：开发侧轮次制记录档（改动/裁定/解钉项登记，供追溯；跨会话信息由 owner 转述，本档非通信通道）。
- `archive/`：全部历史过程文档（已执行完的施工计划、一次性交接、被取代的 rebuild 叙述文档）。
- `archive/docs-root/`：4 份旧正式文档（product-design / decision-framework / pilot-knowledge / scenario-coverage），内容已被 01/02/03 取代；2026-09-08 测试侧解钉完成后归档，docs 根仅剩本索引。

## 维护规则

1. 一条规则只在一份现行文档完整定义，其他文件只链接引用。
2. 审核结论直接替换原规则；需追溯的旧内容移入 `archive/`。
3. 代码、现行文档、验收用例必须同步修改；文档内事实须带 `文件:行号` 证据。
4. 病例经验只生成候选和排序，不能直接变成固定处方或诊断。
5. 桌面与 320~430px 手机网页均为维护范围；Android APK 网页确认后构建。

## 当前范围

本地已验证：桌面与 5 个手机宽度、单一主要问题、大腿至足部入口、膝与踝足功能、来源/同意/匿名案例、受保护测试工作台、首次与后续康复。暂不开放见 09 §1。
