# RehabMind 测试工作接手交接（面向接手续模型）

> 有效期：2026-08-31 起（2026-09-01 最近更新：批 G/H/G修复/I/J-1 绑定轮）
> 接手对象：下一位负责 RehabMind 前端测试的模型/agent
> 测试分支：`agent/testing`（worktree `D:\Study\codex\project\rehabmind-agent`，HEAD `d6fe867`；docs 提交会持续前移，回归的权威绑定 SHA 见 §6 line「状态」，不以此行 tip 为准。工作树干净——仅 `start-dev-3001.cmd` 未跟踪、`release.generated.ts` 生成文件，二者均不提交）
> 仓库：github.com/wolinwolin111/rehab-thinking（remote `origin`；注意 §1.4 历史分叉说明）

---

## 0. 一句定位

你在 `agent/testing` 分支上维护 **Playwright 浏览器测试 + 域契约测试 + registry 登记**，与开发（dev）侧通过「用户转交消息」协作。你的产出是：新场景脚本、驱动更新、契约更新、registry 登记、交接文档、以及一趟全量回归后的提交推送。

**接手三步**：① 读 §1（环境陷阱，尤其 §1.4 端口/编辑崩服/共享 .git）+ §5（协作协议）+ §6（当前基线与待办）；② 跑 `node scripts/quality/run-test-regression.mjs --workers=2` 确认基线绿（67+0）；③ 等下一份开发交接（形态见 §5「通知载体两种形态」），按 §7 套路处理。当前无进行中任务，处于「等下一批 SHA」态。

---

## 1. 环境与前置（每次会话必做）

### 1.1 工具链陷阱（重要，踩过的坑）

- **Shell 是 Windows PowerShell 5.1**，不用 bash/&。
- **npm 指令必须 `npm.cmd`**（`npm.ps1` 被禁，直接 `npm run` 会报错）。例：`npm.cmd run test:fast`。
- **`rg`/`grep` 不可用**；搜文件用 Grep/Glob 工具，或 `node` 临时脚本（写进 `.tmp/*.cjs` 再 `node` 运行，避免 PowerShell 引号转义地狱）。
- **中文在 PowerShell 管道会变 `?`**：凡要读/写含中文的源码或输出，用 `node` 脚本读文件并 `fs.writeFileSync(..., "utf8")`，或直接用 Read/Write/Edit 工具。**绝不**在 PowerShell 里内联含中文的 node `-e`（引号+编码双重炸）。
- **Playwright `-g` 正则含 `|` 会被 cmd `/c` 拆开**：用 `-g "X-[12]"` 或单一 `-g`，多条件拆开跑，别用 `-g "A|B"`。
- **`/test` 工作台页面有 2 个 `<main>`**：`page.locator("main:visible")` 会 strict violation → 用 `launchWorkbenchScenario` 返回的 `runtime` 容器，或 `main.first()`。
- **测试工作台轮询权限/刷新记录，不能用 `networkidle` 当就绪**：一律 `waitUntil: "domcontentloaded"` + testid 断言。见 `launchWorkbenchScenario`。
- **`readFileSync` 是同步的**：`.catch()` 对它静默无效，容错必须 try/catch（见 `tests/unit/quality/real-browser-audit-contract.test.mjs`）。
- **registry/spec 里的中文文案**：从 `scenario-catalog.ts` / 源码提取后写断言，别凭记忆写文案。

### 1.2 dev server 启动（跑浏览器用例前）

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 1
if (Test-Path ".vinext/dev/lock.json") { Remove-Item -Force ".vinext/dev/lock.json" }
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm.cmd run dev > .tmp/dev-server.log 2>&1" -WorkingDirectory "D:\Study\codex\project\rehabmind-agent" -WindowStyle Hidden
# 探活（最多 ~90s）：
$ok=$false; for($i=0;$i -lt 45;$i++){ try { $r=Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 2 }; "up=$ok"
```

### 1.3 库重建（遇到迁移/500 时）

`data/rehabmind.sqlite`（+ `-shm`/`-wal`）删除后 `npm.cmd run dev` 幂等迁移自动重建。不必手动 migrate（`npm run dev` 已前置 `scripts/data/migrate-sqlite.mjs`）。

### 1.4 本机（DSH Web 环境）修正（2026-09-01 实测，优先级高于 §1.2）

- **禁止 `Get-Process node | Stop-Process -Force`**：本机 DSH harness 自身以 node 进程运行，全杀会杀掉 agent 运行时与无关进程。用一键编排器时其 `stopServer` 已按 PID 自清理，正常**无需手动杀任何 node**；确需清理 dev server 时按端口定位：`(Get-NetTCPConnection -LocalPort <port> -State Listen).OwningProcess` → `Stop-Process -Id <pid>`。
- **回归优先用一键编排器，别手动起服**：`node scripts/quality/run-test-regression.mjs` 会自管一个 **3001** dev server（`ensureServer` 有则复用、无则起，并注入 `WALKTHROUGH_URL=3001`；跑完 `stopServer` 按 PID 收口），**无需再手动起 3001**。手动起 3001 仅用于交互式 probe 或直跑单条 playwright 排查。
  - ⚠️ **两条路径别混着并行**：直跑 `npm run test:browser:full`（未设 WALKTHROUGH_URL）时 config webServer 起的是 **3000**；若此时还留着一个手动 3001，= 两个 vite server 抢编译 → 早期用例 goto/click 超时假失败（本会话踩过）。要么走编排器（单 3001），要么直跑前先停掉手动 3001。冷编译超时已由 §6 的超时余量兜住，但仍应避免双 server 争用。
- **dev server 运行期间不要编辑 worktree 文件**：编辑工具的原子改名写入会让 vinext 文件监视器抛 `EBUSY` 杀死 server（表现为后续用例连片 `ERR_CONNECTION_REFUSED`）。先编辑、后起 server、再跑用例；中途改了文件就重启 server。
- **origin/main 与本地 main 无共同祖先**（GitHub main 停在 08-23 旧历史）。协作以**本地 main** 为准（两 worktree 共享 `.git`，`git merge main` 即达）；`git fetch` 后不要 merge `origin/main`；origin 仅用于 `push origin agent/testing`。
- PowerShell 下 `npx.cmd`/`npm.cmd` 的 npm warn 走 stderr 会造成假 exit 1，判绿仍以 `passed/failed` 行为准。
- **workers 试验结论（2026-09-01）**：`--workers=2` 全量实测稳定（试验时基线 full 61+9 全绿，218s，较 w1 的 6.2min 省 ~40%；当前基线见 §6），用于**轮内迭代/异步批次回归**；`--workers=3` 不稳定（单 vite dev SSR 饱和→教程竞态级联 38 条 click 超时 + 视觉漂移 2 条），禁用；**正式绑定/发布证据轮保持默认 workers=1**。
- 试验顺带修掉一个测试侧潜伏 bug：B2-1 刷新步骤曾硬编码 `http://localhost:3000`，靠 dev 侧 3000 恰在运行才绿；已改相对 `./`（走 baseURL/WALKTHROUGH_URL）。tests/ 内其余 300x 字面量均为合法默认值/解析用例。

---

## 2. 常用命令（回归顺序）

```powershell
# 一键回归（推荐，见 scripts/quality/run-test-regression.mjs）：链式跑 fast→knowledge→(起3001)→full→mobile→(停服)，
# 自动提取 passed/failed 判绿、产 manifest、绑定 commit。默认遇红即停；--all 摸底全跑；--workers=2 轮内提速。
# 读结果只看末尾 `verdict=` 行 + 每套件一行 PASS/FAIL（原始日志已落 artifacts/.../logs/，不必啃）。
node scripts/quality/run-test-regression.mjs --workers=2
node scripts/quality/run-test-regression.mjs --only=full,mobile --workers=2 --all   # 只浏览器两套件
node scripts/quality/run-test-regression.mjs --skip=fast,knowledge                          # 逻辑层刚跑过时

# 手动分步（runner 不可用或需单步排查时）：
npm.cmd run test:fast            # check:boundaries + cycles + structure + registry + typecheck + build + unit/workflow/component（EXITCODE 0 为准）
npm.cmd run check:knowledge      # 知识一致性：cases=8/episodes=11/findings=22/treatments=14/retests=14
npm.cmd run test:browser:full    # 全量浏览器（edge-full，已含 overall/ 全部 spec）
npm.cmd run test:browser:mobile-preview  # pixel-5 + iphone-13（唯一视口/引擎，非 full 子集）
# overall 不再单列（edge-full 已覆盖）；需单独跑时用：npm.cmd run test:browser:overall
# 场景内单跑：
npx.cmd playwright test <spec> --project=edge-full -g "X-1"
npx.cmd playwright test <spec> --project=edge-full   # 整文件（fixme 会 skip，看 passed/skipped/failed）
```

**判绿纪律**：以 `passed/failed` 行判断（runner 与 npm 退出码经实测正确传播，但历史有「判绿看行」约定）。fixme 用例显示为 `skipped`，不算 fail。runner 的 `verdict=passed` 已内置「exit0 且 failed=0 且 nodeFail=0」三重判据。

---

## 3. 目录与关键文件

### 3.1 tests 结构
```
tests/browser/
  drivers/pilot-flow.ts          # 所有驾驶函数（prepare*/complete*）
  scenarios/                     # 场景 spec（B/C/D/F/R/U/FR… 按主题分布）
  p0/decision-gates.spec.ts      # RET/INT/SAFE@p0 决策门禁
  visual/critical-layout.spec.ts # 视觉基线（toHaveScreenshot，win32 基线 png）
  support/page-helpers.ts        # openFreshProduct / skipOnboarding / collectRuntimeErrors /
                                 #   assertNoHorizontalOverflow / expectUniqueVisible /
                                 #   launchWorkbenchScenario（/test 定向场景启动）
  overall/                       # 双侧 overall 组
tests/component/rendered-html.test.mjs  # 读源码契约（区域库/生产区/NRS…）
tests/unit/quality/              # 读源码契约/护栏契约（safety-order、real-browser-audit 等）
tests/workflow/scenario-registry.json   # 场景登记表（当前 90 条纯指针索引），scenarioId 作 key
```

### 3.2 launchWorkbenchScenario（关键 helper）

`tests/browser/support/page-helpers.ts` 提供，走 `/test` 工作台 `page_boundary` 定向场景，直达步骤页（绕过完整流程）。返回 `runtime` 容器（`data-scenario-id` 已匹配）。场景 id 见 `src/features/rehabmind/test-workbench/scenario-catalog.ts`（`id` 字段）。**建议优先用它在目标 DOM 上做精确断言**（稳定、快），复杂多步流程才用 driver。

### 3.3 生产区/受支持区域（区域库删除后）
生产 4 区：`thigh-local`/`knee`/`calf-local`/`ankle-foot`。非生产 7 区名称表在 `workbench-support.tsx` `UNSUPPORTED_REGION_NAMES`（颈/肩/胸肋/肘/腕手/腰盆/髋大腿），「暂不支持」提示只依赖它。

---

## 4. 主题交接文档索引（先读这些）

**唯一权威清单**在 `docs/handover/test-session-handoff-index-2026-08-31.md`（按 dev 基线由旧到新逐档列出，当前 9 档：知识重构批次1 → 工作台批次1/2 → 最近一次出现时间 → 非生产区域清理 → 疼痛对比+恐动拆分 → outcome-slim → Phase 4.1 fixme 转化 → 批 G/H/G修复/I/J-1 绑定）。本档不再复制该列表（避免漂移）。

每份主题档含：验收结论、场景表、关键知识（DOM/testid/文案）、回归记录、待办。**主题档是冻结证据链，只追加不改写**；当前口径只认 §8 活文档白名单 5 份 + 当期主题档。接手时按需检索具体主题，不必全读。

**2026-09-02 瘦身**：每批验收记录改为「索引表追加一行 + §6 基线更新」，不再每批新建主题档（见 §7 步骤 4）。既有主题档保留为冻结证据链，不追溯删除。

---

## 5. 与开发的协作流程（必须遵守）

- **你没有跨会话通道**，不能主动联系开发。开发消息经「用户转交」，你处理完把「可转给开发」的回复整理好交用户。
- **开发不碰 tests/**（其工作区 `tests/` 是旧版，会误报）。后续回归一律以 `agent/testing` 的 `tests/` 为准。
- **提交先行、SHA 绑定（2026-09-01 起 dev 正式协议）**：dev 每批自验通过即提交 main 并通报 SHA，其工作树随后可能已推进到下一批。因此：①回归只针对**通报的 SHA**（`git merge <sha>`，不是 `git merge main`——main 可能已超前；merge 即隔离，禁止再从 dev 工作树拷文件覆盖）；②推送用显式 refspec：`git push origin <我的提交sha>:refs/heads/agent/testing`，**永不推 main**（origin/main 历史分叉，见 §1.4）；③每批 dev 随附**契约迁移说明**，按 SHA 异步回归，不再悬置等 dev 提交。
- **dev→test 交接载体（2026-09-01 起）**：每批一份 `docs/handover/development-to-test-<主题>-<日期>.md`（dev 所有、随批次提交、测试侧只读），取代聊天长消息——消息只作指针。必备段（沿用 knowledge-refactor 档骨架）：批次 SHA、测试资产修改清单/旧断言预期对照表（=契约迁移说明）、全新场景与 catalog 靶子 id、可判定不变式（oracle）、明确非阻塞的未覆盖范围、已知坑。测试侧产出仍走 `test-session-handoff-*`（测试所有）。
- **交叉口约定**：预销契约后 dev 执行删除提交，若有断言与实际装配偏差，回失败信息给 dev 按实际修正。
- **通知载体两种形态（2026-09-01 起并存）**：① 逐批 `development-to-test-<主题>-<日期>.md` 随批次提交在 main（原始形态，merge 该 SHA 即得文档）；② 汇总通知 `test-notice-<日期>-<主题>.md` + 专用 dev 分支（如 `agent/dev-20260901`，批 GHIJ 首用）——一次通报多批 SHA，含跨批契约要点、既有红免责、夹具坑、在途声明。遇 ②：`git fetch origin` 取通知分支 → 读汇总档 → 按其列的 SHA 逐个 merge（这些 SHA 在本地 main 上，共享 .git 直达）。
- **共享 .git 可达性（关键）**：两 worktree 共用一个 .git 对象库——dev 的 main 提交（含通报 SHA）在我 worktree 里 `git log main` / `git merge <sha>` **零网络直达**；origin 上的分支（`agent/testing`、`agent/dev-*`）需 `git fetch origin`。反向同理：dev 也能零成本读我的档（`git show agent/testing:<path>`）。所以「让开发知道」不是访问问题，只是触发/习惯问题。
- **反向通道现状（无正式载体）**：test→dev 目前只有「用户转达」一条路；我的 `test-session-handoff-*` 在 `agent/testing` 上、dev 不例行读。有请求要开发处理（种子缺口、既有缺陷、契约异议）时，整理成一段可转达的文字交用户，并记在当期主题档 §待办。`test-to-development-*` 固定反向载体讨论过但**尚未落地**（需 dev 同意批前读的约定）。
- **打包祖先范围对账**：通报的 tip SHA 可能带未列出的祖先提交（批 GHIJ：通报 5 个、merge 实带入 9 个）。merge 前 `git log --oneline <merge-base>..<tip>` 核对实际带入项；凡自带 development-to-test 文档且不在「在途勿等」清单的，按交接一并处理。

---

## 6. 当前测试验收基线（SG-2 双侧逐侧复测台账落定轮，2026-09-02）

全量（edge-full）：**69 passed + 0 skipped**（68+SG-2）；overall 10/10；mobile-preview 2/2；test:fast EXITCODE 0；check:knowledge ok。registry **92 条**。

**状态**：dev 分支 `agent/dev-20260901` tip `08f3e5a`（merge `4a07242`）。SG-2（bilateral-per-side-retest）台账已落定：
- 语义口径（owner 授权）：**专业模式**（康复思路·给别人，能力位仅 passiveRange+palpation）——自助模式膝伸直走 released P0 结构性拿不到处理单元，逐侧复测台账不可达，属产品设计；自助覆盖降级独立条目（非阻塞）。
- 关键修复根因（dev 挂牌实测）：① 夹具共享触诊英文 id → 生产中文标签「大腿前侧」，`anteriorThighEvidence` 中文匹配；② P0 lineage 门槛 `passive:"limited"` vs 自助剥离 passive。
- SG-2 断言含台账渲染 + 左右 pending + confirm 门控（未记完 disabled/记全 enabled）+ 确认后台账收敛进完成面板。

⚠️ 环境陷阱：playwright 全量回归时禁止并行手动 dev server（3001 抢编译→goto 超时假失败）。

**回归流程瘦身（2026-09-02，两批）**：
- 每批回归走一键编排器 `node scripts/quality/run-test-regression.mjs`（链 fast→knowledge→full→mobile，紧凑 UTF-8 verdict + 日志落盘），不再手动 `full|Out-File|Select-String` 啃乱码。overall 已从链中移除（edge-full 已含）。
- 冷启动 flake 已治本：playwright 超时 actionTimeout 8→20s、navigationTimeout 30→60s、全局 test timeout 45→90s（吸收 vite 冷编译；只影响失败速度不影响判定）。冷跑 full 实测 69 passed 无 flake。
- `test:fast` 现含 check:boundaries+cycles+structure+registry（+~8s）；`test:release` 现含 docs-links+asset-manifest。registry 校验上线即修掉一处 rot（BUILD-TYPE-01 缺 gateId）。

上一轮 Phase 4.1、outcome-slim 两轮、批 G/H/G修复/I/J-1 绑定不变。批 A 裁定已关闭「有效处理行标签」开放问题（肌肉行=肌群名、控制行=动作名，OP-1 正确）。

### 6.1 已关闭
- 知识重构批次1（C-1~C-4、D-3、RET-02）✅
- 工作台批次1、批次2 ✅
- 最近一次出现时间（R-1~R-4）✅
- 非生产区域清理（KR-CONTRACT、U-1~U-3）✅
- 疼痛对比+恐动拆分（FR-1~FR-3）✅
- 成果面板视觉瘦身（两轮绑定）✅
- Phase 4.1 fixme 转化（6 转真 + 3 删壳转缺口）✅
- **批 G/H/G修复/I/J-1 绑定（含 4 打包祖先，契约迁移 6 处）✅**
- **种子缺口③ 处理完成态靶子修复绑定（a2fcaf7；OP-1 重写为训练交接四靶心断言）✅**

### 6.2 待办 / 回退点
- **种子缺口（Phase 4.2）**：① ✅ SG-1（treatment-worse-stop）已挂；② ✅ SG-2（bilateral-per-side-retest）已挂（专业模式口径，owner 授权）；~~③~~ ✅ `a2fcaf7` 已修复并绑定。
- **自助逐侧复测覆盖（转 dev，非阻塞）**：自助模式膝伸直走 P0 拿不到台账（结构性）；如需自助覆盖，换非 P0 靶点（如膝内侧 `knee-medial-*`）另开夹具，独立条目。
- **既有缺陷（dev 批 G §7 自曝，建议开条目）**：方向侧接受补查静默丢失（`directionIsRelevant`/能力闸门裁掉已接受的方向补查项，踝区早于批 G 存在）。
- **通知载体改进（转 dev）**：汇总通知档应把"打包祖先"提交显式列出（本轮 5 通报实为 9 提交，测试侧需自行对账）。
- 若后续开发推新基线：**先 `git fetch origin` + `git merge main`（本地 main，见 §1.4）**，再全量回归；回归前**起且仅起一个** dev server（config 自动 3000，手动 3001 会抢编译资源致 goto 超时假失败，见 §6）。

---

## 7. 收到新开发交接时的处理套路

1. 先读该批 `docs/handover/development-to-test-<主题>-<日期>.md`（权威输入：批次 SHA、断言对照表=契约迁移说明、新场景与靶子 id、可判定不变式、非阻塞范围、已知坑），再按通报 SHA 核对：`git log --oneline <sha> -3` 确认在 main 线上 + `git merge <sha>`（读 diff/stat 与 dev 随附的契约迁移说明，先理解改动；勿用 `merge main`，main 可能已推进到下一批）。
2. 读 dev 提交的关键实现（`git show <sha> -- <file>`）确认 UI 文案/DOM/字段。
3. **probe 先行**：写临时 `tests/browser/scenarios/_probeNN.spec.ts` 用 `launchWorkbenchScenario` 或 driver 实探实际渲染（按钮/文案/testid），确认断言点后再写正式场景。
4. 写正式场景（一个主题归档为一个 spec），跑通 → 更新 registry → **记录**（见下）→ 全量回归（用一键 runner，读 `verdict=` 行）→ 提交推送。
   - **记录口径（2026-09-02 瘦身）**：每批**不再新建 `test-session-handoff-*` 主题档**。每批只在 `test-session-handoff-index-2026-08-31.md` 表格**追加一行**（dev 基线 / 关联场景 / 一句话结论）+ 更新本档 §6 基线 + registry。仅当一批引入**全新主题、值得独立证据链**（如整块新工作台）才破例开主题档。理由：主题档不抓 bug，每批新建是纯 token 开销；索引行 + §6 已足够追溯。
5. 整理「可转开发」回复。

---

## 8. 注意事项

- **测试只断言行为与结构，不断言用户可见文案（2026-09-02 立）**：不新增「源码里某句中文文案存在」这类 `assert.match(源码, /文案/)` 锁——文案漂移不是正确性缺陷，锁它只会在每次改名时产生迁移税。dev 改名撞到既有文案锁时，**删除该断言而非迁移**；例外：安全/合规文案（转介、停止处理、同意）与结构不变量（区域缺席、共享常量复用、安全早退顺序、id+label 混合锁）保留。存量文案锁不批量删（逐条混着安全/结构，批量删会误伤覆盖），随触碰自然衰减。
- **活文档白名单（测试侧，2026-09-01 立）**：只有这 5 份是「当前口径」，新知识只进这里 + 当期主题档——① `test-workflow-continuation-handoff.md`（本档：环境/命令/基线/协议）② `docs/quality/rehabmind-test-plan.md`（分层与门禁）③ `docs/quality/real-browser-coverage-matrix.md`（场景↔证据）④ `tests/workflow/scenario-registry.json`（纯指针索引）⑤ `tests/README.md`。其余 `test-session-handoff-*`/`defect-*`/批次档均为**冻结证据链**，只追加不改写、不再当现行标准检索源。
- **文档所有权**：docs/quality 测试相关文档 + docs/handover `test-*` 归测试侧；`development-to-test-*` 归 dev（测试侧只读）；`docs/README.md`（文档中心）、`HANDOVER.md`、`project-status.md` 归产品/dev，测试侧不改。dev 工作区 `tests/` 与 docs/quality 旧副本禁止提交进 main（会踩踏测试侧现行版）。
- **powershell 中文乱码**：一切含中文的读/写走 Read/Write/Edit 工具或 node UTF-8 脚本，别在 PowerShell 里 grep 中文。
- **`.tmp/` 放下临时脚本**（已存在、pre-approved），用完可删；`.tmp/probe*.cjs`、`scan*.cjs`、`reg-*.cjs` 是本次会话留下的，可复用作模板。
- **`release.generated.ts`**：dev 每次构建会重写，属生成文件，你的回归会看到它 diff——不提交它（除非 release 流程需要，本轮未要求）。
- **`start-dev-3001.cmd`**：本地脚本，未跟踪，不提交。
- **探活失败先看 `.tmp/dev-server.log`**。
