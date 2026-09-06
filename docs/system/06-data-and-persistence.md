# 06 · 数据来源与持久化（Data & Persistence）

> 文档状态：现行 ｜ 建立：2026-09-06 ｜ 事实来源：`src/infrastructure/pilot/`（约 20 文件 3000 行）与 `src/knowledge/rehab/` 实测（行号截至本日）
> 本文定义数据的三层来源（临床溯源→本地持久化→服务端）、快照合同与同步规则。会话状态所有者见 05。

## 1. 数据的三层来源

```
临床溯源层（人读）   rebuild/data/case-drafts + source-catalog（10 例匿名病例、A~E 证据分级）
知识结构层（代码）   src/knowledge/pilot/pilot-knowledge.ts（PilotRelation：evidence P0-P3 / status / sourceCases）
                    src/knowledge/rehab/（knee-p0-runtime、RAW-KNEE-001~008 原始记录级溯源）
会话数据层（运行时） 浏览器本地 IndexedDB(主)/localStorage(兜底) → 服务端 SQLite API
```

## 2. 快照四段合同（snapshot-schema.ts:410-437）

`validatePilotSnapshotV3`：jsonDepth≤24 → schemaVersion → contractRevision → **四段齐备**（identity / domain / workflow / draft）→ 逐段校验 → 跨段一致性。

| 段 | 内容要点 |
|---|---|
| identity | caseId / localCaseId / problemThreadId / sessionId / sessionStatus / sessionNumber、problemThreads[]、sessionIndex[] |
| domain | consent、intake、safety、assessments[]、treatments[]、retests{obligations,records}、training、history、bodyMarks / scoreRecords / specialTestRecords / professionalNoteRecords / decisionTraces |
| workflow | stage(0-5)、phase、assessmentRevision、treatmentPlanRevision、pendingRetestCount、assessmentOwnerSessionId |
| draft | confirmedIntakeMulti、assessmentCursor、treatmentCursor、selectedOptionalCandidateIds、bilateralTreatmentSides、bilateralRetestResponses、initialRetest、currentSession |

**跨段不变量**：当前 thread/session 必须在索引中；所有 domain 事实归属 sessionIndex；`workflow.pendingRetestCount` 必须等于 retests.obligations 中 `required && pending` 数（:401-405）。**派生标签不落盘；处理事实只 superseded 不删除**（:166-172）。

## 3. 版本号（以代码为准；旧合同文档 2/4/v4 已过时）

| 常量 | 值 | 位置 |
|---|---|---|
| PILOT_SNAPSHOT_SCHEMA_VERSION | 3 | case-contracts.ts:270 |
| REHABMIND_V3_CONTRACT_REVISION | **3** | snapshot-contract.ts:7 |
| PILOT_EVENT_SCHEMA_VERSION | 2 | case-contracts.ts:34 |
| IndexedDB DATABASE_VERSION | **5**（旧 <5 全清） | local-case-store.ts:2,182-186 |
| PILOT_CONSENT_VERSION | pilot-consent-v1 | consent-core.ts:1 |
| 单快照上限 | 1,000,000 字节 | case-contracts.ts:267 |

## 4. 本地存储键清单（local-case-store.ts）

| 键 | 用途 |
|---|---|
| IndexedDB `rehabmind-local-cases`（v5；测试 `-test`） | objectStore：`case-records`（单键 all）＋`active-draft`（单键 current） |
| `rehabmind-complete-demo-records-v5` | localStorage 兜底案例记录 |
| `rehabmind-local-cases-initialized-v5` | 迁移完成标记 |
| `rehabmind-active-draft-v5` / `-signal-v5` | 兜底草稿 / 跨标签页通知（仅身份指纹，无正文） |
| sessionStorage `rehabmind-tab-id` | 单标签页 ID |
| 废弃 v1/v3/v4 共 10 键 | 启动时清除（:91-108） |

另：`rehabmind-pilot-consent(-declined)`（consent-core.ts:2,48）、`rehabmind-pilot-source`（source-channel.ts:15）、Cookie `rehabmind_admin_session`（15min HttpOnly Secure Strict）。

## 5. 同步状态机（sync-core.ts:81-133）

- **八态**：local_only / dirty / syncing / synced / failed / conflict / deleting / deleted；16 类事件；纯函数仲裁——过期响应按 sameOperation 与 revision 单调性忽略。
- **恢复决策**（:196-204）：无本地→use-remote；本地不脏→按 revision 选新；脏且指纹一致→use-remote；远端旧→use-local；否则 **conflict**。
- **冲突仲裁**：六段（症状/安全/评估/处理复测/训练/记录）按确定性指纹逐段比较；冲突副本剥离 token/凭据/版本字段。
- **持久化纪律**：写入前必须经 persistSavedDemoSnapshot()；persistence-controller 防抖草稿＋按键串行队列。

## 6. 服务端 API 面

| 客户端函数（case-client.ts，12s 超时＋Bearer） | 端点 |
|---|---|
| createPilotCase | POST /api/pilot/cases（test 走 /api/pilot/test/cases） |
| savePilotCaseProgress | POST /api/pilot/cases/:id/progress（x-pilot-request-id 幂等） |
| readPilotCase / deletePilotCase | GET·DELETE /api/pilot/cases/:id |
| submitPilotCaseFeedback | POST /api/pilot/cases/:id/feedback |

服务端：PilotCaseService（create/save/feedback/delete/purge/read，含不变量校验与幂等）、PilotCaseAdminService（检索/指标/加注/反馈状态/脱敏导出）、PilotTrialOperationsService（首用埋点）；仓库接口 PilotCaseRepository 20 方法；事件字典 26 类。

## 7. 匿名、同意与安全

- caseId 为公开码（字母表去混淆字符）；accessToken 服务端**只存 SHA-256 哈希**（case-service.ts:277,601）。
- 同意随快照 `domain.consent` 落库，时间戳防未来钟偏（consent-core.ts:28-30）；来源渠道记录（source-channel.ts）。
- 冲突副本导出剥离凭据；管理会话用短时 HttpOnly Cookie。

## 8. 数据清理与发布边界

`npm run data:v3:reset`（审计）→ `:apply`（执行）：WAL checkpoint → 备份 → 事务清运行表；知识库与发布记录保留。**代码发布与数据清理是两个独立动作**；干净切换不迁移 v1/v2（v5 升级时旧库全清）。

## 9. 与旧合同文档的出入（以本文为准）

contractRevision 2→**3**；IndexedDB 4→**5**；键 v4→**v5**；义务键实际 7 段（含 sessionId 与 episodeId）；"无本地数据需保留"现仍带 localStorage 兜底兼容层（LEGACY_LOCAL_CASES_KEY 写路径，local-case-store.ts:297-298）。
