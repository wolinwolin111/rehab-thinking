# RehabMind 开发→测试交接：批 K-lite 术后分流与 RehabGuide 转介

日期：2026-09-01
基线：main @ `5f12b4c`（批 J）
批次 SHA：本提交

## 1. 批次内容

产品定位收缩：**自助模式不提供术后康复方案**。术后恢复弧内用户转介自家 RehabGuide 站点（逐术式指南），超弧用户放行走普通流程并把术式写入记录。阈值逐术式取自 AAOS《骨科术后康复》书证（docs/research/postop-timeline-verification-2026-09-01.md）。

- **新纯核心** `src/domain/rehab/safety/postop-routing-core.ts`：
  - `SURGERY_PROCEDURES`（8 术式→RehabGuide slug+阈值月：切除2/缝合6/髌骨6/跟腱9/ACL·PCL·其他12）；
  - `SURGERY_TIMINGS`（7 档，区间中值与阈值比较；说不清=转介）；
  - `resolvePostOpRouting({had,procedure,timing,isGuided})` → `none | refer | proceed-recorded`；
  - `inferSurgeryHadFromText`：描述含"术后/做过手术…"默认"做过"，**绝不默认"没做过"**；"要做手术"不触发。
- **intake 三字段**（surgeryHad/surgeryProcedure/surgeryTiming，可选，旧快照零迁移）+ snapshot-schema stringKey 登记。
- **确认步 UI**（仅自助模式）：三题组（做过吗→哪个手术→距多久）；`refer` 时**动作区整体替换为转介卡**（专项指南深链/首页兜底/线上讲解兜底 + 保存本次信息），继续入口不存在；`proceed-recorded` 显示"已记录：术式（时长）"提示且照常继续。
- **新记录状态** `"术后转介专项指导站"`（SavedDemoRecord.status 联合扩展，服务端不校验枚举）。
- **新场景靶子** `postop-referral`（step 1，预置 ACL+2~6周）。

## 2. 断言对照表

| 契约 | 影响 |
|---|---|
| 自助模式确认步 DOM | 新增 `surgery-question` 区块（三步都在）；答"做过"追加术式/时长两组按钮 |
| `postop-referral` / `postop-referral-open` / `postop-recorded-note` / `surgery-had-*` / `surgery-procedure-*` / `surgery-timing-*` | 新 testid，可钉 |
| 专业模式（thinking） | 题组不渲染、分流不生效（`isGuided=false` 恒 `none`） |
| 旧快照 | 无 surgery 字段=未提问，行为与批 K 前一致 |

## 3. 不变式

- 转介是**出口不是放行**：`refer` 态下评估/处理/训练入口物理不存在（动作区替换），不依赖按钮 disabled。
- 阈值比较用区间中值：`monthsPast > threshold` 才放行（跟腱 6月~1年档中值9=阈值9 → 仍转介，保守方向唯一）。
- 答"做过"但未答完术式/时长：转介卡先指首页，不放行。
- 站点边界文案与 RehabGuide 页脚一致（"非医疗机构·不提供诊疗"、"以医生意见为先"）。

## 4. 验证证据

- `npx tsx` 分流核心 14 分支全过（含阈值边界、默认推断正反例、专业模式不干预）。
- Playwright `postop-referral` 实测：题组渲染+预置选中、转介卡出现且"开始评估检查"不存在、改"超过1年"→已记录提示+卡片消失、改回→卡片回来，零 pageerror（截图 `%TEMP%\opencode\batchK-referral.png`）。
- typecheck 干净。

## 5. 同车修复：方向侧接受补查静默丢失（测试侧 §6.2 转办）

`motionItems` 的 `directionIsRelevant` 过滤加 `|| continuationRoundIds.includes("motion:"+id)` 旁路——与批 G 力量侧同模式，修复"用户接受被裁方向的补查建议后该项静默消失"（踝区既有缺陷）。**能力闸门（被动/触诊 access）保持独立生效**：旁路只恢复相关性，自助用户仍不会被塞被动检查。

## 6. 已知边界（非缺陷）

- 术式/时长不进摘要页展示（intake 已持久化，导出记录含全量字段）；若产品要摘要行，另开小批。
- 转介卡外链为 IP+HTTPS 自签证书站点，浏览器可能提示证书——与站点自身一致，待域名/受信证书解决（产品侧已知）。
- 术后用户从描述推断默认"做过"后**仍可改答"没做过"**继续流程——这是知情自决，不是漏洞；专业模式完全不受本批影响。
