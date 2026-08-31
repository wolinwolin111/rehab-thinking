# 定性请求与答复（合并归档）

> **归档（2026-09-01）**：本档合并 `determination-request-2026-08-26.md` 与 `determination-response-2026-08-26.md`。RQ-1~RQ-6、RQ-S1~S5 全部裁决并已执行完毕（测试预期与正式文档均已按答复更新），此处仅作「当前测试合同为何长这样」的可追溯证据。当前口径以 [文档中心](../README.md) 现行文档为准，不得直接引用本档作为标准。

---

# 第一部分：定性请求单（测试会话 → 开发会话，2026-08-26）

生成者：测试会话；接收者：开发会话（由产品转发）。用途：以下每条请逐条回答「**有意变更 / 无意回归**」并给出一句依据。回答后由测试会话执行对应动作：有意 → 更新测试预期与正式文档；无意 → 转缺陷修复。测试侧在收到书面答复前不会自行改动任何预期。证据链标记：①=引入变更的提交考古；②=正式文档/源码现状核对。

## RQ-1 首屏价值承诺句迁移（红灯：first-use-entry-contract / save-promise-copy·test1）
- **期望**：`rehabmind-onboarding.tsx` 含「把悦舒运动康复的线下经验带到你身边，陪你完成每一次康复」。
- **现状**：该句消失；`guide-cards.tsx` 出现近似句「把线下康复经验带到这里」。
- **① 考古**：消失于 `cf47910`（guide cards redesign）。**② 核对**：其余首屏文案均在，仅此句被改写。

## RQ-2 顶栏同步状态标签整合（红灯：save-promise-copy·test3）
- **期望**（SAVE-01 旧文案表）：7 个状态标签全部存在。**现状**：只剩 4 个，新逻辑为正常流转态完全静默、仅异常态显示。
- **① 考古**：`9df84b4`→`cf47910`（save status noise reduction）。**② 核对**：idle/local-saving/syncing/local-saved/synced 五态不再渲染标签。

## RQ-3 atlas-v2 图片引用解禁（红灯：muscle-region-location-picker）
- **期望**：picker 源码禁 `rehabmind-region-*atlas-v2.png`。**现状**：小腿背面引用 `/rehabmind-region-calf-atlas-v2.png`，文件实存于 `public/`；同批还有 ankle/foot/knee/thigh v2 图。**① 考古**：`cf47910`（body map hints）。

## RQ-4 SSR 首屏不含引导层（原 F-1）
- **现象**：dev SSR HTML 不含「你的线上康复助手」「开始康复」，hydration 后客户端渲染；浏览器体验正常。此前 F-1 判「文案缺失」是误判——真相是引导层整体不在 SSR 产物里。

## RQ-5 「问题反馈」入口首屏不可见（原 F-2）
- **现象**：1440px 桌面首屏（未建案）DOM 有按钮但不可见；建案后 release 证明可见可用。此前判「疑似遮挡」不成立——入口设计上仅在工作台就绪后出现。

## RQ-6 可访问性两项（axe serious/critical）
| 编号 | 违规 | 命中节点 |
| --- | --- | --- |
| RQ-6a | aria-prohibited-attr | `.rm-step-progress` div 用 `aria-label` 但无 role |
| RQ-6b | color-contrast | 页脚免责声明对比度不足 |

## C-1 / C-2 清理项（无需定性）
- C-1：删死命令词 `enter-training` / `remain-in-treatment`（类型、adapter case、orchestrator.test 两处反向断言）。
- C-2：删 `onboarding-steps.ts:15` 未用导入 `CSSProperties`。

---

# 第二部分：开发答复（2026-08-26，基线 main @ b320ddb）

## RQ-1 价值承诺句迁移 —— **有意变更**
cf47910 重写欢迎页文案：价值承诺句由三行文案 grid 首行「把线下康复经验带到这里」承接（`rehabmind-onboarding.tsx:76`），旧长句废弃。→ 测试动作：`first-use-entry-contract.test.mjs:17`、`save-promise-copy.test.mjs:14` 旧句改新句及位置。

## RQ-2 顶栏同步状态标签整合 —— **有意变更**（产品 08-26 晚再修订，见 RQ-S4）
新验收文案表：

| 状态 | 桌面顶栏 | 移动端 mobileSaveStatus |
| --- | --- | --- |
| idle / local-saving / syncing / local-saved / synced | 无标签 | 无标签 |
| offline | 网络断开，正在本机保存 | 仅保存在本机 |
| conflict | 待处理冲突 | 保存待处理 |
| error | 本机保存失败 | 保存失败 |

依据：正常流转静默、仅异常态显示，双端口径一致。代码：`mobile-navigation-core.ts:3-10`、`rehabmind-workbench.tsx:5182`。→ 测试动作：更新 SAVE-01 `topbarLabels`（save-promise-copy.test.mjs:34）。

## RQ-3 atlas-v2 图片引用解禁 —— **有意变更，v2 为现行素材**
`public/` 实存 6 张 atlas-v2 图，`lower-limb-location-picker.tsx`/`muscle-region-location-picker.tsx` 在用。→ 测试动作：删 `muscle-region-location-picker.test.mjs:18` 禁令，改正向校验「引用图片必须存在于 public/」。

## RQ-4 SSR 首屏不含引导层 —— **既定架构**
首用四层覆盖依赖 localStorage 决定渲染，SSR 无法预知；工具型应用经 nginx `/RehabMind/` 前缀部署，SEO 非目标。→ 测试动作：巡检该项从 SSR 断言降级为客户端渲染后断言。

## RQ-5 反馈入口首屏不可见 —— **确认设计意图**
引导未完成时全屏模态阻断属预期；反馈面板绑定案例上下文，未建案时无反馈对象。→ 测试动作：遮挡探针前提改为「建案之后」。

## RQ-6 可访问性 —— **开发本批直接修复**
- RQ-6a：选 `role="img"` + aria-label（`.rm-step-progress` 为纯装饰进度条，`ui-primitives.tsx:127`）。
- RQ-6b：加深前景色（`complete-demo.css:1154` `#697489`→`#56617a`，最浅背景段复测 ≥4.5:1）。

## C-1 / C-2 —— 排期本批 Phase 0，立即执行。

---

# 第三部分：补充定性 RQ-S1~S5（上一 UI 会话未走定性流程的有意变更）

当前 test:fast 失败 6 文件中，除 RQ-1~RQ-3 覆盖的 4 条外，另 2 文件 3 处属上一 UI 会话有意变更（见交接文档 §2.2），补入定性；本批开发自身改动零新增失败。

## RQ-S1 肌肉示意图合同三处过时（muscle-region-location-picker.test.mjs）—— **有意变更**
cf47910 重构为单腿照片+分区色块（`MUSCLE_ZONE_PATHS`→`MUSCLE_ZONE_RECTS`，新增 `rm-muscle-location-figure__photo`），大腿暂无素材走文字卡。→ 测试动作：`:16` `MUSCLE_ZONE_PATHS`→`MUSCLE_ZONE_RECTS`；`:18` 按 RQ-3 改正向；`:19` 照片层解禁改正向断言。

## RQ-S2 同意页数据说明五条精简为三条（stage-render-contract.test.mjs）—— **有意变更**
删除两条与欢迎页重复的效果提醒，仅保留免责条目（规范「效果提醒只出现一次」）。→ 测试动作：`:30`/`:36` 改为 `(<li).length === 3`；其余断言不变。

## RQ-S3 安全确认恢复全量同屏渲染（information-density-contract.test.mjs）—— **有意变更**
从「一次一题」回退为「全量同屏」（产品验收后人体工学决定），实现用 `activeSafetyItems.map`/`boneQuestions.map`。→ 测试动作：`:19-20` 删 `currentSafetyItem`/`currentBoneQuestion` 断言；`:21-22` 两条 doesNotMatch 反转为 match。

## RQ-S4 保存状态全面静默 + 首存横幅移除（产品 08-26 晚决策）—— **有意变更**
用户反馈「✓ 出现太频繁」后拍板正常态全面静默。开发已实现：`mobile-navigation-core.ts` 5 正常态返回空串；`MobileTopActions` 空态只渲染「第N次」；`rehabmind-workbench.tsx` 删 first-save OnceHint。→ 测试动作：`stage-render-contract.test.mjs:148-159` 移动顶栏 8 态断言按静默口径改；`contextual-tip-contract.test.mjs:20` 删首存断言。

## RQ-S5 引导卡整层移除 + 聚焦教程精简为 4 步（产品 08-26 晚·B 批）—— **有意变更**
引导卡内容与欢迎页/教程重合、「保存」主题出现 4 次违反规范。定稿：`guide-cards.tsx` 连组件带 localStorage 标记删除；教程 6 步精简为 4 步（症状输入→帮我整理→康复流程→问题反馈）。→ 测试动作：`stage-render-contract.test.mjs` 删 GuideCards 相关行与引导卡渲染块，教程断言按 4 步修订。

## 当时 test:fast 失败全集（供核对，均为预期更新非回归）
first-use-entry-contract（RQ-1）、save-promise-copy（RQ-1+RQ-2）、muscle-region-location-picker（RQ-3+RQ-S1）、stage-render-contract（RQ-S2）、information-density-contract（RQ-S3）。
