# RehabMind 测试会话交接：知识库重构批次（第二轮）

> 日期：2026-08-30（会话结束）
> 测试分支：`agent/testing` @ `53d6e46`（worktree `D:\Study\codex\project\rehabmind-agent`）
> 开发基线：`8150b06`（已合并，合并点 `b132ebf`）
> 本轮新增提交：`4a382d7`（基础设施 v3）→ `6ea18c6`（浏览器适配）→ `fca0f71` → `53d6e46`（新场景+登记）
> 上一份交接：`docs/handover/test-session-handoff-2026-08-26.md`

---

## 1. 本轮完成（按交接文档第一部分逐项对账）

| 交接文档要求 | 状态 | 落点 |
|---|---|---|
| 快照 fixture v2→v3 四段结构 | ✅ | `tests/integration/sqlite-api/support.mjs`：`completePilotSnapshot` 重写为 v3（identity/domain/workflow/draft + 深合并 overrides + 身份覆盖向 sessionIndex/assessments/owner 传播） |
| schema/fuzz/case-service/sync/vertical-flow 等旧样本 | ✅ | 全部迁移；schema 测试重写为 `validatePilotSnapshotV3` 干净切换合同（8/8）；fuzz 矩阵 2/2 |
| build-trial-targets bundle 缺 knowledge 模块（4 个基线失败） | ✅ | 改为 `loadTypeScriptModule` 真实模块加载（6/6）；同型 strip-bundle 全部替换（batch-retest-compute、system-test-contract） |
| 6 个旧特殊检查 id | ✅ | `knee-patella-tenderness-self` 等全部清除；决策引擎用例改用新词表（8 专项：knee-acute-fracture-screen / knee-acl / knee-pcl / knee-collateral / ankle-bone-weight / ankle-thompson / ankle-anterior-drawer / ankle-syndesmosis） |
| 对照表 #1~#11 逻辑层 | ✅ | decision-engine（calf 内侧不配外翻、踝外侧柱补查）、rendered-html（合并问句/患者原话/仍受限文案/pending 迁移到 controller 等 20+ 处）、local-limb-workflow、pilot-motion-muscle-knowledge、pilot-release(schemaVersion 3) |
| 边界检查器 | ✅ | type-only 导入豁免（运行时零耦合）+ 回归用例；summary-stage 直连 domain 的运行时导入改走 stage-domain-adapters |
| 真实快照夹具 | ✅ | 重导出为 v3（IndexedDB 已升 v5，`export-real-snapshot.mjs` 已改为按现有版本打开） |
| 浏览器全量 | ✅ 33/33 | 含 RET-02 批量复测新流程、队列新顺序、教程竞态修复、视觉基线重建 |
| 新场景 B/D/C | ✅（核心不变量） | `tests/browser/scenarios/knowledge-invariants.spec.ts`（B-5/D-4/B-6）+ `tests/unit/domain/special-test-trigger.test.mjs`（D-1/D-3）+ MIX-02 增 C-5 断言 |
| F 组重跑 | ✅ | overall 4/4（多标签冲突、双侧、加重证据、T-09 快照陈旧）+ 移动预览 2/2 |
| 场景登记 | ✅ | scenario-registry.json 55→61 |
| 缺陷档案 | ✅ 1 新 | `docs/quality/defect-retest-copy-2026-08-30.md`（DEF-RETEST-01，见下） |

**回归证据**：test:fast EXITCODE 0（boundaries+typecheck+build+全部 node 测试）；浏览器全量 33/33（runId `full-20260830040336-17520` @ `fca0f71`）；overall 4/4；mobile-preview 2/2。

## 2. 关键环境知识（下一会话必读）

### 2.1 dev 数据库迁移状态损坏与修复程序（本次最大坑）

**现象**：dev 服务器（3000/3001）创建案例时服务端报
`table case_events has no column named event_schema_version`，导致创建失败、
同意门 backdrop 挂起——**极易误判为 DEF-CONSENT-01 复发**（本次就误判了一轮）。

**根因**：`data/rehabmind.sqlite` 的 `pilot_migrations_applied` 记录了 0009 已应用，
但 0009 的列实际不存在（迁移记录与 schema 脱钩）。`npm run data:v3:reset` 只清数据行、
保留迁移记录，**修不了**；dev 服务器也不自动建表。

**修复程序**（已执行，见 `.tmp/migrate-db.mjs`）：
1. 停掉 node 进程，删除/移走 `data/rehabmind.sqlite`；
2. 用 `applySqliteMigrations` 按序应用 `drizzle/0000..0009`（10 个全部 applied）；
3. 校验 `PRAGMA table_info(case_events)` 含 `event_schema_version`；
4. 重启 dev 服务器，探针确认创建成功（pilot_cases=1）且同意门正常关闭（backdrop=0）。

**结论**：DEF-CONSENT-01 **未复发**。同意门在健康库上创建后立即关闭。

### 2.2 vinext 锁是目录级

同目录起第二个 dev（哪怕不同端口）会被锁挡住 → Playwright webServer 起不来 →
runner 显示 EXITCODE 0 但**一个测试都没跑**（runner 不传播失败码，这是 runner 缺陷，
见 §5）。跑任何 playwright 前先：`Get-Process node | Stop-Process -Force` +
删 `.vinext/dev/lock.json`。判别真假绿：看输出里的 `passed/failed` 行，
不能只看 EXITCODE。

### 2.3 中文文件的 PowerShell 管道陷阱（重申）

`Get-Content -Raw | -replace | Set-Content` 会把 UTF-8 中文写成乱码（本轮 fuzz 测试
文件即被如此损坏后用 `git checkout` + Edit 工具重做）。改文件一律用 Edit 工具。

## 3. 新行为要点（对照表之外的补充发现）

1. **诱发动作=多选动作直选制**：旧「诱发场景/具体动作」两题合并为单题
   「什么时候最明显？」，选项是具体动作（走路/下蹲/坐下或起身/上楼或上台阶/下楼或下台阶/
   单腿站立/单腿下蹲/跳跃或落地 + 方向动作 + 其他动作 + 没有固定动作）。
   类别按钮（走路、站立或负重）退役；workbench-support 保留旧标签→「诱发动作」兼容映射。
2. **评估队列顺序**：主诉动作的功能卡在前（如 双腿闭链下蹲功能检查 → 台阶下降控制检查），
   随后基线 ROM（伸直/屈曲）；退役自查特检不再进入普通队列；伸直卡不再追问控制子问题。
3. **批量复测面板**（对照表 #5）：范围+不适+各功能动作在一次面板里分别记录，
   底部「继续」在全部记录后解锁；不再逐项「处理完成，复测原来的动作 → 继续」。
4. **聚焦教程**在创建后约 2.5s 延迟挂载；`skipOnboarding`/app-shell 已改为
   有界轮询点击（8s），否则浮层拦截后续点击造成连片超时。
5. **视觉基线**：队列页全量回归下绘制漂移约 1%，阈值放宽到 0.02 并加 settle
   （networkidle + fonts.ready + 双 rAF）；其余两基线仍 0.001。

## 4. 缺陷清单

| id | 级别 | 摘要 | 证据 |
|---|---|---|---|
| DEF-RETEST-01 | 中 | 复测结果行显示「仍偏小」而非对照表 #7 的「仍受限，未明显改变」；复查台账泄漏原始 id `knee-extension` | `docs/quality/defect-retest-copy-2026-08-30.md`；RET-02 error-context |
| runner 缺陷 | 低 | `run-browser-tests.mjs` 不传播 playwright 退出码，webServer 失败时仍 EXITCODE 0（假绿） | `.tmp/browser-full-1.txt`（webServer 起不来，EXITCODE 0） |

已排除：DEF-CONSENT-01 复发（环境问题，见 §2.1）。

## 5. 剩余缺口（按优先级）

1. **C-1 完整链路浏览器化**（继续排查：主诉未解决 → 继续排查卡 → 接受 → 回评估 →
   补查 → 计划刷新）：本轮未覆盖（逻辑层无现成 oracle，浏览器流程长）。
   C-2（跳过路径）、C-3（收敛）、C-4（会话隔离）同样待做；C-4 的「reset per session」
   已由 dev 提交 8150b06 实装，但无浏览器证据。
2. **B-1/B-2 证据闭环**：被动+主动证据 → 合同处理单元的专业模式完整闭环，需
   professional + canAssessPassive 流程（PERM-04 已覆盖能力边界，未覆盖证据链正路径）。
3. **F-3 保存失败文案区分**（本机保存失败 vs 网络断开）无浏览器证据；
   F-1 的「未完成侧限制训练」断言未在 overall 双侧用例中显式出现。
4. **D-2/D-3 浏览器层**：安全阻断（骨折筛查阳性 → 转影像/医学评估）目前只有
   触发逻辑单测 + SAFE-04 麻电出口，稳定性检查分级阻断无专测。
5. **runner 退出码**修复（一行：非零时 process.exitCode = child 的码）。
6. RET-02 内 DEF-RETEST-01 相关断言在开发修复后收紧（文件内有注释标记）。

## 6. 快速上手命令

```powershell
# 每次跑 playwright 前
Get-Process node -EA SilentlyContinue | Stop-Process -Force
Remove-Item .vinext\dev\lock.json -EA SilentlyContinue

# 回归顺序
npm run test:fast            # 逻辑层（EXITCODE 0 为准，同时看 passed 行）
npm run test:browser:full    # 浏览器全量（33 个）
npm run test:browser:overall # F 组
npm run test:browser:mobile-preview

# dev 库损坏时的重建（见 §2.1）
node .tmp/migrate-db.mjs
```
