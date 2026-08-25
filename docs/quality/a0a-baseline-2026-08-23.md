# RehabMind A0a 基线记录

> 记录时间：2026-08-23T23:43:25+08:00  
> 基线提交：`5af6280c6f60f3236363dac6150a6e4ddef550d6`  
> 分支：`main`  
> 证据运行目录：`artifacts/quality/a0a-20260823-2343/`

## 1. 工作树

基线时存在此前已确认的文档和目录导航改动，没有生产代码改动：

- 已修改：根 README、docs 索引、项目状态、历史整改手册、质量整改登记；
- 未跟踪：`app/tests/scripts` README、当前整改主计划、结构整理计划；
- 敏感文件 `.tmp-deploy-secrets.txt`、`.dev.vars`、`.preview-admin-key` 均存在，但全部被 git 忽略且未被跟踪；
- 机器清单保存在运行目录的 `tracked-files.txt`、`worktree-status.txt` 和 `source-manifest.json`。

## 2. 结构与体积

| 目录 | 文件数 | 字节数 |
| --- | ---: | ---: |
| `app` | 116 | 1,732,994 |
| `tests` | 103 | 1,063,816 |
| `scripts` | 50 | 477,116 |
| `docs` | 75 | 1,394,170 |
| `public` | 45 | 66,920,313 |
| `db` | 4 | 30,980 |

- 根目录文件：39；git 已跟踪文件：415；
- TypeScript/TSX 源文件：116；静态 import：208，其中相对 import 172、`@/` import 6；
- 主客户端 chunk：730,969 字节，超过当前 500KB 构建警告阈值；
- `dist` 共 92 个文件、71,266,201 字节，主要体积来自图片；
- 从主页面入口扫描到 87 个模块，发现 1 个循环依赖：`full-demo-content.ts → local-limb-regions.ts → full-demo-content.ts`；
- SQLite repository 入口扫描到 3 个模块，没有发现循环依赖。

## 3. 本地质量基线

| 项目 | 结果 | 当前含义 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | 类型层可编译 |
| `npm run test:unit` | 542/542 通过，约 10.2 秒 | 只证明当前根目录代码/合同测试 |
| `npm run test:logic:mutations` | 12/12 killed | 只证明当前已登记定向变异 |
| `npm run build` | 通过 | vinext 客户端和 SSR 构建可生成 |
| `npm run lint` | 失败：4 errors、8 warnings | 当前提交门禁不合格 |
| `npm audit --omit=dev` | 4 high | 生产依赖风险待定位和整改 |
| `test:integration` | 未运行 | 当前命令仍指向历史 D1，不能证明 SQLite |
| 浏览器/发布门禁 | 未运行 | 旧产物不能作为当前证据 |

lint 错误中 2 个来自 `.tmp-smoke` 生成脚本，2 个来自 `ecosystem.config.cjs`；警告包含临时/Wrangler 产物、主组件 Hook 依赖和 SQLite repository 未使用类型。后续应先修 lint 作用域，再处理真实源码问题，不能通过忽略全部警告伪造绿灯。

## 4. 生产与恢复基线

通过既有 `rehabdeploy` SSH 密钥读取和备份，没有修改生产数据库：

| 项目 | 结果 |
| --- | --- |
| 当前发布 | `/home/rehabdeploy/rehabmind/releases/20260823-051354` |
| PM2 | `rehabmind` online，约 63.8MB |
| 主机资源 | 969MB RAM，约 404MB available；1GB swap；磁盘约 9.4GB available |
| 生产 SQLite | 168KB |
| 备份前状态 | 定时任务存在且 cron active，但最近可见备份仍为 2026-08-22 22:31 |
| 新在线备份 | `rehabmind-20260823-1539.sqlite`，168KB |
| 隔离恢复副本 | `rehabmind-restore-20260823-154017.sqlite` |
| 完整性 | `PRAGMA integrity_check = ok`；foreign key check 无错误 |
| migration | 0 个新增、3 个已应用迁移可读取 |
| 脱敏计数 | 11 张表、4 个案例、4 个快照、9 个事件、0 条反馈 |
| SHA-256 | 备份与恢复副本一致：`59e70681b8be30b30ec8133c97ca297d49aefc9ad9820e178db11fbdec17d8b5` |

定时任务未产生当天可见备份的原因尚未定位，登记为发布运维缺口；本次手动在线备份和隔离恢复已经提供继续整改所需的可恢复副本。

## 5. A0a 结论

A0a 基线已固定，可以进入 A0b 复核。该结论只表示当前状态可复现和数据库已有恢复副本，不表示 lint、依赖安全、SQLite 集成、业务流程或发布门禁通过。
