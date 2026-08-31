# RehabMind 测试工作接手交接（面向接手续模型）

> 有效期：2026-08-31 起
> 接手对象：下一位负责 RehabMind 前端测试的模型/agent
> 测试分支：`agent/testing`（worktree `D:\Study\codex\project\rehabmind-agent`，HEAD `7829beb`）
> 仓库：github.com/wolinwolin111/rehab-thinking（remote `origin`）

---

## 0. 一句定位

你在 `agent/testing` 分支上维护 **Playwright 浏览器测试 + 域契约测试 + registry 登记**，与开发（dev）侧通过「用户转交消息」协作。你的产出是：新场景脚本、驱动更新、契约更新、registry 登记、交接文档、以及一趟全量回归后的提交推送。

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

---

## 2. 常用命令（回归顺序）

```powershell
npm.cmd run test:fast            # check:boundaries + typecheck + build + unit/workflow/component（EXITCODE 0 为准）
npm.cmd run check:knowledge      # 知识一致性：cases=8/episodes=11/findings=22/treatments=14/retests=14
npm.cmd run test:browser:full    # 全量浏览器（edge-full）
npm.cmd run test:browser:overall # overall 双侧组
npm.cmd run test:browser:mobile-preview  # pixel-5 + iphone-13
# 场景内单跑：
npx.cmd playwright test <spec> --project=edge-full -g "X-1"
npx.cmd playwright test <spec> --project=edge-full   # 整文件（fixme 会 skip，看 passed/skipped/failed）
```

**判绿纪律**：以 `passed/failed` 行判断（runner 退出码经实测正确传播，但历史有「判绿看行」约定）。fixme 用例显示为 `skipped`，不算 fail。

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
tests/workflow/scenario-registry.json   # 场景登记表（当前 91 条），scenarioId 作 key
```

### 3.2 launchWorkbenchScenario（关键 helper）

`tests/browser/support/page-helpers.ts` 提供，走 `/test` 工作台 `page_boundary` 定向场景，直达步骤页（绕过完整流程）。返回 `runtime` 容器（`data-scenario-id` 已匹配）。场景 id 见 `src/features/rehabmind/test-workbench/scenario-catalog.ts`（`id` 字段）。**建议优先用它在目标 DOM 上做精确断言**（稳定、快），复杂多步流程才用 driver。

### 3.3 生产区/受支持区域（区域库删除后）
生产 4 区：`thigh-local`/`knee`/`calf-local`/`ankle-foot`。非生产 7 区名称表在 `workbench-support.tsx` `UNSUPPORTED_REGION_NAMES`（颈/肩/胸肋/肘/腕手/腰盆/髋大腿），「暂不支持」提示只依赖它。

---

## 4. 主题交接文档索引（先读这些）

`docs/handover/test-session-handoff-index-2026-08-31.md` 是总索引。逐主题（按 dev 基线）：
1. 知识重构批次1（8150b06..126c7f5）— C/D/RET 闭环 + 缺陷
2. 工作台批次1（effeb36）— 案例栏/集中记录/可追加检查
3. 工作台批次2（d558c08）— 处理段工作台三列/导航/安全优先
4. 最近一次出现时间（1806d9f/663c6c8）— R-1~R-4
5. 非生产区域清理（46cf0dc/7c3e734）— 契约销账/U 组
6. 疼痛对比+恐动拆分（e5cdf85/2069385/fef2886）— FR-1~FR-3

每份含：验收结论、场景表、关键知识（DOM/testid/文案）、回归记录、待办。

---

## 5. 与开发的协作流程（必须遵守）

- **你没有跨会话通道**，不能主动联系开发。开发消息经「用户转交」，你处理完把「可转给开发」的回复整理好交用户。
- **开发不碰 tests/**（其工作区 `tests/` 是旧版，会误报）。后续回归一律以 `agent/testing` 的 `tests/` 为准。
- 你提交到 `agent/testing` 并 `push origin agent/testing`。开发侧合 dev 基线的 `main`；你 `merge main` 进来。
- **交叉口约定**：预销契约后 dev 执行删除提交，若有断言与实际装配偏差，回失败信息给 dev 按实际修正。

---

## 6. 当前测试验收基线（HEAD `7829beb`）

全量（edge-full）：**60 passed + 9 skipped(fixme)**；overall 4/4；mobile-preview 2/2；test:fast EXITCODE 0；check:knowledge ok。registry 91 条。

### 6.1 已关闭
- 知识重构批次1（C-1~C-4、D-3、RET-02）✅
- 工作台批次1、批次2 ✅
- 最近一次出现时间（R-1~R-4）✅
- 非生产区域清理（KR-CONTRACT、U-1~U-3）✅
- 疼痛对比+恐动拆分（FR-1~FR-3）✅

### 6.2 待办 / 回退点
- 无 open fixme 属本轮回归的阻塞项；9 个 skipped 为各主题遗留的 `test.fixme`（含 B2-3 安全页、R 组早期、FR 空壳等，见各档）。
- 若后续开发推新基线：**先 `git fetch origin` + `git merge main`**，再全量回归；回归前必跑 §1.2 dev server。

---

## 7. 收到新开发交接时的处理套路

1. `git fetch origin` + `git log --oneline main -3` + `git merge main`（读 diff/stat，先理解改动）。
2. 读 dev 提交的关键实现（`git show <sha> -- <file>`）确认 UI 文案/DOM/字段。
3. **probe 先行**：写临时 `tests/browser/scenarios/_probeNN.spec.ts` 用 `launchWorkbenchScenario` 或 driver 实探实际渲染（按钮/文案/testid），确认断言点后再写正式场景。
4. 写正式场景（一个主题归档为一个 spec），跑通 → 更新 registry → 写/更新交接文档 → 全量回归 → 提交推送。
5. 整理「可转开发」回复。

---

## 8. 注意事项

- **powershell 中文乱码**：一切含中文的读/写走 Read/Write/Edit 工具或 node UTF-8 脚本，别在 PowerShell 里 grep 中文。
- **`.tmp/` 放下临时脚本**（已存在、pre-approved），用完可删；`.tmp/probe*.cjs`、`scan*.cjs`、`reg-*.cjs` 是本次会话留下的，可复用作模板。
- **`release.generated.ts`**：dev 每次构建会重写，属生成文件，你的回归会看到它 diff——不提交它（除非 release 流程需要，本轮未要求）。
- **`start-dev-3001.cmd`**：本地脚本，未跟踪，不提交。
- **探活失败先看 `.tmp/dev-server.log`**。
