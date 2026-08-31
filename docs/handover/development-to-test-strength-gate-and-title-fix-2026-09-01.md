# RehabMind 开发→测试交接：力量检查主诉位置闸门 + 专业标题重名修正（批 G）

日期：2026-09-01
基线：main @ `ad04092`（批 E）
批次 SHA：本提交

## 1. 批次内容

临床实用性审计（增删改）中唯一零临床争议的一项落地：**膝/大腿/小腿力量检查此前无位置闸门**（`strengthIsRelevant` 对非踝区直接放行全部条目），与踝区已有的按主诉裁剪不对称。本批补齐，复用现成打分表，不改任何知识数据文案。

1. **`strengthIsRelevant` 并入三区闸门**（workbench-support.tsx）：
   - 膝区：固定保留核心两项（`knee-quadriceps`、`knee-posterior-chain`），其余力量项（腘绳/内收鹅足/臀肌/小腿三头）只在主诉位置命中时入列；`knee-foot-arch`（胫骨后肌与足弓控制）打分表无膝相关分支，实际不再入列（踝区同款保留）。
   - 大腿/小腿局部：只查主诉象限的力量项，象限→力量条目映射取自决策规则表新导出 `localLimbPrimaryStrengthId(regionId, location)`（local-limb-decision-core.ts，与 THIGH_RULES/CALF_RULES 同源，不复制映射）。
   - 踝足区：分支代码一行未动（对照用例验证输出不变）。
2. **膝区打分表导出**：useMemo 内联 `strengthLocationScore` 的膝分支抽为导出函数 `kneeStrengthChiefScore(itemId, intake)`（闸门与排序共用单一事实源；踝分支留在原处仅供排序）。
3. **专业标题重名修正**（pilot-motion-muscle-knowledge.ts，批 F 决议的保留部分）：
   - `ankle-squat`：闭链踝背屈功能检查 → **闭链下蹲功能检查**
   - `ankle-knee-wall`：闭链踝背屈活动度检查 → **膝碰墙背屈活动度检查**
   - 原因：两项与 `ankle-dorsiflexion` 家族标题撞名，用户无法区分。
4. **批 F 撤销**：assessment-stage.tsx 的 6 处"标题按模式分支"改动已全部还原（`git checkout`），产品规范 :422 确认卡片标题两种模式统一用专业名。自助模式标题仍为知识数据原名，与 main @ ad04092 完全一致。

## 2. 断言对照表

| 受影响断言 | 旧 | 新 |
|---|---|---|
| 钉 `闭链踝背屈功能检查` / `闭链踝背屈活动度检查` 字符串 | 命中 | 改为 `闭链下蹲功能检查` / `膝碰墙背屈活动度检查` |
| 思考模式膝区力量队列（任意膝主诉） | 恒为 7 项全量 | 核心 2 项 + 位置命中项（膝前/笼统=2，内侧/外侧=4，膝后=3，连小腿上端=3） |
| 思考模式大腿/小腿力量队列 | 恒为 4 项全量 | 恒为主诉象限 1 项 |
| 自助（guided）模式全部队列 | — | **不变**（guided 分支自有 ≤2 预算，核心两项恒在闸门内；见 §4 实测） |
| 踝足区力量队列 | — | **不变**（分支未动） |

## 3. 新场景靶子 id

无新场景。既有 `outcome-panel-chief-action-line`、`snapshot-fresh-under-24h` 落点与队列不受影响（guided 膝前痛队列实测 5/5，前后一致）。

## 4. 不变式

- 闸门只影响**评估清单装配**；续测池 `continuationCandidatePool` 仍取区域原始 directions+strengths 全集——被裁掉的象限/位置项在处理未解决时仍可经"继续检查这些方向"补入。
- 决策核（pilot-decision-engine :375-382）对力量项均有 `availableIds` 守卫，条目缺席不产生回退决策。
- `motionStrengthPair` 配对从过滤后的 `strengthItems` 查表：主诉象限的"活动度→力量"相邻卡保留；非主诉象限活动度卡不再拖出力量副卡（设计意图）。
- 排序仍用同一打分（`kneeStrengthChiefScore`），命中项排前。

## 5. 验证证据

- `npx tsx` 直连真实 `strengthIsRelevant` + 真实区域数据 9 用例全过（膝前/内侧/外侧/后/笼统/连小腿、大腿前侧、小腿后侧、踝外踝对照）。
- `npm run typecheck` 干净；`node --test tests/component/rendered-html.test.mjs` 与干净 HEAD 基线同为 6 个既有失败（工作区 tests/ 陈旧，agent/testing 权威），零新增。
- Playwright 实测 guided 膝前痛回看进度：改动前后均 5/5（无回归）。

## 6. 已知坑

- 工作区 `tests/` 当前在 HEAD 上自带 6 个红（intake 队列顺序、库完整性等断言与 src 现状漂移），测试侧合并本 SHA 时勿归因于批 G；以 agent/testing 分支契约为准。
- 若测试侧有契约钉"膝区思考模式力量=7"或"大腿力量=4"，属本批有意行为变更，按 §2 更新。
- 审计其余条目（跟腱等长 5s→30-45s、删足趾控制、加 Alfredson 离心、落地控制过渡卡）待临床签字，未在本批。
