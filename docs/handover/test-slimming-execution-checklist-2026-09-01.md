# RehabMind 测试侧执行清单（定稿 · 2026-09-01）

> 范围：outcome-slim 轮收尾 + 测试系统瘦身 + 测试文档精简。
> 本清单为三轮复核（初案→文档判决→终案自审）后的定稿；被撤回项与理由见文末附录。
> 归属：P0/P2/P3/P4 全部为测试侧动作；标注 dev 的为移交项。

## 阶段 0 · outcome-slim 轮收尾（**已完成**，dev 已切「提交先行」协议）

| # | 动作 | 状态 |
|---|---|---|
| 0.1 | dev 提交 outcome-slim 到 `main` | ✅ 第一轮 `bb5da7e`；第二轮 `54b2b8e`+`7d5cc7e` |
| 0.2 | 丢弃覆盖 → `git merge <通报sha>` | ✅ `335abec`（一轮）、`f397c28`（二轮） |
| 0.3 | 复跑 rendered-html + C 组确认无漂移 | ✅ 两轮均 23/23 + 4/4 |
| 0.4 | 提交测试侧改动 + 显式 refspec 推送 | ✅ 一轮 `c944ed3`；二轮 `1d44857`；协议档 `3012b44` |
| 0.5 | 移交 dev 回复包（L954 一致性、靶子、文档所有权、旧 tests/ 误报） | ✅ L954 已由二轮 `54b2b8e` 同源化解决；靶子 `outcome-panel-chief-action-line` 已交付并钉 OP-1 |

## 阶段 1 · 回归编排与环境纪律（**已完成** 2026-09-01）

| # | 动作 | 结果 |
|---|---|---|
| 1.1 | `scripts/quality/run-test-regression.mjs` 一键编排器 | ✅ 链式 fast→knowledge→(起3001)→full→overall→mobile→(停服)；自动提取 passed/failed 判绿、产 manifest、绑 commit；`--workers`/`--only`/`--skip`/`--all`；Windows 日志名避冒号（`test:browser:full`→`full.log`） |
| 1.2 | workers 试验 | ✅ **w2 稳定**（full 61+9 全绿 218s，省 ~40%）；**w3 禁用**（单 vite SSR 饱和→38 click 超时+2 视觉漂移）；正式绑定轮保持 w1。顺带修 B2-1 硬编码 `localhost:3000`→相对 `./`（潜伏 bug，靠 dev 侧 3000 恰在跑才绿） |
| 1.3 | 协议规则落档 | ✅ merge 门（只接受已提交 SHA）、文档所有权、server 运行期禁编辑 worktree——总交接 §5/§6/§1.4 成文 |

## 阶段 2 · registry 卫生（单文件，删字段，不拆分）

| # | 动作 | 判据 |
|---|---|---|
| 2.1 | 92 条全部删除 `status`/`note` 字段，registry 回归纯指针索引（scenarioId/ruleIds/priority/evidenceType/script/titlePattern/tags）；通过状态只活在主题档与总交接 §6 | 与 coverage-matrix L265 原始设计对齐 |
| 2.2 | 前后各跑一次 `test:summary`，确认输出不变（quality-summary 只认 gateId/releaseRequired，status 无机器消费方——已核） | 零行为变化 |
| 2.3 | 登记立项（不本轮做）：registry ↔ 发布门禁从未接线（92 条全无 gateId/releaseRequired，`test:summary` 对它们恒视为非必需）——发布工程范畴 | 记入待办 |

## 阶段 3 · 文档精简（分层冻结，非删除覆盖）

| # | 动作 | 对象 |
|---|---|---|
| 3.1 | 归档 4 份 → `docs/archive/`：`pilot-persistence-test-plan.md`（邀请制已废弃，内容并入现行 test-plan §6）；`full-joint-demo-test-cases.md`（绑定已删除的髋/腰知识，注明重启多关节须重写）；`rehabmind-handover-2026-08-26.md`（放错目录的 dev 批次交接，与 HANDOVER.md 重复）；`determination-request/response-2026-08-26.md` **合并为一份**后归档（已闭合的问答对） | 唯一实质删除动作 |
| 3.2 | 入链修复：deepseek-handoff.md、docs/README.md、test-session-handoff-2026-08-26.md 文档表、docs/archive 产品史档；跑 `npm.cmd run check:docs` 至绿 | 门禁绿 |
| 3.3 | 重写 `docs/quality/rehabmind-test-plan.md`：按 08-30/31 现行制度（/test 工作台、全量 60+9 基线、runner 用法、分级口径）；修正 §7「p0/divergent/visual 不计证据」的过时表述（那是发布证据口径，非回归口径） | 消除口径矛盾 |
| 3.4 | 刷新 `docs/quality/real-browser-coverage-matrix.md`：删 D1 死引用、场景数 7→现行、status 口径与 2.1 对齐 | 与事实一致 |
| 3.5 | 冻结规矩落档：index 头部声明「主题交接档自各自轮次冻结，只追加不改写」；总交接 §8 增「活文档白名单=5：continuation handoff / test-plan / coverage-matrix / registry / tests/README，新知识只进这 5 份+当期主题档」 | 防再腐烂 |
| 3.6 | 保留不动（证据链）：`test-session-handoff-2026-08-26.md`（交接链头 + 发布指纹排除清单成员）、5 份 defect-*、a0a~a7/b0-b6/app-experience 等批次档、`real-browser-flow-audit.md`（有单测守卫）、7+1 份主题交接 | 不删不并 |

## 阶段 4 · 另轮（不混入本次验收）

| # | 动作 | 定性 |
|---|---|---|
| 4.1 | fixme 处置：6-7 条转化（踝扭伤/双侧/动作无法完成/训练加重/快照陈旧×3/二次康复——catalog 已有靶子）；feedback/admin 3 条删壳并在 coverage-matrix 登记缺口 | **覆盖扩展**，非瘦身 |
| 4.2 | dev 补处理完成态靶子后 C-2/C-4 边界化（省 ~25s，主收益是降 driver 脆弱） | 可选 |
| 4.3 | registry ↔ 发布门禁接线 | 发布工程 |

## 总验收（瘦身工程本身的 definition of done）

1. 活文档 = 5 份白名单，`check:docs` 绿；
2. registry 无 status/note，`test:summary` 输出与改前一致；
3. 全量通过数 ≥ 60+9（零覆盖损失）；
4. `run-test-regression.mjs` 一条命令出判决，workers 前后墙钟对比留档；
5. outcome-slim 证据绑定 dev 提交 sha 并推送完成。

## 附录 · 复核中撤回/修正的论断（防等下一个模型重蹈）

- ~~「1/4 时间花在跑了不算证据的用例上，可砍 p0/divergent/visual」~~：误读 test-plan §7（发布证据口径≠回归口径），那些用例是现行基线组成，不砍；改为 3.3 修文档。
- ~~「registry 拆 live/archive 两文件」~~：病灶只是会腐烂的 status 字段，删字段即可，拆文件是无谓 churn。
- ~~「C 组边界化省 50s、全量降到 5.5min」~~：C-3 循环即被测行为不可边界化，实际省 ~25s；降级为可选。
- ~~「workers=1 是产品限流决定」~~：未证实；CI 用 2 workers，本机原因待 1.2 试验判定。
- ~~「分级回归是最大收益」~~：数据传播使共享面白名单近乎全 src；全量默认不变，真收益在编排器（1.1）与环境纪律（1.3③）。
