# RehabMind 当前测试计划

更新时间：2026-08-27

> 本文件已按 `docs/handover/development-to-test-remediation-handoff-2026-08-27.md` 更新；RMD 整改项目在开发交付稳定前只登记为待验证，不提前计为通过。

## 1. 目的和边界

RehabMind 不使用 AI 做康复决策。测试验证明确规则、状态、页面接线、保存恢复和部署，不验证模型输出。

当前运行范围是：

- 本地与 VPS 的 Node.js + SQLite；
- 大腿、膝、小腿和踝足的六阶段康复流程；
- 来源渠道、数据同意、匿名案例、多次康复、反馈和管理员操作；
- 桌面网页以及 320、360、390、412、430px 手机网页；
- 受保护的测试工作台和决策实验室；
- 数据合同 v2、稳定 session/thread/record 身份和 Android 五层载体的整改验收。

Cloudflare Worker、D1、Wrangler、邀请链接和“拒绝后仅本机无限使用”不属于当前产品合同。案例学习模式本期不开放；“学习解释”只作为康复思路实际操作模式的说明开关。Android WebView APK 在网页与 VPS 验收后进入，必须按 M1～M5 单独出具证据。

动作图片准确性和独立临床内容审核不在本轮自动化结论内。

## 2. 测试原则

### 2.1 先证明测试能抓错

- 历史缺陷先建立会失败的回放，再修实现；
- 核心门禁使用定向变异，删除分支、反转条件或放宽权限后必须变红；
- 到达总结页、源码中出现字符串或测试数量增加，都不能单独证明业务正确。

### 2.2 预期来自设计，不来自实现

- 产品规范、知识库和决策表是 oracle；
- 测试不得复制一套简化业务模型后与该模型自我比较；
- “源码字符串存在”只可证明组件接线或禁止文案，不可证明临床或流程规则执行正确。

### 2.3 正式生产入口优先

- 规则测试直接调用正式纯函数；
- 流程测试调用正式 orchestrator、命令和状态不变量；
- 集成测试调用正式 service、route、repository 和临时 SQLite；
- 测试工作台使用正式工作台，只隔离案例身份和存储范围。

### 2.4 浏览器只验证浏览器独有问题

真实浏览器不再穷举康复选项组合。它只负责发现：

- 元素看得到但点不到；
- 手机横向溢出、遮挡和安全区域问题；
- 首次入口、保存刷新、反馈和权限是否真正接线；
- VPS 真实路径、静态资源和运行时错误。

内部处理逻辑由代码和 SQLite 流水线承担，避免重复花费时间和对话 Token。

## 3. 当前分层

| 层级 | 责任 | 主要证据 |
| --- | --- | --- |
| L0 工程 | 类型、lint、构建、依赖与模块边界 | `typecheck`、`lint`、`build`、边界检查 |
| L1 决策 | 单条规则、权限、安全、不变量 | 正式 `*-core.ts` 单测、决策表 |
| L2 状态 | 阶段、队列、复测、训练门禁、失效 | 状态转换和命令测试 |
| L3 轨迹 | 评估到处理、复测、队列重算、训练和后续康复 | orchestrator 轨迹、有种子探索、变异 |
| L4 页面接线 | 组件展示状态、事件映射、文案和禁止状态 | 组件合同；不承担业务正确性 |
| L5 数据 | 来源、同意、案例、反馈、冲突、删除、迁移和恢复 | 正式 route/service + 临时 SQLite |
| L6 最小网页 | 当前入口、刷新、反馈、移动布局和管理员拒绝 | Playwright 发布接线、完整流程和页面边界 |
| M1 网页移动预览 | Pixel 5/Chromium、iPhone 13/WebKit 的视口行为 | 独立移动预览、溢出、弹层焦点和关键路径 |
| M2 Android Emulator | 模拟器镜像、系统返回、WebView 和恢复 | 模拟器安装/启动/断网/恢复证据 |
| M3 真机 Chrome | 真实设备网页/Chrome 行为 | 设备型号、系统和 Chrome 版本证据 |
| M4 debug WebView | debug APK 外壳和网页边界 | debug 包安装、返回、断网和恢复证据 |
| M5 release APK | 正式签名候选包、升级和发布配置 | 签名、版本、覆盖升级和回滚证据 |
| L7 部署/人工 | VPS 健康、备份回滚、首次用户理解 | 发布探针与人工任务记录 |

## 4. 业务逻辑覆盖

### 4.1 决策与状态

至少覆盖：

- 正常、受限、过大、疼痛、无法完成、未知和暂不判断；
- 肿胀、按压痛、麻电、新无力和安全停止；
- 单侧、双侧、优先侧冲突和左右结果隔离；
- 普通用户、给自己、给别人及 64 种能力组合；
- 处理改善、部分改善、无变化、加重和不可即时复测；
- 同一动作复测、不同动作隔离、无法完成后再次尝试；
- 队列动态插入、去重、继续下一项和禁止提前结束；
- 训练逐项反馈、退阶、加重停止和总结门禁；
- 返回修改、版本失效、第二次康复、新症状和历史恢复。

每条关键规则至少包含：

1. 正向结果；
2. 反向禁止结果；
3. 状态副作用；
4. 必要时的独立条件或变异证据。

### 4.2 场景选择

不穷举所有浏览器组合，而在内部逻辑层覆盖：

- 单因素边界；
- 高风险成对组合；
- 安全、权限、队列和时间的三元组合；
- 用户返回、重复、刷新、并发和断网等异常序列。

发散场景以 `tests/workflow/decision-tables/`、`p0-rule-matrix.json` 和[内部逻辑覆盖矩阵](./internal-logic-coverage-matrix.md)为准。场景只有绑定生产入口和可执行证据后才算覆盖。

## 5. 页面与移动端合同

组件合同必须验证：

- 首次顺序为价值页、来源、同意、创建案例、描述问题；
- 拒绝同意时不能进入使用流程；
- 条件问题只在对应答案后显示；
- “已完成”进入对应复测，不跳过；
- 安全停止、错误和必填缺失不能被折叠；
- 手机阶段抽屉和本次记录只改变展示状态；
- 保存状态不能把 `idle` 显示成“已保存”；
- 康复记录明确区分案例与多次康复；
- 旧 Cloudflare、邀请和五步教程文案不再进入当前页面。

支持宽度必须满足：

```text
document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
```

禁止依靠 `overflow-x: hidden` 掩盖不可访问内容。

## 6. 数据与权限合同

L5 必须覆盖：

- 来源和同意服务端校验；
- 无邀请幂等创建、请求大小和频率限制；
- 公开案例编号不能读取记录，设备访问凭证保持隔离；
- 保存修订冲突只有一个成功写入；
- 多案例、正式案例和测试案例互相隔离；
- 反馈绑定案例、康复次数、模块和可选事件；
- 删除后旧凭证失效；
- migration 可重复执行，0000 数据库可升级并保持可读；
- SQLite 事务错误、`SQLITE_BUSY` 和中途异常不产生半条数据；
- 日志、响应和导出不泄漏健康原文或凭据；
- `caseId → problemThreadId → sessionId` 是历史、评分、标记、反馈、事件和同步的关联链；`sessionNumber` 只用于展示；
- 草稿保存不生成完成时间或完成次数，明确完成、转诊结束和重复提交可区分且幂等；
- v1→v2 读取不伪造坐标、评分上下文或完成状态，未知 v2 事件不阻断旧 reader；
- BodyMark 区分症状类型、侧别、视角、来源和失效状态；ScoreRecord 区分未选择、确认 0、不可用、无法完成和被替代；
- 案例学习入口不可达，遗留 study 输入不能写入生产案例、SQLite、同步、反馈或复诊；`learningExplanation` 只改变说明文字。

## 7. 当前最小浏览器门禁

`npm run test:browser:release` 当前运行桌面发布基线，移动和 Android 证据另行执行：

1. 当前首次入口与拒绝同意阻断；
2. 匿名案例自动保存、刷新恢复、反馈绑定和测试数据清理；
3. 5 个手机宽度与桌面宽度的 App 壳、阶段抽屉、本次记录和康复记录页；
4. 无效管理员凭据不能进入记录；
5. 生产入口不可达案例学习，遗留 `study` 输入在公开接口和持久化边界拒写。

规则：

- 不注入 React 内部状态；
- 通过可见控件和公开接口建立前置条件；
- 失败保留截图、trace 和视频；
- 场景自己创建的案例尽量在结尾删除；
- 浏览器门禁不登记评估/处理组合覆盖率。

**两套浏览器口径（勿混淆，2026-09-01 澄清）**：

- **发布证据门禁** = `test:browser:release`（`edge-release`，4 条最小接线：入口/刷新/反馈/移动壳/管理员拒绝）。§7 上文五点是它的判据。
- **回归基线** = `test:browser:full`（`edge-full`，当前 **67 passed + 0 skipped**）+ `test:browser:overall`（10/10）+ `test:browser:mobile-preview`（2/2）。`p0`、`divergent`、`visual`、`scenarios` 均已按当前 /test 工作台与 v3 快照重新校准、全绿，**是现行回归基线的组成部分**（本节旧版曾把它们统称「历史诊断材料」，属误导，已更正）；只有 `legacy-browser/*.mjs` 独立走读脚本随 `83e47be` 删除、不再是证据。
- 浏览器不穷举所有临床组合；组合逻辑由 L2/L3 workflow 测试负责。

## 8. 执行流程

### 每轮批次回归（测试侧接手 dev 通报 SHA 时）

一键编排器链式跑 fast→knowledge→(起 3001)→full→overall→mobile→(停服)，自动判绿、产 manifest、绑 commit：

```bash
node scripts/quality/run-test-regression.mjs --workers=2      # 轮内迭代/异步批次回归（~4min）
node scripts/quality/run-test-regression.mjs                  # 正式绑定/发布证据轮（默认 workers=1）
```

协议：只 `git merge <通报 SHA>`（勿 merge main，dev 工作树可能已推进）；推送用显式 refspec `git push origin <sha>:refs/heads/agent/testing`，永不推 main。workers 试验结论：w2 稳定省 40%，w3 禁用（单 vite SSR 饱和致级联超时）。详见 `docs/handover/test-workflow-continuation-handoff.md` §5/§1.4。

### 日常窄改动

1. 运行受影响的纯函数、流程或组件定向测试；
2. 运行 `npm run typecheck`；
3. 页面样式改动再运行 `npm run test:browser:release` 中相关场景。

### 提交前

```bash
npm run test:fast
npm run lint
```

### 数据或 API 改动

```bash
npm run test:integration
npm run test:migrations:compat
npm run test:sqlite:health
```

### 规则或流程改动

```bash
npm run test:workflow
npm run test:logic:mutations
```

### VPS 发布前

```bash
npm run test:release
npm run test:summary
```

`test:release` 会生成绑定当前 build/commit/version 的 manifest。旧产物、不同 build、缺失门禁和人工未确认都不能自动变绿。

### RMD 整改批次

开发交接中的 RMD 项目按下面顺序进入测试；“开发完成”只表示实现和契约已交付，不能替代测试通过：

| 批次 | 验收对象 | 测试入口 |
| --- | --- | --- |
| A | `RMD-WIRE-01/02`、`RMD-MODE-01`、`RMD-DOC-01/02/03` | L4 页面合同、L6 Edge 发布基线、文档一致性检查 |
| B | `RMD-HIST-01~04`、`RMD-MARK-01`、`RMD-SCORE-01`、`RMD-FIELD-03`、`RMD-MODE-02` | L1/L2 状态与数据合同、L5 保存恢复、L6 关键接线 |
| C | `RMD-SPECIAL-01`、`RMD-FIELD-01/02/04/05/06/07`、`RMD-MODE-03` | L2/L3 决策矩阵、工作流轨迹、权限和异常路径 |
| D | `RMD-PRO-01` | 受保护测试工作台隔离、管理员脱敏与清理 |
| E | `RMD-FIELD-08`、`RMD-ARCH-01` | 知识库/动作归档、迁移与历史回归 |
| F | `RMD-DOC-02` 移动与 Android 载体 | M1～M5 独立证据，不以桌面网页通过替代 APK 失败 |

每个 RMD 项目进入“开发完成待测试”前，必须有稳定的命令或事件名、可复用的迁移/快照 fixture、feature flag（如有）、`scenarioId`/`testRunId` 边界，以及明确的应出现/禁止出现结果。测试记录必须绑定 RMD 编号、commit/buildId、版本、测试层、设备/浏览器、最后验证时间和证据路径；没有这些信息的结果只记为阻塞或待补证据。

RMD 批次的退出条件是：定向回归通过，必要的变异测试能抓住门禁回归，L5 数据/安全检查通过，L6 Edge 发布基线通过；涉及移动的批次还必须完成对应 M 层独立运行。浏览器不承担临床组合穷举，组合逻辑以 L2/L3 测试和内部逻辑覆盖矩阵为准。

## 9. 当前证据（`049a21c` 最终 QA 基线）

当前统一身份：commit=`049a21c3b02a0990c0c3212d2615c96019bb82cb`，buildId=`local-049a21c3b02a-dirty-584c11ea5025`，appVersion=`rehabmind-pilot-app-0.1.0+local-049a21c3b02a-dirty-584c11ea5025.049a21c3b02a`，snapshot schema=`2`。开发生产源码已提交，QA 工作树的 dirty 仅来自测试/文档/巡检脚本和生成文件；浏览器 manifest 已重新绑定本地实际 commit。

> **当前回归基线（2026-09-06，动作库批次 0–7 绑定轮，权威以 continuation-handoff §6 为准）**：`test:fast` EXITCODE 0；node 796/0；Edge full 74 passed；mobile 2/2；registry 100 条。逐轮记录见 `docs/handover/test-workflow-continuation-handoff.md` §6 与各主题档。

| 层级/命令 | 结果 | 结论 |
| --- | --- | --- |
| `npm run test:fast` | 架构边界、typecheck、build、137 个 Node 测试文件通过 | 通过 |
| TEST-2b | 2/2 | 通过；v2 空可选字段不再被 schema 拒绝 |
| `npm run test:integration` | 17/17 | 通过 |
| `test:logic:retest` / `test:logic:ledger` | 34/34、39/39 | 通过 |
| `test:vertical` / `test:security` | 2/2、13/13 | 通过 |
| SQLite health / migration | integrity `ok`、外键失败 0；10 migrations、issues 0 | 通过 |
| `npm run lint` | 0 error、2 个 Hook warning | 通过但保留 warning |
| Edge release / overall | release 5/5；整体 20/20 | 通过；无 skipped/failed |
| Edge full | 48/48 | 通过；无 skipped/failed |
| M1 移动预览 / Firefox 高风险 | Pixel 5/Chromium、iPhone 13/WebKit 2/2；Firefox 1/1 | 移动独立预览和 Firefox 高风险通过；不替代 Android |
| `inspect-local --visual --axe` | 42/42；320px 差异 0.34% | 通过，commit/buildId 已绑定 |

当前已登记浏览器证据 manifest：`artifacts/quality/playwright/target-final-049a21c`、`overall-final-049a21c`、`full-final-049a21c`、`release-final-049a21c`、`mobile-final-049a21c`、`firefox-final-049a21c`、`explore-final-049a21c`。巡检报告：`artifacts/quality/inspect-local/2026-08-27T10-32-10-886Z/report.md`。每个 manifest 均绑定同一 commit/buildId。

本轮测试侧同步了因生产 v2 投影变化而过时的服务断言和记录页源码合同，并新增真实 test workbench fixture 边界，没有放宽 schema，也没有修改生产规则。浏览器组合继续只验证真实页面接线、关键反向断言和固定 seed；临床组合逻辑仍由 L2/L3 domain/workflow 测试承担。

### 9.1 仍未覆盖的证据

- T-09 四档浏览器时间夹具、双侧低负荷 gate、第二次康复/新问题历史、network/timeout/storage 页面边界已由当前整体 fixture 通过；它们不再列为未覆盖；
- E2E-04 双侧左右完整评估、优先侧处理顺序、分别复测及单侧未完成限制已由 `bilateral-longitudinal` 与 `bilateral-training-gate` 的真实页面证据收口；E2E-01～15 当前均为 verified；
- 移动预览仅覆盖当前预览脚本的输入/溢出/弹层焦点冒烟；人体图、滑条、保存恢复、安全停止、双侧、加重、训练反馈、总结等专门行为和 Android M2～M5 仍未形成证据；
- M2～M5 仍缺模拟器、真机、debug/release APK 运行环境和产物；M1 预览不可替代这些层级。

## 10. 发布条件

开放粉丝群前必须同时满足：

1. 当前工作树 L0-L6 门禁全部通过；
2. VPS canary、SQLite 备份迁移、健康检查和回滚演练通过；
3. VPS 网页人工任务确认产品价值、信息密度、保存恢复和手机布局；
4. 当前阻塞项有明确完成证据，不能沿用 2026-08-24 的旧发布绿灯。

RMD 整改还必须满足：

5. `RMD-HIST/MARK/SCORE/MODE` 的 L1/L2/L5 定向回归和迁移兼容通过；
6. RMD-A～F 所属场景均绑定当前 build/commit、`scenarioId`/`testRunId` 和证据产物；
7. Edge 发布基线通过后，再分别完成 M1～M5 中已具备环境的层级；未具备真机、模拟器或签名候选包时必须明确标记未覆盖；
8. 任何生产入口仍可进入案例学习、遗留 study 输入可写入生产数据、历史身份漂移、冲突静默覆盖或安全门绕过，均不得发布。

网页人工确认前不创建或构建 APK。APK 建立后只验证 WebView 特有行为，不重复所有内部康复组合。
