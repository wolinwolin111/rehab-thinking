# RehabMind 粉丝群开放前执行手册

更新时间：2026-08-22

## 1. 目的和边界

本手册交给后续执行模型，目标是完成 RehabMind 小范围粉丝群试用前的必要验收，并给出明确的“允许开放/禁止开放”结论。

本手册**不包含动作图片生成、替换、审核和素材接入**。动作图片另行处理，不作为本手册的执行内容。

本项目不使用 AI 做康复决策。本手册验证的是发布环境、邀请入口、案例数据、权限、反馈、版本、日志和最小用户入口是否可靠。

## 2. 当前已完成基线

开始本手册前，先确认以下基线没有被新改动破坏：

| 项目 | 当前结果 | 验证命令 |
| --- | --- | --- |
| 内部逻辑全量测试 | `528/528` | `npm run test:fast` |
| D1/API 本地集成 | `5/5` | `npm run test:integration` |
| 定向变异 | `12/12` | `npm run test:logic:mutations` |
| 类型检查 | 通过 | `npm run typecheck` |
| 构建 | 通过 | `npm run build` |
| lint | 0 errors | `npm run lint` |

允许保留的 lint warning 只有当前 `.wrangler` 生成文件中的 2 条未使用变量 warning；业务源码不能新增 warning。

如果基线失败，立即停止，不进入 Cloudflare 部署和粉丝群开放准备。

## 3. 粉丝群开放前的阻断项

以下项目全部通过后，才允许向粉丝群发送邀请链接：

1. 本地逻辑、构建、lint 和 D1/API 门禁通过。
2. 预览 Worker 和预览 D1 配置正确，远程迁移完成。
3. 预览环境的邀请、创建、保存、读取、冲突、并发、隔离、反馈、管理员读取和删除通过。
4. 预览环境的错误响应和日志不会暴露访问令牌、完整主诉或内部堆栈。
5. 正式试用环境使用独立 Worker、D1、邀请配置、管理员密钥和版本标识，不能直接把预览环境当正式环境。
6. 正式试用环境至少完成一次 HTTP/API 验收。
7. 页面至少完成一次极简用户冒烟：邀请入口可进入、案例编号显示、填写后刷新可恢复。
8. 所有测试案例已删除或明确标记为测试数据，没有真实用户信息。

真实浏览器不再运行完整场景矩阵、不再重复三次 P0、不再用浏览器验证内部决策组合。第 7 项只验证发布入口和保存恢复边界。

## 4. 可以暂缓的事项

以下事项不阻塞本次粉丝群试用，但必须在发布记录中标注为未完成：

- `RET-03` 完全不注入 IndexedDB 前置状态的完整用户路径；
- 剩余 P1 发散场景的全面浏览器走读；
- Firefox 完整流程和移动端完整流程；
- 普通用户与专业人员各一次完整人工走读；
- 浏览器失败路径的全局 `runId` 清理增强；
- 管理后台分页、统计、筛选和导出等增强功能；
- 全量视觉截图回归。

这些事项不能被写成“已完成”，但也不能与本次发布阻断项混在一起。

## 5. 执行总原则

- 所有测试使用合成数据，不使用真实姓名、手机号、病历或粉丝信息。
- 每次测试生成唯一 `runId`，推荐格式：`release-YYYYMMDD-HHmmss`。
- 不把真实邀请 token、管理员密钥、访问 token 写入文档、代码、截图或提交记录。
- 不执行 `git reset --hard`、`git checkout --` 或删除未知来源的工作区文件。
- 不直接修改线上 D1 数据作为测试手段。
- 每个失败都要保留命令、时间、环境、HTTP 状态、错误响应、案例编号和处理结论。
- 任一步失败，都不能用相邻测试通过替代该步骤。

默认不运行以下浏览器命令：

```powershell
npm run test:browser:full
npm run test:explore
npm run test:visual
```

只有页面入口、保存恢复或发布域名发生变化时，才执行第 11 节的一次最小冒烟。

## 6. 第一阶段：本地基线复核

### 6.1 检查工作区

```powershell
Set-Location D:\Study\codex\project\rehab-thinking-demo
git status --short
```

记录工作区是否存在其他模型或用户的未提交修改。不要恢复或覆盖这些修改。

### 6.2 运行本地逻辑门禁

```powershell
npm run test:fast
npm run lint
npm run test:logic:mutations
```

验收标准：

- `test:fast` 为 `528/528` 或更高；新增测试必须解释数量变化；
- lint 为 0 errors；
- 变异测试输出 12 项 `killed`；
- typecheck、build 均通过。

### 6.3 运行本地 D1/API 集成

启动服务：

```powershell
npm run dev -- --hostname 127.0.0.1
```

在另一个 PowerShell 窗口执行：

```powershell
Set-Location D:\Study\codex\project\rehab-thinking-demo
$env:D1_TEST_URL = "http://localhost:3000"
npm run test:integration
Remove-Item Env:D1_TEST_URL
```

验收标准：

- 3 个集成测试全部通过；
- 并发保存两个请求只能一个返回 `200`，另一个返回 `409`；
- 不得出现并发保存导致的 `500`；
- 测试案例全部删除；
- 关闭服务，并确认 3000 端口没有残留监听。

## 7. 第二阶段：Cloudflare 目标和 D1 预检

### 7.1 检查登录和资源

当前仓库已知配置：

- Worker 名称：`rehabmind`；
- 预览 D1 名称：`rehabmind-preview`；
- Wrangler 配置：`wrangler.jsonc`；
- 本地 D1 配置：`wrangler.local.jsonc`。

执行：

```powershell
npx wrangler whoami
npx wrangler d1 list
Get-Content wrangler.jsonc
```

验收标准：

- 当前账号具有 Worker、D1 和 Secrets 权限；
- `rehabmind-preview` 的 database ID 与 `wrangler.jsonc` 一致；
- 不能因为名称相似而选择其他 D1。

### 7.2 确认正式环境不复用预览

当前 `wrangler.jsonc` 指向 `rehabmind-preview`，只能用于预览验收。

正式开放前必须有独立的：

```text
正式 Worker 或独立 deployment
正式 D1 database_name
正式 D1 database_id
正式邀请 token
正式管理员 key
正式版本标识
```

如果仓库没有正式 Wrangler 配置，不能自行猜测正式 D1 ID，也不能把预览 D1 直接当正式 D1。若这一步无法证明隔离，结论必须是“禁止开放”。

### 7.3 远程迁移

先查看状态：

```powershell
npx wrangler d1 migrations list rehabmind-preview --remote --config wrangler.jsonc
```

确认目标无误后执行：

```powershell
npx wrangler d1 migrations apply rehabmind-preview --remote --config wrangler.jsonc
npx wrangler d1 migrations list rehabmind-preview --remote --config wrangler.jsonc
```

所有仓库迁移必须显示已应用。若 Wrangler 版本不接受参数，先执行对应的 `--help`，按当前版本调整，并记录实际命令。不得直接执行破坏性 SQL，不得手动删除远程表。

## 8. 第三阶段：Secrets 和邀请配置

### 8.1 必要变量

| 变量 | 用途 | 处理要求 |
| --- | --- | --- |
| `PILOT_INVITE_TOKEN` | 创建案例前的邀请凭据 | 只写入 Secret，不写明文 |
| `PILOT_INVITE_EXPIRES_AT` | 邀请失效时间 | 可以记录时间，不记录 token |
| `PILOT_INVITE_REVOKED` | 紧急撤销邀请 | 记录是否撤销 |
| `PILOT_ADMIN_KEY` | 管理员 API 保护 | 只写入 Secret，不写明文 |

### 8.2 写入 Secrets

使用交互式输入，不把值放进命令参数：

```powershell
npx wrangler secret put PILOT_INVITE_TOKEN --name rehabmind
npx wrangler secret put PILOT_ADMIN_KEY --name rehabmind
npx wrangler secret put PILOT_INVITE_EXPIRES_AT --name rehabmind
```

写入后只确认 Secret 名称存在，不尝试打印 Secret 内容。测试 token 和正式 token 必须分开。

### 8.3 邀请边界

| 请求 | 预期 |
| --- | --- |
| 无邀请创建案例 | `403`, `code=invite_required` |
| 错误邀请创建案例 | `403`, `code=invite_required` |
| 正确邀请创建案例 | `201` |
| 已过期邀请 | `403` |
| 已撤销邀请 | `403` |
| 邀请配置缺失 | `503`, `code=invite_unavailable` |

失效和撤销验证必须在预览或专用测试配置中完成，不能修改正式邀请配置后忘记恢复。

## 9. 第四阶段：预览部署和 HTTP 验收

### 9.1 部署预览

```powershell
npm run build
npx wrangler deploy --config wrangler.jsonc
```

记录 Worker 名称、部署时间、deployment/version ID、实际访问域名、D1 名称和三类版本号。

历史预览地址为：

```text
https://rehabmind.yueshu-rehab.workers.dev/
```

若部署输出的地址不同，以部署输出为准，并更新证据。

### 9.2 用集成测试指向预览

不要先启动完整浏览器。使用 API 集成测试：

```powershell
$env:D1_TEST_URL = "https://rehabmind.yueshu-rehab.workers.dev"
$env:PILOT_INVITE_TOKEN = "仅在当前 PowerShell 会话设置真实值"
$env:PILOT_ADMIN_KEY = "仅在当前 PowerShell 会话设置真实值"
npm run test:integration
Remove-Item Env:D1_TEST_URL
Remove-Item Env:PILOT_INVITE_TOKEN
Remove-Item Env:PILOT_ADMIN_KEY
```

必须验证：

1. 无邀请不能创建案例。
2. 正确邀请返回匿名案例编号。
3. 创建幂等不会创建第二个案例。
4. 同一创建 ID 使用不同 token 会冲突。
5. revision 递增，旧 revision 返回 `409`。
6. 同一事件重试不会增加事件。
7. 同一事件 ID 提交不同内容返回 `409`。
8. 并发保存只能成功一个，另一个返回 `409`，不得返回 `500`。
9. 两个案例不能交叉读取、保存或提交反馈。
10. 管理员可以读取时间线，但响应没有 `accessTokenHash`。
11. 删除后普通 token 失效，管理员仍能看到删除状态和 `case_deleted` 事件。
12. 响应包含应用、知识和决策版本。

集成测试创建的案例必须在测试中删除。删除失败时不能标记为通过。

## 10. 第五阶段：日志和错误脱敏

先运行静态和内部门禁：

```powershell
npm run test:fast
npm run test:logic:mutations
```

确认公开错误不返回访问 token、邀请 token、管理员 key、请求体、完整主诉或内部堆栈；服务日志不打印 token、headers、body 或 payload。

然后用 Cloudflare Dashboard Worker Logs 或 Wrangler tail 观察预览：

```powershell
npx wrangler tail rehabmind --format json
```

观察期间只发送无邀请创建、错误访问 token、旧 revision 保存和非法 JSON 请求。检查：

- 日志没有完整邀请 token、访问 token 或管理员 key；
- 日志没有完整主诉或快照正文；
- 日志没有内部堆栈；
- 请求仍能通过时间、状态、安全关联 ID或匿名案例编号定位。

如果无法取得 Cloudflare tail 真实证据，必须写成“日志环境证据未完成”，禁止写成已完成。

## 11. 第六阶段：唯一一次页面最小冒烟

这一阶段不是内部逻辑测试，只验证发布入口和浏览器实际连接。只执行一条短路径：

1. 打开候选试用地址。
2. 无邀请不能创建案例。
3. 使用有效邀请进入创建流程。
4. 创建后页面显示匿名案例编号。
5. 填写最少量症状信息并保存。
6. 刷新页面。
7. 确认页面恢复最近一次成功保存状态。
8. 记录控制台是否有运行时错误。

通过标准：页面可进入、邀请边界正确、案例编号可见、刷新不回到空白新案例、无运行时异常、只创建一个测试案例、测试案例随后通过 API 删除。

不在本阶段验证所有康复决策、所有动作组合、Firefox、全量视觉、三次重复和后台所有筛选统计。

## 12. 第七阶段：正式试用环境

正式环境必须满足：

- 独立 Worker 或明确独立 deployment；
- 独立 D1 database；
- 独立邀请 token；
- 独立管理员 key；
- 独立版本标识；
- 预览和正式数据不能互读。

正式环境至少运行一次精简 HTTP 验收：创建合成案例、保存一次 revision、读取一次管理员时间线、提交一次反馈、删除案例、确认 token 失效、确认版本和脱敏响应。结束后删除案例。

如果只能使用同一 Worker 名称，必须证明 Cloudflare deployment/environment 可以隔离配置和 D1；无法证明时禁止开放。

## 13. 通过清单

只有全部勾选，才可以向粉丝群发送链接：

- [ ] `npm run test:fast` 通过。
- [ ] `npm run lint` 无业务代码 errors。
- [ ] `npm run test:logic:mutations` 的 12 项变异全部被捕获。
- [ ] 本地 `npm run test:integration` 为 `5/5`。
- [ ] 预览 D1 迁移状态已记录。
- [ ] 预览 API 验收通过。
- [ ] 正式环境不是预览 D1。
- [ ] 邀请 token 已配置且失效时间已记录。
- [ ] 管理员 key 已配置且未写入文档。
- [ ] 删除、隔离、并发和反馈绑定已验证。
- [ ] 版本标识已记录。
- [ ] 错误响应和日志已脱敏。
- [ ] 唯一页面最小冒烟通过。
- [ ] 测试案例已清理。

## 14. 禁止开放条件

出现任一情况，结论必须是“禁止开放”：

- 预览或正式 D1 目标不明确；
- 无法确认正式环境和预览环境隔离；
- 邀请制未配置或可以绕过；
- 普通 token 可以读取管理员数据；
- 并发保存出现 `500` 或静默覆盖；
- 删除后 token 仍能读取案例；
- 错误响应或日志包含访问凭据或内部堆栈；
- 版本号无法追溯；
- 页面最小冒烟失败；
- 测试数据无法清理。

## 15. 失败处理和回滚

### 15.1 代码或测试失败

1. 保存失败命令和输出。
2. 判断是测试夹具、环境、已有缺陷还是新缺陷。
3. 新缺陷先增加最小回归测试，再修实现。
4. 重新运行相关层，再运行 `test:fast`。
5. 不得删除测试、放宽断言或改成源码正则来消除失败。

### 15.2 预览部署失败

1. 不继续向正式环境部署。
2. 保存 Wrangler 输出和 deployment ID。
3. 检查 Worker 名称、账号、D1 ID、migration 和 Secret 名称。
4. 修复配置后重新构建和部署。

### 15.3 正式环境异常

1. 立即停止传播邀请链接。
2. 将 `PILOT_INVITE_REVOKED` 设置为 `true` 或移除邀请 Secret。
3. 保留异常案例编号、请求时间和安全关联 ID。
4. 使用 Cloudflare Dashboard 或当前 Wrangler 版本支持的 rollback 命令回到上一版本。
5. 修复后重新完成第 9～13 节，不能只验证首页后恢复开放。

## 16. 交付报告格式

执行模型完成后必须返回：

```text
执行时间：
代码版本/commit：
目标环境：local / preview / formal
Worker：
D1：

本地 test:fast：通过/失败，数量：
本地 test:integration：通过/失败，数量：
mutation：通过/失败，数量：
预览迁移：通过/失败，迁移状态：
预览 API 验收：通过/失败
日志脱敏：通过/失败/未取得证据
唯一页面冒烟：通过/失败/未执行
正式环境 API 验收：通过/失败/未执行
测试数据清理：通过/失败

发现的问题：
修复的文件：
保留的风险：
最终结论：允许开放 / 禁止开放 / 等待用户决定
```

不得只写“测试通过”，必须写明实际运行了哪些层、哪些层没有运行。

## 17. 预计时间

在 Cloudflare 权限正常、没有新代码缺陷的情况下：

| 阶段 | 预计时间 |
| --- | ---: |
| 本地基线复核 | 10～20 分钟 |
| 远程 D1 和 Wrangler 配置检查 | 20～40 分钟 |
| Secrets 和邀请配置 | 15～30 分钟 |
| 预览部署和 HTTP 验收 | 30～60 分钟 |
| 日志脱敏与版本记录 | 15～30 分钟 |
| 唯一页面最小冒烟 | 10～20 分钟 |
| 正式环境 API 验收和清理 | 30～60 分钟 |
| **合计** | **约 2～4 小时** |

如果出现 Cloudflare 权限、D1 迁移、域名、Secrets 或真实缺陷问题，预计增加到 4～6 小时。延长原因必须记录，不能用估算时间代替验收。
